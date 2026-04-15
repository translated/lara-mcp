# Lara Translate MCP Server

A Model Context Protocol (MCP) Server for [Lara Translate](https://laratranslate.com/translate), enabling professional translation capabilities with support for language detection, context-aware translations, translation memories, and glossaries.

[![License](https://img.shields.io/github/license/translated/lara-mcp.svg)](https://github.com/translated/lara-mcp/blob/main/LICENSE)
[![Docker Pulls](https://img.shields.io/docker/pulls/translatednet/lara-mcp.svg)](https://hub.docker.com/r/translatednet/lara-mcp)
[![npm downloads](https://img.shields.io/npm/dm/@translated/lara-mcp.svg)](https://www.npmjs.com/package/@translated/lara-mcp)

## 🌟 Highlights

- 🌐 **Professional-grade translation** powered by Lara's domain-specific Translation Language Models, trained on billions of professionally translated segments — stronger on non-English languages than general-purpose LLMs.
- 🔐 **OAuth login, zero config** — paste one URL into your MCP client, log in through your browser, and start translating. No API keys to manage.
- 🤝 **Works with major MCP clients** — Claude Desktop, Cursor, Claude Code, VS Code (GitHub Copilot), Windsurf, Cline, Continue, and more.
- 📚 **Translation memories & glossaries** — create, update, import TMX/CSV, and enforce terminology on every translation.
- 🧠 **Context-aware translations** — pass instructions, style (`faithful` / `fluid` / `creative`), per-request context, and multi-step linguistic reasoning.
- 🔒 **Privacy-first** — opt-out tracing (`no_trace`), audit logging, and input validation out of the box.
- 🏠 **Hosted or self-hosted** — connect to the managed endpoint at `mcp-v2.laratranslate.com/v1`, or run it yourself via npm, Docker, or from source.

## 📚 Table of Contents
- 🌟 [Highlights](#-highlights)
- 📖 [Introduction](#-introduction)
- 🚀 [Quick Start](#-quick-start)
- 🛠 [Available Tools](#-available-tools)
- 🔐 [Authentication](#-authentication)
- 🏠 [Self-Hosting](#-self-hosting)
- 💻 [Popular Clients that support MCPs](#-popular-clients-that-support-mcps)
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

## 🚀 Quick Start

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

Run this command in your terminal:

```bash
claude mcp add lara-translate --transport http --url https://mcp-v2.laratranslate.com/v1
```

The first time you use a Lara tool, your browser will open to authenticate.

### Other Clients

For step-by-step OAuth setup on **VS Code (GitHub Copilot)**, **Windsurf**, **Cline**, **Continue**, and more, see the **[Client Setup Guide](docs/client-setup.md)**.

If your client isn't listed, the general approach is to add the server URL (`https://mcp-v2.laratranslate.com/v1`) to your MCP config — the client will handle OAuth authentication automatically.

> For a complete list of MCP-compatible clients, visit the [official MCP clients page](https://modelcontextprotocol.io/clients).

### Verify It Works

After setup, test with a simple prompt:

```text
Translate with Lara "Hello world" to Spanish
```

Your client should invoke Lara Translate and return the translation.

## 🛠 Available Tools

### Translation Tools

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
- `glossaries` (optional string[]): Array of glossary IDs to enforce terminology (e.g., ['gls_xyz123'])
- `no_trace` (optional boolean): Privacy flag - if true, request won't be traced/logged
- `priority` (optional string): Translation priority - 'normal' or 'background'
- `timeout_in_millis` (optional number): Custom timeout in milliseconds (max 300000)
- `adapt_to` (optional string[]): Translation memory IDs for adapting the translation
- `style` (optional string): Translation style - 'faithful', 'fluid', or 'creative'
- `reasoning` (optional boolean): Enables Lara Think multi-step linguistic analysis
- `content_type` (optional string): Content type - 'text/plain', 'text/html', or 'application/xliff+xml'

**Returns**: Translated text blocks maintaining the original structure
</details>

<details>
<summary><strong>detect_language</strong> - Detect the language of a text</summary>

**Inputs**:
- `text` (string | string[]): Text or array of texts to detect (max 128 elements)
- `hint` (optional string): Hint for language detection
- `passlist` (optional string[]): Array of language codes to restrict detection to

**Returns**: Detected language, content type, and predictions with confidence scores
</details>

<details>
<summary><strong>list_languages</strong> - List supported languages</summary>

**Inputs**: None

**Returns**: Array of supported languages
</details>

### Glossaries Tools

<details>
<summary><strong>list_glossaries</strong> - List all glossaries</summary>

**Inputs**: None

**Returns**: Array of glossaries with their details (id, name, createdAt, updatedAt, ownerId)
</details>

<details>
<summary><strong>get_glossary</strong> - Get a specific glossary by ID</summary>

**Inputs**:
- `id` (string): The glossary ID (e.g., 'gls_xyz123')

**Returns**: Glossary object or null if not found
</details>

<details>
<summary><strong>create_glossary</strong> - Create a new glossary</summary>

**Inputs**:
- `name` (string): Name of the glossary (max 250 characters)

**Returns**: Created glossary data
</details>

<details>
<summary><strong>update_glossary</strong> - Update a glossary</summary>

**Inputs**:
- `id` (string): The glossary ID (e.g., 'gls_xyz123')
- `name` (string): New name for the glossary (max 250 characters)

**Returns**: Updated glossary data
</details>

<details>
<summary><strong>delete_glossary</strong> - Delete a glossary</summary>

**Inputs**:
- `id` (string): The glossary ID (e.g., 'gls_xyz123')

**Returns**: Deleted glossary data
</details>

<details>
<summary><strong>get_glossary_counts</strong> - Get term and language counts for a glossary</summary>

**Inputs**:
- `id` (string): The glossary ID (e.g., 'gls_xyz123')

**Returns**: Term and language counts
</details>

<details>
<summary><strong>add_glossary_entry</strong> - Add an entry to a glossary</summary>

**Inputs**:
- `id` (string): The glossary ID (e.g., 'gls_xyz123')
- `terms` (array): Array of terms, each with:
    - `language` (string): Language code
    - `value` (string): Term value
- `guid` (optional string): Unique identifier for the entry

**Returns**: Created glossary entry data
</details>

<details>
<summary><strong>delete_glossary_entry</strong> - Delete an entry from a glossary</summary>

**Inputs**:
- `id` (string): The glossary ID (e.g., 'gls_xyz123')
- `term` (optional object): Term to delete, with:
    - `language` (string): Language code
    - `value` (string): Term value
- `guid` (optional string): Unique identifier of the entry to delete

> At least one of `term` or `guid` must be provided.

**Returns**: Deletion confirmation
</details>

<details>
<summary><strong>import_glossary_csv</strong> - Import a CSV file into a glossary</summary>

**Inputs**:
- `id` (string): The glossary ID (e.g., 'gls_xyz123')
- `csv_content` (string): The CSV file content (max 5MB)
- `content_type` (optional string): CSV format - 'csv/table-uni' (default) or 'csv/table-multi'
- `gzip` (optional boolean): Indicates if the content is gzip compressed

**Returns**: Import job details with import ID
</details>

<details>
<summary><strong>check_glossary_import_status</strong> - Check the status of a glossary CSV import</summary>

**Inputs**:
- `id` (string): The import job ID

**Returns**: Import job status with progress information
</details>

<details>
<summary><strong>export_glossary</strong> - Export a glossary as CSV</summary>

**Inputs**:
- `id` (string): The glossary ID (e.g., 'gls_xyz123')
- `content_type` (string): Export format - 'csv/table-uni' or 'csv/table-multi'
- `source` (optional string): Source language code (required when content_type is 'csv/table-uni')

**Returns**: Exported glossary CSV content
</details>

### Translation Memories Tools

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
<summary><strong>import_tmx</strong> - Import a TMX file into a memory</summary>

**Inputs**:
- `id` (string): ID of the memory to update
- `tmx_content` (string): The content of the tmx file to upload
- `gzip` (boolean): Indicates if the file is compressed (.gz)

**Returns**: Import details
</details>

<details>
<summary><strong>check_import_status</strong> - Checks the status of a TMX file import</summary>

**Inputs**:
- `id` (string): The ID of the import job

**Returns**: Import details
</details>

## 🔐 Authentication

### OAuth 2.0 (default, hosted endpoint)

This is the method used in the [Quick Start](#-quick-start) above. You provide only the server URL in your client config — no API keys needed. Your client handles the OAuth flow automatically: it opens your browser, you log in with your Lara Translate credentials, and you're connected.

OAuth 2.0 is provided by the hosted service at `https://mcp-v2.laratranslate.com/v1`. The OAuth authorization server is not part of this repository — the code in `src/` only handles MCP tool calls authenticated via access-key headers (see [Access Key](#access-key) below). If you self-host, OAuth is not available out of the box.

For per-client OAuth setup instructions, see the **[Client Setup Guide](docs/client-setup.md)**.

For a reference description of the OAuth 2.0 flow, endpoints, and requirements of the hosted service, see the [OAuth 2.0 reference](docs/oauth.md).

### Access Key

If you prefer to authenticate with API keys instead of browser login, you can pass your credentials directly in the client config. Get your **Access Key ID** and **Secret** from [Lara Translate](https://developers.laratranslate.com/docs/getting-started#step-3---configure-your-credentials).

See the [Access Key section in the Client Setup Guide](docs/client-setup.md#alternative-access-key-authentication) for config examples.

## 🏠 Self-Hosting

Most users can connect to the hosted endpoint (`https://mcp-v2.laratranslate.com/v1`) using the [Quick Start](#-quick-start) instructions above. The options below are for running the server yourself.

### ⚠️ Security Note

**Important:** The self-hosted server uses different credential models depending on the transport:

- **STDIO mode** reads the Lara credentials from the `LARA_ACCESS_KEY_ID` and `LARA_ACCESS_KEY_SECRET` environment variables configured on the process. All requests share those credentials.
- **HTTP mode** requires each incoming request to carry its own `x-lara-access-key-id` / `x-lara-access-key-secret` headers; the server does not fall back to environment variables.

This server is designed for:
- ✅ Single-user STDIO deployments
- ✅ Trusted-environment HTTP deployments (e.g., internal tools) where clients are expected to send their own credentials

For multi-tenant scenarios, either:
- Use the hosted server at `https://mcp-v2.laratranslate.com/v1` where each client authenticates via OAuth or its own access-key headers
- Deploy separate STDIO instances per user with isolated credentials

### HTTP Server 🌐

<details>
<summary><strong>❌ Clients NOT supporting <code>url</code> configuration (e.g., Claude Desktop, OpenAI)</strong></summary>

This installation guide is intended for clients that do NOT support the url-based configuration. This option requires Node.js to be installed on your system.

> If you're unsure how to configure an MCP with your client, please refer to your MCP client's official documentation.

---

1. Open your client's MCP configuration JSON file with a text editor, then copy and paste the following snippet:

```json
{
  "mcpServers": {
    "lara": {
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

2. Replace `<YOUR_ACCESS_KEY_ID>` and `<YOUR_ACCESS_KEY_SECRET>` with your Lara Translate API credentials. Refer to the [Official Documentation](https://developers.laratranslate.com/docs/getting-started#step-3---configure-your-credentials) for details.

3. Restart your MCP client.

</details>

<details>
<summary><strong>✅ Clients supporting <code>url</code> configuration (e.g., Cursor, Continue)</strong></summary>

This installation guide is intended for clients that support the url-based configuration. These clients can connect to Lara through a remote HTTP endpoint by specifying a simple configuration object.

Some examples of supported clients include Cursor, Continue, OpenDevin, and Aider.
> If you're unsure how to configure an MCP with your client, please refer to your MCP client's official documentation.

---

1. Open your client's MCP configuration JSON file with a text editor, then copy and paste the following snippet:

```json
{
  "mcpServers": {
    "lara": {
      "url": "https://mcp-v2.laratranslate.com/v1",
      "headers": {
        "x-lara-access-key-id": "<YOUR_ACCESS_KEY_ID>",
        "x-lara-access-key-secret": "<YOUR_ACCESS_KEY_SECRET>"
      }
    }
  }
}
```

2. Replace `<YOUR_ACCESS_KEY_ID>` and `<YOUR_ACCESS_KEY_SECRET>` with your Lara Translate API credentials. Refer to the [Official Documentation](https://developers.laratranslate.com/docs/getting-started#step-3---configure-your-credentials) for details.

3. Restart your MCP client.

</details>

---

### STDIO Server 🖥️

<details>
<summary><strong>Using NPX</strong></summary>

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
<summary><strong>Using Docker</strong></summary>

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
<summary><strong>Building from Source</strong></summary>

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

## 💻 Popular Clients that support MCPs

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
