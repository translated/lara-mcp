import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { LaraApiError, TimeoutError } from "@translated/lara";
import * as z from "zod/v4";

// Deliberately does NOT import utils/mocks.ts: its hoisted vi.mock("@translated/lara")
// would replace the real error classes errorTypeFor is built around.
vi.mock("#logger", () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const URL_BASE = "http://localhost:8080";
const TOKEN_URL = `${URL_BASE}/auth/issue-token`;
const INGEST_URL = `${URL_BASE}/metrics/ingest-events`;

type Metrics = typeof import("../metrics.js");

/** Loads a fresh copy of the module: queue, token and installation id are module state. */
async function loadMetrics(
  env: Record<string, string | undefined> = {}
): Promise<Metrics> {
  // A home of its own per load, already carrying an installation id: only the
  // tests that pass their own LARA_HOME care about the `install` event, and
  // every other one would otherwise start with a stray one in the queue.
  let home = env.LARA_HOME;
  if (!("LARA_HOME" in env)) {
    home = mkdtempSync(join(tmpdir(), "lara-metrics-"));
    writeFileSync(join(home, "installation-id"), randomUUID());
  }

  const defaults: Record<string, string | undefined> = {
    METRICS_URL: URL_BASE,
    METRICS_API_KEY: "dev-mcp-key",
    LARA_HOME: home,
    DO_NOT_TRACK: undefined,
    TRANSPORT: "stdio",
  };

  for (const [key, value] of Object.entries({ ...defaults, ...env })) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }

  vi.resetModules();
  return import("../metrics.js");
}

function createFetchMock() {
  // Loosely typed on purpose: the tests read back the RequestInit the module
  // built, which the global fetch signature does not describe positionally.
  return vi.fn(async (...args: any[]) => {
    const url = args[0] as string;
    if (url === TOKEN_URL) {
      return {
        ok: true,
        status: 200,
        json: async () => ({ status: "success", token: "ingest-token", expiresIn: 3600 }),
      } as unknown as Response;
    }
    return { ok: true, status: 202, json: async () => ({ status: "success", accepted: 1 }) } as unknown as Response;
  });
}

const callsTo = (fetchMock: ReturnType<typeof createFetchMock>, url: string) =>
  fetchMock.mock.calls.filter((call: any) => call[0] === url);

const bodyOf = (call: any) => JSON.parse(call[1].body);

/** A real 3-segment JWT whose payload is the given object. */
function laraToken(payload: Record<string, unknown>): string {
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `header.${encoded}.signature`;
}

const ACCOUNT = "acc_4kQpXbW2mNvRt7yZjD3sLh";

/** A Translator stand-in exposing only the internal client field metrics reads. */
const translatorWithToken = (token?: string) =>
  ({ client: token === undefined ? {} : { token } }) as any;

describe("accountIdFromToken", () => {
  let metrics: Metrics;
  beforeEach(async () => {
    metrics = await loadMetrics();
  });

  it("reads the account from the id claim", () => {
    const token = laraToken({
      id: ACCOUNT,
      userId: "usr_9fTb2xQnWkLmR4vPzE7cJd",
      accessKey: { id: "AKID000000000000000000000" },
    });

    expect(metrics.accountIdFromToken(token)).toBe(ACCOUNT);
  });

  it("returns undefined when the payload carries no id", () => {
    expect(metrics.accountIdFromToken(laraToken({ userId: "usr_1" }))).toBeUndefined();
  });

  it("returns undefined for something that is not a JWT", () => {
    expect(metrics.accountIdFromToken("not-a-token")).toBeUndefined();
    expect(metrics.accountIdFromToken("")).toBeUndefined();
  });
});

describe("errorTypeFor", () => {
  let metrics: Metrics;
  let InvalidInputError: typeof import("../exception.js").InvalidInputError;

  beforeEach(async () => {
    metrics = await loadMetrics();
    // Imported after the reset, so it is the very class metrics.ts holds:
    // a stale copy from a previous module graph would fail every instanceof.
    ({ InvalidInputError } = await import("../exception.js"));
  });

  it.each([
    [new LaraApiError(401, "AuthenticationError", "nope"), "auth_401"],
    [new LaraApiError(403, "Forbidden", "nope"), "auth_403"],
    [new LaraApiError(429, "TooManyRequests", "slow down"), "rate_limit_429"],
    [new LaraApiError(413, "PayloadTooLarge", "too big"), "payload_too_large"],
    [new LaraApiError(500, "ServerError", "boom"), "server_error"],
    [new LaraApiError(400, "BadRequest", "bad"), "validation_error"],
    [new LaraApiError(200, "Weird", "?"), "unknown"],
  ])("maps a Lara API error to its token", (error, expected) => {
    expect(metrics.errorTypeFor(error)).toBe(expected);
  });

  it("maps an AuthenticationError with no usable status to auth_401", () => {
    expect(metrics.errorTypeFor(new LaraApiError(0, "AuthenticationError", "nope"))).toBe(
      "auth_401"
    );
  });

  it("maps timeouts, validation and network failures", () => {
    expect(metrics.errorTypeFor(new TimeoutError("slow"))).toBe("timeout");
    expect(metrics.errorTypeFor(new InvalidInputError("bad field"))).toBe("validation_error");
    // A tool's argument parse throws this, and it reaches errorTypeFor before
    // CallTool has had a chance to rewrite it.
    expect(metrics.errorTypeFor(z.string().safeParse(42).error)).toBe("validation_error");
    expect(metrics.errorTypeFor({ name: "AbortError" })).toBe("timeout");
    expect(metrics.errorTypeFor({ code: "ETIMEDOUT" })).toBe("timeout");
    expect(metrics.errorTypeFor({ code: "ECONNREFUSED" })).toBe("network_error");
    expect(metrics.errorTypeFor({ code: "ENOTFOUND" })).toBe("network_error");
    expect(metrics.errorTypeFor(new Error("something else"))).toBe("unknown");
    expect(metrics.errorTypeFor(null)).toBe("unknown");
  });
});

describe("callFieldsFor", () => {
  let metrics: Metrics;
  beforeEach(async () => {
    metrics = await loadMetrics();
  });

  it("names the capability, never the instance", () => {
    expect(metrics.callFieldsFor("translate", {}).metadata.feature).toBe("text");
    expect(metrics.callFieldsFor("detect_language", {}).metadata.feature).toBe(
      "language_detection"
    );
    expect(metrics.callFieldsFor("list_memories", undefined).metadata.feature).toBe(
      "resource_management"
    );
    expect(metrics.callFieldsFor("create_glossary", {}).metadata.feature).toBe(
      "resource_management"
    );
  });

  it("carries the transport and the tool name", () => {
    const { metadata } = metrics.callFieldsFor("list_memories", undefined);
    expect(metadata).toEqual({
      transport: "stdio",
      feature: "resource_management",
      toolName: "list_memories",
    });
  });

  it("lowercases the language tags and defaults the source to auto", () => {
    const withSource = metrics.callFieldsFor("translate", {
      source: "EN-US",
      target: "IT-IT",
      text: [],
    });
    expect(withSource.metadata.sourceLang).toBe("en-us");
    expect(withSource.metadata.targetLang).toBe("it-it");

    const detected = metrics.callFieldsFor("translate", { target: "it", text: [] });
    expect(detected.metadata.sourceLang).toBe("auto");
  });

  it("counts only the blocks the engine actually translates", () => {
    const { charsTranslated } = metrics.callFieldsFor("translate", {
      target: "it",
      text: [
        { text: "hello" },
        { text: "world", translatable: true },
        { text: "verbatim block", translatable: false },
      ],
    });

    expect(charsTranslated).toBe("hello".length + "world".length);
  });

  it("leaves charsTranslated out when the argument is not a block array", () => {
    expect(metrics.callFieldsFor("translate", { target: "it" }).charsTranslated).toBeUndefined();
    expect(metrics.callFieldsFor("list_memories", undefined).charsTranslated).toBeUndefined();
  });
});

describe("installation id", () => {
  let fetchMock: ReturnType<typeof createFetchMock>;

  beforeEach(() => {
    fetchMock = createFetchMock();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const idFile = (home: string) => join(home, "installation-id");

  it("creates it on first run and reports install once", async () => {
    const home = mkdtempSync(join(tmpdir(), "lara-metrics-"));

    const first = await loadMetrics({ LARA_HOME: home });
    await first.flushNow();

    const stored = readFileSync(idFile(home), "utf8");
    expect(stored).toMatch(/^[0-9a-f-]{36}$/);

    const events = callsTo(fetchMock, INGEST_URL).flatMap((call) => bodyOf(call).events);
    expect(events).toHaveLength(1);
    expect(events[0].eventType).toBe("install");
    expect(events[0].accountId).toBeUndefined();
    expect(bodyOf(callsTo(fetchMock, TOKEN_URL)[0]).installationId).toBe(stored);

    // A second start-up on the same home reuses the id and stays quiet.
    fetchMock.mockClear();
    const second = await loadMetrics({ LARA_HOME: home });
    await second.flushNow();

    expect(readFileSync(idFile(home), "utf8")).toBe(stored);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rewrites a corrupted id without reporting a new install", async () => {
    const home = mkdtempSync(join(tmpdir(), "lara-metrics-"));
    writeFileSync(idFile(home), "not-a-uuid");

    const metrics = await loadMetrics({ LARA_HOME: home });
    metrics.logEvent({ eventType: "auth_success", accountId: ACCOUNT });
    await metrics.flushNow();

    expect(readFileSync(idFile(home), "utf8")).toMatch(/^[0-9a-f-]{36}$/);
    const events = callsTo(fetchMock, INGEST_URL).flatMap((call) => bodyOf(call).events);
    expect(events.map((event: any) => event.eventType)).toEqual(["auth_success"]);
  });

  it("keeps reporting with a per-process id when the home is not writable", async () => {
    // A path whose parent is a file, so mkdir cannot create it.
    const blocker = join(mkdtempSync(join(tmpdir(), "lara-metrics-")), "blocker");
    writeFileSync(blocker, "");

    const metrics = await loadMetrics({ LARA_HOME: join(blocker, "home") });
    metrics.logEvent({ eventType: "auth_success", accountId: ACCOUNT });
    await metrics.flushNow();

    const installationId = bodyOf(callsTo(fetchMock, TOKEN_URL)[0]).installationId;
    expect(installationId).toMatch(/^[0-9a-f-]{36}$/);
    // No install event: nothing was installed, the id simply could not be stored.
    const events = callsTo(fetchMock, INGEST_URL).flatMap((call) => bodyOf(call).events);
    expect(events.map((event: any) => event.eventType)).toEqual(["auth_success"]);
  });
});

describe("delivery", () => {
  let fetchMock: ReturnType<typeof createFetchMock>;
  let metrics: Metrics;

  beforeEach(async () => {
    vi.useFakeTimers();
    fetchMock = createFetchMock();
    vi.stubGlobal("fetch", fetchMock);
    metrics = await loadMetrics();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  const event = (overrides: Partial<Parameters<Metrics["logEvent"]>[0]> = {}) => ({
    eventType: "call_success" as const,
    accountId: ACCOUNT,
    ...overrides,
  });

  it("buys a token with the API key and sends events with the token", async () => {
    metrics.logEvent(event());
    await metrics.flushNow();

    const tokenCall = callsTo(fetchMock, TOKEN_URL)[0];
    expect(tokenCall[1].headers.Authorization).toBe("Bearer dev-mcp-key");
    expect(tokenCall[1].signal).toBeDefined();

    const ingestCall = callsTo(fetchMock, INGEST_URL)[0];
    expect(ingestCall[1].headers.Authorization).toBe("Bearer ingest-token");
    expect(bodyOf(ingestCall).events[0]).toMatchObject({
      eventType: "call_success",
      accountId: ACCOUNT,
      channel: "mcp",
    });
  });

  it("stamps the envelope on every event", async () => {
    metrics.logEvent(event());
    await metrics.flushNow();

    const [sent] = bodyOf(callsTo(fetchMock, INGEST_URL)[0]).events;
    expect(sent.channelVersion).toEqual(expect.any(String));
    expect(sent.sessionId).toMatch(/^[0-9a-f-]{36}$/);
    expect(sent.eventId).toMatch(/^[0-9a-f-]{36}$/);
    expect(Date.parse(sent.timestamp)).not.toBeNaN();
  });

  it("batches everything queued into one request", async () => {
    metrics.logEvent(event());
    metrics.logEvent(event());
    metrics.logEvent(event({ eventType: "call_error", errorType: "timeout" }));
    await metrics.flushNow();

    expect(callsTo(fetchMock, INGEST_URL)).toHaveLength(1);
    expect(bodyOf(callsTo(fetchMock, INGEST_URL)[0]).events).toHaveLength(3);
  });

  it("flushes on its own timer", async () => {
    metrics.logEvent(event());
    expect(fetchMock).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(2000);
    await metrics.flushNow();

    expect(callsTo(fetchMock, INGEST_URL)).toHaveLength(1);
  });

  it("reuses the token across flushes", async () => {
    metrics.logEvent(event());
    await metrics.flushNow();
    metrics.logEvent(event());
    await metrics.flushNow();

    expect(callsTo(fetchMock, TOKEN_URL)).toHaveLength(1);
    expect(callsTo(fetchMock, INGEST_URL)).toHaveLength(2);
  });

  it("re-issues the token and retries exactly once on 401", async () => {
    let ingestCalls = 0;
    fetchMock.mockImplementation(async (...args: any[]) => {
      const url = args[0] as string;
      if (url === TOKEN_URL) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ status: "success", token: `token-${++tokenSerial}`, expiresIn: 3600 }),
        } as unknown as Response;
      }
      ingestCalls += 1;
      if (ingestCalls === 1) return { ok: false, status: 401 } as unknown as Response;
      return { ok: true, status: 202 } as unknown as Response;
    });
    let tokenSerial = 0;

    metrics.logEvent(event());
    await metrics.flushNow();

    const ingest = callsTo(fetchMock, INGEST_URL);
    expect(ingest).toHaveLength(2);
    expect(ingest[0][1].headers.Authorization).toBe("Bearer token-1");
    expect(ingest[1][1].headers.Authorization).toBe("Bearer token-2");
    // The retry carries the same eventId, so the backend can recognize the duplicate.
    expect(bodyOf(ingest[1]).events[0].eventId).toBe(bodyOf(ingest[0]).events[0].eventId);
  });

  it("gives up after a single retry", async () => {
    let tokenSerial = 0;
    fetchMock.mockImplementation(async (...args: any[]) => {
      const url = args[0] as string;
      if (url === TOKEN_URL) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ status: "success", token: `token-${++tokenSerial}`, expiresIn: 3600 }),
        } as unknown as Response;
      }
      return { ok: false, status: 401 } as unknown as Response;
    });

    metrics.logEvent(event());
    await metrics.flushNow();

    expect(callsTo(fetchMock, INGEST_URL)).toHaveLength(2);
  });

  it("requeues a batch the backend could not take, and drops one it rejected", async () => {
    fetchMock.mockImplementation(async (...args: any[]) => {
      const url = args[0] as string;
      if (url === TOKEN_URL) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ status: "success", token: "ingest-token", expiresIn: 3600 }),
        } as unknown as Response;
      }
      return { ok: false, status: 429 } as unknown as Response;
    });

    metrics.logEvent(event());
    await metrics.flushNow();
    expect(callsTo(fetchMock, INGEST_URL)).toHaveLength(1);

    // Still queued: the next flush sends it again.
    await metrics.flushNow();
    expect(callsTo(fetchMock, INGEST_URL)).toHaveLength(2);

    // A verdict from the backend is different — the same body would be refused forever.
    fetchMock.mockImplementation(async (...args: any[]) => {
      const url = args[0] as string;
      if (url === TOKEN_URL) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ status: "success", token: "ingest-token", expiresIn: 3600 }),
        } as unknown as Response;
      }
      return { ok: false, status: 400 } as unknown as Response;
    });
    await metrics.flushNow();
    expect(callsTo(fetchMock, INGEST_URL)).toHaveLength(3);

    // Dropped, so there is nothing left for the next flush to send.
    await metrics.flushNow();
    expect(callsTo(fetchMock, INGEST_URL)).toHaveLength(3);
  });

  it("holds the batch back while the token endpoint is in cooldown", async () => {
    fetchMock.mockImplementationOnce(async () => ({ ok: false, status: 429 }) as unknown as Response);

    metrics.logEvent(event());
    await metrics.flushNow();
    expect(callsTo(fetchMock, TOKEN_URL)).toHaveLength(1);
    expect(callsTo(fetchMock, INGEST_URL)).toHaveLength(0);

    // Inside the 10s window the endpoint is not even asked.
    await metrics.flushNow();
    expect(callsTo(fetchMock, TOKEN_URL)).toHaveLength(1);

    vi.advanceTimersByTime(10_000);
    await metrics.flushNow();
    expect(callsTo(fetchMock, TOKEN_URL)).toHaveLength(2);
    expect(bodyOf(callsTo(fetchMock, INGEST_URL)[0]).events).toHaveLength(1);
  });

  it("keeps the envelope authoritative over whatever a caller passes", async () => {
    metrics.logEvent({
      ...event(),
      // Not reachable through the public type, but the envelope must win regardless.
      ...({ channel: "slack", sessionId: "spoofed", eventId: "spoofed" } as any),
    });
    await metrics.flushNow();

    const [sent] = bodyOf(callsTo(fetchMock, INGEST_URL)[0]).events;
    expect(sent.channel).toBe("mcp");
    expect(sent.sessionId).not.toBe("spoofed");
    expect(sent.eventId).not.toBe("spoofed");
  });

  it("stays within the cap when a failed batch goes back on the queue", async () => {
    // The overshoot only happens if events arrive while a batch is in flight: the batch is out of
    // the queue, so new events refill it to the cap, and handing the batch back pushes it over.
    let releaseSend: () => void;
    const sendInFlight = new Promise<void>((resolve) => (releaseSend = resolve));

    fetchMock.mockImplementation(async (...args: any[]) => {
      const url = args[0] as string;
      if (url === TOKEN_URL) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ status: "success", token: "ingest-token", expiresIn: 3600 }),
        } as unknown as Response;
      }
      await sendInFlight;
      return { ok: false, status: 503 } as unknown as Response;
    });

    for (let i = 0; i < 10_000; i++) metrics.logEvent(event());
    const flushed = metrics.flushNow();

    // The first batch is out of the queue and the request is hanging: refill the gap it left.
    await vi.advanceTimersByTimeAsync(0);
    for (let i = 0; i < 500; i++) metrics.logEvent(event());

    releaseSend!();
    await flushed;

    // Nothing more is logged after this, so only the requeue path can hold the bound.
    fetchMock.mockImplementation(async (...args: any[]) => {
      const url = args[0] as string;
      if (url === TOKEN_URL) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ status: "success", token: "ingest-token", expiresIn: 3600 }),
        } as unknown as Response;
      }
      return { ok: true, status: 202 } as unknown as Response;
    });
    fetchMock.mockClear();
    await metrics.flushNow();

    const delivered = callsTo(fetchMock, INGEST_URL).reduce(
      (total, call) => total + bodyOf(call).events.length,
      0
    );
    expect(delivered).toBe(10_000);
  });

  it("caps the backlog and splits it into batches", async () => {
    for (let i = 0; i < 10_050; i++) metrics.logEvent(event());
    await metrics.flushNow();

    const batches = callsTo(fetchMock, INGEST_URL).map((call) => bodyOf(call).events.length);
    expect(Math.max(...batches)).toBeLessThanOrEqual(500);
    expect(batches.reduce((a, b) => a + b, 0)).toBe(10_000);
  });

  it("swallows a backend that rejects outright", async () => {
    fetchMock.mockRejectedValue(new Error("ECONNREFUSED"));

    metrics.logEvent(event());
    await expect(metrics.flushNow()).resolves.toBeUndefined();
  });

  it("never sends credentials or translated text", async () => {
    metrics.logEvent({
      eventType: "call_success",
      accountId: ACCOUNT,
      ...metrics.callFieldsFor("translate", {
        source: "en",
        target: "it",
        text: [{ text: "a very secret sentence" }],
      }),
    });
    await metrics.flushNow();

    const payload = JSON.stringify(bodyOf(callsTo(fetchMock, INGEST_URL)[0]));
    expect(payload).not.toContain("a very secret sentence");
    expect(payload).not.toContain("dev-mcp-key");
    expect(payload).not.toContain("accessKey");
  });
});

describe("opt-out and configuration", () => {
  let fetchMock: ReturnType<typeof createFetchMock>;

  beforeEach(() => {
    fetchMock = createFetchMock();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it.each(["1", "true", "yes", "TRUE", " 1 "])(
    "sends nothing when DO_NOT_TRACK is %s",
    async (value) => {
      const metrics = await loadMetrics({ DO_NOT_TRACK: value });

      expect(metrics.metricsEnabled()).toBe(false);
      metrics.logEvent({ eventType: "call_success", accountId: ACCOUNT });
      await metrics.flushNow();
      expect(fetchMock).not.toHaveBeenCalled();
    }
  );

  it("stays on for a DO_NOT_TRACK value that is not an opt-out", async () => {
    const metrics = await loadMetrics({ DO_NOT_TRACK: "0" });
    expect(metrics.metricsEnabled()).toBe(true);
  });

  it("writes no installation id when telemetry is off", async () => {
    const home = mkdtempSync(join(tmpdir(), "lara-metrics-"));
    await loadMetrics({ DO_NOT_TRACK: "1", LARA_HOME: home });

    expect(() => readFileSync(join(home, "installation-id"), "utf8")).toThrow();
  });

  it.each([
    ["an unset URL", { METRICS_URL: undefined }],
    ["an unset API key", { METRICS_API_KEY: undefined }],
    ["a blank API key", { METRICS_API_KEY: "   " }],
    ["a malformed URL", { METRICS_URL: "not a url" }],
  ])("is off with %s", async (_label, env) => {
    const metrics = await loadMetrics(env);

    expect(metrics.metricsEnabled()).toBe(false);
    metrics.logEvent({ eventType: "call_success", accountId: ACCOUNT });
    await metrics.flushNow();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("tolerates a trailing slash on the URL", async () => {
    const metrics = await loadMetrics({ METRICS_URL: `${URL_BASE}//` });
    metrics.logEvent({ eventType: "call_success", accountId: ACCOUNT });
    await metrics.flushNow();

    expect(callsTo(fetchMock, TOKEN_URL)).toHaveLength(1);
    expect(callsTo(fetchMock, INGEST_URL)).toHaveLength(1);
  });

  it("builds no context when telemetry is off", async () => {
    const metrics = await loadMetrics({ DO_NOT_TRACK: "1" });
    expect(metrics.createMetricsContext(translatorWithToken(laraToken({ id: ACCOUNT })))).toBeUndefined();
  });
});

describe("reporting a tool call", () => {
  let fetchMock: ReturnType<typeof createFetchMock>;
  let metrics: Metrics;

  const sentEvents = () =>
    callsTo(fetchMock, INGEST_URL).flatMap((call) => bodyOf(call).events);

  beforeEach(async () => {
    fetchMock = createFetchMock();
    vi.stubGlobal("fetch", fetchMock);
    metrics = await loadMetrics();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("reports auth_success once, then a call_success per call", async () => {
    const ctx = metrics.createMetricsContext(translatorWithToken(laraToken({ id: ACCOUNT })))!;

    metrics.reportCallSuccess(ctx, "translate", { target: "it", text: [{ text: "ciao" }] }, Date.now());
    metrics.reportCallSuccess(ctx, "list_memories", undefined, Date.now());
    await metrics.flushNow();

    const events = sentEvents();
    expect(events.map((e: any) => e.eventType)).toEqual([
      "auth_success",
      "call_success",
      "call_success",
    ]);
    expect(events.every((e: any) => e.accountId === ACCOUNT)).toBe(true);
    expect(events[1]).toMatchObject({
      charsTranslated: 4,
      metadata: { feature: "text", toolName: "translate", targetLang: "it", transport: "stdio" },
    });
    expect(events[1].latencyMs).toBeGreaterThanOrEqual(0);
  });

  it("reports auth_success once per account across sessions", async () => {
    const token = laraToken({ id: ACCOUNT });
    // Two sessions for the same account: the HTTP transport builds one per request.
    metrics.reportCallSuccess(
      metrics.createMetricsContext(translatorWithToken(token))!,
      "list_memories",
      undefined,
      Date.now()
    );
    metrics.reportCallSuccess(
      metrics.createMetricsContext(translatorWithToken(token))!,
      "list_memories",
      undefined,
      Date.now()
    );
    await metrics.flushNow();

    expect(sentEvents().filter((e: any) => e.eventType === "auth_success")).toHaveLength(1);
  });

  it("reports auth_success per distinct account", async () => {
    for (const id of [ACCOUNT, "acc_other"]) {
      metrics.reportCallSuccess(
        metrics.createMetricsContext(translatorWithToken(laraToken({ id })))!,
        "list_memories",
        undefined,
        Date.now()
      );
    }
    await metrics.flushNow();

    const authEvents = sentEvents().filter((e: any) => e.eventType === "auth_success");
    expect(authEvents.map((e: any) => e.accountId)).toEqual([ACCOUNT, "acc_other"]);
  });

  it("reports call_error, and auth_fail beside it when Lara rejected the key", async () => {
    const ctx = metrics.createMetricsContext(translatorWithToken(laraToken({ id: ACCOUNT })))!;
    ctx.accountId = ACCOUNT;

    metrics.reportCallError(
      ctx,
      "translate",
      { target: "it", text: [] },
      Date.now(),
      new LaraApiError(401, "AuthenticationError", "nope")
    );
    metrics.reportCallError(ctx, "translate", {}, Date.now(), new TimeoutError("slow"));
    await metrics.flushNow();

    const events = sentEvents();
    expect(events.map((e: any) => e.eventType)).toEqual([
      "call_error",
      "auth_fail",
      "call_error",
    ]);
    expect(events[0].errorType).toBe("auth_401");
    expect(events[2].errorType).toBe("timeout");
    expect(events[2].latencyMs).toBeGreaterThanOrEqual(0);
  });

  it("reports nothing for a key the SDK never exchanged", async () => {
    const ctx = metrics.createMetricsContext(translatorWithToken(undefined))!;

    metrics.reportCallSuccess(ctx, "translate", {}, Date.now());
    metrics.reportCallError(ctx, "translate", {}, Date.now(), new LaraApiError(401, "AuthenticationError", "nope"));
    await metrics.flushNow();

    expect(callsTo(fetchMock, INGEST_URL)).toHaveLength(0);
  });

  it("is a no-op without a context", async () => {
    metrics.reportCallSuccess(undefined, "translate", {}, Date.now());
    metrics.reportCallError(undefined, "translate", {}, Date.now(), new Error("boom"));
    await metrics.flushNow();

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("decodes the account once and caches it on the context", async () => {
    const translator = translatorWithToken(laraToken({ id: ACCOUNT }));
    const ctx = metrics.createMetricsContext(translator)!;

    metrics.reportCallSuccess(ctx, "list_memories", undefined, Date.now());
    expect(ctx.accountId).toBe(ACCOUNT);

    // The token is gone, but the account is already known.
    translator.client.token = undefined;
    metrics.reportCallSuccess(ctx, "list_memories", undefined, Date.now());
    await metrics.flushNow();

    expect(sentEvents().filter((e: any) => e.eventType === "call_success")).toHaveLength(2);
  });
});
