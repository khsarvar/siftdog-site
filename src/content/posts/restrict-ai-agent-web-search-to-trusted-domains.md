---
title: "Restrict AI Agent Web Search to Trusted Domains"
description: "Use Siftdog’s include_domains and exclude_domains search filters to narrow coding-agent results to documentation or keep selected sites out."
pubDate: "2026-10-30"
tags:
  - "tutorial"
  - "self-hosted"
  - "mcp"
faq:
  - q: "Should I use include_domains or exclude_domains for a docs-only search?"
    a: "Use include_domains when you want results limited to a known set of documentation hosts. Use exclude_domains when you want broad search but need to omit particular sites."
  - q: "Can I use these filters with the Tavily Python client?"
    a: "Yes. Point the client’s api_base_url at Siftdog and pass the search filters as arguments."
  - q: "Do search domain filters restrict what an agent can fetch later?"
    a: "No. They narrow search results; they don’t enforce an allowlist for separate extract or crawl requests."
---

**In short:** Pass `include_domains` to keep Siftdog search focused on trusted documentation, or `exclude_domains` to omit sites you don’t want. These filters narrow search results; they are not access controls for an agent’s other tools.

## Choose an allowlist or a blocklist

Use `include_domains` when you know which sites your agent should search. This is useful for coding questions where you want results from official documentation rather than a mix of forums, blogs, and other pages. For example, a Python task might use `docs.python.org` and `docs.djangoproject.com` as its allowed hosts.

Use `exclude_domains` when you want normal web search but need to leave out particular domains. This can be handy when a site tends to dominate results for a query or when you want to remove a source your team has decided not to use.

An allowlist is usually the clearer starting point for a docs-only workflow: it states what sources are in scope. Add only the hosts that fit the task, and use exact hostnames rather than assuming how subdomains are handled.

## Search official documentation only

Send the domain filter in the `/search` request body alongside the query. For example, this request limits a search to the two hosts listed:

```bash
curl -s localhost:8000/search \
  -H "Content-Type: application/json" \
  -d '{"query":"Python pathlib recursive glob","search_depth":"advanced","max_results":5,"include_domains":["docs.python.org","docs.djangoproject.com"]}'
```

If you set `API_KEYS`, include an `Authorization: Bearer <key>` header. Siftdog uses SearXNG for search, so the filter scopes the results returned by search; it does not guarantee that a particular page or answer will be found.

## Exclude selected sites

For a broader search with specific sites omitted, use `exclude_domains` instead:

```json
{
  "query": "Python pathlib recursive glob",
  "search_depth": "advanced",
  "max_results": 5,
  "exclude_domains": ["reddit.com", "medium.com"]
}
```

Treat this as a search preference, not a permanent policy about which sources are trustworthy. If your team has a defined set of sources for a task, prefer `include_domains` so that scope is explicit.

## Use the filter from a coding agent

If your agent calls Siftdog through a Tavily-compatible client, pass the same filter with the search request:

```python
from tavily import TavilyClient

client = TavilyClient(
    api_key="your-siftdog-key",
    api_base_url="http://localhost:8000",
)

results = client.search(
    "Python pathlib recursive glob",
    search_depth="advanced",
    max_results=5,
    include_domains=["docs.python.org"],
)
```

For an MCP setup, connect your coding agent to Siftdog’s search tool and ask it to use the documentation hosts appropriate to the task. The [Cursor setup guide](/blog/add-web-search-to-cursor-with-mcp/) explains how to connect Cursor; the [Claude Code guide](/blog/add-web-search-to-claude-code/) covers that client. If you need the filter applied consistently, make sure the code or tool integration that issues the search request passes it—don’t rely on an instruction in the agent’s prompt alone.

## Limits

Search filters do not constrain separate `/extract` or `/crawl` calls. An agent that can use those tools may still request other URLs, so don’t treat a docs-only search as a security boundary. Siftdog blocks private, loopback, and link-local addresses by default, but that is different from enforcing an external-domain allowlist.

Narrow filters can also hide useful results if a relevant page lives on a host you didn’t include. Start with a small set of official documentation hosts, review the returned results, and expand the list when the task needs another source. See the [Siftdog repository](https://github.com/khsarvar/siftdog) for the API and configuration details.
