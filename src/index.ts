#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema, ListResourceTemplatesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { Credentials, Translator } from "@translated/lara";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { translateHandler, translateSchema } from "./tools/translate.js";
import {
  listMemories,
  listMemoriesSchema,
} from "./tools/list_memories.js";
import { listLanguages, listLanguagesSchema } from "./tools/list_languages.js";
import {
  addTranslationSchema,
  addTranslation,
} from "./tools/add_translation.js";
import {
  createMemorySchema,
  createMemory,
} from "./tools/create_memory.js";
import {
  deleteMemorySchema,
  deleteMemory,
} from "./tools/delete_memory.js";
import {
  deleteTranslationSchema,
  deleteTranslation,
} from "./tools/delete_translation.js";
import {
  updateMemorySchema,
  updateMemory,
} from "./tools/update_memory.tool.js";
import { importTmx, importTmxSchema } from "./tools/import_tmx.js";
import {
  checkImportStatus,
  checkImportStatusSchema,
} from "./tools/check_import_status.js";
import {getMemoryByName} from "./tools/get_memory_by_name.js";

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
    version: "0.0.10",
  },
  {
    capabilities: {
      tools: {},
      resources: {},
      resourceTemplates: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "translate",
        description:
          "Translate text between languages with support for language detection, context-aware translations and translation memories using Lara Translate.",
        inputSchema: zodToJsonSchema(translateSchema),
      },
      {
        name: "create_memory",
        description:
          "Create a translation memory with a custom name in your Lara Translate account. Translation memories store pairs of source and target text segments (translation units) for reuse in future translations.",
        inputSchema: zodToJsonSchema(createMemorySchema),
      },
      {
        name: "delete_memory",
        description:
          "Deletes a translation memory from your Lara Translate account.",
        inputSchema: zodToJsonSchema(deleteMemorySchema),
      },
      {
        name: "update_memory",
        description:
          "Updates a translation memory in your Lara Translate account.",
        inputSchema: zodToJsonSchema(updateMemorySchema),
      },
      {
        name: "add_translation",
        description:
          "Adds a translation to a translation memory in your Lara Translate account.",
        inputSchema: zodToJsonSchema(addTranslationSchema),
      },
      {
        name: "delete_translation",
        description:
          "Deletes a translation from a translation memory from your Lara Translate account.",
        inputSchema: zodToJsonSchema(deleteTranslationSchema),
      },
      {
        name: "import_tmx",
        description:
          "Imports a TMX file into a translation memory in your Lara Translate account.",
        inputSchema: zodToJsonSchema(importTmxSchema),
      },
      {
        name: "check_import_status",
        description:
          "Checks the status of a TMX file import job in your Lara Translate account.",
        inputSchema: zodToJsonSchema(checkImportStatusSchema),
      },
      {
        name: "list_memories",
        description: "Lists all translation memories in your Lara Translate account.",
        inputSchema: zodToJsonSchema(listMemoriesSchema),
      },
      {
        name: "list_languages",
        description: "Lists all supported languages in your Lara Translate account.",
        inputSchema: zodToJsonSchema(listLanguagesSchema),
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

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
      case "import_tmx": {
        const result = await importTmx(args, lara);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }
      case "check_import_status": {
        const result = await checkImportStatus(args, lara);
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

server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: [
      {
        name: "Translation Memories",
        description: "List of translation memories in your Lara Translate account.",
        uri: "memories://list",
      },
      {
        name: "Supported Languages",
        description: "List of Lara Translate supported languages.",
        uri: "languages://list",
      }
    ],
  };
});

server.setRequestHandler(ListResourceTemplatesRequestSchema, async () => {
    return {
        resourceTemplates: [
        {
            name: "Get Memory by Name",
            uriTemplate: "memories://list/{name}",
            description: "Returns a memory by its name",
        }
        ]
    };
})

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;

  try {
    switch (true) {
      case uri === "memories://list": {
        const memories = await listMemories(lara);
        return {
          contents: [{
            uri: uri,
            text: JSON.stringify(memories, null, 2)
          }]
        };
      }
      case uri === "languages://list": {
        const languages = await listLanguages(lara);
        return {
          contents: [{
            uri: uri,
            text: JSON.stringify(languages, null, 2)
          }]
        };
      }
      case uri.startsWith(`memories://list/`): {
        const name = uri.slice("memories://list/".length).trim();
        if (!name) {
            return {
                contents: [{
                uri: uri,
                text: JSON.stringify({ error: "Memory name is required." }, null, 2)
                }]
            };
        }

        const memory = await getMemoryByName(lara, name);
        if (!memory) {
          return {
            contents: [{
              uri: uri,
              text: JSON.stringify({ error: `Memory with name "${name}" not found.` }, null, 2)
            }]
          };
        }

        return {
          contents: [{
            uri: uri,
            text: JSON.stringify(memory, null, 2)
          }]
        };
      }
      default:
        throw new Error(`Unknown resource: ${uri}`);
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
