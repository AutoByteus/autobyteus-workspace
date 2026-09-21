import fs from 'node:fs/promises';
import pw from '../../../../../../autobyteus-web/node_modules/playwright-core/index.js';
const out=new URL('./',import.meta.url);
const browser=await pw.chromium.connectOverCDP('http://127.0.0.1:9222');
const page=browser.contexts().flatMap(c=>c.pages()).find(p=>p.url().includes('127.0.0.1:3592'));
if(!page) throw new Error('open_tab page missing');
await page.setViewportSize({width:1502,height:844});
const errors=[];const events=[];
page.on('pageerror',e=>errors.push({type:'pageerror',message:e.message}));
page.on('console',m=>{if(m.type()==='error') errors.push({type:'console',message:m.text()})});
const snap=async label=>{const x=await page.evaluate(label=>({label,at:new Date().toISOString(),url:location.href,body:document.body.innerText,selected:[...document.querySelectorAll('[aria-selected="true"],[aria-current="true"]')].map(e=>({test:e.getAttribute('data-test'),text:(e.textContent||'').replace(/\s+/g,' ').trim()})),tests:[...document.querySelectorAll('[data-test]')].map(e=>({test:e.getAttribute('data-test'),text:(e.textContent||'').replace(/\s+/g,' ').trim().slice(0,300),expanded:e.getAttribute('aria-expanded'),active:e.getAttribute('data-active')}))}),label);events.push(x);await fs.writeFile(new URL('LIVE-005-postrestart-continuation.partial.json',out),JSON.stringify({events,errors},null,2)+'\n');return x};
const expand=async loc=>{if(await loc.count()&&await loc.getAttribute('aria-expanded')==='false')await loc.click()};
const send=async(marker)=>{const box=page.getByRole('textbox',{name:'Type a message...'});await box.fill(`Return exactly ${marker} on the first line and a five-word acknowledgment on the second line.`);await page.getByRole('button',{name:'Send message'}).click();await page.waitForFunction(m=>(document.body.innerText.match(new RegExp(m,'g'))||[]).length>=2,marker,{timeout:180000});return snap(marker)};
await page.goto('http://127.0.0.1:3592/workspace/',{waitUntil:'domcontentloaded',timeout:30000});
await page.waitForFunction(()=>document.body.innerText.includes('Workspaces'),null,{timeout:30000});
await expand(page.getByRole('button',{name:'workspace',exact:true}).first());
// Standalone Team history -> lazy restore on first post-restart message.
await expand(page.locator('[data-test="workspace-team-definition-row-apirev8-team"]'));
await expand(page.locator('[data-test="workspace-team-row-apirev8_team_ccf2b4b3a83e49bbb05b522969e61e89"]'));
await page.locator('[data-test="workspace-team-member-apirev8_team_ccf2b4b3a83e49bbb05b522969e61e89-/aorg_e2e_lead"]').click();
await page.waitForFunction(()=>document.body.innerText.includes('APIREV8-TEAM-LIVE-001')&&document.body.innerText.includes('APIREV13-TEAM-RESUMED-001'),null,{timeout:30000});
const teamBefore=await snap('team-history-after-process-restart');
const teamAfter=await send('APIREV13-TEAM-POSTRESTART-001');
await page.screenshot({path:new URL('screenshots/LIVE-005-team-postrestart.png',out).pathname,fullPage:true});
const terminate=page.getByRole('button',{name:'Terminate team'});
await terminate.click();
await page.waitForFunction(()=>[...document.querySelectorAll('button')].every(b=>b.getAttribute('aria-label')!=='Terminate team'),null,{timeout:60000});
const teamStopped=await snap('team-restopped-after-process-restart');
// Org terminal -> exact member restore -> direct and mounted continuation.
await expand(page.getByRole('button',{name:/APIREV8 组织 Ω/}).first());
const orgRoot=page.getByRole('treeitem',{name:/Return exactly APIREV8-ORG-DIRECT-LIVE-001/});
await expand(orgRoot);
await page.locator('[data-test^="agent-org-agent-row-aorg_e2e_concierge_"]').first().click();
await page.waitForFunction(()=>new URL(location.href).searchParams.get('mode')==='active'&&document.body.innerText.includes('APIREV13-ORG-DIRECT-CONTINUE-001'),null,{timeout:60000});
const orgBefore=await snap('org-direct-restored-after-process-restart');
const orgAfter=await send('APIREV13-ORG-POSTRESTART-001');
await page.screenshot({path:new URL('screenshots/LIVE-005-org-postrestart.png',out).pathname,fullPage:true});
const mountedTeam=page.locator('[data-test^="agent-org-team-row-apirev8_team_"]').first();
await expand(mountedTeam);
const mountedLead=page.locator('[data-test^="agent-org-agent-row-aorg_e2e_lead_"]').first();
await mountedLead.click();
await page.waitForFunction(()=>document.body.innerText.includes('APIREV13-ORG-MOUNTED-CONTINUE-001'),null,{timeout:30000});
const mountedBefore=await snap('org-mounted-history-after-process-restart');
const mountedAfter=await send('APIREV13-ORG-MOUNTED-POSTRESTART-001');
// The settled task row may be selectable; use exact task ID when present and preserve authoritative empty/fallback semantics otherwise.
const taskId='task_520783d1cf8b44bf92db55a96fb87738';
const taskSelector=page.locator(`[data-test*="${taskId}"]`).first();
let taskMonitor=null;
if(await taskSelector.count()) {await taskSelector.click();await page.waitForTimeout(500);taskMonitor=await snap('accepted-task-selected-after-restart');await mountedLead.click();}
await page.screenshot({path:new URL('screenshots/LIVE-005-org-mounted-postrestart.png',out).pathname,fullPage:true});
const stop=page.getByRole('button',{name:'Stop Agent Org'});await stop.click();
await page.waitForFunction(()=>new URL(location.href).searchParams.get('mode')==='configuration',null,{timeout:60000});
await expand(page.getByRole('button',{name:/APIREV8 组织 Ω/}).first());
await page.getByRole('treeitem',{name:/Return exactly APIREV8-ORG-DIRECT-LIVE-001/}).click();
await page.waitForFunction(()=>new URL(location.href).searchParams.get('mode')==='history'&&document.body.innerText.includes('Stopped Agent Org'),null,{timeout:30000});
const finalTerminal=await snap('final-org-terminal-after-restart-continuations');
await page.screenshot({path:new URL('screenshots/LIVE-005-final-terminal-after-restart.png',out).pathname,fullPage:true});
const relevantErrors=errors.filter(e=>!/Failed to load resource: net::ERR_CONNECTION_REFUSED/.test(e.message));
const assertions={
 teamHistoryRetained:teamBefore.body.includes('APIREV8-TEAM-LIVE-001')&&teamBefore.body.includes('APIREV13-TEAM-RESUMED-001'),
 teamContinuedAfterRestart:(teamAfter.body.match(/APIREV13-TEAM-POSTRESTART-001/g)||[]).length>=2,
 teamRestopped:!teamStopped.body.includes('Terminate team'),
 orgHistoryRetained:orgBefore.body.includes('APIREV8-ORG-DIRECT-LIVE-001')&&orgBefore.body.includes('APIREV13-ORG-DIRECT-CONTINUE-001'),
 orgDirectContinuedAfterRestart:(orgAfter.body.match(/APIREV13-ORG-POSTRESTART-001/g)||[]).length>=2,
 mountedHistoryRetained:mountedBefore.body.includes('APIREV13-ORG-MOUNTED-CONTINUE-001'),
 orgMountedContinuedAfterRestart:(mountedAfter.body.match(/APIREV13-ORG-MOUNTED-POSTRESTART-001/g)||[]).length>=2,
 acceptedTaskRetainedInDurableTree:mountedBefore.body.includes(taskId)||mountedAfter.body.includes(taskId)||taskMonitor!==null,
 finalTerminalExact:finalTerminal.url.includes('mode=history')&&finalTerminal.body.includes('Stopped Agent Org')&&finalTerminal.body.includes('Select a member from the historical run in the sidebar to continue from its saved state.'),
 noRelevantBrowserErrors:relevantErrors.length===0,
};
await fs.writeFile(new URL('LIVE-005-postrestart-continuation.json',out),JSON.stringify({assertions,errors,relevantErrors,taskMonitorSelected:taskMonitor!==null,events},null,2)+'\n');
console.log(JSON.stringify({assertions,errors,relevantErrors,taskMonitorSelected:taskMonitor!==null},null,2));
if(Object.values(assertions).some(v=>v!==true)) throw new Error(`assertion failure ${JSON.stringify(assertions)}`);
await browser.close();
