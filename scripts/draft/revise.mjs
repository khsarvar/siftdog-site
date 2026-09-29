// Revise a draft post from a `/revise <instruction>` PR comment (run by revise-post.yml).
// Env: OPENAI_API_KEY, OPENAI_MODEL, SLUG, INSTRUCTION, REVISE_OUT.
import { readFileSync, writeFileSync } from "node:fs";
import OpenAI from "openai";
import { parsePost, POSTS_DIR, renderPost, verifyItems, wordCount } from "./lib.mjs";
import { DEFAULT_MODEL, loadContext, revisePrompt, systemPrompt, writePost } from "./writer.mjs";

async function main(env = process.env) {
  const slug = env.SLUG;
  if (!/^[a-z0-9-]+$/.test(slug ?? "")) throw new Error(`bad slug: ${slug}`);
  const file = `${POSTS_DIR}/${slug}.md`;
  const current = readFileSync(file, "utf8");
  const { data } = parsePost(current);

  const { post } = await writePost({
    client: new OpenAI({ apiKey: env.OPENAI_API_KEY }),
    model: env.OPENAI_MODEL || DEFAULT_MODEL,
    instructions: systemPrompt(await loadContext()),
    input: revisePrompt({ current, instruction: env.INSTRUCTION }),
    fixedSlug: slug,
  });
  const pubDate = data.pubDate instanceof Date ? data.pubDate.toISOString().slice(0, 10) : String(data.pubDate);
  writeFileSync(file, renderPost({ ...post, pubDate }));

  const verify = verifyItems(post.body);
  const comment = [
    `Revised: ${post.summary}`,
    "",
    `**Words:** ${wordCount(post.body)} · **Items to verify:** ${verify.length}`,
    ...verify.map((v) => `- [ ] ${v}`),
  ].join("\n");
  writeFileSync(env.REVISE_OUT || "revise-result.md", comment);
  // For the Slack button message the workflow posts afterwards.
  const summary = { title: post.title, words: wordCount(post.body), verifyCount: verify.length, summary: post.summary };
  if (env.REVISE_JSON) writeFileSync(env.REVISE_JSON, JSON.stringify(summary));
  console.log(comment);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
