# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Lara Translate MCP Server is a Model Context Protocol (MCP) server that provides translation capabilities through the Lara Translate API. The server supports both STDIO and HTTP transport modes, with OAuth 2.0 and API key authentication.

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
# Start development environment (includes Redis)
docker-compose up

# Build Docker image
docker build -t lara-mcp .
```

## Architecture

### Server Modes

The server operates in two transport modes determined by the `TRANSPORT` environment variable:

1. **STDIO Mode** (`src/index.ts:56-75`): Direct MCP server using stdio transport, requires `LARA_ACCESS_KEY_ID` and `LARA_ACCESS_KEY_SECRET` environment variables.

2. **HTTP Mode** (`src/index.ts:42-54`): REST API server with multiple endpoints:
   - `/v1` - MCP protocol endpoint using StreamableHTTPServerTransport
   - `/server-info` - Server metadata endpoint
   - `/healthz` - Health check endpoint
   - OAuth endpoints: `/authorize`, `/token`, `/register`, `/.well-known/*`

### Core Components

#### MCP Server (`src/mcp/server.ts`)

The MCP server uses a **singleton caching pattern** with LRU eviction and TTL expiration:

- Creates one `Translator` instance per unique client credential
- Cache key format: `oauth:{token}` or `key:{accessKeyId}`
- Configurable TTL (default: 30 days) and max cache size (default: 1000 entries)
- Periodic cleanup runs every 15 minutes to remove expired entries
- Thread-safe with mutex-protected cache operations

The server factory function `getMcpServer(config)` accepts either:
- `ApiKeyConfig`: `{ type: "apiKey", accessKeyId, accessKeySecret }`
- `OAuthConfig`: `{ type: "oauth", authToken, refreshToken }`

#### Authentication

**API Key Authentication** (`src/rest/rest-service.ts`):
- Headers: `x-lara-access-key-id` and `x-lara-access-key-secret`

**OAuth 2.0 Authentication** (`src/oauth/`):
- Standards-compliant OAuth 2.0 authorization server with PKCE support
- Client registration with dynamic registration support
- Authorization code flow: `/authorize` → `/token`
- Token storage in Redis with TTL-based expiration
- Metadata endpoints for discovery: `/.well-known/oauth-authorization-server` and `/.well-known/oauth-protected-resource`
- Bearer token format: `Authorization: Bearer <token>`
- On 401 errors, server instances are removed from cache to force re-authentication

#### Tools (`src/mcp/tools/`)

All MCP tools are organized in individual files under `src/mcp/tools/`:

**Translation Tools:**
- `translate.ts` - Main translation with context, instructions, memory support, and glossaries
  - Advanced options: `glossaries` (array of glossary IDs), `no_trace` (privacy flag), `priority` (normal/background), `timeout_in_millis`

**Glossary Management Tools:**
- `list_glossaries.ts` - List all glossaries
- `get_glossary.ts` - Get glossary by ID (returns null if not found)

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

Each tool exports a handler function and a Zod validation schema. Tool registration happens in `src/mcp/tools.ts` which maintains two handler maps: `handlers` (tools with arguments) and `listers` (tools without arguments).

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
- `#rest/routes/server-info` → `src/rest/routes/server-info.js`

### Environment Variables

Core configuration (`src/env.ts`):
- `TRANSPORT` - Server mode: `stdio` or `http` (default: `stdio`)
- `HOST` / `PORT` - HTTP server binding (default: `0.0.0.0:3000`)
- `PUBLIC_HOST` - Public-facing URL for OAuth callbacks (required for OAuth)
- `LARA_ACCESS_KEY_ID` / `LARA_ACCESS_KEY_SECRET` - API credentials (required for STDIO)
- `REDIS_HOST` / `REDIS_PORT` / `REDIS_PASSWORD` - Redis connection (required for HTTP mode)
- `LOGGING_LEVEL` - Log level: `debug`, `info`, `warn`, `error` (default: `info`)
- `CACHE_TTL_MS` - Server cache TTL in milliseconds (default: 30 days)
- `MAX_CACHE_SIZE` - Maximum cached server instances (default: 1000)
- `CACHE_CLEANUP_INTERVAL_MS` - Cleanup interval in milliseconds (default: 15 minutes)

### Error Handling

Custom exception classes (`src/exception.ts`):
- `ServerException` - Base exception with error code
- `InvalidInputError` - Invalid request parameters (code: -32602)
- `InvalidCredentialsError` - Authentication failure (code: -32600)
- `MethodNotAllowedError` - HTTP method not allowed (code: -32601)

All tool errors are logged with detailed context including status codes, error types, and stack traces before being propagated.

### Logging

The server uses Pino structured logging (`src/logger.ts`). Log level is controlled by `LOGGING_LEVEL` environment variable.

## Testing

Tests are located in `src/__tests__/` and mirror the source structure:
- `tools/` - Individual tool tests
- `mcp/` - MCP server tests
- `oauth/` - OAuth flow tests (routes, stores, authentication service)
- `rest/` - REST server tests
- `utils/mocks.ts` - Shared test utilities

Tests use Vitest with coverage reporting (v8 provider).

## Important Notes

- The server maintains a stateful cache of MCP server instances per client. Cache invalidation happens on token expiration, authentication errors, or periodic cleanup.
- When adding new tools, update both the handler in `src/mcp/tools/{tool}.ts` and register it in `src/mcp/tools.ts`.
- OAuth flow requires Redis to be running and `PUBLIC_HOST` to be configured with a publicly accessible URL.
- All file imports must use the `.js` extension even though source files are `.ts` (ES module resolution requirement).
