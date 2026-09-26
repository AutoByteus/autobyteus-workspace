import { query } from "/tmp/sdk0280/package/sdk.mjs";
import fs from "node:fs";
const env = { ...process.env };
for (const k of Object.keys(env)) if (/^(CLAUDECODE|CLAUDE_CODE_|CLAUDE_PID|CLAUDE_AGENT_SDK_VERSION|CLAUDE_EFFORT)/.test(k)) delete env[k];
const b64 = (p) => fs.readFileSync(p).toString("base64");
const t0=Date.now(); const ts=()=>((Date.now()-t0)/1000).toFixed(1).padStart(6)+"s";
function open(opts){ let wake; const q2=[]; let closed=false;
  async function* input(){ while(!closed){ if(q2.length){yield q2.shift();continue;} await new Promise(r=>wake=r);} }
  const q=query({ prompt: input(), options:{ cwd:"/tmp/streamprobe", model:"haiku", env, settingSources:[], tools:[], pathToClaudeCodeExecutable: process.env.HOME+"/.local/bin/claude", ...opts }});
  const it=q[Symbol.asyncIterator](); let sid=null;
  return { send(content){ q2.push({type:"user",parent_tool_use_id:null,message:{role:"user",content}}); wake?.(); },
    async reply(){ let text=""; for(;;){ const {value:m,done}=await it.next(); if(done) return {text:"<stream ended>",sid}; if(m.session_id) sid=m.session_id;
      if(m.type==="assistant") text+=m.message.content.filter(c=>c.type==="text").map(c=>c.text).join("");
      if(m.type==="result") return {text: (text||"") + ` [result=${m.subtype}${m.is_error?" is_error":""}${m.result&&m.subtype!=="success"?"":""}]`, sid, errors:m.errors}; } },
    close(){ closed=true; wake?.(); q.close(); } };
}
const img=(data,mt="image/png")=>({type:"image",source:{type:"base64",media_type:mt,data}});
const s=open({});
s.send([{type:"text",text:"One word: color?"}, img(b64("/tmp/streamprobe/red.jpg"),"image/png")]);
let r=await s.reply(); console.log(ts(),"I1 jpeg labelled png:",r.text.slice(0,300), JSON.stringify(r.errors??"").slice(0,300));
s.send([{type:"text",text:"One word: color?"}, img(b64("/tmp/streamprobe/red.tiff"),"image/tiff")]);
r=await s.reply(); console.log(ts(),"I2 tiff:",r.text.slice(0,300), JSON.stringify(r.errors??"").slice(0,300));
s.send([{type:"text",text:"One word: color?"}, img(Buffer.from("not an image at all").toString("base64"),"image/png")]);
r=await s.reply(); console.log(ts(),"I3 corrupt png:",r.text.slice(0,300), JSON.stringify(r.errors??"").slice(0,300));
s.send("Reply only ALIVE.");
r=await s.reply(); console.log(ts(),"I4 after errors:",r.text.slice(0,200));
s.close(); process.exit(0);
