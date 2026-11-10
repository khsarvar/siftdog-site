---
title: "Run a Shared Web Search Server for Your Team"
description: "Deploy Siftdog with Docker Compose, put HTTPS in front of it, and connect teammates to its remote MCP endpoint."
pubDate: "2026-11-10"
tags:
  - "self-hosted"
  - "mcp"
  - "tutorial"
faq:
  - q: "Can teammates have separate API keys?"
    a: "Yes. `API_KEYS` accepts comma-separated keys, so you can configure more than one key for the server."
  - q: "Can I use another HTTPS reverse proxy instead of Caddy?"
    a: "Yes. The important pieces are forwarding requests to Siftdog and allowing the public hostname through `MCP_ALLOWED_HOSTS`."
  - q: "What happens if search engines rate-limit the server?"
    a: "Siftdog may return an error if all upstream search engines fail. Extract, crawl, and map do not use SearXNG search."
---

**In short:** run Siftdog and SearXNG with Docker Compose, set an API key and your public MCP hostname, then route HTTPS traffic to the server. Teammates can connect to the shared `/mcp` endpoint using an authorization header.

## Start the shared server

On the server, clone Siftdog and create its environment file:

```bash
git clone https://github.com/khsarvar/siftdog && cd siftdog
cp .env.example .env
```

Edit `.env` and set a secret key plus the hostname your team will use. Keep the key private, and don't commit `.env` to your repository.

```dotenv
API_KEYS=replace-with-a-long-random-key
MCP_ALLOWED_HOSTS=search.example.com
```

The Compose setup supplies the SearXNG address for the included search service. Start the stack:

```bash
docker compose up -d
```

Before inviting teammates, make sure the server is reachable at the address you plan to use. Restrict direct public access to Siftdog’s port `8000` at your firewall if traffic should go through the HTTPS proxy instead.

## Add HTTPS in front

One option is to run Caddy on the host and proxy your team hostname to Siftdog’s local port. Add this to the Caddyfile, replacing the example hostname:

```caddyfile
search.example.com {
    reverse_proxy localhost:8000
}
```

Point your hostname at the server and make ports `80` and `443` reachable. Caddy can then provision HTTPS and redirect HTTP requests to HTTPS. The proxy forwards the request path, so `/mcp` reaches Siftdog as `/mcp`.

If Caddy runs in a container, `localhost` refers to that Caddy container, not the host or Siftdog container. Configure the proxy with an address that Caddy can reach instead. Check the [Caddy HTTPS quick-start](https://caddyserver.com/docs/quick-starts/https) and [reverse proxy documentation](https://caddyserver.com/docs/caddyfile/directives/reverse_proxy) for proxy and HTTPS details.

## Connect teammates to remote MCP

Share the HTTPS endpoint and each teammate’s API key through your usual secret-sharing method. For Claude Code, the connection command is:

```bash
claude mcp add --transport http siftdog https://search.example.com/mcp \
  --header "Authorization: Bearer <key>"
```

Use the header when the MCP client supports it. For clients that cannot set headers, Siftdog also accepts `?api_key=<key>` on the MCP URL. Prefer the header: query strings can be recorded in logs. The hostname in the public URL must match an entry in `MCP_ALLOWED_HOSTS`; add more hostnames there if your team uses multiple names.

For more detail on client setup, see [adding web search to Claude Code](/blog/add-web-search-to-claude-code/) or [connecting Cursor to Siftdog](/blog/add-web-search-to-cursor-with-mcp/). The [Siftdog README](https://github.com/khsarvar/siftdog) covers other MCP clients and the local stdio option.
