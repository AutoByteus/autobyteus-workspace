import { createRequire } from 'node:module'; import fs from 'node:fs/promises'; import assert from 'node:assert/strict';
const root='/home/autobyteus/workspace/.codex/worktrees/flat-agent-organization-model/autobyteus-web';
const require=createRequire(`${root}/package.json`); const {chromium}=require('playwright-core');const ts=require('typescript');
const fixture=ts.transpileModule(await fs.readFile(`${root}/services/agentOrgExecution/__tests__/taskBearingOrgFixture.ts`,'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText;
const {taskBearingView}=await import(`data:text/javascript;base64,${Buffer.from(fixture).toString('base64')}`);
const view=taskBearingView();let sequence=view.base_change_sequence;let ws;const commands=[];
let holdRecovery=false;let projectionStarted=false;let releaseProjection;let projectionGate=Promise.resolve();
const result={states:[],pageErrors:[],queries:[],commands,limits:'Implementation-scoped isolated Nuxt renderer, actual shared surfaces/composer/store/context/service and native browser socket, synthetic strict snapshot/member projections/stream replies. No provider/server/native-package/API-E2E pass.'};
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox'],headless:true});
const page=await browser.newPage({viewport:{width:1440,height:900},hasTouch:true});
page.on('pageerror',e=>result.pageErrors.push(String(e)));
await page.route('**/rest/health',r=>r.fulfill({status:200,contentType:'application/json',body:'{"status":"ok"}'}));
await page.route('**/graphql',async r=>{
 const q=r.request().postDataJSON();result.queries.push({operation:q.operationName,variables:q.variables});
 let data;
 if(q.operationName==='GetAgentOrgMemberRunProjection' && holdRecovery){projectionStarted=true;await projectionGate;}
 if(q.operationName==='GetAgentOrgMemberRunProjection')data={getAgentOrgMemberRunProjection:{agentRunId:q.variables.agentRunId,memberAddress:q.variables.memberAddress,conversation:[],activities:[],hasEarlierActiveTraceEvents:false}};
 else if(q.operationName==='GetAgentOrgExecutionCheckpoint')data={getAgentOrgExecutionCheckpoint:{orgRunId:'org-run',changeSequence:sequence,hasOpenExecutionWork:false}};
 else if(q.operationName==='ListCollaborationRootHistory')data={listCollaborationRootHistory:[]};
 else data={agentDefinitions:[],runtimeCapabilities:[],agentTeams:[],workspaces:[]};
 await r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({data})});
});
await page.routeWebSocket('**/ws/agent-org/**',socket=>{
 ws=socket;socket.onMessage(raw=>commands.push(JSON.parse(raw)));
 socket.send(JSON.stringify({type:'CONNECTED',payload:{root_subject_kind:'agent_org',root_run_id:'org-run',session_id:'render'}}));
 socket.send(JSON.stringify({type:'ROOT_EXECUTION_VIEW_SNAPSHOT',payload:{root_subject_kind:'agent_org',root_run_id:'org-run',schema_version:1,root_org:{...view,base_change_sequence:sequence}}}));
});
const frame=message=>ws.send(JSON.stringify(message));
const present=(command,message)=>frame({type:'ROOT_EXECUTION_EVENT',payload:{root_subject_kind:'agent_org',root_run_id:'org-run',change_sequence:++sequence,event:{kind:'agent_presentation',agent_run_id:command.payload.target_agent_run_id,member_address:view.agent_statuses.find(a=>a.agent_run_id===command.payload.target_agent_run_id).member_address,message}}});
const finish=(state='accepted')=>{
 const c=commands.at(-1),p=c.payload;
 if(state==='accepted')present(c,{type:'MEMBER_INPUT_MESSAGE',payload:{message_id:p.message_id,dedupe_key:p.dedupe_key,content:p.content,input_origin:'user_message',received_at:new Date().toISOString(),context_file_paths:[],sender_agent_run_id:null,parent_communication_message_id:null}});
 frame({type:'AGENT_COMMAND_ACK',payload:{root_subject_kind:'agent_org',root_run_id:'org-run',command_id:p.command_id,command_type:c.type,target_agent_run_id:p.target_agent_run_id,state,code:state==='accepted'?null:'REJECTED',message:state==='accepted'?null:'Input was rejected'}});
 if(state==='accepted'){
 const status=value=>present(c,{type:'AGENT_STATUS',payload:{status:value,trigger:null,tool_name:null,error_message:null,error_details:null}});
 status('running');
 present(c,{type:'SEGMENT_START',payload:{segment_id:`reply-${p.message_id}`,turn_id:p.message_id,segment_type:'text',metadata:null}});
 present(c,{type:'SEGMENT_CONTENT',payload:{segment_id:`reply-${p.message_id}`,turn_id:p.message_id,segment_type:'text',delta:'Hello! I received your message.'}});
 present(c,{type:'ASSISTANT_COMPLETE',payload:{content:'Hello! I received your message.',reasoning:null,usage:null,image_urls:[],audio_urls:[],video_urls:[]}});
 status('idle');
 }
};
const state=()=>page.evaluate(()=>window.__ir045());
const snapshot=async name=>{
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);assert.equal(overflow,false);
 await page.screenshot({path:`/tmp/aorg-ir045-render/${name}.png`,fullPage:true});
 result.states.push({name,overflow,textarea:await page.locator('textarea').inputValue(),contexts:await state()});
};
const send=async text=>{const n=commands.length;await page.locator('textarea').fill(text);await page.locator('button[title="Send message"]').click();await page.waitForFunction(()=>document.querySelector('[data-test="pending"]')?.textContent.includes('true'));assert.equal(commands.length,n+1);assert.equal(await page.locator('textarea').inputValue(),'');};
try{
 await page.goto('http://127.0.0.1:43145/ir045-composer?rootSubjectKind=agent_org&orgRunId=org-run&mode=active',{waitUntil:'networkidle',timeout:120000});
 await page.locator('textarea').waitFor({timeout:60000});
 await send('hello');await snapshot('desktop-direct-pending');finish();
 await page.waitForFunction(()=>!window.__ir045()['agent-director'].pending);
 assert.equal((await state())['agent-director'].messages.filter(m=>m.type==='user').length,1);
 assert.equal(await page.locator('textarea').inputValue(),'');await snapshot('desktop-direct-reply-cleared');
 await page.setViewportSize({width:390,height:844});await page.locator('[data-test="mounted"]').tap();
 await send('mounted hello');await snapshot('narrow-mounted-pending');
 await page.locator('textarea').fill('my newer draft');await page.locator('[data-test="direct"]').tap();
 await page.locator('textarea').fill('direct newer draft');finish();
 await page.waitForFunction(()=>!window.__ir045()['agent-team-worker-configured'].pending);
 assert.equal(await page.locator('textarea').inputValue(),'direct newer draft');
 await page.locator('[data-test="mounted"]').tap();assert.equal(await page.locator('textarea').inputValue(),'my newer draft');
 await snapshot('narrow-mounted-reply-newer-draft');
 await send('rejected hello');await page.locator('textarea').fill('unsaved newer text');finish('rejected');
 await page.waitForFunction(()=>!window.__ir045()['agent-team-worker-configured'].pending);
 assert.equal(await page.locator('textarea').inputValue(),'unsaved newer text');await snapshot('narrow-rejection-newer-draft');
 await page.locator('textarea').fill('retry me');await page.locator('textarea').focus();await page.keyboard.press('Enter');
 await page.waitForFunction(()=>window.__ir045()['agent-team-worker-configured'].pending);finish('rejected');
 await page.waitForFunction(()=>!window.__ir045()['agent-team-worker-configured'].pending);
 assert.equal(await page.locator('textarea').inputValue(),'retry me');await snapshot('narrow-rejection-restored');
 await page.evaluate(()=>window.__ir045Context().contextFilePaths=[{id:'original-file',kind:'workspace_path',locator:'/workspace/proof.txt',displayName:'proof.txt',type:'Text'}]);
 await send('first message');await page.locator('textarea').fill('next draft');await page.locator('textarea').fill('');finish('rejected');
 await page.waitForFunction(()=>!window.__ir045()['agent-team-worker-configured'].pending);
 assert.equal(await page.locator('textarea').inputValue(),'');assert.deepEqual((await state())['agent-team-worker-configured'].attachments,[]);
 assert.equal(await page.locator('button[title="Send message"]').isDisabled(),true);
 await snapshot('narrow-deliberate-discard');
 const commandCount=commands.length;holdRecovery=true;projectionGate=new Promise(resolve=>{releaseProjection=resolve});
 ws.close({code:1001,reason:'Synthetic transport interruption'});
 await page.waitForFunction(()=>document.querySelector('[data-test="phase"]')?.textContent==='reopen_required');
 // Await actual projection ingress, not a timing assumption about hydration.
 for(let i=0;i<200&&!projectionStarted;i++)await new Promise(resolve=>setTimeout(resolve,25));
 assert.equal(projectionStarted,true);
 await page.locator('textarea').fill('still composing my next message');
 assert.equal((await state())['agent-team-worker-configured'].draft,'still composing my next message');
 await snapshot('narrow-replacement-held-edit');
 holdRecovery=false;releaseProjection();
 await page.waitForFunction(()=>document.querySelector('[data-test="phase"]')?.textContent==='live');
 assert.equal(await page.locator('textarea').inputValue(),'still composing my next message');
 assert.equal((await state())['agent-team-worker-configured'].draft,'still composing my next message');
 assert.deepEqual((await state())['agent-team-worker-configured'].messages,[]);
 assert.equal(commands.length,commandCount);
 await snapshot('narrow-replacement-keeps-edit');
 await page.setViewportSize({width:1440,height:900});await snapshot('desktop-replacement-keeps-edit');
 assert.deepEqual(result.pageErrors,[]);result.passed=true;
} finally {await fs.writeFile('/tmp/aorg-ir045-render/evidence.json',JSON.stringify(result,null,2));await browser.close();}
console.log(JSON.stringify({passed:result.passed,states:result.states.map(s=>s.name),queries:result.queries.length,commands:commands.length,pageErrors:result.pageErrors}));
