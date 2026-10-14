import { describe, it, expect, beforeEach, vi } from "vitest";
import { spawn } from "node:child_process";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

// The HTTP handler is a module-level singleton with an explicit teardown, and index.ts is the only
// caller. Both sides are covered here: the handler's lifecycle, and the real process exiting on a
// signal (an unclosed handler would keep the event loop alive).

const { createMcpHandler, close } = vi.hoisted(() => {
  const close = vi.fn(async () => {});
  return { createMcpHandler: vi.fn(() => ({ close, fetch: vi.fn(), notify: {}, bus: {} })), close };
});

vi.mock("@modelcontextprotocol/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@modelcontextprotocol/server")>()),
  createMcpHandler,
}));

vi.mock("#logger", () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const { RestServer } = await import("../../rest/server.js");
const { default: mcpRouter, closeMcpHandler } = await import("../../rest/routes/mcp.js");
const { shutdown } = await import("../../shutdown.js");
const { logger } = await import("#logger");

describe("MCP handler lifecycle", () => {
  beforeEach(async () => {
    await closeMcpHandler();
    createMcpHandler.mockClear();
    close.mockClear();
  });

  it("does not build an HTTP handler until a router is mounted", async () => {
    // stdio mode imports this module too, so importing it must cost nothing
    expect(createMcpHandler).not.toHaveBeenCalled();

    await expect(closeMcpHandler()).resolves.toBeUndefined();
    expect(close).not.toHaveBeenCalled();
  });

  it("builds the handler once, however many routers are mounted", () => {
    mcpRouter(new RestServer());
    mcpRouter(new RestServer());

    expect(createMcpHandler).toHaveBeenCalledTimes(1);
  });

  it("closes the handler on shutdown, and only once", async () => {
    mcpRouter(new RestServer());

    await closeMcpHandler();
    await closeMcpHandler();

    expect(close).toHaveBeenCalledTimes(1);
  });
});

describe("shutdown()", () => {
  beforeEach(async () => {
    await closeMcpHandler();
    createMcpHandler.mockClear();
    close.mockClear();
    vi.mocked(logger.error).mockClear();
  });

  it("closes the MCP handler before stopping the HTTP server, and exits 0", async () => {
    const restServer = new RestServer();
    mcpRouter(restServer);
    const order: string[] = [];
    close.mockImplementation(async () => void order.push("handler"));
    vi.spyOn(restServer, "stop").mockImplementation(async () => void order.push("http"));

    await expect(shutdown(restServer)).resolves.toBe(0);

    expect(order).toEqual(["handler", "http"]);
  });

  it("closes the stdio connection and exits 0", async () => {
    const handle = { close: vi.fn(async () => {}) };

    await expect(shutdown(handle as any)).resolves.toBe(0);

    expect(handle.close).toHaveBeenCalledTimes(1);
    expect(close).not.toHaveBeenCalled();
  });

  it("exits 1 and logs when teardown fails", async () => {
    const restServer = new RestServer();
    vi.spyOn(restServer, "stop").mockRejectedValue(new Error("boom"));

    await expect(shutdown(restServer)).resolves.toBe(1);

    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.any(Error) }),
      expect.stringContaining("shutting down")
    );
  });
});

describe("process shutdown", () => {
  const root = fileURLToPath(new URL("../../../", import.meta.url));

  it.each(["SIGTERM", "SIGINT"] as const)("exits 0 on %s in HTTP mode", async (signal) => {
    const child = spawn(join(root, "node_modules/.bin/tsx"), ["src/index.ts"], {
      cwd: root,
      env: { ...process.env, TRANSPORT: "http", HOST: "127.0.0.1", PORT: "0", LOGGING_LEVEL: "error" },
      stdio: ["ignore", "pipe", "pipe"],
    });

    // Give the server a moment to bind before signalling it
    await new Promise((resolve) => setTimeout(resolve, 1500));
    child.kill(signal);

    const code = await new Promise<number | null>((resolve) => child.on("exit", resolve));
    expect(code).toBe(0);
  }, 20_000);
});
