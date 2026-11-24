---
title: "Which Siftdog endpoint should your AI agent call?"
description: "Choose between search, extract, map, and crawl for an AI agent, and combine them into a focused web-retrieval workflow."
pubDate: "2026-11-24"
tags:
  - "tutorial"
  - "self-hosted"
  - "tavily"
faq:
  - q: "Can I use extract without setting up SearXNG?"
    a: "Yes. SearXNG is needed for `/search`; `/extract`, `/crawl`, and `/map` can work without it."
  - q: "Should I map a site before every crawl?"
    a: "No. Mapping helps when you need to discover or narrow down site URLs. If you already know the relevant URL or paths, you can call extract or crawl directly."
  - q: "Can one agent use all four endpoints?"
    a: "Yes. Siftdog exposes search, extract, crawl, and map through its API and MCP server, so an agent can choose based on what it needs to retrieve."
---

**In short:** Call `/search` to discover relevant pages, `/extract` to read URLs you already know, `/map` to list a site’s URLs, and `/crawl` to fetch content across a site. Choose the narrowest tool that answers the agent’s retrieval need.

## Choose the right endpoint

| If your agent needs to… | Call | What it returns |
|---|---|---|
| Find pages about a question | `/search` | Ranked web results; `advanced` depth fetches pages and returns relevant chunks |
| Read a specific page | `/extract` | Clean Markdown or text from supplied URLs |
| Discover URLs on a site | `/map` | A list of site URLs, without page content |
| Read pages across a site | `/crawl` | Page content gathered using traversal settings and filters |

This choice is about the input you have, not just the amount of content you want. A known URL points to `/extract`; a site whose relevant URLs you don’t know points to `/map` or `/crawl`.

## Use search to find pages

Use `/search` when the agent starts with a question rather than a URL. Set `query` and, if useful, narrow results with `include_domains` or `exclude_domains`. For a simple lookup, start with `basic`; choose `advanced` when fetching pages and returning relevant chunks would help. Advanced search takes longer because it fetches pages.

Search depends on SearXNG. If you’re running the Docker Compose stack, Siftdog’s setup includes it. If you’re running only the Siftdog image or installing with pip, point `SEARXNG_URL` at a SearXNG instance with JSON output enabled.

## Use extract when you already have URLs

If another tool, a user, or an earlier search step has supplied the URL, pass it to `/extract` rather than crawling the whole site. You can request Markdown or text, and extract accepts up to 20 URLs per request.

This keeps the agent’s retrieval flow explicit: first identify the page, then fetch its content. For an example of sending extracted text into a retrieval pipeline, see [Turn web pages into clean text for RAG](/blog/turn-web-pages-into-clean-text-for-rag/).

## Map first when the site is unfamiliar

Use `/map` when you need to find a site’s URLs before choosing what to read. Then use the discovered URLs to select focused extract calls, or use `/crawl` with traversal settings and path or domain filters when you want content from multiple pages.

For documentation, that often means mapping the site, selecting the relevant paths, and crawling only those pages. The [documentation crawl guide](/blog/crawl-documentation-site-to-markdown/) walks through that narrower workflow.

## Keep agent calls focused

A practical decision sequence is:

1. Start with the information available: a question, a URL, or a site.
2. Search for pages, extract a known page, or map a site to discover URLs.
3. Fetch only the pages needed, using crawl when traversal across a site is useful.
4. Pass the returned content to your own agent or LLM logic.

This avoids treating every retrieval task as a broad crawl. It also gives you a clearer place to apply domain and path filters, and to decide when search’s `advanced` depth is worth its extra fetching.

## Limits

`/extract` is for supplied URLs, not URL discovery. `/map` lists URLs but does not return page content. `/crawl` is for site traversal, so use its depth, breadth, limit, and path or domain filters to constrain what it visits. The configured `CRAWL_MAX_LIMIT` also sets a ceiling on crawl limits.

Search results come through SearXNG and public search engines, so availability can vary when upstream engines rate-limit requests. If you want a closer look at that trade-off, see [SearXNG JSON API and rate limits](/blog/searxng-json-api-rate-limits/). For the API and deployment options, see the [Siftdog repository](https://github.com/khsarvar/siftdog).
