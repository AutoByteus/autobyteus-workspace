import { createRequire } from 'node:module'; import fs from 'node:fs/promises'; import assert from 'node:assert/strict';
const require=createRequire('/home/autobyteus/workspace/.codex/worktrees/flat-agent-organization-model/autobyteus-web/package.json');
const {chromium}=require('playwright-core');
const result={states:[],pageErrors:[],warnings:[],externalQueries:[],limits:'Implementation renderer only: actual TeamWorkspaceView/shared monitor/composer, active Pinia and strict stream/publication. Synthetic exact flat Team, injected transport and suppressed external history refresh/projection I/O. Diagnostic selection controls. Not a provider/API/native-shell or full workspace navigation result.'};
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox'],headless:true});
try {
 for(const [name,width,height] of [['desktop',1440,900],['narrow',390,844]]) {
  const page=await browser.newPage({viewport:{width,height},hasTouch:true});
  page.on('pageerror',e=>result.pageErrors.push(String(e)));
  page.on('console',m=>{if(m.type()==='warning'&&/Rejected.*Team|TEAM_EXECUTION|Unhandled/.test(m.text()))result.warnings.push(m.text());});
  await page.route('**/graphql',r=>{const q=r.request().postDataJSON();result.externalQueries.push(q.operationName);return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({data:{agentDefinitions:[]}})});});
  await page.route('**/rest/health',r=>r.fulfill({status:200,contentType:'application/json',body:'{"status":"ok"}'}));
  await page.goto('http://127.0.0.1:43147/ir047-publication',{waitUntil:'networkidle',timeout:120000});
  await page.waitForFunction(()=>window.__ir047);
  const state=()=>page.evaluate(()=>window.__ir047.state());
  const shot=async label=>{const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);assert.equal(overflow,false);await page.screenshot({path:`/tmp/aorg-ir047-render/${name}-${label}.png`,fullPage:true});result.states.push({name:`${name}-${label}`,overflow,textarea:await page.locator('textarea').inputValue(),state:await state()});};
  await page.locator('textarea').fill('My next exact-Agent draft'); await shot('before');
  await page.evaluate(()=>window.__ir047.activate());
  await page.waitForFunction(()=>window.__ir047.state().sequence===2);
  assert.equal(await page.locator('textarea').inputValue(),'My next exact-Agent draft');
  assert.equal((await state()).rows.find(r=>r.agentRunId==='fresh-verifier').currentStatus,'running');
  await shot('activated');
  await page.evaluate(()=>window.__ir047.present());
  const task=page.locator('[data-run=fresh-verifier]'); if(name==='desktop'){await task.focus();await page.keyboard.press('Enter');}else await task.tap();
  await page.waitForFunction(()=>window.__ir047.state().focused==='fresh-verifier');
  assert.match(await page.locator('[data-testid=agent-event-monitor]').textContent(),/Exact task input/);
  await shot('task-monitor');
  await page.locator('[data-run=lead]').click();
  assert.equal(await page.locator('textarea').inputValue(),'My next exact-Agent draft');
  await page.evaluate(()=>window.__ir047.snapshot());
  await page.waitForFunction(()=>window.__ir047.state().sequence===8);
  const s=await state();assert.equal(s.recovery,false);assert.equal(s.sameLead,true);assert.deepEqual(s.sent,[]);assert.equal(s.rows.find(r=>r.agentRunId==='fresh-second').currentStatus,'running');
  for(const w of s.witnesses){assert.deepEqual(w.entries,w.tree);assert.deepEqual(w.tasks,w.entries.filter(id=>id.startsWith('fresh-')));}
  assert.equal(await page.locator('textarea').inputValue(),'My next exact-Agent draft');
  await shot('snapshot');
  await page.locator('textarea').fill('');assert.equal((await state()).draft,'');assert.deepEqual((await state()).sent,[]);
  await page.close();
 }
 assert.deepEqual(result.pageErrors,[]);assert.deepEqual(result.warnings,[]);result.passed=true;
} finally {await fs.writeFile('/tmp/aorg-ir047-render/evidence.json',JSON.stringify(result,null,2));await browser.close();}
console.log(JSON.stringify({passed:result.passed,states:result.states.length,pageErrors:result.pageErrors,warnings:result.warnings}));
