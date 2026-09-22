import express from "express";
import { createMcpHandler } from "@modelcontextprotocol/server";
import type { AuthInfo, McpRequestContext } from "@modelcontextprotocol/server";
import { toNodeHandler } from "@modelcontextprotocol/node";
import { RestServer } from "#rest/server";
import getMcpServer from "#mcp/server";
import { InvalidCredentialsError } from "#exception";
import { logger } from "#logger";

/** Mount path of the MCP endpoint. */
export const MCP_MOUNT_PATH = "/v1";

const ACCESS_KEY_ID_HEADER = "x-lara-access-key-id";
const ACCESS_KEY_SECRET_HEADER = "x-lara-access-key-secret";
const CONFIG_KEY = "laraServerConfig";

type ServerConfig = { accessKeyId: string; accessKeySecret: string };

/**
 * Builds the per-request MCP server from the credentials resolved by the route (carried through the
 * SDK's pass-through authInfo). Credentials are always resolved before the handler runs, so a
 * missing config is a wiring bug, not a client error.
 */
function serverFactory({ authInfo }: McpRequestContext) {
  const config = authInfo?.extra?.[CONFIG_KEY] as ServerConfig | undefined;
  if (!config) throw new Error("MCP server factory invoked without resolved credentials");
  return getMcpServer(config.accessKeyId, config.accessKeySecret);
}

function onMcpError(error: Error) {
  logger.warn({ error: error.message }, "MCP handler reported an error");
}

/**
 * One handler serves both protocol eras: 2026-07-28 (per-request envelope) and, via the stateless
 * legacy fallback, 2025-era clients that still use the initialize handshake. Each request gets a
 * fresh server instance from the factory; the SDK owns its lifecycle.
 */
const mcpHandler = createMcpHandler(serverFactory, { legacy: "stateless", onerror: onMcpError });
const nodeHandler = toNodeHandler(mcpHandler, { onerror: onMcpError });

export async function closeMcpHandler(): Promise<void> {
  await mcpHandler.close();
}

/**
 * MCP router
 * @returns The express router
 */
function mcpRouter(restServer: RestServer): express.Router {
  const router = express.Router();

  router.post("/", async (req, res) => {
    const accessKeyId = req.headers[ACCESS_KEY_ID_HEADER] as string | undefined;
    const accessKeySecret = req.headers[ACCESS_KEY_SECRET_HEADER] as string | undefined;

    if (!accessKeyId || !accessKeySecret) {
      logger.debug("No credentials provided in MCP request");
      restServer.sendJsonRpc(res, new InvalidCredentialsError());
      return;
    }

    // authInfo is only the carrier for the resolved credentials (read back by serverFactory); the
    // identity fields are unused. The adapter answers 500 itself on conversion failures.
    const authInfo: AuthInfo = {
      token: "",
      clientId: "",
      scopes: [],
      extra: { [CONFIG_KEY]: { accessKeyId, accessKeySecret } satisfies ServerConfig },
    };
    (req as express.Request & { auth?: AuthInfo }).auth = authInfo;

    // express.json() has already drained the request stream: hand the parsed body over
    await nodeHandler(req, res, req.body);
  });

  // 2026-07-28 removed the GET SSE stream (replaced by subscriptions/listen) and there are no sessions
  // to DELETE; 2025-era stateless serving answers both with 405 so clients fall back gracefully.
  router.get("/", (_req, res) => {
    res.status(405).set("Allow", "POST").end();
  });

  router.delete("/", (_req, res) => {
    res.status(405).set("Allow", "POST").end();
  });

  return router;
}

export default mcpRouter;
