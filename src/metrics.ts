import { randomUUID } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

import { LaraApiError, TimeoutError, type Translator } from "@translated/lara";
import * as z from "zod/v4";

import { env } from "#env";
import { InvalidInputError } from "#exception";
import { logger } from "#logger";
import { getLaraClient } from "./lara-client.js";
import { PACKAGE_VERSION } from "./version.js";

/**
 * Where the funnel events go. Empty until the integrations monitoring backend
 * is deployed and a production key is issued for the `mcp` channel: with either
 * one missing telemetry is silently off, which is the intended fallback rather
 * than a failure. METRICS_URL / METRICS_API_KEY override both.
 */
const DEFAULT_METRICS_URL = "";
const DEFAULT_METRICS_API_KEY = "";

const REQUEST_TIMEOUT_MS = 3000;
/** A minute of slack, so a token never expires mid-flight. */
const TOKEN_MARGIN_MS = 60_000;
/** The token endpoint issues one per 10s per installation. */
const TOKEN_COOLDOWN_MS = 10_000;
/** Ingest allows 100 requests/min per installation; one flush every 2s stays far under it. */
const FLUSH_INTERVAL_MS = 2000;
/** The backend accepts 1000 events per batch. */
const MAX_BATCH = 500;
/** A backlog means the backend is unreachable; past this the oldest events are dropped. */
const MAX_QUEUE = 10_000;
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
    new URL(trimmed);
    return trimmed;
  } catch {
    logger.warn("METRICS_URL is not a valid URL; funnel metrics are disabled");
    return undefined;
  }
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
 * Which transport emitted the event. Both report the same way, and telling them
 * apart is the whole point of instrumenting both.
 */
const BASE_METADATA = { transport: env.TRANSPORT };

export type MetricsEvent = {
  eventType: "install" | "auth_success" | "auth_fail" | "call_success" | "call_error";
  /** Absent only on `install` and `auth_fail`, the two the backend lets omit it. */
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

/** Opt-out, honoured before anything is measured, queued or written to disk. */
const doNotTrack = (): boolean =>
  ["1", "true", "yes"].includes((env.DO_NOT_TRACK ?? "").trim().toLowerCase());

/**
 * Telemetry is on. Unconfigured = silently off, which is the intended fallback rather than a
 * failure. Both transports report: unlike the private server there is no store to depend on.
 */
export const metricsEnabled = (): boolean =>
  Boolean(BASE_URL && API_KEY) && !doNotTrack();

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
 * The backend fields one tool call produces. It lives here with the rest of the reporting
 * vocabulary: `feature`, the language tags and the character count are all facts about how a
 * tool's arguments map onto the funnel, and they change together.
 *
 * The arguments are unvalidated — the tool handler is what parses them, and on the error path the
 * parse is exactly what failed — so every field is checked before use.
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

  const { source, target, text } = (args ?? {}) as {
    source?: unknown;
    target?: unknown;
    text?: unknown;
  };
  // Lowercase BCP 47, and `auto` is what the engine actually does when no source is given.
  metadata.sourceLang = typeof source === "string" ? source.toLowerCase() : "auto";
  if (typeof target === "string") metadata.targetLang = target.toLowerCase();

  return { metadata, charsTranslated: charsTranslatedIn(text) };
}

/**
 * Characters a translate call actually sends to the engine: blocks flagged `translatable: false`
 * (see textBlockSchema in mcp/tools/_schemas.ts) are preserved verbatim, so counting them would
 * overstate usage.
 */
function charsTranslatedIn(blocks: unknown): number | undefined {
  if (!Array.isArray(blocks)) return undefined;

  let total = 0;
  for (const block of blocks) {
    const { text, translatable } = (block ?? {}) as { text?: unknown; translatable?: unknown };
    if (typeof text === "string" && translatable !== false) total += text.length;
  }
  return total;
}

function postJson(url: string, bearer: string, body: unknown): Promise<Response> {
  return fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${bearer}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    // Without a timeout a fire-and-forget POST to an unresponsive backend holds the socket open.
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
}

type Installation = { id: string; created: boolean };

/**
 * The installation this copy of the server reports as. A UUID generated once and kept next to the
 * rest of the product's state, so every restart and every upgrade share it: the backend's rate
 * limits are counted per installation, and a fresh one per start-up would make them meaningless.
 *
 * Resolved synchronously and once. It has to be, to know whether the id is new — which is what
 * decides the `install` event — and readFileSync at module load already has a precedent in
 * version.ts.
 */
let installation: Installation | undefined;

const getInstallation = (): Installation =>
  (installation ??= resolveInstallation());

function resolveInstallation(): Installation {
  const dir = env.LARA_HOME ?? join(homedir(), ".lara");
  const file = join(dir, INSTALLATION_FILE);

  let stored: string | undefined;
  try {
    stored = readFileSync(file, "utf8").trim();
  } catch {
    // Missing or unreadable: fall through and write a fresh one.
  }
  if (stored && UUID_PATTERN.test(stored)) return { id: stored, created: false };

  const id = randomUUID();
  try {
    mkdirSync(dir, { recursive: true });
    // `wx` fails if the file appeared meanwhile, which settles the race between two processes
    // starting together without a lock — the same job Redis SET NX does on the private server.
    // A file that exists but holds something unusable is overwritten instead.
    writeFileSync(file, id, { flag: stored === undefined ? "wx" : "w" });
    return { id, created: stored === undefined };
  } catch (error) {
    if ((error as NodeJS.ErrnoException | null)?.code === "EEXIST") {
      try {
        const winner = readFileSync(file, "utf8").trim();
        if (UUID_PATTERN.test(winner)) return { id: winner, created: false };
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
    return { id, created: false };
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

  const installationId = getInstallation().id;
  const response = await postJson(TOKEN_URL, API_KEY, { installationId });
  if (!response.ok) throw new Error(`issue-token returned ${response.status}`);

  const body = (await response.json()) as { token?: string; expiresIn?: number };
  if (!body.token) throw new Error("issue-token returned no token");

  token = body.token;
  tokenExpiresAt = Date.now() + (body.expiresIn ?? 3600) * 1000 - TOKEN_MARGIN_MS;
  tokenRetryAfter = 0;
  return token;
}

const queue: QueuedEvent[] = [];
let flushTimer: ReturnType<typeof setTimeout> | undefined;
let flushing: Promise<void> | undefined;

/**
 * Fire-and-forget event report. Never awaited, never throws: if the monitoring backend is down
 * the MCP keeps translating as though nothing happened.
 *
 * Events are batched rather than posted one by one because the ingest quota counts requests
 * (100/min per installation) far more tightly than events (20 000/min).
 */
export function logEvent(event: MetricsEvent): void {
  if (!metricsEnabled()) return;

  // Stamped on the way in, not at flush time: the timestamp is when the thing happened, and a
  // delivery retry has to carry the same eventId to be recognizable as a duplicate.
  queue.push({ ...ENVELOPE, eventId: randomUUID(), timestamp: new Date().toISOString(), ...event });
  if (queue.length > MAX_QUEUE) queue.splice(0, queue.length - MAX_QUEUE);

  if (!flushTimer) {
    flushTimer = setTimeout(() => {
      flushTimer = undefined;
      void flushNow();
    }, FLUSH_INTERVAL_MS);
    // Without unref an idle server would be held open by the metrics timer alone.
    flushTimer.unref();
  }
}

/**
 * Deliver whatever is queued. Awaited only on shutdown — otherwise the last batch dies with the
 * process. Flushes are serialized so two of them can never race for the same token.
 */
export function flushNow(): Promise<void> {
  flushing = (flushing ?? Promise.resolve()).then(drainQueue);
  return flushing;
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
      // Overshoots MAX_QUEUE by at most one batch, which the next logEvent trims.
      queue.unshift(...batch);
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

const asId = (value: unknown): string | undefined =>
  typeof value === "string" && value.length > 0 ? value : undefined;

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
    return asId(decoded?.id);
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
    if (status === 401 || status === 403) return `auth_${status}`;
    if (status === 429) return "rate_limit_429";
    if (status === 413) return "payload_too_large";
    if (status >= 500) return "server_error";
    if (error.type === "AuthenticationError") return "auth_401";
    // Every other 4xx from Lara is a request we built wrong.
    if (status >= 400) return "validation_error";
    return "unknown";
  }

  if (error instanceof TimeoutError) return "timeout";
  // A ZodError is what a tool's argument parse throws, and it reaches here
  // before CallTool has rewritten it into an InvalidInputError.
  if (error instanceof z.ZodError) return "validation_error";
  if (error instanceof InvalidInputError) return "validation_error";

  const code = (error as { code?: unknown } | null)?.code;
  const name = (error as { name?: unknown } | null)?.name;
  if (code === "ETIMEDOUT" || name === "AbortError" || name === "TimeoutError") return "timeout";
  if (code === "ECONNREFUSED" || code === "ENOTFOUND" || code === "ECONNRESET")
    return "network_error";

  return "unknown";
}

/** A credential Lara rejected, which is what separates auth_fail from any other call_error. */
const isAuthError = (error: unknown): boolean =>
  error instanceof LaraApiError &&
  (error.statusCode === 401 ||
    error.statusCode === 403 ||
    error.type === "AuthenticationError");

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
 * No token, no account, no event: an access key that `/v2/auth` rejected never produces one, so
 * the `auth_fail` for a bad key is lost. That is the right trade — a made-up id is a fake account
 * that pollutes every number in the funnel.
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

function reportAuthSuccessOnce(accountId: string): void {
  if (seenAccounts.has(accountId)) return;
  if (seenAccounts.size >= MAX_SEEN_ACCOUNTS) seenAccounts.clear();
  seenAccounts.add(accountId);

  logEvent({ eventType: "auth_success", accountId, metadata: { ...BASE_METADATA } });
}

/**
 * Report a tool call that returned. Called from inside CallTool rather than from a wrapper around
 * it, because CallTool rewrites the SDK's errors before they escape and the error path below needs
 * the original.
 */
export function reportCallSuccess(
  ctx: MetricsContext | undefined,
  toolName: string,
  args: unknown,
  startedAt: number
): void {
  if (!ctx) return;

  const accountId = accountIdFor(ctx);
  if (!accountId) return;

  reportAuthSuccessOnce(accountId);

  const call = callFieldsFor(toolName, args);
  logEvent({
    eventType: "call_success",
    accountId,
    latencyMs: Date.now() - startedAt,
    charsTranslated: call.charsTranslated,
    metadata: call.metadata,
  });
}

/** Report a tool call that threw. The error itself is never altered, only described. */
export function reportCallError(
  ctx: MetricsContext | undefined,
  toolName: string,
  args: unknown,
  startedAt: number,
  error: unknown
): void {
  if (!ctx) return;

  const accountId = accountIdFor(ctx);
  if (!accountId) return;

  const { metadata } = callFieldsFor(toolName, args);
  const errorType = errorTypeFor(error);
  const latencyMs = Date.now() - startedAt;

  logEvent({ eventType: "call_error", accountId, errorType, latencyMs, metadata });
  if (isAuthError(error)) {
    logEvent({ eventType: "auth_fail", accountId, errorType, metadata });
  }
}

// The one event that is not about a request: this copy of the server had no installation id, so
// this is the first time it has ever run. It carries no accountId — no key has been accepted yet —
// which is one of the two cases the backend allows that on.
if (metricsEnabled() && getInstallation().created) {
  logEvent({ eventType: "install", metadata: { ...BASE_METADATA } });
}
