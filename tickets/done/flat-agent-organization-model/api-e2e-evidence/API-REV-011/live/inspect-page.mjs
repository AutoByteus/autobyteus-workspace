import playwright from '../../../../../../autobyteus-web/node_modules/playwright-core/index.js';
const b=await playwright.chromium.connectOverCDP('http://127.0.0.1:9222');
const p=b.contexts().flatMap(c=>c.pages()).find(p=>p.url().includes('127.0.0.1:3590'));
if(!p) throw new Error('open_tab tab not found');
await p.waitForTimeout(3000);
console.log(JSON.stringify(await p.evaluate(()=>({url:location.href,title:document.title,ready:document.readyState,buttons:[...document.querySelectorAll('button')].map((b,i)=>({i,text:b.textContent?.replace(/\s+/g,' ').trim(),title:b.getAttribute('title'),aria:b.getAttribute('aria-label'),selected:b.getAttribute('aria-selected'),current:b.getAttribute('aria-current'),expanded:b.getAttribute('aria-expanded'),test:b.getAttribute('data-test'),disabled:b.disabled})).filter(x=>x.text||x.title||x.aria),tests:[...document.querySelectorAll('[data-test]')].map(e=>({test:e.getAttribute('data-test'),text:e.textContent?.replace(/\s+/g,' ').trim(),expanded:e.getAttribute('aria-expanded'),selected:e.getAttribute('aria-selected'),current:e.getAttribute('aria-current')})),body:document.body.innerText})),null,2));
await b.close();
