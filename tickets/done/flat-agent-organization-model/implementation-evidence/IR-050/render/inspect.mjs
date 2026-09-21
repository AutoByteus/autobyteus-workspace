import { createRequire } from 'node:module'; import fs from 'node:fs/promises'; import assert from 'node:assert/strict';
const root='/home/autobyteus/workspace/.codex/worktrees/flat-agent-organization-model/autobyteus-web';
const require=createRequire(`${root}/package.json`); const {chromium}=require('playwright-core'); const ts=require('typescript');
const fixture=ts.transpileModule(await fs.readFile(`${root}/services/agentOrgExecution/__tests__/taskBearingOrgFixture.ts`,'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText;
const {taskBearingView}=await import(`data:text/javascript;base64,${Buffer.from(fixture).toString('base64')}`);
const original=taskBearingView(); let isActive=false, sequence=original.base_change_sequence, ws, pendingRestore;
let rejectRestore=false; let holdRestore=false, holdProjection=false, releaseProjection, projectionGate=Promise.resolve(), projectionStarted=false;
const commands=[], mutations=[], queries=[], histories=new Map(['agent-director','agent-team-worker-configured'].map(id=>[id,[{kind:'message',role:'user',content:'Earlier saved message',ts:1789000000},{kind:'message',role:'assistant',content:'Previously completed work remains available for inspection.',ts:1789000001}]]));
const view=()=>({...original,is_active:isActive,base_change_sequence:sequence,agent_statuses:isActive?original.agent_statuses:[]});
const result={states:[],pageErrors:[],commands,mutations,queries,limits:'Implementation renderer only; real shared surfaces, input, Pinia/context/submission/inspection/stream, synthetic GraphQL/provider/stream I/O; attachment requests forward unchanged to actual Fastify routes/services and disposable stored filesystem. Header selection/stop diagnostic controls; route mode behavior separately component/action tested. No native/provider/API/Delivery claim.'};
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox'],headless:true});const context=await browser.newContext({viewport:{width:1440,height:900},hasTouch:true}); const page=await context.newPage();
page.on('pageerror',e=>result.pageErrors.push(String(e)));
await context.route('**/rest/health',r=>r.fulfill({status:200,contentType:'application/json',body:'{"status":"ok"}'}));
await context.route('**/graphql',async r=>{ const q=r.request().postDataJSON(); queries.push({operation:q.operationName,variables:q.variables}); let data;
 if(q.operationName==='RestoreAgentOrgRun'){mutations.push(q.operationName);if(rejectRestore){await r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({data:{restoreAgentOrgRun:{success:false,message:'Restore was rejected'}}})});return;}if(holdRestore)await new Promise(resolve=>pendingRestore=resolve);isActive=true;data={restoreAgentOrgRun:{success:true,agentOrgRunId:'org-run'}};}
 else if(q.operationName==='TerminateAgentOrgRun'){mutations.push(q.operationName);isActive=false;data={terminateAgentOrgRun:{success:true}};}
 else if(q.operationName==='GetAgentOrgRunInspection')data={getAgentOrgRunInspection:{schema_version:1,root_subject_kind:'agent_org',root_run_id:'org-run',root_org:view()}};
 else if(q.operationName==='GetAgentOrgMemberRunProjection'){if(holdProjection){projectionStarted=true;await projectionGate;}data={getAgentOrgMemberRunProjection:{agentRunId:q.variables.agentRunId,memberAddress:q.variables.memberAddress,conversation:histories.get(q.variables.agentRunId)??[],activities:[],hasEarlierActiveTraceEvents:false}};}
 else if(q.operationName==='GetAgentOrgExecutionCheckpoint')data={getAgentOrgExecutionCheckpoint:{orgRunId:'org-run',changeSequence:sequence,hasOpenExecutionWork:false}};
 else if(q.operationName==='ListCollaborationRootHistory')data={listCollaborationRootHistory:[{root_subject_kind:'agent_org',root_run_id:'org-run',is_active:isActive,created_at:original.execution_tree.createdAt,archived_at:null,summary:'Retained mixed Org',org:original.execution_tree}]};
 else data={agentDefinitions:[],runtimeCapabilities:[],agentTeams:[],workspaces:[]};
 await r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({data})}); });
await page.routeWebSocket('**/ws/agent-org/**',socket=>{ws=socket;socket.onMessage(raw=>commands.push(JSON.parse(raw)));socket.send(JSON.stringify({type:'CONNECTED',payload:{root_subject_kind:'agent_org',root_run_id:'org-run',session_id:'render'}}));socket.send(JSON.stringify({type:'ROOT_EXECUTION_VIEW_SNAPSHOT',payload:{root_subject_kind:'agent_org',root_run_id:'org-run',schema_version:1,root_org:view()}}));});
const frame=message=>ws.send(JSON.stringify(message));
const present=(c,message)=>frame({type:'ROOT_EXECUTION_EVENT',payload:{root_subject_kind:'agent_org',root_run_id:'org-run',change_sequence:++sequence,event:{kind:'agent_presentation',agent_run_id:c.payload.target_agent_run_id,member_address:original.agent_statuses.find(a=>a.agent_run_id===c.payload.target_agent_run_id).member_address,message}}});
const finish=()=>{const c=commands.at(-1),p=c.payload; histories.set(p.target_agent_run_id,[...(histories.get(p.target_agent_run_id)??[]),{kind:'message',role:'user',content:p.content,ts:Date.now()/1000,media:{images:p.context_file_paths.filter(path=>path.endsWith('.png'))}}]);
 present(c,{type:'MEMBER_INPUT_MESSAGE',payload:{message_id:p.message_id,dedupe_key:p.dedupe_key,content:p.content,input_origin:'user_message',received_at:new Date().toISOString(),context_file_paths:p.context_file_paths.map(path=>({path,type:path.endsWith('.png')?'Image':'Text'})),sender_agent_run_id:null,parent_communication_message_id:null}});
 frame({type:'AGENT_COMMAND_ACK',payload:{root_subject_kind:'agent_org',root_run_id:'org-run',command_id:p.command_id,command_type:c.type,target_agent_run_id:p.target_agent_run_id,state:'accepted',code:null,message:null}});
 present(c,{type:'AGENT_STATUS',payload:{status:'idle',trigger:null,tool_name:null,error_message:null,error_details:null}});
};

let holdUpload=false, releaseUpload, markUploadHeld; let heldUpload;
const uploads=[],deletes=[],fileContent='IR050 exact selected Org file contents';
const cors={'access-control-allow-origin':'*','access-control-allow-methods':'POST,DELETE,GET,OPTIONS','access-control-allow-headers':'*'};
await context.route(/\/rest\/(?:context-files|(?:drafts\/)?agent-org-runs\/[^/]+\/agent-runs\/[^/]+\/context-files)\//,async r=>{
 const pathname=new URL(r.request().url()).pathname;
 if(r.request().method()==='OPTIONS')return r.fulfill({status:204,headers:cors});
 const response=await r.fetch({url:'http://127.0.0.1:43151'+pathname});
 assert.ok(response.status()<400,`${r.request().method()} ${pathname} HTTP ${response.status()}: ${await response.text()}`);
 if(r.request().method()==='DELETE')deletes.push(pathname);
 if(pathname.endsWith('/upload')) {
  const body=await new Response(r.request().postDataBuffer(),{headers:{'content-type':r.request().headers()['content-type']}}).formData();
  uploads.push({owner:JSON.parse(body.get('owner')),storedFilename:(await response.json()).storedFilename});
  if(holdUpload){holdUpload=false;await new Promise(resolve=>{releaseUpload=resolve;markUploadHeld();});}
 }
 if(pathname.endsWith('/finalize')) uploads.push({finalize:r.request().postDataJSON()});
 await r.fulfill({response,headers:{...response.headers(),...cors}});
});
const state=()=>page.evaluate(()=>window.__ir048());
const shot=async name=>{const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);assert.equal(overflow,false);await page.screenshot({path:`/tmp/aorg-ir050-render/${name}.png`,fullPage:true});result.states.push({name,overflow,access:await page.locator('[data-test=access]').textContent(),contexts:await state()});};
const choose=async()=>{const uploaded=page.waitForResponse(r=>r.url().endsWith('/context-files/upload') && r.request().method()==='POST');const chooserPromise=page.waitForEvent('filechooser');await page.getByRole('button',{name:'Upload files',exact:true}).click();const chooser=await chooserPromise;await chooser.setFiles({name:'notes.txt',mimeType:'text/plain',buffer:Buffer.from(fileContent)});assert.equal((await uploaded).status(),200);await page.getByRole('button',{name:'notes.txt',exact:true}).waitFor();};
const openText=async locator=>{const popupPromise=context.waitForEvent('page');await locator.click();const popup=await popupPromise;await popup.waitForLoadState();assert.equal(await popup.locator('body').innerText(),fileContent);result.states.push({name:'opened-exact-content',url:popup.url(),content:await popup.locator('body').innerText()});await popup.close();};
try {
 for(const [size,width,height] of [['desktop',1440,900],['narrow',390,844]]) {
  await page.setViewportSize({width,height});isActive=false;
  await page.goto('http://127.0.0.1:43150/ir050-files?rootSubjectKind=agent_org&orgRunId=org-run&mode=history',{waitUntil:'networkidle',timeout:120000});await page.locator('textarea').waitFor();
  const beforeMutations=mutations.length;
  for(const [scope,id,address] of [['direct','agent-director','/director'],['mounted','agent-team-worker-configured','/team/worker']]) {
   await page.locator(`[data-test=${scope}]`).click();await choose();
   assert.deepEqual(uploads.at(-1).owner,{kind:'org_member_draft',orgRunId:'org-run',agentRunId:id});
   assert.equal((await state())[id].attachments.length,1);assert.equal(mutations.length,beforeMutations);
   await shot(`${size}-${scope}-uploaded-inactive`);await openText(page.getByRole('button',{name:'notes.txt',exact:true}));
   await page.getByRole('button',{name:'Remove file',exact:true}).click();await page.waitForFunction(id=>window.__ir048()[id].attachments.length===0,id);
   await choose();await page.getByRole('button',{name:'Clear All',exact:true}).click();await page.waitForFunction(id=>window.__ir048()[id].attachments.length===0,id);
   assert.equal(mutations.length,beforeMutations);
  }
  await choose();await page.locator('textarea').fill(`Use ${size} attachment`);await page.locator('button[title="Send message"]').click();
  await page.waitForFunction(()=>window.__ir048()['agent-team-worker-configured'].pending);await page.waitForFunction(()=>document.querySelector('[data-test=phase]')?.textContent==='live');
  for(let i=0;i<100&&!uploads.at(-1).finalize;i++)await new Promise(r=>setTimeout(r,20));
  assert.deepEqual(uploads.at(-1).finalize.finalOwner,{kind:'org_member_final',orgRunId:'org-run',agentRunId:'agent-team-worker-configured'});
  for(let i=0;i<100&&commands.length<(size==='desktop'?1:2);i++)await new Promise(r=>setTimeout(r,20));
  assert.equal(commands.at(-1).payload.target_agent_run_id,'agent-team-worker-configured');finish();
  await page.waitForFunction(()=>!window.__ir048()['agent-team-worker-configured'].pending);
  assert.equal(await page.locator('textarea').inputValue(),'');await shot(`${size}-sent-canonical`);
  const sent=page.locator('button[title^="Open "]').filter({hasText:'notes.txt'}).last();await openText(sent);
 }

 for(const [scope,id] of [['direct','agent-director'],['mounted','agent-team-worker-configured']]) {
  await page.locator(`[data-test=${scope}]`).click();
  const chooserPromise=page.waitForEvent('filechooser');await page.getByRole('button',{name:'Upload files',exact:true}).click();
  await (await chooserPromise).setFiles({name:'retained.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX2kAAAAASUVORK5CYII=','base64')});
  await page.getByRole('button',{name:'Open image preview',exact:true}).waitFor();
  await page.locator('textarea').fill(`Keep ${scope} retained image`);const count=commands.length;await page.locator('button[title="Send message"]').click();
  for(let i=0;i<200&&commands.length===count;i++)await new Promise(r=>setTimeout(r,20));assert.equal(commands.length,count+1);finish();
  await page.waitForFunction(id=>!window.__ir048()[id].pending,id);
  await page.locator('[data-test=stop]').click();await page.waitForFunction(()=>document.querySelector('[data-test=phase]')?.textContent==='historical');
  const mutationCount=mutations.length, commandCount=commands.length;
  const popupPromise=context.waitForEvent('page');await page.locator('button[title^="Open "]').filter({has:page.locator('img')}).last().click();
  const popup=await popupPromise;await popup.waitForLoadState();await popup.waitForFunction(()=>document.images[0]?.naturalWidth===1);
  assert.ok(new URL(popup.url()).pathname.includes(`/agent-runs/${id}/context-files/`));assert.equal(mutations.length,mutationCount);assert.equal(commands.length,commandCount);
  result.states.push({name:`narrow-${scope}-retained-open`,url:popup.url(),width:await popup.evaluate(()=>document.images[0].naturalWidth),noActivation:true});await popup.close();await shot(`narrow-${scope}-retained-history`);
 }
 // A real HTTP upload completes while another exact Agent owns the visible composer.
 await page.locator('[data-test=direct]').click();
 const noWrites=mutations.length,noSends=commands.length;holdUpload=true;heldUpload=new Promise(resolve=>markUploadHeld=resolve);
 const uploadedResponse=page.waitForResponse(r=>r.url().endsWith('/context-files/upload')&&r.request().method()==='POST');
 const chooserPromise=page.waitForEvent('filechooser');await page.getByRole('button',{name:'Upload files',exact:true}).click();
 await (await chooserPromise).setFiles({name:'notes.txt',mimeType:'text/plain',buffer:Buffer.from(fileContent)});await heldUpload;
 await page.locator('[data-test=mounted]').click();await page.locator('textarea').fill('New mounted draft stays here');
 releaseUpload();assert.equal((await uploadedResponse).status(),200);
 await page.waitForFunction(()=>window.__ir048()['agent-director'].attachments.length===1);
 assert.equal((await state())['agent-team-worker-configured'].attachments.length,0);assert.equal(await page.locator('textarea').inputValue(),'New mounted draft stays here');
 await page.locator('[data-test=direct]').click();await openText(page.getByRole('button',{name:'notes.txt',exact:true}));
 assert.equal(mutations.length,noWrites);assert.equal(commands.length,noSends);await shot('narrow-delayed-upload-exact-owner');
 await page.getByRole('button',{name:'Remove file',exact:true}).click();await page.waitForFunction(()=>window.__ir048()['agent-director'].attachments.length===0);
 assert.deepEqual(result.pageErrors,[]);result.passed=true;
} catch(error){result.passed=false;result.error=String(error);throw error;}finally {result.uploads=uploads;result.deletes=deletes;await fs.writeFile('/tmp/aorg-ir050-render/evidence.json',JSON.stringify(result,null,2));await browser.close();console.log(JSON.stringify({passed:result.passed,states:result.states.length,commands:commands.length,mutations,pageErrors:result.pageErrors,error:result.error}));}
