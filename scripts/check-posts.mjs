// Blog post checks that `astro check` can't do: unresolved VERIFY markers, length, the
// "In short:" opener, duplicate titles. Run in CI (pr-check.yml) and by the drafting workflows.
//   node scripts/check-posts.mjs [--allow-verify] [dir]
// --allow-verify: the drafting jobs open the PR even with VERIFY markers (they're listed in it);
// the PR check then blocks the merge until a human resolves them.
import { POSTS_DIR, readPosts, verifyItems, WORD_LIMIT, wordCount } from "./draft/lib.mjs";

export function checkPosts(posts, { allowVerify = false } = {}) {
  const errors = [];
  const titles = new Map();
  for (const p of posts) {
    const where = p.file;
    if (!allowVerify) for (const v of verifyItems(p.body)) errors.push(`${where}: unresolved VERIFY: ${v}`);
    const words = wordCount(p.body);
    if (words > WORD_LIMIT) errors.push(`${where}: ${words} words (max ${WORD_LIMIT})`);
    if (!/^\*\*In short:\*\*/m.test(p.body)) errors.push(`${where}: missing "**In short:**" opener`);
    const t = String(p.data.title ?? "").toLowerCase();
    if (titles.has(t)) errors.push(`${where}: same title as ${titles.get(t)}`);
    titles.set(t, where);
  }
  return errors;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const dir = args.find((a) => !a.startsWith("--")) ?? POSTS_DIR;
  const errors = checkPosts(readPosts(dir), { allowVerify: args.includes("--allow-verify") });
  for (const e of errors) console.error(`::error::${e}`);
  if (errors.length) process.exit(1);
  console.log("posts ok");
}
