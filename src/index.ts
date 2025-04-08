#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { Credentials, Translator } from "@translated/lara";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import {
  translateHandler,
  translateSchema,
} from "./tools/translate.js";

import {
  addTranslation,
  addTranslationSchema,
  createMemory, createMemorySchema, deleteMemory, deleteMemorySchema,
  deleteTranslation,
  deleteTranslationSchema,
  updateMemory, updateMemorySchema,
} from "./tools/memories.tool.js";
import { listMemories, listMemoriesSchema } from "./resources/memories.resource.js";
import { listLanguages, listLanguagesSchema } from "./tools/languages.tool.js";
const LARA_ACCESS_KEY_ID = process.env.LARA_ACCESS_KEY_ID;
const LARA_ACCESS_KEY_SECRET = process.env.LARA_ACCESS_KEY_SECRET;

if (!LARA_ACCESS_KEY_ID || !LARA_ACCESS_KEY_SECRET) {
  throw new Error("LARA_ACCESS_KEY_ID and LARA_ACCESS_KEY_SECRET must be set");
}

const credentials = new Credentials(LARA_ACCESS_KEY_ID, LARA_ACCESS_KEY_SECRET);
const lara = new Translator(credentials);

const server = new Server(
  {
    name: "Lara Translate",
    version: "0.0.5",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "translate",
        description:
          "Translate text between languages with support for language detection and context-aware translations.",
        inputSchema: zodToJsonSchema(translateSchema),
      },
      {
        name: "create_memory",
        description:
            "Create a new translation memory with a custom name. Translation Memories are tools that save previously translated text segments, such as sentences or paragraphs . Each saved segment includes the 'source' text and its translated 'target' text, forming pairs known as translation units (TUs). You can check every language availabile using the ",
        inputSchema: zodToJsonSchema(createMemorySchema),
      },
      {
        name: "delete_memory",
        description:
            "Deletes a translation memory.",
        inputSchema: zodToJsonSchema(deleteMemorySchema),
      },
      {
        name: "update_memory",
        description:
            "Updates a translation memory.",
        inputSchema: zodToJsonSchema(updateMemorySchema)
      },
      {
        name: "list_memories",
        description:
            "Lists all saved translation memories.",
        inputSchema: zodToJsonSchema(listMemoriesSchema)
      },
      {
        name: "add_translation",
        description:
            "Adds a translation to a translation memory.",
        inputSchema: zodToJsonSchema(addTranslationSchema)
      },
      {
        name: "delete_translation",
        description:
            "Deletes a translation from a translation memory.",
        inputSchema: zodToJsonSchema(deleteTranslationSchema)
      },
      {
        name: "list_languages",
        description:
            "Lists all supported languages.",
        inputSchema: zodToJsonSchema(listLanguagesSchema)
      }
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const { file } = request.params;

  try {
    switch (name) {
      case "translate": {
        const result = await translateHandler(args, lara);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }
      case "create_memory": {
        const result = await createMemory(args, lara);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }
      case "delete_memory": {
        const result = await deleteMemory(args, lara);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }
      case "update_memory": {
        const result = await updateMemory(args, lara);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }
      case "list_memories": {
        const result = await listMemories(lara);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }
      case "add_translation": {
        const result = await addTranslation(args, lara);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }
      case "delete_translation": {
        const result = await deleteTranslation(args, lara);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }
      case "list_languages": {
        const result = await listLanguages(lara);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Invalid input: ${JSON.stringify(error.errors)}`);
    }
    throw error;
  }
});

const transport = new StdioServerTransport();
server.connect(transport).catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
