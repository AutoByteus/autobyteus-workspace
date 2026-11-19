const pw=require(process.env.PW);
(async()=>{const b=await pw.chromium.connectOverCDP('http://127.0.0.1:19895');try{
const pages=b.contexts()[0].pages(),p=pages.find(p=>p.url().includes('index.html')); if(!p)throw Error('window missing');
const state=()=>p.evaluate(()=>window.electronAPI.getAppUpdateState());
const until=async(label,predicate,timeout=70000)=>{const deadline=Date.now()+timeout;do{const s=await state();if(predicate(s)){console.log(label,s.status,s.message,s.automaticUpdate);return s}await new Promise(r=>setTimeout(r,30));}while(Date.now()<deadline);throw new Error('Timed out: '+label+' '+JSON.stringify(await state()))};
const click=id=>p.getByTestId(id).click({timeout:8000});
if(!await p.getByTestId('settings-updates-panel').isVisible()){
await p.getByText('Settings',{exact:true}).first().click();await p.getByText('Updates',{exact:true}).first().click()}
if(process.argv[2]==='cancel'){
if((await state()).automaticUpdate)await click('auto-update-app-toggle');
await click('settings-updates-check-updates');
await click('auto-update-app-toggle');
await until('observed writer verification',s=>s.message.startsWith('Verifying downloaded'));
await click('auto-update-app-toggle');
console.log('toggled off',await state());
await until('observed cancel complete',s=>!s.automaticUpdate&&!s.updateStaged&&s.status==='available');
console.log('cancel settled',await state());}
await click('settings-updates-check-updates'); await click('settings-updates-download-update');
await p.getByTestId('settings-updates-install-update').waitFor({state:'visible',timeout:75000});
console.log('verified before click',await state());
if(process.argv[3]==='stageOnly'){console.log("Observed stop before restart"); return}
await click('settings-updates-install-update');console.log('clicked Install & Restart',new Date().toISOString());
}finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1})
