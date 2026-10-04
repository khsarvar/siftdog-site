---
title: "Add web search to Ollama with self-hosted Siftdog"
description: "Give a local Ollama model web search through Siftdog, with no third-party search or LLM API key."
pubDate: "2026-09-29"
tags:
  - "tutorial"
  - "self-hosted"
  - "ollama"
faq:
  - q: "Do I need a search API key?"
    a: "No. Siftdog searches through SearXNG, so you don't need a paid search API key. If you enable Siftdog's optional API_KEYS setting, you'll need that local bearer token to call your server."
  - q: "Does this setup work offline?"
    a: "No. Ollama and Siftdog can run on your machine, but web search needs internet access and sends queries through SearXNG to public search engines."
  - q: "Does the example use Siftdog's MCP server?"
    a: "No. It exposes Siftdog's local REST search endpoint as a function Ollama can call. Siftdog also provides MCP for compatible clients."
---

**In short:** Run Ollama and Siftdog on your machine, then give a tool-capable Ollama model a small Python function that calls Siftdog's `/search` endpoint. No third-party search or LLM API key is needed—but the web-search part is not offline.

## What stays local—and what doesn't

Ollama runs the model on your machine, and Siftdog runs the search API on infrastructure you control. The example below uses Siftdog's REST API directly; it doesn't need an MCP client or a hosted search service.

There is one important boundary: Siftdog uses SearXNG to query public search engines. Your search request needs internet access and is sent out to those engines. This is a local-model, self-hosted search setup—not a way to search the web privately or without an internet connection.

You don't need an external search key or `ANTHROPIC_API_KEY`. The latter is only relevant to Siftdog's optional `include_answer` feature; here, Ollama receives the search results and writes the response. By default, Siftdog authentication is disabled. You can set `API_KEYS` if you want to protect your server with a local bearer token.

## Start Siftdog

Clone the [Siftdog repository](https://github.com/khsarvar/siftdog), then start the Docker Compose stack. It includes SearXNG for search:

```bash
git clone https://github.com/khsarvar/siftdog && cd siftdog
cp .env.example .env
docker compose up -d
```

The example `.env` doesn't need third-party keys for this walkthrough. Siftdog's API will be available at `http://localhost:8000`.

## Prepare Ollama

Install Ollama for your operating system, then pull and start a model that supports tool calling. This example uses Qwen 3:

```bash
ollama pull qwen3
ollama run qwen3
```

Ollama's tool-calling support lets a model request a function and use the result in a follow-up response. The function below connects that mechanism to Siftdog. See Ollama's official tool-calling documentation for supported models and details.

## Connect Ollama to Siftdog

Install the Ollama Python library and `requests`, then save this as `search.py`. The `web_search` function sends a query to your Siftdog server; Ollama can choose to call it when answering the prompt.

```bash
pip install ollama requests
```

```python
import requests
from ollama import chat


def web_search(query: str) -> str:
    """Search the web through the local Siftdog server."""
    response = requests.post(
        "http://localhost:8000/search",
        json={"query": query, "search_depth": "advanced", "max_results": 5},
        timeout=60,
    )
    response.raise_for_status()
    return response.text


messages = [{
    "role": "user",
    "content": "Find the latest Python release and summarize it with source URLs.",
}]
response = chat(model="qwen3", messages=messages, tools=[web_search])
messages.append(response.message)

if response.message.tool_calls:
    for call in response.message.tool_calls:
        if call.function.name == "web_search":
            result = web_search(**call.function.arguments)
            messages.append({
                "role": "tool",
                "tool_name": call.function.name,
                "content": result,
            })
    response = chat(model="qwen3", messages=messages, tools=[web_search])

print(response.message.content)
```

If you set `API_KEYS` in Siftdog, add an `Authorization: Bearer <key>` header to the `requests.post` call. Keep that token on your own machine; it is for access to your Siftdog server, not a third-party search key.

## Limits

Search depends on SearXNG and public search engines, which can rate-limit requests. If all configured engines are failing, Siftdog returns an error rather than an empty result that could be mistaken for “nothing found.” Ollama models can also vary in how reliably they decide to call tools, so choose a tool-capable model and check that the response includes sources.

If you want the full self-hosted API setup without the Ollama adapter, see [how to self-host a Tavily alternative](/blog/self-host-tavily-alternative/).
