import { describe, it, expect, vi } from "vitest";
import request from "supertest";
import {
  CLIENT_CAPABILITIES_META_KEY,
  CLIENT_INFO_META_KEY,
  PROTOCOL_VERSION_META_KEY,
  ProtocolErrorCode,
  SERVER_INFO_META_KEY,
} from "@modelcontextprotocol/client";
import { PACKAGE_VERSION } from "../../version.js";

// Raw wire contract of the /v1 endpoint for protocol revision 2026-07-28
// (and the 2025-era fallback), independent of any SDK client behavior.

vi.mock("#logger", () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock("@translated/lara", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@translated/lara")>();
  return {
    ...actual,
    Translator: vi.fn(function () {
      return {
        getLanguages: vi.fn(async () => ["en-US", "it-IT"]),
        client: { setExtraHeader: vi.fn() },
      };
    }),
  };
});

const { RestServer } = await import("../../rest/server.js");
const { default: mcpRouter } = await import("../../rest/routes/mcp.js");
const { ListTools } = await import("../../mcp/tools.js");

const restServer = new RestServer();
const app = restServer.configure();
app.use("/v1", mcpRouter(restServer));

const MODERN = "2026-07-28";
// SDK v2 does not export the SEP-2243 HeaderMismatch code
const HEADER_MISMATCH = -32020;
const envelope = {
  [PROTOCOL_VERSION_META_KEY]: MODERN,
  [CLIENT_CAPABILITIES_META_KEY]: {},
  [CLIENT_INFO_META_KEY]: { name: "wire-test", version: "1.0.0" },
};
const baseHeaders = {
  accept: "application/json, text/event-stream",
  "content-type": "application/json",
  "x-lara-access-key-id": "test-id",
  "x-lara-access-key-secret": "test-secret",
};

let nextId = 1;
function rpc(headers: Record<string, string>, method: string, params: Record<string, unknown>) {
  return request(app)
    .post("/v1")
    .set(headers)
    .send({ jsonrpc: "2.0", id: nextId++, method, params });
}

// A well-formed 2026-07-28 request: envelope plus matching standard headers
function modern(method: string, params: Record<string, unknown> = {}, headers: Record<string, string> = {}) {
  const name = (params.name ?? params.uri) as string | undefined;
  return rpc(
    {
      ...baseHeaders,
      "mcp-protocol-version": MODERN,
      "mcp-method": method,
      ...(name ? { "mcp-name": name } : {}),
      ...headers,
    },
    method,
    { ...params, _meta: envelope }
  );
}

function expectServerInfo(result: any) {
  expect(result._meta[SERVER_INFO_META_KEY]).toEqual({
    name: "Lara Translate",
    version: PACKAGE_VERSION,
  });
}

describe("2026-07-28 wire contract", () => {
  it("server/discover advertises the modern revision and capabilities", async () => {
    const res = await modern("server/discover");

    expect(res.status).toBe(200);
    expect(res.body.result).toMatchObject({
      supportedVersions: [MODERN],
      capabilities: { tools: {}, resources: {} },
      resultType: "complete",
      ttlMs: 3_600_000,
      cacheScope: "public",
    });
    expectServerInfo(res.body.result);
  });

  it.each(["tools/list", "resources/list", "resources/templates/list"])(
    "%s is a public cacheable result with a 1h TTL",
    async (method) => {
      const res = await modern(method);

      expect(res.status).toBe(200);
      expect(res.body.result).toMatchObject({
        resultType: "complete",
        ttlMs: 3_600_000,
        cacheScope: "public",
      });
      expectServerInfo(res.body.result);
    }
  );

  it("resources/read carries account data: private and never cached", async () => {
    const res = await modern("resources/read", { uri: "languages://list" });

    expect(res.status).toBe(200);
    expect(res.body.result).toMatchObject({
      resultType: "complete",
      ttlMs: 0,
      cacheScope: "private",
    });
    expect(JSON.parse(res.body.result.contents[0].text)).toEqual(["en-US", "it-IT"]);
  });

  it("tools/call returns a complete result with content and structuredContent", async () => {
    const res = await modern("tools/call", { name: "list_languages", arguments: {} });

    expect(res.status).toBe(200);
    expect(res.body.result).toMatchObject({
      resultType: "complete",
      structuredContent: { items: ["en-US", "it-IT"] },
    });
    expect(res.body.result.content.length).toBeGreaterThan(0);
    expect(res.body.result).not.toHaveProperty("ttlMs");
    expectServerInfo(res.body.result);
  });

  it("tool execution errors are in-band isError results", async () => {
    const res = await modern("tools/call", { name: "delete_memory", arguments: { id: 42 } });

    expect(res.status).toBe(200);
    expect(res.body.result).toMatchObject({ resultType: "complete", isError: true });
    expect(res.body.result.content[0].text).toMatch(/Invalid input:.*id/);
  });

  it("unknown tools are an InvalidParams JSON-RPC error", async () => {
    const res = await modern("tools/call", { name: "no_such_tool", arguments: {} });

    expect(res.body.error).toMatchObject({ code: ProtocolErrorCode.InvalidParams });
  });

  it("unknown resources are an InvalidParams JSON-RPC error", async () => {
    const res = await modern("resources/read", { uri: "nope://x" });

    expect(res.body.error).toMatchObject({ code: ProtocolErrorCode.InvalidParams });
  });

  it("rejects an Mcp-Method header that disagrees with the body (-32020)", async () => {
    const res = await modern("tools/list", {}, { "mcp-method": "tools/call" });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatchObject({ code: HEADER_MISMATCH });
  });

  it("rejects a tools/call without the Mcp-Name header (-32020)", async () => {
    const res = await rpc(
      { ...baseHeaders, "mcp-protocol-version": MODERN, "mcp-method": "tools/call" },
      "tools/call",
      { name: "list_languages", arguments: {}, _meta: envelope }
    );

    expect(res.status).toBe(400);
    expect(res.body.error).toMatchObject({ code: HEADER_MISMATCH });
  });

  it("rejects an unsupported protocol version (-32022)", async () => {
    const res = await rpc(
      { ...baseHeaders, "mcp-protocol-version": "2099-01-01", "mcp-method": "tools/list" },
      "tools/list",
      { _meta: { ...envelope, [PROTOCOL_VERSION_META_KEY]: "2099-01-01" } }
    );

    expect(res.status).toBe(400);
    expect(res.body.error).toMatchObject({ code: ProtocolErrorCode.UnsupportedProtocolVersion });
    expect(res.body.error.data.supported).toContain(MODERN);
  });

  it("still requires Lara credentials on modern requests", async () => {
    const res = await rpc(
      {
        accept: baseHeaders.accept,
        "content-type": "application/json",
        "mcp-protocol-version": MODERN,
        "mcp-method": "tools/list",
      },
      "tools/list",
      { _meta: envelope }
    );

    expect(res.status).toBe(400);
    expect(res.body.error).toMatchObject({ code: -32600, message: "Invalid credentials" });
  });

  it("allows the MCP standard headers in CORS preflight", async () => {
    const res = await request(app)
      .options("/v1")
      .set({
        origin: "https://client.example",
        "access-control-request-method": "POST",
        "access-control-request-headers": "mcp-protocol-version,mcp-method,mcp-name,content-type",
      });

    expect(res.status).toBe(204);
    const allowed = String(res.headers["access-control-allow-headers"]).toLowerCase().split(",");
    expect(allowed).toEqual(
      expect.arrayContaining(["mcp-protocol-version", "mcp-method", "mcp-name", "content-type"])
    );
  });
});

describe("2025-era fallback wire contract", () => {
  function legacy(method: string, params: Record<string, unknown>) {
    return rpc({ ...baseHeaders, "mcp-protocol-version": "2025-11-25" }, method, params);
  }

  // Legacy responses are SSE-framed: pull the JSON-RPC message out of the data line
  function message(res: request.Response): any {
    const data = res.text.split("\n").find((line) => line.startsWith("data: "));
    return JSON.parse(data!.slice("data: ".length));
  }

  it("serves initialize without cache fields or resultType", async () => {
    const res = await legacy("initialize", {
      protocolVersion: "2025-11-25",
      capabilities: {},
      clientInfo: { name: "legacy-client", version: "1.0.0" },
    });

    expect(res.status).toBe(200);
    const { result } = message(res);
    expect(result.protocolVersion).toBe("2025-11-25");
    expect(result.serverInfo).toMatchObject({ name: "Lara Translate", version: PACKAGE_VERSION });
    expect(result).not.toHaveProperty("resultType");
  });

  it("serves tools/list without 2026-only fields", async () => {
    const res = await legacy("tools/list", {});

    expect(res.status).toBe(200);
    const { result } = message(res);
    expect(result.tools).toHaveLength((await ListTools()).tools.length);
    expect(result).not.toHaveProperty("ttlMs");
    expect(result).not.toHaveProperty("cacheScope");
    expect(result).not.toHaveProperty("resultType");
  });
});
