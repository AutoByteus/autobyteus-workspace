// Temporary implementation preview driver, not downstream E2E sign-off.
import {createRequire} from 'node:module'; import fs from 'node:fs/promises';
const require=createRequire(process.cwd()+'/autobyteus-web/package.json'); const {chromium}=require('playwright-core');
const out=process.argv[2]; await fs.mkdir(out,{recursive:true}); const events=[],ops=[];
const browser=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium',chromiumSandbox:true});
try {
 const page=await browser.newPage({viewport:{width:1440,height:800}});
 page.on('pageerror',e=>events.push({type:'pageerror',text:e.message})); page.on('console',m=>{if(m.type()==='error')events.push({type:'console',text:m.text()})});
 await page.routeWebSocket(/\/ws\//, ws=>ws.send(JSON.stringify({type:'connected'})));
 await page.route('**/rest/health',r=>r.fulfill({json:{status:'ok'}}));
 await page.route('**/graphql',async r=>{const p=r.request().postDataJSON()??{}; ops.push(p.operationName);const q=p.query??'';let data;
 if(p.operationName==='ListWorkspaceRunHistory')data={listWorkspaceRunHistory:[]};
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
 for(const width of [1440,1280,1000])for(const name of ['teamMembers','progress']){
  await page.setViewportSize({width,height:800});await page.evaluate(()=>window.__layoutPreview.reset());await settle();
  await collapse();await tab(name);await drag(width*0.4);await snap(`${width}-${name}-intermediate-collapsed`);await open();await snap(`${width}-${name}-intermediate-open`);await hit(`${width}-${name}-intermediate-hit`);
  await collapse();await drag(0);await snap(`${width}-${name}-max-collapsed`);
  for(let cycle=0;cycle<3;cycle++){await open();await snap(`${width}-${name}-max-open-${cycle}`);await hit(`${width}-${name}-max-hit-${cycle}`);await collapse();await snap(`${width}-${name}-recovered-${cycle}`);}
  await open();await drag(width-440);await snap(`${width}-${name}-drag-while-open`);
 }
 await page.setViewportSize({width:1440,height:800});await page.evaluate(()=>window.__layoutPreview.reset());await settle();await collapse();await drag(0);
 for(const width of [931,930,929,768,767,700]){await page.setViewportSize({width,height:800});await settle();await snap(`boundary-${width}-collapsed`);await open();await snap(`boundary-${width}-open`);if(await page.locator('[data-test="app-left-drawer-backdrop"]').count()){await page.keyboard.press('Escape');await settle();records.push({label:`boundary-${width}-escape`,focus:await page.evaluate(()=>document.activeElement?.getAttribute('data-test'))});}else{await collapse();}}
 await page.setViewportSize({width:700,height:800});await settle();await open();await page.keyboard.press('Tab');await snap('narrow-tab-focus');await page.setViewportSize({width:1440,height:800});await settle();await snap('wide-recovery-drawer-was-open');await open();await hit('wide-recovery-hit');
 await page.setViewportSize({width:1440,height:480});await settle();await collapse();await open();await snap('short-height-drawer');await page.locator('[data-test="app-left-drawer-backdrop"]').click({position:{x:1000,y:200}});await settle();await snap('short-height-dismissed');
 for(const width of [1209,1210,1211,1259,1260]){await page.setViewportSize({width,height:800});await page.evaluate(()=>window.__layoutPreview.reset());await settle();await snap(`automatic-${width}`);}
 await fs.writeFile(`${out}/interactions.json`,JSON.stringify(records,null,2));
 console.log(JSON.stringify({browser:browser.version(),warmupEvents,events,ops}));
 await fs.writeFile(`${out}/browser.json`,JSON.stringify({browser:browser.version(),warmupEvents,events,ops},null,2));
} finally {await browser.close();}
