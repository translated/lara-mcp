# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Lara Translate MCP Server is a Model Context Protocol (MCP) server that provides translation capabilities through the Lara Translate API. The server supports both STDIO and HTTP transport modes.

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

1. **STDIO Mode** (`src/index.ts:56-75`): Direct MCP server using stdio transport, requires `LARA_ACCESS_KEY_ID` and `LARA_ACCESS_KEY_SECRET` environment variables.

2. **HTTP Mode** (`src/index.ts:42-54`): REST API server with MCP protocol endpoint at `/v1`

### Core Components

#### MCP Server (`src/mcp/server.ts`)

The server factory function `getMcpServer(accessKeyId, accessKeySecret)` creates an MCP server instance with:
- `accessKeyId`: The Lara Translate API access key ID
- `accessKeySecret`: The Lara Translate API access key secret

The server initializes a `Translator` instance from the `@translated/lara` SDK and configures MCP request handlers for tools and resources.

#### Tools (`src/mcp/tools/`)

All MCP tools are organized in individual files under `src/mcp/tools/`:

**Translation Tools:**
- `translate.ts` - Main translation with context, instructions, memory support, and glossaries
  - Advanced options: `glossaries` (array of glossary IDs, max 10), `no_trace` (privacy flag), `priority` (normal/background), `timeout_in_millis` (max 300000ms)
  - Validation includes format checks for glossary IDs (`gls_*` pattern) and timeout limits

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
  - 5MB size limit on CSV content
  - Uses temp-file pattern (write to temp, call SDK, cleanup in finally)
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

Each tool exports a handler function and a Zod validation schema. Tool registration happens in `src/mcp/tools.ts` which maintains two handler maps:
- `handlers` - Tools with arguments (e.g., translate, create_memory)
- `listers` - Tools without arguments (e.g., list_memories, list_languages)

#### Resources (`src/mcp/resources.ts`)

The MCP server exposes translation memories as resources:
- Resource URI format: `memory://{memoryId}`
- Resource template: `memory://{memoryId}` for listing memories

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

Error handling in `src/mcp/tools.ts`:
- Zod validation errors return specific field names (not full error details for security)
- Existing `InvalidInputError` instances are preserved and re-thrown
- Other unexpected errors are logged internally and returned as generic "An error occurred while processing your request" message
- Privacy-sensitive translations (with `no_trace=true`) are logged for audit purposes

### Usage Metrics (`src/metrics.ts`)

Funnel telemetry for the `mcp` channel of the Lara integrations monitoring
backend. Both transports report; the module is self-contained and its failures
never reach a tool call.

- **Configuration**: `DEFAULT_METRICS_URL` / `DEFAULT_METRICS_API_KEY` are
  compiled in and overridden by `METRICS_URL` / `METRICS_API_KEY`. Either one
  empty, an unparseable URL, or `DO_NOT_TRACK` set to `1`/`true`/`yes` and
  `metricsEnabled()` is false — nothing is measured, queued or written to disk.
- **Delivery**: `POST /auth/issue-token` (API key, `{ installationId }`) buys a
  token; events go to `POST /metrics/ingest-events` with it. Batched every 2s
  behind an `unref`'d timer, one retry on 401 only, requeued on 429/5xx, dropped
  on any other rejection, queue capped at 10 000. `flushNow()` is awaited once,
  on shutdown, capped at 2s.
- **Installation id**: a UUID at `${LARA_HOME ?? ~/.lara}/installation-id`,
  resolved synchronously at module load. `writeFileSync(..., { flag: "wx" })`
  settles the race between two processes starting together. An unwritable home
  falls back to a per-process id. A freshly created file is what triggers the
  one `install` event.
- **Events**: `install` (no `accountId`), `auth_success` (deduplicated per
  account per process — the HTTP transport is stateless and builds a Translator
  per request), `call_success`, `call_error`, and `auth_fail` beside a
  `call_error` Lara answered with 401/403.
- **`accountId`**: the `id` claim of the Lara token the SDK holds, read through
  `getLaraClient()` in `src/lara-client.ts` (the one cast through the SDK's
  `protected client`). The SDK authenticates lazily, so it is only knowable
  after a call has succeeded. No token means no account and **no event** — a
  made-up id would be a fake account in every dashboard.
- **`metadata`**: `feature` (`text` / `language_detection` /
  `resource_management` — a shared vocabulary, values are stable forever),
  `toolName`, `transport`, and `sourceLang`/`targetLang` on `translate`. Never
  the translated text, never a credential.
- **Where it is emitted**: inside `CallTool`'s own try/catch, not from a wrapper
  around it — `CallTool` rewrites `LaraApiError` into `InvalidInputError` before
  it escapes, so only there is the original error still available to classify.

### Logging

The server uses Pino structured logging (`src/logger.ts`). Log level is controlled by `LOGGING_LEVEL` environment variable.

## Testing

Tests are located in `src/__tests__/` and mirror the source structure:
- `tools/` - Individual tool tests
- `server/` - REST server tests, plus `mcp.metrics.test.ts` for the metrics wiring
- `metrics.test.ts` - The metrics client in isolation
- `utils/mocks.ts` - Shared test utilities with Vitest mocks

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
