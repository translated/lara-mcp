import {
  CallToolRequest,
  CallToolResult,
} from "@modelcontextprotocol/sdk/types.js";
import { LaraApiError, TimeoutError as LaraTimeoutError, Translator } from "@translated/lara";
import * as z from "zod/v4";

import {
  addTranslation,
  addTranslationSchema,
} from "./tools/add_translation.js";
import {
  checkImportStatus,
  checkImportStatusSchema,
} from "./tools/check_import_status.js";
import { createMemory, createMemorySchema } from "./tools/create_memory.js";
import { deleteMemory, deleteMemorySchema } from "./tools/delete_memory.js";
import {
  deleteTranslation,
  deleteTranslationSchema,
} from "./tools/delete_translation.js";
import { importTmx, importTmxSchema } from "./tools/import_tmx.js";
import { listLanguages, listLanguagesSchema } from "./tools/list_languages.js";
import { listMemories, listMemoriesSchema } from "./tools/list_memories.js";
import { listGlossaries, listGlossariesSchema } from "./tools/list_glossaries.js";
import { getGlossary, getGlossarySchema } from "./tools/get_glossary.js";
import { createGlossary, createGlossarySchema } from "./tools/create_glossary.js";
import { updateGlossary, updateGlossarySchema } from "./tools/update_glossary.js";
import { deleteGlossary, deleteGlossarySchema } from "./tools/delete_glossary.js";
import { importGlossaryCsv, importGlossaryCsvSchema } from "./tools/import_glossary_csv.js";
import { checkGlossaryImportStatus, checkGlossaryImportStatusSchema } from "./tools/check_glossary_import_status.js";
import { exportGlossary, exportGlossarySchema } from "./tools/export_glossary.js";
import { getGlossaryCounts, getGlossaryCountsSchema } from "./tools/get_glossary_counts.js";
import { addGlossaryEntry, addGlossaryEntrySchema } from "./tools/add_glossary_entry.js";
import { deleteGlossaryEntry, deleteGlossaryEntrySchema } from "./tools/delete_glossary_entry.js";
import { translateHandler, translateSchema } from "./tools/translate.js";
import { uploadDocument, uploadDocumentSchema } from "./tools/upload_document.js";
import { checkDocumentStatus, checkDocumentStatusSchema } from "./tools/check_document_status.js";
import { downloadDocument, downloadDocumentSchema } from "./tools/download_document.js";
import { translateDocument, translateDocumentSchema } from "./tools/translate_document.js";
import {
  updateMemory,
  updateMemorySchema,
} from "./tools/update_memory.tool.js";
import { InvalidInputError } from "#exception";
import { logger } from "#logger";

type Handler = (args: any, lara: Translator) => Promise<any>;
type Lister = (lara: Translator) => Promise<any>;

const handlers: Record<string, Handler> = {
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
  upload_document: uploadDocument,
  check_document_status: checkDocumentStatus,
  download_document: downloadDocument,
  translate_document: translateDocument,
};

const listers: Record<string, Lister> = {
  list_memories: listMemories,
  list_languages: listLanguages,
  list_glossaries: listGlossaries,
};

async function CallTool(
  request: CallToolRequest,
  lara: Translator
): Promise<CallToolResult> {
  const { name, arguments: args } = request.params;

  logger.debug({ toolName: name }, "Tool called");

  try {
    if (name in handlers) {
      const result = await handlers[name as keyof typeof handlers](args, lara);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    }

    if (name in listers) {
      const result = await listers[name as keyof typeof listers](lara);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    }

    logger.warn(`Requested a tool with name ${name}, but it was not found`);
    throw new InvalidInputError(`Tool ${name} not found`);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const fieldErrors = error.issues
        .map(i => {
          const field = i.path.length > 0 ? i.path.join('.') : 'arguments';
          return `${field}: ${i.message}`;
        })
        .join('; ');
      throw new InvalidInputError(`Invalid input: ${fieldErrors}`);
    }

    // Preserve existing InvalidInputError instances (and their messages)
    if (error instanceof InvalidInputError) {
      throw error;
    }

    if (error instanceof LaraApiError) {
      throw new InvalidInputError(error.message);
    }

    if (error instanceof LaraTimeoutError) {
      throw new InvalidInputError("The translation request timed out. Try again or increase the timeout.");
    }

    // Log full error internally for debugging
    logger.error({ error, toolName: name }, "Tool execution error");

    // Return generic error to client for unexpected errors
    throw new InvalidInputError("An error occurred while processing your request");
  }
}

async function ListTools() {
  return {
    tools: [
      {
        name: "translate",
        description:
          "Translate text between languages with support for language detection, context-aware translations and translation memories using Lara Translate.",
        inputSchema: z.toJSONSchema(translateSchema),
      },
      {
        name: "create_memory",
        description:
          "Create a translation memory with a custom name in your Lara Translate account. Translation memories store pairs of source and target text segments (translation units) for reuse in future translations.",
        inputSchema: z.toJSONSchema(createMemorySchema),
      },
      {
        name: "delete_memory",
        description:
          "Deletes a translation memory from your Lara Translate account.",
        inputSchema: z.toJSONSchema(deleteMemorySchema),
      },
      {
        name: "update_memory",
        description:
          "Updates a translation memory in your Lara Translate account.",
        inputSchema: z.toJSONSchema(updateMemorySchema),
      },
      {
        name: "add_translation",
        description:
          "Adds a translation to a translation memory in your Lara Translate account.",
        inputSchema: z.toJSONSchema(addTranslationSchema),
      },
      {
        name: "delete_translation",
        description:
          "Deletes a translation from a translation memory from your Lara Translate account.",
        inputSchema: z.toJSONSchema(deleteTranslationSchema),
      },
      {
        name: "import_tmx",
        description:
          "Imports a TMX file into a translation memory. This is an async operation that returns an import job object containing an import_id. Poll with check_import_status using the returned import_id until the import is complete.",
        inputSchema: z.toJSONSchema(importTmxSchema),
      },
      {
        name: "check_import_status",
        description:
          "Checks the status of a TMX import job started by import_tmx. Poll this tool with the import_id returned from import_tmx until the import is complete. The response includes a progress field to track completion.",
        inputSchema: z.toJSONSchema(checkImportStatusSchema),
      },
      {
        name: "list_memories",
        description:
          "Lists all translation memories in your Lara Translate account.",
        inputSchema: z.toJSONSchema(listMemoriesSchema),
      },
      {
        name: "list_languages",
        description:
          "Lists all supported languages in your Lara Translate account.",
        inputSchema: z.toJSONSchema(listLanguagesSchema),
      },
      {
        name: "list_glossaries",
        description:
          "Lists all glossaries in your Lara Translate account. Glossaries are collections of terms with their translations that enforce specific terminology during translation.",
        inputSchema: z.toJSONSchema(listGlossariesSchema),
      },
      {
        name: "get_glossary",
        description:
          "Retrieves a specific glossary by ID from your Lara Translate account. Returns null if the glossary is not found.",
        inputSchema: z.toJSONSchema(getGlossarySchema),
      },
      {
        name: "create_glossary",
        description:
          "Create a glossary with a custom name in your Lara Translate account. Glossaries enforce specific terminology during translation.",
        inputSchema: z.toJSONSchema(createGlossarySchema),
      },
      {
        name: "update_glossary",
        description:
          "Updates the name of a glossary in your Lara Translate account.",
        inputSchema: z.toJSONSchema(updateGlossarySchema),
      },
      {
        name: "delete_glossary",
        description:
          "Deletes a glossary from your Lara Translate account.",
        inputSchema: z.toJSONSchema(deleteGlossarySchema),
      },
      {
        name: "import_glossary_csv",
        description:
          "Imports a CSV file into a glossary. Supports unidirectional and multidirectional formats. This is an async operation that returns an import job object containing an import_id. Poll with check_glossary_import_status using the returned import_id until the import is complete.",
        inputSchema: z.toJSONSchema(importGlossaryCsvSchema),
      },
      {
        name: "check_glossary_import_status",
        description:
          "Checks the status of a glossary CSV import job started by import_glossary_csv. Poll this tool with the import_id returned from import_glossary_csv until the import is complete.",
        inputSchema: z.toJSONSchema(checkGlossaryImportStatusSchema),
      },
      {
        name: "export_glossary",
        description:
          "Exports a glossary as CSV from your Lara Translate account. Supports unidirectional and multidirectional formats.",
        inputSchema: z.toJSONSchema(exportGlossarySchema),
      },
      {
        name: "get_glossary_counts",
        description:
          "Retrieves the term and language counts for a glossary in your Lara Translate account.",
        inputSchema: z.toJSONSchema(getGlossaryCountsSchema),
      },
      {
        name: "add_glossary_entry",
        description:
          "Adds or replaces an entry in a glossary in your Lara Translate account. Supports both monodirectional and multidirectional glossaries.",
        inputSchema: z.toJSONSchema(addGlossaryEntrySchema),
      },
      {
        name: "delete_glossary_entry",
        description:
          "Deletes an entry from a glossary in your Lara Translate account. Use term for monodirectional glossaries or guid for multidirectional glossaries.",
        inputSchema: z.toJSONSchema(deleteGlossaryEntrySchema),
      },
      {
        name: "upload_document",
        description:
          'Step 1 of 3 for async document translation. Uploads a document (DOCX, PDF, etc.) and starts translation. Returns a document object with an ID. After uploading, poll with check_document_status until status is "translated", then call download_document to get the result. For a simpler single-call alternative, use translate_document instead.',
        inputSchema: z.toJSONSchema(uploadDocumentSchema),
      },
      {
        name: "check_document_status",
        description:
          'Step 2 of 3 for async document translation. Polls the translation status of a document previously submitted via upload_document. Possible statuses: "initialized", "analyzing", "translating", "translated", "error". When status is "translated", proceed to download_document. If status is "error", the response includes an error message.',
        inputSchema: z.toJSONSchema(checkDocumentStatusSchema),
      },
      {
        name: "download_document",
        description:
          'Step 3 of 3 for async document translation. Downloads the translated document as base64-encoded content. Only call this after check_document_status returns status "translated". The document must have been previously uploaded via upload_document.',
        inputSchema: z.toJSONSchema(downloadDocumentSchema),
      },
      {
        name: "translate_document",
        description:
          "All-in-one document translation: uploads a document, waits for translation to complete, and returns the translated document as base64-encoded content. This is the simplest way to translate a document in a single call. Use this instead of the 3-step upload_document → check_document_status → download_document workflow unless you need to track progress or handle the steps separately.",
        inputSchema: z.toJSONSchema(translateDocumentSchema),
      },
    ],
  };
}

export { CallTool, ListTools };
