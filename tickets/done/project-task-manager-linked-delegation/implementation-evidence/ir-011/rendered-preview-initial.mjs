// Local rendered integration self-check, not API/E2E or desktop/provider sign-off.
import fs from 'node:fs/promises';
import { createWriteStream, existsSync } from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import net from 'node:net';
import assert from 'node:assert/strict';
const W=process.cwd(), web=path.join(W,'autobyteus-web'), E=path.join(W,'tickets/in-progress/project-task-manager-linked-delegation/implementation-evidence/ir-011');
const require=createRequire(path.join(web,'package.json')), {chromium}=require('playwright-core'), ts=require('typescript');
const source=await fs.readFile(path.join(web,'services/agentCollaboration/__tests__/agentRootFixture.ts'),'utf8');
const fixture=(await import('data:text/javascript;base64,'+Buffer.from(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText).toString('base64'))).agentRootView();
fixture.is_active=false;
for(const entry of fixture.execution_tree.collaborators){if(entry.launchConfiguration)entry.launchConfiguration.workspaceRootPath=null; if(entry.defaultLaunchConfiguration)entry.defaultLaunchConfiguration.workspaceRootPath=null;}
await fs.writeFile(path.join(E,'rendered-fixture.json'),JSON.stringify(fixture,null,2)+'\n');
const installed=path.join(web,'pages/ir011-integration-preview.vue'), output=path.join(E,'rendered-preview');
await fs.mkdir(output,{recursive:true});assert(!existsSync(installed));
const port=await new Promise((resolve,reject)=>{const server=net.createServer();server.on('error',reject);server.listen(0,'127.0.0.1',()=>{const p=server.address().port;server.close(()=>resolve(p));});});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const evidence={scope:'Local current Nuxt standalone child rows + production store/stored GraphQL facade hydration and message panel over controlled public fixture. No runtime, API product validation, provider inference or desktop proof.',port,operations:[],events:[],states:{},cleanup:{}};
let child,browser,log,mode='valid';
try {
 await fs.copyFile(path.join(E,'rendered-preview.page.vue'),installed);log=createWriteStream(path.join(output,'nuxt.log'));
 child=spawn('pnpm',['exec','nuxi','dev','--host','127.0.0.1','--port',String(port)],{cwd:web,detached:true,env:{...process.env,NUXT_TELEMETRY_DISABLED:'1',BACKEND_NODE_BASE_URL:'http://127.0.0.1:65534'},stdio:['ignore','pipe','pipe']});child.stdout.pipe(log);child.stderr.pipe(log);evidence.pid=child.pid;
 const url=`http://127.0.0.1:${port}/ir011-integration-preview`;let ready=false;
 for(let i=0;i<120&&!ready;i++){if(child.exitCode!==null)throw Error('Nuxt exited');try{ready=(await fetch(url)).ok;}catch{}if(!ready)await sleep(500);}assert(ready);
 browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 const page=await browser.newPage({viewport:{width:1440,height:960}});page.setDefaultTimeout(30000);
 page.on('pageerror',err=>evidence.events.push({type:'pageerror',text:err.message}));page.on('console',msg=>{if(['error','warning'].includes(msg.type()))evidence.events.push({type:msg.type(),text:msg.text()});});
 await page.route('**/rest/health',route=>route.fulfill({status:200,contentType:'application/json',body:'{"status":"ok"}'}));
 await page.route('**/graphql',async route=>{
  const payload=route.request().postDataJSON(), name=payload.operationName; evidence.operations.push({name,mode,variables:payload.variables});let data={};
  if(name==='GetAgentRunCollaboration'){
   if(mode==='error'){await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({errors:[{message:'Controlled stored inspection failure'}]})});return;}
   data={agentRunCollaboration:mode==='empty'?null:{root_subject_kind:'agent',root_run_id:'host-run',root_agent:structuredClone(fixture)}};
  }else if(name==='GetAgentRunCollaborationMemberProjection')data={agentRunCollaborationMemberProjection:{agentRunId:payload.variables.agentRunId,memberAddress:payload.variables.memberAddress,conversation:[],activities:[],summary:'Stored child',lastActivityAt:'2026-09-30T00:00:00.000Z',hasEarlierActiveTraceEvents:true}};
  else if(name==='ListCollaborationRootHistory')data={listCollaborationRootHistory:[]};
  else if(name==='ListWorkspaceRunHistory')data={listWorkspaceRunHistory:[]};
  else if(name==='GetAllWorkspaces')data={workspaces:[]};
  else if(name==='GetAgentDefinitions')data={agentDefinitions:[]};
  else if(name==='GetServerSettings')data={serverSettings:[]};
  else if(name==='GetApplicationsCapability')data={applicationsCapability:{enabled:false,scope:'BOUND_NODE',settingKey:'ENABLE_APPLICATIONS',source:'INITIALIZED_EMPTY_CATALOG'}};
  else if(name==='GetSkillImprovementCapability')data={skillImprovementCapability:{enabled:false,settingKey:'ENABLE_SKILL_IMPROVEMENT',source:'INITIALIZED_EMPTY_CATALOG'}};
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({data})});
 });
 await page.goto(url,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.__ir011State?.().rows.length===4&&!window.__ir011State().loading);
 const state=()=>page.evaluate(()=>window.__ir011State());evidence.states.loaded=await state();
 const row=id=>page.locator(`[data-test="workspace-team-transient-execution-row"][data-agent-run-id="${id}"]`);
 await row('cua-run').focus();await page.keyboard.press('Enter');evidence.states.agent=await state();assert.deepEqual(evidence.states.agent.target,{kind:'standaloneMember',hostRunId:'host-run',memberAddress:'/computer_use_agent',agentRunId:'cua-run'});assert.deepEqual(evidence.states.agent.labels,['Research Assistant']);
 assert.equal(await row('cua-run').getAttribute('aria-selected'),'true');assert(await page.locator('[data-test="messages"]').innerText().then(t=>t.includes('Research Assistant')));
 await row('pp-run').click();evidence.states.member=await state();assert.equal(evidence.states.member.target.agentRunId,'pp-run');assert.equal(evidence.states.member.target.memberAddress,'/product_team/prototyper');
 const disclosure=page.locator('[data-test="workspace-team-transient-disclosure"]').first();await disclosure.click();assert.equal(await row('pp-run').count(),0);await disclosure.click();assert.equal(await row('pp-run').count(),1);
 await page.locator('[data-test="host"]').click();assert.equal((await state()).target,undefined);
 await page.screenshot({path:path.join(output,'desktop.png'),fullPage:true});
 await page.setViewportSize({width:390,height:844});await sleep(250);
 evidence.states.mobileGeometry=await page.locator('aside').evaluate(el=>{const b=el.getBoundingClientRect();return {width:b.width,right:b.right,viewport:innerWidth};});assert(evidence.states.mobileGeometry.right<=390);
 await row('cua-run').focus();await page.keyboard.press('Space');assert.equal((await state()).selected,'cua-run');await page.screenshot({path:path.join(output,'mobile.png'),fullPage:true});
 mode='error';await page.locator('[data-test="refresh"]').click();await page.locator('[data-test="error"]').waitFor();evidence.states.error=await state();assert.equal(evidence.states.error.rows.length,4);
 mode='empty';await page.locator('[data-test="refresh"]').click();await page.locator('[data-test="empty"]').waitFor();evidence.states.empty=await state();
 mode='valid';await page.locator('[data-test="refresh"]').click();await page.waitForFunction(()=>window.__ir011State().rows.length===4&&!window.__ir011State().error);evidence.states.recovered=await state();
 assert(!evidence.operations.some(op=>/Send|Restore|Create|Submit/.test(op.name)));assert.equal(evidence.events.filter(x=>x.type==='pageerror').length,0);
 evidence.result='Pass local rendered integration self-check';
} catch(error){evidence.result='Fail local rendered integration self-check';evidence.error=error.stack;process.exitCode=1;}
finally {
 if(browser)await browser.close();evidence.cleanup.browserClosed=true;
 if(child&&child.exitCode===null&&child.signalCode===null){try{process.kill(-child.pid,'SIGTERM');}catch(error){if(error.code!=='ESRCH')throw error;}for(let i=0;i<100&&child.exitCode===null&&child.signalCode===null;i++)await sleep(100);if(child.exitCode===null&&child.signalCode===null){try{process.kill(-child.pid,'SIGKILL');}catch(error){if(error.code!=='ESRCH')throw error;}await sleep(200);}}
 evidence.cleanup.nuxtExitCode=child?.exitCode;evidence.cleanup.nuxtSignal=child?.signalCode;log?.end();await fs.rm(installed,{force:true});evidence.cleanup.temporaryRouteRemoved=!existsSync(installed);
 await fs.writeFile(path.join(output,'evidence.json'),JSON.stringify(evidence,null,2)+'\n');console.log(JSON.stringify({result:evidence.result,error:evidence.error,states:evidence.states,events:evidence.events,cleanup:evidence.cleanup},null,2));
}
