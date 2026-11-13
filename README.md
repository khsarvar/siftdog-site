# siftdog.com

Website and blog for [Siftdog](https://github.com/khsarvar/siftdog), built with Astro and deployed
to GitHub Pages on every push to `main`.

```bash
npm install
npm run dev        # http://localhost:4321
npm run build      # static site in dist/
npx astro check    # type and content checks
```

## Writing a post

Add a Markdown file to `src/content/posts/`. The file name becomes the URL
(`/blog/<file-name>/`). Front matter:

```yaml
title: "Short, specific title"
description: "One sentence for search results and the post list."
pubDate: 2026-09-28
tags: ["mcp", "tutorial"]
faq:              # optional: shown at the end and added as FAQ structured data
  - q: "Question?"
    a: "Answer."
draft: false      # true keeps it out of the build
```

The blog list, RSS feed (`/rss.xml`), sitemap (`/sitemap-index.xml`) and structured data update
automatically.

## Waitlist

`/hosted/` stores sign-ups in a Supabase table that only allows anonymous inserts. Set
`PUBLIC_SUPABASE_URL` and `PUBLIC_SUPABASE_PUBLISHABLE_KEY` in `.env` locally and as repository
variables for the deploy workflow.

## Blog research search provider

The automated draft and `/revise` workflows can use [Parallel Search MCP](https://docs.parallel.ai/integrations/mcp/search-mcp)
for free web search (Fast mode) and page fetching, without a Parallel account or API key.
Set the repository variable `BLOG_SEARCH_PROVIDER` to `parallel` for both workflows,
or export `BLOG_SEARCH_PROVIDER=parallel` when running the scripts locally.
`OPENAI_API_KEY` is still required for writing the post.

Existing installations with `OPENAI_API_KEY` keep OpenAI web search unless you select
another provider. Set `BLOG_SEARCH_PROVIDER=openai` to select it explicitly, or
`none` to disable all research tools. The programmatic `writePost` caller also accepts
`searchProvider`, which takes precedence over the environment. Without a provider
selection or configured OpenAI key (including `client.apiKey`), it defaults to Parallel;
the supplied model client must still support inference.

Parallel results feed back into the writer and their source URLs appear in the draft
PR's “Pages consulted” list. Only search and fetch tools are allowed, with at most eight
calls per draft/revision and a 30-second timeout per MCP request. Cancellation stops
pending requests. Provider errors stop drafting instead of silently switching providers.
Anonymous service limits apply. The existing owner-only revision permissions still apply.
