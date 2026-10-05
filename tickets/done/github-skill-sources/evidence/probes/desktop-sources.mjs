// Temporary real packaged-renderer probe; only attaches to this run's owned launch receipt.
import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import {createRequire} from 'node:module';
const evidence=path.resolve('tickets/in-progress/github-skill-sources/evidence');
const {chromium}=createRequire(path.resolve('autobyteus-web/package.json'))('playwright-core');
const instance=JSON.parse(fs.readFileSync(path.join(evidence,'api-isolated-start.json'))).result;
const browser=await chromium.connectOverCDP(instance.controlEndpoint),page=browser.contexts()[0].pages()[0];
const events={requests:[],sockets:[],cases:[]};
const waits=new Set();
page.on('request',r=>{if(r.url()===instance.graphqlUrl){try{events.requests.push(r.postDataJSON()?.operationName||r.postDataJSON()?.query?.slice(0,80));}catch{}}});
page.on('websocket',ws=>{const e={url:ws.url(),closed:false,frames:[]};events.sockets.push(e);ws.on('close',()=>{e.closed=true});ws.on('framereceived',f=>{e.frames.push(String(f.payload).slice(0,600))});});
const until=async(fn,label)=>{const end=Date.now()+20000;while(Date.now()<end){if(await fn())return;await new Promise(r=>setTimeout(r,100));}throw Error('Timeout: '+label);};
const save=()=>fs.writeFileSync(path.join(evidence,'api-desktop-sources.json'),JSON.stringify(events,null,2)+'\n');
const record=async(id,action)=>{try{await action();events.cases.push({id,result:'Pass'});}catch(e){events.cases.push({id,result:'Fail',error:e.stack});throw e;}finally{save();}};
try{
  if(await page.locator('.btn-back').count())await page.locator('.btn-back').click();
  await record('UI-001-duplicate-and-trust',async()=>{
    if(!await page.getByRole('dialog',{name:'Manage Skill Sources'}).count())await page.getByRole('button',{name:'Sources',exact:true}).click();
    const dialog=page.getByRole('dialog',{name:'Manage Skill Sources'});
    await dialog.getByRole('button',{name:'GitHub',exact:true}).click();
    assert.match(await dialog.innerText(),/trust/i);
    await dialog.getByPlaceholder('https://github.com/owner/repository').fill('https://github.com/blader/humanizer.git/');
    await dialog.getByRole('button',{name:'Import repository',exact:true}).click();
    await dialog.getByText(/Already imported:/).waitFor();
    assert.equal(await dialog.locator('article').filter({hasText:'https://github.com/blader/humanizer'}).count(),1);
    await page.screenshot({path:path.join(evidence,'api-desktop-duplicate.png')});
  });
  await record('UI-002-removal-cancel',async()=>{
    await page.locator('article').filter({hasText:'https://github.com/blader/humanizer'}).getByRole('button',{name:'Remove',exact:true}).click();
    await page.getByRole('button',{name:'Cancel',exact:true}).waitFor();
    assert.match(await page.locator('body').innerText(),/local edits/);
    await page.getByRole('button',{name:'Cancel',exact:true}).click();
    assert.equal(await page.locator('article').filter({hasText:'https://github.com/blader/humanizer'}).count(),1);
    await page.getByRole('button',{name:'Done',exact:true}).click();
  });
  await record('UI-003-explorer-open-close',async()=>{
    await page.locator('.skill-card').filter({has:page.getByText('humanizer',{exact:true})}).getByRole('button',{name:'View',exact:true}).click();
    await page.getByRole('heading',{name:'humanizer',exact:true}).waitFor();
    await page.locator('span:visible').filter({hasText:/^SKILL\.md$/}).first().waitFor();
    await until(()=>events.sockets.some(s=>s.url.includes('skill_ws_humanizer')&&s.frames.some(f=>f.includes('CONNECTED'))),'real explorer connection');
    await page.screenshot({path:path.join(evidence,'api-desktop-explorer.png')});
    await page.locator('.btn-back').click();
    await page.getByRole('button',{name:'Sources',exact:true}).waitFor();
    await until(()=>events.sockets.filter(s=>s.url.includes('skill_ws_humanizer')).every(s=>s.closed),'explorer socket closes on return');
  });
  await record('UI-004-remove-and-reimport',async()=>{
    await page.getByRole('button',{name:'Sources',exact:true}).click();
    const row=page.locator('article').filter({hasText:'https://github.com/blader/humanizer'});
    await row.getByRole('button',{name:'Remove',exact:true}).click();
    // Source dialog is inert while the shared confirmation is active.
    await page.getByRole('button',{name:'Remove',exact:true}).last().click();
    await row.waitFor({state:'detached'});
    const dialog=page.getByRole('dialog',{name:'Manage Skill Sources'});
    await dialog.getByRole('button',{name:'GitHub',exact:true}).click();
    await dialog.getByPlaceholder('https://github.com/owner/repository').fill('https://github.com/blader/humanizer');
    await dialog.getByRole('button',{name:'Import repository',exact:true}).click();
    await row.waitFor();await until(async()=>!(await dialog.getByRole('button',{name:'Working…',exact:true}).count()),'import settled');
    await page.screenshot({path:path.join(evidence,'api-desktop-reimport.png')});
    await dialog.getByRole('button',{name:'Done',exact:true}).click();
    assert.equal(await page.locator('.skill-card').filter({has:page.getByText('humanizer',{exact:true})}).count(),1);
  });
  console.log('DESKTOP_SOURCES_PASS');
}finally{save();await browser.close();}
