import assert from "node:assert/strict";
import { test } from "node:test";
import { PARALLEL_URL, SEARCH_USER_AGENT, resolveSearchProvider, sourceUrls } from "./search.mjs";
import { writePost } from "./writer.mjs";

const good = {
  slug: "research", title: "Research", description: "Current documentation.", tags: ["mcp"], faq: [],
  body: "**In short:** Read the current docs.", sources: [{ claim: "Docs", url: "https://example.com/docs" }], summary: "Research.",
};
const final = () => ({ output_text: JSON.stringify(good), output: [] });
const call = (name, args, id = "call-1") => ({ type: "function_call", name, arguments: JSON.stringify(args), call_id: id });
const tools = [
  { name: "web_search", description: "Search the web", inputSchema: { type: "object", properties: { objective: { type: "string" }, search_queries: { type: "array", items: { type: "string" } }, session_id: { type: "string" }, model_name: { type: "string" } }, required: ["objective", "search_queries"] } },
  { name: "web_fetch", description: "Fetch a page", inputSchema: { type: "object", properties: { urls: { type: "array", items: { type: "string" } } }, required: ["urls"] } },
  { name: "write_file", inputSchema: { type: "object" } },
];

// Exercise the real MCP SDK over its HTTP boundary, without network or credentials.
function mcpFixture({ toolResult, hang, status, advertisedTools = tools } = {}) {
  const requests = [];
  const fetchImpl = async (url, init) => {
    const message = init.body ? JSON.parse(init.body) : null;
    const headers = new Headers(init.headers);
    requests.push({ url: String(url), headers, message, signal: init.signal });
    assert.equal(String(url), PARALLEL_URL);
    assert.equal(headers.get("user-agent"), SEARCH_USER_AGENT);
    assert.equal(headers.has("authorization"), false);
    if (status) return new Response("unavailable", { status });
    if (message?.method === hang) {
      return new Promise((_resolve, reject) => {
        if (init.signal.aborted) return reject(init.signal.reason);
        init.signal.addEventListener("abort", () => reject(init.signal.reason), { once: true });
      });
    }
    if (!message) return new Response(null, { status: 405 }); // No SSE listener.
    if (message.id === undefined) return new Response(null, { status: 202 });
    let result;
    if (message.method === "initialize") result = { protocolVersion: message.params.protocolVersion, capabilities: { tools: {} }, serverInfo: { name: "fixture", version: "1" } };
    else if (message.method === "tools/list") result = { tools: advertisedTools };
    else if (message.method === "tools/call") result = toolResult ?? { content: [{ type: "text", text: JSON.stringify({ results: [{ url: "https://example.com/docs", excerpts: ["Current documentation."] }] }) }] };
    else throw new Error(`Unexpected method ${message.method}`);
    return Response.json({ jsonrpc: "2.0", id: message.id, result });
  };
  return { fetchImpl, requests };
}

function scriptedClient(replies, { apiKey } = {}) {
  const requests = [];
  return { apiKey, requests, responses: { create: async (request, options) => {
    options.signal?.throwIfAborted();
    // The real SDK serializes immediately; capture the same snapshot of mutable history.
    requests.push(structuredClone(request));
    const reply = replies.shift();
    if (reply instanceof Error) throw reply;
    assert.ok(reply, "unexpected extra model call");
    return reply;
  } } };
}

const options = (client, fixture, extra = {}) => ({ client, env: {}, instructions: "Use canonical documentation.", input: "Research the docs", fetchImpl: fixture.fetchImpl, ...extra });

test("resolver preserves credentials and explicit choices, with Parallel for unconfigured clients", () => {
  assert.equal(resolveSearchProvider({ env: {} }), "parallel");
  assert.equal(resolveSearchProvider({ env: { OPENAI_API_KEY: "saved" } }), "openai");
  assert.equal(resolveSearchProvider({ env: {}, client: { apiKey: "saved" } }), "openai");
  assert.equal(resolveSearchProvider({ env: { OPENAI_API_KEY: "saved", BLOG_SEARCH_PROVIDER: "parallel" } }), "parallel");
  assert.equal(resolveSearchProvider({ provider: "none", env: { BLOG_SEARCH_PROVIDER: "parallel" } }), "none");
  assert.equal(resolveSearchProvider({ provider: "openai", env: {} }), "openai");
  assert.throws(() => resolveSearchProvider({ provider: "typo", env: {} }), /Unknown/);
});

test("unconfigured writePost dispatches search and fetch, consumes results and retains source URLs", async () => {
  const fixture = mcpFixture();
  const client = scriptedClient([
    { output: [{ type: "reasoning", encrypted_content: "opaque", summary: [] }, call("parallel_web_search", { objective: "Find docs", search_queries: ["example documentation"], session_id: "untrusted" })] },
    { output: [call("parallel_web_fetch", { urls: ["https://example.com/docs"] }, "call-2")] }, final(),
  ]);
  const result = await writePost(options(client, fixture));
  assert.equal(result.post.title, "Research");
  assert.deepEqual(result.consulted, ["https://example.com/docs"]);
  assert.deepEqual(client.requests[0].tools.map((t) => t.name), ["parallel_web_search", "parallel_web_fetch"]);
  assert.equal(client.requests[0].tools[0].parameters.properties.session_id, undefined);
  assert.deepEqual(client.requests[0].include, ["reasoning.encrypted_content"]);
  assert.equal(client.requests[1].store, false);
  assert.equal(client.requests[1].input[1].encrypted_content, "opaque");
  const output = client.requests[1].input.find((x) => x.type === "function_call_output");
  assert.equal(output.call_id, "call-1");
  assert.match(output.output, /Current documentation/);
  assert.match(client.requests[2].input.at(-1).output, /example.com/);
  const calls = fixture.requests.filter((r) => r.message?.method === "tools/call");
  assert.deepEqual(calls.map((r) => r.message.params.name), ["web_search", "web_fetch"]);
  const args = calls.map((r) => r.message.params.arguments);
  assert.match(args[0].session_id, /^[a-f0-9-]{36}$/);
  assert.equal(args[0].session_id, args[1].session_id);
  assert.equal(args[0].model_name, "gpt-6-luna");
  assert.ok(fixture.requests.some((r) => r.message?.method === "initialize"));
  assert.ok(fixture.requests.some((r) => r.message?.method === "tools/list"));
});

test("explicit Parallel overrides an existing inference key", async () => {
  const fixture = mcpFixture();
  await writePost(options(scriptedClient([final()], { apiKey: "inference-only" }), fixture, { env: { OPENAI_API_KEY: "saved", BLOG_SEARCH_PROVIDER: "parallel" } }));
  assert.ok(fixture.requests.length);
});

test("source URLs are deduplicated across structured and text results; non-web URLs are excluded", () => {
  assert.deepEqual(sourceUrls({
    structuredContent: { results: [{ url: "https://example.com/a?x=1#section" }, { url: "javascript:alert(1)" }] },
    content: [{ type: "text", text: JSON.stringify({ results: [{ url: "https://example.com/a?x=1#section" }, { url: "http://example.com/b" }, { url: "broken" }] }) }],
  }), ["https://example.com/a?x=1#section", "http://example.com/b"]);
});

test("post-validation retry retains research sources and the same search session", async () => {
  const fixture = mcpFixture();
  const client = scriptedClient([
    { output: [call("parallel_web_search", { objective: "docs", search_queries: ["docs"] })] },
    { output_text: JSON.stringify({ ...good, body: "missing opener" }), output: [] },
    { output: [call("parallel_web_fetch", { urls: ["https://example.com/docs"] }, "retry")] }, final(),
  ]);
  const result = await writePost(options(client, fixture));
  assert.deepEqual(result.consulted, ["https://example.com/docs"]);
  assert.match(client.requests[2].input[0].content, /previous attempt/);
  const calls = fixture.requests.filter((r) => r.message?.method === "tools/call");
  assert.equal(calls[0].message.params.arguments.session_id, calls[1].message.params.arguments.session_id);
});

test("configured OpenAI search and disabled tools do not contact MCP", async () => {
  const fixture = { fetchImpl: () => assert.fail("MCP must not be contacted") };
  for (const provider of ["openai", "none"]) {
    const client = scriptedClient([final()], { apiKey: "saved" });
    await writePost(options(client, fixture, { searchProvider: provider }));
    assert.deepEqual(client.requests[0].tools, provider === "none" ? [] : [{ type: "web_search", search_context_size: "medium" }]);
  }
  const client = scriptedClient([final()], { apiKey: "saved" });
  await writePost(options(client, fixture));
  assert.equal(client.requests[0].tools[0].type, "web_search");
});

test("MCP and model errors fail visibly without provider fallback", async () => {
  for (const fixture of [mcpFixture({ status: 503 }), mcpFixture({ toolResult: { isError: true, content: [{ type: "text", text: "quota reached" }] } }), mcpFixture({ advertisedTools: [] })]) {
    const client = scriptedClient([{ output: [call("parallel_web_search", { objective: "docs", search_queries: ["docs"] })] }, final()]);
    await assert.rejects(writePost(options(client, fixture)), /unavailable|quota reached|did not advertise/);
    assert.ok(client.requests.every((r) => r.tools.every((t) => t.type === "function")));
  }
  const fixture = mcpFixture();
  await assert.rejects(writePost(options(scriptedClient([new Error("model failed")]), fixture)), /model failed/);
});

test("unknown tools and malformed arguments are rejected before dispatch", async () => {
  for (const entry of [call("parallel_write_file", {}), call("parallel_web_fetch", []), { ...call("parallel_web_search", {}), arguments: "{" }]) {
    const fixture = mcpFixture();
    await assert.rejects(writePost(options(scriptedClient([{ output: [entry] }]), fixture)));
    assert.equal(fixture.requests.filter((r) => r.message?.method === "tools/call").length, 0);
  }
});

test("research is bounded to eight actual calls", async () => {
  const fixture = mcpFixture();
  const client = scriptedClient(Array.from({ length: 9 }, (_, i) => ({ output: [call("parallel_web_search", { objective: "docs", search_queries: ["docs"] }, String(i))] })));
  await assert.rejects(writePost(options(client, fixture)), /exceeded eight/);
  assert.equal(fixture.requests.filter((r) => r.message?.method === "tools/call").length, 8);
});

test("setup and tool calls time out; cancellation aborts HTTP before consuming a post", async () => {
  for (const hang of ["initialize", "tools/list", "tools/call"]) {
    const fixture = mcpFixture({ hang });
    const client = scriptedClient([{ output: [call("parallel_web_fetch", { urls: ["https://example.com/docs"] })] }, final()]);
    await assert.rejects(writePost(options(client, fixture, { searchTimeoutMs: 30 })), /timeout|timed out/i);
    assert.ok(fixture.requests.filter((r) => r.message?.method === hang).every((r) => r.signal.aborted));
  }
  const fixture = mcpFixture({ hang: "tools/call" });
  const controller = new AbortController();
  const client = scriptedClient([{ output: [call("parallel_web_fetch", { urls: ["https://example.com/docs"] })] }, final()]);
  const pending = writePost(options(client, fixture, { signal: controller.signal }));
  setTimeout(() => controller.abort(new Error("cancelled by owner")), 30);
  await assert.rejects(pending, /cancelled by owner/);
  assert.ok(fixture.requests.some((r) => r.message?.method === "tools/call" && r.signal.aborted));
  assert.equal(client.requests.length, 1);

  const preCancelled = new AbortController();
  preCancelled.abort(new Error("already cancelled"));
  const unopened = mcpFixture();
  await assert.rejects(writePost(options(scriptedClient([final()]), unopened, { signal: preCancelled.signal })), /already cancelled/);
  assert.equal(unopened.requests.length, 0);
});
