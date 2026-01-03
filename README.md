# Tiddly MCP

Tiddly MCP is a [Model Context Protocol](https://modelcontextprotocol.io/)
plugin for [TiddlyWiki](https://tiddlywiki.com/) that lets you connect AI agents
to your TiddlyWiki.

**WARNING:** This plugin is a work in progress.

This plugin is tested and works with:
* [Gemini CLI](https://geminicli.com/)
* [Claude Code](https://code.claude.com/docs/en/overview)
* [Claude](https://claude.ai/)
* [Simtheory](https://simtheory.ai/)

The plugin only supports server (Node.JS-hosted) versions of TiddlyWiki.

This plugin provides the following tools to AI agents via MCP:

| Name | Description | Arguments |
| ---- | ----------- | --------- |
| `list_tiddlers` | List all tiddlers or filter them using a [filter expression](https://tiddlywiki.com/static/Filters.html). | `filter`, `limit`, `includeSystem`, `includeDetails` |
| `read_tiddler` | Read a tiddler by title. | `title` |
| `search_tiddlers` | Search for tiddlers containing specific text. | `query`, `field`, `caseSensitive` |
| `write_tiddler` | Create or update a tiddler by title. | `title`, `text`, `tags`, `type`, `username` |
| `delete_tiddler` | Deletes a tiddler by title. | `title` |

The plugin defaults to **read only** mode. The update and delete tiddler tools are off by default.

# Installation

**This plugin only works with server (hosted on Node.JS) TiddlyWikis.**

1. Drag and drop `$__plugins_rryan_tiddly-mcp.json` into your **Node.JS-hosted**
   TiddlyWiki and import the tiddler, or copy the `tiddly-mcp` folder into your
   TiddlyWiki plugin path.
1. Open the plugin configuration and customize the port and other settings.
1. Restart your server and confirm you see
   `[MCP] TiddlyWiki MCP Server started on port XXXX` in your logs.

## Authentication

**For now, we recommend not exposing this MCP server to the Internet.** You can
use the plugin locally with Gemini CLI, Claude Code, or Claude Desktop without
any security risks.

If you do expose the plugin to the Internet, we recommend:
* Set it up behind a reverse proxy, just like your Node.JS-hosted TiddlyWik is.
* Use HTTP Basic Authentication to protect access. Most clients support custom
  headers that allow you to provide a `Authentication: Basic asdf1234`
  authentication header.
* Set the CORS allowed hosts to the domain name you are hosting it on.
* Use a path other than `https://example.com/mcp` to avoid attackers scanning
  for MCP servers.

# Developing

To build the plugin JSON and folder:

```bash
pnpm install
pnpm build:folder
```

To run the tests:

```bash
pnpm run test
```

# Acknowledgements

* This plugin was initially authored by Claude Code and Gemini CLI.
* Thanks to https://github.com/tiddly-gittly/Modern.TiddlyDev for the nice
  TypeScript starter kit for TiddlyWiki plugin development.
