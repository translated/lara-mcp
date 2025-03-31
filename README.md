# Lara Translate MCP Server

MCP Server for [Lara Translate](https://laratranslate.com/translate) API, enabling powerful translation capabilities with support for language detection and context-aware translations.

### Features

- **Language Detection**: Automatic detection of source language when not specified
- **Context-Aware Translations**: Provide contextual hints to improve translation quality
- **Custom Instructions**: Fine-tune translation behavior with specific instructions
- **Multi-Language Support**: Translate between numerous language pairs

## Tools

1. `translate`
   - Translate text between languages with support for  language detection and context-aware translations
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

## Usage Examples

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

## Setup

### Lara Translate API Credentials

You need to obtain API credentials from [Lara Translate](https://laratranslate.com/sign-up):
1. Go to the [Lara website](https://laratranslate.com/sign-up), subscribe any plan (including the free one)
2. Create a new pair of Lara credentials in the API section of your account

Store them in a secure location. If lost they cannot be recovered, you will need to generate new ones.

### Usage with Claude Desktop

To use this with Claude Desktop, add the following to your `claude_desktop_config.json`:

#### Docker

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

### NPX

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

## Local Development

### Node

Build:
```bash
# Install dependencies
pnpm install

# Build
pnpm run build
```

Add the following to your `claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "lara-translate": {
      "command": "node",
      "args": ["<PROJECT_FOLDER>/dist/index.js"],
      "env": {
        "LARA_ACCESS_KEY_ID": "<YOUR_ACCESS_KEY_ID>",
        "LARA_ACCESS_KEY_SECRET": "<YOUR_ACCESS_KEY_SECRET>"
      }
    }
  }
}
```

### Docker

Build:
```bash
docker build -t lara-mcp .
```

Add the following to your `claude_desktop_config.json`:
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
