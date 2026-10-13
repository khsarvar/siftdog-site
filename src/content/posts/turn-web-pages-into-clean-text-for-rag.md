---
title: "Turn web pages into clean text for RAG with Siftdog"
description: "Extract clean Markdown or text from known URLs with Siftdog, then send it to your own chunking, embedding, and retrieval pipeline."
pubDate: "2026-10-13"
tags:
  - "tutorial"
  - "self-hosted"
faq:
  - q: "Does Siftdog chunk pages or create embeddings?"
    a: "No. `/extract` gets page content; you choose how to split it, create embeddings, and store it for retrieval."
  - q: "Can `/extract` fetch pages on my private network?"
    a: "Private, loopback, and link-local addresses are blocked by default. Only enable `ALLOW_PRIVATE_NETWORKS=true` when every caller is trusted."
  - q: "Should I use `/extract` or `/crawl`?"
    a: "Use `/extract` when you already have the page URLs. Use `/crawl` to traverse a site and fetch page content."
---

**In short:** Send known page URLs to Siftdog’s `/extract` endpoint to get clean Markdown or text. Then handle chunking, embeddings, and storage in your own RAG pipeline; Siftdog does not render JavaScript.

## Start Siftdog

You can run the Docker image for extraction without setting up SearXNG. SearXNG is needed for `/search`, not `/extract`.

```bash
docker run -p 8000:8000 ghcr.io/khsarvar/siftdog
```

For local use, the server is available at `http://localhost:8000`. If you set `API_KEYS`, include the matching Bearer token in requests. Avoid leaving authentication disabled on a server accessible to other people.

## Extract page content

Pass the URLs you want to fetch in a JSON `POST` request. Choose `markdown` or `text` with the `format` field.

```bash
curl -s http://localhost:8000/extract \
  -H "Content-Type: application/json" \
  -d '{"urls": ["https://example.com/article"], "format": "markdown"}'
```

`/extract` accepts up to 20 URLs per request. If authentication is enabled, add `-H "Authorization: Bearer <key>"` to the command. Use Markdown when headings and links are useful to your downstream processing; use plain text when you want text without Markdown formatting.

Siftdog uses trafilatura to extract page content. That gives you extracted text to work with instead of asking your RAG pipeline to process the page’s raw HTML. Check the returned content before indexing it, especially if the source page has unusual layouts or little readable text.

## Add extraction to your RAG pipeline

Treat `/extract` as the content-fetching step, not a complete RAG system. A typical flow is:

1. Keep a list of pages you want to index.
2. Send their URLs to `/extract` and collect the returned text.
3. Split the text into chunks using rules that suit your application.
4. Create embeddings, store the chunks, and retrieve relevant ones when a user asks a question.

Siftdog handles the extraction step. Your application remains responsible for choosing chunk sizes and overlap, embedding model, metadata, storage, and retrieval behavior. That separation lets you change those choices without changing how you fetch page content.

If you already use the Tavily Python client, the README shows the same extraction call pointed at a Siftdog server:

```python
from tavily import TavilyClient

client = TavilyClient(
    api_key="your-siftdog-key",
    api_base_url="http://localhost:8000",
)
pages = client.extract(urls=["https://example.com/article"])
```

See the [Siftdog repository](https://github.com/khsarvar/siftdog) for the API details and setup options.

## Use extract or crawl?

Use `/extract` when you already have specific URLs, such as pages selected by your application or returned by another search step. If you need to discover and fetch pages from a site, `/map` lists URLs without content and `/crawl` traverses a site and returns page content.

## Limits

Siftdog extracts static HTML; it does not render JavaScript. If a page’s main content only appears after client-side rendering, extraction may not include it. For a comparison of tools with different scraping capabilities, see [Siftdog vs Firecrawl vs crw](/blog/siftdog-vs-firecrawl-vs-crw/).

`/extract` fetches caller-supplied URLs, so Siftdog blocks private, loopback, and link-local addresses by default, including through redirects. Keep that protection enabled unless every caller is trusted. For pages that depend on JavaScript rendering or a larger scraping platform, Siftdog may not be the right fit.
