import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { Credentials, Translator } from "@translated/lara";
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListResourceTemplatesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { CallTool, ListTools } from "./tools.js";
import { ListResources, ListResourceTemplates, ReadResource } from "./resources.js";
import { logger } from "#logger";
import { PACKAGE_VERSION } from "../version.js";

export default function getMcpServer(
  accessKeyId: string,
  accessKeySecret: string
) {
  logger.debug("Creating MCP server with authenticated credentials");

  const credentials = new Credentials(accessKeyId, accessKeySecret);
  const lara = new Translator(credentials);

  // Identify MCP-originated traffic to Lara on every SDK request. extraHeaders
  // are spread into all requests by the SDK transport, so setting them once
  // here covers translate, glossaries, memories, languages, imports, etc. The
  // client is protected/internal in the SDK types, hence the narrow cast.
  const laraClient = (lara as unknown as {
    client?: { setExtraHeader?: (name: string, value: string) => void };
  }).client;
  if (typeof laraClient?.setExtraHeader === "function") {
    laraClient.setExtraHeader("X-Lara-Client", "MCP");
    laraClient.setExtraHeader("X-Lara-Client-Version", PACKAGE_VERSION);
  } else {
    logger.warn(
      "Lara SDK client does not expose setExtraHeader; X-Lara-Client headers not set"
    );
  }

  const server = new Server(
    {
      name: "Lara Translate",
      version: PACKAGE_VERSION,
    },
    {
      capabilities: {
        tools: {},
        resources: {},
      },
    }
  );
  logger.debug("MCP server created! Setting request handlers...");

  // -- Tools
  server.setRequestHandler(ListToolsRequestSchema, ListTools);
  server.setRequestHandler(CallToolRequestSchema, (request) =>
    CallTool(request, lara)
  );

  // -- Resources
  server.setRequestHandler(ListResourceTemplatesRequestSchema, ListResourceTemplates);
  server.setRequestHandler(ListResourcesRequestSchema, ListResources);
  server.setRequestHandler(ReadResourceRequestSchema, (request) =>
    ReadResource(request, lara)
  );

  logger.debug("Request handlers set!");

  return server;
}
