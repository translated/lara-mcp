import { describe, it, expect, beforeEach, vi } from "vitest";
import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { Translator } from "@translated/lara";
import type { CallToolRequest } from "@modelcontextprotocol/sdk/types.js";

// Stub the logger before importing `mcp/tools.js`: the real logger pulls in
// `src/env.ts`, which parses `process.env` at module load.
vi.mock("#logger", () => ({
  logger: { debug: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock("@translated/lara", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@translated/lara")>();
  const { createMockTranslator } = await import("../utils/mocks.js");
  return {
    ...actual,
    Translator: vi.fn(() => createMockTranslator()),
  };
});

import { CallTool, ListTools } from "../../mcp/tools.js";
import { listMemoriesOutputSchema } from "../../mcp/tools/list_memories.js";
import { createMemoryOutputSchema } from "../../mcp/tools/create_memory.js";
import { getGlossaryOutputSchema } from "../../mcp/tools/get_glossary.js";
import type { MockTranslator } from "../utils/mocks.js";

function makeRequest(
  name: string,
  args: Record<string, unknown> = {}
): CallToolRequest {
  return {
    method: "tools/call",
    params: { name, arguments: args },
  } as CallToolRequest;
}

describe("Tool outputSchema declarations", () => {
  it("every tool advertises a valid outputSchema", async () => {
    const { tools } = await ListTools();
    expect(tools.length).toBeGreaterThan(0);

    for (const tool of tools as Tool[]) {
      const schema = (tool as Tool & { outputSchema?: unknown })
        .outputSchema;
      expect(
        schema,
        `tool "${tool.name}" is missing outputSchema`
      ).toBeDefined();
      expect(schema, `tool "${tool.name}" outputSchema`).toBeTypeOf("object");

      const s = schema as Record<string, unknown>;
      // MCP SDK's ToolSchema (types.d.ts) requires outputSchema's root to be
      // type: "object". A bare anyOf/oneOf at the root would be rejected by
      // strict clients that parse tools/list against the published schema.
      expect(
        s.type,
        `tool "${tool.name}" outputSchema root must be type:"object"`
      ).toBe("object");
    }
  });
});

describe("structuredContent conforms to outputSchema", () => {
  let mockTranslator: MockTranslator;

  beforeEach(() => {
    mockTranslator = new (Translator as any)();
  });

  it("list_memories result matches listMemoriesOutputSchema", async () => {
    const memory = {
      id: "mem_1",
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-02T00:00:00Z",
      sharedAt: "2026-01-02T00:00:00Z",
      name: "M1",
      ownerId: "user_1",
      collaboratorsCount: 0,
      isPersonal: true,
    };
    mockTranslator.memories.list.mockResolvedValue([memory]);

    const res = await CallTool(
      makeRequest("list_memories"),
      mockTranslator as any as Translator
    );

    expect(() =>
      listMemoriesOutputSchema.parse(res.structuredContent)
    ).not.toThrow();
  });

  it("create_memory result matches createMemoryOutputSchema", async () => {
    const memory = {
      id: "mem_42",
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-02T00:00:00Z",
      sharedAt: "2026-01-02T00:00:00Z",
      name: "brand_names",
      ownerId: "user_1",
      collaboratorsCount: 0,
      isPersonal: true,
    };
    mockTranslator.memories.create.mockResolvedValue(memory);

    const res = await CallTool(
      makeRequest("create_memory", { name: "brand_names" }),
      mockTranslator as any as Translator
    );

    expect(() =>
      createMemoryOutputSchema.parse(res.structuredContent)
    ).not.toThrow();
  });

  it("get_glossary result matches the schema for both hit and miss", async () => {
    const glossary = {
      id: "gls_abc",
      name: "Brand",
      ownerId: "user_1",
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-02T00:00:00Z",
      isPersonal: true,
    };
    mockTranslator.glossaries.get.mockResolvedValueOnce(glossary);
    const hit = await CallTool(
      makeRequest("get_glossary", { id: "gls_abc" }),
      mockTranslator as any as Translator
    );
    expect(() =>
      getGlossaryOutputSchema.parse(hit.structuredContent)
    ).not.toThrow();

    mockTranslator.glossaries.get.mockResolvedValueOnce(null);
    const miss = await CallTool(
      makeRequest("get_glossary", { id: "gls_missing" }),
      mockTranslator as any as Translator
    );
    expect(miss.structuredContent).toEqual({ glossary: null });
    expect(() =>
      getGlossaryOutputSchema.parse(miss.structuredContent)
    ).not.toThrow();
  });
});
