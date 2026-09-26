import { query } from "/tmp/sdk0280/package/sdk.mjs";
import fs from "node:fs";
const env = { ...process.env };
for (const k of Object.keys(env)) if (/^(CLAUDECODE|CLAUDE_CODE_|CLAUDE_PID|CLAUDE_AGENT_SDK_VERSION|CLAUDE_EFFORT)/.test(k)) delete env[k];
const data = fs.readFileSync("/tmp/streamprobe/red.png").toString("base64");
let wake; const q2=[]; let closed=false;
async function* input(){ while(!closed){ if(q2.length){yield q2.shift();continue;} await new Promise(r=>wake=r);} }
const q = query({ prompt: input(), options: { cwd: "/tmp/streamprobe", model: "haiku", env, settingSources: [], tools: [], pathToClaudeCodeExecutable: process.env.HOME + "/.local/bin/claude" } });
q2.push({ type:"user", parent_tool_use_id:null, message:{ role:"user", content:[
  { type:"text", text:"What single color fills this image? Answer with one word. Do not use any tools." },
  { type:"image", source:{ type:"base64", media_type:"image/png", data } } ] } }); wake?.();
for await (const m of q) {
  if (m.type==="assistant") console.log("assistant:", JSON.stringify(m.message.content.map(c=>c.type==="text"?c.text:c.type)));
  if (m.type==="result") { console.log("result:", m.subtype, "num_turns", m.num_turns); break; }
}
closed=true; wake?.(); q.close(); process.exit(0);
