import { createServer } from "node:http";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthToken, Translator } from "@translated/lara";
import type { ServerContext } from "@modelcontextprotocol/server";
import { translateHandler } from "../../mcp/tools/translate.js";
import { CallTool } from "../../mcp/tools.js";

vi.mock("#logger", () => ({ logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));

const input = { text: [{ text: "Hello", translatable: true }], target: "it" };
let body: any;
let partials: unknown[];
let server: ReturnType<typeof createServer>;
let translator: Translator;
beforeEach(async () => {
  body = undefined; partials = [];
  server = createServer(async (req, res) => {
    let data = "";
    for await (const chunk of req) data += chunk;
    body = JSON.parse(data);
    res.setHeader("Content-Type", "application/json");
    for (const partial of partials) res.write(JSON.stringify(partial) + "\n");
    res.end(JSON.stringify({ translation: body.q }) + "\n");
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = (server.address() as { port: number }).port;
  const token = `x.${Buffer.from(JSON.stringify({ exp: 4102444800 })).toString("base64url")}.x`;
  translator = new Translator(new AuthToken(token, "unused"), { serverUrl: `http://127.0.0.1:${port}`, keepAlive: false });
});
afterEach(async () => { await new Promise<void>((resolve, reject) => server.close((err) => err ? reject(err) : resolve())); });

describe("Lara Think progress with real SDK", () => {
  it.each(["think-progress", 0])("forwards ordered progress for token %s before returning the final result", async (progressToken) => {
    partials = [{ translation: [{ text: "Private partial translation" }] }];
    const sent: unknown[] = [];
    const notify = vi.fn(async (notification) => {
      await new Promise(setImmediate);
      sent.push(notification);
    });
    const context = { mcpReq: { _meta: { progressToken }, signal: new AbortController().signal, notify } } as unknown as ServerContext;
    const result = await CallTool({ method: "tools/call", params: { name: "translate", arguments: { ...input, reasoning: true } } }, translator, undefined, undefined, context);
    expect(sent).toEqual([1, 2].map(progress => ({
      method: "notifications/progress",
      params: { progressToken, progress, message: "Received a translation update from Lara Think" },
    })));
    expect(JSON.stringify(sent)).not.toContain("Private partial translation");
    expect(result.structuredContent).toEqual({ items: input.text });
  });

  it.each([
    { reasoning: true, progressToken: undefined },
    { reasoning: false, progressToken: "base" },
  ])("does not notify without Think or a progress token (%j)", async ({ reasoning, progressToken }) => {
    const notify = vi.fn();
    const context = { mcpReq: { _meta: { progressToken }, signal: new AbortController().signal, notify } } as unknown as ServerContext;
    await translateHandler({ ...input, reasoning }, translator, context);
    expect(notify).not.toHaveBeenCalled();
  });

  it("preserves the translation when notification delivery fails", async () => {
    partials = [{ translation: [] }];
    const notify = vi.fn().mockRejectedValue(new Error("Disconnected"));
    const context = { mcpReq: { _meta: { progressToken: "p" }, signal: new AbortController().signal, notify } } as unknown as ServerContext;
    await expect(translateHandler({ ...input, reasoning: true }, translator, context)).resolves.toEqual(input.text);
    expect(notify).toHaveBeenCalledTimes(2);
  });

  it("does not send progress after cancellation", async () => {
    const controller = new AbortController();
    controller.abort();
    const notify = vi.fn();
    const context = { mcpReq: { _meta: { progressToken: "p" }, signal: controller.signal, notify } } as unknown as ServerContext;
    await translateHandler({ ...input, reasoning: true }, translator, context);
    expect(notify).not.toHaveBeenCalled();
  });

  it("drains progress before propagating a Lara error", async () => {
    const sent: unknown[] = [];
    const notify = vi.fn(async (notification) => {
      await new Promise(setImmediate);
      sent.push(notification);
    });
    const context = { mcpReq: { _meta: { progressToken: "p" }, signal: new AbortController().signal, notify } } as unknown as ServerContext;
    vi.spyOn(translator, "translate").mockImplementationOnce(async (_text, _source, _target, _options, callback) => {
      callback!({ translation: [] } as any);
      throw new Error("Lara failed");
    });
    await expect(translateHandler({ ...input, reasoning: true }, translator, context)).rejects.toThrow("Lara failed");
    expect(sent).toHaveLength(1);
  });
});
