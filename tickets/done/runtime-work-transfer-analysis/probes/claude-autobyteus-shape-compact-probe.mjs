import { query } from "@anthropic-ai/claude-agent-sdk";
import fs from "node:fs";
import { randomUUID } from "node:crypto";
const variant = process.argv[2]; // "blocks" | "notefirst"
const out = fs.createWriteStream(`/tmp/claude-compaction-probe2/frames-p3-${variant}.jsonl`);
const t0 = Date.now(); const log = (label, m) => out.write(JSON.stringify({ label, dt: Date.now() - t0, m }) + "\n");
class Channel { constructor(){this.q=[];this.w=null;this.done=false} push(m){ if(this.w){const w=this.w;this.w=null;w({value:m,done:false})} else this.q.push(m)} close(){this.done=true; if(this.w){this.w({value:undefined,done:true})}} [Symbol.asyncIterator](){return {next:()=> this.q.length?Promise.resolve({value:this.q.shift(),done:false}): this.done?Promise.resolve({value:undefined,done:true}): new Promise(r=>this.w=r)}}}
const sessionId = randomUUID(); const input = new Channel();
const q = query({ prompt: input, options: { model: "claude-haiku-4-5", pathToClaudeCodeExecutable: "/Users/normy/.local/bin/claude", cwd: "/tmp/claude-compaction-probe2/work", permissionMode: "default", sessionId, tools: [] } });
// exact AutoByteus shape: { type:"user", uuid, parent_tool_use_id:null, message:{ role:"user", content:[blocks] } }
const msg = (blocks) => ({ type: "user", uuid: randomUUID(), parent_tool_use_id: null, message: { role: "user", content: blocks } });
const steps = [
  [{ type: "text", text: "Reply with exactly: OK ONE" }],
  variant === "notefirst"
    ? [{ type: "text", text: "[System note] Teammate X finished task 3." }, { type: "text", text: "/compact" }]
    : [{ type: "text", text: "/compact" }],
];
let i = 0; const next = () => { if (i < steps.length) { log("SEND", steps[i]); input.push(msg(steps[i++])); return true } return false };
next();
for await (const m of q) { log("FRAME", m); if (m.type === "result") { if (!next()) input.close(); } }
out.end();
