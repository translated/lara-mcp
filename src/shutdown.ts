import type { StdioServerHandle } from "@modelcontextprotocol/server/stdio";
import { closeMcpHandler } from "./rest/routes/mcp.js";
import { RestServer } from "./rest/server.js";
import { logger } from "./logger.js";
import { flushBeforeExit } from "./metrics.js";

/**
 * Tears the running server down, delivers the queued metrics, and returns the process exit code: 0
 * on a clean shutdown, 1 when teardown failed, so a failed shutdown is not reported to the
 * orchestrator as success.
 *
 * Kept out of index.ts (whose import starts a server) so the signal path is testable.
 */
export async function shutdown(
  server: RestServer | StdioServerHandle
): Promise<number> {
  try {
    if (server instanceof RestServer) {
      // Aborts in-flight MCP exchanges before the HTTP listener goes away
      await closeMcpHandler();
      await server.stop();
    } else {
      await server.close();
    }
  } catch (error) {
    logger.error({ error }, "Error while shutting down the server");
    return 1;
  } finally {
    // Batched events are held in memory behind an unref'd timer: without this the last batch dies
    // with the process. Capped, because draining a long backlog would eat a shutdown budget the
    // supervisor ends with a SIGKILL anyway.
    await flushBeforeExit();
  }
  return 0;
}
