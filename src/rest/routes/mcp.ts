import express from "express";
import { RestServer } from "#rest/server";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import getMcpServer from "#mcp/server";
import {
  InvalidCredentialsError,
  InvalidInputError,
  ServerException,
} from "#exception";
import { logger } from "#logger";

function mcpRouter(restServer: RestServer): express.Router {
  const router = express.Router();

  router.post("/", async (req, res) => {
    const xLaraAccessKeyId = req.headers["x-lara-access-key-id"] as string | undefined;
    const xLaraAccessKeySecret = req.headers["x-lara-access-key-secret"] as string | undefined;

    if (!xLaraAccessKeyId || !xLaraAccessKeySecret) {
      logger.debug("No credentials provided in MCP request");
      restServer.sendJsonRpc(res, new InvalidCredentialsError());
      return;
    }

    const transport: StreamableHTTPServerTransport =
      new StreamableHTTPServerTransport({
        // In stateless mode we don't need to track the client session
        sessionIdGenerator: undefined,
      });

    const server = getMcpServer(xLaraAccessKeyId, xLaraAccessKeySecret);
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

  // The MCP Streamable HTTP server→client SSE stream (GET) and session
  // termination (DELETE) are optional capabilities this server does not
  // implement. The spec requires 405 so clients fall back gracefully; any
  // other status (notably 400) is treated as a hard protocol error.
  router.get("/", (_req, res) => {
    res.status(405).set("Allow", "POST").end();
  });

  router.delete("/", (_req, res) => {
    res.status(405).set("Allow", "POST").end();
  });

  return router;
}

export default mcpRouter;
