import {createRequire} from 'node:module'; import fs from 'node:fs/promises'; import assert from 'node:assert/strict';
const require=createRequire('/home/autobyteus/workspace/.codex/worktrees/flat-agent-organization-model/autobyteus-web/package.json'); const {chromium}=require('playwright-core');
const out='/tmp/aorg-ir057/render'; await fs.mkdir(out,{recursive:true});
const result={scope:'Implementation-only actual AgentOrgWorkspaceView/AgentWorkspaceSurface/AgentEventMonitor/composer and stores. Synthetic stopped view, controlled Apollo Restore success and unavailable WebSocket. Not real runtime or API acceptance.',observations:[],errors:[]};
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
try {
for(const [width,height] of [[1502,900],[390,844]]) for(const locale of ['en','zh-CN']) for(const scenario of ['restored','cold']) {
  const context=await browser.newContext({viewport:{width,height}});
  // No network request can reach a live backend or an external service.
  await context.route('**/*',r=>{const u=new URL(r.request().url());if(u.hostname==='127.0.0.1'&&u.port==='43157'&&!u.pathname.startsWith('/graphql')&&!u.pathname.startsWith('/rest'))return r.continue();return r.fulfill({status:200,contentType:'application/json',body:'{"data":{}}'})});
  const page=await context.newPage();page.on('pageerror',e=>result.errors.push(String(e)));
  await page.goto(`http://127.0.0.1:43157/ir057-recovery?rootSubjectKind=agent_org&orgRunId=org-run&mode=history&memberAddress=%2Fdirector&agentRunId=agent-director&locale=${locale}&scenario=${scenario}`,{waitUntil:'networkidle',timeout:120000});
  await page.waitForFunction(()=>window.__ir057);
  if(scenario==='restored') {
    await page.waitForFunction(()=>window.__ir057.state().access==='continuable');
    await page.evaluate(()=>window.__ir057.capture());
    await page.locator('textarea').fill('IR057 retained unsent draft');
    await page.locator('button[title="Send message"]').focus();
    await page.locator('button[title="Send message"]').press('Enter');
    await page.waitForFunction(()=>window.__ir057.state().pending===false&&Boolean(window.__ir057.state().error),{},{timeout:40000});
  }
  const alert=page.getByRole('alert');await alert.waitFor();const state=await page.evaluate(()=>window.__ir057.state());
  assert.equal(await alert.innerText(),scenario==='cold'?state.coldText:state.recoveryText);
  assert.equal(state.mode,'history');
  const mutations=state.calls.filter(c=>c.kind==='mutation');
  if(scenario==='restored') {
    assert.equal(mutations.length,1);assert.equal(mutations[0].name,'RestoreAgentOrgRun');assert.equal(mutations[0].variables.agentOrgRunId,'org-run');
    assert.equal(state.phase,'reopen_required');assert.equal(state.lastKnownActive,false);assert.equal(state.access,'read_only');
    assert.equal(state.address,'/director');assert.equal(state.exactContextRetained,true);assert.equal(state.snapshotUnchanged,true);assert.equal(state.draft,'IR057 retained unsent draft');
    assert.equal(await page.locator('textarea').inputValue(),state.draft);assert.equal(await page.locator('button[title="Send message"]').isDisabled(),true);
    assert.ok(state.messages.some(m=>m.segments?.some(s=>s.code==='LOCAL_SUBMISSION_ERROR')));
    assert.equal(state.calls.filter(c=>c.kind==='socket-failure').length,6);
  } else {assert.equal(mutations.length,0);assert.equal(await page.locator('textarea').count(),0)}
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);assert.equal(overflow,false);
  await page.screenshot({path:`${out}/${width}-${locale}-${scenario}.png`,fullPage:true});
  result.observations.push({width,locale,scenario,notice:await alert.innerText(),overflow,state});await context.close();
}
assert.deepEqual(result.errors,[]); result.passed=true;
}finally{await fs.writeFile(out+'/evidence.json',JSON.stringify(result,null,2));await browser.close()}
console.log(JSON.stringify({passed:result.passed,observations:result.observations.length,errors:result.errors}));
