import fs from 'node:fs/promises';
import pw from '../../../../../../autobyteus-web/node_modules/playwright-core/index.js';
const out=new URL('./',import.meta.url);
const browser=await pw.chromium.connectOverCDP('http://127.0.0.1:9222');
const page=browser.contexts().flatMap(c=>c.pages()).find(p=>p.url().includes('127.0.0.1:3596'));
if(!page) throw new Error('actual open_tab page missing');
const errors=[],responses=[],events=[];
page.on('pageerror',e=>errors.push({type:'pageerror',message:e.message}));
page.on('console',m=>{if(m.type()==='error')errors.push({type:'console',message:m.text()})});
page.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('/favicon.ico')&&!r.url().endsWith('/health'))responses.push({status:r.status(),url:r.url()})});
const snap=async label=>{const v=await page.evaluate(label=>({label,at:new Date().toISOString(),url:location.href,viewport:{width:innerWidth,height:innerHeight},body:document.body.innerText,doc:{scrollWidth:document.documentElement.scrollWidth,clientWidth:document.documentElement.clientWidth},buttons:[...document.querySelectorAll('button')].map(e=>({text:(e.innerText||'').replace(/\s+/g,' ').trim(),aria:e.getAttribute('aria-label'),title:e.getAttribute('title'),test:e.getAttribute('data-test'),expanded:e.getAttribute('aria-expanded'),selected:e.getAttribute('aria-selected'),box:e.getBoundingClientRect().toJSON()})).filter(x=>x.text||x.aria||x.title||x.test),selected:[...document.querySelectorAll('[aria-selected=true]')].map(e=>({text:(e.innerText||'').replace(/\s+/g,' ').trim(),test:e.getAttribute('data-test')})),tests:[...document.querySelectorAll('[data-test]')].map(e=>({test:e.getAttribute('data-test'),text:(e.innerText||'').replace(/\s+/g,' ').trim().slice(0,300),expanded:e.getAttribute('aria-expanded'),box:e.getBoundingClientRect().toJSON()}))}),label);events.push(v);await fs.writeFile(new URL('LIVE-005-direct-narrow-messages.partial.json',out),JSON.stringify({events,errors,responses},null,2)+'\n');return v};
const expand=async loc=>{if(await loc.count()&&await loc.getAttribute('aria-expanded')==='false')await loc.click()};
await page.setViewportSize({width:390,height:844});await page.waitForTimeout(700);
const before=await snap('narrow-before-drawer');
const strip=page.getByRole('button',{name:'Agent Orgs',exact:true}).first();if(await strip.count()!==1)throw new Error('supported Agent Orgs strip missing');await strip.click();await page.waitForTimeout(500);
const drawer=await snap('narrow-strip-drawer');
await expand(page.getByRole('button',{name:'Temp Workspace',exact:true}).first());
await expand(page.getByRole('button',{name:/AORG E2E Direct Agents Org/}).first());
await expand(page.getByRole('treeitem',{name:/Call send_message_to exactly once/}).first());
const verifier=page.locator('[data-test="agent-org-agent-row-aorg_e2e_verifier_38ef5d250d094b22899bbfa5ae219041"]');if(await verifier.count()!==1)throw new Error(`exact verifier row missing: ${await verifier.count()}`);await verifier.click();await page.waitForTimeout(700);
const focused=await snap('narrow-exact-verifier-focus');
const orgTab=page.locator('button[aria-label="Agent Org"]');
if(await orgTab.count()!==1)throw new Error(`Agent Org tab missing: ${await orgTab.count()}`);await orgTab.click();await page.waitForTimeout(400);
const header=page.locator('[data-test="collaboration-messages-header"]');if(await header.count()===1&&await header.getAttribute('aria-expanded')==='false')await header.click();await page.waitForTimeout(250);
const messages=await snap('narrow-org-messages');
await page.screenshot({path:new URL('screenshots/LIVE-005-direct-narrow-messages.png',out).pathname,fullPage:true});
const section=page.locator('[data-test="collaboration-messages-section"]');
const rows=page.locator('[data-test="team-communication-message-row"]');
const exactRows=await rows.filter({hasText:'APIREV15-DIRECT-TO-DIRECT-MSG-001'}).count();
const ref=page.getByRole('button',{name:'direct-to-direct.txt',exact:true});
const assertions={
  exactViewport:messages.viewport.width===390&&messages.viewport.height===844,
  supportedStripOpenedUnifiedDrawer:drawer.body.includes('Workspaces')&&drawer.body.includes('AORG E2E Direct Agents Org')&&drawer.body.includes('AORG E2E Mixed Org'),
  exactFocus:focused.body.includes('verifier - 9041')&&focused.selected.filter(x=>x.test==='agent-org-agent-row-aorg_e2e_verifier_38ef5d250d094b22899bbfa5ae219041').length===1,
  agentOrgFacetAccessible:await section.count()===1,
  oneMessageRow:exactRows===1,
  referenceAccessible:await ref.count()===1,
  restoredContinuationVisible:messages.body.includes('APIREV15-DIRECT-RESTORED-CONTINUE-001'),
  noReconnect:!messages.body.includes('Reconnect'),
  noHorizontalOverflow:messages.doc.scrollWidth===messages.doc.clientWidth,
  noErrors:errors.length===0&&responses.length===0
};
const result={at:new Date().toISOString(),events,exactRows,referenceButtonCount:await ref.count(),assertions,errors,responses};await fs.writeFile(new URL('LIVE-005-direct-narrow-messages.json',out),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({assertions,exactRows,referenceButtonCount:await ref.count(),errors,responses},null,2));
await page.setViewportSize({width:1502,height:844});await browser.close();if(Object.values(assertions).some(v=>v!==true))process.exit(2);
