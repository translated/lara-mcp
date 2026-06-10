import { describe, it, expect, beforeEach, vi } from "vitest";
import { PACKAGE_VERSION } from "../../version.js";

// Hoisted so it exists before the mock factory runs (the factory fires as soon
// as anything imports "@translated/lara", which happens transitively before
// module-scope consts would be initialized).
const { instances } = vi.hoisted(() => ({ instances: [] as any[] }));

vi.mock("@translated/lara", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@translated/lara")>();
  return {
    ...actual,
    Translator: vi.fn(() => {
      const instance = { client: { setExtraHeader: vi.fn() } };
      instances.push(instance);
      return instance;
    }),
  };
});

const { default: getMcpServer } = await import("../../mcp/server.js");

describe("getMcpServer Lara client headers", () => {
  beforeEach(() => {
    instances.length = 0;
  });

  it("sets X-Lara-Client and X-Lara-Client-Version on every SDK call", () => {
    getMcpServer("test-id", "test-secret");

    expect(instances).toHaveLength(1);
    const setExtraHeader = instances[0].client.setExtraHeader;

    expect(setExtraHeader).toHaveBeenCalledWith("X-Lara-Client", "MCP");
    expect(setExtraHeader).toHaveBeenCalledWith(
      "X-Lara-Client-Version",
      PACKAGE_VERSION
    );
    expect(setExtraHeader).toHaveBeenCalledTimes(2);
  });
});
