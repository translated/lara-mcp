# Lara Translate — Claude Code plugin

Official Claude Code plugin for [Lara Translate](https://laratranslate.com). Gives Claude access to Lara's translation engine, translation memories, and glossaries via the hosted MCP endpoint at `https://mcp-v2.laratranslate.com/v1`.

## Install

From inside Claude Code, open the plugin browser:

```
/plugin
```

Search for **Lara Translate** and install. The first tool call triggers a browser-based OAuth login against Lara. No API keys or local processes required.

## Usage

Ask Claude to translate something, extend a translation memory, or look up a glossary term. Available tools include translation, language detection, translation memory management, and glossary operations — Claude selects the right one based on your request.

## Advanced setup

For self-hosted or API-key-based setups (stdio transport, Docker, custom OAuth), see the full documentation in [`docs/client-setup.md`](https://github.com/translated/lara-mcp/blob/main/docs/client-setup.md).

## Support

- Issues: https://github.com/translated/lara-mcp/issues
- Email: support@laratranslate.com
