import { query } from "/tmp/sdk0280/package/sdk.mjs";
import { execSync } from "node:child_process";
const env = { ...process.env };
for (const k of Object.keys(env)) if (/^(CLAUDECODE|CLAUDE_CODE_|CLAUDE_PID|CLAUDE_AGENT_SDK_VERSION|CLAUDE_EFFORT)/.test(k)) delete env[k];
let wake; const q2=[]; let closed=false;
async function* input(){ while(!closed){ if(q2.length){yield q2.shift();continue;} await new Promise(r=>wake=r);} }
const q = query({ prompt: input(), options: { cwd: "/tmp/streamprobe", model: "haiku", env, settingSources: [], pathToClaudeCodeExecutable: process.env.HOME + "/.local/bin/claude" } });
const it = q[Symbol.asyncIterator]();
q2.push({ type:"user", message:{role:"user",content:"Reply only OK."}, parent_tool_use_id:null }); wake?.();
for(;;){ const {value,done}=await it.next(); if(done||value.type==="result") break; }
await new Promise(r=>setTimeout(r,5000));
const pids = execSync(`pgrep -P ${process.pid} || true`).toString().trim().split("\n").filter(Boolean);
for (const p of pids){ const rss=execSync(`ps -o rss= -p ${p}`).toString().trim(); const fp=execSync(`footprint -p ${p} 2>/dev/null | grep -i phys_footprint: | head -1 || true`).toString().trim(); console.log(`fresh idle claude pid=${p} rss=${Math.round(rss/1024)}MB ${fp}`); }
closed=true; wake?.(); q.close(); process.exit(0);
