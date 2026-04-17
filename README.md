# Lara Translate MCP Server

A Model Context Protocol (MCP) server for [Lara Translate](https://laratranslate.com/translate), enabling professional translation capabilities with support for language detection, context-aware translations, translation memories, and glossaries.

Lara leverages Translation Language Models (T-LMs) trained on billions of professionally translated segments, delivering domain-specific translations that capture cultural nuances and industry terminology that general-purpose LLMs often miss.

[![License](https://img.shields.io/github/license/translated/lara-mcp.svg)](https://github.com/translated/lara-mcp/blob/main/LICENSE)
[![Docker Pulls](https://img.shields.io/docker/pulls/translatednet/lara-mcp.svg)](https://hub.docker.com/r/translatednet/lara-mcp)
[![npm downloads](https://img.shields.io/npm/dm/@translated/lara-mcp.svg)](https://www.npmjs.com/package/@translated/lara-mcp)

## Quick Start

Pick your client below — no API keys needed, just log in through your browser.

### Claude Desktop

1. Go to **Settings** > **Connectors**
2. Click **Add Custom Connector**
3. Enter the name: `Lara`
4. Enter the URL: `https://mcp-v2.laratranslate.com/v1`
5. Click **Add**, then click **Connect**
6. Log in with your Lara Translate credentials in the browser

Done — Lara Translate is now available in your conversations.

### Cursor

Open your config file (`~/.cursor/mcp.json` on macOS/Linux, `%APPDATA%\Cursor\mcp.json` on Windows) and paste:

```json
{
  "mcpServers": {
    "lara-translate": {
      "url": "https://mcp-v2.laratranslate.com/v1"
    }
  }
}
```

Save and restart Cursor. The first time you use a Lara tool, your browser will open to authenticate.

### Claude Code

Once Lara Translate is listed in the official Claude Code plugin marketplace, install it from inside Claude Code:

```
/plugin
```

Search for **Lara Translate** and install. The first time you use a Lara tool, your browser will open to authenticate.

In the meantime, or for manual installation, see the [Client Setup Guide](docs/client-setup.md#claude-code).

### Other Clients

For step-by-step OAuth setup on **VS Code (GitHub Copilot)**, **Windsurf**, **Cline**, **Continue**, and more, see the **[Client Setup Guide](docs/client-setup.md)**.

If your client isn't listed, the general approach is to add the server URL (`https://mcp-v2.laratranslate.com/v1`) to your MCP config — the client will handle OAuth authentication automatically.

> For a complete list of MCP-compatible clients, visit the [official MCP clients page](https://modelcontextprotocol.io/clients).

### Verify It Works

After setup, test with a simple prompt:

```
Translate with Lara "Hello world" to Spanish
```

Your client should invoke Lara Translate and return the translation.

---

## Available Tools

### Translation

| Tool | Description |
|------|-------------|
| `translate` | Translate text between languages with support for context, instructions, translation memories, glossaries, and multiple styles (faithful/fluid/creative) |

### Language Detection

| Tool | Description |
|------|-------------|
| `detect_language` | Detect the language of a given text or array of texts |
| `list_languages` | List all supported language codes |

### Translation Memories

| Tool | Description |
|------|-------------|
| `list_memories` | List all translation memories in your account |
| `create_memory` | Create a new translation memory |
| `update_memory` | Update a translation memory's name |
| `delete_memory` | Delete a translation memory |
| `add_translation` | Add a translation unit (source + target pair) to a memory |
| `delete_translation` | Delete a translation unit from a memory |
| `import_tmx` | Import a TMX file into a memory |
| `check_import_status` | Check the status of a TMX import job |

### Glossaries

| Tool | Description |
|------|-------------|
| `list_glossaries` | List all glossaries in your account |
| `get_glossary` | Get details of a specific glossary |
| `create_glossary` | Create a new glossary |
| `update_glossary` | Update a glossary's name |
| `delete_glossary` | Delete a glossary |
| `add_glossary_entry` | Add or replace a term entry in a glossary |
| `delete_glossary_entry` | Delete a term entry from a glossary |
| `import_glossary_csv` | Import entries from a CSV file into a glossary |
| `check_glossary_import_status` | Check the status of a glossary CSV import job |
| `export_glossary` | Export a glossary as CSV |
| `get_glossary_counts` | Get the number of entries in a glossary |

---

## Authentication

### OAuth 2.0 (default)

This is the method used in the [Quick Start](#quick-start) above. You provide only the server URL in your client config — no API keys needed. Your client handles the OAuth flow automatically: it opens your browser, you log in with your Lara Translate credentials, and you're connected.

For per-client OAuth setup instructions, see the **[Client Setup Guide](docs/client-setup.md)**.

### Access Key (alternative)

If you prefer to authenticate with API keys instead of browser login, you can pass your credentials directly in the client config. Get your **Access Key ID** and **Secret** from [Lara Translate](https://developers.laratranslate.com/docs/getting-started#step-3---configure-your-credentials).

See the [Access Key section in the Client Setup Guide](docs/client-setup.md#alternative-access-key-authentication) for config examples.

---

## Self-Hosting

Most users can connect to the hosted endpoint (`https://mcp-v2.laratranslate.com/v1`) using the [Quick Start](#quick-start) instructions above. The options below are for running the server yourself.

### STDIO via NPX

Requires [Node.js](https://nodejs.org/).

```json
{
  "mcpServers": {
    "lara-translate": {
      "command": "npx",
      "args": ["-y", "@translated/lara-mcp@latest"],
      "env": {
        "LARA_ACCESS_KEY_ID": "<YOUR_ACCESS_KEY_ID>",
        "LARA_ACCESS_KEY_SECRET": "<YOUR_ACCESS_KEY_SECRET>"
      }
    }
  }
}
```

### STDIO via Docker

Requires [Docker](https://www.docker.com/).

```json
{
  "mcpServers": {
    "lara-translate": {
      "command": "docker",
      "args": [
        "run", "-i", "--rm",
        "-e", "LARA_ACCESS_KEY_ID",
        "-e", "LARA_ACCESS_KEY_SECRET",
        "translatednet/lara-mcp:latest"
      ],
      "env": {
        "LARA_ACCESS_KEY_ID": "<YOUR_ACCESS_KEY_ID>",
        "LARA_ACCESS_KEY_SECRET": "<YOUR_ACCESS_KEY_SECRET>"
      }
    }
  }
}
```

### Building from Source

#### Node.js

```bash
git clone https://github.com/translated/lara-mcp.git
cd lara-mcp
pnpm install
pnpm run build
```

Then add to your MCP config:

```json
{
  "mcpServers": {
    "lara-translate": {
      "command": "node",
      "args": ["<FULL_PATH_TO_PROJECT>/dist/index.js"],
      "env": {
        "LARA_ACCESS_KEY_ID": "<YOUR_ACCESS_KEY_ID>",
        "LARA_ACCESS_KEY_SECRET": "<YOUR_ACCESS_KEY_SECRET>"
      }
    }
  }
}
```

#### Docker

```bash
git clone https://github.com/translated/lara-mcp.git
cd lara-mcp
docker build -t lara-mcp .
```

Then add to your MCP config:

```json
{
  "mcpServers": {
    "lara-translate": {
      "command": "docker",
      "args": [
        "run", "-i", "--rm",
        "-e", "LARA_ACCESS_KEY_ID",
        "-e", "LARA_ACCESS_KEY_SECRET",
        "lara-mcp"
      ],
      "env": {
        "LARA_ACCESS_KEY_ID": "<YOUR_ACCESS_KEY_ID>",
        "LARA_ACCESS_KEY_SECRET": "<YOUR_ACCESS_KEY_SECRET>"
      }
    }
  }
}
```

---

## Support

- For issues with Lara Translate API: visit [Lara Translate Support](https://support.laratranslate.com)
- For issues with this MCP server: open an issue on [GitHub](https://github.com/translated/lara-mcp/issues)
