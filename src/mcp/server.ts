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

export default function getMcpServer(
  accessKeyId: string,
  accessKeySecret: string
) {
  logger.debug("Creating MCP server with credentials: " + accessKeyId);

  const credentials = new Credentials(accessKeyId, accessKeySecret);
  const lara = new Translator(credentials);

  const server = new Server(
    {
      name: "Lara Translate",
      version: "0.0.12",
    },
    {
      capabilities: {
        tools: {},
        resources: {},
        resourceTemplates: {},
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
