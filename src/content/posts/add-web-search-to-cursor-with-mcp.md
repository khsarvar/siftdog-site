---
title: "Add web search to Cursor with an MCP server"
description: "Connect Cursor to Siftdog for self-hosted web search, page extraction and crawling. Set it up locally or connect to a running server."
pubDate: "2026-09-28"
tags:
  - "mcp"
  - "tutorial"
  - "self-hosted"
faq:
  - q: "Can I use Siftdog in Cursor without SearXNG?"
    a: "Yes, for page extraction, crawling and mapping. Web search needs a SearXNG instance with JSON output enabled."
  - q: "Do I need a search API key?"
    a: "No. Siftdog uses SearXNG for search results. If you enable Siftdog's optional API authentication, your Cursor connection will need one of your API_KEYS."
  - q: "Should I use stdio or HTTP?"
    a: "Use stdio if Cursor can start Siftdog locally and you already have a reachable SearXNG instance. Use HTTP if you're running the Siftdog and SearXNG stack with Docker Compose."
---

**In short:** Add Siftdog to Cursor's MCP configuration to give Agent web search, page extraction, crawling and site mapping. Use a local stdio process or connect to a running Siftdog server; neither needs a search API key.

## What web tools does Cursor get?

| Tool | Use it to |
|---|---|
| `siftdog_search` | Find web results and relevant page content |
| `siftdog_extract` | Read a page when you already have its URL |
| `siftdog_crawl` | Collect content from pages across a site |
| `siftdog_map` | List a site's URLs without returning page content |

These are read-only tools from [Siftdog](https://github.com/khsarvar/siftdog). You can ask Cursor Agent to use a tool by name rather than hoping it chooses one. Cursor may ask you to approve a tool call before it runs.

## Run Siftdog locally in Cursor

1. Install `uv` so Cursor can run `uvx siftdog mcp`. The stdio server does not require a separately running Siftdog API server. To use **search**, you do need a reachable SearXNG instance with JSON output enabled; extraction, crawling and mapping work without one.

2. Create `.cursor/mcp.json` in your project, or use `~/.cursor/mcp.json` to make the tool available across projects. Cursor supports both locations; a project entry takes priority if you use the same server name in both.

```json
{
  "mcpServers": {
    "siftdog": {
      "command": "uvx",
      "args": ["siftdog", "mcp"],
      "env": { "SEARXNG_URL": "http://your-searxng:8080" }
    }
  }
}
```

Replace the example address with one Cursor's machine can reach. If you only need extract, crawl and map, omit the `env` entry. Save the file and restart Cursor so it loads the configuration. Cursor documents `command`, `args` and `env` for local MCP servers.

## Connect Cursor to a running Siftdog server

If you don't already run SearXNG, Docker Compose is the simpler way to get search working: it starts Siftdog alongside SearXNG. See the [self-hosting guide](/blog/self-host-tavily-alternative/) for the broader API setup.

```bash
git clone https://github.com/khsarvar/siftdog && cd siftdog
docker compose up
```

Replace the stdio entry in your Cursor MCP file with an HTTP entry. Use `localhost` for this local setup: Siftdog's `/mcp` endpoint restricts which hostnames it accepts.

```json
{
  "mcpServers": {
    "siftdog": {
      "url": "http://localhost:8000/mcp"
    }
  }
}
```

Cursor supports a `url` for remote MCP connections and a `headers` object when authentication is required. If you set Siftdog's `API_KEYS`, add `"headers": {"Authorization": "Bearer <key>"}` inside the `siftdog` entry. Keep a file containing a real key out of a shared repository.

## Check web search in Cursor

Restart Cursor, open Agent chat and ask: *“Use siftdog_search to find the official Python documentation for virtual environments, then give me the URL.”* You can check whether the server is enabled in Customize; Cursor lets you toggle MCP servers there.

If Cursor cannot connect, check the MCP Logs in its Output panel and confirm that the configured server is running or that `uvx` is available to Cursor. If extraction works but search does not, check `SEARXNG_URL` and whether SearXNG has JSON output enabled. If every upstream search engine fails, Siftdog reports an error rather than presenting an empty result list.

## Limits

Siftdog extracts static HTML; it does not render JavaScript-heavy pages. Search also depends on public search engines through SearXNG, which may rate-limit bursts of requests. For a setup that avoids running the stack, a hosted search service may be a better fit. If you also use Claude Code, the [Claude Code MCP guide](/blog/add-web-search-to-claude-code/) covers the same Siftdog tools in that client.
