---
title: "Use Siftdog with LangChain and the Tavily SDK"
description: "Keep your Tavily code and point it at a self-hosted Siftdog server: tavily-python (sync and async) and langchain-tavily, with one extra argument."
pubDate: 2026-09-28
tags: ["langchain", "tavily", "python"]
faq:
  - q: "Do I need to change my Tavily code?"
    a: "Only the client setup: pass api_base_url pointing at your Siftdog server. Search, extract, crawl and map calls stay the same."
  - q: "Which versions were tested?"
    a: "tavily-python 0.8.4 (search, extract, crawl and map, sync and async) and langchain-tavily 0.2.18 (search and extract)."
  - q: "What about answers (include_answer)?"
    a: "Siftdog writes answers with Claude when the server has ANTHROPIC_API_KEY set. Without it, requests that ask for an answer return an error instead of an empty answer."
---

**In short:** add `api_base_url` to the client. Everything else stays the same.

## tavily-python

```python
from tavily import TavilyClient

client = TavilyClient(api_key="your-siftdog-key", api_base_url="http://localhost:8000")

client.search("what is BM25", search_depth="advanced", max_results=5)
client.extract(urls=["https://en.wikipedia.org/wiki/Okapi_BM25"])
client.crawl("https://docs.python.org/3/library/asyncio.html", max_depth=1, limit=10)
client.map("https://docs.python.org/3/library/asyncio.html", max_depth=1)
```

The async client works the same way:

```python
from tavily import AsyncTavilyClient

client = AsyncTavilyClient(api_key="your-siftdog-key", api_base_url="http://localhost:8000")
results = await client.search("python asyncio")
```

## LangChain

With [`langchain-tavily`](https://github.com/tavily-ai/langchain-tavily):

```python
from langchain_tavily import TavilyExtract, TavilySearch

search = TavilySearch(
    max_results=5, tavily_api_key="your-siftdog-key", api_base_url="http://localhost:8000"
)
search.invoke({"query": "what is BM25 ranking"})

extract = TavilyExtract(tavily_api_key="your-siftdog-key", api_base_url="http://localhost:8000")
extract.invoke({"urls": ["https://example.com"]})
```

These are regular LangChain tools, so they plug into agents like the originals.

## Notes

- **The key** is any string when the server's `API_KEYS` is empty, or one of those keys when it's set.
- **Scores** come from BM25 blended with the search engines' order, so they differ from Tavily's.
- **Not implemented:** Tavily's `/research` endpoint.

New to Siftdog? Start with [how to self-host a Tavily alternative](/blog/self-host-tavily-alternative/).
