---
title: "Crawl a documentation site into Markdown with Siftdog"
description: "Map a documentation site, then crawl selected paths into Markdown with Siftdog’s depth and page limits."
pubDate: "2026-10-16"
tags:
  - "tutorial"
  - "self-hosted"
faq:
  - q: "Should I use `/map` or `/crawl` first?"
    a: "Use `/map` to see which URLs match your starting point and filters. Use `/crawl` when you want page content."
  - q: "Can I limit the crawl to one documentation section?"
    a: "Yes. Set `select_paths` to a regular expression matching the paths you want, and use `exclude_paths` to rule out paths."
  - q: "Does the crawl render JavaScript?"
    a: "No. Siftdog fetches static HTML, so pages that require JavaScript rendering may be incomplete."
---

**In short:** use `/map` to check which documentation URLs match your filters, then call `/crawl` with the same path rules and `format: "markdown"`. Set a depth and page limit to keep the crawl focused.

## Start Siftdog

If you haven’t already, start Siftdog with Docker Compose. The full stack includes SearXNG, though crawling a known documentation URL doesn’t require search.

```bash
git clone https://github.com/khsarvar/siftdog && cd siftdog
cp .env.example .env
docker compose up
```

The examples below use `https://docs.example.com/` as a placeholder. Replace it with the documentation site you want to crawl. If you set `API_KEYS`, send a bearer token with each request; omit that header when authentication is disabled.

## Map the documentation URLs

Start with `/map` to list URLs without fetching page content. The path filters are regular expressions, so `^/docs/` selects paths beginning with `/docs/`.

```bash
curl -s localhost:8000/map \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://docs.example.com/",
    "max_depth": 2,
    "limit": 100,
    "select_paths": ["^/docs/"]
  }'
```

Review the returned URLs before crawling. If the site puts guides and API references under different prefixes, narrow the pattern to the section you need. You can also pass `exclude_paths` to filter out matching paths.

## Crawl matching pages into Markdown

Once the map looks right, use the same start URL and filters with `/crawl`. Set `format` to `markdown` to request Markdown page content.

```bash
curl -s localhost:8000/crawl \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://docs.example.com/",
    "max_depth": 2,
    "limit": 100,
    "select_paths": ["^/docs/"],
    "format": "markdown"
  }'
```

`max_depth` bounds how far the crawl follows links, while `limit` caps the number of pages returned. Start with modest values, inspect the results, then increase them if the documentation section is larger than expected. The configured `CRAWL_MAX_LIMIT` also sets a server-side ceiling for crawl limits.

## Choose the right workflow

Use `/map` when you’re still exploring a site or refining path filters. Use `/crawl` when you know which section you want and need its page content. Both endpoints accept traversal controls such as `max_depth`, `max_breadth`, `limit`, `select_paths` and `exclude_paths`.

Siftdog extracts content from static HTML; it doesn’t render JavaScript. If the documentation is assembled in the browser, or you need a rendered page, the crawl may not contain the content you expect. For a list of known URLs rather than a site traversal, use `/extract` instead. The [clean-text extraction guide](/blog/turn-web-pages-into-clean-text-for-rag/) covers that workflow.

For request details and configuration, see the [Siftdog repository](https://github.com/khsarvar/siftdog).
