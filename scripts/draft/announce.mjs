// After a deploy, announce newly published posts in Slack once their page is actually live.
//   node scripts/draft/announce.mjs <before-sha> <after-sha>
// Posts added between the two commits (src/content/posts/*.md, status A) are polled until the
// page returns 200, then posted with the link unfurled. Env: SLACK_BOT_TOKEN, SLACK_CHANNEL_ID.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { parsePost, POSTS_DIR, SITE, slackPost } from "./lib.mjs";

/** `git diff --name-status` output → [{slug, file}] for added posts. */
export function addedPosts(nameStatus) {
  return nameStatus
    .split("\n")
    .map((line) => line.split("\t"))
    .filter(([status, file]) => status === "A" && file?.startsWith(`${POSTS_DIR}/`) && file.endsWith(".md"))
    .map(([, file]) => ({ file, slug: file.slice(POSTS_DIR.length + 1, -3) }));
}

export async function waitUntilLive(url, { tries = 30, delayMs = 10_000, fetchImpl = fetch } = {}) {
  for (let i = 0; i < tries; i++) {
    try {
      const resp = await fetchImpl(url, { method: "HEAD", cache: "no-store" });
      if (resp.status === 200) return true;
    } catch {
      // not reachable yet
    }
    await new Promise((r) => setTimeout(r, delayMs));
  }
  return false;
}

export function liveMessage(title, url) {
  return `:rocket: *Live:* <${url}|${title.replace(/[<>&]/g, "")}>\n${url}`;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [before, after] = process.argv.slice(2);
  if (!before || /^0+$/.test(before)) {
    console.log("no previous commit to compare; nothing to announce");
    process.exit(0);
  }
  const diff = execFileSync("git", ["diff", "--name-status", before, after, "--", POSTS_DIR], { encoding: "utf8" });
  const posts = addedPosts(diff);
  if (!posts.length) console.log("no new posts");
  for (const { file, slug } of posts) {
    const { data } = parsePost(readFileSync(file, "utf8"));
    if (data.draft) continue; // draft: true posts aren't built
    const url = `${SITE}/blog/${slug}/`;
    const live = await waitUntilLive(url);
    const text = live ? liveMessage(data.title, url) : `:warning: Published but not reachable after 5 min: ${url}`;
    await slackPost(text, { token: process.env.SLACK_BOT_TOKEN, channel: process.env.SLACK_CHANNEL_ID, unfurl: live });
    console.log(text);
  }
}
