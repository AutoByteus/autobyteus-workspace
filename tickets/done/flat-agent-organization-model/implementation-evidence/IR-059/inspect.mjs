import {createRequire} from 'node:module';import fs from 'node:fs/promises';import assert from 'node:assert/strict';import {randomUUID} from 'node:crypto';
const require=createRequire('/home/autobyteus/workspace/.codex/worktrees/flat-agent-organization-model/autobyteus-web/package.json');const {chromium}=require('playwright-core');
const out='/tmp/aorg-ir059/render';await fs.mkdir(out,{recursive:true});
const result={scope:'Implementation-only browser: actual installed Apollo client/controlled Link, real history/navigation/contexts/staging/activity/typed Stop and selected workspace. New synthetic root per cycle, no backend/provider/native/live-root claim.',observations:[],errors:[]};
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
try{
for(const [width,height] of [[1502,900],[390,844]])for(const address of ['/director','/team/lead'])for(const oldFirst of [true,false]){
 const context=await browser.newContext({viewport:{width,height}});const id='ir059-'+randomUUID();
 await context.route('**/*',r=>{const u=new URL(r.request().url());if(u.hostname==='127.0.0.1'&&u.port==='43159'&&!u.pathname.startsWith('/graphql')&&!u.pathname.startsWith('/rest'))return r.continue();return r.fulfill({status:200,contentType:'application/json',body:'{"data":{}}'})});
 const page=await context.newPage();page.on('pageerror',e=>result.errors.push(String(e)));
 const read=()=>page.evaluate(()=>window.__ir059.state());
 const count=async(name,n)=>page.waitForFunction(({name,n})=>window.__ir059?.state().requests.filter(r=>r.name===name).length===n,{name,n});
 const save=async(stage)=>{await page.waitForTimeout(350);const state=await read();const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);assert.equal(overflow,false);const name=`${width}-${address==='/director'?'direct':'mounted'}-${oldFirst?'old-first':'new-first'}-${stage}`;await fs.writeFile(`${out}/${name}.json`,JSON.stringify(state,null,2));await page.screenshot({path:`${out}/${name}.png`,fullPage:true});result.observations.push({width,address,oldFirst,stage,id,state,overflow})};
 await page.goto(`http://127.0.0.1:43159/ir059-inspection?rootSubjectKind=agent_org&orgRunId=${id}&mode=active&memberAddress=${encodeURIComponent(address)}`,{waitUntil:'networkidle',timeout:120000});
 await count('GetAgentOrgRunInspection',1);await page.evaluate(()=>window.__ir059.begin());await count('GetAgentOrgMemberRunProjection',7);await count('ListCollaborationRootHistory',1);
 const stop=page.getByRole('button',{name:'Stop Agent Org',exact:true});assert.equal(await stop.isDisabled(),false);assert.equal(await page.locator('[aria-label="Running"]').count(),1);
 await save('initial-member-pending');await stop.focus();await stop.press('Enter');await count('TerminateAgentOrgRun',1);assert.equal(await stop.isDisabled(),true);
 await page.evaluate(()=>window.__ir059.confirm());await count('GetAgentOrgRunInspection',2);await count('ListCollaborationRootHistory',2);
 assert.equal(await stop.count(),0);assert.equal(await page.locator('[aria-label="Stopped"]').count(),1);
 await page.evaluate(()=>window.__ir059.finalRoot());await count('GetAgentOrgMemberRunProjection',14);
 const pending=await read();assert.equal(pending.rows[0].active,false);assert.equal(pending.requests.filter(r=>r.name==='GetAgentOrgMemberRunProjection'&&r.delivered).length,0);assert.ok(pending.requests.filter(r=>['GetAgentOrgRunInspection','GetAgentOrgMemberRunProjection','ListCollaborationRootHistory'].includes(r.name)).every(r=>r.independent===false));
 await save('confirmed-final-pending');
 if(oldFirst)await page.evaluate(()=>window.__ir059.members('old'));
 await page.evaluate(()=>window.__ir059.members('new'));await page.waitForFunction(()=>window.__ir059.state().phase==='historical'&&!window.__ir059.state().pending&&window.__ir059.state().mode==='history');
 if(!oldFirst)await page.evaluate(()=>window.__ir059.members('old'));
 await count('ListCollaborationRootHistory',3);await page.evaluate(()=>window.__ir059.history());await page.waitForFunction(()=>window.__ir059.state().historyError==='Follow-up history unavailable');
 await page.locator('textarea').fill('IR059 retained final draft');const before=await read();await page.evaluate(()=>window.__ir059.reopen());const s=await read();
 assert.equal(s.requests.length,before.requests.length);assert.equal(s.address,address);assert.equal(s.rootRunId,id);assert.equal(s.status,'offline');assert.equal(s.draft,'IR059 retained final draft');assert.equal(s.rows[0].active,false);assert.equal(s.socketSends,0);assert.deepEqual(s.errors,[]);assert.equal(s.messages.length,1);assert.ok(JSON.stringify(s.messages).includes(`Final retained output:${s.exactRun}`));assert.equal(s.activities.length,1);assert.equal(s.activities[0].activityId,`Final retained output:${s.exactRun}`);assert.equal(await stop.count(),0);assert.equal(await page.locator('aside button[aria-selected="true"].org-execution-row').count(),1);
 await save('final-old-released-history-rejected');await context.close();
}
assert.deepEqual(result.errors,[]);result.passed=true;
}catch(e){result.failure=String(e);throw e}finally{await fs.writeFile(out+'/evidence.json',JSON.stringify(result,null,2));await browser.close()}
console.log(JSON.stringify({passed:result.passed,observations:result.observations.length,errors:result.errors}));
