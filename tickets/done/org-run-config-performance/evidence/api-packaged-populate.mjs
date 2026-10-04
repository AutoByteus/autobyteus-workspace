// Operational stored-history fixture setup only; sequential public creates/Stops, no inference.
import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';import {performance} from 'node:perf_hooks';
const out=path.join(process.cwd(),'tickets/in-progress/org-run-config-performance/evidence');const info=JSON.parse(await fs.readFile(path.join(out,'api-packaged-start.json'),'utf8')).result;
const small=JSON.parse(await fs.readFile(path.join(out,'api-packaged-small-history.json'),'utf8'));const input=small.samples[0].sample.postData;assert.equal(input.rootConfiguration.llmModelIdentifier,'gpt-6.1-sol');assert.equal(input.rootConfiguration.runtimeKind,'codex_app_server');
const gql=async(query,variables={})=>{const r=await fetch(info.graphqlUrl,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({query,variables})});const b=await r.json();assert.equal(r.status,200);assert(!b.errors,JSON.stringify(b));return b.data;};
const stop=async id=>assert.equal((await gql('mutation($id:String!){terminateAgentOrgRun(agentOrgRunId:$id){success message}}',{id})).terminateAgentOrgRun.success,true);
const evidence={startedAt:new Date().toISOString(),input,mode:'sequential create/Stop, setup intervals NOT product latency',initialIds:small.samples.map(s=>s.sample.rowId),created:[],originalPackages:[],errors:[]};const save=()=>fs.writeFile(path.join(out,'api-packaged-population.json'),JSON.stringify(evidence,null,2)+'\n');await save();
try{
 for(const id of evidence.initialIds)await stop(id);
 const memory=path.join(info.dataRoot,'server-data/memory/agent_orgs');
 for(const id of evidence.initialIds)for(const name of await fs.readdir(path.join(memory,id))){const file=path.join(memory,id,name);if((await fs.stat(file)).isFile())evidence.originalPackages.push({id,name,sha256:createHash('sha256').update(await fs.readFile(file)).digest('hex')});}
 await save();
 for(let n=1;n<=500-evidence.initialIds.length;n++){
  const t=performance.now(),result=(await gql('mutation($input:CreateAgentOrgRunInput!){createAgentOrgRun(input:$input){success message agentOrgRunId}}',{input})).createAgentOrgRun;assert.equal(result.success,true,JSON.stringify(result));await stop(result.agentOrgRunId);evidence.created.push({n,id:result.agentOrgRunId,setupCreateStopMs:performance.now()-t});
  if(n%20===0){await save();console.log(JSON.stringify({storedRoots:n+evidence.initialIds.length,lastSetupMs:evidence.created.at(-1).setupCreateStopMs}));}
 }
 const roots=(await gql('{listCollaborationRootHistory{... on AgentOrgRootHistoryObject{root_run_id is_active}}}')).listCollaborationRootHistory;assert.equal(roots.length,500);assert(roots.every(r=>r.is_active===false));
 for(const f of evidence.originalPackages)assert.equal(createHash('sha256').update(await fs.readFile(path.join(memory,f.id,f.name))).digest('hex'),f.sha256,'Old owned package changed '+f.id+'/'+f.name);
 evidence.storedRoots=roots.length;evidence.oldPackageBytesRetained=true;evidence.completedAt=new Date().toISOString();await save();
}catch(e){evidence.failure=e.stack;await save();throw e;}
