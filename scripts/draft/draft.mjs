// Draft the next blog post (run by .github/workflows/draft-post.yml).
//
//   node scripts/draft/draft.mjs                 pick a topic, write src/content/posts/<slug>.md
//                                                and the PR details JSON
//   node scripts/draft/draft.mjs --topics-only   print Search Console near misses and the topic
//                                                that would be picked; no model call, no writes
//
// Env: OPENAI_API_KEY, OPENAI_MODEL, GITHUB_TOKEN, GITHUB_REPOSITORY, TOPIC (optional),
// GSC_SERVICE_ACCOUNT_JSON + GSC_SITE_URL (optional), NEAR_MISS_MIN_IMPRESSIONS, DRAFT_OUT.
import { readFileSync, writeFileSync } from "node:fs";
import OpenAI from "openai";
import { fetchRows, findNearMisses } from "./gsc.mjs";
import { draftMeta, listDraftPRs, POSTS_DIR, readPosts, renderPost, verifyItems, wordCount } from "./lib.mjs";
import { pickTopic, readBacklog } from "./topics.mjs";
import { DEFAULT_MODEL, draftPrompt, loadContext, systemPrompt, writePost } from "./writer.mjs";

export function prBody({ post, slug, topic, words, verify, consulted }) {
  const lines = [post.summary, ""];
  if (topic.source === "search-console") {
    const e = topic.evidence;
    lines.push(
      "**Why this topic:** Search Console near miss (last 28 days)",
      "",
      "| Queries | Impressions | Avg position | Ranking page |",
      "|---|---|---|---|",
      `| ${topic.queries.join(", ")} | ${e.impressions} | ${e.position} | ${e.page} |`,
      "",
    );
  } else {
    const why = { manual: "requested when the workflow was run", backlog: "next in blog/topics.yml", model: "chosen by the model (backlog empty, no near misses)" };
    lines.push(`**Why this topic:** ${why[topic.source]}`, "");
  }
  lines.push(`**Words:** ${words} · **Items to verify:** ${verify.length}`, "");
  if (verify.length) lines.push("**Verify before merging** (the check fails until these markers are gone):", ...verify.map((v) => `- [ ] ${v}`), "");
  if (post.sources.length) {
    lines.push("**Sources for external claims**", "", "| Claim | Source |", "|---|---|");
    for (const s of post.sources) lines.push(`| ${s.claim.replaceAll("|", "\\|")} | ${s.url} |`);
    lines.push("");
  }
  if (consulted.length) lines.push(`<details><summary>Pages consulted (${consulted.length})</summary>\n\n${consulted.map((u) => `- ${u}`).join("\n")}\n</details>`, "");
  lines.push(
    "**Review:** preview with `npm run dev` → `/blog/" + slug + "/`, or read the file diff.",
    "- Merge to publish on siftdog.com.",
    "- Comment `/revise <what to change>` to have it rewritten on this branch.",
    "- Close to reject (the topic won't be drafted again).",
    "",
    draftMeta({ slug, topic: topic.topic ?? post.title, source: topic.source, queries: topic.queries ?? [] }),
  );
  return lines.join("\n");
}

async function nearMisses(env, posts, used, { strict = false } = {}) {
  if (!env.GSC_SERVICE_ACCOUNT_JSON || !env.GSC_SITE_URL) {
    console.log("Search Console not configured; skipping near misses.");
    return [];
  }
  let rows;
  try {
    rows = await fetchRows({ credentialsJson: env.GSC_SERVICE_ACCOUNT_JSON, siteUrl: env.GSC_SITE_URL });
  } catch (e) {
    if (strict) throw e; // --topics-only is the Search Console probe: fail loudly
    // A drafting run still works from the backlog; the warning shows on the run page.
    console.log(`::warning::Search Console unavailable, using the backlog: ${e.message}`);
    return [];
  }
  const exclude = used.flatMap((m) => m?.queries ?? []);
  const misses = findNearMisses(rows, posts, { minImpressions: Number(env.NEAR_MISS_MIN_IMPRESSIONS || 150), exclude });
  console.log(`Search Console: ${rows.length} query/page rows, ${misses.length} near-miss clusters`);
  for (const m of misses.slice(0, 10)) console.log(`  ${m.impressions}\tpos ${m.position}\t${m.queries.join(" | ")}\t${m.page}`);
  return misses;
}

async function main(env = process.env) {
  const topicsOnly = process.argv.includes("--topics-only");
  const posts = readPosts();
  const used = (await listDraftPRs({ repo: env.GITHUB_REPOSITORY, token: env.GITHUB_TOKEN })).map((p) => p.meta).filter(Boolean);
  const topic = pickTopic({ input: env.TOPIC ?? "", nearMisses: await nearMisses(env, posts, used, { strict: topicsOnly }), backlog: readBacklog(), used });
  console.log("Topic:", JSON.stringify(topic));
  if (topicsOnly) return;

  const ctx = await loadContext();
  const example = readFileSync(`${POSTS_DIR}/add-web-search-to-claude-code.md`, "utf8");
  const { post, slug, consulted } = await writePost({
    client: new OpenAI({ apiKey: env.OPENAI_API_KEY }),
    model: env.OPENAI_MODEL || DEFAULT_MODEL,
    instructions: systemPrompt(ctx),
    input: draftPrompt({ topic, posts, example }),
    existingSlugs: [...posts.map((p) => p.slug), ...used.map((m) => m.slug)],
  });

  const today = new Date().toISOString().slice(0, 10);
  writeFileSync(`${POSTS_DIR}/${slug}.md`, renderPost({ ...post, pubDate: today }));

  const verify = verifyItems(post.body);
  const words = wordCount(post.body);
  const result = {
    slug,
    title: post.title,
    branch: `draft/${slug}`,
    prTitle: `Blog draft: ${post.title}`,
    prBody: prBody({ post, slug, topic, words, verify, consulted }),
    verifyCount: verify.length,
    words,
  };
  writeFileSync(env.DRAFT_OUT || "draft-result.json", JSON.stringify(result, null, 2));
  console.log(`Wrote ${POSTS_DIR}/${slug}.md (${words} words, ${verify.length} to verify)`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
