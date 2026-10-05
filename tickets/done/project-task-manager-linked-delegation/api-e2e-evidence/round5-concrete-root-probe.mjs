// Temporary actual public-API/provider witness; exact owned desktop only. No mocks/source hooks.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
const E='tickets/in-progress/project-task-manager-linked-delegation/api-e2e-evidence';
const original=JSON.parse(await fs.readFile(E+'/api-005-instance.json')).result;
const i=JSON.parse(await fs.readFile(E+'/api-005-restart-after-import.json')).result;
assert.equal(i.instanceId,'iso-65323-9445');assert.equal(i.instanceId,original.instanceId);assert.equal(i.dataRoot,original.dataRoot);assert(i.ownsDataRoot);
const setup=JSON.parse(await fs.readFile(E+'/api-005-live-setup.json'));
const kind=process.argv[2];assert(['agent_team','agent_org'].includes(kind));
const out={instanceId:i.instanceId,kind,started:new Date().toISOString(),frames:[],checkpoints:[]};
const save=()=>fs.writeFile(`${E}/api-005-concrete-${kind}.json`,JSON.stringify(out,null,2)+'\n');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function gql(query,variables={}){const r=await fetch(i.graphqlUrl,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({query,variables}),signal:AbortSignal.timeout(45000)});assert.equal(r.status,200);const j=await r.json();assert(!j.errors,JSON.stringify(j.errors));return j.data;}
async function wait(fn,label,ms=180000){const until=Date.now()+ms;while(Date.now()<until){if(await fn())return;await sleep(500);}throw Error('TIMEOUT '+label);}
const state=async()=>JSON.parse(await fs.readFile(path.join(i.dataRoot,'server-data/projects/projects.json'),'utf8'));
const agents=(x)=>{const all=[];function walk(v){if(!v||typeof v!=='object')return;if(v.agentRunId||v.agent_run_id)all.push(v);for(const [k,a] of Object.entries(v))if(k!=='source'&&k!=='launchConfiguration'&&k!=='launch_configuration')if(Array.isArray(a))a.forEach(walk);else if(a&&typeof a==='object')walk(a);}walk(x);return all;};
const agentId=x=>x.agentRunId??x.agent_run_id;
const config={runtimeKind:'codex_app_server',llmModelIdentifier:'gpt-6.1-sol',llmConfig:{reasoning_effort:'low'},autoExecuteTools:true};
let ws;
try {
 const defs=(await gql('{agentDefinitions{id name}}')).agentDefinitions;
 const manager=defs.find(d=>d.name==='Project Task Manager');assert(manager);
 out.workspace=path.join(i.dataRoot,'validation-workspace','concrete-'+kind);await fs.mkdir(out.workspace,{recursive:true});await fs.writeFile(path.join(out.workspace,'protected-sentinel.txt'),'API005_PROTECT_'+kind+'\n');
 if(kind==='agent_team'){
  out.definition=(await gql('mutation($i:CreateAgentTeamDefinitionInput!){createAgentTeamDefinition(input:$i){id name}}',{i:{name:'API005 Concrete Root Team',description:'Owned concrete root witness',instructions:'Manager performs only business task work; borrowed member independent. No extra delegation except requested saved Tasks.',nodes:[{memberName:'manager',ref:manager.id,refScope:'SHARED'},{memberName:'borrowed',ref:setup.agent.id,refScope:'SHARED'}],coordinatorMemberName:'manager',defaultLaunchConfig:{runtimeKind:config.runtimeKind,llmModelIdentifier:config.llmModelIdentifier,llmConfig:config.llmConfig}}})).createAgentTeamDefinition;
  out.creation=(await gql('mutation($i:CreateAgentTeamRunInput!){createAgentTeamRun(input:$i){success message teamRunId}}',{i:{teamDefinitionId:out.definition.id,teamConfigs:[{...config,teamAddress:'/',workspaceRootPath:out.workspace}],memberConfigs:[{...config,memberAddress:'/manager',agentDefinitionId:manager.id,workspaceRootPath:out.workspace},{...config,memberAddress:'/borrowed',agentDefinitionId:setup.agent.id,workspaceRootPath:out.workspace}]}})).createAgentTeamRun;assert(out.creation.success,out.creation.message);out.rootId=out.creation.teamRunId;
 }else{
  out.definition=(await gql('mutation($i:CreateAgentOrgDefinitionInput!){createAgentOrgDefinition(input:$i){id name}}',{i:{name:'API005 Concrete Root Org Rerun '+randomUUID(),description:'Owned concrete Org witness',instructions:'Independent Manager business work and protected borrowed member; no coordinator or new policy.',members:[{memberName:'manager',ref:manager.id,refType:'AGENT',refScope:'SHARED'},{memberName:'borrowed',ref:setup.agent.id,refType:'AGENT',refScope:'SHARED'}],handoffs:[],defaultLaunchConfig:{runtimeKind:config.runtimeKind,llmModelIdentifier:config.llmModelIdentifier,llmConfig:config.llmConfig}}})).createAgentOrgDefinition;
  out.creation=(await gql('mutation($i:CreateAgentOrgRunInput!){createAgentOrgRun(input:$i){success message agentOrgRunId}}',{i:{agentOrgDefinitionId:out.definition.id,rootConfiguration:{...config,workspaceRootPath:out.workspace}}})).createAgentOrgRun;assert(out.creation.success,out.creation.message);out.rootId=out.creation.agentOrgRunId;
 }
 await save();
 const inspection=async()=>kind==='agent_team'?(await gql('query($id:String!){getTeamRunResumeConfig(teamRunId:$id){teamRunId isActive executionTree}}',{id:out.rootId})).getTeamRunResumeConfig:(await gql('query($id:String!){getAgentOrgRunInspection(orgRunId:$id)}',{id:out.rootId})).getAgentOrgRunInspection;
 out.initialInspection=await inspection();await save();
 const members=agents(out.initialInspection);const m=members.find(x=>(x.agentDefinitionId??x.agent_definition_id)===manager.id);assert(m);out.managerRunId=agentId(m);
 out.project=(await gql('mutation($i:CreateProjectInput!){createProject(input:$i){projectId name}}',{i:{name:'API005 '+kind+' saved-IDs '+randomUUID(),description:'Actual root-bound task proof'}})).createProject;
 out.tasks={};for(const k of ['A','B']){
  const base=i.backendUrl+'/rest/projects/'+out.project.projectId;
  let r=await fetch(base+'/task-context-drafts',{method:'POST',headers:{'content-type':'application/json'},body:'{}'});assert.equal(r.status,200);const draft=await r.json();const marker='API005_'+kind+'_'+k+'_'+randomUUID();const form=new FormData();form.append('file',new Blob([marker+'\n'],{type:'text/plain'}),'saved-'+kind+'-'+k+'.txt');r=await fetch(base+'/task-context-drafts/'+draft.draftId+'/context-files',{method:'POST',body:form});assert.equal(r.status,200);const file=await r.json();
  out.tasks[k]=(await gql('mutation($i:CreateProjectTaskInput!){createProjectTask(input:$i){taskId projectId description status contextFiles{storedFilename displayName locator}}}',{i:{projectId:out.project.projectId,description:'Read supplied saved Task attachment using runtime-native read-only cat or read_file; report exact actual read marker to requester through existing messaging/final answer. Do not modify files, create copies, or change any Task status.',contextDraft:{draftId:draft.draftId,storedFilenames:[file.storedFilename]}}})).createProjectTask;out.tasks[k].marker=marker;
 }
 await save();
 ws=new WebSocket(i.backendUrl.replace('http:','ws:')+(kind==='agent_team'?'/ws/agent-team/':'/ws/agent-org/')+encodeURIComponent(out.rootId));ws.addEventListener('message',e=>{try{out.frames.push(JSON.parse(String(e.data)));}catch{}});await wait(()=>ws.readyState===1,'owned public WS connected',30000);
 await wait(()=>out.frames.some(f=>f.type===(kind==='agent_team'?'TEAM_EXECUTION_VIEW_SNAPSHOT':'ROOT_EXECUTION_VIEW_SNAPSHOT')),'public root snapshot ready',30000);
 assert(!out.frames.some(f=>f.type==='ERROR')); 
 const send=(id,content)=>{const uid=randomUUID();out.checkpoints.push({send:id,at:new Date().toISOString(),content});ws.send(JSON.stringify({type:'SEND_MESSAGE',payload:kind==='agent_team'?{agent_run_id:id,content,context_file_paths:[],image_urls:[],message_id:uid,dedupe_key:uid}:{root_subject_kind:'agent_org',root_run_id:out.rootId,target_agent_run_id:id,command_id:uid,content,context_file_paths:[],image_urls:[],message_id:uid,dedupe_key:uid}}));};
 send(out.managerRunId,`Authorized own isolated validation. Resolve Project ${out.project.projectId}, list its saved Tasks. Consult list_available_agents. Delegate saved Task A ${out.tasks.A.taskId} ONCE to the listed exact API005 Packet Agent recipient address (it is /borrowed in this root) and Task B ${out.tasks.B.taskId} ONCE to the listed API005 Packet Team address using only recipient_address and task_id. Reuse exact saved descriptions/context, do not resend initial work. Explicitly mark each IN_PROGRESS after accepted dispatch. Do not mark DONE until my explicit instruction. No other Project/Tasks, no credentials/HOME/other files. Do not stop this Manager/root or delete anything.`);
 await wait(async()=>{out.currentState=await state();return out.currentState.find(p=>p.projectId===out.project.projectId)?.tasks.every(t=>t.status==='IN_PROGRESS');},'actual configured Manager saved-ID dispatch+progress',240000);
 out.lifetimes={};for(const k of ['A','B']){const l=out.currentState.find(p=>p.taskLifetimes).taskLifetimes.find(l=>l.taskId===out.tasks[k].taskId);assert(l);assert.equal(l.executions.length,1);assert.equal(l.executions[0].root.rootSubjectKind,kind);assert.equal(l.executions[0].root.rootRunId,out.rootId);assert.equal(l.executions[0].dispatch,'delivered');out.lifetimes[k]=l;}
 assert(out.lifetimes.A.executions[0].execution.agentRunId);assert(out.lifetimes.B.executions[0].execution.teamRunId);assert.notEqual(out.lifetimes.B.executions[0].execution.teamRunId,out.lifetimes.B.executions[0].ingressAgentRunId);
 out.openInspection=await inspection();assert(!JSON.stringify(out.openInspection).includes('taskLifetime'));await save();
 const all=agents(out.openInspection);out.childIds=all.filter(a=>JSON.stringify(a).includes('/api005_packet_team/')).map(agentId);assert.equal(new Set(out.childIds).size,2);out.childIds=[...new Set(out.childIds)];
 // Explicit business instruction; time passing is not completion proof.
 send(out.managerRunId,`I explicitly instruct you to mark saved Task ${out.tasks.B.taskId} in Project ${out.project.projectId} DONE now with create_or_update_task, then list Project Tasks and report recorded statuses. Do not change description/context or Task A; no new delegation, no root/Manager Stop, no deletion. Return API005_${kind}_B_DONE_RECORDED.`);
 await wait(async()=>{out.closedState=await state();const b=out.closedState.find(p=>p.taskLifetimes).taskLifetimes.find(l=>l.lifetimeId===out.lifetimes.B.lifetimeId);return b.completedAt&&b.executions.every(x=>x.cleanup==='released');},'same lifetime closed/released diagnostic',120000);
 await wait(()=>out.childIds.every(id=>out.frames.some(f=>((kind==='agent_team'&&f.type==='AGENT_STATUS')||(kind==='agent_org'&&f.type==='ROOT_EXECUTION_EVENT'))&&JSON.stringify(f).includes(id)&&JSON.stringify(f.payload).includes('offline'))),'every exact member genuine terminal event',30000);
 const a=out.closedState.find(p=>p.taskLifetimes).taskLifetimes.find(l=>l.lifetimeId===out.lifetimes.A.lifetimeId);assert.equal(a.completedAt,null);assert.equal(a.executions[0].cleanup,'not_requested');
 for(const k of ['A','B']){const t=out.closedState.find(p=>p.projectId===out.project.projectId).tasks.find(t=>t.taskId===out.tasks[k].taskId);assert.equal(t.description,out.tasks[k].description);assert.deepEqual(t.contextFiles.map(f=>f.storedFilename),out.tasks[k].contextFiles.map(f=>f.storedFilename));for(const f of t.contextFiles)assert.equal(await fs.readFile(path.join(i.dataRoot,'server-data/projects/task_context_files',out.project.projectId,t.taskId,f.storedFilename),'utf8'),out.tasks[k].marker+'\n');}
 out.finalInspection=await inspection();assert(kind==='agent_team'?out.finalInspection.isActive:out.finalInspection.root_org.is_active);assert(!out.frames.some(f=>f.type==='ERROR'&&JSON.stringify(f).includes('PROJECTION_FAILED')));assert.equal(await fs.readFile(path.join(out.workspace,'protected-sentinel.txt'),'utf8'),'API005_PROTECT_'+kind+'\n');
 out.result='Scoped Pass: actual concrete '+kind+' configured shipped Manager/CodexMCP→saved-ID fresh Agent+Team→explicitDONEB exact genuine member terminal stream; siblingA/root/history/data protected. No native/renderer/physical/fullrecursive acceptance inferred.';console.log(out.result);
}catch(error){out.error=String(error);console.error(out.error);process.exitCode=1;}
finally{await save();ws?.close();}
