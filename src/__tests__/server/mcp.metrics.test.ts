import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

vi.mock("#logger", () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

// Only the Translator is faked. The error classes stay real: errorTypeFor is
// built on instanceof, and a stubbed LaraApiError would make every mapping pass
// for the wrong reason.
const { translators } = vi.hoisted(() => ({ translators: [] as any[] }));

vi.mock("@translated/lara", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@translated/lara")>();
  return {
    ...actual,
    Translator: vi.fn(function () {
      const instance = {
        client: { setExtraHeader: vi.fn(), token: (globalThis as any).__laraToken },
        translate: vi.fn(),
        memories: { list: vi.fn().mockResolvedValue([]) },
      };
      translators.push(instance);
      return instance;
    }),
  };
});

// The MCP SDK Server is replaced by a handler registry, so the test can invoke
// the very handler getMcpServer registered.
const { handlers } = vi.hoisted(() => ({ handlers: new Map<unknown, any>() }));

vi.mock("@modelcontextprotocol/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@modelcontextprotocol/server")>()),
  Server: vi.fn(function () { return {
    setRequestHandler: (method: string, handler: any) => handlers.set(method, handler),
    // What the client said it is: set by initialize or the 2026 envelope, never on the HTTP fallback.
    getClientVersion: () => (globalThis as any).__clientInfo,
  }; }),
}));

const URL_BASE = "http://localhost:8080";
const INGEST_URL = `${URL_BASE}/metrics/ingest-events`;
const ACCOUNT = "acc_4kQpXbW2mNvRt7yZjD3sLh";

const laraToken = (payload: Record<string, unknown>) =>
  `header.${Buffer.from(JSON.stringify(payload)).toString("base64url")}.signature`;

function createFetchMock() {
  // Loosely typed on purpose: the tests read back the RequestInit the module
  // built, which the global fetch signature does not describe positionally.
  return vi.fn(async (...args: any[]) => {
    const url = args[0] as string;
    if (url.endsWith("/auth/issue-token")) {
      return {
        ok: true,
        status: 200,
        json: async () => ({ status: "success", token: "ingest-token", expiresIn: 3600 }),
      } as unknown as Response;
    }
    return { ok: true, status: 202 } as unknown as Response;
  });
}

let fetchMock: ReturnType<typeof createFetchMock>;

async function loadServer(env: Record<string, string> = {}) {
  const home = mkdtempSync(join(tmpdir(), "lara-server-metrics-"));
  // Seeded, as a returning installation.
  writeFileSync(join(home, "installation-id"), randomUUID());

  delete process.env.DO_NOT_TRACK;
  Object.assign(process.env, {
    METRICS_URL: URL_BASE,
    METRICS_API_KEY: "dev-mcp-key",
    LARA_HOME: home,
    TRANSPORT: "stdio",
    ...env,
  });

  vi.resetModules();
  handlers.clear();
  translators.length = 0;

  const { default: getMcpServer } = await import("../../mcp/server.js");
  const metrics = await import("../../metrics.js");
  return { getMcpServer, metrics };
}

const callTool = (name: string, args?: unknown, ctx?: unknown) =>
  handlers.get("tools/call")(
    { method: "tools/call", params: { name, arguments: args } },
    ctx ?? {}
  );

// Tool failures come back as isError results, the message in the only text block.
const expectToolError = async (result: Promise<any>, message?: string) => {
  const { isError, content } = await result;
  expect(isError).toBe(true);
  if (message) expect(content[0].text).toContain(message);
};

const sentEvents = () =>
  fetchMock.mock.calls
    .filter((call: any) => call[0] === INGEST_URL)
    .flatMap((call) => JSON.parse((call[1] as any).body).events);

beforeEach(() => {
  fetchMock = createFetchMock();
  vi.stubGlobal("fetch", fetchMock);
  (globalThis as any).__laraToken = laraToken({ id: ACCOUNT });
});

afterEach(() => {
  vi.unstubAllGlobals();
  delete (globalThis as any).__laraToken;
  delete (globalThis as any).__clientInfo;
});

describe("getMcpServer funnel metrics", () => {
  it("reports auth_success then a call_success per tool call", async () => {
    const { getMcpServer, metrics } = await loadServer();
    getMcpServer("key-id", "key-secret");

    await callTool("list_memories");
    await callTool("list_memories");
    await metrics.flushNow();

    const events = sentEvents();
    expect(events.map((event: any) => event.eventType)).toEqual([
      "auth_success",
      "call_success",
      "call_success",
    ]);
    // The account behind the key, never the key itself.
    expect(events.every((event: any) => event.accountId === ACCOUNT)).toBe(true);
    const payload = JSON.stringify(events);
    expect(payload).not.toContain("key-id");
    expect(payload).not.toContain("key-secret");
  });

  it("reports auth_success once per account across server instances", async () => {
    const { getMcpServer, metrics } = await loadServer({ TRANSPORT: "http" });

    // The HTTP transport is stateless: one server, and one Translator, per request.
    getMcpServer("key-id", "key-secret");
    await callTool("list_memories");
    getMcpServer("key-id", "key-secret");
    await callTool("list_memories");
    await metrics.flushNow();

    const events = sentEvents();
    expect(events.filter((event: any) => event.eventType === "auth_success")).toHaveLength(1);
    expect(events[1].metadata.transport).toBe("http");
  });

  it("describes a translate call with feature, languages and character count", async () => {
    const { getMcpServer, metrics } = await loadServer();
    getMcpServer("key-id", "key-secret");

    translators[0].translate.mockResolvedValue({ translation: [{ text: "ciao" }] });
    await callTool("translate", {
      source: "EN-US",
      target: "IT-IT",
      text: [{ text: "hello" }, { text: "keep me", translatable: false }],
    });
    await metrics.flushNow();

    const call = sentEvents().find((event: any) => event.eventType === "call_success");
    expect(call).toMatchObject({
      charsTranslated: 5,
      metadata: {
        feature: "text",
        toolName: "translate",
        sourceLang: "en-us",
        targetLang: "it-it",
        transport: "stdio",
        os: process.platform,
        nodeVersion: process.versions.node,
        blockCount: 2,
      },
    });
    expect(call.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it("reports auth_fail beside call_error even though CallTool turns the error into a result", async () => {
    const { getMcpServer, metrics } = await loadServer();
    const { LaraApiError } = await import("@translated/lara");
    getMcpServer("key-id", "key-secret");

    translators[0].translate.mockRejectedValue(
      new LaraApiError(401, "AuthenticationError", "invalid credentials")
    );

    await expectToolError(callTool("translate", { target: "it", text: [{ text: "hello" }] }), "invalid credentials");
    await metrics.flushNow();

    const events = sentEvents();
    expect(events.map((event: any) => event.eventType)).toEqual(["call_error", "auth_fail"]);
    expect(events[0].errorType).toBe("auth_401");
    expect(events[0].latencyMs).toBeGreaterThanOrEqual(0);
  });

  it("reports a validation failure as call_error without auth_fail", async () => {
    const { getMcpServer, metrics } = await loadServer();
    getMcpServer("key-id", "key-secret");

    await expectToolError(callTool("translate", { target: 42 }));
    await metrics.flushNow();

    const events = sentEvents();
    // The SDK holds a token, so the account's first event is still its auth_success.
    expect(events.map((event: any) => event.eventType)).toEqual(["auth_success", "call_error"]);
    expect(events[1].errorType).toBe("validation_error");
    expect(events[1].metadata.invalidFields).toContain("target");
    expect(events[1].metadata.invalidIssues).toContain("target:invalid_type");
  });

  it("reports a key Lara rejected outright as one auth_fail with no account", async () => {
    (globalThis as any).__laraToken = undefined;
    const { getMcpServer, metrics } = await loadServer();
    const { LaraApiError } = await import("@translated/lara");
    getMcpServer("bad-id", "bad-secret");

    translators[0].translate.mockRejectedValue(
      new LaraApiError(401, "AuthenticationError", "invalid credentials")
    );
    await expectToolError(callTool("translate", { target: "it", text: [{ text: "hello" }] }), "invalid credentials");
    await metrics.flushNow();

    const events = sentEvents();
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      eventType: "auth_fail",
      errorType: "auth_401",
      metadata: { toolName: "translate", httpStatus: 401, transport: "stdio" },
    });
    expect(events[0]).not.toHaveProperty("accountId");
  });

  it("reports nothing for any other failure before the account is known", async () => {
    (globalThis as any).__laraToken = undefined;
    const { getMcpServer, metrics } = await loadServer();
    getMcpServer("key-id", "key-secret");

    await expectToolError(callTool("translate", { target: 42 }));
    await metrics.flushNow();

    expect(sentEvents()).toHaveLength(0);
  });

  it("reports nothing for a no_trace call, even the auth_success it would have been", async () => {
    const { getMcpServer, metrics } = await loadServer();
    const { LaraApiError } = await import("@translated/lara");
    getMcpServer("key-id", "key-secret");

    translators[0].translate.mockResolvedValue({ translation: [{ text: "ciao" }] });
    const result = await callTool("translate", {
      target: "it",
      text: [{ text: "hello" }],
      no_trace: true,
    });
    expect(result.structuredContent).toBeDefined();

    translators[0].translate.mockRejectedValueOnce(
      new LaraApiError(401, "AuthenticationError", "invalid credentials")
    );
    await expectToolError(callTool("translate", { target: "it", text: [{ text: "hello" }], no_trace: true }));
    await metrics.flushNow();
    expect(fetchMock).not.toHaveBeenCalled();

    // Per call: the next one without the flag is reported.
    await callTool("translate", { target: "it", text: [{ text: "hello" }] });
    await metrics.flushNow();
    expect(sentEvents().map((event: any) => event.eventType)).toEqual([
      "auth_success",
      "call_success",
    ]);
  });

  it("does not report a tool that does not exist", async () => {
    const { getMcpServer, metrics } = await loadServer();
    getMcpServer("key-id", "key-secret");

    await expect(callTool("tell_me_your_secrets")).rejects.toThrow("not found");
    // Prototype names are not tools either.
    await expect(callTool("constructor", {})).rejects.toThrow("not found");
    await expect(callTool("toString")).rejects.toThrow("not found");
    await metrics.flushNow();

    expect(sentEvents()).toHaveLength(0);
  });

  it("buckets the STDIO client from the initialize handshake", async () => {
    (globalThis as any).__clientInfo = { name: "claude-ai", version: "0.9.1" };
    const { getMcpServer, metrics } = await loadServer();
    getMcpServer("key-id", "key-secret");

    await callTool("list_memories");
    await metrics.flushNow();

    for (const event of sentEvents()) {
      expect(event.metadata).toMatchObject({ client: "claude", clientVersion: "0.9.1" });
    }
  });

  it("buckets the client from the 2026-07-28 request envelope", async () => {
    // A 2025-era handshake on the same instance must not win over what this request says.
    (globalThis as any).__clientInfo = { name: "claude-ai", version: "0.9.1" };
    const { getMcpServer, metrics } = await loadServer();
    getMcpServer("key-id", "key-secret");

    await callTool("list_memories", undefined, {
      mcpReq: { envelope: { "io.modelcontextprotocol/clientInfo": { name: "Codex", version: "2.3.0" } } },
    });
    await metrics.flushNow();

    const call = sentEvents().find((event: any) => event.eventType === "call_success");
    expect(call.metadata).toMatchObject({ client: "codex", clientVersion: "2.3.0" });
  });

  it("buckets the HTTP client from its User-Agent", async () => {
    const { getMcpServer, metrics } = await loadServer({ TRANSPORT: "http" });
    getMcpServer("key-id", "key-secret");

    await callTool("list_memories", undefined, {
      http: { req: new Request("http://localhost/v1", { headers: { "user-agent": "Cursor/1.2 (Macintosh; jane)" } }) },
    });
    await metrics.flushNow();

    const call = sentEvents().find((event: any) => event.eventType === "call_success");
    expect(call.metadata).toMatchObject({ client: "cursor", transport: "http" });
    expect(call.metadata).not.toHaveProperty("clientVersion");
    expect(JSON.stringify(sentEvents())).not.toContain("jane");
  });

  it("never reports text, credentials, ids or instructions", async () => {
    const { getMcpServer, metrics } = await loadServer();
    const { LaraApiError } = await import("@translated/lara");
    getMcpServer("AKIDsecretKeyId", "secretKeySecret");

    const args = {
      source: "en",
      target: "it",
      text: [{ text: "a confidential sentence" }],
      glossaries: ["gls_confidentialGlossary"],
      adapt_to: ["mem_confidentialMemory"],
      instructions: ["confidential instruction"],
      context: "confidential context",
    };
    translators[0].translate.mockResolvedValueOnce({ translation: [{ text: "una frase" }] });
    await callTool("translate", args);
    translators[0].translate.mockRejectedValueOnce(
      new LaraApiError(400, "BadRequest", "confidential message from the API")
    );
    await expectToolError(callTool("translate", args));
    await metrics.flushNow();

    const payload = JSON.stringify(sentEvents());
    expect(sentEvents().map((event: any) => event.eventType)).toEqual([
      "auth_success",
      "call_success",
      "call_error",
    ]);
    expect(payload).not.toMatch(/confidential|una frase|secretKey|AKID/);
  });

  it("does no reporting at all when telemetry is opted out of", async () => {
    const { getMcpServer, metrics } = await loadServer({ DO_NOT_TRACK: "1" });
    getMcpServer("key-id", "key-secret");

    await callTool("list_memories");
    await metrics.flushNow();

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("never turns a call Lara completed into an error when metrics break", async () => {
    const { getMcpServer, metrics } = await loadServer();
    getMcpServer("key-id", "key-secret");
    Object.defineProperty(translators[0].client, "token", {
      get() {
        throw new Error("metrics bug");
      },
    });

    translators[0].memories.list.mockResolvedValue([{ id: "mem_1", name: "Mine" }]);
    const result = await callTool("list_memories");
    await metrics.flushNow();

    expect(result.isError).toBeUndefined();
    expect(result.structuredContent).toEqual({ items: [{ id: "mem_1", name: "Mine" }] });
    expect(sentEvents()).toHaveLength(0);
  });

  it("returns the tool result untouched", async () => {
    const { getMcpServer } = await loadServer();
    getMcpServer("key-id", "key-secret");

    translators[0].memories.list.mockResolvedValue([{ id: "mem_1" }]);
    const result = await callTool("list_memories");

    expect(result.structuredContent).toEqual({ items: [{ id: "mem_1" }] });
  });
});
