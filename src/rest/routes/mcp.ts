import express from "express";
import { RestServer } from "#rest/server";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import getMcpServer from "#mcp/server";
import {
  InvalidCredentialsError,
  InvalidInputError,
  MethodNotAllowedError,
  ServerException,
} from "#exception";
import { logger } from "#logger";

function mcpRouter(restServer: RestServer): express.Router {
  const router = express.Router();

  router.post("/", async (req, res) => {
    const xLaraApiId = req.headers["x-lara-api-id"] as string | undefined;
    const xLaraApiSecret = req.headers["x-lara-api-secret"] as string | undefined;

    if (!xLaraApiId || !xLaraApiSecret) {
      restServer.sendJsonRpc(res, new InvalidCredentialsError());
      return;
    }

    const transport: StreamableHTTPServerTransport =
      new StreamableHTTPServerTransport({
        // In stateless mode we don't need to track the client session
        sessionIdGenerator: undefined,
      });

    const server = getMcpServer(xLaraApiId, xLaraApiSecret);
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

  router.get("/", (_req, res) => {
    logger.debug("Received GET request on /mcp, sending MethodNotAllowedError");
    restServer.sendJsonRpc(res, new MethodNotAllowedError());
  });

  router.delete("/", (_req, res) => {
    logger.debug(
      "Received DELETE request on /mcp, sending MethodNotAllowedError"
    );
    restServer.sendJsonRpc(res, new MethodNotAllowedError());
  });

  return router;
}

export default mcpRouter;
