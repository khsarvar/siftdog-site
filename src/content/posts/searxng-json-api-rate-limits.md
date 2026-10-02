---
title: "SearXNG JSON API: Enable JSON and Handle Rate Limits"
description: "Enable SearXNG's JSON output, test the API, and troubleshoot upstream rate limits when using it with Siftdog."
pubDate: "2026-10-02"
tags:
  - "tutorial"
  - "self-hosted"
  - "tavily"
faq:
  - q: "Why does SearXNG return 403 for format=json?"
    a: "JSON may not be listed under `search.formats` in the active `settings.yml`. Add it, restart SearXNG, and try the request again."
  - q: "Does enabling more engines prevent rate limits?"
    a: "It can give SearXNG more sources to query, but individual engines can still throttle or block your server."
  - q: "Does Siftdog retry searches until an engine works?"
    a: "No. It reports failing engines when all are unavailable; if some engines respond, it returns their results and logs which engines failed."
---

**In short:** Add `json` to SearXNG’s `search.formats` setting, then call its search endpoint with `format=json`. If upstream engines throttle or CAPTCHA your server, tune the engine mix and avoid bursts; Siftdog reports engine failures rather than hiding them.

## Enable the JSON format

SearXNG’s JSON output is a setting on your instance, not a separate API service. In the active `settings.yml`, make sure `json` is included under `search.formats`:

```yaml
search:
  formats:
    - html
    - json
```

Merge this into your existing settings rather than replacing the whole file. If you use Siftdog’s Docker Compose stack, it includes SearXNG; start the stack with `docker compose up`. If you run a separate SearXNG instance, point Siftdog’s `SEARXNG_URL` at it and enable JSON output there. See the [Siftdog README](https://github.com/khsarvar/siftdog) for setup options.

## Test the JSON endpoint

Try a direct request to SearXNG before debugging the app that depends on it:

```bash
curl -s 'http://localhost:8080/search?q=python&format=json'
```

If JSON is disabled, SearXNG can respond with `403`. Add `json` to the active `search.formats` list, restart the instance, and retry. This check separates a format-setting issue from an upstream engine problem.

## Reduce upstream rate-limit failures

SearXNG sends queries to the search engines configured on your instance. Those engines can return rate-limit responses, CAPTCHAs, or access-denied errors. SearXNG tracks engine errors and suspends engines for configured periods; a suspension is not the same as a broken JSON endpoint.

A few practical steps:

1. **Avoid bursts of identical searches.** Space out automated requests and avoid retry loops that immediately repeat a failed query.
2. **Use a varied engine mix.** In Siftdog’s stack, review `docker/searxng/settings.yml` and enable more engines if your current sources are frequently blocked.
3. **Check which engines are failing.** Treat repeated CAPTCHA or 429 errors as upstream blocking, not as evidence that the JSON format is misconfigured.

## What Siftdog does about failures

Siftdog uses SearXNG for `/search`. When some engines still work, Siftdog returns their results and logs the engines that failed. When every engine is failing, it returns `502` with the engine names and reasons—for example, a CAPTCHA or too-many-requests error—instead of an empty result that an agent might mistake for “nothing found.” Engines may recover on their own, from minutes to about a day; Siftdog recommends enabling more engines and avoiding bursts of identical searches.

If you expose SearXNG directly to untrusted callers, note that its incoming-request limiter is a separate control: it protects your instance from abusive clients and requires Valkey. It does not make an upstream search engine accept requests it has blocked.

## Limits

Self-hosting does not remove upstream engines’ rate limits, and changing the JSON setting does not make a blocked engine available. For an overview of running the full stack, see [how to self-host a Tavily alternative](/blog/self-host-tavily-alternative/).
