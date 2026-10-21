import { randomUUID } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";

import { LaraApiError, TimeoutError, type Translator } from "@translated/lara";
import * as z from "zod/v4";

import { env } from "#env";
import { InvalidInputError } from "#exception";
import { logger } from "#logger";
import { getLaraClient } from "./lara-client.js";
import { translateSchema } from "./mcp/tools/translate.js";
import { PACKAGE_VERSION } from "./version.js";

/**
 * Where the funnel events go. METRICS_URL / METRICS_API_KEY override both, and either one set to
 * an empty string turns telemetry off. The key is public by design — it ships in the npm package —
 * and only buys short-lived ingest tokens for the `mcp` channel.
 */
const DEFAULT_METRICS_URL = "https://integration-metrics.laratranslate.com";
const DEFAULT_METRICS_API_KEY = "fef79db0da00dd07752b3cbffa89f5e911617aa943a338c7";

const REQUEST_TIMEOUT_MS = 3000;
/** A minute of slack, so a token never expires mid-flight. */
const TOKEN_MARGIN_MS = 60_000;
/** The token endpoint issues one per 10s per installation. */
const TOKEN_COOLDOWN_MS = 10_000;
/** Ingest allows 100 requests/min per installation; one flush every 2s stays far under it. */
const FLUSH_INTERVAL_MS = 2000;
/** A batch that could not be delivered is retried on its own, slower: the backend is down or busy. */
const RETRY_INTERVAL_MS = 30_000;
/** The backend accepts 1000 events per batch. */
const MAX_BATCH = 500;
/** A backlog means the backend is unreachable; past this the oldest events are dropped. */
const MAX_QUEUE = 10_000;
/** The backend rejects a whole batch when one event's metadata is past this. */
const MAX_METADATA_BYTES = 4096;
/**
 * Accounts remembered for the auth_success dedup below. One HTTP process serves
 * many accounts, so the set has to be bounded; re-reporting an auth_success
 * after a reset costs nothing, since no event needs a "have I sent this" flag.
 */
const MAX_SEEN_ACCOUNTS = 1000;

const INSTALLATION_FILE = "installation-id";
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * The backend rejects a malformed URL with a crash we would be handing to the
 * user, so an unusable value turns telemetry off instead.
 */
function normalizeUrl(value: string): string | undefined {
  const trimmed = value.trim().replace(/\/+$/, "");
  if (!trimmed) return undefined;

  try {
    // `localhost:8080` parses too, as a `localhost:` scheme fetch can never deliver to.
    const { protocol } = new URL(trimmed);
    if (protocol === "http:" || protocol === "https:") return trimmed;
  } catch {
    // Unparseable: same verdict as a scheme fetch cannot use.
  }
  logger.warn("METRICS_URL is not a valid http(s) URL; funnel metrics are disabled");
  return undefined;
}

// Constant for the process lifetime, so they are built once rather than per event.
const BASE_URL = normalizeUrl(env.METRICS_URL ?? DEFAULT_METRICS_URL);
const API_KEY = (env.METRICS_API_KEY ?? DEFAULT_METRICS_API_KEY).trim();
const TOKEN_URL = `${BASE_URL}/auth/issue-token`;
const INGEST_URL = `${BASE_URL}/metrics/ingest-events`;

/**
 * Groups everything one running server process does, so a burst of retries can be told apart
 * from recurring use. It identifies the process, NOT the user — that is what accountId is for.
 */
const SESSION_ID = randomUUID();

/** The part of every event that is fixed for the life of the process. */
const ENVELOPE = { channel: "mcp", channelVersion: PACKAGE_VERSION, sessionId: SESSION_ID };

/**
 * On every event: which transport emitted it (both report the same way, and telling them apart is
 * the whole point of instrumenting both) and the runtime it ran on, for bugs that only one
 * environment hits.
 */
const BASE_METADATA = {
  transport: env.TRANSPORT,
  os: process.platform,
  nodeVersion: process.versions.node,
};

type MetricsEvent = {
  eventType: "auth_success" | "auth_fail" | "call_success" | "call_error";
  /** Absent only on an `auth_fail` for credentials Lara never accepted. */
  accountId?: string;
  errorType?: string;
  latencyMs?: number;
  charsTranslated?: number;
  metadata?: Record<string, unknown>;
};

type QueuedEvent = MetricsEvent & {
  channel: string;
  channelVersion: string;
  sessionId: string;
  eventId: string;
  timestamp: string;
};

/**
 * Telemetry is on. Unconfigured = silently off, which is the intended fallback rather than a
 * failure. `DO_NOT_TRACK` is the global opt-out, honoured before anything is measured, queued or
 * written to disk.
 */
const ENABLED =
  Boolean(BASE_URL && API_KEY) &&
  !["1", "true", "yes"].includes((env.DO_NOT_TRACK ?? "").trim().toLowerCase());

export const metricsEnabled = (): boolean => ENABLED;

/**
 * What a tool call exercises, from the shared vocabulary every Lara integration reports against.
 * It names a capability, never an instance, and the values are stable forever: renaming one
 * silently splits its history in the dashboards.
 */
const FEATURE_BY_TOOL = {
  translate: "text",
  detect_language: "language_detection",
} as const;

const featureFor = (toolName: string): string =>
  FEATURE_BY_TOOL[toolName as keyof typeof FEATURE_BY_TOOL] ?? "resource_management";

/**
 * The per-call opt-out: a call that asks Lara not to trace it is not reported either — no event of
 * any kind. Read from the raw arguments, before validation, so a malformed flag still counts: it
 * says the user wanted privacy, and erring on their side costs one data point.
 */
export const isNoTrace = (args: unknown): boolean => {
  const flag = (args as { no_trace?: unknown } | null | undefined)?.no_trace;
  return flag === true || flag === "true";
};

/**
 * The backend fields one tool call produces. It lives here with the rest of the reporting
 * vocabulary: `feature`, the language tags, the option flags and the character count are all facts
 * about how a tool's arguments map onto the funnel, and they change together.
 *
 * The arguments are unvalidated — the tool handler is what parses them, and on the error path the
 * parse is exactly what failed — so nothing raw is reported: language tags must look like one, and
 * the option flags come only from a successful parse.
 */
export function callFieldsFor(
  toolName: string,
  args: unknown
): { metadata: Record<string, unknown>; charsTranslated?: number } {
  const metadata: Record<string, unknown> = {
    ...BASE_METADATA,
    feature: featureFor(toolName),
    toolName,
  };
  if (toolName !== "translate") return { metadata };

  const { source, target } = (args ?? {}) as { source?: unknown; target?: unknown };
  // Lowercase BCP 47, and `auto` is what the engine actually does when no source is given. A value
  // that is not a language tag is left out: it is raw client input, and could be anything.
  const sourceLang = source === undefined || source === null ? "auto" : languageTag(source);
  const targetLang = languageTag(target);
  if (sourceLang) metadata.sourceLang = sourceLang;
  if (targetLang) metadata.targetLang = targetLang;

  const { options, charsTranslated } = translateFieldsIn(args);
  Object.assign(metadata, options);
  return { metadata, charsTranslated };
}

const LANGUAGE_TAG = /^[a-z]{2,3}(-[a-z0-9]{1,8}){0,3}$/;

function languageTag(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const tag = value.toLowerCase();
  return LANGUAGE_TAG.test(tag) ? tag : undefined;
}

/**
 * Which translate options a call used, so we can see what is actually exercised. Enums as they are,
 * everything else as a count or a flag: never an id, an instruction or a context string. Taken from
 * a successful parse only, so every enum value is one the schema allows.
 */
function translateFieldsIn(args: unknown): {
  options: Record<string, unknown>;
  charsTranslated?: number;
} {
  const parsed = translateSchema.safeParse(args);
  if (!parsed.success) return { options: {} };

  const { text, style, priority, content_type, reasoning, glossaries, adapt_to, instructions, context } =
    parsed.data;
  const options: Record<string, unknown> = {
    blockCount: text.length,
    style,
    priority,
    contentType: content_type,
    reasoning,
    glossaryCount: glossaries?.length,
    memoryCount: adapt_to?.length,
    instructionCount: instructions?.length,
    hasContext: context ? true : undefined,
  };
  return {
    // Unset options are left out rather than sent as null.
    options: Object.fromEntries(Object.entries(options).filter(([, value]) => value !== undefined)),
    // Blocks flagged `translatable: false` are preserved verbatim, so counting them would overstate
    // what the engine translated.
    charsTranslated: text
      .filter((block) => block.translatable !== false)
      .reduce((total, block) => total + block.text.length, 0),
  };
}

/**
 * Which assistant made the call, as a closed vocabulary shared with mcp-private: raw client names
 * and user agents are never reported, only the bucket they fall in. First match wins, so the
 * narrower names come first.
 */
const CLIENTS: ReadonlyArray<[RegExp, string]> = [
  [/openai|chatgpt/i, "chatgpt"],
  [/claude[\s_-]?code/i, "claude-code"],
  [/claude|anthropic/i, "claude"],
  [/cursor/i, "cursor"],
  [/codex/i, "codex"],
  [/visual studio code|vscode/i, "vscode"],
];

/**
 * The calling client, from what the request carries: ChatGPT's `openai/*` hints, the clientInfo of
 * the initialize handshake (STDIO only — on the stateless HTTP transport it went to another
 * request), then the HTTP User-Agent. Undefined when nothing identifies it.
 */
export function clientFor(
  clientInfoName: unknown,
  meta: unknown,
  userAgent: unknown
): string | undefined {
  const hasOpenAiHints =
    meta !== null &&
    typeof meta === "object" &&
    Object.keys(meta).some((key) => key.startsWith("openai/"));
  if (hasOpenAiHints) return "chatgpt";

  const signal = [clientInfoName, userAgent].find(
    (value): value is string => typeof value === "string" && value !== ""
  );
  if (!signal) return undefined;
  return CLIENTS.find(([pattern]) => pattern.test(signal))?.[1] ?? "other";
}

const VERSION = /^\d[0-9A-Za-z.+-]{0,31}$/;

/** A client version only if it looks like one: it is free text the client sends. */
export const clientVersionFor = (value: unknown): string | undefined =>
  typeof value === "string" && VERSION.test(value) ? value : undefined;

function postJson(url: string, bearer: string, body: unknown): Promise<Response> {
  return fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${bearer}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    // Without a timeout a fire-and-forget POST to an unresponsive backend holds the socket open.
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
}

/**
 * The installation this copy of the server reports as. A UUID generated once and kept next to the
 * rest of the product's state, so every restart and every upgrade share it: the backend's rate
 * limits are counted per installation, and a fresh one per start-up would make them meaningless.
 *
 * Resolved on the first token request, not at module load: nothing is written to disk until there
 * is something to send. No `install` event — on the `mcp` channel the funnel starts at
 * `auth_success`, since a package download is not something the server can report reliably.
 */
let installationId: string | undefined;

const getInstallationId = (): string => (installationId ??= resolveInstallationId());

function resolveInstallationId(): string {
  // `||`: an empty LARA_HOME (a blank entry in a JSON config) would otherwise mean the cwd.
  const dir = env.LARA_HOME || join(homedir(), ".lara");
  const file = join(dir, INSTALLATION_FILE);

  let stored: string | undefined;
  try {
    stored = readFileSync(file, "utf8").trim();
  } catch {
    // Missing or unreadable: fall through and write a fresh one.
  }
  if (stored && UUID_PATTERN.test(stored)) return stored;

  const id = randomUUID();
  try {
    mkdirSync(dir, { recursive: true });
    // `wx` fails if the file appeared meanwhile, which settles the race between two processes
    // starting together without a lock. An empty file is one the other process has created but not
    // written yet, so it goes the same way rather than being clobbered. A file that holds something
    // unusable is overwritten instead.
    writeFileSync(file, id, { flag: stored ? "w" : "wx" });
    return id;
  } catch (error) {
    if ((error as NodeJS.ErrnoException | null)?.code === "EEXIST") {
      try {
        const winner = readFileSync(file, "utf8").trim();
        if (UUID_PATTERN.test(winner)) return winner;
      } catch {
        // Unreadable right after it was created: fall through to the in-memory id.
      }
    }

    // No writable home (a read-only container, no HOME): keep going with a per-process id rather
    // than dropping telemetry. The cost is that this installation's rate limits do not carry
    // across restarts.
    logger.debug(
      { error },
      "Could not persist the metrics installation id, using a per-process one"
    );
    return id;
  }
}

/**
 * The ingestion endpoints do not accept the API key: it buys a short-lived token, which is held in
 * memory only — never logged, never written to disk.
 */
let token: string | undefined;
let tokenExpiresAt = 0;
let tokenRetryAfter = 0;

async function getToken(): Promise<string> {
  if (token && Date.now() < tokenExpiresAt) return token;

  // The endpoint issues one token per 10s per installation. Asking again inside that window is
  // guaranteed to 429, so the attempt is skipped and the batch rides the next flush. The window
  // reopens as soon as an issuance succeeds.
  if (Date.now() < tokenRetryAfter) throw new Error("issue-token is in cooldown");
  tokenRetryAfter = Date.now() + TOKEN_COOLDOWN_MS;

  const response = await postJson(TOKEN_URL, API_KEY, { installationId: getInstallationId() });
  if (!response.ok) throw new Error(`issue-token returned ${response.status}`);

  const body = (await response.json()) as { token?: string; expiresIn?: number };
  if (!body.token) throw new Error("issue-token returned no token");

  token = body.token;
  const lifetimeMs = (body.expiresIn ?? 3600) * 1000;
  // Renewed a minute early, but never so early that a short-lived token counts as expired on arrival.
  tokenExpiresAt = Date.now() + lifetimeMs - Math.min(TOKEN_MARGIN_MS, lifetimeMs / 2);
  tokenRetryAfter = 0;
  return token;
}

const queue: QueuedEvent[] = [];
let flushTimer: ReturnType<typeof setTimeout> | undefined;
let flushing: Promise<void> | undefined;
let flushAgain = false;

/** Drops the oldest events once the backlog is past its bound. */
function trimQueue(): void {
  if (queue.length > MAX_QUEUE) queue.splice(0, queue.length - MAX_QUEUE);
}

/**
 * Fire-and-forget event report. Never awaited, never throws: if the monitoring backend is down
 * the MCP keeps translating as though nothing happened.
 *
 * Events are batched rather than posted one by one because the ingest quota counts requests
 * (100/min per installation) far more tightly than events (20 000/min).
 */
export function logEvent(event: MetricsEvent): void {
  if (!metricsEnabled()) return;

  // Past the cap the backend rejects the whole batch, so the one event goes instead of all of it.
  // Unreachable with the bounded fields above; this is the guarantee, not the expectation.
  const metadataBytes = Buffer.byteLength(JSON.stringify(event.metadata ?? {}));
  if (metadataBytes > MAX_METADATA_BYTES) {
    logger.debug({ eventType: event.eventType, metadataBytes }, "Metrics event dropped, metadata too large");
    return;
  }

  // The envelope is stamped last so it always wins: channel and sessionId are facts about this
  // process, never something a caller supplies. Both are stamped on the way in rather than at
  // flush time — the timestamp is when the thing happened, and a delivery retry has to carry the
  // same eventId to be recognizable as a duplicate.
  queue.push({ ...event, ...ENVELOPE, eventId: randomUUID(), timestamp: new Date().toISOString() });
  trimQueue();
  scheduleFlush(FLUSH_INTERVAL_MS);
}

function scheduleFlush(delayMs: number): void {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = undefined;
    void flushNow();
  }, delayMs);
  // Without unref an idle server would be held open by the metrics timer alone.
  flushTimer.unref();
}

/**
 * Deliver whatever is queued. Awaited only on shutdown — otherwise the last batch dies with the
 * process. One drain at a time, so two can never race for the same token; a flush asked for while
 * one runs is folded into a single rerun after it, so a backend slower than the flush interval
 * cannot stack up drains.
 */
export function flushNow(): Promise<void> {
  if (flushing) {
    flushAgain = true;
    return flushing;
  }
  flushing = (async () => {
    do {
      flushAgain = false;
      await drainQueue();
    } while (flushAgain);
  })().finally(() => {
    flushing = undefined;
  });
  return flushing;
}

/** Deliver what is queued before the process goes, within a budget a supervisor will honour. */
export function flushBeforeExit(timeoutMs = 2000): Promise<void> {
  // Unref'd: the cap must not itself hold the process open once the flush is done.
  return Promise.race([flushNow(), sleep(timeoutMs, undefined, { ref: false })]);
}

async function drainQueue(): Promise<void> {
  while (queue.length > 0) {
    const batch = queue.splice(0, MAX_BATCH);
    try {
      await sendBatch(batch);
    } catch (error) {
      // Never delivered — no token, or the request itself failed — so the batch goes back at the
      // front and rides the next flush. A batch the backend answered with a verdict is a different
      // thing and is dropped in sendBatch. MAX_QUEUE is what bounds a backend that stays down.
      logger.debug({ error, events: batch.length }, "Metrics batch delivery failed, requeued");
      queue.unshift(...batch);
      // Bounded here rather than left to the next logEvent: a server that goes idle while the
      // backend is down would otherwise sit above the cap indefinitely.
      trimQueue();
      // Retried on a timer of its own: an idle server would otherwise hold the batch until the next
      // tool call, or until it shuts down.
      scheduleFlush(RETRY_INTERVAL_MS);
      return;
    }
  }
}

async function sendBatch(events: QueuedEvent[]): Promise<void> {
  let response = await postJson(INGEST_URL, await getToken(), { events });

  // One retry, and only for an expired token. Anything else is either our problem or a
  // misconfiguration, and looping on it helps nobody.
  if (response.status === 401) {
    token = undefined;
    response = await postJson(INGEST_URL, await getToken(), { events });
  }
  if (response.ok) return;

  // 429 and 5xx say "not now", not "not ever": throwing puts the batch back on the queue.
  if (response.status === 429 || response.status >= 500) {
    throw new Error(`ingest returned ${response.status}`);
  }

  logger.debug({ status: response.status, events: events.length }, "Metrics batch rejected");
}

/**
 * The Lara account (`acc_...`) a Lara access token belongs to. Credits are consumed per account,
 * so it is the granularity the funnel shares with every other channel: the access key is not an
 * identity, it belongs to an account and is shared by its users.
 *
 * The payload is read without verifying the signature or `exp`: authorization already happened at
 * the Lara API itself, here we only need an identifier out of our own credential.
 */
export function accountIdFromToken(token: string): string | undefined {
  try {
    const payload = token.split(".")[1];
    if (!payload) return undefined;

    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return typeof decoded?.id === "string" && decoded.id ? decoded.id : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Short stable token for dashboards — free text would make grouping useless. The vocabulary is the
 * one shared by every Lara integration, so the same failure reads the same way across channels.
 */
export function errorTypeFor(error: unknown): string {
  if (error instanceof LaraApiError) {
    const status = error.statusCode;
    if (error.type === "AuthenticationError") {
      // The SDK wraps a /v2/auth request that never got an answer as a 500 AuthenticationError:
      // the network failed, the credentials were never judged.
      if (status >= 500) return "network_error";
      return status === 403 ? "auth_403" : "auth_401";
    }
    if (status === 401) return "auth_401";
    // Any other 403 comes from a key Lara accepted: the account may not do this, its credentials are fine.
    if (status === 403) return "forbidden_403";
    if (status === 429) return "rate_limit_429";
    if (status === 413) return "payload_too_large";
    if (status >= 500) return "server_error";
    // Every other 4xx from Lara is a request we built wrong.
    if (status >= 400) return "validation_error";
    return "unknown";
  }

  if (error instanceof TimeoutError) return "timeout";
  // A ZodError is what a tool's argument parse throws, and it reaches here
  // before CallTool has rewritten it into an InvalidInputError.
  if (error instanceof z.ZodError || error instanceof InvalidInputError) return "validation_error";

  const code = (error as { code?: unknown } | null)?.code;
  const name = (error as { name?: unknown } | null)?.name;
  if (code === "ETIMEDOUT" || name === "AbortError" || name === "TimeoutError") return "timeout";
  if (code === "ECONNREFUSED" || code === "ENOTFOUND" || code === "ECONNRESET")
    return "network_error";

  return "unknown";
}

const LARA_ERROR_TYPE = /^[A-Za-z][A-Za-z0-9_]{0,63}$/;
const MAX_INVALID_FIELDS = 10;

/**
 * What went wrong, beyond errorType, for the problems errorType groups together. Never a message:
 * those can quote the request. The Lara error type is an identifier from the API, kept only while it
 * looks like one; the invalid fields are schema paths with array indices folded, never a value.
 */
export function errorDetailsFor(error: unknown): Record<string, unknown> {
  if (error instanceof LaraApiError) {
    return {
      httpStatus: error.statusCode,
      ...(LARA_ERROR_TYPE.test(error.type) && { laraErrorType: error.type }),
    };
  }

  if (error instanceof z.ZodError) {
    const fields = error.issues.map((issue) =>
      issue.path.length > 0
        ? issue.path.map((key) => (typeof key === "number" ? "*" : String(key))).join(".").slice(0, 64)
        : "arguments"
    );
    // In issue order, which is schema order: the first fields are the ones a client got wrong first.
    return { invalidFields: [...new Set(fields)].slice(0, MAX_INVALID_FIELDS) };
  }

  return {};
}

/**
 * Everything one MCP session needs to report against. The account is not known when the session is
 * built: an access key is not an account, and the SDK only exchanges it for a Lara token lazily, on
 * the first request — so it is resolved after a call has succeeded and cached here.
 */
export type MetricsContext = {
  accountId?: string;
  translator: Translator;
};

/** Undefined when telemetry is off, which makes every report below a no-op. */
export function createMetricsContext(
  translator: Translator
): MetricsContext | undefined {
  return metricsEnabled() ? { translator } : undefined;
}

/**
 * The Lara account this session's events are attributed to.
 *
 * No token, no account: an access key that `/v2/auth` rejected never produces one. Never made up —
 * a fake id is a fake account that pollutes every number in the funnel.
 */
function accountIdFor(ctx: MetricsContext): string | undefined {
  if (ctx.accountId) return ctx.accountId;

  const laraToken = getLaraClient(ctx.translator)?.token;
  ctx.accountId = laraToken ? accountIdFromToken(laraToken) : undefined;
  return ctx.accountId;
}

/**
 * Access-key credentials are never validated on their own, so the first call that comes back OK is
 * the proof they work. Deduplicated per account rather than per session because the HTTP transport
 * is stateless — it builds a fresh Translator per request, which would otherwise report an
 * auth_success on every tool call.
 */
const seenAccounts = new Set<string>();

function reportAuthSuccessOnce(accountId: string, call: CallInfo): void {
  if (seenAccounts.has(accountId)) return;
  if (seenAccounts.size >= MAX_SEEN_ACCOUNTS) seenAccounts.clear();
  seenAccounts.add(accountId);

  logEvent({ eventType: "auth_success", accountId, metadata: { ...BASE_METADATA, ...clientFields(call) } });
}

/** One tool call, as CallTool sees it. */
export type CallInfo = {
  toolName: string;
  args: unknown;
  startedAt: number;
  /** A bucket from clientFor, never a raw name. */
  client?: string;
  clientVersion?: string;
};

const clientFields = ({ client, clientVersion }: CallInfo) => ({
  ...(client && { client }),
  ...(clientVersion && { clientVersion }),
});

/**
 * Report a tool call that returned. Called from inside CallTool rather than from a wrapper around
 * it, because CallTool turns every failure into an isError result before it escapes and the error
 * path below needs the original.
 *
 * Both reporters swallow their own failures: a bug in here must never turn a call Lara completed
 * into an error, or add a call_error to a call that succeeded.
 */
export function reportCallSuccess(ctx: MetricsContext | undefined, call: CallInfo): void {
  if (!ctx || isNoTrace(call.args)) return;
  try {
    describeSuccess(ctx, call);
  } catch (error) {
    logger.debug({ error }, "Metrics: could not report a call");
  }
}

function describeSuccess(ctx: MetricsContext, call: CallInfo): void {
  const accountId = accountIdFor(ctx);
  if (!accountId) return;

  reportAuthSuccessOnce(accountId, call);

  const { metadata, charsTranslated } = callFieldsFor(call.toolName, call.args);
  logEvent({
    eventType: "call_success",
    accountId,
    latencyMs: Date.now() - call.startedAt,
    charsTranslated,
    metadata: { ...metadata, ...clientFields(call) },
  });
}

/**
 * Report a tool call that threw. The error itself is never altered, only described.
 *
 * Without an account — the SDK never got a token — only a credential Lara rejected is reported: it
 * is the one failure that explains why there is no account, and `auth_fail` is the one event the
 * backend takes without one. Any other early error is lost, by design.
 */
export function reportCallError(
  ctx: MetricsContext | undefined,
  call: CallInfo,
  error: unknown
): void {
  if (!ctx || isNoTrace(call.args)) return;
  try {
    describeError(ctx, call, error);
  } catch (reportError) {
    logger.debug({ error: reportError }, "Metrics: could not report a call");
  }
}

function describeError(ctx: MetricsContext, call: CallInfo, error: unknown): void {
  const errorType = errorTypeFor(error);
  const isAuthError = errorType.startsWith("auth_");
  const accountId = accountIdFor(ctx);
  if (!accountId && !isAuthError) return;

  const metadata = {
    ...callFieldsFor(call.toolName, call.args).metadata,
    ...clientFields(call),
    ...errorDetailsFor(error),
  };
  if (!accountId) {
    logEvent({ eventType: "auth_fail", errorType, metadata });
    return;
  }

  // The SDK holds a token, so the credentials were accepted even though this call failed: a first
  // call that fails must not leave an account with errors and no auth_success.
  if (!isAuthError) reportAuthSuccessOnce(accountId, call);

  logEvent({
    eventType: "call_error",
    accountId,
    errorType,
    latencyMs: Date.now() - call.startedAt,
    metadata,
  });
  if (isAuthError) logEvent({ eventType: "auth_fail", accountId, errorType, metadata });
}
