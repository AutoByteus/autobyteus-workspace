// Temporary actual post-whole-app-restart resumption. Owned API+WS+packaged renderer only.
import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';import {randomUUID,createHash} from 'node:crypto';import {createRequire} from 'node:module';
import {RootExecutionViewDtoSchema,CollaborationStreamServerMessageSchema} from '../../../../autobyteus-collaboration-stream-contracts/dist/index.js';
const E='tickets/in-progress/project-task-manager-linked-delegation/api-e2e-evidence',mode=process.argv[2],target=process.argv[3],kind=target==='native'?'agent_org':'agent_team';
assert(['snapshot','resume'].includes(mode)&&['native','codex'].includes(target));
const load=async n=>JSON.parse(await fs.readFile(E+'/api-011r-'+n+'.json'));
const original=(await load('instance')).result,i=(await load(mode==='snapshot'?'restart':'history-restart')).result;
assert(i.ownsDataRoot&&i.instanceId===original.instanceId&&i.dataRoot===original.dataRoot);
const j=await load(target+'-concrete-'+kind),memory=path.join(i.dataRoot,'server-data/memory',kind==='agent_org'?'agent_orgs':'agent_teams',j.rootId);
assert(j.instanceId===i.instanceId&&!j.error);
const projectFile=path.join(i.dataRoot,'server-data/projects/projects.json'),treeFile=path.join(memory,kind==='agent_org'?'agent_org_run_execution_tree.json':'team_run_execution_tree.json');
const sha=b=>createHash('sha256').update(b).digest('hex'),sleep=ms=>new Promise(r=>setTimeout(r,ms));
const scan=async d=>{let rows=[];for(const f of await fs.readdir(d,{withFileTypes:true})){const p=path.join(d,f.name);if(f.isDirectory())rows.push(...await scan(p));else rows.push(p);}return rows;};
const traceFile=async id=>(await scan(memory)).find(p=>path.basename(path.dirname(p))===id&&path.basename(p)==='raw_traces_active.jsonl');
const trace=async id=>(await fs.readFile(await traceFile(id),'utf8')).split('\n').filter(Boolean).map(JSON.parse);
const state=async()=>JSON.parse(await fs.readFile(projectFile,'utf8'));
const lifetime=(a,k)=>a.flatMap(p=>p.taskLifetimes??[]).find(l=>l.taskId===j.tasks[k].taskId);
const aWorker=j.lifetimes.A.executions[0].ingressAgentRunId,bIngress=j.lifetimes.B.executions[0].ingressAgentRunId;
const observationOnly=process.argv.includes('--observations');
const out=observationOnly?{...await load(target+'-resume'),observationCorrectionAt:new Date().toISOString(),error:undefined,stack:undefined}:{at:new Date().toISOString(),mode,target,kind,instanceId:i.instanceId,rootId:j.rootId,aWorker,managerRunId:j.managerRunId,requests:[],frames:[],console:[]};
const save=()=>fs.writeFile(E+'/api-011r-'+target+'-'+mode+(observationOnly?'-current-2':'')+'.json',JSON.stringify(out,null,2)+'\n');
let ws,browser;
async function gql(query,variables={}){const r=await fetch(i.graphqlUrl,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({query,variables}),signal:AbortSignal.timeout(45000)});const b=await r.json();out.requests.push({query,variables,httpStatus:r.status,response:b});assert.equal(r.status,200);assert(!b.errors,JSON.stringify(b.errors));return b.data;}
async function wait(fn,label,ms=180000){const until=Date.now()+ms;while(Date.now()<until){if(await fn())return;await sleep(500);}throw Error('TIMEOUT '+label);}
const inspection=async()=>kind==='agent_org'?(await gql('query($id:String!){getAgentOrgRunInspection(orgRunId:$id)}',{id:j.rootId})).getAgentOrgRunInspection:(await gql('query($id:String!){getTeamRunResumeConfig(teamRunId:$id){teamRunId isActive executionTree}}',{id:j.rootId})).getTeamRunResumeConfig;
const isActive=x=>kind==='agent_org'?x.root_org.is_active:x.isActive;
try{
 if(mode==='snapshot'){
  const active=await inspection();assert(isActive(active));
  out.state=await state();out.aLifetime=lifetime(out.state,'A');out.bLifetime=lifetime(out.state,'B');
  assert.equal(out.aLifetime.completedAt,null);assert(out.aLifetime.executions.every(e=>e.cleanup==='not_requested'));
  assert(out.bLifetime.completedAt&&out.bLifetime.executions.every(e=>e.cleanup==='released'));
  out.protected=[];
  const allowed=[projectFile,treeFile,...(await scan(memory)).filter(p=>['raw_traces_active.jsonl','agent_org_communication_messages.json','team_communication_messages.json'].includes(path.basename(p))),...(await scan(path.join(i.dataRoot,'server-data/projects/task_context_files',j.project.projectId))),path.join(j.workspace,'protected-sentinel.txt')];
  for(const file of allowed){const b=await fs.readFile(file),relative=path.relative(i.dataRoot,file),archive=path.resolve(E,'api-011r-before-data',relative);await fs.mkdir(path.dirname(archive),{recursive:true});await fs.writeFile(archive,b);out.protected.push({relative,archive,sha256:sha(b),bytes:b.length,prefixOnly:path.basename(file)==='raw_traces_active.jsonl'});}
  out.result='Scoped Pass quiescent active A/open and B/closed before whole-app restart; bytes archived';
 }else{
  const before=await load(target+'-snapshot');
  if(!observationOnly){
  out.cold=await inspection();assert.equal(isActive(out.cold),false);
  if(kind==='agent_org'){RootExecutionViewDtoSchema.parse(out.cold);assert.deepEqual(out.cold.root_org.agent_statuses,[]);assert.deepEqual(out.cold.root_org.agent_input_states,[]);}
  assert.deepEqual(await state(),before.state);out.observationalCold=true;await save();
  const restore=kind==='agent_org'?'mutation($id:String!){restoreAgentOrgRun(agentOrgRunId:$id){success message agentOrgRunId}}':'mutation($id:String!){restoreAgentTeamRun(teamRunId:$id){success message teamRunId}}';
  out.restore=Object.values(await gql(restore,{id:j.rootId}))[0];assert(out.restore.success,out.restore.message);assert.equal(out.restore.agentOrgRunId??out.restore.teamRunId,j.rootId);
  out.restored=await inspection();assert(isActive(out.restored));if(kind==='agent_org')RootExecutionViewDtoSchema.parse(out.restored);
  assert.deepEqual(lifetime(await state(),'A'),before.aLifetime);assert.deepEqual(lifetime(await state(),'B'),before.bLifetime);
  ws=new WebSocket(i.backendUrl.replace('http:','ws:')+(kind==='agent_org'?'/ws/agent-org/':'/ws/agent-team/')+encodeURIComponent(j.rootId));
  ws.addEventListener('message',e=>{try{out.frames.push(JSON.parse(String(e.data)));}catch{}});
  await wait(()=>ws.readyState===1,'Resumed root public WS connected',30000);
  await wait(()=>out.frames.some(f=>f.type===(kind==='agent_org'?'ROOT_EXECUTION_VIEW_SNAPSHOT':'TEAM_EXECUTION_VIEW_SNAPSHOT')),'Resumed real root snapshot',30000);
  const send=(id,content)=>{const uid=randomUUID();out.commands??=[];out.commands.push({id,content,at:new Date().toISOString()});ws.send(JSON.stringify({type:'SEND_MESSAGE',payload:kind==='agent_team'?{agent_run_id:id,content,context_file_paths:[],image_urls:[],message_id:uid,dedupe_key:uid}:{root_subject_kind:'agent_org',root_run_id:j.rootId,target_agent_run_id:id,command_id:uid,content,context_file_paths:[],image_urls:[],message_id:uid,dedupe_key:uid}}));};
  // Completed work must not be resurrected by a software restart.
  out.closedNonce='API011R_CLOSED_AFTER_RESTART_'+randomUUID();const frameStart=out.frames.length;send(bIngress,'Resume your previous work and return '+out.closedNonce);
  await wait(()=>out.frames.slice(frameStart).some(f=>kind==='agent_org'?f.type==='AGENT_COMMAND_ACK'&&f.payload.target_agent_run_id===bIngress:f.type==='ERROR'&&JSON.stringify(f.payload).includes(bIngress)),'Closed B rejected after actual restart',30000);
  out.closedReceipt=out.frames.slice(frameStart).find(f=>kind==='agent_org'?f.type==='AGENT_COMMAND_ACK'&&f.payload.target_agent_run_id===bIngress:f.type==='ERROR'&&JSON.stringify(f.payload).includes(bIngress));
  assert(kind==='agent_team'||out.closedReceipt.payload.state!=='accepted');assert(/closed|completed|lifetime/i.test(JSON.stringify(out.closedReceipt)));
  assert(!(await trace(bIngress)).some(x=>x.content?.includes(out.closedNonce)));
  // Normal live follow-up on exactly the pre-restart open Task worker. No new path/marker supplied.
  out.resumeNonce='API011R_RESUMED_'+target.toUpperCase()+'_'+randomUUID();
  out.resumeFrameStart=out.frames.length;send(aWorker,'Continue our previous saved Task. Re-read ONLY the same saved attachment you were originally assigned using native read-only read_file or cat, and report its exact actual marker. Include '+out.resumeNonce+' in your final response. Use the existing conversation for the attachment path; do not read other paths, create copies, send other work or change Task status.');
  await wait(async()=>{
   const a=await trace(aWorker),turn=a.find(x=>x.trace_type==='user'&&x.content?.includes(out.resumeNonce))?.turn_id;
   if(!turn)return false;const rows=a.filter(x=>x.turn_id===turn);
   const result=rows.some(x=>x.trace_type==='assistant'&&x.source_event===(target==='native'?'LlmPhase':'SEGMENT_END')&&x.content?.includes(out.resumeNonce)&&x.content?.includes(j.tasks.A.marker));
   if(!result)return false;
   if(kind==='agent_org'){const p=await inspection(),s=p.root_org.agent_statuses.find(x=>x.agent_run_id===aWorker),input=p.root_org.agent_input_states.find(x=>x.agent_run_id===aWorker);return s?.status==='idle'&&input?.state.entries.length===0&&input.state.recoverableBlock===null;}
   return out.frames.slice(out.resumeFrameStart).some(f=>f.type==='AGENT_STATUS'&&f.payload.agent_run_id===aWorker&&f.payload.status==='idle');
  },'Same worker real resumed completion + actual marker',240000);
  const a=await trace(aWorker),aTurn=a.find(x=>x.trace_type==='user'&&x.content?.includes(out.resumeNonce)).turn_id;out.resumedWorkerTurn=a.filter(x=>x.turn_id===aTurn);
  assert(out.resumedWorkerTurn.some(x=>x.trace_type==='tool_result'&&['read_file','run_bash'].includes(x.tool_name)&&JSON.stringify(x.tool_result).includes(j.tasks.A.marker)));
  out.managerNonce='API011R_MANAGER_RESUMED_'+target.toUpperCase()+'_'+randomUUID();
  send(j.managerRunId,'Read Project '+j.project.projectId+' with list_project_tasks and report its existing Task A and B statuses; no mutations, delegation, new work, DONE, Stop or deletion. Return '+out.managerNonce+'.');
  await wait(async()=>{const a=await trace(j.managerRunId);return a.some(x=>x.trace_type==='assistant'&&x.source_event===(target==='native'?'LlmPhase':'SEGMENT_END')&&x.content?.includes(out.managerNonce));},'Same Manager real resumed business read',180000);
  }
  const bounded=(rows,nonce)=>{const start=rows.findIndex(x=>x.trace_type==='user'&&x.content?.includes(nonce));assert(start>=0);const next=rows.findIndex((x,n)=>n>start&&x.trace_type==='user');return rows.slice(start,next<0?undefined:next);};
  out.resumedWorkerTurn=bounded(await trace(aWorker),out.resumeNonce);
  assert(out.resumedWorkerTurn.some(x=>x.trace_type==='tool_result'&&['read_file','run_bash'].includes(x.tool_name)&&JSON.stringify(x.tool_result).includes(j.tasks.A.marker)));
  assert(out.resumedWorkerTurn.some(x=>x.trace_type==='assistant'&&x.source_event===(target==='native'?'LlmPhase':'SEGMENT_END')&&x.content?.includes(out.resumeNonce)&&x.content?.includes(j.tasks.A.marker)));
  out.resumedManagerTurn=bounded(await trace(j.managerRunId),out.managerNonce);
  assert(out.resumedManagerTurn.some(x=>x.trace_type==='tool_call'&&x.tool_name==='list_project_tasks'));assert(!out.resumedManagerTurn.some(x=>x.trace_type==='tool_call'&&['delegate_task','create_or_update_task'].includes(x.tool_name)));
  out.finalState=await state();assert.deepEqual(out.finalState,before.state);
  out.protected=[];
  for(const row of before.protected){const b=await fs.readFile(path.join(i.dataRoot,row.relative)),old=await fs.readFile(row.archive);assert.equal(sha(old),row.sha256);assert.deepEqual(row.prefixOnly?b.subarray(0,row.bytes):b,old);out.protected.push({...row,actualBytes:b.length,addedBytes:b.length-row.bytes,unchangedProtectedBytes:true});}
  const allowNew=[aWorker,j.managerRunId];for(const row of out.protected.filter(x=>x.prefixOnly)){const id=path.basename(path.dirname(row.relative));if(!allowNew.includes(id))assert.equal(row.addedBytes,0,'No borrowed/closed worker input '+id);}
  out.finalInspection=await inspection();assert(isActive(out.finalInspection));assert.deepEqual(lifetime(out.finalState,'A'),before.aLifetime);assert.deepEqual(lifetime(out.finalState,'B'),before.bLifetime);
  if(kind==='agent_org'){for(const f of out.frames)CollaborationStreamServerMessageSchema.parse(f);assert(!JSON.stringify(out.frames).includes('taskLifetime'));out.strictFrames=out.frames.length;}
  const {chromium}=createRequire(path.join(process.cwd(),'autobyteus-web/package.json'))('playwright-core');browser=await chromium.connectOverCDP(i.controlEndpoint);
  const page=browser.contexts().flatMap(c=>c.pages()).find(p=>p.url().includes('index.html'));assert(page&&page.url().includes('/project-task-manager-linked-delegation/'));
  page.on('console',m=>{if(['error','warning'].includes(m.type()))out.console.push(m.text());});
  if(kind==='agent_team'){const u=new URL(page.url());u.hash='/workspace?workspaceExecutionKind=team&workspaceExecutionRunId='+j.rootId+'&workspaceExecutionAgentRunId='+aWorker;await page.goto(u.href);await page.locator('[data-testid="team-workspace-surface"]').waitFor({timeout:60000});}
  else{
   const u=new URL(page.url());u.hash='/workspace';await page.goto(u.href);
   const workspace=page.locator('[data-test="workspace-row"][data-workspace-root="'+j.workspace+'"]');await workspace.waitFor({timeout:30000});if(await workspace.getAttribute('aria-expanded')==='false')await workspace.locator('button').first().click();
   const def=page.locator('[data-test="agent-org-definition-'+j.definition.id+'"]');await def.waitFor({timeout:30000});if(await def.getAttribute('aria-expanded')==='false')await def.click();
   const open=page.locator('[data-test="agent-org-run-open-'+j.rootId+'"]');await open.waitFor();if(await open.getAttribute('aria-expanded')!=='true')await open.click();
   const worker=page.locator('[data-test="agent-org-task-agent-row-'+aWorker+'"]');await worker.waitFor({timeout:30000});await worker.click();await wait(async()=>await worker.getAttribute('aria-selected')==='true','Normal worker selection committed',30000);out.selectedWorker=await worker.getAttribute('aria-selected');assert.equal(out.selectedWorker,'true');
  }
  await page.waitForFunction(({nonce,marker})=>[...document.querySelectorAll('[data-testid="agent-conversation-feed"] .flex.items-start')].some(e=>e.querySelector('.sr-only')?.textContent?.trim()!=='You'&&e.textContent.includes(nonce)&&e.textContent.includes(marker)),{nonce:out.resumeNonce,marker:j.tasks.A.marker},{timeout:60000});
  out.rendererAssistantReplies=await page.locator('[data-testid="agent-conversation-feed"] .flex.items-start').evaluateAll(es=>es.filter(e=>e.querySelector('.sr-only')?.textContent?.trim()!=='You').map(e=>e.textContent));
  assert(out.rendererAssistantReplies.some(s=>s.includes(out.resumeNonce)&&s.includes(j.tasks.A.marker)));
  out.body=await page.locator('body').innerText();out.route=page.url();assert(!out.body.includes('unrecognized_keys'));
  await page.screenshot({path:E+'/api-011r-'+target+'-resumed.png'});out.rendererRetainedConversationAndNewReply=true;
  out.result='Scoped Pass actual whole-app restart + explicit same-root restore + same open worker real saved-byte re-read/final reply and same Manager business read; closed B fenced; IDs/lifetimes/Project/tree/old bytes protected; actual packaged renderer reply.';
 }
 console.log(out.result);
}catch(error){out.error=String(error);out.stack=error.stack;console.error(out.error);process.exitCode=1;}
finally{await save();ws?.close();await browser?.close();}
