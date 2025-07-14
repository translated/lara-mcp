import { CallToolRequest, CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { Translator } from "@translated/lara";
import * as z from "zod/v4";

import { 
  addTranslation,
  addTranslationSchema 
} from "./tools/add_translation.js";
import { 
  createMemory,
  createMemorySchema 
} from "./tools/create_memory.js";
import { 
  deleteMemory,
  deleteMemorySchema 
} from "./tools/delete_memory.js";
import {
  deleteTranslation,
  deleteTranslationSchema
} from "./tools/delete_translation.js";
import {
  listLanguages,
  listLanguagesSchema
} from "./tools/list_languages.js";
import {
  listMemories,
  listMemoriesSchema
} from "./tools/list_memories.js";
import {
  translateHandler,
  translateSchema
} from "./tools/translate.js";
import {
  updateMemory,
  updateMemorySchema
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
  delete_translation: deleteTranslation
};

const listers: Record<string, Lister> = {
  list_memories: listMemories,
  list_languages: listLanguages,
};

async function CallTool(request: CallToolRequest, lara: Translator): Promise<CallToolResult> {
  const { name, arguments: args } = request.params;

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
      throw new InvalidInputError(`Invalid input: ${JSON.stringify(error.issues)}`);
    }
    throw error;
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
    ],
  };
}

export {CallTool, ListTools};
