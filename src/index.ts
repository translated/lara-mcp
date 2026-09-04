#!/usr/bin/env node

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { env } from "./env.js";
import getMcpServer from "./mcp/server.js";
import mcpRouter from "./rest/routes/mcp.js";
import serverInfoRouter from "./rest/routes/server-info.js";
import { RestServer } from "./rest/server.js";
import { logger } from "./logger.js";
import { flushNow } from "./metrics.js";
import { Server as McpServer } from "@modelcontextprotocol/sdk/server/index.js";

// -- Start server
logger.info("Detected server mode: " + env.TRANSPORT);

let server: RestServer | McpServer;
switch (env.TRANSPORT) {
  case "stdio":
    server = await stdioServer();
    break;
  case "http":
    server = httpServer();
    break;
  default:
    throw new Error("Invalid transport: " + env.TRANSPORT + ". Must be either 'stdio' or 'http'");
}

process.on("SIGINT", () => void signalHandler(server));
process.on("SIGTERM", () => void signalHandler(server));
process.on("SIGQUIT", () => void signalHandler(server));

// -- Signal handler
async function signalHandler(server: RestServer | McpServer) {
  if (server instanceof RestServer) {
    server.stop();
  } else {
    server.close();
  }

  // Deliver the queued metrics before the process goes: batched events are held
  // in memory behind an unref'd timer, so without this the last batch dies with
  // it. Capped, because draining a long backlog would eat a shutdown budget the
  // supervisor ends with a SIGKILL anyway.
  await Promise.race([
    flushNow(),
    new Promise((resolve) => setTimeout(resolve, 2000)),
  ]);

  process.exit(0);
}

// -- HTTP server
function httpServer() {
  logger.info("Detected HTTP server mode, starting HTTP server...");
  const restServer = new RestServer();

  restServer
    .configure()
    .use("/v1", mcpRouter(restServer))
    .use("/server-info", serverInfoRouter(restServer));

  restServer.start();
  return restServer;
}

// -- STDIO server
async function stdioServer() {
  logger.info(
    "Detected stdio server mode, starting MCP server with stdio transport..."
  );
  if (!env.LARA_ACCESS_KEY_ID || !env.LARA_ACCESS_KEY_SECRET) {
    throw new Error(
      "LARA_ACCESS_KEY_ID and LARA_ACCESS_KEY_SECRET must be set when using stdio server"
    );
  }

  const mcpServer = getMcpServer(env.LARA_ACCESS_KEY_ID, env.LARA_ACCESS_KEY_SECRET);

  await mcpServer.connect(new StdioServerTransport()).catch((error) => {
    logger.error("Error connecting to MCP server: " + error);
    process.exit(1);
  });

  return mcpServer;
}
