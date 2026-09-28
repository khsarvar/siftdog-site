---
title: "Siftdog vs Firecrawl vs crw: self-hosted web search for AI agents"
description: "An honest comparison of three self-hostable web search and crawling APIs for AI agents: licenses, APIs, JavaScript rendering, MCP support and when to pick each."
pubDate: 2026-09-28
tags: ["comparison", "firecrawl", "crw"]
faq:
  - q: "Which one is Tavily-compatible?"
    a: "Siftdog. It serves Tavily's /search, /extract, /crawl and /map with the same fields, so Tavily clients work by changing the base URL. Firecrawl and crw have their own APIs."
  - q: "Which one renders JavaScript?"
    a: "Firecrawl and crw (crw uses Lightpanda with a Chrome fallback). Siftdog fetches static HTML only."
  - q: "Which license is most permissive?"
    a: "Siftdog is MIT. Firecrawl and crw are AGPL-3.0, which requires sharing source for modified versions offered as a network service."
---

**In short:** all three are self-hostable and ship an MCP server. Pick **Siftdog** for a Tavily-compatible API under MIT, **Firecrawl** or **crw** when you need JavaScript-rendered pages.

## At a glance

| | Siftdog | Firecrawl | crw |
|---|---|---|---|
| License | MIT | AGPL-3.0 | AGPL-3.0 |
| API | Tavily-compatible | own API | own API |
| Search source | SearXNG | — | SearXNG (bundled) |
| JavaScript rendering | no (static HTML) | yes | yes (Lightpanda, Chrome fallback) |
| MCP server | yes (stdio and HTTP) | yes | yes |
| Hosted option | planned ([waitlist](/hosted/)) | yes | yes |
| Language | Python | TypeScript | Rust |

Facts from each project's own repository and docs, September 2026.

## When to pick each

**Siftdog** if you already use Tavily or its SDKs and want the same API on your own servers, or you need a permissive MIT license. It's a small Python service; search comes from SearXNG, so there's no search API key.

**Firecrawl** if you need a full scraping platform: JavaScript-heavy sites, browser interaction before extraction, and a large feature set. It's the most widely used of the three.

**crw** if you want JavaScript rendering in a single binary of about 6 MB, and AGPL fits your plans.

## How we compare with Tavily

We benchmarked Siftdog against Tavily itself on 45 queries: both found all 25 factual answers in advanced mode, and Siftdog returned official documentation for 9 of 10 technical questions. [Full results and caveats](/benchmark/).

## Try Siftdog

```bash
git clone https://github.com/khsarvar/siftdog
cd siftdog
docker compose up
```

Or add it to Claude Code: [one-command MCP setup](/blog/add-web-search-to-claude-code/).
