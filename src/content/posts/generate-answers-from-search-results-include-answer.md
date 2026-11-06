---
title: "Generate Answers from Search Results with Siftdog include_answer"
description: "Configure Siftdog to write search answers with Claude, or skip answer generation and send search results to your own LLM."
pubDate: "2026-11-06"
tags:
  - "tutorial"
  - "self-hosted"
  - "tavily"
faq:
  - q: "Do I need an Anthropic API key to use Siftdog search?"
    a: "No. The key is for answer generation when you request `include_answer`; Siftdog search uses SearXNG."
  - q: "Can I choose a different answer model?"
    a: "Set `ANSWER_MODEL` in your environment. The supplied `.env.example` shows `claude-opus-5` as its default."
  - q: "Can my application generate the answer instead?"
    a: "Yes. Search without requesting `include_answer`, then pass the returned results to the LLM your application uses."
---

**In short:** Set `ANTHROPIC_API_KEY` and request `include_answer` on `/search` to have Siftdog write an answer from the retrieved results with Claude. If you want your own model, prompt, or generation flow, skip that option and use the search results as input to your LLM.

## What `include_answer` does

Siftdog’s `/search` endpoint can return an answer written by Claude from the retrieved results. That combines retrieval and answer generation in one request: your app asks a question, Siftdog searches through SearXNG, and answer generation is available when you set `include_answer`.

You don’t need answer generation to use Siftdog search. It’s an optional step for apps that want Siftdog to produce the answer rather than handling that step themselves.

## Configure Claude

Set the answer-related environment variables in the `.env` file used by your Siftdog deployment. For Docker Compose, the README’s quick start copies `.env.example` to `.env` before starting the services.

```env
ANTHROPIC_API_KEY=your-anthropic-api-key
ANSWER_ENABLED=true
ANSWER_MODEL=claude-opus-5
ANSWER_EFFORT=low
```

The model and effort values above match the provided `.env.example`. Keep the key in the server environment rather than placing it in a client-side search request. Siftdog reads configuration from environment variables or a `.env` file.

## Request an answer

Add `include_answer` to your `/search` JSON body when you want Siftdog to generate an answer. For example:

```bash
curl -s localhost:8000/search -H "Content-Type: application/json" \
  -d '{"query": "What is BM25 ranking?", "include_answer": true}'
```

If your server has `API_KEYS` configured, send the usual `Authorization: Bearer <key>` header as well. Leave `include_answer` out—or set it to `false`—when you only want the search results.

## Let your own LLM answer

Use Siftdog for retrieval and keep generation in your application when you need to control the final prompt, use a model you already call, or keep answer generation within your own model setup. Request search results without `include_answer`, then pass the returned results to your LLM as context.

This keeps the steps separate: Siftdog finds and ranks web results, while your application decides how to synthesize them. You can also use the same pattern with a local model; see [Add web search to Ollama with self-hosted Siftdog](/blog/web-search-for-local-llms-with-ollama/).

## Limits

Answer generation requires `ANTHROPIC_API_KEY` (or an `ant auth login` profile) and `ANSWER_ENABLED=true`. If you don’t configure the answer-generation path, you can still use search without requesting an answer. Search itself still relies on SearXNG, so enabling Claude does not replace the search backend.

Choose the generated answer when you want a convenient answer alongside search results. Choose your own LLM when you want to own the generation step. For setup details, see the [Siftdog repository](https://github.com/khsarvar/siftdog).
