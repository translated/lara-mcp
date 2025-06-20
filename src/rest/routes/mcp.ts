import express from "express";
import { RestServer } from "../server.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import getMcpServer from "@/mcp/server.js";
import { InvalidCredentialsError, MethodNotAllowedError } from "@/exception.js";

function mcpRouter(restServer: RestServer): express.Router {
  const router = express.Router();

  router.post("/mcp", async (req, res) => {
    const xLaraApiId = req.headers["x-lara-api-id"] as string | undefined;
    const xLaraApiKey = req.headers["x-lara-api-key"] as string | undefined;

    if(!xLaraApiId || !xLaraApiKey) {
        restServer.sendJsonRpc(res, new InvalidCredentialsError());
        return;
    }
    const transport: StreamableHTTPServerTransport = new StreamableHTTPServerTransport({
        // In stateless mode we don't need to track the client session
        sessionIdGenerator: undefined
    })

    const server = getMcpServer(xLaraApiId, xLaraApiKey); 

    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  });

  router.get("/mcp", (req, res) => {
    restServer.sendJsonRpc(res, new MethodNotAllowedError());
  });

  router.delete("/mcp", (req, res) => {
    restServer.sendJsonRpc(res, new MethodNotAllowedError());
  });

  return router;
}

export default mcpRouter;
