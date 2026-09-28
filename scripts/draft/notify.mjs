// Post MESSAGE to Slack (SLACK_BOT_TOKEN, SLACK_CHANNEL_ID). No-op if Slack isn't configured.
import { slackPost } from "./lib.mjs";

const sent = await slackPost(process.env.MESSAGE ?? "", {
  token: process.env.SLACK_BOT_TOKEN,
  channel: process.env.SLACK_CHANNEL_ID,
});
console.log(sent ? "posted to Slack" : "Slack not configured; skipped");
