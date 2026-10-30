// Search selection and the read-only Parallel MCP tools used by the writer.
import { randomUUID } from "node:crypto";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

export const PARALLEL_URL = "https://search.parallel.ai/mcp";
export const SEARCH_USER_AGENT = "siftdog-site/0.0.1 (+https://github.com/khsarvar/siftdog-site)";

export function resolveSearchProvider({ provider, env = process.env, client } = {}) {
  // Keep existing credentialed installations on their original search provider.
  const selected = provider ?? (env.BLOG_SEARCH_PROVIDER || undefined)
    ?? (env.OPENAI_API_KEY || client?.apiKey ? "openai" : "parallel");
  if (!["parallel", "openai", "none"].includes(selected)) {
    throw new Error(`Unknown BLOG_SEARCH_PROVIDER: ${selected}`);
  }
  return selected;
}

// MCP returns structured data or JSON text blocks. Keep actual source URLs for the PR.
export function sourceUrls(result) {
  const urls = new Set();
  const visit = (value) => {
    if (!value || typeof value !== "object") return;
    if (typeof value.url === "string") {
      try {
        const url = new URL(value.url);
        if (["http:", "https:"].includes(url.protocol)) urls.add(value.url);
      } catch { /* Not a source URL. */ }
    }
    for (const child of Object.values(value)) visit(child);
  };
  visit(result.structuredContent);
  for (const block of result.content ?? []) {
    if (block.type === "text") {
      try { visit(JSON.parse(block.text)); } catch { /* Plain text has no structured sources. */ }
    }
  }
  return [...urls];
}

export async function connectParallel({ model, signal, timeoutMs = 30_000, fetchImpl = fetch } = {}) {
  const client = new Client({ name: "siftdog-site", version: "0.0.1" });
  // Apply deadlines to HTTP setup as well as individual MCP requests.
  const transport = new StreamableHTTPClientTransport(new URL(PARALLEL_URL), {
    requestInit: { headers: { "User-Agent": SEARCH_USER_AGENT } },
    fetch: (url, init = {}) => fetchImpl(url, {
      ...init,
      signal: AbortSignal.any([init.signal, signal, AbortSignal.timeout(timeoutMs)].filter(Boolean)),
    }),
  });
  const options = { signal, timeout: timeoutMs };
  const sessionId = randomUUID();
  try {
    signal?.throwIfAborted();
    await client.connect(transport, options);
    const { tools } = await client.listTools({}, options);
    const allowed = tools.filter((t) => ["web_search", "web_fetch"].includes(t.name));
    if (allowed.length !== 2) throw new Error("Parallel MCP did not advertise web_search and web_fetch");
    return {
      tools: allowed.map((tool) => {
        const parameters = structuredClone(tool.inputSchema);
        // Session identity and model metadata come from the caller, never the model's arguments.
        delete parameters.properties?.session_id;
        delete parameters.properties?.model_name;
        if (parameters.required) parameters.required = parameters.required.filter((k) => !["session_id", "model_name"].includes(k));
        return { type: "function", name: `parallel_${tool.name}`, description: tool.description, parameters, strict: false };
      }),
      async call(name, args) {
        signal?.throwIfAborted();
        const tool = allowed.find((t) => `parallel_${t.name}` === name);
        if (!tool) throw new Error(`Search tool is not allowed: ${name}`);
        if (!args || typeof args !== "object" || Array.isArray(args)) throw new Error("Search arguments must be an object");
        const result = await client.callTool({
          name: tool.name,
          arguments: { ...args, session_id: sessionId, model_name: model },
        }, undefined, options);
        if (result.isError) {
          throw new Error(`Parallel ${tool.name} failed: ${result.content.filter((c) => c.type === "text").map((c) => c.text).join(" ")}`);
        }
        return result;
      },
      close: () => client.close(),
    };
  } catch (error) {
    await client.close();
    throw error;
  }
}
