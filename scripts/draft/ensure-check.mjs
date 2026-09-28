// Make sure the required `pr-check` runs for a bot-pushed draft commit, in a way branch
// protection counts. PRs and pushes made with GITHUB_TOKEN get a pull_request run that waits for
// approval ("action_required"); only that run's result is linked to the PR, so approve it.
// Falls back to workflow_dispatch (visible on the commit, but not counted by protection).
//   node scripts/draft/ensure-check.mjs <branch>
// Env: GITHUB_TOKEN, GITHUB_REPOSITORY.
import { execFileSync } from "node:child_process";

const [branch] = process.argv.slice(2);
const repo = process.env.GITHUB_REPOSITORY;
const headers = { Authorization: `Bearer ${process.env.GITHUB_TOKEN}`, Accept: "application/vnd.github+json" };
const api = `https://api.github.com/repos/${repo}/actions`;
const sha = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();

async function findRun() {
  const q = new URLSearchParams({ event: "pull_request", head_sha: sha, per_page: "20" });
  const resp = await fetch(`${api}/runs?${q}`, { headers });
  if (!resp.ok) throw new Error(`list runs: HTTP ${resp.status}`);
  return (await resp.json()).workflow_runs.find((r) => r.path === ".github/workflows/pr-check.yml");
}

for (let i = 0; i < 12; i++) {
  const run = await findRun();
  if (run?.conclusion === "action_required") {
    const resp = await fetch(`${api}/runs/${run.id}/approve`, { method: "POST", headers });
    if (!resp.ok) throw new Error(`approve run ${run.id}: HTTP ${resp.status} ${await resp.text()}`);
    console.log(`approved pr-check run ${run.html_url}`);
    process.exit(0);
  }
  if (run) {
    console.log(`pr-check already running: ${run.html_url}`);
    process.exit(0);
  }
  await new Promise((r) => setTimeout(r, 5000));
}

execFileSync("gh", ["workflow", "run", "pr-check.yml", "--ref", branch], { stdio: "inherit" });
console.log("::warning::no pull_request run appeared; dispatched pr-check instead (branch protection won't count it — push any commit to the PR to get a counted run)");
