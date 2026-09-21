import playwright from '../../../../../../autobyteus-web/node_modules/playwright-core/index.js';
import fs from 'node:fs/promises';
const {chromium}=playwright;
const out=new URL('./',import.meta.url);
const b=await chromium.connectOverCDP('http://127.0.0.1:9222');
const p=b.contexts().flatMap(c=>c.pages()).find(p=>p.url().includes('127.0.0.1:3589'));
if(!p)throw new Error('tab missing');
const snap=async(label)=>{
 await p.waitForTimeout(700);
 const v=await p.evaluate(label=>({label,at:new Date().toISOString(),url:location.href,center:document.querySelector('main')?.innerText??document.body.innerText,selected:[...document.querySelectorAll('[aria-selected="true"],[aria-current="true"]')].map(e=>({tag:e.tagName,test:e.getAttribute('data-test'),text:e.textContent?.replace(/\s+/g,' ').trim(),selected:e.getAttribute('aria-selected'),current:e.getAttribute('aria-current')})),allTests:[...document.querySelectorAll('[data-test]')].filter(e=>/workspace-(team-member|header|agent-org)/.test(e.getAttribute('data-test')||'')).map(e=>({test:e.getAttribute('data-test'),text:e.textContent?.replace(/\s+/g,' ').trim(),selected:e.getAttribute('aria-selected'),current:e.getAttribute('aria-current')}))}),label);
 return v;
};
const evidence=[];
// Ensure both histories and exact rows are exposed.
for(const t of ['workspace','A本APIREV8 本地化 Team β(1)','APIREV8 组织 Ω(1)','Return exactly APIREV8-TEAM-LIVE-001 on the first line and a five-word acknowledgment on the seco...','New - APIREV8 组织 Ω']){
 const q=p.getByRole('button',{name:t,exact:true}); if(await q.count()&&await q.first().getAttribute('aria-expanded')==='false') await q.first().click();
}
const orgAgent=p.locator('[data-test^="agent-org-agent-row-aorg_e2e_concierge"]');
await orgAgent.click();
await p.waitForTimeout(900);
evidence.push(await snap('inactive-org-direct'));
const teamAnalyst=p.locator('[data-test^="workspace-team-member-"][data-test$="-/aorg_e2e_analyst"]');
await teamAnalyst.click();
await p.waitForTimeout(900);
evidence.push(await snap('inactive-team-analyst'));
await p.screenshot({path:new URL('screenshots/LIVE-001-inactive-org-team-switch.png',out).pathname,fullPage:true});
await orgAgent.click();
await p.waitForTimeout(900);
evidence.push(await snap('inactive-org-return'));
await fs.writeFile(new URL('LIVE-001-inactive-switch.json',out),JSON.stringify(evidence,null,2));
console.log(JSON.stringify(evidence.map(x=>({label:x.label,url:x.url,selected:x.selected,center:x.center.slice(0,500)})),null,2));
await b.close();
