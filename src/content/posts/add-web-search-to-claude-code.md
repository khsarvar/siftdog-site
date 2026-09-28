---
title: "Add self-hosted web search to Claude Code with MCP"
description: "Give Claude Code web search, page extraction and crawling from your own machine with Siftdog's MCP server. One command, no search API key."
pubDate: 2026-09-28
tags: ["mcp", "claude-code", "tutorial"]
faq:
  - q: "Do I need a search API key?"
    a: "No. Siftdog gets search results through SearXNG, which queries public search engines. Extract, crawl and map don't need search at all."
  - q: "Where do my searches go?"
    a: "From your machine through your SearXNG instance to public search engines. There is no Siftdog service or paid search API in between."
  - q: "Does it work with Claude Desktop or Cursor?"
    a: "Yes. Any MCP client can run the same command (uvx siftdog mcp) or connect to a running Siftdog server at /mcp."
---

**In short:** one command gives Claude Code four web tools that run on your machine.

```bash
claude mcp add siftdog -- uvx siftdog mcp
```

## What you get

| Tool | Use it to |
|---|---|
| `siftdog_search` | search the web and get ranked results with the relevant content |
| `siftdog_extract` | read pages you already have URLs for (1–20 at a time) |
| `siftdog_crawl` | read many pages of one site |
| `siftdog_map` | list a site's URLs without fetching them |

All four are read-only.

## Option 1: run it locally

You need [uv](https://docs.astral.sh/uv/). Extract, crawl and map work right away. Search needs a SearXNG instance, which you can start with Siftdog's config:

```bash
git clone https://github.com/khsarvar/siftdog && cd siftdog
docker run -d -p 8080:8080 -e SEARXNG_SECRET=$(openssl rand -hex 16) \
  -v "$PWD/docker/searxng/settings.yml:/etc/searxng/settings.yml:ro" searxng/searxng
```

Then add Siftdog with the SearXNG address:

```bash
claude mcp add siftdog -e SEARXNG_URL=http://localhost:8080 -- uvx siftdog mcp
```

## Option 2: connect to a running server

If you run the full stack with Docker Compose, connect over HTTP instead:

```bash
docker compose up -d
claude mcp add --transport http siftdog http://localhost:8000/mcp
```

If the server has `API_KEYS` set, add `--header "Authorization: Bearer <key>"`.

## Check it

```bash
claude mcp get siftdog
```

It should show **✔ Connected**. Then ask Claude something like *"Use siftdog to find what's new in Python 3.14, with sources."*

## Tips

- **Large sites:** map first, then extract or crawl only the paths you need.
- **Context:** page content is cut at 4,000 characters per page by default (`max_chars`).
- **Rate limits:** public search engines block heavy bursts. If every engine is blocked, the tool returns an error naming them instead of empty results.

## Other MCP clients

Claude Desktop, Cursor and most clients take the same command as JSON:

```json
{
  "mcpServers": {
    "siftdog": {
      "command": "uvx",
      "args": ["siftdog", "mcp"],
      "env": { "SEARXNG_URL": "http://localhost:8080" }
    }
  }
}
```
