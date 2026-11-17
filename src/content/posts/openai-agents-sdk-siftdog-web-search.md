---
title: "Add Siftdog web search to the OpenAI Agents SDK"
description: "Connect an OpenAI Agents SDK app to Siftdog over MCP, locally with stdio or through a self-hosted HTTP server."
pubDate: "2026-11-17"
tags:
  - "tutorial"
  - "mcp"
  - "self-hosted"
faq:
  - q: "Does the local setup need a Siftdog API server?"
    a: "No. The Agents SDK can launch Siftdog’s MCP server as a local process. Search still needs a SearXNG instance; extract, crawl and map do not."
  - q: "Can I connect to a Siftdog server I already run?"
    a: "Yes. Connect the SDK to the server’s `/mcp` endpoint over Streamable HTTP. Send a bearer token if the server has `API_KEYS` configured."
  - q: "Does Siftdog replace my model provider?"
    a: "No. Siftdog supplies web tools to your agent; your app still configures and authenticates with its model provider."
---

**In short:** Add Siftdog’s MCP tools to an OpenAI Agents SDK agent to give it web search, extraction, crawling and site maps. Run Siftdog as a local process for a single-machine setup, or connect to a shared self-hosted server over HTTP.

## Why use MCP with the Agents SDK

The Agents SDK can connect an agent to MCP servers, so you can use Siftdog’s existing tools instead of writing and maintaining a separate function wrapper. Siftdog exposes four read-only tools:

| Tool | Use it for |
|---|---|
| `siftdog_search` | Find web results for a question |
| `siftdog_extract` | Read pages when you already have their URLs |
| `siftdog_crawl` | Fetch content across a site |
| `siftdog_map` | List a site’s URLs without fetching page content |

For a Python app, the simplest connection is stdio: the SDK starts Siftdog locally and communicates with it over standard input and output. Install the Agents SDK first:

```bash
pip install openai-agents
```

## Run Siftdog over stdio

Point `SEARXNG_URL` to a SearXNG instance with JSON output enabled. The MCP process can run without a Siftdog API server, but search needs SearXNG; extraction, crawling and mapping do not.

```python
import asyncio
from agents import Agent, Runner
from agents.mcp import MCPServerStdio

async def main():
    async with MCPServerStdio(
        name="Siftdog",
        params={
            "command": "uvx",
            "args": ["siftdog", "mcp"],
            "env": {"SEARXNG_URL": "http://localhost:8080"},
        },
    ) as server:
        agent = Agent(
            name="Research assistant",
            instructions=(
                "For questions about current information, use siftdog_search. "
                "Use siftdog_extract when you need to inspect a result page. "
                "Include the source URLs in your answer."
            ),
            mcp_servers=[server],
        )
        result = await Runner.run(agent, "Find the latest Python release.")
        print(result.final_output)

asyncio.run(main())
```

The MCP server runs inside the context manager, so the agent can use its tools during `Runner.run`. If search does not work, check that the SearXNG address is reachable and that its JSON format is enabled.

## Connect to a shared Siftdog server

If Siftdog is already running, use the Agents SDK’s Streamable HTTP MCP client instead. Set the URL to your server’s `/mcp` endpoint. When `API_KEYS` is configured, send the key as a bearer token:

```python
from agents.mcp import MCPServerStreamableHttp

async with MCPServerStreamableHttp(
    name="Siftdog",
    params={
        "url": "http://localhost:8000/mcp",
        "headers": {"Authorization": f"Bearer {token}"},
    },
) as server:
    agent = Agent(
        name="Research assistant",
        instructions="Use Siftdog's search and extraction tools when useful.",
        mcp_servers=[server],
    )
    result = await Runner.run(agent, "Find recent coverage of Python releases.")
    print(result.final_output)
```

Keep `token` in your application’s secret store rather than committing a real key to source control. For a non-local hostname, configure Siftdog’s `MCP_ALLOWED_HOSTS` to allow the hostname used for requests.

## Decide what the agent should search

MCP gives the agent access to tools; your instructions still guide when it should call them. Tell it to search for current facts, extract pages when snippets are not enough, and return source URLs. Test with questions that genuinely need current web information, then review whether the agent used the tools and whether its answer includes useful sources. See the [Siftdog repository](https://github.com/khsarvar/siftdog) for setup details, or [self-host a Tavily-compatible API](/blog/self-host-tavily-alternative/) if you have not deployed Siftdog yet.

## Limits

Siftdog search depends on SearXNG and public search engines, which can rate-limit requests. Its extraction works on static HTML, not JavaScript-rendered pages. You also operate the Siftdog and SearXNG infrastructure yourself. If you need hosted search or JavaScript rendering, check those requirements before choosing this setup.
