// Width sweep: for each host width, the host's sideways overflow and which elements cause it.
const path=require('path');const fs=require('fs');const [NM, PAGE, FROM, TO]=process.argv.slice(2);const req=(m)=>require(path.join(NM,m));
(async()=>{const {chromium}=req('playwright-core');const b=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});const p=await b.newPage({viewport:{width:500,height:1400}});
await p.goto('file://'+PAGE);
const res=await p.evaluate(([from,to])=>{const host=document.getElementById('host');const out=[];for(let w=from;w<=to;w++){host.style.width=w+'px';const ov=host.scrollWidth-host.clientWidth;if(ov>0){const hr=host.getBoundingClientRect();const who=[...host.querySelectorAll('*')].filter(e=>!e.closest('.markdown-table-scroll,pre')).map(e=>({t:e.tagName,txt:e.textContent.slice(0,24),d:Math.round(Math.max(...[...e.getClientRects()].map(r=>r.right))-hr.right)})).filter(x=>x.d>0&&x.t!=='DIV'&&x.t!=='P'&&x.t!=='LI'&&x.t!=='UL');out.push(w+':'+ov+':'+who.map(x=>x.t+'('+x.txt+')'+x.d).join('|'));}}return out;},[+FROM,+TO]);
console.log(res.length+' widths overflow'); console.log(res.slice(0,12).join('\n'));await b.close();})();
