import { CLIENT_INFO_META_KEY, Server, type Implementation } from "@modelcontextprotocol/server";
import { Credentials, Translator } from "@translated/lara";
import { CallTool, ListTools } from "./tools.js";
import { ListResources, ListResourceTemplates, ReadResource } from "./resources.js";
import { logger } from "#logger";
import { getLaraClient } from "../lara-client.js";
import { clientFor, clientVersionFor, createMetricsContext } from "../metrics.js";
import { PACKAGE_VERSION } from "../version.js";

// Tool and resource catalogs are static but auth-gated, so they are cacheable per client and never
// by a shared intermediary; resource contents are live account data and are never cached.
const STATIC_LIST_HINT = { ttlMs: 60 * 60 * 1000, cacheScope: "private" } as const;

export default function getMcpServer(
  accessKeyId: string,
  accessKeySecret: string
) {
  logger.debug("Creating MCP server with authenticated credentials");

  const credentials = new Credentials(accessKeyId, accessKeySecret);
  const lara = new Translator(credentials);

  // Identify MCP-originated traffic to Lara on every SDK request. extraHeaders
  // are spread into all requests by the SDK transport, so setting them once
  // here covers translate, glossaries, memories, languages, imports, etc. The
  // client is protected/internal in the SDK types, hence the guarded accessor.
  const laraClient = getLaraClient(lara);
  if (typeof laraClient?.setExtraHeader === "function") {
    laraClient.setExtraHeader("X-Lara-Client", "MCP");
    laraClient.setExtraHeader("X-Lara-Client-Version", PACKAGE_VERSION);
  } else {
    logger.warn(
      "Lara SDK client does not expose setExtraHeader; X-Lara-Client headers not set"
    );
  }

  const server = new Server(
    {
      name: "Lara Translate",
      version: PACKAGE_VERSION,
    },
    {
      capabilities: {
        tools: {},
        resources: {},
      },
      // 2026-07-28 CacheableResult hints (ignored on 2025-era responses).
      cacheHints: {
        "tools/list": STATIC_LIST_HINT,
        "resources/list": STATIC_LIST_HINT,
        "resources/templates/list": STATIC_LIST_HINT,
        "server/discover": STATIC_LIST_HINT,
        "resources/read": { ttlMs: 0, cacheScope: "private" },
      },
    }
  );
  logger.debug("MCP server created! Setting request handlers...");

  // -- Tools
  // Funnel telemetry for this session. Undefined when metrics are off or opted
  // out of, which makes every report inside CallTool a no-op.
  const metrics = createMetricsContext(lara);

  server.setRequestHandler('tools/list', ListTools);
  server.setRequestHandler('tools/call', (request, ctx) => {
    if (!metrics) return CallTool(request, lara);

    // clientInfo rides on every 2026-07-28 request's envelope, which the SDK lifts out of `_meta`
    // before the handler sees it; on 2025-era connections it is what the initialize handshake said.
    // On the stateless 2025 HTTP fallback the handshake went to another server instance, and the
    // User-Agent is all this request carries.
    const envelope = ctx?.mcpReq?.envelope as Record<string, unknown> | undefined;
    const clientInfo =
      (envelope?.[CLIENT_INFO_META_KEY] as Partial<Implementation> | undefined) ??
      server.getClientVersion();
    return CallTool(request, lara, metrics, {
      client: clientFor(
        clientInfo?.name,
        request.params._meta,
        ctx?.http?.req?.headers.get("user-agent") ?? undefined
      ),
      clientVersion: clientVersionFor(clientInfo?.version),
    });
  });

  // -- Resources
  server.setRequestHandler('resources/templates/list', ListResourceTemplates);
  server.setRequestHandler('resources/list', ListResources);
  server.setRequestHandler('resources/read', (request) =>
    ReadResource(request, lara)
  );

  logger.debug("Request handlers set!");

  return server;
}
