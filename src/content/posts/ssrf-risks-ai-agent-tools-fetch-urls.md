---
title: "SSRF Risks in AI Agent Tools That Fetch URLs"
description: "Learn why URL-fetching agent tools can expose internal services, how redirects and DNS rebinding complicate defenses, and what Siftdog blocks by default."
pubDate: "2026-11-13"
tags:
  - "security"
  - "self-hosted"
  - "tutorial"
faq:
  - q: "Does an API key prevent SSRF?"
    a: "No. An API key controls who can call Siftdog; SSRF protections control where the server can connect when fetching a URL."
  - q: "Should I set ALLOW_PRIVATE_NETWORKS=true for local development?"
    a: "Only if every caller is trusted and you specifically need fetches to private addresses. Leave it false otherwise."
  - q: "Does blocking private addresses also block redirects to them?"
    a: "Siftdog applies its address checks to redirects as well as the initial URL."
---

**In short:** Any tool that fetches a URL supplied by an agent or user can become a path to services reachable from the server. Siftdog blocks private, loopback, and link-local destinations by default, including across redirects and DNS rebinding; keep that protection enabled unless every caller is trusted.

## Why URL-fetching tools are SSRF targets

An `/extract` or `/crawl` tool makes network requests on behalf of its caller. That is useful when an agent needs to read a page, but it also means the server—not the agent’s local machine—connects to the supplied URL. If the server can reach internal services, a malicious or mistaken request could ask it to fetch addresses the caller cannot reach directly. This is the core risk of server-side request forgery (SSRF).

The risk is not limited to a URL that directly names a private address. A public URL can respond with a redirect to a private destination. A hostname can also resolve to a public address during an initial check and a private address when the HTTP client connects. Checking only the URL string, or checking DNS separately from the actual connection, can miss these cases.

## How Siftdog checks fetches

Siftdog blocks requests to private, loopback, and link-local addresses by default. It checks addresses on redirects and checks at connection time against the exact address being connected to, helping prevent DNS rebinding from bypassing the rule.

Siftdog’s user-URL fetches also ignore `HTTP(S)_PROXY`: routing through a proxy could hide the destination from the address check. For additional protection in a hostile, multi-tenant deployment, restrict outbound network access at the network level too.

## Keep private-network access disabled

The example configuration sets `ALLOW_PRIVATE_NETWORKS=false`. Keep it that way for untrusted or mixed-trust callers. Setting it to `true` allows the server to fetch internal addresses, so use it only when every caller is trusted and that access is intentional.

```env
ALLOW_PRIVATE_NETWORKS=false
```

If you expose a Siftdog server to clients, set `API_KEYS` so callers must authenticate. Authentication limits who can submit fetch requests; it does not replace destination checks. Review the [Siftdog repository](https://github.com/khsarvar/siftdog) and its security configuration before deployment.

## Limits

SSRF checks reduce the risk of URL fetching; they do not make every deployment safe by themselves. Restrict server egress where practical, keep private-network access off for untrusted callers, and avoid treating a successful API-key check as permission to fetch arbitrary internal resources. If your agent only needs to read known public pages, keep its requested URLs and server network access as narrow as your use case allows.
