// Temporary implementation preview driver, not downstream E2E sign-off.
import {createRequire} from 'node:module'; import fs from 'node:fs/promises';
const require=createRequire(process.cwd()+'/autobyteus-web/package.json'); const {chromium}=require('playwright-core');
const out=process.argv[2]; await fs.mkdir(out,{recursive:true}); const events=[],ops=[];
const browser=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium',chromiumSandbox:true});
let page;
try {
 page=await browser.newPage({viewport:{width:1440,height:800}});
 page.on('pageerror',e=>events.push({type:'pageerror',text:e.message})); page.on('console',m=>{if(m.type()==='error')events.push({type:'console',text:m.text()})});
 await page.routeWebSocket(/\/ws\//, ws=>ws.send(JSON.stringify({type:'connected'})));
 await page.route('**/rest/health',r=>r.fulfill({json:{status:'ok'}}));
 await page.route('**/graphql',async r=>{const p=r.request().postDataJSON()??{}; ops.push(p.operationName);const q=p.query??'';let data;
 if(p.operationName==='GetWorkspaceRunHistory')data={workspaceRunHistory:{workspaceRootPath:p.variables.workspaceId==='preview-workspace-2'?'/second-layout-preview':'/layout-preview',workspaceName:'Preview workspace',agentDefinitions:[],teamDefinitions:[]}};
 else if(p.operationName==='GetServerSettings')data={getServerSettings:[],getEffectiveStreamingContentFlushIntervalMs:100};
 else if(p.operationName==='GetTeamMemberRunProjection')data={getTeamMemberRunProjection:{agentRunId:p.variables.agentRunId,summary:'Preview selection',lastActivityAt:'2026-10-13T13:00:00Z',conversation:[{kind:'message',role:'user',content:'SELECTED_CONVERSATION_'+p.variables.agentRunId,ts:1791896400}],activities:[],hasEarlierActiveTraceEvents:false}};
 else if(p.operationName==='ListWorkspaceRunHistory')data={listWorkspaceRunHistory:[]};
 else if(p.operationName==='ListCollaborationRootHistory')data={listCollaborationRootHistory:[]};
 else if(p.operationName==='GetAgentOrgDefinitions')data={agentOrgDefinitions:[]};
 else if(q.includes('agentDefinitions'))data={agentDefinitions:[]};
 else if(q.includes('agentTeamDefinitions'))data={agentTeamDefinitions:[]};
 else if(q.includes('applicationsCapability'))data={applicationsCapability:{enabled:false,scope:'BOUND_NODE',settingKey:'ENABLE_APPLICATIONS',source:'INITIALIZED_EMPTY_CATALOG'}};
 else if(q.includes('skillImprovementCapability'))data={skillImprovementCapability:{enabled:false,settingKey:'ENABLE_SKILL_IMPROVEMENT',source:'INITIALIZED_EMPTY_CATALOG'}};
 else if(q.includes('serverSettings'))data={serverSettings:[]};
 else if(q.includes('workspaces'))data={workspaces:[]};
 else if(q.includes('getRunFileChanges'))data={getRunFileChanges:[]};
 else if(q.includes('runHistory'))data={runHistory:[]};
 else data={};
 await r.fulfill({json:{data}});
 });
 const port=(await fs.readFile('tickets/in-progress/workspaces-sidebar-dock/evidence/preview/port','utf8')).trim();
 await page.goto(`http://127.0.0.1:${port}/implementation-shell-preview`);
 await page.waitForFunction(()=>!!window.__layoutPreview); await page.waitForTimeout(10000);
 await page.reload(); await page.waitForFunction(()=>!!window.__layoutPreview); await page.waitForTimeout(1500);
 const warmupEvents=events.splice(0);
 const capture=async name=>{const s=await page.evaluate(()=>{const rect=sel=>{const el=document.querySelector(sel);if(!el)return null;const r=el.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right}};return {viewport:{width:innerWidth,height:innerHeight,dpr:devicePixelRatio},state:window.__layoutPreview.state(),left:rect('[data-test="app-left-panel-shell"]'),drawer:rect('[data-test="app-left-navigation-drawer"]'),backdrop:rect('[data-test="app-left-drawer-backdrop"]'),center:rect('[data-test="workspace-center-pane"]'),right:rect('[data-test="workspace-right-panel"]')}});await fs.writeFile(`${out}/${name}.json`,JSON.stringify(s,null,2));await page.screenshot({path:`${out}/${name}.png`});return s};
 const records=[];
 const snap=async label=>{const v=await capture(label); records.push({label,...v}); return v;};
 const settle=()=>page.waitForTimeout(250);
 const drag=async target=>{const h=await page.locator('[data-test="workspace-right-resize-handle"]').boundingBox();await page.mouse.move(h.x+2,h.y+150);await page.mouse.down();await page.mouse.move(target,h.y+150,{steps:15});await page.mouse.up();await settle();};
 const tab=async name=>{await page.locator(`[role="tab"][data-tab-name="${name}"]`).click();await settle();};
 const collapse=async()=>{await page.locator('[data-test="app-left-panel-collapse"]').click();await settle();};
 const open=async()=>{await page.locator('[data-test="workspace-left-strip-workspaces"]').click();await settle();};
 const hit=async label=>{const info=await page.evaluate(()=>{const selectors=['[data-test="workspace-center-pane"] [contenteditable="true"]','[data-test="workspace-right-panel"] [role="tab"][aria-selected="true"]'];return selectors.map(selector=>{const e=document.querySelector(selector);if(!e)return{selector,missing:true};const r=e.getBoundingClientRect(),x=(r.left+r.right)/2,y=(r.top+r.bottom)/2;return{selector,rect:{x:r.x,y:r.y,width:r.width,height:r.height},hit:e.contains(document.elementFromPoint(x,y))}});});records.push({label,hitTests:info});
 const composer=page.locator('[data-test="workspace-center-pane"] [contenteditable="true"]');if(await composer.count()){await composer.click();records.push({label:label+'-composer-focus',focused:await composer.evaluate(e=>e===document.activeElement)});}
 const active=page.locator('[data-test="workspace-right-panel"] [role="tab"][aria-selected="true"]');await active.click();records.push({label:label+'-tab-click',state:await page.evaluate(()=>window.__layoutPreview.state())});};
 await snap('before-selection');await collapse();await drag(0);await open();await snap('after-layout-before-selection');
 await page.evaluate(()=>{window.__selectionPreview=window.__layoutPreview});
 for(const id of ['layout-preview-agent-2','layout-preview-agent']){
  if(id==='layout-preview-agent-2'){
   await page.locator('[data-test="workspace-row"][data-workspace-root="/second-layout-preview"] button').first().click();await settle();
   await page.locator('[data-test^="workspace-team-definition-row-"]').filter({hasText:'Second Preview Team'}).click();await settle();
   await page.locator('[data-test="workspace-team-row-layout-preview-team-2"]').click();await page.waitForTimeout(1000);await page.evaluate(()=>{window.__layoutPreview=window.__selectionPreview});
  }else{
   const workspace=page.locator('[data-test="workspace-row"][data-workspace-root="/layout-preview"]');const button=workspace.locator('button').first();if(await button.getAttribute('aria-expanded')==='false'){await button.click();await settle();}
   const group=workspace.locator('..').locator('[data-test^="workspace-team-definition-row-"]').first();if(await group.getAttribute('aria-expanded')==='false'){await group.click();await settle();}
   const team=page.locator('[data-test="workspace-team-row-layout-preview-team"]');if(await team.getAttribute('aria-expanded')==='false'){await team.click();await page.waitForTimeout(1000);await page.evaluate(()=>{window.__layoutPreview=window.__selectionPreview});}
  }
  const row=page.locator(`[role="treeitem"][data-team-run-id="${id.endsWith("-2")?"layout-preview-team-2":"layout-preview-team"}"][data-member-address="${id.endsWith("-2")?"/Reviewer":"/Engineer"}"]`);await row.waitFor({state:'visible'});await row.click();await page.waitForTimeout(1500);
  await page.evaluate(()=>{window.__layoutPreview=window.__selectionPreview});
  const data=await snap(`selected-${id}`);records.push({label:`selection-outcome-${id}`,url:page.url(),selectedRows:await page.locator('[role="treeitem"][aria-selected="true"]').evaluateAll(es=>es.map(e=>({text:e.textContent,team:e.getAttribute('data-team-run-id'),member:e.getAttribute('data-member-address')}))),conversationVisible:await page.getByText('SELECTED_CONVERSATION_'+id,{exact:true}).count(),state:data.state});
  // Workspaces remains a layout-only action in the actual product route.
  const before=page.url();await collapse();await open();await snap(`selection-preserved-${id}`);records.push({label:`workspaces-route-invariant-${id}`,before,after:page.url()});
 }
 await fs.writeFile(`${out}/interactions.json`,JSON.stringify(records,null,2));
 console.log(JSON.stringify({browser:browser.version(),warmupEvents,events,ops}));
 await fs.writeFile(`${out}/browser.json`,JSON.stringify({browser:browser.version(),warmupEvents,events,ops},null,2));
} finally {await fs.writeFile(`${out}/diagnostics.json`,JSON.stringify({events,ops},null,2));if(page)await page.screenshot({path:`${out}/last-state.png`});await browser.close();}
