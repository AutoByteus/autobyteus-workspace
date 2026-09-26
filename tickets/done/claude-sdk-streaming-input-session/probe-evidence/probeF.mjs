// Probe E: one long-lived streaming-input query (SDK 0.3.280, CLI on PATH)
import { query } from "/tmp/sdk0280/package/sdk.mjs";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
const marker = "/tmp/streamprobe/E.marker"; fs.rmSync(marker, { force: true });
const env = { ...process.env };
for (const k of Object.keys(env)) if (/^(CLAUDECODE|CLAUDE_CODE_|CLAUDE_PID|CLAUDE_AGENT_SDK_VERSION|CLAUDE_EFFORT)/.test(k)) delete env[k];
const t0 = Date.now(); const ts = () => ((Date.now() - t0) / 1000).toFixed(1).padStart(6) + "s";
// input channel
const queue = []; let wake = null; let closed = false;
const send = (label, text) => { const uuid = randomUUID(); console.log(ts(), `>>> SEND ${label} uuid=${uuid.slice(0,8)} :: ${text.slice(0,70)}`); queue.push({ type: "user", message: { role: "user", content: text }, parent_tool_use_id: null, uuid }); wake?.(); return uuid; };
async function* input() { while (!closed) { if (queue.length) { yield queue.shift(); continue; } await new Promise(r => (wake = r)); wake = null; } }
const q = query({ prompt: input(), options: { cwd: "/tmp/streamprobe", model: "haiku", permissionMode: "bypassPermissions", allowDangerouslySkipPermissions: true, env, settingSources: [], pathToClaudeCodeExecutable: process.env.HOME + "/.local/bin/claude" } });
const short = (u) => (u ? String(u).slice(0, 8) : "-");
let results = 0; const waiters = [];
const nextResult = () => new Promise(r => waiters.push(r));
(async () => {
  for await (const m of q) {
    if (m.type === "system" && m.subtype === "thinking_tokens") continue;
    if (m.type === "stream_event") continue;
    let extra = "";
    if (m.type === "system") extra = `${m.subtype} ${m.status ?? m.state ?? ""} ${m.subtype === "init" ? "pid-session=" + short(m.session_id) : ""}`;
    else if (m.type === "assistant") extra = JSON.stringify(m.message.content.map(c => c.type === "text" ? c.text.slice(0, 60) : c.type === "tool_use" ? `tool_use:${c.name}:${JSON.stringify(c.input).slice(0, 80)}` : c.type)) + ` echo=${short(m.user_message_uuid)}`;
    else if (m.type === "user") extra = `${m.isReplay ? "REPLAY " : ""}uuid=${short(m.uuid)} ` + (Array.isArray(m.message?.content) ? m.message.content.map(c => c.type).join(",") : "text");
    else if (m.type === "result") extra = `${m.subtype} origin=${JSON.stringify(m.origin)} answers=${short(m.user_message_uuid)} all=[${(m.user_message_uuids ?? []).map(short)}] num_turns=${m.num_turns} terminal=${m.terminal_reason ?? ""}`;
    console.log(ts(), m.type, extra);
    if (m.type === "result") { results++; waiters.splice(0).forEach(r => r(m)); }
  }
  console.log(ts(), "stream ended");
})().catch(e => console.log(ts(), "stream error", e.message));
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// Scenario 3: interrupt() during a long foreground tool, then continue in same process
send("S3a", "Use Bash (foreground) to run exactly: python3 -c 'import time; time.sleep(40); print(\"LONG_DONE\")' . Then reply with the output.");
await sleep(9000);
console.log(ts(), ">>> interrupt()");
try { const receipt = await q.interrupt(); console.log(ts(), "interrupt receipt", JSON.stringify(receipt)); } catch (e) { console.log(ts(), "interrupt error", e.message); }
await Promise.race([nextResult(), sleep(20000)]);
send("S3b", "Reply only ALIVE.");
await Promise.race([nextResult(), sleep(30000)]);
console.log(ts(), "closing");
closed = true; wake?.(); q.close();
await sleep(1000); process.exit(0);
