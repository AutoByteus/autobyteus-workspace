import {createRequire} from 'node:module'
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PW);
let b=await chromium.connectOverCDP('http://127.0.0.1:19891');
const pages=b.contexts()[0].pages(); const p=pages.find(p=>p.url().includes('index.html'));
if(!p) throw new Error('packaged main page missing:'+pages.map(p=>p.url()))
const act=process.argv[2];
try{
 if(act==='ui')console.log((await p.locator('body').innerText()).slice(0,4500),await p.locator('button[title],button[aria-label],a[title]').evaluateAll(es=>es.map(e=>[e.title,e.ariaLabel]).slice(0,60)));
 if(act==='state')console.log(JSON.stringify(await p.evaluate(()=>window.electronAPI.getAppUpdateState())));
 if(act==='click')await p.getByText(process.argv[3],{exact:true}).first().click({timeout:8000});
 if(act==='title')await p.getByTitle(process.argv[3],{exact:true}).first().click({timeout:8000});
 if(act==='tid')await p.getByTestId(process.argv[3]).click({timeout:10000});
 if(act==='stage')await p.waitForFunction(async()=>{const s=await window.electronAPI.getAppUpdateState();return s.updateStaged||s.status==='error'},null,{timeout:160000});
 if(act==='shot')await p.screenshot({path:process.argv[3]});
 if(act==='draft'){const input=p.locator('[contenteditable=true],textarea').filter({visible:true}).first();await input.fill('API-05 synthetic unsent draft while a signed release waits.');console.log(await input.evaluate(e=>e.value??e.textContent));}
 if(act==='draftRead')console.log(await p.locator('[contenteditable=true],textarea').filter({visible:true}).first().evaluate(e=>e.value??e.textContent));
 if(act==='ready')await p.waitForFunction(async()=>Boolean((await window.electronAPI.getAppUpdateState()).updateStaged),{},{timeout:130000});
 if(act==='controls')console.log(await p.locator('[data-testid^=settings-updates-], [data-testid=auto-update-app-toggle]').evaluateAll(es=>es.filter(e=>e.getBoundingClientRect().width).map(e=>({test:e.dataset.testid,disabled:e.disabled,checked:e.getAttribute('aria-checked'),text:e.innerText}))));
 if(act==='waitInstall')await p.getByTestId('settings-updates-install-update').waitFor({state:'visible',timeout:125000});
 if(act==='buttons')console.log(await p.locator('button').evaluateAll(es=>es.filter(e=>e.getBoundingClientRect().width).map(e=>[e.innerText,e.title,e.ariaLabel,e.getAttribute('data-testid')]).slice(0,90)));
}finally {await b.close()}
