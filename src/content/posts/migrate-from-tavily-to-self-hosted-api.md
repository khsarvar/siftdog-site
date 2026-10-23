---
title: "Migrating from Tavily to a Self-Hosted API: What Changes"
description: "Point Tavily-compatible code at Siftdog, then check ranking differences, ignored parameters, and endpoints you’ll need to replace."
pubDate: "2026-10-23"
tags:
  - "tavily"
  - "self-hosted"
  - "tutorial"
faq:
  - q: "Do I have to rewrite my Tavily Python client code?"
    a: "For Siftdog’s `/search`, `/extract`, `/crawl`, and `/map` endpoints, usually not. Point the client’s `api_base_url` at your Siftdog server and test the features your app relies on."
  - q: "Will Siftdog honor Tavily crawl instructions?"
    a: "No. Siftdog accepts `instructions` for crawl and map requests, but ignores the value. Use path and domain filters to constrain traversal instead."
  - q: "What if my app uses Tavily `/research`?"
    a: "That endpoint is not implemented in Siftdog. Keep that workflow on Tavily or build and operate a separate research workflow."
---

**In short:** migrating often means changing `api_base_url`, not rewriting your Tavily client. But check ranking expectations, ignored parameters, and any use of `/research` before switching production traffic.

## Check what your app calls

List the endpoints and options your application actually uses. Siftdog provides Tavily-compatible `/search`, `/extract`, `/crawl`, and `/map` endpoints with matching request and response shapes. The official Tavily Python client and LangChain integration can target Siftdog by changing the base URL.

The Tavily `/research` endpoint is not implemented. If your code calls it, this is not a base-URL-only migration: keep that call on Tavily or replace the workflow separately.

## Change the base URL

For the Python SDK, point `api_base_url` at your Siftdog server:

```python
from tavily import TavilyClient

client = TavilyClient(
    api_key="your-siftdog-key",
    api_base_url="http://localhost:8000",
)

results = client.search("your test query", search_depth="advanced", max_results=5)
```

Start the Siftdog stack with Docker Compose if you have not already:

```bash
git clone https://github.com/khsarvar/siftdog && cd siftdog
cp .env.example .env
 docker compose up
```

Remove the extra leading space before `docker` if you copy the command as a shell block. If `API_KEYS` is empty, authentication is disabled; otherwise, supply a configured key. For LangChain and more SDK examples, see [Use Siftdog with LangChain and the Tavily SDK](/blog/siftdog-with-langchain-and-tavily-sdk/).

## Recheck search quality

Compatible request shapes do not guarantee identical rankings. Siftdog ranks results with BM25 blended with the upstream engine’s order; advanced search fetches pages and returns relevant chunks. Hosted Tavily uses neural reranking. Compare the results on queries that matter to your application, especially if downstream prompts assume a particular ordering or relevance score.

Siftdog gets search results through SearXNG, so you also operate the search stack. That avoids a search API key, but public search engines can rate-limit or CAPTCHA your SearXNG instance. Test search behavior under your expected workload before moving all traffic.

## Review parameters and endpoints

Do not assume every accepted Tavily parameter has the same effect. Siftdog accepts `instructions` for crawl and map, but ignores them. It also accepts `include_image_descriptions` for search, but ignores it. Remove reliance on these options or change your application so it does not expect their effects.

Then test each endpoint your app uses: search, extract, crawl, and map. Verify the returned fields and your own downstream behavior—not just whether the request succeeds. The [Siftdog with LangChain and Tavily SDK guide](/blog/siftdog-with-langchain-and-tavily-sdk/) covers those client integrations.

## Limits

A self-hosted replacement means you run and monitor Siftdog and SearXNG. Choose hosted Tavily if you do not want to operate that infrastructure, need its neural reranking, or depend on `/research`. Choose Siftdog when you want the four compatible endpoints on infrastructure you control and are willing to validate the differences.
