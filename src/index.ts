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
    version: "0.0.0",
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
