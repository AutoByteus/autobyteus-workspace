// 60 KB unbroken run in a markdown paragraph (with long-unbroken-text), layout time with and without the candidate rule.
const path=require('path');const fs=require('fs');const [NM, BEFORE, AFTER]=process.argv.slice(2);const req=(m)=>require(path.join(NM,m));
(async()=>{const {chromium}=req('playwright-core');const b=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
const run=Array.from({length:60000},(_,i)=>'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'[(i*7919)%64]).join('');
for (const [label,file] of [['before',BEFORE],['after',AFTER]]) { const p=await b.newPage({viewport:{width:500,height:900}}); await p.goto('file://'+file);
 const t=await p.evaluate((text)=>{const host=document.getElementById('host');host.style.width='310px';const out=[];for(let i=0;i<3;i++){const body=host.querySelector('.markdown-body');body.classList.add('long-unbroken-text');body.innerHTML='';const para=document.createElement('p');para.textContent=text;const t0=performance.now();body.appendChild(para);void host.offsetHeight;out.push(Math.round(performance.now()-t0));host.style.width=(i%2?'300px':'320px');const t1=performance.now();void host.offsetHeight;out.push(Math.round(performance.now()-t1));}return out;},run);
 console.log(label,'[insert, relayout]x3 ms',JSON.stringify(t)); await p.close(); }
await b.close();})();
