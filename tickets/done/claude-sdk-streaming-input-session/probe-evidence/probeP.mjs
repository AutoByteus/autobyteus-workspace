// Probe P: Stop with a queued message — compare interrupt({cancelQueued:true}) vs cancelAsyncMessage after the receipt,
// plus Stop in the prewait window. Unfiltered frame capture. argv: <cli path> <mode: cq|cam|prewait>
import { query } from "/tmp/sdk0280/package/sdk.mjs";
import { randomUUID } from "node:crypto";
import { env, ts, sleep } from "./lib.mjs";
const cli = process.argv[2], mode = process.argv[3];
let wake; const q2=[]; let closed=false;
async function* input(){ while(!closed){ if(q2.length){yield q2.shift();continue;} await new Promise(r=>wake=r);} }
const q=query({ prompt: input(), options:{ cwd:"/tmp/streamprobe", model:"haiku", permissionMode:"bypassPermissions", allowDangerouslySkipPermissions:true, settingSources:[], env, pathToClaudeCodeExecutable: cli }});
const short=(u)=>u?String(u).slice(0,8):"-";
const send=(t)=>{const uuid=randomUUID(); console.log(ts(),">>> SEND",short(uuid),t.slice(0,60)); q2.push({type:"user",parent_tool_use_id:null,uuid,message:{role:"user",content:t}}); wake?.(); return uuid;};
const results=[]; let w=[];
(async()=>{ try { for await (const m of q){
  const k = m.type + (m.subtype?"/"+m.subtype:"");
  if (k==="system/thinking_tokens" || k==="stream_event") continue;
  let x="";
  if (k==="system/init") x="capabilities="+JSON.stringify(m.capabilities??null);
  else if (m.type==="command_lifecycle" || k==="system/command_lifecycle") x=JSON.stringify(Object.fromEntries(Object.entries(m).filter(([kk])=>!["session_id","type"].includes(kk)))).slice(0,200);
  else if (m.type==="assistant") x=JSON.stringify(m.message.content.map(c=>c.type==="text"?c.text.slice(0,40):c.type==="tool_use"?"tool_use:"+c.name:c.type))+" echo="+short(m.user_message_uuid);
  else if (m.type==="user") x=(m.isReplay?"REPLAY ":"")+"uuid="+short(m.uuid);
  else if (m.type==="result") x=`${m.subtype} answers=[${(m.user_message_uuids??[]).map(short)}] origin=${JSON.stringify(m.origin)} terminal=${m.terminal_reason}`;
  else if (m.subtype==="task_notification"||m.subtype==="task_started") x=`${m.status??""} type=${m.task_type??""}`;
  console.log(ts(), "FRAME", k, x);
  if (m.type==="result"){ results.push(m); w.splice(0).forEach(r=>r()); }
}} catch(e){ console.log(ts(),"STREAM THREW",e.message); } })();
const nextResult=(ms=60000)=>Promise.race([new Promise(r=>w.push(r)),sleep(ms)]);
send("Reply only READY."); await nextResult(); await sleep(1500);
console.log(ts(),"==== mode", mode, "cli", cli);
if (mode==="prewait") {
  const a = send("Reply only A.");
  const r = await q.interrupt({ cancelQueued: true });
  console.log(ts(),"interrupt(cancelQueued) immediately after send ->", JSON.stringify(r));
} else {
  const a = send("Use Bash in the foreground to run: python3 -c 'import time; time.sleep(25)' then reply DONE.");
  await sleep(7000);
  const b = send("Reply only B-SHOULD-NOT-RUN.");
  await sleep(1500);
  if (mode==="cq") {
    const r = await q.interrupt({ cancelQueued: true });
    console.log(ts(),"interrupt(cancelQueued) ->", JSON.stringify(r));
  } else {
    const r = await q.interrupt();
    console.log(ts(),"interrupt() ->", JSON.stringify(r));
    for (const u of r?.still_queued ?? []) console.log(ts(),"cancelAsyncMessage",short(u),"->", JSON.stringify(await q.cancelAsyncMessage(u)));
  }
}
await sleep(12000);
send("Reply only AFTER."); await nextResult(30000); await sleep(1000);
console.log(ts(),"==== answered uuid lists:", JSON.stringify(results.map(r=>(r.user_message_uuids??[]).map(short))));
closed=true; wake?.(); q.close(); process.exit(0);
