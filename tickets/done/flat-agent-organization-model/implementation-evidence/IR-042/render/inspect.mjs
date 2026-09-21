import {createRequire} from 'node:module'; import fs from 'node:fs/promises'; import assert from 'node:assert/strict';
const require=createRequire('/home/autobyteus/workspace/.codex/worktrees/flat-agent-organization-model/autobyteus-web/package.json');
const {chromium}=require('playwright-core');
const view=JSON.parse(await fs.readFile('/tmp/aorg-ir042-render/view.json','utf8'));
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox'],headless:true});
const page=await browser.newPage({viewport:{width:390,height:844},hasTouch:true});
const result={states:[],errors:[],queries:[],commands:[],assertions:[],limits:'Implementation fixture, actual strict stream/hydration/context, task UI, navigation action, history read and memory router; synthetic server responses. No drawer mounted. Not production provider/backend, full browser-history route or API/E2E signoff.'};
page.on('pageerror',e=>result.errors.push(String(e)));
await page.route('**/rest/health',r=>r.fulfill({status:200,contentType:'application/json',body:'{"status":"ok"}'}));
await page.route('**/graphql',async r=>{
 const q=r.request().postDataJSON();result.queries.push({operation:q.operationName,variables:q.variables});
 let data;
 if(q.operationName==='ListCollaborationRootHistory') data={listCollaborationRootHistory:[{__typename:'AgentOrgRootHistoryObject',root_subject_kind:'agent_org',root_run_id:'org-run',is_active:true,created_at:view.execution_tree.createdAt,archived_at:null,summary:'Mixed Org',org:view.execution_tree}]};
 else if(q.operationName==='GetAgentOrgMemberRunProjection') data={getAgentOrgMemberRunProjection:{...q.variables,conversation:[],activities:[],hasEarlierActiveTraceEvents:false}};
 else data={agentDefinitions:[],runtimeCapabilities:[],agentTeams:[]};
 await r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({data})});
});
await page.routeWebSocket('**/ws/agent-org/org-run',ws=>{
 ws.onMessage(m=>result.commands.push(String(m)));
 ws.send(JSON.stringify({type:'CONNECTED',payload:{root_subject_kind:'agent_org',root_run_id:'org-run',session_id:'render-session'}}));
 ws.send(JSON.stringify({type:'ROOT_EXECUTION_VIEW_SNAPSHOT',payload:{schema_version:1,root_subject_kind:'agent_org',root_run_id:'org-run',root_org:view}}));
});
const count=()=>result.queries.filter(q=>q.operation==='ListCollaborationRootHistory').length;
const snapshot=async name=>{await page.screenshot({path:`/tmp/aorg-ir042-render/${name}.png`,fullPage:true});const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);assert.equal(overflow,false);result.states.push({name,overflow,target:await page.locator('[data-test="target-id"]').innerText(),history:await page.locator('[data-test="history-count"]').innerText()});};
const clickExact=async()=>{
 await page.locator('[data-test="team-delegated-task-summary-row"]').nth(1).click();
 await page.locator('[data-test="task-direction-team"]').focus();await page.keyboard.press('Enter');
 const link=page.locator('[data-test="task-identity-detail"] [data-test="task-identity-agent"]').filter({hasText:'worker'});
 await link.focus();await page.keyboard.press('Enter');
 await page.waitForFunction(()=>document.querySelector('[data-test="target-id"]')?.textContent.includes('agent-task-worker / read_only'));
};
try {
 await page.goto('http://127.0.0.1:43142/ir042-cold-navigation',{waitUntil:'networkidle',timeout:120000});
 await page.locator('[data-test="team-delegated-tasks-section"]').waitFor({timeout:60000});
 assert.equal(count(),0);assert.match(await page.locator('[data-test="history-count"]').innerText(),/0/);
 await snapshot('cold-narrow-before');await clickExact();assert.equal(count(),1);await snapshot('cold-narrow-exact-read-only');
 await page.locator('[data-test="back"]').tap();await page.locator('[data-test="team-delegated-tasks-section"]').waitFor();
 await clickExact();assert.equal(count(),1);await snapshot('warm-narrow-exact-read-only');
 await page.setViewportSize({width:1440,height:900});
 await page.reload({waitUntil:'networkidle'});await page.locator('[data-test="team-delegated-tasks-section"]').waitFor();
 assert.match(await page.locator('[data-test="history-count"]').innerText(),/0/);
 await snapshot('reload-desktop-before');await clickExact();assert.equal(count(),2);await snapshot('reload-desktop-exact-read-only');
 assert.equal(result.queries.some(q=>/Restore|CreateAgentOrgRun|Terminate/.test(q.operation)),false);
 assert.deepEqual(result.commands,[]);assert.deepEqual(result.errors,[]);
 result.assertions=['Current strict snapshot hydrates before any history query','Cold participant keyboard action loads one canonical history query','Exact settled non-coordinator becomes read_only without restore/input','Warm Back/action reuses history without another query','Reload resets history and still navigates without drawer','Desktop/narrow no pageerror/overflow'];
} finally {await fs.writeFile('/tmp/aorg-ir042-render/evidence.json',JSON.stringify(result,null,2));await browser.close();}
console.log(JSON.stringify(result,null,2));
