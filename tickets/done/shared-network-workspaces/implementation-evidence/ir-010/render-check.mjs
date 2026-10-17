// Narrow implementation renderer feedback loop, not API/E2E/NFS qualification.
import fs from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import net from 'node:net';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
const E=path.dirname(fileURLToPath(import.meta.url)), R=path.resolve(E,'../../../../..'), W=path.join(R,'autobyteus-web');
const require=createRequire(path.join(W,'package.json')), {chromium}=require('playwright-core');
const output=path.join(E,process.argv[2]||'render-1'); await fs.mkdir(output);
const fixture=path.join(W,'pages/ir010-draft-check.vue');
const scratch=await fs.mkdtemp(path.join(os.tmpdir(),'ir010-render-'));
await fs.mkdir(path.join(scratch,'home')); await fs.mkdir(path.join(scratch,'tmp'));
const evidence={kind:'Implementation-only fixture renderer, real Monaco/native keys; GraphQL and event source controlled. No desktop shell/NFS/backend qualification.',steps:[],errors:[],requests:[],cleanup:{}};
let browser,child,page,backend;
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const save=()=>fs.writeFile(path.join(output,'result.json'),JSON.stringify(evidence,null,2)+'\n');
const freePort=()=>new Promise(res=>{const s=net.createServer();s.listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>res(p))})});
const values=()=>page.evaluate(()=>({models:window.monaco?.editor.getModels().map(m=>m.getValue()),visible:document.querySelector('.view-lines')?.textContent,active:document.activeElement?.className}));
const expectValue=async expected=>{await page.waitForFunction(s=>window.monaco?.editor.getModels().some(m=>m.getValue()===s),expected); assert.equal((await values()).models[0],expected);};
const record=async name=>{await wait(600);const state=await values();state.surfaceCount=await page.locator('main').count(); await page.screenshot({path:path.join(output,name+'.png')});evidence.steps.push({name,...state});await save();};
try {
 await fs.copyFile(path.join(E,'render-fixture.vue'),fixture,1);
 backend=http.createServer((req,res)=>{res.setHeader('content-type','application/json');res.end(JSON.stringify({status:'ok'}))});
 await new Promise(r=>backend.listen(0,'127.0.0.1',r));
 const backendPort=backend.address().port;
 const port=await freePort(); evidence.port=port;
 const log=createWriteStream(path.join(output,'nuxt.log'));
 child=spawn(path.join(W,'node_modules/.bin/nuxi'),['dev','--host','127.0.0.1','--port',String(port)],{cwd:W,detached:true,env:{PATH:process.env.PATH,HOME:path.join(scratch,'home'),TMPDIR:path.join(scratch,'tmp'),LANG:'en_US.UTF-8',NUXT_TELEMETRY_DISABLED:'1',BACKEND_NODE_BASE_URL:`http://127.0.0.1:${backendPort}`,NO_COLOR:'1'},stdio:['ignore','pipe','pipe']});
 child.stdout.pipe(log);child.stderr.pipe(log);
 const url=`http://127.0.0.1:${port}/ir010-draft-check`;
 let ready=false; for(let n=0;n<120;n++){try{if((await fetch(url)).ok){ready=true;break}}catch{} await wait(1000)} assert.ok(ready,'Nuxt ready');
 browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 const context=await browser.newContext({viewport:{width:1280,height:850},locale:'en-US'});page=await context.newPage();page.setDefaultTimeout(30000);
 page.on('pageerror',e=>evidence.errors.push(e.message));
 await page.routeWebSocket(/\/ws\//,()=>{});
 let peer='initial committed',delay=0;
 await page.route('**/graphql', async route=>{
  const body=route.request().postDataJSON();evidence.requests.push({operation:body.operationName,variables:body.variables});
  let data;
  if(body.operationName==='GetFileContent'){if(delay)await wait(delay); data={fileContent:body.variables.filePath==='other.md'?'other committed':peer};}
  else if(body.operationName==='WriteFileContent'){peer=body.variables.content;data={writeFileContent:JSON.stringify({changes:[]})};}
  else throw new Error('Unexpected fixture GraphQL '+body.operationName);
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({data})});
 });
 await page.goto(url); await expectValue('initial committed'); await wait(4000);
 // Warmup reload handles Nuxt dependency prebundle without crediting it as product behavior.
 await page.reload(); await expectValue('initial committed');
 const edit=async text=>{await page.locator('.view-lines').click();await page.keyboard.press('Meta+a');await page.keyboard.type(text);await expectValue(text);};
 await edit('LOCAL DRAFT'); await record('draft-before-peer');
 peer='PEER COMMITTED';delay=1800;
 await page.getByRole('button',{name:'Receive peer modification'}).click();await wait(200);await expectValue('LOCAL DRAFT');await record('draft-during-loading');
 await wait(2000);await expectValue('LOCAL DRAFT');await record('draft-after-peer');
 await page.getByRole('button',{name:'Reopen current file'}).click();await expectValue('LOCAL DRAFT');
 await page.getByRole('button',{name:'Other file',exact:true}).click();await expectValue('other committed');
 await page.getByRole('button',{name:'Notes file',exact:true}).click();await expectValue('LOCAL DRAFT');
 await page.getByRole('button',{name:'Toggle Files surface'}).click();await page.getByRole('button',{name:'Toggle Files surface'}).click();await expectValue('LOCAL DRAFT');
 await page.getByRole('button',{name:'Maximize view'}).click();await expectValue('LOCAL DRAFT');await record('zen-draft');
 await page.getByRole('button',{name:'Exit full view'}).click();await expectValue('LOCAL DRAFT');
 await page.locator('.view-lines').click();await page.keyboard.press('Meta+s'); await page.getByText('Changes saved',{exact:true}).waitFor();
 assert.equal(peer,'LOCAL DRAFT');await record('saved-control');await wait(5100); // existing own-write echo window
 peer='FRESH CLEAN READER';delay=0;await page.getByRole('button',{name:'Receive peer modification'}).click();await expectValue('FRESH CLEAN READER');await record('clean-refresh');
 await edit('SECOND DRAFT');peer='# Fresh preview';await page.getByRole('button',{name:'Receive peer modification'}).click();await wait(500);
 await page.getByRole('button',{name:'Preview Mode',exact:true}).click();await page.getByRole('heading',{name:'Fresh preview'}).waitFor();await record('clean-preview');
 await page.getByRole('button',{name:'Edit Mode',exact:true}).click();await expectValue('SECOND DRAFT');
 await page.setViewportSize({width:700,height:650});await wait(1000);await record('narrow-draft');
 assert.deepEqual(evidence.errors,[]);evidence.result='Pass';
} catch(e){evidence.result='Fail';evidence.failure=e.stack;if(page)try{await record('failure')}catch{};process.exitCode=1;}
finally {
 if(backend){backend.closeAllConnections();await new Promise(r=>backend.close(r));evidence.cleanup.backendStopped=true;}
 if(browser)await browser.close();evidence.cleanup.browserClosed=!!browser;
 if(child){try{process.kill(-child.pid,'SIGTERM')}catch(e){if(e.code!=='ESRCH')throw e;}await Promise.race([new Promise(r=>child.once('exit',r)),wait(10000)]);if(child.exitCode===null&&child.signalCode===null)process.kill(-child.pid,'SIGKILL'); evidence.cleanup.nuxtStopped=true;}
 await fs.rm(fixture,{force:true});await fs.rm(scratch,{recursive:true,force:true});evidence.cleanup.fixtureRemoved=true;evidence.cleanup.scratchRemoved=true;await save();console.log(JSON.stringify({result:evidence.result,failure:evidence.failure,steps:evidence.steps.length,cleanup:evidence.cleanup}));
}

// All owned servers/browser/fixture/scratch have closed before exiting the probe.
process.exit(process.exitCode || 0);
