import express from "express";
import { RestServer } from "#rest/server";
import { createMcpHandler } from "@modelcontextprotocol/server";
import { toNodeHandler } from "@modelcontextprotocol/node";
import getMcpServer from "#mcp/server";
import { InvalidCredentialsError } from "#exception";
import { logger } from "#logger";

const ACCESS_KEY_ID_HEADER = "x-lara-access-key-id";
const ACCESS_KEY_SECRET_HEADER = "x-lara-access-key-secret";

function mcpRouter(restServer: RestServer): express.Router {
  const router = express.Router();

  // One handler serves both protocol eras: 2026-07-28 (stateless, per-request
  // envelope) and 2025-era clients through the SDK's stateless fallback. A
  // fresh MCP server is built per request from that request's credentials.
  const onerror = (error: Error) =>
    logger.error("Error while handling MCP request: " + error);
  const handler = createMcpHandler(
    ({ requestInfo }) =>
      getMcpServer(
        requestInfo?.headers.get(ACCESS_KEY_ID_HEADER) ?? "",
        requestInfo?.headers.get(ACCESS_KEY_SECRET_HEADER) ?? ""
      ),
    { onerror }
  );
  const nodeHandler = toNodeHandler(handler, { onerror });

  router.post("/", async (req, res) => {
    if (!req.headers[ACCESS_KEY_ID_HEADER] || !req.headers[ACCESS_KEY_SECRET_HEADER]) {
      logger.debug("No credentials provided in MCP request");
      restServer.sendJsonRpc(res, new InvalidCredentialsError());
      return;
    }

    // express.json() has already drained the request stream: hand the parsed body over
    await nodeHandler(req, res, req.body);
  });

  // The 2025-era server→client SSE stream (GET) and session termination
  // (DELETE) are not implemented (and do not exist in 2026-07-28). The spec
  // requires 405 so clients fall back gracefully; any other status (notably
  // 400) is treated as a hard protocol error.
  router.get("/", (_req, res) => {
    res.status(405).set("Allow", "POST").end();
  });

  router.delete("/", (_req, res) => {
    res.status(405).set("Allow", "POST").end();
  });

  return router;
}

export default mcpRouter;
