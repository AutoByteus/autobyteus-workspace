import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {randomUUID} from 'node:crypto';
const e='tickets/in-progress/project-task-manager-linked-delegation/api-e2e-evidence';
const i=JSON.parse(await fs.readFile(e+'/api-003-instance.json')).result;
export const instance=i;
export async function gql(query,variables={}){
 const r=await fetch(i.graphqlUrl,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({query,variables}),signal:AbortSignal.timeout(45000)});assert.equal(r.status,200);const j=await r.json();assert(!j.errors,JSON.stringify(j.errors));return j.data;
}
export const sleep=ms=>new Promise(r=>setTimeout(r,ms));
export const {chromium}=createRequire(new URL('./autobyteus-web/package.json',`file://${process.cwd()}/`))('playwright-core');
export async function waitFor(check,label,timeout=180000){let end=Date.now()+timeout;while(Date.now()<end){let r=await check();if(r)return r;await sleep(500);}throw Error('TIMEOUT '+label);}
const mode=process.argv[2];
if(mode==='setup'){
 const out={instanceId:i.instanceId,started:new Date().toISOString()};
 out.credentials=await gql('{providerCredentialSettings(runtimeKind:"autobyteus"){provider{id name} apiKeyConfigured}}');
 out.settings=(await gql('{getServerSettings{key value}}')).getServerSettings.filter(s=>s.key==='AUTOBYTEUS_LLM_SERVER_HOSTS');
 out.catalogs={};for(const runtimeKind of ['codex_app_server','antigravity_cli'])out.catalogs[runtimeKind]=(await gql('query($r:String){providerModelCatalogSnapshots(runtimeKind:$r){ownerProvider{id} llmModels{modelIdentifier configSchema}}}',{r:runtimeKind})).providerModelCatalogSnapshots;
 assert(out.catalogs.codex_app_server.flatMap(p=>p.llmModels).some(m=>m.modelIdentifier==='gpt-6.1-sol'));
 const workspaceRoot=path.join(i.dataRoot,'validation-workspace');await fs.mkdir(workspaceRoot,{recursive:true});await fs.writeFile(path.join(workspaceRoot,'protected-workspace-sentinel.txt'),'DO_NOT_DELETE_API003\n');out.workspaceRoot=workspaceRoot;
 out.project=(await gql('mutation($input:CreateProjectInput!){createProject(input:$input){projectId name}}',{input:{name:'API003 saved-packet validation',description:'Owned isolated live validation; not production.'}})).createProject;
 const api=i.backendUrl+'/rest';let r=await fetch(`${api}/projects/${out.project.projectId}/task-context-drafts`,{method:'POST',headers:{'content-type':'application/json'},body:'{}'});assert.equal(r.status,200);out.draft=await r.json();
 const form=new FormData();form.append('file',new Blob(['API003_ATTACHMENT_ORIGINAL_'+out.project.projectId+'\n'],{type:'text/plain'}),'saved-packet.txt');r=await fetch(`${api}/projects/${out.project.projectId}/task-context-drafts/${out.draft.draftId}/context-files`,{method:'POST',body:form});assert.equal(r.status,200);out.attachment=await r.json();
 out.task=(await gql('mutation($input:CreateProjectTaskInput!){createProjectTask(input:$input){taskId projectId description status contextFiles{storedFilename displayName locator}}}',{input:{projectId:out.project.projectId,description:'Read the saved Task attachment with read_file. Return its exact API003_ATTACHMENT_ORIGINAL marker in your final response and use send_message_to to report it to the requester. Do not modify any files or delegate additional work in this first test.',contextDraft:{draftId:out.draft.draftId,storedFilenames:[out.attachment.storedFilename]}}})).createProjectTask;
 out.worker=(await gql('mutation($input:CreateAgentDefinitionInput!){createAgentDefinition(input:$input){id name defaultLaunchConfig{runtimeKind llmModelIdentifier llmConfig}}}',{input:{name:'API003 Packet Worker',description:'Only reads provided saved Task context; isolated text/tool test.',instructions:'Complete only the delegated task. Read the attachment path supplied by the system with read_file. Report the exact marker to requester using send_message_to, then final answer. Never inspect credentials, HOME, arbitrary paths, or modify files. Do not delegate in this case.',toolNames:['read_file','send_message_to'],skillNames:[],defaultLaunchConfig:{runtimeKind:'codex_app_server',llmModelIdentifier:'gpt-6.1-sol',llmConfig:{reasoning_effort:'low'}}}})).createAgentDefinition;
 await fs.writeFile(e+'/api-003-live-setup.json',JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify(out,null,2));
}
if(mode==='manager-start'){
 const out=JSON.parse(await fs.readFile(e+'/api-003-live-setup.json'));
 const browser=await chromium.connectOverCDP(i.controlEndpoint);const page=browser.contexts().flatMap(c=>c.pages()).find(p=>p.url().includes('index.html'));assert(page);
 const ev={instanceId:i.instanceId,started:new Date().toISOString(),request:null,route:null,ws:[]};
 page.on('websocket',ws=>{ws.on('framereceived',r=>{try{ev.ws.push(JSON.parse(String(r.payload)));}catch{}});});
 try{
  await page.getByRole('button',{name:'New chat',exact:true}).click();let input=page.locator('[data-test="chat-composer"] textarea');await input.fill('@Project');await page.getByRole('button',{name:/Project Task Manager/}).click();
  await page.locator('[data-test="chat-model-trigger"]').click();await page.locator('[data-test="chat-runtime-codex_app_server"]').click();await page.locator('[data-test="chat-model-option-gpt-6.1-sol"]').click();
  await page.locator('[data-test="chat-thinking-trigger"]').click();await page.locator('[data-test="chat-thinking-option-reasoning_effort-low"]').click();
  await page.locator('[data-test="chat-workspace-trigger"]').click();await page.locator('[data-test="chat-workspace-open-folder"]').click();let folder=page.locator('[data-test="chat-workspace-folder-form"] input');await folder.fill(out.workspaceRoot);await folder.press('Enter');
  const msg=`This is an explicitly authorized isolated test. Resolve Project named "${out.project.name}" through list_projects and list its saved Tasks. Reuse exact saved Task ${out.task.taskId}; do not edit its description or context. Consult list_available_agents and delegate it ONCE to API003 Packet Worker using ONLY recipient_address and task_id. Upon confirmed successful dispatch, explicitly patch this Task to IN_PROGRESS. Do NOT mark DONE yet: wait for my completion approval even if the worker finishes. Wait for the worker result then report the target AgentRun ID, saved marker and current Task status. Do not create additional Projects or Tasks, do not read credentials or other workspaces.`;
  ev.request=msg;await input.fill(msg);await page.locator('[data-test="chat-primary-action"]').click();
  await page.locator('[data-testid="agent-workspace-surface"]').waitFor({timeout:60000});ev.route=page.url();
  await fs.writeFile(e+'/api-003-manager-start-checkpoint.json',JSON.stringify(ev,null,2)+'\n');console.log('Manager launched '+ev.route);
  await waitFor(async()=>{const tasks=(await gql('query($p:String!){projectTasks(projectId:$p){taskId status description contextFiles{locator}}}',{p:out.project.projectId})).projectTasks;ev.tasks=tasks;return tasks.find(t=>t.taskId===out.task.taskId)?.status==='IN_PROGRESS';},'Manager explicit IN_PROGRESS',180000);
  await sleep(2500);ev.text=await page.locator('body').innerText();ev.status=await page.locator('[title^="Agent Status:"]').allTextContents();ev.result='Pass — actual Manager dispatch and explicit IN_PROGRESS observed; completion/lifetime assertions still pending';console.log(ev.result);await page.screenshot({path:e+'/api-003-manager-in-progress.png'});
 }catch(err){ev.error=String(err);ev.text=await page.locator('body').innerText();console.log(JSON.stringify({error:ev.error,text:ev.text.slice(-12000)}));process.exitCode=1;}
 finally{await fs.writeFile(e+'/api-003-manager-start.json',JSON.stringify(ev,null,2)+'\n');await browser.close();}
}
if(mode==='manager-complete'){
 const out=JSON.parse(await fs.readFile(e+'/api-003-live-setup.json'));const start=JSON.parse(await fs.readFile(e+'/api-003-manager-start.json'));
 const ev={instanceId:i.instanceId,started:new Date().toISOString(),ws:[],observedStates:[]};
 const statePath=path.join(i.dataRoot,'server-data/projects/projects.json');
 const before=JSON.parse(await fs.readFile(statePath,'utf8'));ev.before=before;assert(Array.isArray(before));const collection=before.find(p=>p.taskLifetimes);assert.equal(collection.taskLifetimes.length,1);const lifetime=collection.taskLifetimes[0];assert.equal(lifetime.completedAt,null);assert.equal(lifetime.executions.length,1);assert.equal(lifetime.executions[0].root.rootSubjectKind,'agent');
 const tree=JSON.parse(await fs.readFile(e+'/api-003-agent-tree-open.json'));assert.equal(tree.host.agentRunId,lifetime.executions[0].root.rootRunId);assert.equal(tree.taskExecutions[0].agentRunId,lifetime.executions[0].execution.agentRunId);assert.equal(tree.taskExecutions[0].taskLifetime.lifetimeId,lifetime.lifetimeId);assert.equal(tree.taskExecutions[0].taskLifetime.purpose,'assignment');ev.linkAndStampExact=true;
 const model=await gql('query($runId:String!){getAgentRunResumeConfig(runId:$runId){isActive metadataConfig{runtimeKind llmModelIdentifier llmConfig}}}',{runId:tree.host.agentRunId});assert.equal(model.getAgentRunResumeConfig.metadataConfig.runtimeKind,'codex_app_server');assert.equal(model.getAgentRunResumeConfig.metadataConfig.llmModelIdentifier,'gpt-6.1-sol');assert.equal(model.getAgentRunResumeConfig.metadataConfig.llmConfig.reasoning_effort,'low');ev.managerModel=model;
 const browser=await chromium.connectOverCDP(i.controlEndpoint);const page=browser.contexts().flatMap(c=>c.pages()).find(p=>p.url().includes('index.html'));assert(page);page.on('websocket',ws=>ws.on('framereceived',r=>{try{ev.ws.push(JSON.parse(String(r.payload)));}catch{}}));
 try{
  await waitFor(async()=>{ev.beforeText=await page.locator('body').innerText();return ev.beforeText.includes(`Saved marker: API003_ATTACHMENT_ORIGINAL_${out.project.projectId}`)&&ev.beforeText.includes('awaiting your completion approval');},'Worker actual result at Manager');
  const tools=start.ws.filter(v=>v.type==='TOOL_EXECUTION_SUCCEEDED').map(v=>v.payload);const del=tools.filter(v=>v.tool_name==='delegate_task');assert.equal(del.length,1);assert.deepEqual(Object.keys(del[0].arguments).sort(),['recipient_address','task_id']);assert.equal(del[0].arguments.task_id,out.task.taskId);ev.delegation=del[0];
  ev.streamErrors=start.ws.filter(v=>v.type==='ERROR');assert(ev.streamErrors.some(v=>v.payload.code==='AGENT_ROOT_STREAM_PROJECTION_FAILED'&&v.payload.message.includes('taskLifetime')));ev.priorUnexpectedStreamErrors=true;
  const msg=`I reviewed the exact saved attachment marker returned by the worker and approve completion of Task ${out.task.taskId} in Project ${out.project.projectId}. Explicitly patch DONE using create_or_update_task. Inspect/report exact cleanup outcomes truthfully. Do not stop this Manager/root, delete anything or delegate new work. After cleanup has released, repeat the same DONE patch once to exercise idempotence; then reply API003_DONE_VERIFIED with the actual cleanup result. If cleanup fails, report it rather than claim success.`;
  ev.request=msg;await page.locator('[data-testid="agent-workspace-surface"] textarea').fill(msg);await page.locator('[data-testid="agent-workspace-surface"] button[aria-label="Send message"]').click();
  await waitFor(async()=>{const state=JSON.parse(await fs.readFile(statePath,'utf8'));const task=state.find(p=>p.projectId===out.project.projectId)?.tasks.find(t=>t.taskId===out.task.taskId);const life=state.find(p=>p.taskLifetimes)?.taskLifetimes.find(l=>l.lifetimeId===lifetime.lifetimeId);ev.observedStates.push({time:new Date().toISOString(),status:task?.status,completedAt:life?.completedAt,cleanup:life?.executions.map(x=>x.cleanup)});assert(!(task?.status==='DONE'&&life?.completedAt===null),'Observed DONE without lifetime closure');ev.after=state;return task?.status==='DONE'&&life?.completedAt&&life.executions.every(x=>x.cleanup==='released');},'DONE closed and released',180000);
  await waitFor(async()=>{ev.afterText=await page.locator('body').innerText();return ev.afterText.includes('API003_DONE_VERIFIED')&&((await page.locator('[title^="Agent Status:"]').allTextContents()).some(t=>t.trim()==='Idle'));},'Actual Manager final idempotence response',180000);
  assert.equal(ev.after.find(p=>p.projectId===out.project.projectId).tasks[0].description,out.task.description);assert.equal(ev.after.find(p=>p.taskLifetimes).taskLifetimes[0].executions.length,1);ev.managerAfter=await gql('query($runId:String!){getAgentRunResumeConfig(runId:$runId){isActive}}',{runId:tree.host.agentRunId});assert.equal(ev.managerAfter.getAgentRunResumeConfig.isActive,true);assert.equal(await fs.readFile(path.join(out.workspaceRoot,'protected-workspace-sentinel.txt'),'utf8'),'DO_NOT_DELETE_API003\n');ev.managerWorkspacePreserved=true;
  await page.screenshot({path:e+'/api-003-manager-done.png'});ev.result='Pass — exact Agent root saved-ID MCP dispatch/stamp/link, actual attachment result, explicit DONE closure/released outcome/repeated DONE and Manager workspace preservation. Whole cumulative product FAIL due root collaboration stream rejection; full physical cascade/all roots not proven.';console.log(ev.result);
 }catch(error){ev.error=String(error);ev.text=await page.locator('body').innerText();console.log(JSON.stringify({error:ev.error,text:ev.text.slice(-7000)}));process.exitCode=1;}
 finally{await fs.writeFile(e+'/api-003-manager-complete.json',JSON.stringify(ev,null,2)+'\n');await browser.close();}
}
