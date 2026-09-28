// Google Search Console "near misses": queries with real impressions where siftdog.com ranks on
// positions ~5–20 but has no article dedicated to the query. They are the best candidates for a
// new post because the site already has some relevance for them.
import { GoogleAuth } from "google-auth-library";

const STOPWORDS = new Set(
  "a an and are as at be best by can do does for from free how i in is it of on or self the to vs what when which with without you your".split(
    " ",
  ),
);

// Crude stemming so "hosted"/"hosting"/"hosts" match "host".
const stem = (t) => (t.length > 4 ? t.replace(/(ing|ed|es|s)$/, "") : t);

export function terms(text) {
  return new Set(
    (text ?? "")
      .toLowerCase()
      .split(/[^\p{L}\p{N}]+/u)
      .filter((t) => t.length > 1 && !STOPWORDS.has(t))
      .map(stem),
  );
}

/** True if a post's title/description/slug contains ≥70% of the query's meaningful terms. */
export function covers(post, query, threshold = 0.7) {
  const q = terms(query);
  if (!q.size) return true;
  const p = terms(`${post.data.title} ${post.data.description} ${post.slug.replaceAll("-", " ")}`);
  let hit = 0;
  for (const t of q) if (p.has(t)) hit++;
  return hit / q.size >= threshold;
}

/** Aggregate query+page rows per query: total impressions, impression-weighted position, top page. */
export function aggregate(rows) {
  const byQuery = new Map();
  for (const { keys, impressions, clicks, position } of rows) {
    const [query, page] = keys;
    const q = byQuery.get(query) ?? { query, impressions: 0, clicks: 0, posSum: 0, pages: new Map() };
    q.impressions += impressions;
    q.clicks += clicks;
    q.posSum += position * impressions;
    q.pages.set(page, (q.pages.get(page) ?? 0) + impressions);
    byQuery.set(query, q);
  }
  return [...byQuery.values()].map(({ posSum, pages, ...q }) => ({
    ...q,
    position: q.impressions ? posSum / q.impressions : 100,
    page: [...pages.entries()].sort((a, b) => b[1] - a[1])[0]?.[0],
  }));
}

function jaccard(a, b) {
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  return inter / (a.size + b.size - inter || 1);
}

/**
 * Near misses, best first, grouped into clusters of similar queries so one post can target them.
 * Returns [{ query, queries, impressions, position, page, score }].
 */
export function findNearMisses(rows, posts, { minImpressions = 150, minPos = 5, maxPos = 20, exclude = [] } = {}) {
  const excluded = new Set(exclude.map((q) => q.toLowerCase()));
  const candidates = aggregate(rows)
    .filter((q) => q.impressions >= minImpressions && q.position >= minPos && q.position <= maxPos)
    .filter((q) => !excluded.has(q.query.toLowerCase()))
    .filter((q) => !posts.some((p) => covers(p, q.query)))
    .map((q) => ({ ...q, score: q.impressions * ((maxPos + 1 - q.position) / (maxPos + 1 - minPos)) }))
    .sort((a, b) => b.score - a.score);

  const clusters = [];
  for (const c of candidates) {
    const t = terms(c.query);
    const home = clusters.find((k) => jaccard(k.terms, t) >= 0.5);
    if (home) {
      home.queries.push(c.query);
      home.impressions += c.impressions;
      home.score += c.score;
    } else {
      clusters.push({ ...c, queries: [c.query], terms: t });
    }
  }
  return clusters
    .sort((a, b) => b.score - a.score)
    .map(({ terms: _t, clicks: _c, ...k }) => ({ ...k, position: Math.round(k.position * 10) / 10 }));
}

export function dateRange(today = new Date(), days = 28, lag = 3) {
  const end = new Date(today);
  end.setUTCDate(end.getUTCDate() - lag);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - (days - 1));
  const iso = (d) => d.toISOString().slice(0, 10);
  return { startDate: iso(start), endDate: iso(end) };
}

/** Fetch query+page rows for the property using a service-account JSON key. */
export async function fetchRows({ credentialsJson, siteUrl, today = new Date(), fetchImpl = fetch }) {
  const auth = new GoogleAuth({
    credentials: JSON.parse(credentialsJson),
    scopes: ["https://www.googleapis.com/auth/webmasters.readonly"],
  });
  const token = (await (await auth.getClient()).getAccessToken()).token;
  const url = `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`;
  const resp = await fetchImpl(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ ...dateRange(today), dimensions: ["query", "page"], rowLimit: 5000 }),
  });
  if (!resp.ok) {
    let msg = `Search Console ${resp.status} for ${siteUrl}: ${(await resp.text()).replace(/\s+/g, " ").slice(0, 200)}`;
    if (resp.status === 403) {
      // Say which properties this service account can see; usually a URL-prefix vs domain mismatch
      // or the account not yet added under Settings → Users and permissions.
      const sites = await fetchImpl("https://searchconsole.googleapis.com/webmasters/v3/sites", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const list = sites.ok ? ((await sites.json()).siteEntry ?? []).map((e) => `${e.siteUrl} (${e.permissionLevel})`) : [];
      msg += ` — properties this account can access: ${list.length ? list.join(", ") : "none"}`;
    }
    throw new Error(msg);
  }
  return (await resp.json()).rows ?? [];
}
