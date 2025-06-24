import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { env } from "./env.js";
import getMcpServer from "./mcp/server.js";
import mcpRouter from "./rest/routes/mcp.js";
import serverInfoRouter from "./rest/routes/server-info.js";
import { RestServer } from "./rest/server.js";
import { logger } from "./logger.js";
import { Server as McpServer } from "@modelcontextprotocol/sdk/server/index.js";

// -- Start server
logger.info("Detected server mode: " + (env.USE_HTTP_SERVER ? "HTTP" : "STDIO"));
const server = env.USE_HTTP_SERVER ? httpServer() : await stdioServer();

process.on("SIGINT", () => signalHandler(server));
process.on("SIGTERM", () => signalHandler(server));
process.on("SIGQUIT", () => signalHandler(server));

// -- Signal handler
function signalHandler(server: RestServer | McpServer) {
  if (env.USE_HTTP_SERVER) {
    (server as RestServer).stop();
  } else {
    (server as McpServer).close();
  }

  process.exit(0);
}

// -- HTTP server
function httpServer() {
  logger.info("Detected HTTP server mode, starting HTTP server...");
  const restServer = new RestServer();

  restServer
    .configure()
    .use("/mcp", mcpRouter(restServer))
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
