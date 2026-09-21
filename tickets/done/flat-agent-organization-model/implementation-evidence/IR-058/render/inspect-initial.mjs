import {createRequire} from 'node:module'; import fs from 'node:fs/promises'; import assert from 'node:assert/strict';
const require=createRequire('/home/autobyteus/workspace/.codex/worktrees/flat-agent-organization-model/autobyteus-web/package.json'); const {chromium}=require('playwright-core');
const out='/tmp/aorg-ir058/render'; await fs.mkdir(out,{recursive:true});
const result={scope:'Implementation-only real cached history projection, collection root row, typed Stop action/context/run stores and full selected workspace monitor/composer. Synthetic active view, controlled Apollo/Socket. Diagnostic layout/route, not normal Workspaces or actual server/API acceptance.',observations:[],errors:[]};
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
try {
for(const [width,height] of [[1502,900],[390,844]]) for(const address of ['/director','/team/lead']) for(const scenario of ['success','rejected']) {
  const context=await browser.newContext({viewport:{width,height}});
  await context.route('**/*',r=>{const u=new URL(r.request().url());if(u.hostname==='127.0.0.1'&&u.port==='43158'&&!u.pathname.startsWith('/graphql')&&!u.pathname.startsWith('/rest'))return r.continue();return r.fulfill({status:200,contentType:'application/json',body:'{"data":{}}'})});
  const page=await context.newPage();page.on('pageerror',e=>result.errors.push(String(e)));
  await page.goto(`http://127.0.0.1:43158/ir058-activity?rootSubjectKind=agent_org&orgRunId=org-run&mode=active&memberAddress=${encodeURIComponent(address)}&scenario=${scenario}`,{waitUntil:'networkidle',timeout:120000});
  await page.waitForFunction(a=>window.__ir058?.state().phase==='live'&&window.__ir058.state().address===a,address);
  const read=()=>page.evaluate(()=>window.__ir058.state());
  const save=async(stage,screenshot=true)=>{const state=await read();const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);assert.equal(overflow,false);const name=`${width}-${address==='/director'?'direct':'mounted'}-${scenario}-${stage}`;await fs.writeFile(`${out}/${name}.json`,JSON.stringify(state,null,2));if(screenshot)await page.screenshot({path:`${out}/${name}.png`,fullPage:true});result.observations.push({width,address,scenario,stage,state,overflow});return state};
  const stop=page.getByRole('button',{name:'Stop Agent Org',exact:true});
  await page.locator('textarea').fill('IR058 retain this draft');
  await page.evaluate(()=>window.__ir058.capture());await page.waitForFunction(()=>window.__ir058.state().refreshes===1);
  assert.equal(await page.locator('[aria-label="Running"]').count(),1);assert.equal(await stop.isDisabled(),false);await save('active');
  await stop.focus();await stop.press('Enter');await page.waitForFunction(()=>window.__ir058.state().pending);
  assert.equal(await stop.isDisabled(),true);assert.equal(await page.locator('[aria-label="Running"]').count(),1);await save('stop-pending',false);
  await page.evaluate(()=>window.__ir058.confirm());
  await page.waitForFunction(()=>!window.__ir058.state().pending);
  const retained=async()=>{const s=await read();assert.equal(s.exactContextRetained,true);assert.equal(s.conversationRetained,true);assert.equal(s.selectionRetained,true);assert.equal(s.address,address);assert.equal(s.rootRunId,'org-run');assert.equal(s.draft,'IR058 retain this draft');assert.equal(s.socketSends,0);const m=s.calls.filter(c=>c.kind==='mutation');assert.equal(m.length,1);assert.equal(m[0].name,'TerminateAgentOrgRun');assert.deepEqual(m[0].variables,{agentOrgRunId:'org-run'});assert.equal(s.rows.length,1);assert.equal(s.rows[0].summary,'Keep this exact conversation');return s};
  if(scenario==='success') {
    const stopped=async()=>{const s=await retained();assert.equal(s.phase,'historical');assert.equal(s.mode,'history');assert.equal(s.status,'offline');assert.equal(s.active,false);assert.equal(s.rows[0].active,false);assert.equal(await stop.count(),0);assert.equal(await page.locator('[aria-label="Running"]').count(),0);assert.equal(await page.locator('[aria-label="Stopped"]').count(),1)};
    await stopped();await save('history-pending');
    await page.evaluate(()=>window.__ir058.releaseOld());await page.waitForTimeout(100);await stopped();await save('old-released',false);
    await page.evaluate(()=>window.__ir058.failFresh());await page.waitForFunction(()=>window.__ir058.state().historyError==='Follow-up history unavailable');await stopped();await save('history-rejected');
  } else {
    const s=await retained();assert.equal(s.phase,'live');assert.equal(s.mode,'active');assert.equal(s.rows[0].active,true);assert.equal(await stop.isDisabled(),false);assert.equal(await page.locator('[aria-label="Running"]').count(),1);assert.equal(await page.locator('aside [role="alert"]').innerText(),'Stop rejected');await save('stop-rejected');
    await page.evaluate(()=>window.__ir058.releaseOld());
  }
  await context.close();
}
assert.deepEqual(result.errors,[]);result.passed=true;
}finally{await fs.writeFile(out+'/evidence.json',JSON.stringify(result,null,2));await browser.close()}
console.log(JSON.stringify({passed:result.passed,observations:result.observations.length,errors:result.errors}));
