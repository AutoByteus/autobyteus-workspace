import { query } from "/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-server-ts/node_modules/@anthropic-ai/claude-agent-sdk/sdk.mjs";
import fs from "node:fs";
const mode = process.argv[2]; // A=close on result (ours), B=string prompt keep iterating, C=streaming input keep open
const marker = `/tmp/bgprobe/${mode}.marker`;
fs.rmSync(marker, { force: true });
const env = { ...process.env }; const disableBg = mode === "D";
for (const k of Object.keys(env)) if (/^(CLAUDECODE|CLAUDE_CODE_|CLAUDE_PID|CLAUDE_AGENT_SDK_VERSION|CLAUDE_EFFORT)/.test(k)) delete env[k];
const text = `Use the Bash tool with run_in_background set to true to run exactly this command: sleep 20; echo PROBE_DONE > ${marker}
After launching it, reply with the single word STARTED and end your turn immediately. Do not wait for or check the command. If later notified that it completed, reply with the single word NOTIFIED.`;
const t0 = Date.now(); const ts = () => ((Date.now()-t0)/1000).toFixed(1)+"s";
let prompt = text; let release;
if (mode === "C") {
  const gate = new Promise(r => (release = r));
  prompt = (async function* () {
    yield { type: "user", message: { role: "user", content: text }, parent_tool_use_id: null, session_id: "" };
    await gate; // keep stdin open
  })();
}
if (disableBg) env.CLAUDE_CODE_DISABLE_BACKGROUND_TASKS = "1";
const q = query({ prompt, options: { cwd: "/tmp/bgprobe", model: "haiku", permissionMode: "bypassPermissions", allowDangerouslySkipPermissions: true, env, settingSources: [] } });
let results = 0;
const deadline = setTimeout(() => { console.log(ts(), "deadline reached"); release?.(); q.close(); }, 60000);
try {
  for await (const m of q) {
    const extra = m.type === "system" ? (m.subtype + " " + (m.status ?? m.state ?? "") + (m.output_file ? " " + m.output_file : "")) : m.type === "result" ? m.subtype : m.type === "assistant" ? JSON.stringify(m.message.content.map(c => c.type === "text" ? c.text : c.type === "tool_use" ? `tool_use:${c.name}:${JSON.stringify(c.input)}` : c.type)) : "";
    console.log(ts(), m.type, extra);
    if (m.type === "result") {
      results++;
      if (mode === "A" || mode === "D") { console.log(ts(), "closing query on result (mirrors AutoByteus)"); q.close(); break; }
      if (mode === "C" && results >= 2) { release(); q.close(); break; }
    }
  }
} catch (e) { console.log(ts(), "error", e.message); }
clearTimeout(deadline);
console.log(ts(), "iteration ended; waiting 30s to see whether the background command survives");
await new Promise(r => setTimeout(r, 30000));
console.log(ts(), "marker exists:", fs.existsSync(marker));
process.exit(0);
