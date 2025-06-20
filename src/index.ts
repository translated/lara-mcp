import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { env } from "./env.js";
import getMcpServer from "./mcp/server.js";
import mcpRouter from "./rest/routes/mcp.js";
import serverInfoRouter from "./rest/routes/server-info.js";
import { RestServer } from "./rest/server.js";

function httpServer() {
  const restServer = new RestServer();

  restServer.configure()
    .use("/mcp", mcpRouter(restServer))
    .use("/server-info", serverInfoRouter(restServer));

  restServer.start();
}

function stdioServer() {
  if(!env.LARA_API_ID || !env.LARA_API_KEY) {
    throw new Error("LARA_API_ID and LARA_API_KEY must be set when using stdio server");
  }

  const mcpServer = getMcpServer(env.LARA_API_ID, env.LARA_API_KEY);

  mcpServer.connect(new StdioServerTransport());
}

if(require.main === module) {
  env.USE_HTTP_SERVER ? httpServer() : stdioServer();

  const signalHandler = async (signal: string) => {
    process.exit(0);
  };
  
  process.on("SIGINT", () => signalHandler("SIGINT"));
  process.on("SIGTERM", () => signalHandler("SIGTERM"));
  process.on("SIGQUIT", () => signalHandler("SIGQUIT"));
}