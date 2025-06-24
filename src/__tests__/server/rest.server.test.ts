import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { RestServer } from "../../rest/server.js";
import mcpRouter from "../../rest/routes/mcp.js";
import serverInfoRouter from "../../rest/routes/server-info.js";
import { Express } from "express";

let app: Express;

beforeAll(() => {
  const restServer = new RestServer();
  app = restServer.configure();
  app.use("/mcp", mcpRouter(restServer));
  app.use("/server-info", serverInfoRouter(restServer));
});

const defaultHeaders = {
  accept: "application/json, text/event-stream",
  "content-type": "application/json",
};

const defaultPostMcpBody = {
  jsonrpc: "2.0",
  id: 1,
  method: "initialize",
  params: {
    protocolVersion: "2.0",
    capabilities: {},
    clientInfo: {
      name: "MyClient",
      version: "1.0.0",
    },
  },
};

describe("RestServer", () => {
  it("GET /server-info should return version info", async () => {
    const res = await request(app).get("/server-info").set(defaultHeaders);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("version");
  });

  it("POST /mcp without credentials should return error", async () => {
    const res = await request(app)
      .post("/mcp")
      .set(defaultHeaders)
      .send(defaultPostMcpBody);

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
    expect(res.body.error).toHaveProperty("code");
    expect(res.body.error).toHaveProperty("message");
  });

  it("POST /mcp with only one credential header should return error", async () => {
    const res1 = await request(app)
      .post("/mcp")
      .set("x-lara-access-key-id", "test")
      .set(defaultHeaders)
      .send(defaultPostMcpBody);

    expect(res1.status).toBe(400);
    expect(res1.body).toHaveProperty("error");

    const res2 = await request(app)
      .post("/mcp")
      .set("x-lara-access-key-secret", "test")
      .set(defaultHeaders)
      .send(defaultPostMcpBody);

    expect(res2.status).toBe(400);
    expect(res2.body).toHaveProperty("error");
  });

  it("POST /mcp with both credentials should return success", async () => {
    const res = await request(app)
      .post("/mcp")
      .set("x-lara-access-key-id", "test")
      .set("x-lara-access-key-secret", "test")
      .set(defaultHeaders)
      .send(defaultPostMcpBody);

    expect(res.status).toBe(200);
  });

  it("GET /mcp should return MethodNotAllowedError", async () => {
    const res = await request(app).get("/mcp").set(defaultHeaders);

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
    expect(res.body.error).toHaveProperty("code");
    expect(res.body.error).toHaveProperty("message");
  });

  it("DELETE /mcp should return MethodNotAllowedError", async () => {
    const res = await request(app).delete("/mcp").set(defaultHeaders);

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
    expect(res.body.error).toHaveProperty("code");
    expect(res.body.error).toHaveProperty("message");
  });
});
