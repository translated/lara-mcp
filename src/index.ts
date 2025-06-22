import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { env } from "./env.js";
import getMcpServer from "./mcp/server.js";
import mcpRouter from "./rest/routes/mcp.js";
import serverInfoRouter from "./rest/routes/server-info.js";
import { RestServer } from "./rest/server.js";
import { logger } from "./logger.js";

// -- Start server
logger.info("Detected server mode: " + (env.USE_HTTP_SERVER ? "HTTP" : "STDIO"));
env.USE_HTTP_SERVER ? httpServer() : stdioServer();

const signalHandler = async (signal: string) => {
  logger.info(`Received ${signal}, shutting down...`);
  process.exit(0);
};

process.on("SIGINT", () => signalHandler("SIGINT"));
process.on("SIGTERM", () => signalHandler("SIGTERM"));
process.on("SIGQUIT", () => signalHandler("SIGQUIT"));

// -- HTTP server
function httpServer() {
  logger.info("Detected HTTP server mode, starting HTTP server...");
  const restServer = new RestServer();

  restServer
    .configure()
    .use("/mcp", mcpRouter(restServer))
    .use("/server-info", serverInfoRouter(restServer));

  restServer.start();
}

// -- STDIO server
function stdioServer() {
  logger.info(
    "Detected stdio server mode, starting MCP server with stdio transport..."
  );
  if (!env.LARA_API_ID || !env.LARA_API_SECRET) {
    throw new Error(
      "LARA_API_ID and LARA_API_SECRET must be set when using stdio server"
    );
  }

  const mcpServer = getMcpServer(env.LARA_API_ID, env.LARA_API_SECRET);

  mcpServer.connect(new StdioServerTransport());
}
