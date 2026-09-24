#!/usr/bin/env node

import { serveStdio, type StdioServerHandle } from "@modelcontextprotocol/server/stdio";
import { env } from "./env.js";
import getMcpServer from "./mcp/server.js";
import mcpRouter, { MCP_MOUNT_PATH } from "./rest/routes/mcp.js";
import serverInfoRouter from "./rest/routes/server-info.js";
import { RestServer } from "./rest/server.js";
import { logger } from "./logger.js";
import { shutdown } from "./shutdown.js";

// -- Start server
logger.info("Detected server mode: " + env.TRANSPORT);

let server: RestServer | StdioServerHandle;
switch (env.TRANSPORT) {
  case "stdio":
    server = stdioServer();
    break;
  case "http":
    server = httpServer();
    break;
  default:
    throw new Error("Invalid transport: " + env.TRANSPORT + ". Must be either 'stdio' or 'http'");
}

for (const signal of ["SIGINT", "SIGTERM", "SIGQUIT"] as const) {
  process.on(signal, () => shutdown(server).then((code) => process.exit(code)));
}

// -- HTTP server
function httpServer() {
  logger.info("Detected HTTP server mode, starting HTTP server...");
  const restServer = new RestServer();

  restServer
    .configure()
    .use(MCP_MOUNT_PATH, mcpRouter(restServer))
    .use("/server-info", serverInfoRouter(restServer));

  restServer.start();
  return restServer;
}

// -- STDIO server
function stdioServer() {
  logger.info(
    "Detected stdio server mode, starting MCP server with stdio transport..."
  );
  const { LARA_ACCESS_KEY_ID: accessKeyId, LARA_ACCESS_KEY_SECRET: accessKeySecret } = env;
  if (!accessKeyId || !accessKeySecret) {
    throw new Error(
      "LARA_ACCESS_KEY_ID and LARA_ACCESS_KEY_SECRET must be set when using stdio server"
    );
  }

  // serveStdio negotiates the era on the opening exchange (2026-07-28 via
  // server/discover, or the 2025 initialize handshake) and pins one server
  // instance per connection.
  return serveStdio(() => getMcpServer(accessKeyId, accessKeySecret), {
    onerror: (error) => logger.error("MCP stdio error: " + error),
  });
}
