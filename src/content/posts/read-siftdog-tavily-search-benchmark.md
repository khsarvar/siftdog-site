---
title: "Siftdog vs Tavily search benchmark: what 45 queries show"
description: "Review Siftdog’s 45-query search benchmark against Tavily, understand its limits, and reproduce the test before choosing a self-hosted search API."
pubDate: "2026-11-20"
tags:
  - "comparison"
  - "self-hosted"
  - "tavily"
faq:
  - q: "Does the benchmark prove Siftdog is better than Tavily?"
    a: "No. It reports one small run with 45 queries and notes that a difference of one or two queries may not be significant. Treat it as a useful comparison to reproduce, not a general guarantee."
  - q: "Does Siftdog really cost nothing to run?"
    a: "The benchmark reports $0 per search for Siftdog, but that excludes the server. Include your infrastructure and operating costs when comparing total cost."
  - q: "How many Tavily credits does a full reproduction use?"
    a: "The benchmark says a full run uses about 135 Tavily credits. You can also test your own smaller set of queries before running the full suite."
---

**In short:** Siftdog’s 25 September 2026 benchmark found both Siftdog and Tavily answered all 25 factual questions in advanced mode. It’s an encouraging result, not a universal verdict: the test used 45 queries, ran once, and had search-engine rate limits that affected Siftdog.

## What the benchmark tested

The run compared Siftdog 0.2.1 with Tavily on 45 queries: 25 factual questions with known answers, 10 technical questions aimed at official documentation, five news queries, and five open-ended queries. Each system returned five results in both basic and advanced mode.

Both systems were called through the official `tavily-python` client with the same arguments. Only the API base URL changed. Siftdog ran locally, while Tavily ran over the internet, so the latency results also reflect different network paths.

## What the results show

| Measure | Siftdog basic | Tavily basic | Siftdog advanced | Tavily advanced |
|---|---:|---:|---:|---:|
| Factual answers found (of 25) | 24 | 25 | 25 | 25 |
| Official docs returned (of 10) | 9 | 7 | 9 | 3 |
| Official docs ranked first (of 10) | 3 | 1 | 7 | 1 |
| Median latency | 1.61s | 1.25s | 2.19s | 2.81s |
| Errors (of 45) | 0 | 0 | 0 | 0 |
| Cost per 1,000 searches in this test | $0 | $8 | $0 | $16 |

The strongest practical signal for a developer building a documentation-aware agent is the official-docs row: Siftdog returned more official documentation pages in this run, and its advanced results ranked them first more often. That can matter when an agent needs primary technical sources rather than just a plausible answer.

Speed was mixed by mode. Tavily had the lower median in basic mode; Siftdog had the lower median in advanced mode. Both had zero errors in this sample. The reported search cost excludes Siftdog’s server, so it is not a total-cost comparison. For that, see [Tavily API pricing vs self-hosting](/blog/tavily-api-pricing-vs-self-hosting/).

## Reproduce it with your own queries

The test’s code and query set are in the repository’s `bench/` directory. The documented setup and run commands are:

```bash
pip install -r bench/requirements.txt
docker compose up -d
TAVILY_API_KEY=tvly-... python bench/run.py --delay 6
```

A full run uses about 135 Tavily credits. If that is more than you want to spend, first compare a smaller set of representative queries from your own application. Include questions where you know which pages should rank well, not just questions that are easy to answer from many sources.

## Limits

This is one run, not a controlled long-term evaluation. Some upstream search engines used by Siftdog were rate-limiting the test machine, and the benchmark warns that a difference of one or two queries is not significant. Search results can also change over time.

Before migrating, test your own queries, compare the actual URLs your agent receives, and check ranking as well as whether an answer was found. If you’re planning a migration, see [what changes when you point Tavily-compatible code at Siftdog](/blog/migrate-from-tavily-to-self-hosted-api/).
