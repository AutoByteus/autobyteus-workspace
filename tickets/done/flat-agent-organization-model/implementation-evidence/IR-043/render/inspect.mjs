import {createRequire} from 'node:module'; import fs from 'node:fs/promises'; import assert from 'node:assert/strict';
const require=createRequire('/home/autobyteus/workspace/.codex/worktrees/flat-agent-organization-model/autobyteus-web/package.json');
const {chromium}=require('playwright-core');
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox'],headless:true});
const page=await browser.newPage({viewport:{width:390,height:844},hasTouch:true});
const result={states:[],errors:[],queries:[],assertions:[],limits:'Isolated normal Nuxt renderer, real task component/navigation/Pinia/hydration/view/target/monitor and ActivityFeed; synthetic exact stored tree and network projections, memory router. Not production root/provider/API-E2E/native signoff.'};
page.on('pageerror',e=>result.errors.push(String(e)));
await page.route('**/rest/health',r=>r.fulfill({status:200,contentType:'application/json',body:'{"status":"ok"}'}));
await page.route('**/graphql',async r=>{
 const q=r.request().postDataJSON();result.queries.push({operation:q.operationName,variables:q.variables});
 let data;
 if(q.operationName==='GetTeamMemberRunProjection') data={getTeamMemberRunProjection:{agentRunId:q.variables.agentRunId,
 conversation:[{kind:'assistant',role:'assistant',content:`Retained verification for ${q.variables.agentRunId}. The report has been reviewed and accepted.`,ts:1788221040}],
 activities:[{kind:'system_instruction',activityId:`activity-${q.variables.agentRunId}`,content:`Exact retained activity for ${q.variables.agentRunId}`,ts:1788221040}],
 hasEarlierActiveTraceEvents:false,lastActivityAt:'2026-09-01T00:04:00.000Z'}};
 else data={agentDefinitions:[],runtimeCapabilities:[],agentTeams:[]};
 await r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({data})});
});
const snapshot=async name=>{await page.screenshot({path:`/tmp/aorg-ir043-render/${name}.png`,fullPage:true});const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);assert.equal(overflow,false); if(name.includes('read-only') || name.includes('second-same')) { const box=await page.locator('[data-testid="agent-event-monitor"]').boundingBox(); assert.ok(box && box.height>150 && box.y>=0 && box.y+box.height<=page.viewportSize().height); } result.states.push({name,overflow,target:await page.locator('[data-test="target-id"]').innerText()});};
const clickExact=async(index)=>{
 await page.locator('[data-test="team-delegated-task-summary-row"]').nth(index).click();
 await page.locator('[data-test="task-identity-toggle"]').focus();await page.keyboard.press('Enter');
 await page.locator('[data-test="task-identity-detail"] [data-test="task-identity-agent"]').nth(1).focus();await page.keyboard.press('Enter');
 const id=index===0?'task-verifier-one':'task-verifier-two';
 await page.waitForFunction(id=>document.querySelector('[data-test="target-id"]')?.textContent.includes(`${id} / read_only`),id);
 assert.match(await page.locator('[data-testid="agent-event-monitor"]').innerText(),new RegExp(`Retained verification for ${id}`));
 assert.equal(await page.locator('[data-testid="agent-event-monitor"] textarea, [data-testid="agent-event-monitor"] [contenteditable="true"]').count(),0);
 assert.match(await page.locator('[data-test="root-active"]').innerText(),/true/);
 assert.match(await page.locator('[data-test="activity-feed-scroll-container"]').innerText(),/System Instruction|Exact retained activity/i);
};
try {
 await page.goto('http://127.0.0.1:43143/ir043-retained-team',{waitUntil:'networkidle',timeout:120000});
 await page.locator('[data-test="team-delegated-tasks-section"]').waitFor({timeout:60000});
 assert.equal((await page.locator('[data-test="team-delegated-tasks-section"]').innerText()).includes('Task interrupted'),false);
 await snapshot('narrow-before');await clickExact(0);await snapshot('narrow-exact-read-only');
 await page.locator('[data-test="back"]').tap();await page.locator('[data-test="team-delegated-tasks-section"]').waitFor();
 await clickExact(1);await snapshot('narrow-second-same-address');
 await page.setViewportSize({width:1440,height:900});await page.reload({waitUntil:'networkidle'});
 await page.locator('[data-test="team-delegated-tasks-section"]').waitFor();await snapshot('desktop-before');
 await clickExact(0);await snapshot('desktop-exact-read-only');
 assert.equal(result.queries.some(q=>/Restore|Create|Terminate|Send|Interrupt|Approval/.test(q.operation)),false);
 assert.deepEqual(result.errors,[]);
 result.assertions=['Actual shared exact task button keyboard action reaches correct retained AgentRun','Same-address repeated task IDs remain distinct','Active root remains active; accepted task monitor and Activity are authoritative','Read-only hides composer, no mutation/lifecycle requests','Desktop/narrow no pageerrors or horizontal overflow'];
} finally {await fs.writeFile('/tmp/aorg-ir043-render/evidence.json',JSON.stringify(result,null,2));await browser.close();}
console.log(JSON.stringify(result,null,2));
