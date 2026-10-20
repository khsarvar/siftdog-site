---
title: "Add web search to Claude Desktop with a self-hosted MCP server"
description: "Connect Claude Desktop to Siftdog over stdio for web search, extraction, crawling, and site maps. Search needs SearXNG; the other tools do not."
pubDate: "2026-10-20"
tags:
  - "mcp"
  - "tutorial"
  - "self-hosted"
faq:
  - q: "Do I need an API key for web search?"
    a: "No search API key is required. Siftdog uses SearXNG for search; you can optionally configure Siftdog API keys for a separate server setup."
  - q: "Can I use the other tools without SearXNG?"
    a: "Yes. Extraction, crawling, and site mapping do not need SearXNG; only `siftdog_search` does."
  - q: "Is this the setup for a remote Siftdog server?"
    a: "No. This config runs Siftdog locally over stdio. For a running server, use the `/mcp` HTTP endpoint and a compatible connection method."
---

**In short:** add Siftdog to Claude Desktop’s `claude_desktop_config.json` as a local stdio server. Claude gets four read-only tools; set `SEARXNG_URL` if you want web search, while extraction, crawling, and mapping work without it.

## What Claude gets

Siftdog exposes four read-only MCP tools:

| Tool | Use it to |
|---|---|
| `siftdog_search` | Find web pages and return ranked results |
| `siftdog_extract` | Get clean content from URLs you provide |
| `siftdog_crawl` | Fetch pages from a site |
| `siftdog_map` | List a site’s URLs without fetching page content |

Search runs through your SearXNG instance. Siftdog does not require a search API key.

## Add Siftdog to Claude Desktop

1. Install [uv](https://docs.astral.sh/uv/) so Claude Desktop can run `uvx`.
2. Open Claude Desktop’s `claude_desktop_config.json` and add this entry under `mcpServers`:

```json
{
  "mcpServers": {
    "siftdog": {
      "command": "uvx",
      "args": ["siftdog", "mcp"],
      "env": {
        "SEARXNG_URL": "http://your-searxng:8080"
      }
    }
  }
}
```

Replace `http://your-searxng:8080` with the address of a SearXNG instance reachable from your computer. If you only need extraction, crawling, or mapping, you can remove the `SEARXNG_URL` entry. The search tool will need it when you want web results.

Save the file and restart Claude Desktop. Then ask Claude to use `siftdog_search` for a web query or `siftdog_extract` to read a URL.

## Keep the setup local

This configuration starts Siftdog as a local process using stdio; it does not point Claude Desktop at a hosted Siftdog service. You can review the [Siftdog repository](https://github.com/khsarvar/siftdog) for the full setup, including how to run SearXNG and Siftdog together with Docker Compose.

If you’re connecting to a Siftdog server that is already running, use its `/mcp` endpoint instead of this stdio configuration. For the equivalent local setup in Claude Code, see [Add self-hosted web search to Claude Code with MCP](/blog/add-web-search-to-claude-code/).

## Limits

The search tool depends on SearXNG and the public search engines it queries, so upstream rate limits can affect results. Siftdog extracts static HTML; it does not render JavaScript pages. If you need JavaScript rendering or a broader scraping platform, compare alternatives such as Firecrawl or crw.
