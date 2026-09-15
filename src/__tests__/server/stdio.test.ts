import { describe, it, expect } from "vitest";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { Client, ProtocolErrorCode } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import { PACKAGE_VERSION } from "../../version.js";
import { ListTools } from "../../mcp/tools.js";

// Spawns the real stdio entry point (src/index.ts via tsx) and talks to it
// with the SDK client in both protocol eras. Only calls that never reach the
// Lara API are used, so fake credentials are enough.

const root = fileURLToPath(new URL("../../../", import.meta.url));

const eras = [
  { era: "legacy", label: "default client", clientOptions: {} },
  { era: "modern", label: "auto negotiation", clientOptions: { versionNegotiation: { mode: "auto" } } },
  { era: "modern", label: "pinned 2026-07-28", clientOptions: { versionNegotiation: { mode: { pin: "2026-07-28" } } } },
] as const;

describe.each(eras)("stdio MCP server ($label)", ({ era, clientOptions }) => {
  it(`negotiates the ${era} era and serves tools and resources`, async () => {
    const client = new Client({ name: "stdio-test", version: "1.0.0" }, clientOptions as any);
    const errors: Error[] = [];
    client.onerror = (error) => errors.push(error);

    const transport = new StdioClientTransport({
      command: join(root, "node_modules/.bin/tsx"),
      args: ["src/index.ts"],
      cwd: root,
      env: {
        PATH: process.env.PATH ?? "",
        TRANSPORT: "stdio",
        LOGGING_LEVEL: "debug",
        LARA_ACCESS_KEY_ID: "test-id",
        LARA_ACCESS_KEY_SECRET: "test-secret",
      },
      // Logs go to stderr; any log line on stdout would corrupt the JSON-RPC stream
      stderr: "pipe",
    });

    try {
      await client.connect(transport);

      expect(client.getProtocolEra()).toBe(era);
      expect(client.getServerVersion()).toMatchObject({
        name: "Lara Translate",
        version: PACKAGE_VERSION,
      });

      const { tools } = await client.listTools();
      expect(tools).toHaveLength((await ListTools()).tools.length);

      const { resources } = await client.listResources();
      expect(resources.map((r) => r.uri)).toEqual(["memories://list", "languages://list"]);

      await expect(client.callTool({ name: "no_such_tool", arguments: {} })).rejects.toMatchObject({
        code: ProtocolErrorCode.InvalidParams,
      });

      const invalid = await client.callTool({ name: "delete_memory", arguments: { id: 1 } });
      expect(invalid.isError).toBe(true);

      expect(errors).toEqual([]);
    } finally {
      await client.close();
    }
  }, 30_000);
});
