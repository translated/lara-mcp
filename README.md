
# Lara Translate MCP Server

A Model Context Protocol (MCP) Server for [Lara Translate](https://laratranslate.com/translate) API, enabling powerful translation capabilities with support for language detection, context-aware translations and translation memories.

[![License](https://img.shields.io/github/license/translated/lara-mcp.svg)](https://github.com/translated/lara-mcp/blob/main/LICENSE)
[![Docker Pulls](https://img.shields.io/docker/pulls/translatednet/lara-mcp.svg)](https://hub.docker.com/r/translatednet/lara-mcp)
[![npm downloads](https://img.shields.io/npm/dm/@translated/lara-mcp.svg)](https://www.npmjs.com/package/@translated/lara-mcp)

## 📚 Table of Contents
- 📖 [Introduction](#-introduction)
- 🛠 [Available Tools](#-available-tools)
- 🚀 [Getting Started](#-getting-started)
  - 📋 [Requirements](#-requirements)
  - 🔌 [Installation](#-installation)
    - 🖥️ [STDIO Server](#%EF%B8%8F-stdio-server)
    - 🌐 [HTTP Server](#-web-server)
  - ⚙️ [Enviromental Variables](#%EF%B8%8F-environment-variables)
- 🧩 [Installation Engines](#-installation-engines)
- 💻 [Popular Clients that supports MCPs](#-popular-clients-that-supports-mcps)
- 🆘 [Support](#-support)

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

<details>
<summary><strong>Why to use Lara inside an LLM</strong></summary>

Integrating Lara with LLMs creates a powerful synergy that significantly enhances translation quality for non-English languages.

#### Why General LLMs Fall Short in Translation
While large language models possess broad linguistic capabilities, they often lack the specialized expertise and up-to-date terminology required for accurate translations in specific domains and languages.

#### Lara’s Domain-Specific Advantage
Lara overcomes this limitation by leveraging Translation Language Models (T-LMs) trained on billions of professionally translated segments. These models provide domain-specific machine translation that captures cultural nuances and industry terminology that generic LLMs may miss. The result: translations that are contextually accurate and sound natural to native speakers.

#### Designed for Non-English Strength
Lara has a strong focus on non-English languages, addressing the performance gap found in models such as GPT-4. The dominance of English in datasets such as Common Crawl and Wikipedia results in lower quality output in other languages. Lara helps close this gap by providing higher quality understanding, generation, and restructuring in a multilingual context.

#### Faster, Smarter Multilingual Performance
By offloading complex translation tasks to specialized T-LMs, Lara reduces computational overhead and minimizes latency—a common issue for LLMs handling non-English input. Its architecture processes translations in parallel with the LLM, enabling for real-time, high-quality output without compromising speed or efficiency.

#### Cost-Efficient Translation at Scale
Lara also lowers the cost of using models like GPT-4 in non-English workflows. Since tokenization (and pricing) is optimized for English, using Lara allows translation to take place before hitting the LLM, meaning that only the translated English content is processed. This improves cost efficiency and supports competitive scalability for global enterprises.
</details>

## 🛠 Available Tools

### Translation Tools

<details>
<summary><strong>translate</strong> - Translate text between languages</summary>

**Inputs**:
- `text` (array): An array of text blocks to translate, each with:
    - `text` (string): The text content
    - `translatable` (boolean): Whether this block should be translated
- `source` (string, optional): Source language code (e.g., 'en-EN')
- `target` (string): Target language code (e.g., 'it-IT')
- `context` (string, optional): Additional context to improve translation quality
- `instructions` (string[], optional): Instructions to adjust translation behavior
- `source_hint` (string, optional): Guidance for language detection

**Returns**: Translated text blocks maintaining the original structure
</details>

### Translation Memories Tools

The following tools allow you to manage translation memories for advanced workflows:

<details>

<summary><strong>list_memories</strong> - List saved translation memories</summary>

**Returns**: Array of memories and their details
</details>

<details>
<summary><strong>create_memory</strong> - Create a new translation memory</summary>

**Inputs**:
- `name` (string): Name of the new memory
- `external_id` (string, optional): ID of the memory to import from MyMemory (e.g., 'ext_my_[MyMemory ID]')

**Returns**: Created memory data
</details>

<details>
<summary><strong>update_memory</strong> - Update translation memory name</summary>

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
- `tuid` (string, optional): Translation Unit unique identifier
- `sentence_before` (string, optional): Context sentence before
- `sentence_after` (string, optional): Context sentence after

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
- `tuid` (string, optional): Translation Unit unique identifier
- `sentence_before` (string, optional): Context sentence before
- `sentence_after` (string, optional): Context sentence after

**Returns**: Removed translation details
</details>

<details>
<summary><strong>import_tmx</strong> - Import a TMX file into a memory</summary>

**Inputs**:
- `id` (string): ID of the memory to update
- `content` (string): Content of the tmx to import
- `gzip` (boolean): Indicates if the file is compressed (.gz)

**Returns**: Import details
</details>

<details>
<summary><strong>check_import_status</strong> - Checks the status of a TMX file import</summary>

**Inputs**:
- `id` (string): The ID of the import job

**Returns**: Import details
</details>

## 🚀 Getting Started

### 📋 Requirements

- Lara Translate API Credentials
    - To get them you can refer to the [Official Documentation](https://developers.laratranslate.com/docs/getting-started#step-3---configure-your-credentials)
- An LLM client that supports Model Context Protocol (MCP), such as Claude Desktop, Cursors, or GitHub Copilot
- NPX or Docker (depending on your preferred installation method)

### 🔌 Installation

#### Introduction
Lara Translate MCP Server can be installed and then started using STDIO or HTTP. Each transport layer has its own strengths.
- The STDIO transport layer is better suited for local deployments and personal use, and is straightforward to configure and use.
- Multiple clients can connect to the same server. Additional configuration (such as firewall settings) might be needed.

Lara Translate MCP supports multiple installation methods, including NPX and Docker for both transports. 
You will find below two practical examples to set up both a STDIO and an HTTP server for Lara Translate MCP.

---

#### 🖥️ STDIO Server
In the below example we'll use NPX.

**Step 1**: Open your client's MCP configuration JSON file with a text editor, then copy and paste the following snippet:
```
{
  "mcpServers": {
    "lara-translate": {
      "command": "npx",
      "args": [
        "-y",
        "@translated/lara-mcp@latest"
      ],
      "env": {
        "LARA_ACCESS_KEY_ID": "<YOUR_ACCESS_KEY_ID>",
        "LARA_ACCESS_KEY_SECRET": "<YOUR_ACCESS_KEY_SECRET>"
      }
    }
  }
}
```
**Step 2**: Replace  `<YOUR_ACCESS_KEY_ID>`  and  `<YOUR_ACCESS_KEY_SECRET>`  with your Lara Translate API credentials (refer to the  [Official Documentation](https://developers.laratranslate.com/docs/getting-started#step-3---configure-your-credentials)  for details).

**Step 3**: Restart your MCP client.

---

#### 🌐 Web server
In the below example we'll use Docker.

**Step 1**: Start the HTTP server by opening your terminal and typing:
```
docker run translatednet/lara_mcp:latest -e TRANSPORT=http
```
**Step 2**: Open your client’s MCP configuration JSON file with a text editor, then copy and paste the following snippet:
```
{
  "mcpServers":{
    "lara-translate":{
      "url":"http://localhost:3000/mcp",
      "headers":{
        "x-lara-api-id":"<YOUR_ACCESS_KEY_ID>",
        "x-lara-api-secret":"<YOUR_ACCESS_KEY_SECRET>"
      }
    }
  }
}
```
**Step 3**: Replace  `<YOUR_ACCESS_KEY_ID>`  and  `<YOUR_ACCESS_KEY_SECRET>`  with your Lara Translate API credentials (refer to the  [Official Documentation](https://developers.laratranslate.com/docs/getting-started#step-3---configure-your-credentials)  for details).

#### Verifying the installation
After restarting your MCP client, you should see Lara Translate MCP in the list of available MCPs.

> The method for viewing installed MCPs varies by client. Please consult your MCP client's documentation.

To verify that Lara Translate MCP is working correctly, try translating with a simple prompt:

```
Translate with Lara "Hello world" to Spanish
```

Your MCP client will begin generating a response. If Lara Translate MCP is properly installed and configured, your client will either request approval for the action or display a notification that Lara Translate is being used.

### ⚙️ Environment Variables

You can customize the MCP Server installation by setting the following environment variables **before** starting the server:

| Variable                   | Type    | Default     | Example              | Description                                                                 |
|----------------------------|---------|-------------|----------------------|-----------------------------------------------------------------------------|
| `TRANSPORT`                | string  | `stdio`     | `http`               | Sets the transport layer. Use `http` for HTTP server, `stdio` for STDIO server. |
| `HOST`                     | string  | `0.0.0.0`   | `127.0.0.1`          | Network interface the server should bind to.                                |
| `PORT`                     | number  | `3000`      | `80`                 | Port the server should listen on.                                           |
| `LARA_ACCESS_KEY_ID`       | string  | *(empty)*   | `MY_ACCESS_KEY_ID`   | Lara Translate API access key ID. Used only in STDIO mode.                  |
| `LARA_ACCESS_KEY_SECRET`   | string  | *(empty)*   | `MY_ACCESS_KEY_SECRET` | Lara Translate API secret access key. Used only in STDIO mode.            |

## 🧩 Installation Engines

### 🖥️ STDIO Server

<details>
<summary><strong>Option 1: Using NPX</strong></summary>

This option requires Node.js to be installed on your system.

1. Add the following to your MCP configuration file:
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

### 🌐 Web server

<details>
<summary><strong>Option 1: Using Docker</strong></summary>

This option requires Docker to be installed on your system.

1. Start the HTTP server by opening your terminal and typing:
```
docker run translatednet/lara-mcp:latest -e TRANSPORT=http
```
2. Open your client’s MCP configuration JSON file with a text editor, then copy and paste the following snippet:
```
{
  "mcpServers":{
    "lara-translate":{
      "url":"http://localhost:3000/mcp",
      "headers":{
        "x-lara-api-id":"<YOUR_ACCESS_KEY_ID>",
        "x-lara-api-secret":"<YOUR_ACCESS_KEY_SECRET>"
      }
    }
  }
}
```
3. Replace  `<YOUR_ACCESS_KEY_ID>`  and  `<YOUR_ACCESS_KEY_SECRET>`  with your Lara Translate API credentials.
</details>

<details>
<summary><strong>Option 2: Building from Source</strong></summary>

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

4. Start the server
```bash
docker run lara-mcp -e TRANSPORT=http
```

5. Add the following to your MCP configuration file:
```json
{
  "mcpServers":{
    "lara-translate":{
      "url":"http://localhost:3000/mcp",
      "headers":{
        "x-lara-api-id":"<YOUR_ACCESS_KEY_ID>",
        "x-lara-api-secret":"<YOUR_ACCESS_KEY_SECRET>"
      }
    }
  }
}
```

6. Replace `<YOUR_ACCESS_KEY_ID>` and `<YOUR_ACCESS_KEY_SECRET>` with your actual credentials.
</details>


## 💻 Popular Clients that supports MCPs 

> For a complete list of MCP clients and their feature support, visit the [official MCP clients page](https://modelcontextprotocol.io/clients).

| Client                                                            | Description                                          |
|-------------------------------------------------------------------|------------------------------------------------------|
| [Claude Desktop](https://claude.ai/download)                      | Desktop application for Claude AI                    |
| [Aixplain](https://aixplain.com/)                                 | Production-ready AI Agents                           |
| [Cursor](https://www.cursor.com/)                                 | AI-first code editor                                 |
| [Cline for VS Code](https://github.com/cline/cline)               | VS Code extension for AI assistance                  |
| [GitHub Copilot MCP](https://github.com/VikashLoomba/copilot-mcp) | VS Code extension for GitHub Copilot MCP integration |
| [Windsurf](https://windsurf.com/editor)                           | AI-powered code editor and development environment   |

## 🆘 Support

- For issues with Lara Translate API: Visit [Lara Translate API and Integrations Support](https://support.laratranslate.com)
- For issues with this MCP Server: Open an issue on [GitHub](https://github.com/translated/lara-mcp/issues)
