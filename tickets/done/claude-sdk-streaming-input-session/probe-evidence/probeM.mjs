import { query } from "/tmp/sdk0280/package/sdk.mjs";
import { randomUUID } from "node:crypto";
import { env, ts, sleep } from "./lib.mjs";
let wake; const q2=[]; let closed=false;
async function* input(){ while(!closed){ if(q2.length){yield q2.shift();continue;} await new Promise(r=>wake=r);} }
const q=query({ prompt: input(), options:{ cwd:"/tmp/streamprobe", model:"haiku", permissionMode:"bypassPermissions", allowDangerouslySkipPermissions:true, settingSources:[], env, pathToClaudeCodeExecutable: process.env.HOME+"/.local/bin/claude" }});
const send=(t)=>{const uuid=randomUUID(); console.log(ts(),">>> SEND",uuid.slice(0,8),t.slice(0,60)); q2.push({type:"user",parent_tool_use_id:null,uuid,message:{role:"user",content:t}}); wake?.(); return uuid;};
let n=0; const w=[];
(async()=>{ for await (const m of q){
  if(m.type==="system"&&m.subtype==="command_lifecycle") console.log(ts(),"LIFECYCLE",JSON.stringify(Object.fromEntries(Object.entries(m).filter(([k])=>!["session_id"].includes(k)))));
  else if(m.type==="system" && m.subtype==="init") console.log(ts(),"init");
  else if(m.type==="result"){ console.log(ts(),"result",m.subtype,"answers",JSON.stringify((m.user_message_uuids??[]).map(x=>x.slice(0,8))), m.terminal_reason); n++; w.splice(0).forEach(r=>r()); }
  else if(m.type==="assistant") console.log(ts(),"assistant", JSON.stringify(m.message.content.map(c=>c.type==="text"?c.text.slice(0,50):c.type==="tool_use"?"tool_use:"+c.name:c.type)), "echo", (m.user_message_uuid??"-").slice(0,8));
}})();
const next=()=>new Promise(r=>w.push(r));
// M1: two messages back-to-back while idle
send("Reply only ONE."); send("Reply only TWO.");
await next(); await sleep(6000);
// M2: interrupt with a queued message; see receipt and lifecycle
send("Use Bash in the foreground to run: python3 -c 'import time; time.sleep(25)' then reply DONE.");
await sleep(6000); const queued = send("Reply only QUEUED-AFTER-INTERRUPT.");
await sleep(1500);
console.log(ts(),"interrupt receipt", JSON.stringify(await q.interrupt()));
await sleep(12000);
closed=true; wake?.(); q.close(); process.exit(0);
