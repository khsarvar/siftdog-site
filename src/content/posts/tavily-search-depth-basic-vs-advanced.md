---
title: "Tavily search_depth Basic vs Advanced, Explained"
description: "Understand what basic and advanced search_depth do in Siftdog, how chunks_per_source fits in, and when the extra page-fetching time may be worthwhile."
pubDate: "2026-10-27"
tags:
  - "tavily"
  - "tutorial"
  - "self-hosted"
faq:
  - q: "Does advanced search always return better results?"
    a: "No. It gives Siftdog page content to rank, which can help surface relevant passages, but the outcome depends on the query and the pages returned."
  - q: "Does basic search fetch pages?"
    a: "The documented extra page-fetching and chunk-ranking step is for advanced search. Basic avoids that step."
  - q: "What does chunks_per_source control?"
    a: "It sets how many relevant chunks Siftdog can return from each source in advanced search. Choose a value that fits the context your application can handle."
---

**In short:** `basic` search is the lighter option. `advanced` fetches the result pages and BM25-ranks their content chunks, which can make useful passages easier to find but adds work—and can add latency.

## What changes between basic and advanced

Both modes search through SearXNG. The key difference is what Siftdog does with the results afterward.

- **Basic:** Siftdog uses the search results and blends BM25 relevance with the upstream engine’s order. It skips the advanced page-fetching and chunk-ranking step.
- **Advanced:** Siftdog fetches each result page, extracts its content, divides that content into chunks, and returns the most relevant chunks using BM25 ranking.

A chunk is a portion of a page’s content, rather than the whole page. This can help when a page covers several topics and only one passage answers your query. The trade-off is that Siftdog must fetch and process pages, so advanced search does more work.

## Choose a search depth

Use `basic` when you want a quicker, lighter search or when the result titles and snippets are enough to decide which pages matter. Use `advanced` when you want Siftdog to inspect page content and return passages ranked for relevance.

Set the depth in the same `/search` request:

```json
{
  "query": "how does BM25 rank documents",
  "search_depth": "advanced",
  "chunks_per_source": 2
}
```

`chunks_per_source` controls how many relevant chunks Siftdog returns from each source. Keep the number modest if your application has a limited context window; increase it when you need more of each page’s relevant content. The parameter is listed for `/search`; this example does not assume a default value.

## What the benchmark shows

In Siftdog’s 45-query benchmark run on September 25, 2026, advanced mode found answers to all 25 factual questions, compared with 24 in basic mode. Both modes returned official documentation for 9 of 10 technical questions, while advanced ranked an official docs result first in 7 cases versus 3 for basic.

| Siftdog result | Basic | Advanced |
|---|---:|---:|
| Factual answers found | 24 / 25 | 25 / 25 |
| Official docs ranked first | 3 / 10 | 7 / 10 |
| Median latency | 1.61 s | 2.19 s |

Treat these as results from one small run, not a guarantee. Some upstream search engines were rate-limiting the test machine, and results can change. The benchmark suggests a quality-versus-time trade-off, but your queries and SearXNG setup may behave differently.

## Limits

Advanced search depends on Siftdog being able to fetch the result pages. It does not add JavaScript rendering, and it cannot guarantee that a page’s content will be available or answer your query. If you only need to inspect known URLs, use `/extract`; if you need a broad site traversal, use `/crawl` or `/map` instead. See the [Siftdog repository](https://github.com/khsarvar/siftdog) for the API details.
