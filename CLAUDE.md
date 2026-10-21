# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Lara Translate MCP Server is a Model Context Protocol (MCP) server that provides translation capabilities through the Lara Translate API. The server supports both STDIO and HTTP transport modes.

It is built on the MCP TypeScript SDK v2 (`@modelcontextprotocol/server`, `@modelcontextprotocol/node`) and serves both protocol eras on every transport:
- **2026-07-28** (stateless: no `initialize`, per-request `_meta` envelope, `server/discover`, `Mcp-Method`/`Mcp-Name` headers, cacheable list results)
- **2025-era** (2024-11-05 … 2025-11-25, `initialize` handshake) for clients that have not upgraded

## Development Commands

### Setup
```bash
# Install dependencies
pnpm install

# Build the project
pnpm run build
```

### Development
```bash
# Run in development mode with hot reload
pnpm run dev

# Start the built server
pnpm run start
```

### Testing
```bash
# Run all tests once
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage report
pnpm test:coverage
```

### Docker Development
```bash
# Build Docker image
docker build -t lara-mcp .
```

## Architecture

### Server Modes

The server operates in two transport modes determined by the `TRANSPORT` environment variable:

1. **STDIO Mode** (`src/index.ts`): `serveStdio(factory)` negotiates the era on the opening exchange and pins one server instance per connection. Requires `LARA_ACCESS_KEY_ID` and `LARA_ACCESS_KEY_SECRET` environment variables.

2. **HTTP Mode** (`src/rest/routes/mcp.ts`): Express server with the MCP endpoint at `MCP_MOUNT_PATH` (`/v1`). The route validates the `x-lara-access-key-id` / `x-lara-access-key-secret` headers (missing → 400 before the handler runs) and passes them to the SDK as `req.auth`; the module-level `createMcpHandler(factory)`, wrapped with `toNodeHandler`, builds a fresh MCP server per request from that pass-through `authInfo`. GET/DELETE answer 405. The handler is built on the first mounted router (not at module load, so stdio mode does not pay for it) and torn down by `closeMcpHandler()`.

### Core Components

#### MCP Server (`src/mcp/server.ts`)

The server factory function `getMcpServer(accessKeyId, accessKeySecret)` creates an MCP server instance with:
- `accessKeyId`: The Lara Translate API access key ID
- `accessKeySecret`: The Lara Translate API access key secret

The server initializes a `Translator` instance from the `@translated/lara` SDK and configures MCP request handlers (low-level `Server.setRequestHandler('tools/list', …)`) for tools and resources.

`cacheHints` set the 2026-07-28 `ttlMs`/`cacheScope` fields: `tools/list`, `resources/list`, `resources/templates/list` and `server/discover` get a 1h TTL with `cacheScope: private` (static but auth-gated, so never cacheable by a shared intermediary); `resources/read` is `private` with TTL 0 (live account data).

#### Tools (`src/mcp/tools/`)

All MCP tools are organized in individual files under `src/mcp/tools/`:

**Translation Tools:**
- `translate.ts` - Main translation with context, instructions, memory support, and glossaries
  - Advanced options: `glossaries` (array of glossary IDs, max 10), `no_trace` (privacy flag), `priority` (normal/background), `timeout_in_millis` (max 300000ms)
  - Validation includes format checks for glossary IDs (`gls_*` pattern) and timeout limits
  - `text`: 1–128 blocks; a bare string block is read as `{ text }` (input only)
  - `instructions`: the ~20-word limit is advice in the description, not enforced (Lara accepts longer)

**Glossary Management Tools:**
- `list_glossaries.ts` - List all glossaries
- `get_glossary.ts` - Get glossary by ID (returns null if not found)
  - Validates glossary ID format with regex `/^gls_[a-zA-Z0-9_-]+$/`
- `create_glossary.ts` - Create a new glossary with a name (max 250 chars)
- `update_glossary.ts` - Update glossary name by ID
- `delete_glossary.ts` - Delete a glossary by ID
- `import_glossary_csv.ts` - Import CSV into a glossary
  - Supports `csv/table-uni` (default) and `csv/table-multi` content types
  - Optional gzip compression flag
  - 5MB size limit and temp-file handling come from `withTempFile` (`file-utils.ts`)
- `check_glossary_import_status.ts` - Check glossary CSV import job status
  - Takes import job ID (not glossary ID, so no gls_ regex validation)
- `export_glossary.ts` - Export glossary as CSV
  - Required `content_type` enum (`csv/table-uni` or `csv/table-multi`)
  - Optional `source` language (required for `csv/table-uni` per API docs)
- `get_glossary_counts.ts` - Get term and language counts for a glossary

**Memory Management Tools:**
- `list_memories.ts` - List all translation memories
- `create_memory.ts` - Create new memory (supports MyMemory import via `external_id`)
- `update_memory.tool.ts` - Update memory name
- `delete_memory.ts` - Delete memory
- `add_translation.ts` - Add translation unit to memory
- `delete_translation.ts` - Remove translation unit from memory
- `import_tmx.ts` - Import TMX file (supports gzip compression)
- `check_import_status.ts` - Check TMX import job status

**Language Support:**
- `list_languages.ts` - List supported languages

Shared building blocks live next to the tools: `_schemas.ts` (zod schemas, incl. `glossaryIdSchema` and `glossaryFileFormatSchema`), `validators.ts` (`validateSentenceContext`) and `file-utils.ts` (`withTempFile`, used by both importers: 5MB cap, private 0700 temp dir per call, always cleaned up).

Every tool advertises `title` plus all four hints (`readOnlyHint`, `destructiveHint`, `idempotentHint`, `openWorldHint`) as explicit booleans; `destructiveHint` is true for tools that overwrite or delete account data (updates, adds and imports included). Tool JSON Schemas are generated by `toJsonSchema`, which strips keyword-less `additionalProperties: {}` produced by `.loose()` objects (some MCP clients reject it).

Each tool exports a handler function and a Zod validation schema. Tool registration happens in `src/mcp/tools.ts` which maintains two handler maps:
- `handlers` - Tools with arguments (e.g., translate, create_memory)
- `listers` - Tools without arguments (e.g., list_memories, list_languages)

#### Resources (`src/mcp/resources.ts`)

The MCP server exposes translation memories as resources:
- Resource URI format: `memory://{memoryId}`
- Resource template: `memory://{memoryId}` for listing memories
- Unknown resources, missing memories and a blank memory name throw `ResourceNotFoundError` (-32602)

### Path Aliases

The project uses path aliases (configured in `tsconfig.json` and `package.json` imports):
- `#env` → `src/env.js`
- `#exception` → `src/exception.js`
- `#logger` → `src/logger.js`
- `#rest/server` → `src/rest/server.js`
- `#mcp/server` → `src/mcp/server.js`

### Environment Variables

Core configuration (`src/env.ts`):
- `TRANSPORT` - Server mode: `stdio` or `http` (default: `stdio`)
- `HOST` / `PORT` - HTTP server binding (default: `0.0.0.0:3000`)
- `LARA_ACCESS_KEY_ID` / `LARA_ACCESS_KEY_SECRET` - API credentials (required for STDIO mode)
- `LOGGING_LEVEL` - Log level: `debug`, `info`, `warn`, `error` (default: `info`)
- `METRICS_URL` / `METRICS_API_KEY` - Override the compiled-in metrics backend
- `LARA_HOME` - Where the metrics installation id lives (default: `~/.lara`)
- `DO_NOT_TRACK` - `1`/`true`/`yes` disables usage metrics entirely

### Error Handling

Custom exception classes (`src/exception.ts`):
- `ServerException` - Base exception with error code
- `InvalidInputError` - Invalid request parameters (code: -32600)
- `InvalidCredentialsError` - Authentication failure (code: -32600)

Error handling in `src/mcp/tools.ts` (`CallTool`):
- Unknown tool names throw a `ProtocolError` with code -32602 (JSON-RPC error)
- Every tool execution failure is returned in-band as `{ isError: true, content: [{ type: "text", text }] }` so the model can read it and self-correct:
  - Zod validation errors list field names and reasons (not full error details for security)
  - A `LaraApiError` 403 that is not an `AuthenticationError` gets a fixed `FORBIDDEN` text (key valid, operation not allowed for the account)
  - `InvalidInputError`, other `LaraApiError` messages and the Lara timeout message are surfaced as-is
  - Other unexpected errors are logged internally and returned as generic "An error occurred while processing your request" message
- Privacy-sensitive translations (with `no_trace=true`) are logged for audit purposes

### Usage Metrics (`src/metrics.ts`)

Funnel telemetry for the `mcp` channel of the Lara integrations monitoring
backend (`integration-metrics.laratranslate.com`). On by default, both
transports report; the module is self-contained and its failures never reach a
tool call.

- **Opt-out**: per call, `no_trace: true` on `translate` means that call emits
  **no event of any kind** (`isNoTrace`, read from the raw arguments so a
  malformed flag still counts). Globally, `DO_NOT_TRACK` set to `1`/`true`/`yes`.
- **Configuration**: `DEFAULT_METRICS_URL` / `DEFAULT_METRICS_API_KEY` are
  compiled in (the key is public by design: it only buys ingest tokens for
  channel `mcp`) and overridden by `METRICS_URL` / `METRICS_API_KEY`. Either one
  empty, a URL that is not http(s), or `DO_NOT_TRACK` and `metricsEnabled()` is false —
  nothing is measured, queued or written to disk. `vitest.config.ts` sets
  `DO_NOT_TRACK=1` so no test run reaches production.
- **Delivery**: `POST /auth/issue-token` (API key, `{ installationId }`) buys a
  token; events go to `POST /metrics/ingest-events` with it. Batched every 2s
  behind an `unref`'d timer, one retry on 401 only, requeued on 429/5xx and
  retried on its own 30s timer, dropped on any other rejection, queue capped at
  10 000. One drain at a time;
  flushes asked for meanwhile fold into one rerun. `shutdown()` ends with
  `flushBeforeExit()` (capped at 2s), and `flushNow()` runs once on `beforeExit` — a STDIO client closing stdin ends
  the process without a signal. An event whose metadata is over 4096 bytes is
  dropped alone, since the backend would reject the whole batch.
- **Installation id**: a UUID at `${LARA_HOME || ~/.lara}/installation-id`,
  resolved on the first token request. `writeFileSync(..., { flag: "wx" })`
  settles the race between two processes starting together; an empty file is
  one still being written, so it is never overwritten. An unwritable home
  falls back to a per-process id. There is **no `install` event**: on `mcp` the
  backend's funnel starts at `auth_success`.
- **Events**: `auth_success` (the first call from an account whose token the SDK
  holds, failed or not, unless it failed on the credentials; deduplicated per
  account per process — the HTTP transport is stateless and builds a Translator
  per request), `call_success`,
  `call_error`, and `auth_fail` beside a `call_error` Lara answered with
  401 or an `AuthenticationError` (`auth_401`/`auth_403`). Any other 403 is
  `forbidden_403`: the key was accepted, the operation was not, so it counts
  toward `auth_success` and emits no `auth_fail`. Unknown tool names are not reported.
- **`accountId`**: the `id` claim of the Lara token the SDK holds, read through
  `getLaraClient()` in `src/lara-client.ts` (the one cast through the SDK's
  `protected client`). The SDK authenticates lazily, so it is only knowable
  after a call has succeeded. Without it the only event is `auth_fail` (no
  `accountId`, which the backend allows) for a key Lara rejected; any other
  early error is lost — a made-up id would be a fake account in every dashboard.
- **`metadata`**: never content, credentials, ids or raw client strings.
  - Every event: `transport`, `os`, `nodeVersion`, `client` (closed bucket shared with mcp-private: `claude`,
    `claude-code`, `chatgpt`, `cursor`, `codex`, `vscode`, `other`, from the
    clientInfo — `initialize` or the 2026-07-28 per-request envelope — or else
    the User-Agent), `clientVersion` (only if it looks like a version).
  - Call events (`call_*`, and `auth_fail`, which is tied to a call): `feature`
    (`text` / `language_detection` / `resource_management` — shared vocabulary,
    stable forever) and `toolName`. `auth_success` is about the credentials, not
    a call, so it carries neither, as on mcp-private.
  - `translate`: `sourceLang`/`targetLang` only if they match a language-tag
    pattern; option values/counts/flags (`style`, `priority`, `contentType`,
    `reasoning`, `blockCount`, `glossaryCount`, `memoryCount`,
    `instructionCount`, `hasContext`) only from a successful schema parse.
  - Errors: `httpStatus`, `laraErrorType` (identifier-shaped only),
    `invalidFields` (Zod paths, indices folded to `*`, max 10), `invalidIssues`
    (`<path>:<zod issue code>`, e.g. `text:too_big`, same folding and cap; never
    the message).
- **Where it is emitted**: inside `CallTool`'s own try/catch, not from a wrapper
  around it — `CallTool` turns every failure into an `isError` result, so only
  there is the original error still available to classify.

### Shutdown

`src/shutdown.ts` owns the signal path: it closes the MCP handler, stops the server, delivers the queued metrics, and returns the process exit code (1 when teardown throws, so a failed shutdown is not reported as success). It lives outside `index.ts` because importing `index.ts` starts a server, which would make the path untestable.

### Logging

The server uses Pino structured logging (`src/logger.ts`). Log level is controlled by `LOGGING_LEVEL` environment variable.

## Testing

Tests are located in `src/__tests__/` and mirror the source structure:
- `tools/` - Individual tool tests, plus `dispatch.test.ts`, which calls every advertised tool by its MCP name through `CallTool` (catches a tool defined but not registered, or registered but not advertised)
- `server/` - REST server tests, resources, and protocol tests:
  - `mcp.metrics.test.ts` - the metrics wiring through `getMcpServer` and `CallTool`
  - `era.http.test.ts` - SDK client over a real socket in legacy, pinned 2026-07-28 and auto-negotiated modes
  - `wire2026.test.ts` - raw wire contract (cache fields, `resultType`, `serverInfo`, header mismatch -32020, unsupported version -32022, CORS)
  - `stdio.test.ts` - spawns `src/index.ts` with tsx and connects in each era
  - `shutdown.test.ts` - MCP handler lifecycle (lazy build, closed once), `shutdown()` exit codes and its final metrics flush
- `metrics.test.ts` - The metrics client in isolation
- `utils/mocks.ts` - Shared test utilities with Vitest mocks (importing it registers a module-wide `vi.mock` of `@translated/lara`, so server-level tests that need their own Lara mock do not import it)

The two metrics test files deliberately do **not** import `utils/mocks.ts`: its
hoisted `vi.mock("@translated/lara")` would replace `LaraApiError`/`TimeoutError`,
which `errorTypeFor` classifies with `instanceof`. They reset modules and
re-import instead, because the queue, the token and the installation id are
module state.

Tests use Vitest with coverage reporting (v8 provider).

## Security Features

- **Input validation**: All glossary IDs validated with regex, timeout capped at 300000ms, max 10 glossaries per request
- **Error sanitization**: Zod errors filtered to show only field names, SDK errors hidden behind generic messages
- **Audit logging**: Privacy-sensitive requests (no_trace=true) logged for compliance
- **Credential protection**: Access key ID never logged in debug mode

## Important Notes

- When adding new tools, update both the handler in `src/mcp/tools/{tool}.ts` and register it in `src/mcp/tools.ts`.
- All file imports must use the `.js` extension even though source files are `.ts` (ES module resolution requirement).
- The `translate` tool builds options object dynamically - only includes non-empty arrays and defined values to avoid passing `undefined` to SDK.
- Semicolons are consistently used throughout the codebase.
