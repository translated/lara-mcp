# Client Setup Guide

Connect Lara Translate to your favorite AI client. The recommended method uses **OAuth** — just enter the server URL and log in through your browser. No API keys to manage.

## Table of Contents

- [Claude Desktop](#claude-desktop)
- [Cursor](#cursor)
- [Claude Code](#claude-code)
- [VS Code (GitHub Copilot)](#vs-code-github-copilot)
- [Windsurf](#windsurf)
- [Cline (VS Code)](#cline-vs-code)
- [Continue](#continue)
- [Alternative: Access Key Authentication](#alternative-access-key-authentication)
- [Troubleshooting](#troubleshooting)

---

## Claude Desktop

1. Open Claude Desktop and go to **Settings** > **Connectors**
2. Click **Add Custom Connector**
3. Enter the name: `Lara`
4. Enter the URL: `https://mcp-v2.laratranslate.com/v1`
5. Click **Add**

![Add Custom Connector](https://downloads.intercomcdn.com/i/o/lupk8zyo/1731190757/b6b02b1879bb55fb9ab32f222b06/8d09370d-1c7a-489c-b62b-b3484aaaef31?expires%3D1765471500%26signature%3D0d8212f6938008d55dec82fdc3e20b64c07b93ebec368ab74cba77e7980d099a%26req%3DdSckF8h3nYZaXvMW1HO4zYLxKhd694%2BiiJlgl7fGiwR%2F%2BSImZUUlz6Dw2QdV%0AKllJvjnsbArbYSudYjw%3D%0A)

6. Click **Connect** next to the connector. Your browser will open the Lara Translate login page.
7. Log in with your Lara Translate credentials. You'll be redirected back to Claude Desktop automatically.

That's it — Lara Translate is now available in your conversations.

> For more on custom connectors, see the [Claude documentation](https://support.claude.com/en/articles/11175166-getting-started-with-custom-connectors-using-remote-mcp).

---

## Cursor

1. Open the MCP config file:
   - **macOS**: `~/.cursor/mcp.json`
   - **Windows**: `%APPDATA%\Cursor\mcp.json`
   - **Linux**: `~/.cursor/mcp.json`
2. Paste:

```json
{
  "mcpServers": {
    "lara-translate": {
      "url": "https://mcp-v2.laratranslate.com/v1"
    }
  }
}
```

3. Save and restart Cursor.
4. The first time you use a Lara tool, Cursor will open your browser to authenticate with your Lara Translate credentials.

---

## Claude Code

Run this command in your terminal:

```bash
claude mcp add lara-translate --transport http --url https://mcp-v2.laratranslate.com/v1
```

The first time Lara tools are used, Claude Code will open your browser to authenticate with your Lara Translate credentials.

Alternatively, create a `.mcp.json` file in your project root:

```json
{
  "mcpServers": {
    "lara-translate": {
      "url": "https://mcp-v2.laratranslate.com/v1"
    }
  }
}
```

---

## VS Code (GitHub Copilot)

VS Code supports MCP servers through GitHub Copilot's agent mode.

### Option A: Project-level config

Create a `.vscode/mcp.json` file in your project:

```json
{
  "servers": {
    "lara-translate": {
      "type": "http",
      "url": "https://mcp-v2.laratranslate.com/v1"
    }
  }
}
```

### Option B: User settings

Open VS Code Settings (JSON) and add:

```json
{
  "mcp": {
    "servers": {
      "lara-translate": {
        "type": "http",
        "url": "https://mcp-v2.laratranslate.com/v1"
      }
    }
  }
}
```

Save and reload VS Code. When you first use a Lara tool in Copilot's agent mode, your browser will open to authenticate with Lara Translate.

> MCP support in VS Code requires GitHub Copilot. See the [VS Code MCP documentation](https://code.visualstudio.com/docs/copilot/chat/mcp-servers) for details.

---

## Windsurf

1. Open the config file:
   - **macOS / Linux**: `~/.codeium/windsurf/mcp_config.json`
   - **Windows**: `%USERPROFILE%\.codeium\windsurf\mcp_config.json`

   Or in Windsurf: **Settings** > search "MCP" > **Edit in mcp_config.json**.
2. Paste:

```json
{
  "mcpServers": {
    "lara-translate": {
      "serverUrl": "https://mcp-v2.laratranslate.com/v1"
    }
  }
}
```

3. Save and restart Windsurf. Your browser will open to authenticate the first time you use a Lara tool.

---

## Cline (VS Code)

1. Open VS Code and click the **Cline** icon in the sidebar.
2. Click the **MCP Servers** button (server icon) at the top of the Cline panel.
3. Click **Remote Servers**.
4. Add:

```json
{
  "mcpServers": {
    "lara-translate": {
      "url": "https://mcp-v2.laratranslate.com/v1"
    }
  }
}
```

5. Save. Your browser will open to authenticate when you first use a Lara tool.

---

## Continue

1. Open the config file:
   - **macOS / Linux**: `~/.continue/config.json`
   - **Windows**: `%USERPROFILE%\.continue\config.json`

   Or use the Continue sidebar > gear icon.
2. Add the `mcpServers` section:

```json
{
  "mcpServers": [
    {
      "name": "lara-translate",
      "url": "https://mcp-v2.laratranslate.com/v1"
    }
  ]
}
```

3. Save and restart Continue. Your browser will open to authenticate when you first use a Lara tool.

> Note: Continue uses an array format for `mcpServers`. See the [Continue MCP docs](https://docs.continue.dev/customize/model-context-protocol) for details.

---

## Alternative: Access Key Authentication

If your client doesn't support OAuth, or you prefer to authenticate with API keys instead of browser login, you can pass your credentials directly in the config. Get your **Access Key ID** and **Secret** from [Lara Translate](https://developers.laratranslate.com/docs/getting-started#step-3---configure-your-credentials).

### Clients with `url` support (Cursor, Windsurf, VS Code, Cline, Continue, Claude Code)

Add your credentials as headers alongside the URL:

```json
{
  "lara-translate": {
    "url": "https://mcp-v2.laratranslate.com/v1",
    "headers": {
      "x-lara-access-key-id": "<YOUR_ACCESS_KEY_ID>",
      "x-lara-access-key-secret": "<YOUR_ACCESS_KEY_SECRET>"
    }
  }
}
```

> Adapt the wrapper format to your client (e.g., `"mcpServers"` for Cursor, `"servers"` with `"type": "http"` for VS Code, etc.). See the OAuth sections above for each client's exact format.

### Claude Desktop (command-based)

Claude Desktop doesn't support `url`-based configs directly, so it uses `mcp-remote` as a bridge. Requires [Node.js](https://nodejs.org/).

Open the config file:

- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

Paste:

```json
{
  "mcpServers": {
    "lara-translate": {
      "command": "npx",
      "args": [
        "mcp-remote",
        "https://mcp-v2.laratranslate.com/v1",
        "--header",
        "x-lara-access-key-id: ${X_LARA_ACCESS_KEY_ID}",
        "--header",
        "x-lara-access-key-secret: ${X_LARA_ACCESS_KEY_SECRET}"
      ],
      "env": {
        "X_LARA_ACCESS_KEY_ID": "<YOUR_ACCESS_KEY_ID>",
        "X_LARA_ACCESS_KEY_SECRET": "<YOUR_ACCESS_KEY_SECRET>"
      }
    }
  }
}
```

Replace the placeholders with your credentials, save, and restart Claude Desktop.

---

## Troubleshooting

**OAuth login page doesn't open?**

- Ensure your client supports OAuth for MCP servers (check your client's documentation)
- Make sure your default browser is set and can open URLs
- Try the [Access Key method](#alternative-access-key-authentication) as a fallback

**Server not showing up after restart?**

- Double-check your JSON syntax (missing commas, trailing commas, etc.)
- Ensure the config file is in the correct location for your OS
- Some clients require a full application restart, not just a window reload

**Authentication errors?**

- If using Access Key: verify your credentials are correct and active in your [Lara Translate account](https://laratranslate.com)
- If using OAuth: try disconnecting and reconnecting to re-authenticate

**Connection issues with `mcp-remote`?**

- Ensure [Node.js](https://nodejs.org/) (v18+) is installed: `node --version`
- Check your network/firewall allows outbound HTTPS connections

**Still stuck?**

- For API issues: [Lara Translate Support](https://support.laratranslate.com)
- For MCP server issues: [GitHub Issues](https://github.com/translated/lara-mcp/issues)
