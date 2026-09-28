---
title: "How to self-host a Tavily alternative"
description: "Run your own Tavily-compatible web search API with Siftdog and Docker Compose: search, extract, crawl and map, no search API key and no per-search fees."
pubDate: 2026-09-28
tags: ["self-hosted", "tavily", "tutorial"]
faq:
  - q: "Is Siftdog a drop-in replacement for Tavily?"
    a: "For /search, /extract, /crawl and /map, yes: same request and response fields. Scores come from BM25 rather than a neural reranker, and Tavily's /research endpoint isn't implemented."
  - q: "What does it cost to run?"
    a: "Siftdog is free and MIT licensed. You pay only for the server it runs on; there is no per-search fee and no search API key."
  - q: "What are the limits?"
    a: "It fetches static HTML (no JavaScript rendering), and public search engines rate-limit heavy bursts from one IP. For sustained volume, spread load with more SearXNG engines, proxies or several instances."
---

**In short:** clone Siftdog, run `docker compose up`, and you have the Tavily API on your own machine.

## 1. Start it

```bash
git clone https://github.com/khsarvar/siftdog
cd siftdog
docker compose up
```

This starts the API on port 8000 and a SearXNG instance for search results. OpenAPI docs are at `http://localhost:8000/docs`.

## 2. Try a search

```bash
curl -s localhost:8000/search -H "Content-Type: application/json" \
  -d '{"query": "latest python release", "search_depth": "advanced"}'
```

`basic` returns search snippets. `advanced` reads each page and returns its most relevant passages.

## 3. Point your Tavily code at it

```python
from tavily import TavilyClient

client = TavilyClient(api_key="your-siftdog-key", api_base_url="http://localhost:8000")
client.search("latest python release")
```

The same works for `extract`, `crawl` and `map`. See [using Siftdog with LangChain and the Tavily SDK](/blog/siftdog-with-langchain-and-tavily-sdk/).

## 4. Before exposing it

- **Set `API_KEYS`** in `.env` (comma-separated). Clients then send `Authorization: Bearer <key>`.
- **Keep `ALLOW_PRIVATE_NETWORKS=false`.** `/extract` and `/crawl` fetch URLs your callers choose, so private and internal addresses are blocked on every redirect and at connect time.
- **For the MCP endpoint behind a domain**, add the hostname to `MCP_ALLOWED_HOSTS`.

## What to expect

| | Siftdog | Tavily |
|---|---|---|
| Cost per 1,000 searches | $0 + your server | $8 basic, $16 advanced |
| Search API key | not needed | required |
| Ranking | BM25 + engine order | proprietary |
| JavaScript rendering | no | — |

In our [benchmark](/benchmark/), both found the answer to all 25 factual questions in advanced mode, and Siftdog returned official documentation more often.

Would rather not run servers? Join the [hosted waitlist](/hosted/).
