import {
  CallToolRequest,
  CallToolResult,
  ProtocolError,
  ProtocolErrorCode,
  Tool,
} from "@modelcontextprotocol/server";
import { LaraApiError, TimeoutError as LaraTimeoutError, Translator } from "@translated/lara";
import * as z from "zod/v4";

import {
  addTranslation,
  addTranslationSchema,
  addTranslationOutputSchema,
} from "./tools/add_translation.js";
import {
  checkImportStatus,
  checkImportStatusSchema,
  checkImportStatusOutputSchema,
} from "./tools/check_import_status.js";
import {
  createMemory,
  createMemorySchema,
  createMemoryOutputSchema,
} from "./tools/create_memory.js";
import {
  deleteMemory,
  deleteMemorySchema,
  deleteMemoryOutputSchema,
} from "./tools/delete_memory.js";
import {
  deleteTranslation,
  deleteTranslationSchema,
  deleteTranslationOutputSchema,
} from "./tools/delete_translation.js";
import {
  importTmx,
  importTmxSchema,
  importTmxOutputSchema,
} from "./tools/import_tmx.js";
import {
  listLanguages,
  listLanguagesSchema,
  listLanguagesOutputSchema,
} from "./tools/list_languages.js";
import {
  listMemories,
  listMemoriesSchema,
  listMemoriesOutputSchema,
} from "./tools/list_memories.js";
import {
  listGlossaries,
  listGlossariesSchema,
  listGlossariesOutputSchema,
} from "./tools/list_glossaries.js";
import {
  getGlossary,
  getGlossarySchema,
  getGlossaryOutputSchema,
} from "./tools/get_glossary.js";
import {
  createGlossary,
  createGlossarySchema,
  createGlossaryOutputSchema,
} from "./tools/create_glossary.js";
import {
  updateGlossary,
  updateGlossarySchema,
  updateGlossaryOutputSchema,
} from "./tools/update_glossary.js";
import {
  deleteGlossary,
  deleteGlossarySchema,
  deleteGlossaryOutputSchema,
} from "./tools/delete_glossary.js";
import {
  importGlossaryCsv,
  importGlossaryCsvSchema,
  importGlossaryCsvOutputSchema,
} from "./tools/import_glossary_csv.js";
import {
  checkGlossaryImportStatus,
  checkGlossaryImportStatusSchema,
  checkGlossaryImportStatusOutputSchema,
} from "./tools/check_glossary_import_status.js";
import {
  exportGlossary,
  exportGlossarySchema,
  exportGlossaryOutputSchema,
} from "./tools/export_glossary.js";
import {
  getGlossaryCounts,
  getGlossaryCountsSchema,
  getGlossaryCountsOutputSchema,
} from "./tools/get_glossary_counts.js";
import {
  addGlossaryEntry,
  addGlossaryEntrySchema,
  addGlossaryEntryOutputSchema,
} from "./tools/add_glossary_entry.js";
import {
  deleteGlossaryEntry,
  deleteGlossaryEntrySchema,
  deleteGlossaryEntryOutputSchema,
} from "./tools/delete_glossary_entry.js";
import {
  detectLanguage,
  detectLanguageSchema,
  detectLanguageOutputSchema,
} from "./tools/detect_language.js";
import {
  translateHandler,
  translateSchema,
  translateOutputSchema,
} from "./tools/translate.js";
import {
  updateMemory,
  updateMemorySchema,
  updateMemoryOutputSchema,
} from "./tools/update_memory.tool.js";
import { InvalidInputError } from "#exception";
import { logger } from "#logger";

type Handler = (args: unknown, lara: Translator) => Promise<unknown>;
type Lister = (lara: Translator) => Promise<unknown>;

const handlers: Record<string, Handler> = {
  detect_language: detectLanguage,
  translate: translateHandler,
  create_memory: createMemory,
  delete_memory: deleteMemory,
  update_memory: updateMemory,
  add_translation: addTranslation,
  delete_translation: deleteTranslation,
  import_tmx: importTmx,
  check_import_status: checkImportStatus,
  get_glossary: getGlossary,
  create_glossary: createGlossary,
  update_glossary: updateGlossary,
  delete_glossary: deleteGlossary,
  import_glossary_csv: importGlossaryCsv,
  check_glossary_import_status: checkGlossaryImportStatus,
  export_glossary: exportGlossary,
  get_glossary_counts: getGlossaryCounts,
  add_glossary_entry: addGlossaryEntry,
  delete_glossary_entry: deleteGlossaryEntry,
};

const listers: Record<string, Lister> = {
  list_memories: listMemories,
  list_languages: listLanguages,
  list_glossaries: listGlossaries,
};

function toStructuredContent(result: unknown): Record<string, unknown> {
  if (Array.isArray(result)) return { items: result };
  if (result !== null && result !== undefined && typeof result === "object") {
    return result as Record<string, unknown>;
  }
  // Normalize undefined to null so the wire payload always carries the key
  // explicitly (JSON.stringify drops keys whose value is undefined).
  return { value: result ?? null };
}

function invocationMeta(invoking: string, invoked: string) {
  return {
    "openai/toolInvocation/invoking": invoking,
    "openai/toolInvocation/invoked": invoked,
  };
}

function narrate(name: string, args: any, result: any): string {
  switch (name) {
    case "translate":
      return Array.isArray(result)
        ? `Translated ${result.length} segments${args?.target ? " to " + args.target : ""}`
        : `Translated text${args?.target ? " to " + args.target : ""}`;
    case "detect_language":
      return Array.isArray(result)
        ? `Detected language for ${result.length} inputs`
        : `Detected language: ${result?.language ?? "unknown"}`;
    case "list_languages":
      return `Retrieved ${Array.isArray(result) ? result.length : 0} supported languages`;
    case "list_memories":
      return `Found ${Array.isArray(result) ? result.length : 0} translation memories`;
    case "create_memory":
      return `Created translation memory "${result?.name ?? args?.name ?? ""}"`;
    case "update_memory":
      return `Renamed translation memory to "${result?.name ?? args?.name ?? ""}"`;
    case "delete_memory":
      return `Deleted translation memory ${result?.id ?? args?.id ?? ""}`;
    case "add_translation":
      return "Added translation unit to memory";
    case "delete_translation":
      return "Deleted translation unit from memory";
    case "import_tmx":
      return `Queued TMX import${result?.id ? " (job " + result.id + ")" : ""}`;
    case "check_import_status":
      return `TMX import status: ${result?.status ?? "unknown"}`;
    case "list_glossaries":
      return `Found ${Array.isArray(result) ? result.length : 0} glossaries`;
    case "get_glossary":
      return `Retrieved glossary "${result?.glossary?.name ?? args?.id ?? ""}"`;
    case "create_glossary":
      return `Created glossary "${result?.name ?? args?.name ?? ""}"`;
    case "update_glossary":
      return `Renamed glossary to "${result?.name ?? args?.name ?? ""}"`;
    case "delete_glossary":
      return `Deleted glossary ${result?.id ?? args?.id ?? ""}`;
    case "add_glossary_entry":
      return "Added entry to glossary";
    case "delete_glossary_entry":
      return "Deleted entry from glossary";
    case "import_glossary_csv":
      return `Queued glossary CSV import${result?.id ? " (job " + result.id + ")" : ""}`;
    case "check_glossary_import_status":
      return `Glossary import status: ${result?.status ?? "unknown"}`;
    case "export_glossary":
      return "Exported glossary as CSV";
    case "get_glossary_counts":
      return `Glossary entry count: ${result?.unidirectional ?? result?.multidirectional ?? "retrieved"}`;
    default:
      return `${name} completed`;
  }
}

async function CallTool(
  request: CallToolRequest,
  lara: Translator
): Promise<CallToolResult> {
  const { name, arguments: args } = request.params;

  logger.debug({ toolName: name }, "Tool called");

  const handler = Object.hasOwn(handlers, name) ? handlers[name] : undefined;
  const lister = Object.hasOwn(listers, name) ? listers[name] : undefined;
  if (!handler && !lister) {
    logger.warn(`Requested a tool with name ${name}, but it was not found`);
    // MCP spec: an unknown tool is a protocol error, not a tool execution error
    throw new ProtocolError(ProtocolErrorCode.InvalidParams, `Tool ${name} not found`);
  }

  try {
    const result = handler ? await handler(args, lara) : await lister!(lara);

    const structuredContent = toStructuredContent(result);
    return {
      structuredContent,
      // MCP spec: when outputSchema is declared, the server SHOULD also return
      // the serialized JSON in a TextContent block for legacy clients that
      // don't read structuredContent. The narration stays as the first block
      // so display-oriented clients keep their short summary.
      content: [
        { type: "text", text: narrate(name, args, result) },
        { type: "text", text: JSON.stringify(structuredContent) },
      ],
    };
  } catch (error) {
    // MCP spec: execution failures (bad arguments, API errors) are reported as
    // isError results so the model can read the message and self-correct.
    return {
      isError: true,
      content: [{ type: "text", text: toolErrorMessage(error, name) }],
    };
  }
}

function toolErrorMessage(error: unknown, name: string): string {
  if (error instanceof z.ZodError) {
    const fieldErrors = error.issues
      .map(i => {
        const field = i.path.length > 0 ? i.path.join('.') : 'arguments';
        return `${field}: ${i.message}`;
      })
      .join('; ');
    return `Invalid input: ${fieldErrors}`;
  }

  if (error instanceof InvalidInputError || error instanceof LaraApiError) {
    return error.message;
  }

  if (error instanceof LaraTimeoutError) {
    return "The translation request timed out. Try again or increase the timeout.";
  }

  // Log full error internally for debugging
  logger.error({ error, toolName: name }, "Tool execution error");

  // Return generic error to client for unexpected errors
  return "An error occurred while processing your request";
}

// zod's JSON Schema payload type is structurally wider than the SDK's Tool schema type; the runtime
// output (a type:"object" JSON Schema 2020-12 document) is what the spec requires.
function toJsonSchema(schema: z.ZodType): Tool["inputSchema"] {
  return z.toJSONSchema(schema, {
    // `.loose()` objects emit `additionalProperties: {}` — a keyword-less schema some MCP clients
    // refuse or mishandle. Omitting the keyword means the same thing (extra properties allowed).
    override: ({ jsonSchema }) => {
      const extra = jsonSchema.additionalProperties;
      if (extra && typeof extra === "object" && Object.keys(extra).length === 0) {
        delete jsonSchema.additionalProperties;
      }
    },
  }) as Tool["inputSchema"];
}

// Anthropic Software Directory policy requires every tool to advertise title,
// readOnlyHint, and destructiveHint so clients can render labels and warn
// before destructive calls.
// https://support.claude.com/en/articles/13145358-anthropic-software-directory-policy
const toolDefinitions: Tool[] = [
  {
    name: "translate",
    description:
      "Translate text between languages using Lara Translate. Supports language detection, context-aware translations, translation memories, and glossaries. " +
      "The optional 'instructions' parameter accepts short localization directives (e.g., 'Translate formally') — only provide them when the content specifically requires tone, formality, or terminology adjustments. " +
      "IMPORTANT: 'target' accepts exactly one language code per call. If the user asks to translate into multiple languages (e.g., 'into Italian and German'), call this tool once per target language and present all resulting translations together. " +
      "IMPORTANT: 'glossaries' requires glossary IDs in the 'gls_*' format, not glossary names. If the user refers to a glossary by name (e.g., 'our company glossary', 'the marketing glossary'), call list_glossaries first, match the name, and use the returned ID here. If no matching glossary is found, tell the user instead of guessing an ID.",
    inputSchema: toJsonSchema(translateSchema),
    outputSchema: toJsonSchema(translateOutputSchema),
    annotations: {
      title: "Translate text",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: false,
    },
    _meta: invocationMeta("Translating…", "Translation ready"),
  },
  {
    name: "detect_language",
    description:
      "Detects the language of the provided text. Returns the detected language, content type, and a list of predictions with confidence scores. Accepts a single string or an array of strings (up to 128 elements). " +
      "Use this tool explicitly whenever the user asks to know or confirm what language a text is written in — including when that request is combined with a translation request (e.g., 'detect the language of this text and translate it into English'). " +
      "In that case, call this tool first, tell the user which language was detected, and only then call the translate tool (you do not need to pass the detected language as 'source' to translate — translate can auto-detect on its own — but the user still expects to be told the result of detection).",
    inputSchema: toJsonSchema(detectLanguageSchema),
    outputSchema: toJsonSchema(detectLanguageOutputSchema),
    annotations: {
      title: "Detect language",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    _meta: invocationMeta("Detecting language…", "Language detected"),
  },
  {
    name: "list_languages",
    description:
      "Lists all supported languages in your Lara Translate account.",
    inputSchema: toJsonSchema(listLanguagesSchema),
    outputSchema: toJsonSchema(listLanguagesOutputSchema),
    annotations: {
      title: "List supported languages",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  {
    name: "list_memories",
    description:
      "Lists all translation memories in your Lara Translate account.",
    inputSchema: toJsonSchema(listMemoriesSchema),
    outputSchema: toJsonSchema(listMemoriesOutputSchema),
    annotations: {
      title: "List translation memories",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  {
    name: "create_memory",
    description:
      "Create a translation memory with a custom name in your Lara Translate account. Translation memories store pairs of source and target text segments (translation units) for reuse in future translations.",
    inputSchema: toJsonSchema(createMemorySchema),
    outputSchema: toJsonSchema(createMemoryOutputSchema),
    annotations: {
      title: "Create translation memory",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: false,
    },
  },
  {
    name: "update_memory",
    description:
      "Updates a translation memory in your Lara Translate account.",
    inputSchema: toJsonSchema(updateMemorySchema),
    outputSchema: toJsonSchema(updateMemoryOutputSchema),
    annotations: {
      title: "Rename translation memory",
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  {
    name: "delete_memory",
    description:
      "Deletes a translation memory from your Lara Translate account.",
    inputSchema: toJsonSchema(deleteMemorySchema),
    outputSchema: toJsonSchema(deleteMemoryOutputSchema),
    annotations: {
      title: "Delete translation memory",
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  {
    name: "add_translation",
    description:
      "Adds a translation to a translation memory in your Lara Translate account.",
    inputSchema: toJsonSchema(addTranslationSchema),
    outputSchema: toJsonSchema(addTranslationOutputSchema),
    annotations: {
      title: "Add translation unit to memory",
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: false,
      openWorldHint: false,
    },
  },
  {
    name: "delete_translation",
    description:
      "Deletes a translation from a translation memory in your Lara Translate account.",
    inputSchema: toJsonSchema(deleteTranslationSchema),
    outputSchema: toJsonSchema(deleteTranslationOutputSchema),
    annotations: {
      title: "Delete translation unit from memory",
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  {
    name: "import_tmx",
    description:
      "Imports a TMX file into a translation memory. This is an async operation that returns an import job object containing an import_id. Poll with check_import_status using the returned import_id until the import is complete.",
    inputSchema: toJsonSchema(importTmxSchema),
    outputSchema: toJsonSchema(importTmxOutputSchema),
    annotations: {
      title: "Import TMX file",
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: false,
      openWorldHint: false,
    },
    _meta: invocationMeta("Queuing TMX import…", "TMX import queued"),
  },
  {
    name: "check_import_status",
    description:
      "Checks the status of a TMX import job started by import_tmx. Poll this tool with the import_id returned from import_tmx until the import is complete. The response includes a progress field to track completion.",
    inputSchema: toJsonSchema(checkImportStatusSchema),
    outputSchema: toJsonSchema(checkImportStatusOutputSchema),
    annotations: {
      title: "Check TMX import status",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    _meta: invocationMeta("Checking import status…", "Status retrieved"),
  },
  {
    name: "list_glossaries",
    description:
      "Lists all glossaries in your Lara Translate account. Glossaries are collections of terms with their translations that enforce specific terminology during translation.",
    inputSchema: toJsonSchema(listGlossariesSchema),
    outputSchema: toJsonSchema(listGlossariesOutputSchema),
    annotations: {
      title: "List glossaries",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  {
    name: "get_glossary",
    description:
      "Retrieves a specific glossary by ID from your Lara Translate account. Returns null if the glossary is not found.",
    inputSchema: toJsonSchema(getGlossarySchema),
    outputSchema: toJsonSchema(getGlossaryOutputSchema),
    annotations: {
      title: "Get glossary",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  {
    name: "create_glossary",
    description:
      "Create a glossary with a custom name in your Lara Translate account. Glossaries enforce specific terminology during translation.",
    inputSchema: toJsonSchema(createGlossarySchema),
    outputSchema: toJsonSchema(createGlossaryOutputSchema),
    annotations: {
      title: "Create glossary",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: false,
    },
  },
  {
    name: "update_glossary",
    description:
      "Updates the name of a glossary in your Lara Translate account.",
    inputSchema: toJsonSchema(updateGlossarySchema),
    outputSchema: toJsonSchema(updateGlossaryOutputSchema),
    annotations: {
      title: "Rename glossary",
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  {
    name: "delete_glossary",
    description:
      "Deletes a glossary from your Lara Translate account.",
    inputSchema: toJsonSchema(deleteGlossarySchema),
    outputSchema: toJsonSchema(deleteGlossaryOutputSchema),
    annotations: {
      title: "Delete glossary",
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  {
    name: "add_glossary_entry",
    description:
      "Adds or replaces an entry in a glossary in your Lara Translate account. Supports both monodirectional and multidirectional glossaries.",
    inputSchema: toJsonSchema(addGlossaryEntrySchema),
    outputSchema: toJsonSchema(addGlossaryEntryOutputSchema),
    annotations: {
      title: "Add or replace glossary entry",
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  {
    name: "delete_glossary_entry",
    description:
      "Deletes an entry from a glossary in your Lara Translate account. Use term for monodirectional glossaries or guid for multidirectional glossaries.",
    inputSchema: toJsonSchema(deleteGlossaryEntrySchema),
    outputSchema: toJsonSchema(deleteGlossaryEntryOutputSchema),
    annotations: {
      title: "Delete glossary entry",
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  {
    name: "import_glossary_csv",
    description:
      "Imports a CSV file into a glossary. Supports unidirectional and multidirectional formats. This is an async operation that returns an import job object containing an import_id. Poll with check_glossary_import_status using the returned import_id until the import is complete.",
    inputSchema: toJsonSchema(importGlossaryCsvSchema),
    outputSchema: toJsonSchema(importGlossaryCsvOutputSchema),
    annotations: {
      title: "Import glossary CSV",
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: true,
      openWorldHint: false,
    },
    _meta: invocationMeta("Queuing glossary import…", "Glossary import queued"),
  },
  {
    name: "check_glossary_import_status",
    description:
      "Checks the status of a glossary CSV import job started by import_glossary_csv. Poll this tool with the import_id returned from import_glossary_csv until the import is complete.",
    inputSchema: toJsonSchema(checkGlossaryImportStatusSchema),
    outputSchema: toJsonSchema(checkGlossaryImportStatusOutputSchema),
    annotations: {
      title: "Check glossary import status",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    _meta: invocationMeta("Checking glossary import status…", "Status retrieved"),
  },
  {
    name: "export_glossary",
    description:
      "Exports a glossary as CSV from your Lara Translate account. Supports unidirectional and multidirectional formats.",
    inputSchema: toJsonSchema(exportGlossarySchema),
    outputSchema: toJsonSchema(exportGlossaryOutputSchema),
    annotations: {
      title: "Export glossary as CSV",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    _meta: invocationMeta("Exporting glossary…", "Glossary exported"),
  },
  {
    name: "get_glossary_counts",
    description:
      "Retrieves the term and language counts for a glossary in your Lara Translate account.",
    inputSchema: toJsonSchema(getGlossaryCountsSchema),
    outputSchema: toJsonSchema(getGlossaryCountsOutputSchema),
    annotations: {
      title: "Get glossary entry count",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
];

async function ListTools() {
  return { tools: toolDefinitions };
}

export { CallTool, ListTools };
