/** Implementation-only rendered state inspection on an isolated current worktree app.
 * Queries for fixture contexts are intercepted at the read-only view boundary; no model or shell work.
 * This is NOT actual-provider/API/E2E acceptance. The independent engineer owns that journey.
 */
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
const root=process.cwd(), dir=resolve('tickets/in-progress/backend-port-conflict-20261024/evidence');
const require=createRequire(resolve('autobyteus-web/package.json'));
const {chromium}=require('playwright-core');
const receipt=JSON.parse(await fs.readFile(resolve(dir,'IMP-73-start.json'),'utf8')).result;
const browser=await chromium.connectOverCDP(`http://127.0.0.1:${receipt.controlPort}`);
const page=browser.contexts()[0].pages().find(p=>!p.url().startsWith('devtools:'));
try {
 if(process.argv[2]==='inspect') {
  console.log(JSON.stringify({url:page.url(),text:await page.locator('body').innerText(),buttons:await page.locator('button').evaluateAll(xs=>xs.map(x=>({text:x.textContent,title:x.title,aria:x.getAttribute('aria-label'),test:x.getAttribute('data-test')}))),stores:await page.evaluate(()=>[...document.querySelector('#__nuxt').__vue_app__.config.globalProperties.$pinia._s.keys()])},null,2));
 } else if(process.argv[2]==='seed') {
  await page.evaluate(async()=>{
   const app=document.querySelector('#__nuxt').__vue_app__, stores=app.config.globalProperties.$pinia._s;
   const original=stores.get('chatDraft').draft.context;
   for(const [id,name] of [['imp73-view-a','Read-only view fixture A'],['imp73-view-b','Read-only view fixture B']]) {
    const conversation={id,messages:[],createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),agentDefinitionId:original.config.agentDefinitionId};
    const context=new original.constructor({...original.config,agentDefinitionName:name,runtimeKind:'codex_app_server',isLocked:true},new original.state.constructor(id,conversation));
    context.state.currentStatus='idle'; stores.get('agentContexts').runs.set(id,context);
   }
   stores.get('agentSelection').selectRunWithoutShellNavigation('imp73-view-a','agent');
   await app.config.globalProperties.$router.push({path:'/chat',query:{id:'imp73-view-a'}});
  });
  await page.waitForTimeout(1000);
  console.log(await page.locator('body').innerText());
  await page.screenshot({path:resolve(dir,'IMP-73-seeded.png')});
 } else if(process.argv[2]==='settled') {
  await page.setViewportSize({width:1280,height:800});
  if(!page.url().includes('#/settings')) await page.getByRole('button',{name:'设置',exact:true}).click();
  await page.getByRole('button',{name:'语言',exact:true}).click();
  await page.getByTestId('settings-language-select').selectOption('en');
  await page.route(receipt.graphqlUrl,async route=>{
   const body=route.request().postDataJSON();
   if(body?.operationName!=='AgentBackgroundTaskView')return route.continue();
   return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({data:{agentBackgroundTaskView:{__typename:'AgentBackgroundTaskSnapshot',agentRunId:body.variables.agentRunId,runInstanceId:'fixture-instance',observedAt:new Date().toISOString(),tasks:['running','failed','unknown','completed'].map((status,i)=>({taskId:'local-'+status,kind:'shell',description:['bash','node','','python'][i],command:null,status,exitCode:i===1?-1:i===3?0:null,startedAt:new Date().toISOString()}))}}})});
  });
  await page.evaluate(async()=>{const app=document.querySelector('#__nuxt').__vue_app__;await app.config.globalProperties.$router.push({path:'/chat',query:{id:'imp73-view-a'}});});
  if(!await page.locator('[data-test="background-tasks-header"]').isVisible())await page.getByRole('button',{name:'Activity',exact:true}).click();
  if(!await page.locator('[data-test="background-tasks-list"]').isVisible())await page.locator('[data-test="background-tasks-header"]').click();
  await page.locator('[data-test="background-task-row"]').first().waitFor({state:'visible'});
  await page.waitForTimeout(500);
  assert.equal(await page.locator('[data-test="background-tasks-counts"]').innerText(),'1 running · 4 total');
  await page.screenshot({path:resolve(dir,'IMP-73-snapshot-en-settled.png')});
  console.log(JSON.stringify({source:'9b10fcd4d3eee578b9d1d23e1d6ab47f9b950c5c',result:'passed',scope:'rendered fixture only',reason:'Capture settled English layout; earlier snapshot-en caught expand animation',text:await page.locator('body').innerText()},null,2));
  await page.unroute(receipt.graphqlUrl);
 } else if(process.argv[2]==='states') {
  const record={scope:'implementation-only rendered state fixtures; not real Codex/API acceptance',source:'9b10fcd4d3eee578b9d1d23e1d6ab47f9b950c5c',requests:[],steps:[],pageErrors:[]};
  page.on('pageerror',error=>record.pageErrors.push(String(error)));
  let mode='snapshot';
  const rows=[
   {taskId:'local-running-1',kind:'shell',description:'bash',command:null,status:'running',exitCode:null,startedAt:new Date().toISOString()},
   {taskId:'local-failed-2',kind:'shell',description:'node',command:null,status:'failed',exitCode:-1,startedAt:new Date().toISOString()},
   {taskId:'local-unknown-3',kind:'shell',description:'',command:null,status:'unknown',exitCode:null,startedAt:new Date().toISOString()},
   {taskId:'local-completed-4',kind:'shell',description:'python',command:null,status:'completed',exitCode:0,startedAt:new Date().toISOString()},
  ];
  const selector='[data-test="background-tasks-list"]';
  const shot=async(name)=>{await page.waitForTimeout(500);await page.screenshot({path:resolve(dir,`IMP-73-${name}.png`)});record.steps.push({name,text:await page.locator('body').innerText()});};
  await page.route(receipt.graphqlUrl,async route=>{
   const body=route.request().postDataJSON();
   if(body?.operationName!=='AgentBackgroundTaskView')return route.continue();
   const id=body.variables.agentRunId;record.requests.push({id,mode});
   const view=mode==='unavailable'?{__typename:'AgentBackgroundTaskUnavailable',agentRunId:id,reason:'inspection_failed'}:
    {__typename:'AgentBackgroundTaskSnapshot',agentRunId:id,runInstanceId:'fixture-instance',observedAt:new Date().toISOString(),tasks:id==='imp73-view-b'||mode==='empty'?[]:rows};
   return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({data:{agentBackgroundTaskView:view}})});
  });
  try {
   await page.getByRole('button',{name:'Activity',exact:true}).click();
   await page.locator('[data-test="background-tasks-header"]').click();
   await page.waitForFunction(()=>document.querySelectorAll('[data-test="background-task-row"]').length===4);
   assert.equal(await page.locator('[data-test="background-task-command"]').count(),0);
   assert.equal(await page.locator('[data-test="background-tasks-counts"]').innerText(),'1 running · 4 total');
   await shot('snapshot-en');
   mode='unavailable';await page.waitForFunction(()=>document.querySelector('[data-test="background-tasks-availability"]')?.textContent.includes('unavailable'));
   assert.equal(await page.locator('[data-test="background-task-row"]').count(),4);assert.match(await page.locator('[data-test="background-tasks-counts"]').innerText(),/last-known/);
   await shot('unavailable-en');
   mode='empty';await page.waitForFunction(()=>document.querySelector('[data-test="background-tasks-empty"]')?.textContent.includes('No tracked'));
   await shot('empty-en');
   mode='snapshot';await page.waitForFunction(()=>document.querySelectorAll('[data-test="background-task-row"]').length===4);
   await page.locator('[data-test="background-tasks-header"]').click();const before=record.requests.length;
   await page.waitForTimeout(2300);assert.equal(record.requests.length,before);await page.locator('[data-test="background-tasks-header"]').click();
   await page.waitForFunction(()=>document.querySelectorAll('[data-test="background-task-row"]').length===4);
   await page.evaluate(async()=>{const app=document.querySelector('#__nuxt').__vue_app__;app.config.globalProperties.$pinia._s.get('agentSelection').selectRunWithoutShellNavigation('imp73-view-b','agent');await app.config.globalProperties.$router.push({path:'/chat',query:{id:'imp73-view-b'}});});
   await page.waitForFunction(()=>document.querySelector('[data-test="background-tasks-empty"]')?.textContent.includes('No tracked'));
   await shot('selection-b');
   // Real settings interaction changes the isolated app's locale, not a hardcoded translator.
   await page.getByRole('button',{name:'Settings',exact:true}).click();
   await page.getByText('Language',{exact:true}).click();
   await page.getByTestId('settings-language-select').selectOption('zh-CN');
   await page.evaluate(async()=>{const app=document.querySelector('#__nuxt').__vue_app__;app.config.globalProperties.$pinia._s.get('agentSelection').selectRunWithoutShellNavigation('imp73-view-a','agent');await app.config.globalProperties.$router.push({path:'/chat',query:{id:'imp73-view-a'}});});
   if(!await page.locator('[data-test="background-tasks-header"]').isVisible())await page.getByRole('button',{name:'活动',exact:true}).click();
   if(!await page.locator(selector).isVisible())await page.locator('[data-test="background-tasks-header"]').click();
   await page.waitForFunction(()=>document.querySelectorAll('[data-test="background-task-row"]').length===4);
   await shot('snapshot-zh');
   await page.setViewportSize({width:390,height:700});
   await page.waitForTimeout(500);
   if(!await page.locator('[data-test="background-tasks-header"]').isVisible())await page.getByRole('button',{name:'活动',exact:true}).click();
   await shot('narrow-zh');
   record.narrow=await page.locator('[data-test="background-tasks-list"]').evaluate(el=>({client:el.clientWidth,scroll:el.scrollWidth,bodyClient:document.body.clientWidth,bodyScroll:document.body.scrollWidth}));
   assert(record.narrow.scroll<=record.narrow.client+1);assert(record.narrow.bodyScroll<=record.narrow.bodyClient+1);
   record.result='passed';
  } catch(error) {record.result='failed';record.failure=String(error);await shot('failure');throw error;}
  finally {await fs.writeFile(resolve(dir,'IMP-73-states.json'),JSON.stringify(record,null,2));await page.unroute(receipt.graphqlUrl);}
 } else {
  throw Error('No scenario selected');
 }
} finally {await browser.close();}
