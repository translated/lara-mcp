import { Server } from "@modelcontextprotocol/server";
import { Credentials, Translator } from "@translated/lara";
import { CallTool, ListTools } from "./tools.js";
import { ListResources, ListResourceTemplates, ReadResource } from "./resources.js";
import { logger } from "#logger";
import { PACKAGE_VERSION } from "../version.js";

const PUBLIC_1H = { ttlMs: 60 * 60 * 1000, cacheScope: "public" } as const;

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
      // 2026-07-28 cacheable results (ignored on 2025-era responses). Tool and
      // resource catalogs and server capabilities are static and identical for
      // every account; resource contents are account data, so they must never
      // be shared or reused.
      cacheHints: {
        "tools/list": PUBLIC_1H,
        "resources/list": PUBLIC_1H,
        "resources/templates/list": PUBLIC_1H,
        "server/discover": PUBLIC_1H,
        "resources/read": { ttlMs: 0, cacheScope: "private" },
      },
    }
  );
  logger.debug("MCP server created! Setting request handlers...");

  // -- Tools
  server.setRequestHandler('tools/list', ListTools);
  server.setRequestHandler('tools/call', (request) =>
    CallTool(request, lara)
  );

  // -- Resources
  server.setRequestHandler('resources/templates/list', ListResourceTemplates);
  server.setRequestHandler('resources/list', ListResources);
  server.setRequestHandler('resources/read', (request) =>
    ReadResource(request, lara)
  );

  logger.debug("Request handlers set!");

  return server;
}
