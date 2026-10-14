// E2E for funnel metrics against the real build (dist/), a local mock metrics backend and the
// real Lara API. Nothing is sent to the production metrics backend.
// Usage: pnpm test:e2e (builds first). Real-credential scenarios run only when
// LARA_ACCESS_KEY_ID / LARA_ACCESS_KEY_SECRET are set.
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { existsSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";

const repo = fileURLToPath(new URL("..", import.meta.url));
const entry = join(repo, "dist/index.js");
const realId = process.env.LARA_ACCESS_KEY_ID;
const realSecret = process.env.LARA_ACCESS_KEY_SECRET;
const EVENT_TYPES = ["auth_success", "auth_fail", "call_success", "call_error"];

// -- Mock backend, enforcing the rules of lara-integrations-monitoring's schema
const state = { events: [], requests: 0, violations: [] };
const backend = createServer((req, res) => {
  let body = "";
  req.on("data", (c) => (body += c));
  req.on("end", () => {
    state.requests++;
    if (req.url === "/auth/issue-token") {
      const { installationId } = JSON.parse(body);
      if (!/^[0-9a-f-]{36}$/.test(installationId)) state.violations.push("bad installationId");
      res.writeHead(200, { "content-type": "application/json" });
      return res.end(JSON.stringify({ status: "success", token: "t", expiresIn: 3600 }));
    }
    if (req.url === "/metrics/ingest-events") {
      for (const e of JSON.parse(body).events) {
        if (!EVENT_TYPES.includes(e.eventType)) state.violations.push(`eventType ${e.eventType}`);
        if (e.channel !== "mcp") state.violations.push("channel");
        if (!("accountId" in e) && e.eventType !== "auth_fail") state.violations.push(`no account on ${e.eventType}`);
        if (Buffer.byteLength(JSON.stringify(e.metadata ?? {})) > 4096) state.violations.push("metadata > 4096");
        state.events.push(e);
      }
      res.writeHead(202);
      return res.end("{}");
    }
    res.writeHead(404).end();
  });
});
await new Promise((r) => backend.listen(0, "127.0.0.1", r));
const METRICS_URL = `http://127.0.0.1:${backend.address().port}`;
const reset = () => Object.assign(state, { events: [], requests: 0, violations: [] });

function serverEnv(extra) {
  const home = mkdtempSync(join(tmpdir(), "lara-e2e-"));
  const env = { ...process.env, METRICS_URL, METRICS_API_KEY: "e2e-key", LARA_HOME: home, LOGGING_LEVEL: "error", ...extra };
  delete env.DO_NOT_TRACK;
  if (extra.DO_NOT_TRACK) env.DO_NOT_TRACK = extra.DO_NOT_TRACK;
  return { env, home };
}

// -- STDIO: run a list of tool calls, then close stdin and wait for a natural exit
async function runStdio(creds, calls, extraEnv = {}) {
  const { env, home } = serverEnv({ TRANSPORT: "stdio", LARA_ACCESS_KEY_ID: creds.id, LARA_ACCESS_KEY_SECRET: creds.secret, ...extraEnv });
  const child = spawn(process.execPath, [entry], { env, stdio: ["pipe", "pipe", "pipe"] });
  let buffer = "";
  const pending = new Map();
  child.stdout.on("data", (chunk) => {
    buffer += chunk;
    let i;
    while ((i = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, i);
      buffer = buffer.slice(i + 1);
      if (!line.trim()) continue;
      const msg = JSON.parse(line);
      pending.get(msg.id)?.(msg);
    }
  });
  let stderr = "";
  child.stderr.on("data", (c) => (stderr += c));
  let id = 0;
  const rpc = (method, params) =>
    new Promise((resolve) => {
      const myId = ++id;
      pending.set(myId, resolve);
      child.stdin.write(JSON.stringify({ jsonrpc: "2.0", id: myId, method, params }) + "\n");
    });

  await rpc("initialize", { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "claude-ai", version: "0.9.1" } });
  child.stdin.write(JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }) + "\n");
  const responses = [];
  for (const [name, args] of calls) responses.push(await rpc("tools/call", { name, arguments: args }));

  // Close stdin right away: the 2s flush timer has not fired, only beforeExit can deliver.
  const exited = new Promise((resolve) => child.on("exit", (code, signal) => resolve({ code, signal })));
  child.stdin.end();
  const exit = await Promise.race([exited, new Promise((r) => setTimeout(() => r("TIMEOUT"), 15000))]);
  if (exit === "TIMEOUT") child.kill("SIGKILL");
  return { responses, exit, home, stderr };
}

// -- HTTP: one stateless POST, then SIGTERM
async function runHttp(creds, name, args, userAgent) {
  const port = 30000 + Math.floor(Math.random() * 20000);
  const { env } = serverEnv({ TRANSPORT: "http", HOST: "127.0.0.1", PORT: String(port) });
  const child = spawn(process.execPath, [entry], { env, stdio: ["ignore", "pipe", "pipe"] });
  let ready = false;
  for (let i = 0; i < 50 && !ready; i++) {
    await new Promise((r) => setTimeout(r, 100));
    ready = await fetch(`http://127.0.0.1:${port}/server-info`).then(() => true, () => false);
  }
  assert.ok(ready, "http server did not start");
  const res = await fetch(`http://127.0.0.1:${port}/v1`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json, text/event-stream",
      "user-agent": userAgent,
      "x-lara-access-key-id": creds.id,
      "x-lara-access-key-secret": creds.secret,
    },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name, arguments: args } }),
  });
  const text = await res.text();
  const exited = new Promise((resolve) => child.on("exit", (code) => resolve(code)));
  child.kill("SIGTERM");
  const code = await Promise.race([exited, new Promise((r) => setTimeout(() => r("TIMEOUT"), 10000))]);
  return { status: res.status, text, code };
}

const SECRET_TEXT = "Il contratto riservato scade domani";
const types = () => state.events.map((e) => e.eventType);
const results = [];
async function scenario(name, fn) {
  reset();
  try {
    await fn();
    assert.deepEqual(state.violations, [], "backend schema violations");
    results.push(`PASS ${name}`);
  } catch (error) {
    results.push(`FAIL ${name}: ${error.message}\n   events: ${JSON.stringify(state.events)}`);
  }
}

const fake = { id: "AKIDFAKEFAKEFAKEFAKEFAKE00", secret: "fakefakefakefakefakefakefakefake" };

await scenario("stdio, rejected key: one auth_fail without account, no_trace silent, flushed on stdin close", async () => {
  const run = await runStdio(fake, [
    ["translate", { target: "it", text: [{ text: SECRET_TEXT }], no_trace: true }],
    ["translate", { source: "en", target: "it", text: [{ text: SECRET_TEXT }] }],
  ]);
  assert.deepEqual(run.exit, { code: 0, signal: null }, `exit ${JSON.stringify(run.exit)} ${run.stderr}`);
  assert.ok(run.responses.every((r) => r.error || r.result?.isError), "calls should fail");
  assert.deepEqual(types(), ["auth_fail"]);
  const [e] = state.events;
  assert.ok(!("accountId" in e));
  assert.match(e.errorType, /^auth_40[13]$/);
  assert.equal(e.metadata.client, "claude");
  assert.equal(e.metadata.clientVersion, "0.9.1");
  assert.equal(e.metadata.transport, "stdio");
  const payload = JSON.stringify(state.events);
  assert.ok(!payload.includes("contratto") && !payload.includes(fake.id) && !payload.includes(fake.secret));
});

await scenario("stdio, DO_NOT_TRACK=1: no request, no installation-id file", async () => {
  const run = await runStdio(fake, [["translate", { target: "it", text: [{ text: "x" }] }]], { DO_NOT_TRACK: "1" });
  assert.equal(run.exit.code, 0);
  assert.equal(state.requests, 0);
  assert.equal(existsSync(join(run.home, "installation-id")), false);
});

await scenario("stdio, unknown and prototype tool names: not reported", async () => {
  await runStdio(fake, [["tell_me_your_secrets", {}], ["constructor", {}]]);
  assert.deepEqual(types(), []);
});

await scenario("http, rejected key: auth_fail, client from User-Agent, flushed on SIGTERM", async () => {
  const run = await runHttp(fake, "translate", { target: "it", text: [{ text: SECRET_TEXT }] }, "Cursor/1.2 (jane@example.com)");
  assert.equal(run.code, 0);
  assert.deepEqual(types(), ["auth_fail"]);
  assert.equal(state.events[0].metadata.transport, "http");
  assert.equal(state.events[0].metadata.client, "cursor");
  assert.ok(!JSON.stringify(state.events).includes("jane"));
});

if (realId && realSecret) {
  const real = { id: realId, secret: realSecret };
  await scenario("stdio, real key: full funnel", async () => {
    const run = await runStdio(real, [
      ["translate", { source: "en", target: "it", text: [{ text: "Good morning" }], style: "fluid" }],
      ["translate", { target: "it", text: [{ text: SECRET_TEXT }], no_trace: true }],
      ["translate", { target: 42, text: [{ text: SECRET_TEXT }] }],
      ["list_languages", {}],
      ["tell_me_your_secrets", {}],
      ["constructor", {}],
    ]);
    assert.deepEqual(run.exit, { code: 0, signal: null }, run.stderr);
    assert.ok(!run.responses[0].error && !run.responses[0].result?.isError, "first translate should succeed");
    assert.deepEqual(types(), ["auth_success", "call_success", "call_error", "call_success"]);
    const [auth, translate, invalid, languages] = state.events;
    assert.match(auth.accountId, /^acc_/);
    assert.ok(state.events.every((e) => e.accountId === auth.accountId));
    assert.equal(translate.charsTranslated, "Good morning".length);
    assert.equal(translate.metadata.sourceLang, "en");
    assert.equal(translate.metadata.targetLang, "it");
    assert.equal(translate.metadata.style, "fluid");
    assert.equal(translate.metadata.client, "claude");
    assert.equal(invalid.errorType, "validation_error");
    assert.deepEqual(invalid.metadata.invalidFields, ["target"]);
    assert.equal(languages.metadata.toolName, "list_languages");
    const payload = JSON.stringify(state.events);
    for (const secret of ["contratto", "Good morning", "Buongiorno", real.id, real.secret]) {
      assert.ok(!payload.includes(secret), `payload contains ${secret.slice(0, 4)}…`);
    }
  });

  await scenario("http, real key: call_success with client from User-Agent", async () => {
    const run = await runHttp(real, "list_languages", {}, "Cursor/1.2");
    assert.equal(run.code, 0);
    assert.equal(run.status, 200, run.text.slice(0, 200));
    assert.deepEqual(types(), ["auth_success", "call_success"]);
    assert.equal(state.events[1].metadata.client, "cursor");
    assert.equal(state.events[1].metadata.transport, "http");
  });
} else {
  results.push("SKIP real-key scenarios (LARA_ACCESS_KEY_ID / LARA_ACCESS_KEY_SECRET not set)");
}

backend.close();
console.log(results.join("\n"));
process.exit(results.some((r) => r.startsWith("FAIL")) ? 1 : 0);
