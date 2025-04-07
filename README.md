# Lara Translate MCP Server

<div align="center">

[![License](https://img.shields.io/github/license/translated/lara-mcp.svg)](https://github.com/translated/lara-mcp/blob/main/LICENSE)
[![Docker Pulls](https://img.shields.io/docker/pulls/translatednet/lara-mcp.svg)](https://hub.docker.com/r/translatednet/lara-mcp)
[![npm downloads](https://img.shields.io/npm/dm/@translated/lara-mcp.svg)](https://www.npmjs.com/package/@translated/lara-mcp)

A Model Context Protocol (MCP) Server for [Lara Translate](https://laratranslate.com/translate) API, enabling powerful translation capabilities with support for language detection and context-aware translations.

</div>

---

## 📚 Table of Contents
- [Introduction](#introduction)
- [Features](#features)
- [Available Tools](#available-tools)
- [MCP Clients](#mcp-compatible-tools)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Configuration](#configuration)
  - [Testing Your Setup](#verifying-installation)
- [Usage Examples](#usage-examples)
- [Support](#support)

---

## 🎯 Introduction

**What is MCP?**

Model Context Protocol (MCP) is a standardized communication protocol that allows AI applications to connect with external tools and services. MCP servers act as bridges between AI models and specific functionalities, enabling AI applications to perform specialized tasks beyond their built-in capabilities.

**How Lara Translate MCP Works**

The Lara Translate MCP Server enables AI applications to access Lara Translate API. When integrated with an MCP-compatible AI application:

1. **Connection**: The AI application connects to the Lara Translate MCP Server
2. **Request**: When translation is needed, the application sends a structured request to the MCP server
3. **Processing**: The MCP server forwards the request to Lara Translate's API
4. **Response**: Translation results are returned to the AI application

This integration allows AI applications to seamlessly incorporate high-quality translations into their workflows without needing to directly implement the translation API.

---

## 🛠️ Features

- **Language Detection**: Automatic detection of source language when not specified
- **Context-Aware Translations**: Provide contextual hints to improve translation quality
- **Custom Instructions**: Fine-tune translation behavior with specific instructions
- **Multi-Language Support**: Translate between numerous language pairs

---

## 🔧 Available Tools

<details open>
<summary><strong>translate</strong></summary>

Translate text between languages with support for language detection and context-aware translations.

**Inputs:**
- `text` (array): An array of text blocks to translate, each with:
  - `text` (string): The text content
  - `translatable` (boolean): Whether this block should be translated
- `source` (optional string): Source language code (e.g., 'en-EN' for English)
- `target` (string): Target language code (e.g., 'it-IT' for Italian)
- `context` (optional string): Additional context to improve translation quality
- `instructions` (optional string[]): Instructions to adjust translation behavior
- `source_hint` (optional string): Guidance for language detection

**Returns:** Translated text blocks maintaining the original structure

</details>

---

## 🤝 MCP Clients

The following clients support MCP and can be used with Lara Translate MCP Server:

| Client | Description |
|------|-------------|
| [Claude Desktop](https://claude.ai/download) | Desktop application for Claude AI |
| [Cursor](https://www.cursor.com/) | AI-first code editor |
| [Cline for VS Code](https://github.com/cline/cline) | VS Code extension for AI assistance |
| [GitHub Copilot MCP](https://github.com/VikashLoomba/copilot-mcp) | VS Code extension for GitHub Copilot MCP integration |
| [Zed](https://zed.dev/) | High-performance code editor with AI capabilities |
| [Windsurf](https://windsurf.com/editor) | AI-powered code editor and development environment |

> For a complete list of MCP clients and their feature support, visit the [official MCP clients page](https://modelcontextprotocol.io/clients).

---

## Getting Started

### 📋 Prerequisites

Before installing, you need to:

1. Obtain API credentials from [Lara Translate](https://laratranslate.com/sign-up):
   - Create an account on the [Lara website](https://laratranslate.com/sign-up)
   - Subscribe to any plan (including the free tier)
   - Navigate to the API section in your account
   - Generate a new pair of Lara API credentials
   - Store your `LARA_ACCESS_KEY_ID` and `LARA_ACCESS_KEY_SECRET` securely

> ⚠️ **Important**: If you lose your credentials, they cannot be recovered, and you'll need to generate new ones.

### ⚙️ Configuration

First, locate your configuration file based on which client you're using:

<details open>
<summary><strong>Claude Desktop</strong></summary>

1. Open Claude desktop and go to Settings
2. Open Developer tab
3. Click `Edit Config` to see configuration file in file explorer
4. The configuration file is located at:
   - **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
   - **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - **Linux**: `~/.config/Claude/claude_desktop_config.json`

</details>

<details>
<summary><strong>Cursor</strong></summary>

1. Open Cursor and go to Cursor Settings
2. Open the MCP tab
3. Click `+ Add new MCP server`

> For more detailed information, see the [official Cursor MCP documentation](https://docs.cursor.com/context/model-context-protocol#configuring-mcp-servers).

</details>

<details>
<summary><strong>Other MCP Clients</strong></summary>

Common configuration locations:

- **VS Code Extensions**: Extension settings
- **Zed**: Settings panel under MCP configuration
- **Windsurf**: Settings panel under MCP configuration
- **Continue**: Settings panel under MCP configuration

If the configuration file doesn't exist, you'll need to create it.

</details>

### 💻 Installation Methods

Choose one of these methods to install and configure Lara Translate MCP Server:

<details open>
<summary><strong>Option 1: Docker (Recommended)</strong></summary>

Requirements:
- Docker installed ([Download Docker](https://www.docker.com/products/docker-desktop/))

Steps:
1. Add this configuration to your MCP configuration file:
```json
{
  "mcpServers": {
    "lara-translate": {
      "command": "docker",
      "args": [
        "run",
        "-i",
        "--rm",
        "-e",
        "LARA_ACCESS_KEY_ID",
        "-e",
        "LARA_ACCESS_KEY_SECRET",
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

2. Replace the credentials placeholders with your actual Lara API credentials
3. Save and restart your MCP client

</details>

<details>
<summary><strong>Option 2: NPX</strong></summary>

Requirements:
- Node.js installed ([Download Node.js](https://nodejs.org/))

Steps:
1. Add this configuration to your MCP configuration file:
```json
{
  "mcpServers": {
    "lara-translate": {
      "command": "npx",
      "args": ["-y", "@translated/lara-mcp"],
      "env": {
        "LARA_ACCESS_KEY_ID": "<YOUR_ACCESS_KEY_ID>",
        "LARA_ACCESS_KEY_SECRET": "<YOUR_ACCESS_KEY_SECRET>"
      }
    }
  }
}
```

2. Replace the credentials placeholders with your actual Lara API credentials
3. Save and restart your MCP client

</details>

<details>
<summary><strong>Option 3: Build from Source</strong></summary>

Requirements:
- Node.js and pnpm for Method A
- Docker for Method B

#### Method A: Node.js Build

1. Clone and build:
```bash
git clone https://github.com/translated/lara-mcp.git
cd lara-mcp
pnpm install
pnpm run build
```

2. Add this configuration:
```json
{
  "mcpServers": {
    "lara-translate": {
      "command": "node",
      "args": ["<FULL_PATH_TO_PROJECT_FOLDER>/dist/index.js"],
      "env": {
        "LARA_ACCESS_KEY_ID": "<YOUR_ACCESS_KEY_ID>",
        "LARA_ACCESS_KEY_SECRET": "<YOUR_ACCESS_KEY_SECRET>"
      }
    }
  }
}
```

3. Replace:
   - `<FULL_PATH_TO_PROJECT_FOLDER>` with your project path
   - The credentials placeholders with your Lara API credentials
4. Save and restart your MCP client

#### Method B: Docker Build

1. Clone and build:
```bash
git clone https://github.com/translated/lara-mcp.git
cd lara-mcp
docker build -t lara-mcp .
```

2. Add this configuration:
```json
{
  "mcpServers": {
    "lara-translate": {
      "command": "docker",
      "args": [
        "run",
        "-i",
        "--rm",
        "-e",
        "LARA_ACCESS_KEY_ID",
        "-e",
        "LARA_ACCESS_KEY_SECRET",
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

3. Replace the credentials placeholders with your Lara API credentials
4. Save and restart your MCP client

</details>

### ✅ Testing Your Setup

After setup, test if everything works:

<details open>
<summary><strong>Try a simple translation</strong></summary>

**In Claude Desktop:**
```text
Translate with Lara "Hello world" to Spanish
```
You should see:
1. A security prompt asking for permission to use the "translate" tool
2. A confirmation message showing the translation is in progress
3. The translation result displaying "Hola mundo"

**In Cursor:**
```text
Translate with Lara "Hello world" to Spanish
```
You should see:
1. A confirmation message about using Lara Translate
2. An interactive prompt showing "Calling MCP tool (translate)"
3. The translated text with a confirmation label

</details>

If nothing happens, check that:
- Your configuration file is in the correct location
- Your API credentials are entered correctly
- You've restarted your application after configuration
- Docker is running (if using the Docker method)

---

## 📝 Usage Examples

<details open>
<summary><strong>Basic Translation</strong></summary>

**What to type:**
```text
Translate with Lara "la terra è rossa", I'm talking with a tennis player.
```

This tells Lara to translate the Italian text while providing the context that you're talking with a tennis player.

**Behind the scenes:**
```json
{
    "text": [
        { "text": "la terra è rossa", "translatable": true }
    ],
    "target": "en-US",
    "context": "Conversation with a tennis player"
}
```

**Result:**
```json
[
    {
        "text": "The clay is red.",
        "translatable": true
    }
]
```
Notice how Lara understands that "terra" in a tennis context should be translated as "clay" (the surface), not just "earth" or "ground".

</details>

<details>
<summary><strong>Translation with Special Instructions</strong></summary>

**What to type:**
```text
Translate with Lara "Buongiorno, come stai?" to English, use a formal tone.
```

This tells Lara to translate the Italian greeting and use a formal tone in English.

**Behind the scenes:**
```json
{
    "text": [
        { "text": "Buongiorno, come stai?", "translatable": true }
    ],
    "target": "en-US",
    "instructions": ["Use a formal tone"]
}
```

**Result:**
```json
[
    {
        "text": "Good morning, how are you?",
        "translatable": true
    }
]
```

</details>

---

## 🆘 Support

- For issues with Lara Translate API: Contact [Lara Support](https://support.laratranslate.com)
- For issues with this MCP Server: Open an issue on the GitHub repository
