import fs from 'node:fs/promises';
import pw from '../../../../../../autobyteus-web/node_modules/playwright-core/index.js';
const name=process.argv[2];
if(!name || !/^[A-Za-z0-9._-]+$/.test(name)) throw new Error('safe output name required');
const browser=await pw.chromium.connectOverCDP('http://127.0.0.1:9222');
const pages=browser.contexts().flatMap(c=>c.pages());
const page=pages.find(p=>p.url().includes('127.0.0.1:3596'));
if(!page) throw new Error('open_tab page missing');
await page.waitForTimeout(500);
const result=await page.evaluate(()=>({
  capturedAt:new Date().toISOString(),url:location.href,title:document.title,
  viewport:{width:innerWidth,height:innerHeight},documentWidth:document.documentElement.scrollWidth,
  body:document.body.innerText,
  selected:[...document.querySelectorAll('[aria-current="true"],[aria-selected="true"]')].map(x=>({tag:x.tagName,text:(x.innerText||'').trim(),test:x.getAttribute('data-test'),ariaCurrent:x.getAttribute('aria-current'),ariaSelected:x.getAttribute('aria-selected')})),
  tasks:document.querySelector('[data-test="team-delegated-tasks-section"]')?.innerText||null,
  center:document.querySelector('[data-test="workspace-center-pane"]')?.innerText||null,
  alerts:[...document.querySelectorAll('[role="alert"]')].map(x=>(x.innerText||'').trim()).filter(Boolean)
}));
await fs.writeFile(new URL(`${name}.json`,import.meta.url),JSON.stringify(result,null,2));
await page.screenshot({path:new URL(`screenshots/${name}.png`,import.meta.url).pathname});
console.log(JSON.stringify({name,url:result.url,viewport:result.viewport,documentWidth:result.documentWidth,selected:result.selected,tasks:result.tasks,alerts:result.alerts},null,2));
await browser.close();
