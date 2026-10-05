import fs from 'node:fs/promises';import assert from 'node:assert/strict';import {createRequire} from 'node:module';
const e='tickets/in-progress/project-task-manager-linked-delegation/api-e2e-evidence';
const instance=JSON.parse(await fs.readFile(e+'/api-009-instance.json')).result;
// Same playwright-core/CDP transport used by repository packaged Electron/browser probes.
// Attach exclusively to own isolated-app reported endpoint. No Nuxt/mock replacement.
// TESTING's browser-automation launcher/skill was absent from observed sibling checkout.
const {chromium}=createRequire(new URL('./autobyteus-web/package.json',`file://${process.cwd()}/`))('playwright-core');
const browser=await chromium.connectOverCDP(instance.controlEndpoint);
const evidence={instanceId:instance.instanceId,backend:instance.backendUrl,control:instance.controlEndpoint,startedAt:new Date().toISOString(),noModelRequest:true};
try{
 const page=browser.contexts().flatMap(c=>c.pages()).find(p=>p.url().includes('index.html'));
 assert(page,'Own packaged renderer present');evidence.url=page.url();assert(evidence.url.includes('/project-task-manager-linked-delegation/'),'worktree packaged path');
 const request=await fetch(instance.graphqlUrl,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({query:'{agentDefinitions{id name instructions toolNames defaultLaunchConfig{runtimeKind}}}'})});
 assert.equal(request.status,200);const definitions=await request.json();assert.equal(definitions.errors,undefined);const manager=definitions.data.agentDefinitions.find(d=>d.name==='Project Task Manager');assert(manager,'built Manager catalog');
 const expected=['create_or_update_task','delegate_task','list_project_tasks','list_projects','list_available_agents','read_file','send_message_to'];assert.deepEqual([...manager.toolNames].sort(),expected.sort());assert.equal(manager.defaultLaunchConfig,null);
 evidence.manager=manager;
 await page.getByRole('button',{name:'New chat',exact:true}).click();
 const input=page.locator('textarea');await input.fill('@Project');
 const suggestion=page.getByRole('button',{name:/Project Task Manager/});await suggestion.waitFor();evidence.mentionMenu=await page.locator('body').innerText();await suggestion.click();
 await page.getByText('Chat with @Project',{exact:false}).waitFor({state:'hidden'});
 evidence.afterSelection=await page.locator('body').innerText();evidence.inputValue=await input.inputValue();assert(evidence.afterSelection.includes('Project Task Manager'),'ordinary Chat selection remains visible');assert(!evidence.afterSelection.includes('Chat with @Project'),'suggestion chosen not left open');
 evidence.engine=await browser.version();await page.screenshot({path:e+'/api-009-manager-selection.png'});
 await input.fill(''); // No send/paid call; this profile is test-owned.
 evidence.result='Pass — ordinary packaged @ discovery/selection and real catalog only';
 console.log(JSON.stringify({result:evidence.result,instanceId:evidence.instanceId,managerId:manager.id,tools:manager.toolNames,engine:evidence.engine}));
}finally{await fs.writeFile(e+'/api-009-manager-probe.json',JSON.stringify(evidence,null,2)+'\n');await browser.close();}
