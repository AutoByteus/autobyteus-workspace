const path=require('path');const fs=require('fs');const [NM, HTMLFILE]=process.argv.slice(2);const req=(m)=>require(path.join(NM,m));
(async()=>{const {chromium}=req('playwright-core');const b=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});const p=await b.newPage({viewport:{width:400,height:1400}});
await p.goto('file://'+HTMLFILE);
console.log(JSON.stringify(await p.evaluate(()=>{const host=document.getElementById('host');const hr=host.getBoundingClientRect();return [...host.querySelectorAll('*')].filter(e=>!e.closest('.markdown-table-scroll,pre')).map(e=>({t:e.tagName,c:e.className,txt:e.textContent.slice(0,40),d:Math.round(Math.max(...[...e.getClientRects()].map(r=>r.right))-hr.right)})).filter(x=>x.d>0)})));await b.close();})();
