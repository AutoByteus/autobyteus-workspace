import playwright from '../../../../../../autobyteus-web/node_modules/playwright-core/index.js';
const b=await playwright.chromium.connectOverCDP('http://127.0.0.1:9222');
const p=b.contexts().flatMap(c=>c.pages()).find(p=>p.url().includes('127.0.0.1:3589'));
console.log(JSON.stringify(await p.evaluate(()=>({url:location.href,buttons:[...document.querySelectorAll('button')].map((b,i)=>({i,text:b.textContent?.trim(),title:b.getAttribute('title'),aria:b.getAttribute('aria-label'),selected:b.getAttribute('aria-selected'),current:b.getAttribute('aria-current'),expanded:b.getAttribute('aria-expanded'),test:b.getAttribute('data-test'),disabled:b.disabled,class:b.className})).filter(x=>x.text||x.title||x.aria), body:document.body.innerText})),null,2));
await b.close();
