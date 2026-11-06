---
title: "Recent news search for LLM apps with Siftdog"
description: "Use Siftdog’s news topic and time range to find recent coverage for an LLM app, and understand what upstream search engines can affect."
pubDate: "2026-11-03"
tags:
  - "tutorial"
  - "self-hosted"
  - "tavily"
faq:
  - q: "Does news search require an API key?"
    a: "No search API key is needed. Siftdog uses SearXNG to query public search engines."
  - q: "Does `time_range` guarantee every result is recent?"
    a: "No. It narrows the search, but you should check the result and article dates before relying on them."
  - q: "What if news search returns an error?"
    a: "If every SearXNG engine is failing, Siftdog returns a 502 with the failing engines and reasons. Check your SearXNG configuration and upstream engine status."
---

**In short:** Set `topic` to `news` and choose a `time_range` on Siftdog’s `/search` endpoint to find recent coverage for an LLM app. Results still depend on the search engines available through your SearXNG instance, so treat them as leads to verify—not a complete news feed.

## Send a news query

Siftdog accepts Tavily-compatible `/search` requests, including `topic` and `time_range`. Here’s a request for coverage from the past month:

```bash
curl -s localhost:8000/search -H "Content-Type: application/json" \
  -d '{"query": "new LLM models and releases", "topic": "news", "time_range": "month"}'
```

The `month` value is a useful starting window for a recurring digest or a broad scan. Tavily documents `time_range` as a way to filter results by date; the request shape is compatible with Siftdog. If you set `API_KEYS`, add an `Authorization: Bearer <key>` header. The [Siftdog repository](https://github.com/khsarvar/siftdog) has the Docker Compose setup, including SearXNG.

## Use results in your app

Treat search results as candidate sources for your model to summarize or compare. For a lightweight news panel, start with the default search depth. When you need more page context, use `search_depth: "advanced"`: Siftdog fetches each page and returns its most relevant chunks. That extra fetching takes time, so reserve it for searches where the added context is useful.

For an article you want to inspect more closely, pass its URL to `/extract` and request clean Markdown or text. Search helps discover pages; extraction helps your app work with page content. Your app should keep the result URLs so it can show users where a summary came from.

Good fits include a weekly roundup of LLM releases, monitoring coverage of a company or research topic, and gathering recent reporting before a model answers a time-sensitive question. You can also use `include_domains` or `exclude_domains` to narrow the search to or away from particular sites. For guidance on choosing `basic` or `advanced`, see [Tavily search depth: basic vs. advanced](/blog/tavily-search-depth-basic-vs-advanced/).

## Limits

`topic: "news"` and a time range guide search; they don’t turn Siftdog into a news archive or guarantee exhaustive coverage. Check each page’s date and source before presenting a claim as current. Search results can differ with the engines enabled in SearXNG and their availability.

SearXNG queries public search engines, which can rate-limit requests or show CAPTCHAs. When every engine is failing, Siftdog returns a `502` naming the failed engines and reasons rather than an empty result list. If this happens, check your SearXNG engine configuration and avoid bursts of identical searches. See [SearXNG JSON API: enable JSON and handle rate limits](/blog/searxng-json-api-rate-limits/).

Self-hosting gives you control over the search stack, but you also run and maintain it. If you don’t want to operate infrastructure, hosted Tavily may be a better fit; if you run Siftdog, remember that its search results depend on your SearXNG setup.
