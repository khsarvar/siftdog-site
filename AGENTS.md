## Project

siftdog.com: static Astro site (marketing pages, blog, hosted-version waitlist) for the open-source
product in `khsarvar/siftdog`. Deployed by `.github/workflows/deploy.yml` to GitHub Pages.

- `src/layouts/Base.astro` renders `<head>` (canonical, Open Graph, JSON-LD) and the nav; add nav
  entries there. Styles live in `public/style.css`; `public/site.js` adds copy buttons to code blocks.
- Posts: `src/content/posts/*.md`, schema in `src/content.config.ts` (Astro 7 Content Layer; `z` from
  `astro/zod`). Post pages emit `BlogPosting` and, with `faq`, `FAQPage` JSON-LD.
- Keep public pages short and scannable; claims must match the product and the benchmark data.
- Waitlist: `src/pages/hosted.astro` posts to a Supabase `waitlist` table (anon insert-only RLS)
  using `PUBLIC_SUPABASE_URL` / `PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- Check changes with `npm test`, `npm run check:posts`, `npm run build` and `npx astro check`.
- AI drafts: `.github/workflows/draft-post.yml` (Tue/Fri + manual) runs `scripts/draft/draft.mjs`,
  which picks a topic (manual → Search Console near miss → `blog/topics.yml` → model) and writes a
  post with the OpenAI Responses API (`OPENAI_MODEL`, web search, Structured Outputs) following
  `blog/STYLE.md`. It opens a `blog-draft` PR; merge publishes, `/revise …` from the owner rewrites
  (`revise-post.yml`), close rejects. Unsure claims get `<!-- VERIFY: … -->`, which `check:posts`
  (required `pr-check`) rejects until resolved. Tests: `scripts/**/*.test.mjs`, no network.

## Development

When starting the dev server, use background mode:

```
astro dev --background
```

Manage the background server with `astro dev stop`, `astro dev status`, and `astro dev logs`.

## Documentation

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)
