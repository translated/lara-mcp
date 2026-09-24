import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { createServer, Server as HttpServer } from "node:http";
import type { AddressInfo } from "node:net";
import {
  Client,
  ProtocolError,
  ProtocolErrorCode,
  StreamableHTTPClientTransport,
} from "@modelcontextprotocol/client";
import { Translator } from "@translated/lara";
import { PACKAGE_VERSION } from "../../version.js";

// End-to-end over a real socket: SDK v2 client -> Express -> toNodeHandler ->
// createMcpHandler -> getMcpServer, for both protocol eras.
//
// ../utils/mocks.js is deliberately not imported: its hoisted vi.mock of
// @translated/lara would replace this file's mock depending on import order.
const createMockTranslator = () => ({
  getLanguages: vi.fn(),
  memories: { delete: vi.fn(), list: vi.fn() },
  client: { setExtraHeader: vi.fn() },
});

vi.mock("@translated/lara", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@translated/lara")>()),
  Translator: vi.fn(),
}));

vi.mock("#logger", () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const { RestServer } = await import("../../rest/server.js");
const { default: mcpRouter } = await import("../../rest/routes/mcp.js");
const { ListTools } = await import("../../mcp/tools.js");

let httpServer: HttpServer;
let url: URL;
// Every per-request server built by the factory shares this translator
let translator: ReturnType<typeof createMockTranslator>;

beforeAll(async () => {
  const restServer = new RestServer();
  const app = restServer.configure();
  app.use("/v1", mcpRouter(restServer));
  httpServer = createServer(app);
  await new Promise<void>((resolve) => httpServer.listen(0, "127.0.0.1", resolve));
  url = new URL(`http://127.0.0.1:${(httpServer.address() as AddressInfo).port}/v1`);
});

afterAll(async () => {
  await new Promise((resolve) => httpServer.close(resolve));
});

beforeEach(() => {
  translator = createMockTranslator();
  vi.mocked(Translator).mockClear().mockImplementation(function () {
    return translator as any;
  });
});

const eras = [
  { era: "legacy", label: "default", clientOptions: {} },
  { era: "modern", label: "pinned 2026-07-28", clientOptions: { versionNegotiation: { mode: { pin: "2026-07-28" } } } },
  { era: "modern", label: "auto", clientOptions: { versionNegotiation: { mode: "auto" } } },
] as const;

describe.each(eras)("HTTP MCP endpoint ($era era, $label)", ({ era, clientOptions }) => {
  let client: Client;

  beforeEach(async () => {
    client = new Client({ name: "lara-test", version: "1.0.0" }, clientOptions as any);
    await client.connect(
      new StreamableHTTPClientTransport(url, {
        requestInit: {
          headers: {
            "x-lara-access-key-id": "test-id",
            "x-lara-access-key-secret": "test-secret",
          },
        },
      })
    );
    return () => client.close();
  });

  it(`negotiates the ${era} era and identifies the server`, () => {
    expect(client.getProtocolEra()).toBe(era);
    expect(client.getServerVersion()).toMatchObject({
      name: "Lara Translate",
      version: PACKAGE_VERSION,
    });
  });

  it("lists every tool in a deterministic order", async () => {
    const first = await client.listTools();
    const second = await client.listTools();

    expect(first.tools.map((t) => t.name)).toEqual((await ListTools()).tools.map((t) => t.name));
    expect(second.tools.map((t) => t.name)).toEqual(first.tools.map((t) => t.name));
    for (const tool of first.tools) {
      expect(tool.inputSchema.type).toBe("object");
      expect(tool.outputSchema?.type).toBe("object");
      expect(tool.annotations?.title).toBeTruthy();
    }
  });

  it("calls a tool with the request credentials and returns structuredContent", async () => {
    translator.getLanguages.mockResolvedValue(["en-US", "it-IT"]);

    const result = await client.callTool({ name: "list_languages", arguments: {} });

    expect(result.isError).toBeFalsy();
    expect(result.structuredContent).toEqual({ items: ["en-US", "it-IT"] });
    expect(result.content[0]).toMatchObject({ type: "text", text: "Retrieved 2 supported languages" });
    expect(vi.mocked(Translator).mock.calls.at(-1)?.[0]).toMatchObject({
      accessKeyId: "test-id",
      accessKeySecret: "test-secret",
    });
  });

  it("returns invalid tool arguments as an isError result", async () => {
    const result = await client.callTool({ name: "delete_memory", arguments: { id: 123 } });

    expect(result.isError).toBe(true);
    expect(result.content[0]).toMatchObject({ type: "text", text: expect.stringMatching(/Invalid input:.*id/) });
  });

  it("rejects an unknown tool with an InvalidParams protocol error", async () => {
    await expect(client.callTool({ name: "no_such_tool", arguments: {} })).rejects.toMatchObject({
      code: ProtocolErrorCode.InvalidParams,
    });
  });

  it("lists resources and resource templates", async () => {
    const { resources } = await client.listResources();
    const { resourceTemplates } = await client.listResourceTemplates();

    expect(resources.map((r) => r.uri)).toEqual(["memories://list", "languages://list"]);
    expect(resourceTemplates.map((t) => t.uriTemplate)).toEqual(["memories://list/{name}"]);
  });

  it("reads a resource", async () => {
    translator.getLanguages.mockResolvedValue(["en-US"]);

    const result = await client.readResource({ uri: "languages://list" });

    expect(JSON.parse((result.contents[0] as { text: string }).text)).toEqual(["en-US"]);
  });

  it("rejects an unknown resource with InvalidParams", async () => {
    const promise = client.readResource({ uri: "nope://x" });

    await expect(promise).rejects.toBeInstanceOf(ProtocolError);
    await expect(promise).rejects.toMatchObject({ code: ProtocolErrorCode.InvalidParams });
  });
});
