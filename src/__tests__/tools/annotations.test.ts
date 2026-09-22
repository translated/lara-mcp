import { describe, it, expect, vi } from "vitest";
import { isSpecType, type Tool } from "@modelcontextprotocol/server";

// Stub the logger before importing `mcp/tools.js`: the real logger pulls in
// `src/env.ts`, which parses `process.env` at module load.
vi.mock("#logger", () => ({
  logger: { debug: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { ListTools } from "../../mcp/tools.js";

// Anthropic Software Directory policy requires every tool to advertise
// title, readOnlyHint, and destructiveHint annotations, plus a name within
// the 64-char MCP limit, so clients can render labels and warn before
// destructive calls. OpenAI app review additionally requires every hint
// (incl. idempotentHint, openWorldHint) to be an explicit boolean that
// matches the tool's behavior.
// https://support.claude.com/en/articles/13145358-anthropic-software-directory-policy
const HINTS = ["readOnlyHint", "destructiveHint", "idempotentHint", "openWorldHint"] as const;
// Tools that can delete or overwrite existing account data (verified against the live API).
const DESTRUCTIVE = new Set([
  "update_memory", "delete_memory", "add_translation", "delete_translation", "import_tmx",
  "update_glossary", "delete_glossary", "add_glossary_entry", "delete_glossary_entry", "import_glossary_csv",
]);
describe("Tool annotations", () => {
  it("declares title and all four hints on every tool, with a name within the 64-char limit", async () => {
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
      for (const h of HINTS) expect(ann![h], `tool "${tool.name}" annotations.${h}`).toBeTypeOf("boolean");
    }
  });

  it("keeps hints consistent with tool behavior", async () => {
    const { tools } = await ListTools();
    for (const { name, annotations: ann } of tools as Tool[]) {
      expect(ann!.destructiveHint, `tool "${name}" destructiveHint`).toBe(DESTRUCTIVE.has(name));
      if (ann!.readOnlyHint) expect(ann!.idempotentHint, `read-only tool "${name}" idempotentHint`).toBe(true);
    }
  });

  it("every tool definition is a valid MCP Tool per the SDK spec schema, with unique names", async () => {
    const { tools } = await ListTools();
    for (const tool of tools) {
      expect(isSpecType.Tool(tool), `tool "${tool.name}" is not a valid Tool`).toBe(true);
    }
    expect(new Set(tools.map((t) => t.name)).size).toBe(tools.length);
  });

  it("has no keyword-less sub-schemas (e.g. additionalProperties: {}), which some MCP clients reject", async () => {
    const SCHEMA_KEYS = ["items", "additionalProperties", "not", "if", "then", "else", "contains", "propertyNames"];
    const LIST_KEYS = ["anyOf", "oneOf", "allOf", "prefixItems"];
    const MAP_KEYS = ["properties", "$defs", "patternProperties"];
    const empty: string[] = [];

    const walk = (schema: unknown, path: string): void => {
      if (schema === null || typeof schema !== "object") return;
      const node = schema as Record<string, any>;
      if (Object.keys(node).every((k) => k === "description" || k === "title")) empty.push(path);
      for (const k of SCHEMA_KEYS) if (k in node) walk(node[k], `${path}.${k}`);
      for (const k of LIST_KEYS) (node[k] ?? []).forEach((s: unknown, i: number) => walk(s, `${path}.${k}[${i}]`));
      for (const k of MAP_KEYS) for (const [n, s] of Object.entries(node[k] ?? {})) walk(s, `${path}.${k}.${n}`);
    };

    const { tools } = await ListTools();
    for (const tool of tools) {
      walk(tool.inputSchema, `${tool.name}.inputSchema`);
      walk(tool.outputSchema, `${tool.name}.outputSchema`);
    }
    expect(empty).toEqual([]);
  });
});
