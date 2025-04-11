# Lara Translate MCP Server

A Model Context Protocol (MCP) Server for [Lara Translate](https://laratranslate.com/translate) API, enabling powerful translation capabilities with support for language detection, context-aware translations and translation memories.

[![License](https://img.shields.io/github/license/translated/lara-mcp.svg)](https://github.com/translated/lara-mcp/blob/main/LICENSE)
[![Docker Pulls](https://img.shields.io/docker/pulls/translatednet/lara-mcp.svg)](https://hub.docker.com/r/translatednet/lara-mcp)
[![npm downloads](https://img.shields.io/npm/dm/@translated/lara-mcp.svg)](https://www.npmjs.com/package/@translated/lara-mcp)

## 📚 Table of Contents
- 📖 [Introduction](#introduction)
- 🗂️ [Available Tools](#available-tools)
- 🚀 [Quick Start](#quick-start)
- ⚙️ [Installation Options](#installation-options)
- 🆘 [Support](#support)

## 📖 Introduction

<details>
<summary><strong>What is MCP?</strong></summary>

Model Context Protocol (MCP) is an open standardized communication protocol that enables AI applications to connect with external tools, data sources, and services. Think of MCP like a USB-C port for AI applications - just as USB-C provides a standardized way to connect devices to various peripherals, MCP provides a standardized way to connect AI models to different data sources and tools.

Lara Translate MCP Server enables AI applications to access Lara Translate's powerful translation capabilities through this standardized protocol.

> More info about Model Context Protocol on: https://modelcontextprotocol.io/
</details>

<details>
<summary><strong>How Lara Translate MCP Works</strong></summary>

Lara Translate MCP Server implements the Model Context Protocol to provide seamless translation capabilities to AI applications. The integration follows this flow:

1. **Connection Establishment**: When an MCP-compatible AI application starts, it connects to configured MCP servers, including the Lara Translate MCP Server
2. **Tool & Resource Discovery**: The AI application discovers available translation tools and resources provided by the Lara Translate MCP Server
3. **Request Processing**: When translation needs are identified:
   - The AI application formats a structured request with text to translate, language pairs, and optional context
   - The MCP server validates the request and transforms it into Lara Translate API calls
   - The request is securely sent to Lara Translate's API using your credentials
4. **Translation & Response**: Lara Translate processes the translation using advanced AI models
5. **Result Integration**: The translation results are returned to the AI application, which can then incorporate them into its response

This integration architecture allows AI applications to access professional-grade translations without implementing the API directly, while maintaining the security of your API credentials and offering flexibility to adjust translation parameters through natural language instructions.
</details>

## 🗂️ Available Tools

<details>
<summary><strong>translate</strong> - Translate text between languages</summary>

**Inputs**:
- `text` (array): An array of text blocks to translate, each with:
    - `text` (string): The text content
    - `translatable` (boolean): Whether this block should be translated
- `source` (optional string): Source language code (e.g., 'en-EN')
- `target` (string): Target language code (e.g., 'it-IT')
- `context` (optional string): Additional context to improve translation quality
- `instructions` (optional string[]): Instructions to adjust translation behavior
- `source_hint` (optional string): Guidance for language detection

**Returns**: Translated text blocks maintaining the original structure
</details>

<details>
<summary><strong>list_memories</strong> - List saved translation memories</summary>

**Returns**: Array of memories and their details
</details>

<details>
<summary><strong>create_memory</strong> - Create a new translation memory</summary>

**Inputs**:
- `name` (string): Name of the new memory
- `external_id` (optional string): ID of the memory to import from MyMemory (e.g., 'ext_my_[MyMemory ID]')

**Returns**: Created memory data
</details>

<details>
<summary><strong>update_memory</strong> - Update memory name</summary>

**Inputs**:
- `id` (string): ID of the memory to update
- `name` (string): The new name for the memory

**Returns**: Updated memory data
</details>

<details>
<summary><strong>delete_memory</strong> - Delete a translation memory</summary>

**Inputs**:
- `id` (string): ID of the memory to delete

**Returns**: Deleted memory data
</details>

<details>
<summary><strong>add_translation</strong> - Add a translation unit to memory</summary>

**Inputs**:
- `id` (string | string[]): ID or IDs of memories where to add the translation unit
- `source` (string): Source language code
- `target` (string): Target language code
- `sentence` (string): The source sentence
- `translation` (string): The translated sentence
- `tuid` (optional string): Translation Unit unique identifier
- `sentence_before` (optional string): Context sentence before
- `sentence_after` (optional string): Context sentence after

**Returns**: Added translation details
</details>

<details>
<summary><strong>delete_translation</strong> - Delete a translation unit from memory</summary>

**Inputs**:
- `id` (string): ID of the memory
- `source` (string): Source language code
- `target` (string): Target language code
- `sentence` (string): The source sentence
- `translation` (string): The translated sentence
- `tuid` (optional string): Translation Unit unique identifier
- `sentence_before` (optional string): Context sentence before
- `sentence_after` (optional string): Context sentence after

**Returns**: Removed translation details
</details>

<details>
<summary><strong>import_tmx</strong> - Import a TMX file into memory</summary>

**Inputs**:
- `id` (string): ID of the memory to update
- `tmx` (file path): The path of the TMX file to upload
- `gzip` (boolean): Indicates if the file is compressed (.gz)

**Returns**: Import details
</details>

<details>
<summary><strong>get_import_status</strong> - Check import status</summary>

**Inputs**:
- `id` (string): The ID of the import job

**Returns**: Import details
</details>

## 🚀 Quick Start

1. **Get API Credentials**
   - Create an account on [Lara Translate](https://laratranslate.com/sign-up)
   - Subscribe to any plan (including the free tier)
   - Generate API credentials in your account
   - Save your `LARA_ACCESS_KEY_ID` and `LARA_ACCESS_KEY_SECRET`

2. **Install Using NPX**
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

3. **Verify Installation**
   - Restart your AI application
   - Try a simple translation: `Translate with Lara "Hello world" to Spanish`

## ⚙️ Installation Options

<details>
<summary><strong>Option 1: Using NPX</strong></summary>

This option requires Node.js to be installed on your system.

1. Add the following to your MCP configuration file:
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

2. Replace `<YOUR_ACCESS_KEY_ID>` and `<YOUR_ACCESS_KEY_SECRET>` with your actual Lara API credentials.
</details>

<details>
<summary><strong>Option 2: Using Docker</strong></summary>

This option requires Docker to be installed on your system.

1. Add the following to your MCP configuration file:
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

2. Replace `<YOUR_ACCESS_KEY_ID>` and `<YOUR_ACCESS_KEY_SECRET>` with your actual Lara API credentials.
</details>

<details>
<summary><strong>Option 3: Building from Source</strong></summary>

#### Using Node.js

1. Clone the repository:
```bash
git clone https://github.com/translated/lara-mcp.git
cd lara-mcp
```

2. Install dependencies and build:
```bash
# Install dependencies
pnpm install

# Build
pnpm run build
```

3. Add the following to your MCP configuration file:
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
4. Replace:
   - `<FULL_PATH_TO_PROJECT_FOLDER>` with the absolute path to your project folder
   - `<YOUR_ACCESS_KEY_ID>` and `<YOUR_ACCESS_KEY_SECRET>` with your actual Lara API credentials.

#### Building a Docker Image

1. Clone the repository:
```bash
git clone https://github.com/translated/lara-mcp.git
cd lara-mcp
```

2. Build the Docker image:
```bash
docker build -t lara-mcp .
```

3. Add the following to your MCP configuration file:
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

4. Replace `<YOUR_ACCESS_KEY_ID>` and `<YOUR_ACCESS_KEY_SECRET>` with your actual credentials.
</details>

<details>
<summary><strong>Configuration File Locations</strong></summary>

The MCP configuration file location depends on the AI application you're using. Common locations include:

- **Claude Desktop**:
   - **Windows**: `%APPDATA%\Claude Desktop\claude_desktop_config.json`
   - **macOS**: `~/Library/Application Support/Claude Desktop/claude_desktop_config.json`
   - **Linux**: `~/.config/Claude Desktop/claude_desktop_config.json`

- **Other Applications**: Refer to the specific application's documentation for configuration file location

If the configuration file doesn't exist, you'll need to create it.
</details>

## 🆘 Support

- For issues with Lara Translate API: Contact [Lara Support](https://support.laratranslate.com)
- For issues with this MCP Server: Open an issue on [GitHub](https://github.com/translated/lara-mcp/issues)
