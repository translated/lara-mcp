# Lara Translate — plugin

Official plugin for [Lara Translate](https://laratranslate.com), compatible with both **Claude Code** and **Cursor**. Gives your AI assistant access to Lara's translation engine, translation memories, and glossaries via the hosted MCP endpoint at `https://mcp-v2.laratranslate.com/v1`.

## Install

### Claude Code

From inside Claude Code, open the plugin browser:

```
/plugin
```

Search for **Lara Translate** and install.

### Cursor

From inside Cursor, open the plugin browser and search for **Lara Translate**, or install directly from this repository folder.

---

The first tool call in either client triggers a browser-based OAuth login against Lara. No API keys or local processes required.

## Usage

Ask your assistant to translate something, extend a translation memory, or look up a glossary term. Available tools include translation, language detection, translation memory management, and glossary operations — the assistant selects the right one based on your request.

## Advanced setup

For self-hosted or API-key-based setups (stdio transport, Docker, custom OAuth), see the full documentation in [`docs/client-setup.md`](https://github.com/translated/lara-mcp/blob/main/docs/client-setup.md).

## Support

- Issues: https://github.com/translated/lara-mcp/issues
- Email: support@laratranslate.com
