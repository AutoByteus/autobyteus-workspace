import { query } from "@anthropic-ai/claude-agent-sdk";
import fs from "node:fs";
import { randomUUID } from "node:crypto";
const scenario = process.argv[2];
const out = fs.createWriteStream(`/tmp/claude-compaction-probe2/frames-${scenario}.jsonl`);
const t0 = Date.now();
const log = (label, m) => out.write(JSON.stringify({ label, dt: Date.now() - t0, m }) + "\n");

class Channel { constructor(){this.q=[];this.w=null;this.done=false}
  push(m){ if(this.w){const w=this.w;this.w=null;w({value:m,done:false})} else this.q.push(m)}
  close(){this.done=true; if(this.w){this.w({value:undefined,done:true})}}
  [Symbol.asyncIterator](){return {next:()=> this.q.length?Promise.resolve({value:this.q.shift(),done:false}): this.done?Promise.resolve({value:undefined,done:true}): new Promise(r=>this.w=r)}}}

const filler = (n) => Array.from({length:n},(_,i)=>`Record ${i}: the quick brown fox ${i*7} jumps over lazy dog ${i*13}; checksum ${(i*2654435761)%1000003}.`).join("\n");
const sessionId = randomUUID();
const env = { ...process.env };
if (scenario === "auto") { env.CLAUDE_CODE_AUTO_COMPACT_WINDOW = "60000"; }
const input = new Channel();
const q = query({ prompt: input, options: { model: process.argv[3] || "claude-haiku-4-5", pathToClaudeCodeExecutable: "/Users/normy/.local/bin/claude", cwd: "/tmp/claude-compaction-probe2/work", permissionMode: "default", sessionId, env, tools: [] } });
const user = (text) => ({ type: "user", message: { role: "user", content: text }, parent_tool_use_id: null, session_id: sessionId });

const steps = {
  manual: [ "Reply with exactly: OK ONE", "/compact" ],
  auto: [ `Here is a data dump. Do not analyze it. Reply with exactly: OK DUMP1\n${filler(2200)}`, `More data. Reply with exactly: OK DUMP2\n${filler(2200)}`, "Reply with exactly: OK AFTER" ],
  long: [ `Data dump A. Reply with exactly: OK A\n${filler(2200)}`, `Data dump B. Reply with exactly: OK B\n${filler(2200)}`, "/compact" ],
  interrupt: [ `Here is a data dump. Reply with exactly: OK DUMP\n${filler(2500)}`, "/compact" ],
};
let stepIndex = 0; let interruptedOnce = false;
const sendNext = () => { if (stepIndex < steps[scenario].length) { const text = steps[scenario][stepIndex++]; log("SEND", { text: text.slice(0, 80), len: text.length }); input.push(user(text)); return true; } return false; };
sendNext();
for await (const m of q) {
  log("FRAME", m);
  if (scenario === "interrupt" && stepIndex === 2 && !interruptedOnce && m.type === "system" && m.subtype === "status" && m.status === "compacting") {
    interruptedOnce = true; log("ACTION", { interruptAfterMs: 3000 }); setTimeout(() => { log("ACTION", { interrupt: true }); q.interrupt().catch(e => log("ACTION", { interruptError: String(e) })); }, 3000);
  }
  if (m.type === "result") { if (!sendNext()) { input.close(); } }
}
log("END", {});
out.end();
