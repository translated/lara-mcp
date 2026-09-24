import { describe, it, expect, beforeEach, vi } from "vitest";
import { Translator } from "@translated/lara";
import type { CallToolRequest } from "@modelcontextprotocol/server";

// Every advertised tool must be reachable through CallTool: the tool exists in
// tools/list, its name is registered in the handlers/listers maps, and the
// sample arguments below satisfy its input schema. A tool added to one side
// only (definition or map) fails here.

vi.mock("#logger", () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock("@translated/lara", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@translated/lara")>()),
  Translator: vi.fn(),
}));

const { CallTool, ListTools } = await import("../../mcp/tools.js");

// Minimal arguments that satisfy each tool's input schema
const SAMPLE_ARGUMENTS: Record<string, Record<string, unknown>> = {
  "translate": { text: [{ text: "Hello", translatable: true }], target: "it-IT" },
  "detect_language": { text: "Hello" },
  "list_languages": {},
  "list_memories": {},
  "create_memory": { name: "My memory" },
  "update_memory": { id: "mem_abc123", name: "Renamed" },
  "delete_memory": { id: "mem_abc123" },
  "add_translation": {
    id: ["mem_abc123"],
    source: "en-US",
    target: "it-IT",
    sentence: "Hello",
    translation: "Ciao",
  },
  "delete_translation": {
    id: ["mem_abc123"],
    source: "en-US",
    target: "it-IT",
    sentence: "Hello",
    translation: "Ciao",
  },
  "import_tmx": { id: "mem_abc123", tmx_content: "<tmx></tmx>" },
  "check_import_status": { id: "import_abc123" },
  "list_glossaries": {},
  "get_glossary": { id: "gls_abc123" },
  "create_glossary": { name: "My glossary" },
  "update_glossary": { id: "gls_abc123", name: "Renamed" },
  "delete_glossary": { id: "gls_abc123" },
  "add_glossary_entry": { id: "gls_abc123", terms: [{ language: "en-US", value: "term" }] },
  "delete_glossary_entry": { id: "gls_abc123", guid: "entry-1" },
  "import_glossary_csv": { id: "gls_abc123", csv_content: "en-US,it-IT\nhello,ciao" },
  "check_glossary_import_status": { id: "import_abc123" },
  "export_glossary": { id: "gls_abc123", content_type: "csv/table-uni", source: "en-US" },
  "get_glossary_counts": { id: "gls_abc123" },
};

function createMockTranslator() {
  return {
    detect: vi.fn(),
    translate: vi.fn(),
    getLanguages: vi.fn(),
    memories: {
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      list: vi.fn(),
      addTranslation: vi.fn(),
      deleteTranslation: vi.fn(),
      importTmx: vi.fn(),
      getImportStatus: vi.fn(),
    },
    glossaries: {
      list: vi.fn(),
      get: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      importCsv: vi.fn(),
      getImportStatus: vi.fn(),
      export: vi.fn(),
      counts: vi.fn(),
      addOrReplaceEntry: vi.fn(),
      deleteEntry: vi.fn(),
    },
    client: { setExtraHeader: vi.fn() },
  };
}

let translator: ReturnType<typeof createMockTranslator>;

beforeEach(() => {
  translator = createMockTranslator();
  // translateHandler reads result.translation, so this one needs a shaped response
  translator.translate.mockResolvedValue({ translation: [{ text: "Ciao" }] });
});

function call(name: string, args: Record<string, unknown>) {
  return CallTool(
    { method: "tools/call", params: { name, arguments: args } } as CallToolRequest,
    translator as any as Translator
  );
}

describe("Tool dispatch", () => {
  it("has sample arguments for every advertised tool", async () => {
    const { tools } = await ListTools();

    expect(Object.keys(SAMPLE_ARGUMENTS).sort()).toEqual(tools.map((t) => t.name).sort());
  });

  it.each(Object.keys(SAMPLE_ARGUMENTS))("dispatches %s", async (name) => {
    const result = await call(name, SAMPLE_ARGUMENTS[name]);

    expect(result.isError, `tool "${name}" returned an error result`).toBeFalsy();
    expect(result.structuredContent).toBeDefined();
    expect(result.content?.[0]).toMatchObject({ type: "text" });
  });
});
