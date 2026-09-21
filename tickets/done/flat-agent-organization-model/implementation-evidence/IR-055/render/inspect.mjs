import { createRequire } from 'node:module'; import fs from 'node:fs/promises'; import assert from 'node:assert/strict';
const require=createRequire('/home/autobyteus/workspace/.codex/worktrees/flat-agent-organization-model/autobyteus-web/package.json'),{chromium}=require('playwright-core');
const out='/tmp/aorg-ir055/render';await fs.mkdir(out,{recursive:true});
const fixtures=(await Promise.all(['autobyteus','codex_app_server','claude_agent_sdk'].map(async p=>JSON.parse(await fs.readFile('/tmp/aorg-ir055/'+p+'.json','utf8'))))).flat();
const files=new Map(fixtures.flatMap(f=>f.files.map(a=>[a.locator,a])));
const result={observations:[],opens:[],errors:[],mutations:[],limits:'Implementation renderer with actual shared UserMessage and initial/cold/page hydration from exported real disposable REST/admission/recorder/native-memory/read-surface integration outputs. Provider backend was bounded in those tests; browser file/fixture transport is controlled from the same exported bytes. Not a live provider, normal Tasks navigation, current server/browser lifecycle, native shell or API acceptance. Native media values unchanged.'};
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
try{
for(const [name,width,height] of [['desktop',1502,900],['narrow',390,844]]){
 const context=await browser.newContext({viewport:{width,height}});
 await context.route('**/__ir055/fixtures',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(fixtures)}));
 await context.route('**/graphql',r=>{if(r.request().postData()?.includes('mutation'))result.mutations.push(r.request().postData());return r.fulfill({status:200,contentType:'application/json',body:'{"data":{"agentDefinitions":[]}}'})});
 await context.route('**/rest/**',r=>{
  const u=new URL(r.request().url()),f=files.get(u.pathname);
  if(r.request().method()!=='GET')result.mutations.push(r.request().method()+' '+u.pathname);
  if(!f)return r.fulfill({status:404,body:'not a fixture file'});
  return r.fulfill({status:200,contentType:f.fileType==='image'?'image/png':f.fileType==='pdf'?'application/pdf':'text/plain',body:Buffer.from(f.bytes.data)});
 });
 const page=await context.newPage(); page.on('pageerror',e=>result.errors.push(String(e)));
 await page.goto('http://127.0.0.1:43155/ir055-history',{waitUntil:'networkidle',timeout:120000});await page.waitForFunction(()=>window.__ir055?.state().message);
 for(const producer of ['autobyteus','codex_app_server','claude_agent_sdk']){
  await page.selectOption('[data-test=producer]',producer);
  for(const target of ['direct','repeat','lead','task-lead','standalone','standalone-lead']){
   await page.selectOption('[data-test=target]',target);
   for(const read of ['initial/cold','active trace page']){
    await page.selectOption('[data-test=read]',read);
    const textChip=page.getByRole('button',{name:'Open accepted-notes.txt',exact:true});await textChip.waitFor();
    const state=await page.evaluate(()=>window.__ir055.state());
    assert.equal(state.message.contextFilePaths.filter(f=>f.type==='Text').length,1);
    const expected=fixtures.find(f=>f.runtimeKind===producer&&f.target===target).files.find(f=>f.fileType==='text');
    const popupPromise=context.waitForEvent('page'); if(name==='narrow'){await textChip.focus();await textChip.press('Enter')}else await textChip.click();
    const popup=await popupPromise; await popup.waitForURL(url=>url.pathname===expected.locator); await popup.waitForLoadState('domcontentloaded');
    assert.equal(new URL(popup.url()).pathname,expected.locator);
    const body=await popup.locator('body').innerText();assert.equal(body,Buffer.from(expected.bytes.data).toString());
    result.opens.push({name,producer,target,read,url:popup.url(),bytesMatch:true});await popup.close();
    assert.equal((await page.evaluate(()=>window.__ir055.state())).target,target);
    assert.equal(await page.locator('textarea').count(),0);
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
    assert.equal(overflow,false);
    result.observations.push({name,producer,target,read,overflow,attachments:state.message.contextFilePaths});
    if(['repeat','task-lead'].includes(target)&&producer!=='claude_agent_sdk')
      await page.screenshot({path:`${out}/${name}-${producer}-${target}-${read==='initial/cold'?'cold':'page'}.png`,fullPage:true});
   }
  }
 }
 await context.close();
}
assert.deepEqual(result.errors,[]);assert.deepEqual(result.mutations,[]);result.passed=true;
}finally{await fs.writeFile(out+'/evidence.json',JSON.stringify(result,null,2));await browser.close()}
console.log(JSON.stringify({passed:result.passed,observations:result.observations.length,opens:result.opens.length,errors:result.errors}));
