// Probe Q: background task completes after the turn's last tool boundary (during final model text). Unfiltered frames.
import { query } from "/tmp/sdk0280/package/sdk.mjs";
import { randomUUID } from "node:crypto";
import { env, ts, sleep } from "./lib.mjs";
const cli = process.argv[2] ?? process.env.HOME + "/.local/bin/claude";
let wake; const q2=[]; let closed=false;
async function* input(){ while(!closed){ if(q2.length){yield q2.shift();continue;} await new Promise(r=>wake=r);} }
const q=query({ prompt: input(), options:{ cwd:"/tmp/streamprobe", model:"haiku", permissionMode:"bypassPermissions", allowDangerouslySkipPermissions:true, settingSources:[], env, pathToClaudeCodeExecutable: cli }});
const short=(u)=>u?String(u).slice(0,8):"-";
q2.push({type:"user",parent_tool_use_id:null,uuid:randomUUID(),message:{role:"user",content:"Use Bash with run_in_background true to run: sleep 4; echo BG_DONE . Do NOT wait for it and do not check it. Right after launching it, write a detailed 500-word essay about the history of lighthouses as your reply (no more tool calls). If you are later told the background command finished, reply only NOTED."}}); wake?.();
(async()=>{ for await (const m of q){
  const k = m.type + (m.subtype?"/"+m.subtype:"");
  if (k==="system/thinking_tokens" || k==="stream_event" || k==="rate_limit_event") continue;
  let x="";
  if (m.type==="assistant") x=JSON.stringify(m.message.content.map(c=>c.type==="text"?c.text.slice(0,30)+"…("+c.text.length+" chars)":c.type==="tool_use"?"tool_use:"+c.name:c.type));
  else if (m.type==="result") x=`${m.subtype} answers=[${(m.user_message_uuids??[]).map(short)}] origin=${JSON.stringify(m.origin)} terminal=${m.terminal_reason}`;
  else if (m.subtype==="task_notification"||m.subtype==="task_started") x=`${m.status??""} type=${m.task_type??""} task=${m.task_id}`;
  else if (m.subtype==="background_tasks_changed") x=JSON.stringify(m.tasks.map(t=>t.task_id));
  else if (m.type==="command_lifecycle") x=`${m.state} ${short(m.command_uuid)}`;
  else if (m.type==="user") x="uuid="+short(m.uuid);
  console.log(ts(), k, x);
}})();
await sleep(60000); closed=true; wake?.(); q.close(); process.exit(0);
