import { describe, it, expect, vi } from "vitest";
import { ProtocolError, ProtocolErrorCode, ResourceNotFoundError } from "@modelcontextprotocol/server";
import type { ReadResourceRequest } from "@modelcontextprotocol/server";
import type { Translator } from "@translated/lara";

vi.mock("#logger", () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const { ListResources, ListResourceTemplates, ReadResource } = await import("../../mcp/resources.js");

function lara(memories: unknown[] = [], languages: string[] = []) {
  return {
    memories: { list: vi.fn(async () => memories) },
    getLanguages: vi.fn(async () => languages),
  } as unknown as Translator;
}

function read(uri: string, translator = lara()) {
  return ReadResource({ method: "resources/read", params: { uri } } as ReadResourceRequest, translator);
}

describe("resources", () => {
  it("lists static resources and templates", async () => {
    expect((await ListResources()).resources.map((r) => r.uri)).toEqual([
      "memories://list",
      "languages://list",
    ]);
    expect((await ListResourceTemplates()).resourceTemplates.map((t) => t.uriTemplate)).toEqual([
      "memories://list/{name}",
    ]);
  });

  it("reads the memories list", async () => {
    const result = await read("memories://list", lara([{ id: "mem_1", name: "A" }]));

    expect(result.contents).toEqual([
      { uri: "memories://list", text: JSON.stringify([{ id: "mem_1", name: "A" }], null, 2) },
    ]);
  });

  it("reads the languages list", async () => {
    const result = await read("languages://list", lara([], ["en-US"]));

    expect(JSON.parse((result.contents[0] as { text: string }).text)).toEqual(["en-US"]);
  });

  it("reads a memory by name", async () => {
    const result = await read("memories://list/B", lara([{ id: "mem_1", name: "A" }, { id: "mem_2", name: "B" }]));

    expect(JSON.parse((result.contents[0] as { text: string }).text)).toEqual({ id: "mem_2", name: "B" });
  });

  it("throws ResourceNotFoundError (-32602) for a missing memory name", async () => {
    const promise = read("memories://list/Missing", lara([{ id: "mem_1", name: "A" }]));

    await expect(promise).rejects.toBeInstanceOf(ResourceNotFoundError);
    await expect(promise).rejects.toMatchObject({
      code: ProtocolErrorCode.InvalidParams,
      message: expect.stringContaining('Memory with name "Missing" not found.'),
    });
  });

  it("throws InvalidParams when the memory name is blank", async () => {
    const promise = read("memories://list/  ");

    await expect(promise).rejects.toBeInstanceOf(ProtocolError);
    await expect(promise).rejects.not.toBeInstanceOf(ResourceNotFoundError);
    await expect(promise).rejects.toMatchObject({ code: ProtocolErrorCode.InvalidParams });
  });

  it("throws ResourceNotFoundError for an unknown URI", async () => {
    const promise = read("unknown://thing");

    await expect(promise).rejects.toBeInstanceOf(ResourceNotFoundError);
    await expect(promise).rejects.toMatchObject({ code: ProtocolErrorCode.InvalidParams });
  });
});
