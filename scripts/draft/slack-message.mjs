// Slack message for a blog draft with Publish / Revise… / Reject buttons. Clicks go to the Slack
// app's interactivity endpoint (a Cloudflare Worker, maintained privately), which reads
// the PR number from the button value. Keep action_ids in sync with that Worker.
//   node scripts/draft/slack-message.mjs   (env: PR, URL, TITLE, WORDS, VERIFY, NOTE, SLACK_*)
import { slackPost } from "./lib.mjs";

const esc = (t) => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function draftMessage({ pr, url, title, words, verifyCount, note }) {
  const heading = note ? `:pencil2: ${esc(note)}` : ":memo: New blog draft";
  const verify = verifyCount > 0 ? `:warning: ${verifyCount} to verify (resolve in the PR before publishing)` : "0 to verify";
  const value = String(pr);
  return {
    text: `${note ?? "New blog draft"}: ${title}`,
    blocks: [
      { type: "section", text: { type: "mrkdwn", text: `${heading}\n*<${url}|${esc(title)}>*\n${words} words · ${verify}` } },
      {
        type: "actions",
        block_id: "draft",
        elements: [
          {
            type: "button",
            action_id: "publish",
            style: "primary",
            text: { type: "plain_text", text: "Publish" },
            value,
            confirm: {
              title: { type: "plain_text", text: "Publish this post?" },
              text: { type: "mrkdwn", text: "Merges the PR; siftdog.com updates in about a minute." },
              confirm: { type: "plain_text", text: "Publish" },
              deny: { type: "plain_text", text: "Cancel" },
            },
          },
          { type: "button", action_id: "revise", text: { type: "plain_text", text: "Revise…" }, value },
          {
            type: "button",
            action_id: "reject",
            style: "danger",
            text: { type: "plain_text", text: "Reject" },
            value,
            confirm: {
              title: { type: "plain_text", text: "Reject this draft?" },
              text: { type: "mrkdwn", text: "Closes the PR; this topic won't be drafted again." },
              confirm: { type: "plain_text", text: "Reject" },
              deny: { type: "plain_text", text: "Cancel" },
            },
          },
          { type: "button", action_id: "open", text: { type: "plain_text", text: "Open PR" }, url },
        ],
      },
    ],
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const e = process.env;
  const msg = draftMessage({ pr: e.PR, url: e.URL, title: e.TITLE, words: e.WORDS, verifyCount: Number(e.VERIFY || 0), note: e.NOTE || undefined });
  const sent = await slackPost(msg.text, { token: e.SLACK_BOT_TOKEN, channel: e.SLACK_CHANNEL_ID, blocks: msg.blocks });
  console.log(sent ? "posted to Slack" : "Slack not configured; skipped");
}
