import { describe, it, expect, vi } from "vitest";
import type { Tool } from "@modelcontextprotocol/sdk/types.js";

// Stub the logger before importing `mcp/tools.js`: the real logger pulls in
// `src/env.ts`, which strictly parses `PUBLIC_HOST` at module load.
vi.mock("#logger", () => ({
  logger: { debug: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { ListTools } from "../../mcp/tools.js";

// Anthropic Software Directory policy requires every tool to advertise
// title, readOnlyHint, and destructiveHint annotations, plus a name within
// the 64-char MCP limit, so clients can render labels and warn before
// destructive calls.
// https://support.claude.com/en/articles/13145358-anthropic-software-directory-policy
describe("Tool annotations", () => {
  it("declares title, readOnlyHint, and destructiveHint on every tool, with a name within the 64-char limit", async () => {
    const { tools } = await ListTools();

    expect(tools.length).toBeGreaterThan(0);

    for (const tool of tools as Tool[]) {
      expect(
        tool.name.length,
        `tool name "${tool.name}" exceeds the 64-char MCP limit`
      ).toBeLessThanOrEqual(64);

      const ann = tool.annotations;
      expect(ann, `tool "${tool.name}" is missing annotations`).toBeDefined();
      expect(ann!.title, `tool "${tool.name}" annotations.title`).toBeTypeOf("string");
      expect(ann!.title!.length).toBeGreaterThan(0);
      expect(ann!.readOnlyHint, `tool "${tool.name}" annotations.readOnlyHint`).toBeTypeOf("boolean");
      expect(ann!.destructiveHint, `tool "${tool.name}" annotations.destructiveHint`).toBeTypeOf("boolean");
    }
  });
});
