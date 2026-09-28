import assert from "node:assert/strict";
import { test } from "node:test";
import { checkPosts } from "./check-posts.mjs";
import { readPosts } from "./draft/lib.mjs";

const post = (file, title, body) => ({ file, data: { title }, body });

test("posts in the repo pass (VERIFY markers are enforced by check:posts in CI, not here)", () => {
  assert.deepEqual(checkPosts(readPosts(), { allowVerify: true }), []);
});

test("flags VERIFY markers, length, missing opener and duplicate titles", () => {
  const errors = checkPosts([
    post("a.md", "One", "**In short:** ok. <!-- VERIFY: price -->"),
    post("b.md", "Two", "**In short:** " + "word ".repeat(901)),
    post("c.md", "one", "No opener"),
  ]);
  assert.deepEqual(errors, [
    "a.md: unresolved VERIFY: price",
    "b.md: 903 words (max 900)",
    'c.md: missing "**In short:**" opener',
    "c.md: same title as a.md",
  ]);
});

test("--allow-verify ignores only VERIFY markers", () => {
  const posts = [post("a.md", "One", "**In short:** ok. <!-- VERIFY: price -->"), post("b.md", "Two", "none")];
  assert.deepEqual(checkPosts(posts, { allowVerify: true }), ['b.md: missing "**In short:**" opener']);
});
