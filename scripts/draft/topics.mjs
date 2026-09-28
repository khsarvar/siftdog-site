// Which topic to draft next: manual input → Search Console near miss → backlog → model's choice.
import { readFileSync, writeFileSync } from "node:fs";
import YAML from "yaml";
import { slugify } from "./lib.mjs";

export const BACKLOG = "blog/topics.yml";

export function readBacklog(path = BACKLOG) {
  const doc = YAML.parse(readFileSync(path, "utf8")) ?? {};
  return (doc.topics ?? []).map((t) => (typeof t === "string" ? { topic: t } : t));
}

/** Rewrite the backlog without `topic`, keeping the file's comments. */
export function removeFromBacklog(topic, path = BACKLOG) {
  const doc = YAML.parseDocument(readFileSync(path, "utf8"));
  const items = doc.get("topics");
  if (!items?.items) return;
  const i = items.items.findIndex((n) => {
    const v = n.toJSON?.() ?? n;
    return (typeof v === "string" ? v : v.topic) === topic;
  });
  if (i >= 0) items.items.splice(i, 1);
  writeFileSync(path, doc.toString({ lineWidth: 0 }));
}

/**
 * @param input      topic typed into workflow_dispatch ("" if none)
 * @param nearMisses output of findNearMisses (best first)
 * @param backlog    readBacklog()
 * @param used       draft-meta of every earlier blog-draft PR ({topic, query, slug})
 * @returns {{source, topic, angle?, queries?, evidence?} | {source: "model"}}
 */
export function pickTopic({ input = "", nearMisses = [], backlog = [], used = [] }) {
  if (input.trim()) return { source: "manual", topic: input.trim() };

  const usedTopics = new Set(used.map((m) => m?.topic?.toLowerCase()).filter(Boolean));
  const usedQueries = new Set(used.flatMap((m) => m?.queries ?? []).map((q) => q.toLowerCase()));
  const usedSlugs = new Set(used.map((m) => m?.slug).filter(Boolean));

  const miss = nearMisses.find((k) => !k.queries.some((q) => usedQueries.has(q.toLowerCase())));
  if (miss) {
    return {
      source: "search-console",
      topic: miss.query,
      queries: miss.queries,
      evidence: { impressions: miss.impressions, position: miss.position, page: miss.page },
    };
  }

  const next = backlog.find((b) => !usedTopics.has(b.topic.toLowerCase()) && !usedSlugs.has(slugify(b.topic)));
  if (next) return { source: "backlog", topic: next.topic, angle: next.angle };

  return { source: "model" };
}
