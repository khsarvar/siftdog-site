import assert from "node:assert/strict";
import { test } from "node:test";
import { addedPosts, liveMessage, waitUntilLive } from "./announce.mjs";

test("addedPosts keeps only newly added post files", () => {
  const diff = [
    "A\tsrc/content/posts/new-post.md",
    "M\tsrc/content/posts/old-post.md",
    "D\tsrc/content/posts/gone.md",
    "A\tsrc/content/posts/notes.txt",
    "",
  ].join("\n");
  assert.deepEqual(addedPosts(diff), [{ file: "src/content/posts/new-post.md", slug: "new-post" }]);
});

test("waitUntilLive retries until the page returns 200", async () => {
  const statuses = [404, 404, 200];
  let calls = 0;
  const fetchImpl = async () => ({ status: statuses[calls++] });
  assert.equal(await waitUntilLive("https://x/", { delayMs: 0, fetchImpl }), true);
  assert.equal(calls, 3);
  assert.equal(await waitUntilLive("https://x/", { tries: 2, delayMs: 0, fetchImpl: async () => ({ status: 404 }) }), false);
});

test("liveMessage links the title and shows the bare URL for the preview", () => {
  assert.equal(liveMessage("A <b>", "https://siftdog.com/blog/a/"), ":rocket: *Live:* <https://siftdog.com/blog/a/|A b>\nhttps://siftdog.com/blog/a/");
});
