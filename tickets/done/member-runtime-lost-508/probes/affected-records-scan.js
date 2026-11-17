// autobyteus-508: READ-ONLY affected-record scan. Usage: node affected-records-scan.js <memoryDir>. Prints run ids and runtime/model ids only; reads no message content.
// Read-only: family rule for invalid runtime/model pairs. Prints run ids and runtime/model ids only.
const f=require("fs"),p=require("path");const mem=process.argv[2];
const rd=(x)=>{try{return JSON.parse(f.readFileSync(x,"utf8"))}catch(e){return null}};
const alias=/^(opus|sonnet|haiku|fable|default)(\[1m\])?$/;
const invalid=(rt,m)=>{if(!rt||!m)return false;
 if(rt==="codex_app_server")return !/^(gpt|codex|o\d)/.test(m);
 if(rt==="claude_agent_sdk")return /^(gpt|gemini|o\d)/.test(m);
 if(rt==="antigravity_cli")return alias.test(m)||/^gpt-\d/.test(m);
 if(rt==="autobyteus")return alias.test(m);
 return false;};
const res={teamRuns:new Set(),agentRuns:new Set(),records:0,archivedRecords:0,nonDelegatedInvalid:0};const list=[];
const ti=rd(p.join(mem,"team_run_history_index.json"))||[];const ai=rd(p.join(mem,"run_history_index.json"))||[];
const tArch=new Map(ti.map(r=>[r.teamRunId,r.archivedAt]));const aArch=new Map(ai.map(r=>[r.runId,r.archivedAt]));
for(const d of f.readdirSync(p.join(mem,"agent_teams"))){const t=rd(p.join(mem,"agent_teams",d,"team_run_execution_tree.json"));if(!t||!t.rootTeam)continue;
 for(const m of t.rootTeam.members||[]){const lc=m.launchConfiguration||m;if(!invalid(lc.runtimeKind,lc.llmModelIdentifier))continue;
  if(!t.delegatedFrom){res.nonDelegatedInvalid++;continue}const arch=!!(t.archivedAt||tArch.get(d));res.records++;if(arch)res.archivedRecords++;res.teamRuns.add(d);list.push(["member",d,m.address,lc.runtimeKind+"/"+lc.llmModelIdentifier,arch?"archived":"open"].join(" "));}}
for(const d of f.readdirSync(p.join(mem,"agents"))){const md=rd(p.join(mem,"agents",d,"run_metadata.json"));if(!md||!invalid(md.runtimeKind,md.llmModelIdentifier))continue;
 if(!md.delegatedFrom){res.nonDelegatedInvalid++;continue}const arch=!!(md.archivedAt||aArch.get(d));res.records++;if(arch)res.archivedRecords++;res.agentRuns.add(d);list.push(["agent",d,"-",md.runtimeKind+"/"+md.llmModelIdentifier,arch?"archived":"open"].join(" "));}
console.log(list.join("\n"));console.log(JSON.stringify({teamRuns:res.teamRuns.size,agentRuns:res.agentRuns.size,records:res.records,archivedRecords:res.archivedRecords,nonDelegatedInvalid:res.nonDelegatedInvalid}));
