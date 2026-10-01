import { query } from "/tmp/sdk0280/package/sdk.mjs";
import { randomUUID } from "node:crypto";
export const env = { ...process.env };
for (const k of Object.keys(env)) if (/^(CLAUDECODE|CLAUDE_CODE_|CLAUDE_PID|CLAUDE_AGENT_SDK_VERSION|CLAUDE_EFFORT)/.test(k)) delete env[k];
const t0=Date.now(); export const ts=()=>((Date.now()-t0)/1000).toFixed(1).padStart(6)+"s";
const short=(u)=>u?String(u).slice(0,8):"-";
export function openSession(opts={}, label="") {
  let wake; const q2=[]; let closed=false;
  async function* input(){ while(!closed){ if(q2.length){yield q2.shift();continue;} await new Promise(r=>wake=r);} }
  const q=query({ prompt: input(), options:{ cwd:"/tmp/streamprobe", model:"haiku", permissionMode:"bypassPermissions", allowDangerouslySkipPermissions:true, settingSources:[], pathToClaudeCodeExecutable: process.env.HOME+"/.local/bin/claude", ...opts, env:{...env, ...(opts.env??{})} }});
  const waiters=[]; let sid=null; const results=[];
  const done=(async()=>{ try { for await (const m of q){
      if (m.session_id) sid=m.session_id;
      if (m.type==="system" && ["thinking_tokens","command_lifecycle"].includes(m.subtype)) continue;
      if (m.type==="stream_event"||m.type==="rate_limit_event") continue;
      let x="";
      if(m.type==="system") x=`${m.subtype} ${m.status??m.state??""} ${m.task_type?("type="+m.task_type):""} ${m.tool_use_id?("tool="+short(m.tool_use_id)):""} ${m.subtype==="background_tasks_changed"?JSON.stringify(m.tasks.map(t=>t.task_type+":"+t.description)):""}`;
      else if(m.type==="assistant") x=JSON.stringify(m.message.content.map(c=>c.type==="text"?c.text.slice(0,70):c.type==="tool_use"?`tool_use:${c.name}:${JSON.stringify(c.input).slice(0,70)}`:c.type));
      else if(m.type==="user") x=(m.isReplay?"REPLAY ":"")+(Array.isArray(m.message?.content)?m.message.content.map(c=>c.type==="tool_result"?"tool_result:"+JSON.stringify(c.content).slice(0,110):c.type==="text"?"text:"+c.text.slice(0,110):c.type).join(" | "):"text:"+String(m.message?.content).slice(0,110));
      else if(m.type==="result") x=`${m.subtype} origin=${JSON.stringify(m.origin)} answers=[${(m.user_message_uuids??[]).map(short)}] terminal=${m.terminal_reason??""}`;
      console.log(ts(), label, m.type, x);
      if(m.type==="result"){ results.push(m); waiters.splice(0).forEach(r=>r(m)); }
    } console.log(ts(), label, "STREAM ENDED normally"); } catch(e){ console.log(ts(), label, "STREAM THREW:", e.message.slice(0,200)); }
    waiters.splice(0).forEach(r=>r(null)); })();
  return { q, get sid(){return sid;}, done,
    send(text){ const uuid=randomUUID(); console.log(ts(), label, ">>> SEND", short(uuid), text.slice(0,80)); q2.push({type:"user",parent_tool_use_id:null,uuid,message:{role:"user",content:text}}); wake?.(); return uuid; },
    nextResult(ms=120000){ return Promise.race([new Promise(r=>waiters.push(r)), new Promise(r=>setTimeout(()=>r("TIMEOUT"),ms))]); },
    close(){ closed=true; wake?.(); try{q.close();}catch{} } };
}
export const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
