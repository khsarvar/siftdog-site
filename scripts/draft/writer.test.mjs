import assert from "node:assert/strict";
import { test } from "node:test";
import { prBody } from "./draft.mjs";
import { parseDraftMeta, parsePost, renderPost, slugify, verifyItems, wordCount } from "./lib.mjs";
import { POST_SCHEMA, validatePost, writePost } from "./writer.mjs";

const good = {
  slug: "Add Web Search to Cursor!",
  title: "Add web search to Cursor with MCP",
  description: "Give Cursor web search with Siftdog's MCP server.",
  tags: ["mcp", "tutorial"],
  faq: [{ q: "Do I need a key?", a: "No." }],
  body: "**In short:** one command.\n\n## Install it\n\nRun it. <!-- VERIFY: Cursor menu name -->\n",
  sources: [{ claim: "Cursor supports MCP | stdio", url: "https://cursor.com/docs" }],
  summary: "Setup guide for Cursor.",
};

test("slugify, wordCount and VERIFY markers", () => {
  assert.equal(slugify(good.slug), "add-web-search-to-cursor");
  assert.equal(wordCount("**In short:** two words\n```bash\nnot counted here\n```\n<!-- VERIFY: nor this -->"), 4);
  assert.deepEqual(verifyItems(good.body), ["Cursor menu name"]);
});

test("validatePost accepts a good post and lists every problem of a bad one", () => {
  assert.deepEqual(validatePost(good), { slug: "add-web-search-to-cursor", problems: [] });
  const bad = { ...good, title: "x".repeat(91), tags: [], body: "# Title\n" + "word ".repeat(901) };
  const { problems } = validatePost(bad, { existingSlugs: ["add-web-search-to-cursor"] });
  assert.equal(problems.length, 6, problems.join("\n"));
  assert.deepEqual(validatePost(good, { existingSlugs: ["add-web-search-to-cursor"], fixedSlug: "keep-me" }).problems, []);
});

test("schema is strict-mode compatible (all properties required, no extras)", () => {
  const walk = (s) => {
    if (s.type === "object") {
      assert.equal(s.additionalProperties, false);
      assert.deepEqual([...s.required].sort(), Object.keys(s.properties).sort());
      Object.values(s.properties).forEach(walk);
    }
    if (s.type === "array") walk(s.items);
  };
  walk(POST_SCHEMA);
});

test("renderPost round-trips through the frontmatter parser", () => {
  const text = renderPost({ ...good, title: 'He said "hi": yes', pubDate: "2026-09-29" });
  const { data, body } = parsePost(text);
  assert.equal(data.title, 'He said "hi": yes');
  assert.equal(data.pubDate, "2026-09-29");
  assert.deepEqual(data.faq, good.faq);
  assert.ok(body.startsWith("\n**In short:**"));
});

test("writePost retries once with the problems, then returns the valid post", async () => {
  const calls = [];
  const replies = [{ ...good, body: "no opener" }, good];
  const client = {
    responses: {
      create: async (req) => {
        calls.push(req);
        return {
          output_text: JSON.stringify(replies[calls.length - 1]),
          output: [{ type: "web_search_call", action: { sources: [{ url: "https://cursor.com/docs" }] } }],
        };
      },
    },
  };
  const out = await writePost({ client, model: "m", instructions: "sys", input: "topic", existingSlugs: [] });
  assert.equal(out.slug, "add-web-search-to-cursor");
  assert.deepEqual(out.consulted, ["https://cursor.com/docs"]);
  assert.equal(calls.length, 2);
  assert.match(calls[1].input, /In short/);
  assert.equal(calls[0].text.format.strict, true);
  assert.equal(calls[0].tools[0].type, "web_search");
});

test("writePost gives up after two invalid answers", async () => {
  const client = { responses: { create: async () => ({ output_text: JSON.stringify({ ...good, body: "x" }), output: [] }) } };
  await assert.rejects(writePost({ client, instructions: "", input: "", existingSlugs: [] }), /still invalid/);
});

test("PR body shows evidence, verify items, escaped sources and parseable meta", () => {
  const topic = { source: "search-console", topic: "cursor mcp", queries: ["cursor mcp", "mcp cursor search"], evidence: { impressions: 300, position: 8.2, page: "https://siftdog.com/" } };
  const body = prBody({ post: good, slug: "add-web-search-to-cursor", topic, words: 120, verify: ["Cursor menu name"], consulted: ["https://cursor.com/docs"] });
  assert.match(body, /\| cursor mcp, mcp cursor search \| 300 \| 8.2 \|/);
  assert.match(body, /- \[ \] Cursor menu name/);
  assert.match(body, /MCP \\\| stdio/);
  assert.deepEqual(parseDraftMeta(body), { slug: "add-web-search-to-cursor", topic: "cursor mcp", source: "search-console", queries: topic.queries });
});
