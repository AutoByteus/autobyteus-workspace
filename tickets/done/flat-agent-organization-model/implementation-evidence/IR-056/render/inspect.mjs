import {createRequire} from 'node:module';import fs from 'node:fs/promises';import assert from 'node:assert/strict';
const require=createRequire('/home/autobyteus/workspace/.codex/worktrees/flat-agent-organization-model/autobyteus-web/package.json');const {chromium}=require('playwright-core');
const data=JSON.parse(await fs.readFile('/tmp/aorg-ir056/render-data.json','utf8'));const out='/tmp/aorg-ir056/render';await fs.mkdir(out,{recursive:true});
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jT9kAAAAASUVORK5CYII=','base64');
const result={observations:[],errors:[],mutations:[],scope:'Actual shared UserMessage/initial-cold/page hydration with real ContextFile default basename, raw codec and projection fixture generation. Controlled file transport; no real chooser/Send/Tasks navigation/provider/activation or server runtime.'};
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
try{for(const [width,height] of [[1502,900],[390,844]]){
 const context=await browser.newContext({viewport:{width,height}});await context.route('**/*',r=>{
 const u=new URL(r.request().url());
 if(u.pathname==='/__ir056/data')return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(data)});
 if(u.pathname==='/graphql'){if(r.request().postData()?.includes('mutation'))result.mutations.push(r.request().postData());return r.fulfill({status:200,contentType:'application/json',body:'{"data":{"agentDefinitions":[]}}'})}
 const row=data.find(d=>new URL(d.uri,'http://localhost:8000').pathname===u.pathname);
 if(row){if(r.request().method()!=='GET')result.mutations.push(r.request().method());return r.fulfill({status:200,contentType:row.type==='image'?'image/png':'text/plain',body:row.type==='image'?png:row.bytes})}
 return r.continue();
 });
 const page=await context.newPage();page.on('pageerror',e=>result.errors.push(String(e)));
 await page.goto('http://127.0.0.1:43156/ir056-labels',{waitUntil:'networkidle',timeout:120000});await page.waitForFunction(()=>window.__ir056?.state().message);
 for(const row of data){await page.selectOption('[data-test=case]',row.id);for(const surface of ['cold','page']){
  await page.selectOption('[data-test=surface]',surface);const button=page.getByRole('button',{name:'Open '+row.label,exact:true});await button.waitFor();
  const state=await page.evaluate(()=>window.__ir056.state());assert.equal(state.message.contextFilePaths[0].locator,row.uri);assert.equal(state.message.contextFilePaths[0].displayName,row.label);
  const popupPromise=context.waitForEvent('page');if(width===390){await button.focus();await button.press('Enter')}else await button.click();
  const popup=await popupPromise;await popup.waitForURL(u=>u.pathname===new URL(row.uri,'http://localhost:8000').pathname);await popup.waitForLoadState('domcontentloaded');
  if(row.type!=='image')assert.equal(await popup.locator('body').innerText(),row.bytes);
  assert.equal(new URL(popup.url()).pathname,new URL(row.uri,'http://localhost:8000').pathname);
  await popup.close();assert.equal((await page.evaluate(()=>window.__ir056.state())).selected,row.id);assert.equal(await page.locator('textarea').count(),0);
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);assert.equal(overflow,false);
  result.observations.push({width,surface,case:row.id,expectedLabel:row.label,actualLabel:state.message.contextFilePaths[0].displayName,exactUri:row.uri,openBytesMatch:row.type==='image'?'image URL control':true,overflow});
  if(['org','custom-prefix','workspace','image'].includes(row.id))await page.screenshot({path:`${out}/${width}-${surface}-${row.id}.png`,fullPage:true});
 }}await context.close();}
 assert.deepEqual(result.errors,[]);assert.deepEqual(result.mutations,[]);result.passed=true;
}finally{await fs.writeFile(out+'/evidence.json',JSON.stringify(result,null,2));await browser.close()}
console.log(JSON.stringify({passed:result.passed,observations:result.observations.length,errors:result.errors}));
