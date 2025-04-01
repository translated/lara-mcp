# Lara Translate MCP Server

A Model Control Protocol (MCP) Server for [Lara Translate](https://laratranslate.com/translate) API, enabling powerful translation capabilities with support for language detection and context-aware translations.

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

1. Add the following to your `claude_desktop_config.json`:
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


### Option 2: Using NPX

This option requires Node.js to be installed on your system.

1. Add the following to your `claude_desktop_config.json`:
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

### Option 3: Building from Source _(recommended for development)_

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

3. Add the following to your `claude_desktop_config.json`:
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

3. Add the following to your `claude_desktop_config.json`:
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

## Location of claude_desktop_config.json

The `claude_desktop_config.json` file is typically located at:

- **Windows**: `%APPDATA%\Claude Desktop\claude_desktop_config.json`
- **macOS**: `~/Library/Application Support/Claude Desktop/claude_desktop_config.json`
- **Linux**: `~/.config/Claude Desktop/claude_desktop_config.json`

If the file doesn't exist, you'll need to create it.

## Verifying Installation

After setting up the MCP server and restarting Claude Desktop:

1. Open Claude Desktop
2. Check if the translation functionality is available by trying a simple translation command:
   ```
   Translate with Lara "Hello world" to Spanish
   ```

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

For issues with:
- Claude Desktop: Visit [Anthropic Support](https://support.anthropic.com)
- Lara Translate API: Contact [Lara Support](https://support.laratranslate.com)
- This MCP Server: Open an issue on the GitHub repository
