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

### Error Handling

Custom exception classes (`src/exception.ts`):
- `ServerException` - Base exception with error code
- `InvalidInputError` - Invalid request parameters (code: -32600)
- `InvalidCredentialsError` - Authentication failure (code: -32600)
- `MethodNotAllowedError` - HTTP method not allowed (code: -32601)

Error handling in `src/mcp/tools.ts`:
- Zod validation errors return specific field names (not full error details for security)
- Existing `InvalidInputError` instances are preserved and re-thrown
- Other unexpected errors are logged internally and returned as generic "An error occurred while processing your request" message
- Privacy-sensitive translations (with `no_trace=true`) are logged for audit purposes

### Logging

The server uses Pino structured logging (`src/logger.ts`). Log level is controlled by `LOGGING_LEVEL` environment variable.

## Testing

Tests are located in `src/__tests__/` and mirror the source structure:
- `tools/` - Individual tool tests (71 total tests)
- `server/` - REST server tests
- `utils/mocks.ts` - Shared test utilities with Vitest mocks

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
