// Probe (autobyteus-460): does one running Claude CLI process (streaming session, as the app runs it)
// see a skill folder linked into <cwd>/.claude/skills after the session started, and drop a removed one?
import fs from "node:fs";
const [sdkPath, workspace, betaSource] = process.argv.slice(2);
const { query } = await import(`${sdkPath}/sdk.mjs`);

const asks = [];
let wake = null;
const nextAsk = () => new Promise((resolve) => { wake = resolve; });
async function* input() {
  for (;;) {
    const text = await nextAsk();
    if (text === null) return;
    yield { type: "user", message: { role: "user", content: text }, parent_tool_use_id: null, session_id: "" };
  }
}
const QUESTION = "Without using any tool, list the exact names of all skills your Skill tool currently offers, comma-separated, nothing else.";
const q = query({ prompt: input(), options: { cwd: workspace, model: "haiku", settingSources: ["project"], permissionMode: "bypassPermissions", allowDangerouslySkipPermissions: true, maxTurns: 3 } });
const steps = [
  async () => {},
  async () => { fs.symlinkSync(betaSource, `${workspace}/.claude/skills/beta-skill`); await new Promise((r) => setTimeout(r, 4000)); },
  async () => { fs.unlinkSync(`${workspace}/.claude/skills/alpha-skill`); await new Promise((r) => setTimeout(r, 4000)); },
];
let step = 0;
const labels = ["T1 (alpha linked at start)", "T2 (beta linked mid-session)", "T3 (alpha unlinked mid-session)"];
await steps[0]();
wake(QUESTION);
for await (const message of q) {
  if (message.type === "system" && message.subtype === "init") {
    console.log(`INIT pid-session=${message.session_id} claude_code_version=${message.claude_code_version ?? "?"} skills=${JSON.stringify(message.skills ?? null)}`);
  }
  if (message.type === "result") {
    console.log(`${labels[step]} ANSWER: ${String(message.result).trim()}`);
    step += 1;
    if (step >= steps.length) { wake(null); break; }
    await steps[step]();
    wake(QUESTION);
  }
}
process.exit(0);
