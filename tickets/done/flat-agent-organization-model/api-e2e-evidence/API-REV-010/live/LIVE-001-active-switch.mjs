import playwright from '../../../../../../autobyteus-web/node_modules/playwright-core/index.js';import fs from 'node:fs/promises';
const b=await playwright.chromium.connectOverCDP('http://127.0.0.1:9222');const p=b.contexts().flatMap(c=>c.pages()).find(p=>p.url().includes('127.0.0.1:3589'));const out=new URL('./',import.meta.url);const ev=[];
const snap=async label=>p.evaluate(label=>({label,at:new Date().toISOString(),url:location.href,subjectCurrent:[...document.querySelectorAll('[aria-current="true"]')].map(e=>({test:e.getAttribute('data-test'),text:e.textContent?.replace(/\s+/g,' ').trim(),selected:e.getAttribute('aria-selected')})),orgSelected:[...document.querySelectorAll('[data-test^="agent-org-"][aria-selected="true"]')].map(e=>({test:e.getAttribute('data-test'),text:e.textContent?.replace(/\s+/g,' ').trim()})),center:document.querySelector('main')?.innerText??document.body.innerText,body:document.body.innerText}),label);
const team=p.locator('[data-test^="workspace-team-member-"][data-test$="-/aorg_e2e_analyst"]');const org=p.locator('[data-test^="agent-org-agent-row-aorg_e2e_concierge"]');
ev.push(await snap('active-team-before'));
await org.click();await p.waitForFunction(()=>new URL(location.href).searchParams.get('rootSubjectKind')==='agent_org'&&document.body.innerText.includes('aorg e2e concierge -'),null,{timeout:15000});ev.push(await snap('active-org-after-team'));
await team.click();await p.waitForFunction(()=>location.search===''&&document.body.innerText.includes('APIREV10-TEAM-ACTIVE-001'),null,{timeout:15000});ev.push(await snap('active-team-return'));
await p.screenshot({path:new URL('screenshots/LIVE-001-active-switch-desktop.png',out).pathname,fullPage:true});
await p.setViewportSize({width:390,height:844});await p.waitForTimeout(500);ev.push(await snap('active-team-narrow'));
// Supported collapsed-strip path opens the drawer; then use the same exact Org row.
const strip=p.locator('[data-test="mobile-left-panel-trigger"], [data-test="workspace-history-mobile-trigger"], button').filter({hasText:'Agents'}).first();
// At narrow, any visible primary-nav strip button is approved; click first visible exact nav item if history tree is not visible.
if(!(await org.isVisible())){const candidates=p.locator('button');for(let i=0;i<await candidates.count();i++){const x=candidates.nth(i);if(await x.isVisible()&&(await x.textContent())?.trim()==='Agents'){await x.click();break;}}await p.waitForTimeout(400);}
await org.click();await p.waitForFunction(()=>new URL(location.href).searchParams.get('rootSubjectKind')==='agent_org'&&document.body.innerText.includes('aorg e2e concierge -'),null,{timeout:15000});ev.push(await snap('active-org-narrow'));
await p.screenshot({path:new URL('screenshots/LIVE-001-active-switch-narrow.png',out).pathname,fullPage:true});
await fs.writeFile(new URL('LIVE-001-active-switch.json',out),JSON.stringify(ev,null,2));console.log(JSON.stringify(ev.map(x=>({label:x.label,url:x.url,current:x.subjectCurrent,orgSelected:x.orgSelected,center:x.center.slice(0,280)})),null,2));await b.close();
