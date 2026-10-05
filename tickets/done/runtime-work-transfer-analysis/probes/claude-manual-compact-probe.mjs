import { query } from "/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-server-ts/node_modules/@anthropic-ai/claude-agent-sdk/sdk.mjs";
import fs from "node:fs";
const out = fs.createWriteStream("/tmp/claude-compaction-probe/frames.jsonl");
const log = (phase, m) => out.write(JSON.stringify({ phase, at: Date.now(), m }) + "\n");
async function run(phase, prompt, extra = {}) {
  let sessionId = null;
  for await (const m of query({ prompt, options: { cwd: "/tmp/claude-compaction-probe/work", maxTurns: 2, permissionMode: "default", pathToClaudeCodeExecutable: "/Users/normy/.local/bin/claude", model: "claude-haiku-4-5", ...extra } })) {
    log(phase, m);
    if (m.session_id) sessionId = m.session_id;
  }
  return sessionId;
}
const sid = await run("seed", "Reply with exactly: OK PINEAPPLE. Do not use tools.");
console.log("session", sid);
await run("compact", "/compact", { resume: sid });
out.end();
