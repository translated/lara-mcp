# OAuth 2.0 Authentication (Self-Hosted)

> This document is for self-hosted deployments of the Lara MCP Server. If you're using the hosted endpoint (`https://mcp-v2.laratranslate.com/v1`), see the [OAuth section in the README](../README.md#oauth-20-default) for simpler setup instructions.

This document describes the OAuth 2.0 authentication flow implemented in the Lara MCP Server. The server implements a standards-compliant OAuth 2.0 authorization server that enables secure authentication for MCP clients.

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [OAuth Flow Diagram](#oauth-flow-diagram)
- [OAuth Flow](#oauth-flow)
- [Endpoints](#endpoints)
- [System Architecture Diagram](#system-architecture-diagram)

## Overview

The OAuth implementation provides a secure way for MCP clients to authenticate and obtain access tokens for making requests to the MCP server. The flow follows the OAuth 2.0 Authorization Code grant type with PKCE (Proof Key for Code Exchange) support.

### Key Features

- **Authorization Code Flow**: Standard OAuth 2.0 authorization code grant
- **PKCE Support**: Enhanced security for public clients using PKCE (RFC 7636)
- **Dynamic Client Registration**: Clients can register dynamically (RFC 7591)
- **Resource Parameter**: Support for resource/audience specification (RFC 8707)
- **Standards Compliant**: Implements RFC 8414, RFC 9728, RFC 7591, RFC 7636, and RFC 8707

## Prerequisites

- A publicly accessible MCP server instance (required for OAuth callbacks)
- Redis server (for storing authorization codes and tokens)
- The following environment variables:

```bash
PUBLIC_HOST=https://your-mcp-server.com  # Your server's public URL
REDIS_HOST=localhost                      # Redis host (default: localhost)
REDIS_PORT=6379                           # Redis port (default: 6379)
REDIS_PASSWORD=your-redis-password        # Redis password
```

## OAuth Flow Diagram

```text
┌─────────────┐                                                     ┌──────────────┐
│   Client    │                                                     │ OAuth Server │
│  (MCP App)  │                                                     │              │
└──────┬──────┘                                                     └───────┬──────┘
       │                                                                    │
       │ 1. POST /register                                                  │
       │────────────────────────────────────────────────────────────────────▶│
       │                                                                    │
       │ 2. Response: { client_id, ... }                                    │
       │◀────────────────────────────────────────────────────────────────────│
       │                                                                    │
       │ 3. GET /authorize?client_id=...&redirect_uri=...&code_challenge=...│
       │────────────────────────────────────────────────────────────────────▶│
       │                                                                    │
       │                                                                    │ 4. Generate auth code
       │                                                                    │    Store code with PKCE data
       │                                                                    │
       │                                                                    │ 5. Redirect to Lara Login
       │                                                                    │──────────────────┐
       │                                                                    │                  │
       │                                                                    │                  ▼
       │                                                                    │         ┌───────────────────┐
       │                                                                    │         │ Lara Translate    │
       │                                                                    │         │ Login Interface   │
       │                                                                    │         └────────┬──────────┘
       │                                                                    │                  │
       │                                                                    │                  │ 6. User authenticates
       │                                                                    │                  │    Obtains tokens
       │                                                                    │                  │
       │                                                                    │                  │ 7. GET /callback?code=...&token=...&refreshToken=...
       │                                                                    │◀─────────────────┘
       │                                                                    │
       │                                                                    │ 8. Store tokens with auth code
       │                                                                    │
       │ 9. Redirect: redirect_uri?code=AUTH_CODE&state=...                 │
       │◀────────────────────────────────────────────────────────────────────│
       │                                                                    │
       │ 10. POST /token                                                    │
       │     grant_type=authorization_code&code=...&code_verifier=...       │
       │────────────────────────────────────────────────────────────────────▶│
       │                                                                    │
       │                                                                    │ 11. Validate code & PKCE
       │                                                                    │     Exchange code for tokens
       │                                                                    │
       │ 12. Response: { access_token, refresh_token, ... }                 │
       │◀────────────────────────────────────────────────────────────────────│
       │                                                                    │
       │ 13. POST /v1                                                       │
       │     Authorization: Bearer ACCESS_TOKEN                             │
       │────────────────────────────────────────────────────────────────────▶│
       │                                                                    │
       │ 14. Response: MCP JSON-RPC response                                │
       │◀────────────────────────────────────────────────────────────────────│
       │                                                                    │
```

## OAuth Flow

### 1. Client Registration

Clients register dynamically to obtain a `client_id`:

```http
POST /register
Content-Type: application/json

{
  "client_name": "My MCP Client",
  "redirect_uris": ["https://my-app.com/callback"]
}
```

**Response:**

```json
{
  "client_id": "abc123...",
  "client_id_issued_at": 1234567890,
  "client_secret_expires_at": 0,
  "token_endpoint_auth_method": "none",
  "grant_types": ["authorization_code"],
  "response_types": ["code"],
  "redirect_uris": ["https://my-app.com/callback"]
}
```

### 2. Authorization Request

The client initiates the authorization flow by redirecting the user to the authorization endpoint:

```http
GET /authorize?client_id=abc123&redirect_uri=https://my-app.com/callback&response_type=code&state=xyz&code_challenge=...&code_challenge_method=S256
```

**Parameters:**

- `client_id` (required): The client identifier
- `redirect_uri` (required): Where to redirect after authorization
- `response_type` (required): Must be `code`
- `state` (optional): CSRF protection token
- `code_challenge` (optional): PKCE code challenge
- `code_challenge_method` (optional): PKCE method (`S256` or `plain`)
- `resource` (optional): Resource/audience identifier (RFC 8707)

**What Happens:**

1. Server validates all required parameters
2. Server generates a secure authorization code using `crypto.randomBytes(32).toString("base64url")`
3. Server stores the authorization code with client ID, redirect URI, state, PKCE data, and a 10-minute expiration
4. Server constructs a callback URL: `${PUBLIC_HOST}/callback?code=${authorizationCode}`
5. Server retrieves the Lara Translate login URL via `Translator.getLoginUrl()`
6. Server redirects the user to: `${loginUrl}?redirect-to=${encodedCallbackUrl}&cid=mcp`
7. User authenticates with Lara Translate

> **Note**: The `/authorize` endpoint performs a custom redirection to the Lara Translate login interface. This allows the server to obtain actual authentication tokens from Lara Translate before completing the OAuth flow.

### 3. Callback from Login Interface

After successful login, the Lara login interface redirects back to the server's callback endpoint:

```http
GET /callback?code=AUTHORIZATION_CODE&token=ACCESS_TOKEN&refreshToken=REFRESH_TOKEN
```

**Parameters:**

- `code` (required): The authorization code generated in step 2
- `token` (required): Access token obtained from Lara Translate
- `refreshToken` (optional): Refresh token obtained from Lara Translate

**What Happens:**

1. Server validates the authorization code exists and hasn't expired
2. Server stores the access token and refresh token with the authorization code
3. Server redirects back to the client's `redirect_uri` with the authorization code and state

### 4. Token Exchange

The client exchanges the authorization code for an access token:

```http
POST /token
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code&code=AUTHORIZATION_CODE&redirect_uri=https://my-app.com/callback&client_id=abc123&code_verifier=VERIFIER
```

**Parameters:**

- `grant_type` (required): Must be `authorization_code`
- `code` (required): The authorization code from step 3
- `redirect_uri` (optional): Must match the original redirect URI
- `client_id` (optional): Must match the original client ID
- `code_verifier` (required if PKCE was used): The PKCE code verifier
- `resource` (optional): Must match the resource from authorization request

**Response:**

```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "scope": "",
  "expires_in": 3600,
  "refresh_token": "def456..."
}
```

> Access tokens expire after 1 hour. Clients supporting refresh tokens can use them to obtain new access tokens without re-authentication.

### 5. Using the Access Token

Include the access token in the `Authorization` header for MCP requests:

```http
POST /v1
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": { ... }
}
```

## Endpoints

### Metadata Endpoints

#### `GET /.well-known/oauth-authorization-server`

Returns authorization server metadata per RFC 8414.

```json
{
  "issuer": "https://mcp.example.com",
  "authorization_endpoint": "https://mcp.example.com/authorize",
  "token_endpoint": "https://mcp.example.com/token",
  "registration_endpoint": "https://mcp.example.com/register",
  "token_endpoint_auth_methods_supported": ["none"],
  "scopes_supported": ["scrape"],
  "response_types_supported": ["code"],
  "grant_types_supported": ["authorization_code"],
  "code_challenge_methods_supported": ["S256"]
}
```

#### `GET /.well-known/oauth-protected-resource`

Returns protected resource metadata per RFC 9728.

```json
{
  "resource": "https://mcp.example.com",
  "authorization_servers": ["https://mcp.example.com"]
}
```

### OAuth Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/register` | POST | Dynamic client registration (RFC 7591) |
| `/authorize` | GET | Start the authorization flow |
| `/callback` | GET | Receive tokens from Lara login interface |
| `/token` | POST | Exchange authorization code for access token |

## System Architecture Diagram

```text
┌──────────────┐                     ┌──────────────┐           ┌──────────────┐
│  MCP Client  │◀───────────────────▶│  MCP Server  │◀─────────▶│     Redis    │
│              │   OAuth 2.0 Flow    │  (OAuth)     │           │              │
└──────────────┘                     └──────┬───────┘           └──────────────┘
                                            │
                                            │
                                            ▼
                                    ┌──────────────┐
                                    │  Lara login  │
                                    │  Interface   │
                                    └──────────────┘
```

**Key Interactions:**

- **MCP Client <-> MCP Server**: Standard OAuth 2.0 flow (authorization, token exchange, API requests)
- **MCP Server <-> Redis**: Storage and retrieval of authorization codes and tokens
- **MCP Server <-> Lara Login**: Custom redirection for user authentication and token acquisition

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PUBLIC_HOST` | (required) | Public URL for external access (e.g., `https://mcp.example.com`) |
| `REDIS_HOST` | `localhost` | Redis server address |
| `REDIS_PORT` | `6379` | Redis server port |
| `REDIS_PASSWORD` | - | Redis authentication password |
| `REDIS_KEY_PREFIX` | `lara-mcp:` | Key prefix for Redis storage |

## Integration with MCP Server

The OAuth tokens are integrated into the MCP server authentication:

1. **Token Extraction**: MCP routes extract Bearer tokens from the `Authorization` header
2. **Token Validation**: Tokens are validated on each request
3. **Server Creation**: Valid tokens are used to create authenticated MCP server instances
4. **Fallback**: If no Bearer token is present, the server falls back to header-based authentication (`x-lara-access-key-id` and `x-lara-access-key-secret`)
