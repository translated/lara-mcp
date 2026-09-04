import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { CallToolRequestSchema } from "@modelcontextprotocol/sdk/types.js";

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
    Translator: vi.fn(() => {
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

vi.mock("@modelcontextprotocol/sdk/server/index.js", () => ({
  Server: vi.fn(() => ({
    setRequestHandler: (schema: unknown, handler: any) => handlers.set(schema, handler),
  })),
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
  // Seeded, so the install event is not in the way of what each test asserts.
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

const callTool = (name: string, args?: unknown) =>
  handlers.get(CallToolRequestSchema)({
    method: "tools/call",
    params: { name, arguments: args },
  });

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
      },
    });
    expect(call.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it("reports auth_fail beside call_error even though CallTool rewrites the error", async () => {
    const { getMcpServer, metrics } = await loadServer();
    const { LaraApiError } = await import("@translated/lara");
    getMcpServer("key-id", "key-secret");

    translators[0].translate.mockRejectedValue(
      new LaraApiError(401, "AuthenticationError", "invalid credentials")
    );

    await expect(
      callTool("translate", { target: "it", text: [{ text: "hello" }] })
    ).rejects.toThrow("invalid credentials");
    await metrics.flushNow();

    const events = sentEvents();
    expect(events.map((event: any) => event.eventType)).toEqual(["call_error", "auth_fail"]);
    expect(events[0].errorType).toBe("auth_401");
    expect(events[0].latencyMs).toBeGreaterThanOrEqual(0);
  });

  it("reports a validation failure as call_error without auth_fail", async () => {
    const { getMcpServer, metrics } = await loadServer();
    getMcpServer("key-id", "key-secret");

    await expect(callTool("translate", { target: 42 })).rejects.toThrow();
    await metrics.flushNow();

    const events = sentEvents();
    expect(events.map((event: any) => event.eventType)).toEqual(["call_error"]);
    expect(events[0].errorType).toBe("validation_error");
  });

  it("reports nothing when the SDK never exchanged the key for a token", async () => {
    (globalThis as any).__laraToken = undefined;
    const { getMcpServer, metrics } = await loadServer();
    getMcpServer("bad-id", "bad-secret");

    await callTool("list_memories");
    await metrics.flushNow();

    expect(sentEvents()).toHaveLength(0);
  });

  it("does no reporting at all when telemetry is opted out of", async () => {
    const { getMcpServer, metrics } = await loadServer({ DO_NOT_TRACK: "1" });
    getMcpServer("key-id", "key-secret");

    await callTool("list_memories");
    await metrics.flushNow();

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns the tool result untouched", async () => {
    const { getMcpServer } = await loadServer();
    getMcpServer("key-id", "key-secret");

    translators[0].memories.list.mockResolvedValue([{ id: "mem_1" }]);
    const result = await callTool("list_memories");

    expect(result.structuredContent).toEqual({ items: [{ id: "mem_1" }] });
  });
});
