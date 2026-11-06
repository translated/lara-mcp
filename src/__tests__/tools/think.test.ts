import { createServer } from "node:http";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthToken, Translator } from "@translated/lara";
import { translateHandler, translateSchema, translateOutputSchema } from "../../mcp/tools/translate.js";
import { CallTool, ListTools } from "../../mcp/tools.js";
import { callFieldsFor } from "../../metrics.js";

const input = { text: [{ text: "Hello", translatable: true }], target: "it" };
const feedback = { applied: false, error: { statusCode: 503, message: "unavailable" } };
let body: any;
let warnings: any;
let server: ReturnType<typeof createServer>;
let translator: Translator;
beforeEach(async () => {
  body = undefined; warnings = undefined;
  server = createServer(async (req, res) => {
    let data = "";
    for await (const chunk of req) data += chunk;
    body = JSON.parse(data);
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ translation: body.q, warnings }) + "\n");
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = (server.address() as { port: number }).port;
  const token = `x.${Buffer.from(JSON.stringify({ exp: 4102444800 })).toString("base64url")}.x`;
  translator = new Translator(new AuthToken(token, "unused"), { serverUrl: `http://127.0.0.1:${port}`, keepAlive: false });
});
afterEach(async () => { await new Promise<void>((resolve, reject) => server.close((err) => err ? reject(err) : resolve())); });

describe("Lara Think contract with real SDK", () => {
  it.each(["low", "medium", "high"] as const)("sends %s as HTTP effort", async (level) => {
    await translateHandler({ ...input, reasoning: true, reasoning_effort: level }, translator);
    expect(body).toMatchObject({ reasoning: true, effort: level });
    expect(body).not.toHaveProperty("reasoningEffort");
    const fields = callFieldsFor("translate", { ...input, reasoning: true, reasoning_effort: level });
    expect(JSON.stringify(fields)).toContain(`"reasoningEffort":"${level}"`);
  });
  it("defaults Think to high", async () => {
    await translateHandler({ ...input, reasoning: true }, translator);
    expect(body).toMatchObject({ reasoning: true, effort: "high" });
  });
  it("preserves Base and omits effort", async () => {
    expect(await translateHandler(input, translator)).toEqual(input.text);
    expect(body).not.toHaveProperty("effort");
  });
  it.each([undefined, false])("rejects effort without Think (%s) before SDK", async (reasoning) => {
    const translate = vi.spyOn(translator, "translate");
    await expect(translateHandler({ ...input, reasoning, reasoning_effort: "low" }, translator)).rejects.toThrow();
    expect(translate).not.toHaveBeenCalled();
  });
  it.each(["HIGH", "invalid", 1, null])("rejects invalid effort %s", (reasoning_effort) => {
    expect(translateSchema.safeParse({ ...input, reasoning: true, reasoning_effort }).success).toBe(false);
  });
  it("exposes the level in tools/list and fallback in tools/call", async () => {
    const tools = await ListTools();
    expect(JSON.stringify(tools.tools.find(tool => tool.name === "translate")?.inputSchema)).toContain("reasoning_effort");
    warnings = { reasoning: feedback };
    const result = await CallTool({ method: "tools/call", params: { name: "translate", arguments: { ...input, reasoning: true } } }, translator);
    expect(result.structuredContent).toEqual({ items: input.text, warnings });
    expect(JSON.stringify(result.content)).toContain("Warning:");
  });
  it("preserves translation and exposes fallback in the output schema", async () => {
    warnings = { reasoning: feedback };
    const result = await translateHandler({ ...input, reasoning: true }, translator);
    expect(result).toEqual({ items: input.text, warnings });
    expect(translateOutputSchema.safeParse(result).success).toBe(true);
  });
});
