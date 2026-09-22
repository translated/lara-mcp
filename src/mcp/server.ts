import { Server } from "@modelcontextprotocol/server";
import { Credentials, Translator } from "@translated/lara";
import { CallTool, ListTools } from "./tools.js";
import { ListResources, ListResourceTemplates, ReadResource } from "./resources.js";
import { logger } from "#logger";
import { PACKAGE_VERSION } from "../version.js";

// Tool and resource catalogs are static but auth-gated, so they are cacheable per client and never
// by a shared intermediary; resource contents are live account data and are never cached.
const STATIC_LIST_HINT = { ttlMs: 60 * 60 * 1000, cacheScope: "private" } as const;

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
      // 2026-07-28 CacheableResult hints (ignored on 2025-era responses).
      cacheHints: {
        "tools/list": STATIC_LIST_HINT,
        "resources/list": STATIC_LIST_HINT,
        "resources/templates/list": STATIC_LIST_HINT,
        "server/discover": STATIC_LIST_HINT,
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
