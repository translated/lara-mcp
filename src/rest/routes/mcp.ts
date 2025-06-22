import express from "express";
import { RestServer } from "../server.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import getMcpServer from "../../mcp/server.js";
import {
  InvalidCredentialsError,
  InvalidInputError,
  MethodNotAllowedError,
  ServerException,
} from "../../exception.js";
import { logger } from "../../logger.js";

function mcpRouter(restServer: RestServer): express.Router {
  const router = express.Router();

  router.post("/mcp", async (req, res) => {
    const xLaraApiId = req.headers["x-lara-api-id"] as string | undefined;
    const xLaraApiKey = req.headers["x-lara-api-key"] as string | undefined;

    if (!xLaraApiId || !xLaraApiKey) {
      restServer.sendJsonRpc(res, new InvalidCredentialsError());
      return;
    }

    const transport: StreamableHTTPServerTransport =
      new StreamableHTTPServerTransport({
        // In stateless mode we don't need to track the client session
        sessionIdGenerator: undefined,
      });

    const server = getMcpServer(xLaraApiId, xLaraApiKey);
    await server.connect(transport);

    try {
      await transport.handleRequest(req, res, req.body);
    } catch (error) {
      if (error instanceof InvalidInputError) {
        logger.error(
          "Invalid input error while handling MCP request: " + error.message
        );
        restServer.sendJsonRpc(res, error);
        return;
      }

      logger.error("Generic error while handling MCP request: " + error);
      restServer.sendJsonRpc(res, new ServerException("Internal server error"));
    }
  });

  router.get("/mcp", (_req, res) => {
    logger.debug("Received GET request on /mcp, sending MethodNotAllowedError");
    restServer.sendJsonRpc(res, new MethodNotAllowedError());
  });

  router.delete("/mcp", (_req, res) => {
    logger.debug(
      "Received DELETE request on /mcp, sending MethodNotAllowedError"
    );
    restServer.sendJsonRpc(res, new MethodNotAllowedError());
  });

  return router;
}

export default mcpRouter;
