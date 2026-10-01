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
// H1 real screenshot (3024x1896 PNG, 575 KB)
s.send([{type:"text",text:"In 10 words or fewer: what app UI is in this screenshot, and what tab is highlighted on the right?"}, img(b64("/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_df3e74e5e49741f085f22a8fe82ff251/solution_designer_d035ec15d72c486cb530cbd9ae25ad7a/context_files/ctx_3ddeaff1ccca__image.png"))]);
let r=await s.reply(); console.log(ts(),"H1 screenshot:",r.text);
// H2 url source
s.send([{type:"text",text:"One word: what is the dominant color of this image?"},{type:"image",source:{type:"url",url:"https://www.google.com/images/branding/googlelogo/2x/googlelogo_color_272x92dp.png"}}]);
r=await s.reply(); console.log(ts(),"H2 url source:",r.text, JSON.stringify(r.errors??""));
// H3 oversized (6 MB PNG)
s.send([{type:"text",text:"Describe this image in 3 words."}, img(b64("/tmp/streamprobe/big.png"))]);
r=await s.reply(); console.log(ts(),"H3 6MB image:",r.text.slice(0,300), JSON.stringify(r.errors??"").slice(0,300));
// H4 session still alive after oversized image?
s.send("Reply only ALIVE.");
r=await s.reply(); console.log(ts(),"H4 after oversize:",r.text.slice(0,200)); const sid=r.sid;
s.close(); await new Promise(r=>setTimeout(r,1000));
// H5 resume in a new process: does the earlier image survive?
const s2=open({ resume: sid });
s2.send("Without using tools: in the first screenshot I sent you earlier in this conversation, which tab was highlighted on the right? One word.");
r=await s2.reply(); console.log(ts(),"H5 after resume:",r.text.slice(0,200));
s2.close(); process.exit(0);
