# Lara Translate MCP Server

A Model Context Protocol (MCP) Server for [Lara Translate](https://laratranslate.com/translate) API, enabling powerful translation capabilities with support for language detection and context-aware translations.

## Table of Contents
- [Introduction](#introduction)
   - [What is MCP?](#what-is-mcp)
   - [How Lara Translate MCP Works](#how-lara-translate-mcp-works)
- [Features](#features)
- [Available Tools](#available-tools)
- [MCP-Compatible Tools](#mcp-compatible-tools)
- [Prerequisites](#prerequisites)
- [Installation & Setup](#installation--setup)
   - [Option 1: Using Docker (recommended)](#option-1-using-docker-recommended)
   - [Option 2: Using NPX](#option-2-using-npx)
   - [Option 3: Building from Source (recommended for development)](#option-3-building-from-source-recommended-for-development)
- [Configuration Location](#configuration-location)
   - [Claude Desktop](#claude-desktop)
   - [Cursor](#cursor)
   - [Other MCP-Compatible Tools](#other-mcp-compatible-tools)
- [Verifying Installation](#verifying-installation)
- [Usage Examples](#usage-examples)
   - [Basic Translation](#basic-translation)
   - [With Instructions](#with-instructions)
- [Support](#support)

## Introduction

### What is MCP?

Model Context Protocol (MCP) is a standardized communication protocol that allows AI applications to connect with external tools and services. MCP servers act as bridges between AI models and specific functionalities, enabling AI applications to perform specialized tasks beyond their built-in capabilities.

## MCP-Compatible Tools

The following tools support MCP and can be used with Lara Translate MCP Server:

- [Claude Desktop](https://claude.ai/download) - Desktop application for Claude AI
- [Cursor](https://www.cursor.com/) - AI-first code editor
- [Cline for VS Code](https://github.com/cline/cline) - VS Code extension for AI assistance
- [GitHub Copilot MCP](https://github.com/VikashLoomba/copilot-mcp) - VS Code extension for GitHub Copilot MCP integration
- [Zed](https://zed.dev/) - High-performance code editor with AI capabilities
- [Windsurf](https://windsurf.com/editor) - AI-powered code editor and development environment
- [Continue](https://github.com/continuedev/continue) - Open-source IDE extension for creating and using custom AI code assistants

For a complete list of MCP-compatible tools and their feature support, visit the [official MCP clients page](https://modelcontextprotocol.io/clients).

### How Lara Translate MCP Works

The Lara Translate MCP Server enables AI applications to access Lara Translate API. When integrated with an MCP-compatible AI application:

1. **Connection**: The AI application connects to the Lara Translate MCP Server
2. **Request**: When translation is needed, the application sends a structured request to the MCP server
3. **Processing**: The MCP server forwards the request to Lara Translate's API
4. **Response**: Translation results are returned to the AI application

This integration allows AI applications to seamlessly incorporate high-quality translations into their workflows without needing to directly implement the translation API.

## Features

- **Language Detection**: Automatic detection of source language when not specified
- **Context-Aware Translations**: Provide contextual hints to improve translation quality
- **Custom Instructions**: Fine-tune translation behavior with specific instructions
- **Multi-Language Support**: Translate between numerous language pairs

## Available Tools

1. `translate`
   - Translate text between languages with support for language detection and context-aware translations
   - Inputs:
      - `text` (array): An array of text blocks to translate, each with:
         - `text` (string): The text content
         - `translatable` (boolean): Whether this block should be translated
      - `source` (optional string): Source language code (e.g., 'en-EN' for English)
      - `target` (string): Target language code (e.g., 'it-IT' for Italian)
      - `context` (optional string): Additional context to improve translation quality
      - `instructions` (optional string[]): Instructions to adjust translation behavior
      - `source_hint` (optional string): Guidance for language detection
   - Returns: Translated text blocks maintaining the original structure

## Prerequisites

Before installing, you need to:

1. Obtain API credentials from [Lara Translate](https://laratranslate.com/sign-up):
   - Create an account on the [Lara website](https://laratranslate.com/sign-up)
   - Subscribe to any plan (including the free tier)
   - Navigate to the API section in your account
   - Generate a new pair of Lara API credentials
   - Store your `LARA_ACCESS_KEY_ID` and `LARA_ACCESS_KEY_SECRET` securely

**Note**: If you lose your credentials, they cannot be recovered, and you'll need to generate new ones.

## Installation & Setup

There are three ways to install and run the Lara Translate MCP Server:

### Option 1: Using Docker (recommended)

This option requires Docker to be installed on your system.

1. Make sure Docker is installed and running on your system. If not, download and install it from [Docker's official website](https://www.docker.com/products/docker-desktop/).

2. Add the following to your MCP configuration file (see [Configuration Location](#configuration-location) section for details on where to find this file):
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

3. Replace `<YOUR_ACCESS_KEY_ID>` and `<YOUR_ACCESS_KEY_SECRET>` with your actual Lara API credentials.

4. Restart your MCP-compatible application for the changes to take effect.


### Option 2: Using NPX

This option requires Node.js to be installed on your system.

1. Make sure Node.js is installed on your system. If not, download and install it from [Node.js official website](https://nodejs.org/).

2. Add the following to your MCP configuration file (see [Configuration Location](#configuration-location) section for details on where to find this file):
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

3. Replace `<YOUR_ACCESS_KEY_ID>` and `<YOUR_ACCESS_KEY_SECRET>` with your actual Lara API credentials.

4. Restart your MCP-compatible application for the changes to take effect.

### Option 3: Building from Source (recommended for development)

#### Alternative A: Local Build with Node.js

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

3. Add the following to your MCP configuration file (see [Configuration Location](#configuration-location) section for details on where to find this file):
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

5. Restart your MCP-compatible application for the changes to take effect.

#### Alternative B: Local Build with Docker

1. Clone the repository:
```bash
git clone https://github.com/translated/lara-mcp.git
cd lara-mcp
```

2. Build the Docker image:
```bash
docker build -t lara-mcp .
```

3. Add the following to your MCP configuration file (see [Configuration Location](#configuration-location) section for details on where to find this file):
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

5. Restart your MCP-compatible application for the changes to take effect.

## Configuration Location

The MCP configuration file location depends on the AI application you're using. Below are detailed instructions for finding and editing the configuration file in various clients:

### Claude Desktop

1. Open Claude desktop and go to Settings.
2. Open Developer tab
3. Click `Edit Config` to see configuration file in file explorer.
4. Open the file in text editor
5. This will open the configuration file in your default text editor. The file is located at:
   - **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
   - **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - **Linux**: `~/.config/Claude/claude_desktop_config.json`
6. Add the Lara Translate MCP server configuration as described in the installation options above
7. Save the file and restart Claude Desktop

### Cursor

1. Open Cursor and go to Cursor Settings
2. Open the MCP tab
3. Click `+ Add new MCP server`
4. This will open the configuration file in your default text editor.
5. Add the Lara Translate MCP server configuration as described in the installation options above
6. Click "Save" and restart Cursor

For more detailed information about configuring MCP servers in Cursor, please refer to the [official Cursor MCP documentation](https://docs.cursor.com/context/model-context-protocol#configuring-mcp-servers).

### Other MCP-Compatible Tools

For other MCP-compatible tools, refer to their specific documentation for configuration file location. Common locations include:

- **VS Code Extensions**: Usually in the extension settings
- **Zed**: Settings panel under MCP configuration
- **Windsurf**: Settings panel under MCP configuration
- **Continue**: Settings panel under MCP configuration

If the configuration file doesn't exist, you'll need to create it in the appropriate location.

## Verifying Installation

After setting up the MCP server and restarting your AI application:

1. Test the translation functionality with a simple example. The interaction will differ based on your AI application:

   **In Claude Desktop:**
   ```text
   Translate with Lara "Hello world" to Spanish
   ```
   Expected workflow:
   1. A security prompt will appear requesting permission to use the "translate" tool from "lara-translate"
   2. Upon approval, you'll see a confirmation message: "Executing translate from lara-translate" along with the request details
   3. The translation result will be displayed with a confirmation message: "View result from translate from lara-translate"

   **In Cursor:**
   ```text
   Translate with Lara "Hello world" to Spanish
   ```
   Expected workflow:
   1. A confirmation message will appear indicating the use of Lara Translate MCP
   2. An interactive prompt will show: "Calling MCP tool (translate)" with an action confirmation button
   3. The translated text will be displayed with a confirmation label: "Called MCP Tool (Translate)"

If you don't see these indicators, check:
- Your MCP configuration file is in the correct location
- The API credentials are correctly set
- The AI application has been restarted after configuration
- Docker is running (if using Docker installation method)

## Usage Examples

### Basic Translation

Prompt:
```text
Translate with Lara "la terra è rossa", I'm talking with a tennis player.
```

API Input:
```json
{
    "text": [
        { "text": "la terra è rossa", "translatable": true }
    ],
    "target": "en-US",
    "context": "Conversation with a tennis player"
}
```

API Output:
```json
[
    {
        "text": "The clay is red.",
        "translatable": true
    }
]
```

### With Instructions

Prompt:
```text
Translate with Lara "Buongiorno, come stai?" to English, use a formal tone.
```

API Input:
```json
{
    "text": [
        { "text": "Buongiorno, come stai?", "translatable": true }
    ],
    "target": "en-US",
    "instructions": ["Use a formal tone"]
}
```

API Output:
```json
[
    {
        "text": "Good morning, how are you?",
        "translatable": true
    }
]
```

## Support

For issues with Lara Translate API, contact [Lara Support](https://support.laratranslate.com).

For issues with this MCP Server, open an issue on the GitHub repository.

[![License](https://img.shields.io/github/license/translated/lara-mcp.svg)](https://github.com/translated/lara-mcp/blob/main/LICENSE)
[![Docker Pulls](https://img.shields.io/docker/pulls/translatednet/lara-mcp.svg)](https://hub.docker.com/r/translatednet/lara-mcp)
[![npm downloads](https://img.shields.io/npm/dm/@translated/lara-mcp.svg)](https://www.npmjs.com/package/@translated/lara-mcp)
