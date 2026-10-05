// Local rendered self-check using repository dev-preview surface; NOT API/E2E sign-off.
import fs from 'node:fs/promises';
import { createWriteStream, existsSync } from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import net from 'node:net';
import assert from 'node:assert/strict';
const W=process.cwd(), web=path.join(W,'autobyteus-web'), E=path.join(W,'tickets/in-progress/project-task-manager-linked-delegation/implementation-evidence');
const { chromium }=createRequire(path.join(web,'package.json'))('playwright-core');
const fixture=JSON.parse(await fs.readFile(path.join(web,'test-support/fixtures/linked-org-history-public.json'),'utf8'));
const installed=path.join(web,'pages/ir008-org-history-preview.vue'), output=path.join(E,'ir-008-rendered-preview');
await fs.mkdir(output,{recursive:true});
assert(!existsSync(installed),'Refuse to overwrite route');
const executablePath='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';assert(existsSync(executablePath));
const port=await new Promise((resolve,reject)=>{const server=net.createServer();server.on('error',reject);server.listen(0,'127.0.0.1',()=>{const p=server.address().port;server.close(()=>resolve(p));});});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const evidence={scope:'Local Nuxt production Org history loading/store/collection/tree-state over real public facade fixture. Open/inspect are recorded callbacks, no runtime activation. No independent GraphQL/backend/desktop/restart acceptance.',port,operations:[],events:[],states:{},cleanup:{}};
let child,browser,log,mode='valid';
try{
 await fs.copyFile(path.join(E,'ir-008-org-history-preview.page.vue'),installed);
 log=createWriteStream(path.join(output,'nuxt.log'));
 child=spawn('pnpm',['exec','nuxi','dev','--host','127.0.0.1','--port',String(port)],{cwd:web,detached:true,env:{...process.env,NUXT_TELEMETRY_DISABLED:'1',BACKEND_NODE_BASE_URL:'http://127.0.0.1:65534'},stdio:['ignore','pipe','pipe']});
 child.stdout.pipe(log);child.stderr.pipe(log);evidence.pid=child.pid;
 const url=`http://127.0.0.1:${port}/ir008-org-history-preview`;
 let ready=false;for(let i=0;i<120&&!ready;i++){if(child.exitCode!==null)throw Error('Nuxt exited');try{ready=(await fetch(url)).ok;}catch{}if(!ready)await sleep(500);}assert(ready,'Nuxt not ready');
 browser=await chromium.launch({headless:true,executablePath});const page=await browser.newPage({viewport:{width:1440,height:960}});page.setDefaultTimeout(30000);
 page.on('pageerror',err=>evidence.events.push({type:'pageerror',text:err.message}));
 page.on('console',msg=>{if(msg.type()==='error'||msg.type()==='warning')evidence.events.push({type:msg.type(),text:msg.text()});});
 await page.route('**/rest/health',route=>route.fulfill({status:200,contentType:'application/json',body:'{"status":"ok"}'}));
 await page.route('**/graphql',async route=>{
  const payload=route.request().postDataJSON(), name=payload.operationName;
  evidence.operations.push({name,mode});let data={};
  if(name==='ListCollaborationRootHistory'){
   // GraphQL supplies union metadata outside the JSON org scalar.
   const rows=structuredClone(fixture).map(row=>({__typename:'AgentOrgRootHistoryObject',...row}));if(mode==='private-negative')rows[0].org.rootOrg.taskExecutions[0].taskLifetime={lifetimeId:'preview-private-negative',purpose:'assignment'};
   data={listCollaborationRootHistory:mode==='empty'?[]:rows};
  }else if(name==='ListWorkspaceRunHistory')data={listWorkspaceRunHistory:[]};
  else if(name==='GetAgentDefinitions')data={agentDefinitions:[]};
  else if(name==='GetAgentTeamDefinitions')data={agentTeamDefinitions:[]};
  else if(name==='GetAgentOrgDefinitions')data={agentOrgDefinitions:[]};
  else if(name==='GetAllWorkspaces')data={workspaces:[]};
  else if(name==='GetServerSettings')data={serverSettings:[]};
  else if(name==='GetApplicationsCapability')data={applicationsCapability:{enabled:false,scope:'BOUND_NODE',settingKey:'ENABLE_APPLICATIONS',source:'INITIALIZED_EMPTY_CATALOG'}};
  else if(name==='GetSkillImprovementCapability')data={skillImprovementCapability:{enabled:false,settingKey:'ENABLE_SKILL_IMPROVEMENT',source:'INITIALIZED_EMPTY_CATALOG'}};
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({data})});
 });
 await page.goto(url,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.__ir008HistoryState?.().rows.length===3&&!window.__ir008HistoryState().loading);
 const state=()=>page.evaluate(()=>window.__ir008HistoryState());
 evidence.states.loaded=await state();assert.equal(evidence.states.loaded.errors.agentOrg,null);
 for(const row of fixture){
  const definition=page.locator(`[data-test="agent-org-definition-${row.org.rootOrg.orgDefinitionId}"]`);
  await definition.focus();await page.keyboard.press('Enter');assert.equal(await definition.getAttribute('aria-expanded'),'true');
  const open=page.locator(`[data-test="agent-org-run-open-${row.root_run_id}"]`);await open.click();assert.equal(await open.getAttribute('aria-expanded'),'true');
  assert(await page.locator(`[data-test="agent-org-run-children-${row.root_run_id}"]`).isVisible());
 }
 assert.equal(await page.locator('[data-test^="agent-org-run-open-"]').count(),3);
 const team=fixture.flatMap(row=>row.org.rootOrg.taskExecutions).find(item=>item.teamRunId);
 const disclosure=page.locator(`[data-test="agent-org-task-team-disclosure-${team.teamRunId}"]`);assert(await disclosure.isVisible());
 await disclosure.click();assert.equal(await page.locator(`[data-test="agent-org-task-team-row-${team.teamRunId}"]`).getAttribute('aria-expanded'),'false');
 await disclosure.click();assert.equal(await page.locator(`[data-test="agent-org-task-team-row-${team.teamRunId}"]`).getAttribute('aria-expanded'),'true');
 evidence.states.expanded=await state();await page.screenshot({path:path.join(output,'desktop-expanded.png'),fullPage:true});
 await page.setViewportSize({width:390,height:844});
 evidence.states.mobileGeometry=await page.locator('aside').evaluate(el=>{const box=el.getBoundingClientRect();return {width:box.width,right:box.right,viewport:innerWidth};});
 assert(evidence.states.mobileGeometry.right<=390);await page.screenshot({path:path.join(output,'mobile-expanded.png'),fullPage:true});
 mode='private-negative';await page.locator('[data-test="refresh"]').click();await page.locator('[data-test="org-error"]').waitFor();
 evidence.states.negative=await state();assert.equal(evidence.states.negative.rows.length,3);assert.match(evidence.states.negative.errors.agentOrg,/taskLifetime/);
 mode='valid';await page.locator('[data-test="refresh"]').click();await page.waitForFunction(()=>window.__ir008HistoryState().errors.agentOrg===null);
 evidence.states.recovered=await state();assert.equal(evidence.states.recovered.rows.length,3);
 mode='empty';await page.locator('[data-test="refresh"]').click();await page.locator('[data-test="empty"]').waitFor();evidence.states.empty=await state();
 mode='valid';await page.locator('[data-test="refresh"]').click();await page.waitForFunction(()=>window.__ir008HistoryState().rows.length===3);
 evidence.states.final=await state();assert.equal(evidence.events.filter(x=>x.type==='pageerror'||x.type==='error').length,0);
 evidence.result='Pass local rendered self-check';
}catch(error){evidence.result='Fail local rendered self-check';evidence.error=error.stack;process.exitCode=1;}
finally{
 if(browser)await browser.close();evidence.cleanup.browserClosed=true;
 if(child&&child.exitCode===null&&child.signalCode===null){
  try{process.kill(-child.pid,'SIGTERM');}catch(error){if(error.code!=='ESRCH')throw error;}
  for(let i=0;i<100&&child.exitCode===null&&child.signalCode===null;i++)await sleep(100);
  if(child.exitCode===null&&child.signalCode===null){try{process.kill(-child.pid,'SIGKILL');}catch(error){if(error.code!=='ESRCH')throw error;}await sleep(200);}
 }
 evidence.cleanup.nuxtExitCode=child?.exitCode;evidence.cleanup.nuxtSignal=child?.signalCode;log?.end();
 await fs.rm(installed,{force:true});evidence.cleanup.temporaryRouteRemoved=!existsSync(installed);
 await fs.writeFile(path.join(output,'evidence.json'),JSON.stringify(evidence,null,2)+'\n');console.log(JSON.stringify({result:evidence.result,error:evidence.error,operations:evidence.operations,events:evidence.events,cleanup:evidence.cleanup},null,2));
}
