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
