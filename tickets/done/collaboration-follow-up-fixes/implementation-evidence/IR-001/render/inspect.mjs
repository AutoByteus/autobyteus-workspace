import { createRequire } from 'node:module';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const { chromium } = createRequire(process.cwd() + '/autobyteus-web/package.json')('playwright-core');
const out = process.cwd() + '/tickets/in-progress/collaboration-follow-up-fixes/implementation-evidence/IR-001/render';
const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', headless: true, args: ['--no-sandbox'] });
const results = [];
try {
for (const width of [1502,390]) {
 const context = await browser.newContext({viewport:{width,height:950}}), page = await context.newPage();
 const errors=[], opened=[];
 page.on('pageerror',e=>errors.push(String(e)));
 await context.route('**/rest/context-files/**',route=> { opened.push(route.request().url()); return route.fulfill({status:200,contentType:'text/plain',body:'Owned renderer fixture note: canonical final contents.'}); });
 await page.goto('http://127.0.0.1:31181/ir001-render?rootSubjectKind=agent_org&orgRunId=org-run&memberAddress=/team/lead&mode=active');
 await page.waitForFunction(()=>!!window.ir001); await page.waitForTimeout(750);
 await page.evaluate(()=>window.ir001.startStream());
 await page.waitForFunction(()=>window.ir001.snapshot().phase==='live');
 await page.evaluate(()=>window.ir001.begin());
 await page.getByRole('button',{name:'Open note.txt',exact:true}).waitFor();
 const initial=await page.evaluate(()=>window.ir001.snapshot());
 assert.equal(initial.address,'/team/lead'); assert.equal(initial.messageSame,true);
 const snap=async name=>{await page.screenshot({path:`${out}/${width}-${name}.png`});fs.writeFileSync(`${out}/${width}-${name}.html`,await page.content());};
 await snap('unused-mounted');
 // Real existing stream/context handlers update only exact Agent status, not user intent.
 for(let i=0;i<3;i++) { await page.evaluate(()=>window.ir001.publish()); await page.waitForTimeout(100); }
 const published=await page.evaluate(()=>window.ir001.snapshot());
 assert.equal(published.address,initial.address); assert.equal(published.path,initial.path); assert.equal(published.draft,'Keep this unsent draft');
 assert.equal(published.trace.filter(t=>t.kind==='selection'&&t.name==='beginSelectionIntent').length,initial.trace.filter(t=>t.kind==='selection'&&t.name==='beginSelectionIntent').length);
 await snap('publication');
 await page.evaluate(()=>window.ir001.finalize());
 const popupPromise=context.waitForEvent('page');
 await page.getByRole('button',{name:'Open note.txt',exact:true}).click();
 const popup=await popupPromise;await popup.waitForLoadState();
 const body=await popup.locator('body').innerText();assert.equal(body,'Owned renderer fixture note: canonical final contents.');
 assert.match(popup.url(),/\/final\/note\.txt$/);assert.equal(opened.length,1);
 await popup.close();await snap('final-chip');
 if(width===390) await page.getByRole('button',{name:'Toggle fixture navigation'}).click();
 await page.locator('[data-test="agent-org-agent-row-agent-lead-configured"]').click();
 await page.getByRole('button',{name:'Fixture workspace',exact:true}).click();
 await page.locator('[data-test="workspace-team-definition-row-test-team-definition"]').click();
 await page.evaluate(()=>window.ir001.holdTeam());
 await page.locator('[data-test="workspace-team-row-prior-team"]').click();
 await page.waitForFunction(()=>window.ir001.requests.some(r=>r.name==='GetTeamMemberRunProjection'));
 await snap('pending-team');
 await page.locator('[data-test="agent-org-agent-row-agent-lead-configured"]').click();
 await page.evaluate(()=>window.ir001.releaseTeam());await page.waitForTimeout(300);
 const retained=await page.evaluate(()=>window.ir001.snapshot());
 assert.equal(retained.address,'/team/lead');assert.match(retained.path,/orgRunId=org-run/);assert.equal(retained.selected,null);assert.equal(retained.draft,'Keep this unsent draft');
 await snap('retained');
 // Same-root deliberate direct/mounted navigation remains effective.
 await page.locator('[data-test="agent-org-agent-row-agent-director"]').click();
 const direct=await page.evaluate(()=>window.ir001.snapshot());assert.equal(direct.address,'/director');
 if(width===390) await page.getByRole('button',{name:'Toggle fixture navigation'}).click();
 await snap('unused-direct');
 if(width===390) await page.getByRole('button',{name:'Toggle fixture navigation'}).click();
 await page.locator('[data-test="agent-org-agent-row-agent-lead-configured"]').click();
 if(width===390) await page.getByRole('button',{name:'Toggle fixture navigation'}).click();
 assert.equal((await page.evaluate(()=>window.ir001.snapshot())).draft,'Keep this unsent draft');
 assert.deepEqual(errors,[]);
 results.push({width,initial,published,retained,direct,opened,body,errors});
 fs.writeFileSync(out+'/evidence.json',JSON.stringify({scope:'Implementation renderer, actual SFC/stores/Apollo/socket handlers with controlled transport. Memory router isolated and mirrored to fixture query; no provider/server/Electron acceptance.',results},null,2));
 await context.close();
}
} finally { await browser.close(); }
