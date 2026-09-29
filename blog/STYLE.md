# Siftdog blog style

Used as instructions by the drafting workflow and as the checklist for human review.

## Shape
- 400–700 words of prose (code blocks don't count). Hard limit 900.
- Open with one bold line: `**In short:** …` that answers the title in one or two sentences.
- Then `##` sections phrased the way people search ("Install it", "Connect Cursor", "Limits").
  No `#` heading in the body; the title is rendered from frontmatter.
- Prefer numbered steps, short code blocks and small tables over paragraphs. One idea per paragraph.
- End with a "Limits" or "When not to use it" section when relevant; readers and AI answer
  engines trust honest trade-offs.
- 2–4 FAQ entries (frontmatter `faq`), each answer 1–2 sentences, not repeating the body verbatim.

## Facts
- Commands, flags, env vars, endpoints and tool names must appear in the Siftdog README or
  `.env.example` provided. Never invent terminal output, benchmark numbers or features.
- Numbers about Siftdog come only from the benchmark page provided.
- Facts about other products (prices, limits, features) need a source URL found with web search;
  list every such claim in `sources`.
- Anything you could not confirm: keep the sentence but add `<!-- VERIFY: what to check -->`
  right after it. A post with VERIFY markers cannot be merged until a human resolves them.

## Tone
- Plain, direct, second person. No hype ("blazing", "revolutionary", "game-changer"), no emoji.
- Fair to alternatives: say where Tavily, Firecrawl or others are the better choice.
- Link to the repo (https://github.com/khsarvar/siftdog) and related posts (`/blog/<slug>/`)
  where useful; don't stuff keywords.

## Frontmatter
- `title` ≤ 90 characters, matches the search query naturally.
- `description` ≤ 200 characters: what the reader will be able to do.
- `tags`: 1–4 lowercase tags, reuse existing ones (tutorial, mcp, self-hosted, tavily, comparison…).
