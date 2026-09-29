// Shared helpers for the blog drafting scripts: reading posts, writing Markdown, GitHub and Slack.
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import YAML from "yaml";

export const POSTS_DIR = "src/content/posts";
export const SITE = "https://siftdog.com";
export const DRAFT_LABEL = "blog-draft";
export const WORD_LIMIT = 900; // hard limit enforced by check-posts; the prompt asks for ≤700

export function slugify(text) {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_-]+/g, "-")
    .slice(0, 70)
    .replace(/-+$/, "");
}

/** Split a post file into its frontmatter object and Markdown body. */
export function parsePost(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) throw new Error("missing frontmatter");
  return { data: YAML.parse(m[1]) ?? {}, body: m[2] };
}

export function readPosts(dir = POSTS_DIR) {
  return readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .sort()
    .map((file) => {
      const text = readFileSync(join(dir, file), "utf8");
      const slug = file.replace(/\.md$/, "");
      return { slug, file: join(dir, file), url: `${SITE}/blog/${slug}/`, ...parsePost(text) };
    });
}

export function renderPost({ title, description, pubDate, tags, faq, body }) {
  const data = { title, description, pubDate, tags };
  if (faq?.length) data.faq = faq.map(({ q, a }) => ({ q, a }));
  const front = YAML.stringify(data, { defaultStringType: "QUOTE_DOUBLE", defaultKeyType: "PLAIN", lineWidth: 0 });
  return `---\n${front}---\n\n${body.trim()}\n`;
}

export function wordCount(markdown) {
  const prose = markdown.replace(/```[\s\S]*?```/g, " ").replace(/<!--[\s\S]*?-->/g, " ");
  return prose.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
}

export function verifyItems(markdown) {
  return [...markdown.matchAll(/<!--\s*VERIFY:?\s*([\s\S]*?)-->/g)].map((m) => m[1].trim());
}

// --- GitHub (REST with GITHUB_TOKEN) ---

const META_RE = /<!-- draft-meta (\{.*?\}) -->/;

export function draftMeta(meta) {
  return `<!-- draft-meta ${JSON.stringify(meta)} -->`;
}

export function parseDraftMeta(body) {
  const m = (body ?? "").match(META_RE);
  try {
    return m ? JSON.parse(m[1]) : null;
  } catch {
    return null;
  }
}

/** Every blog-draft PR ever opened (open, merged or closed) with its draft-meta. */
export async function listDraftPRs({ repo, token, fetchImpl = fetch }) {
  const out = [];
  for (let page = 1; page < 20; page++) {
    const url = `https://api.github.com/repos/${repo}/issues?labels=${DRAFT_LABEL}&state=all&per_page=100&page=${page}`;
    const resp = await fetchImpl(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" },
    });
    if (!resp.ok) throw new Error(`GitHub ${resp.status}: ${await resp.text()}`);
    const batch = await resp.json();
    for (const issue of batch) {
      if (!issue.pull_request) continue;
      out.push({ number: issue.number, state: issue.state, title: issue.title, meta: parseDraftMeta(issue.body) });
    }
    if (batch.length < 100) break;
  }
  return out;
}

// --- Slack ---

export async function slackPost(text, { token, channel, blocks, unfurl = false, fetchImpl = fetch }) {
  if (!token || !channel) return false;
  const resp = await fetchImpl("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({ channel, text, blocks, unfurl_links: unfurl }),
  });
  const data = await resp.json();
  if (!data.ok) throw new Error(`Slack chat.postMessage failed: ${data.error}`);
  return true;
}
