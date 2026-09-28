import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { aggregate, covers, dateRange, findNearMisses } from "./gsc.mjs";
import { pickTopic, readBacklog, removeFromBacklog } from "./topics.mjs";

const post = (slug, title, description = "") => ({ slug, data: { title, description } });
const POSTS = [
  post("self-host-tavily-alternative", "How to self-host a Tavily alternative"),
  post("add-web-search-to-claude-code", "Add web search to Claude Code"),
];
const row = (query, page, impressions, position) => ({ keys: [query, page], impressions, clicks: 1, position });

test("aggregate weights position by impressions and keeps the top page", () => {
  const [q] = aggregate([row("searxng api", "https://siftdog.com/", 100, 6), row("searxng api", "https://siftdog.com/blog/x/", 300, 10)]);
  assert.equal(q.impressions, 400);
  assert.equal(q.position, 9);
  assert.equal(q.page, "https://siftdog.com/blog/x/");
});

test("covers needs most query terms in title/description/slug", () => {
  assert.ok(covers(POSTS[0], "self hosted tavily alternative"));
  assert.ok(!covers(POSTS[0], "searxng json api rate limit"));
});

test("near misses: thresholds, dedicated-article filter, clustering, ranking", () => {
  const rows = [
    row("searxng json api", "https://siftdog.com/", 400, 8), // near miss
    row("searxng api json format", "https://siftdog.com/", 200, 12), // same cluster
    row("tavily alternative self hosted", "https://siftdog.com/", 900, 9), // covered by a post
    row("mcp web search cursor", "https://siftdog.com/", 160, 15), // near miss, lower score
    row("siftdog", "https://siftdog.com/", 5000, 1.2), // position too good
    row("web crawler", "https://siftdog.com/", 120, 7), // too few impressions
    row("rag extraction", "https://siftdog.com/", 500, 35), // too far down
  ];
  const misses = findNearMisses(rows, POSTS);
  assert.deepEqual(
    misses.map((m) => m.queries),
    [["searxng json api", "searxng api json format"], ["mcp web search cursor"]],
  );
  assert.equal(misses[0].impressions, 600);
  assert.equal(findNearMisses(rows, POSTS, { minImpressions: 1000 }).length, 0);
});

test("dateRange ends 3 days ago and spans 28 days", () => {
  assert.deepEqual(dateRange(new Date("2026-09-29T12:00:00Z")), { startDate: "2026-08-30", endDate: "2026-09-26" });
});

test("topic priority: manual > near miss > backlog > model, skipping used ones", () => {
  const nearMisses = [{ query: "searxng json api", queries: ["searxng json api"], impressions: 400, position: 8, page: "/" }];
  const backlog = [{ topic: "Crawl a docs site" }, { topic: "Web search for Ollama", angle: "local" }];
  assert.equal(pickTopic({ input: " Custom ", nearMisses, backlog }).topic, "Custom");
  assert.equal(pickTopic({ nearMisses, backlog }).source, "search-console");
  const used = [{ queries: ["searxng json api"] }, { topic: "crawl a docs site" }];
  assert.deepEqual(pickTopic({ nearMisses, backlog, used }), { source: "backlog", topic: "Web search for Ollama", angle: "local" });
  assert.deepEqual(pickTopic({ nearMisses, backlog, used: [...used, { slug: "web-search-for-ollama" }] }), { source: "model" });
});

test("removeFromBacklog keeps comments and other topics", () => {
  const file = join(mkdtempSync(join(tmpdir(), "topics-")), "topics.yml");
  writeFileSync(file, '# keep me\ntopics:\n  - topic: "A"\n    angle: "x"\n  - "B"\n');
  removeFromBacklog("A", file);
  assert.match(readFileSync(file, "utf8"), /# keep me/);
  assert.deepEqual(readBacklog(file), [{ topic: "B" }]);
});

test("the repo backlog parses", () => {
  assert.ok(readBacklog().length > 0);
});
