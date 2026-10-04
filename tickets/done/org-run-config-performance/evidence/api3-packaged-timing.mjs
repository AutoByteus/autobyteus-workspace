// Disposable requirements investigation. Follows repository packaged-test CDP boundary; not durable validation coverage.
import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
const root=process.cwd(), out=path.join(root,'tickets/in-progress/org-run-config-performance/evidence');
const {chromium,selectors}=createRequire(path.join(root,'autobyteus-web/package.json'))('playwright-core');selectors.setTestIdAttribute('data-test');
const start=JSON.parse(await fs.readFile(path.join(out,process.env.START_RECEIPT??'api3-packaged-start.json'),'utf8')).result;
if(!start.controlEndpoint.startsWith('http://127.0.0.1:')||!start.backendUrl.startsWith('http://127.0.0.1:'))throw Error('Test-owned loopback only');
const probe=await fs.readFile(path.join(out,'launch-row-passive.js'),'utf8');const configProbe=await fs.readFile(path.join(out,'api3-config-passive.js'),'utf8');
const browser=await chromium.connectOverCDP(start.controlEndpoint);
const page=browser.contexts().flatMap(c=>c.pages()).find(p=>p.url().includes('/renderer/index.html'));
if(!page)throw Error('Owned packaged renderer missing');page.setDefaultTimeout(15000);
const phase=process.env.PHASE??'small-history', warm=Number(process.env.WARM??5), cold=Number(process.env.COLD??5);
const evidence={phase,startedAt:new Date().toISOString(),instanceId:start.instanceId,version:'1.4.93',sourceHead:process.env.OUT_PREFIX?.includes('baseline')?'1b976216da0cbd0cc84fef3fe22a2739325b8ad3':'f2dc1fd392201844bf28fdfdec26c7424a7ea7b2 + actual reviewed unstaged IR002 hashes',surface:process.env.OUT_PREFIX?.includes('baseline')?'pinned approved-base installed comparator in owned isolated instance':'fresh current uncommitted IR002 worktree packaged renderer/backend',responseObservation:'metadata-only except tiny create response; no history body cloning',samples:[],requests:[],errors:[],consoleErrors:[]};
const file=path.join(out,`${process.env.OUT_PREFIX??'api3-packaged'}-${phase}.json`), save=()=>fs.writeFile(file,JSON.stringify(evidence,null,2)+'\n');
const pending=new Set();evidence.sentFrames=[];page.on('websocket',socket=>socket.on('framesent',event=>{try{const data=JSON.parse(String(event.payload));evidence.sentFrames.push({type:data.type,commandType:data.commandType??data.command?.type??null,containsSendMessage:/SEND_MESSAGE/.test(String(event.payload))});}catch{}}));
page.on('pageerror',e=>evidence.errors.push({type:'pageerror',message:e.message}));
page.on('console',m=>{if(m.type()==='error')evidence.consoleErrors.push(m.text());});
page.on('response',response=>{
 if(response.url()!==start.graphqlUrl)return;
 const task=(async()=>{const request=response.request();const body=request.postDataJSON()??{};await response.finished();const timing=request.timing();const row={operation:body.operationName??'unknown',variables:body.variables,timing,status:response.status(),responseBytes:Number(response.headers()['content-length']??0)};
 if(row.operation==='CreateAgentOrgRun')try{const data=await response.json();row.errors=data.errors??null;row.result=data.data?.createAgentOrgRun;row.createInput=body.variables?.input;}catch(e){row.parseError=e.message;}evidence.requests.push(row);})();pending.add(task);task.finally(()=>pending.delete(task));
});
const network=await page.context().newCDPSession(page);await network.send('Network.enable');
evidence.transferMetadata=[];const networkRequests=new Map();
network.on('Network.requestWillBeSent',e=>{if(e.request.url===start.graphqlUrl){try{const b=JSON.parse(e.request.postData??'{}');networkRequests.set(e.requestId,{operation:b.operationName??'unknown',variables:b.variables});}catch{}}});
network.on('Network.loadingFinished',e=>{if(networkRequests.has(e.requestId))evidence.transferMetadata.push({...networkRequests.get(e.requestId),encodedDataLength:e.encodedDataLength});});
await page.addInitScript(probe);await page.evaluate(probe);await page.addInitScript(configProbe);await page.evaluate(configProbe);
const profiling=process.env.PROFILE_RENDERER==='1';const cdp=profiling?await page.context().newCDPSession(page):null;if(cdp){await cdp.send('Profiler.enable');await cdp.send('Profiler.setSamplingInterval',{interval:1000});}
async function prepare(coldRenderer){
 const configStarted=performance.now();const configRequestStart=evidence.requests.length;
 if(coldRenderer){await page.reload();await page.getByRole('button',{name:'Agent Orgs',exact:true}).waitFor();await page.evaluate(probe);await page.evaluate(configProbe);}
 {
  await page.getByRole('button',{name:'Agent Orgs',exact:true}).click();await page.getByTestId('org-card-autobyteus-org').waitFor();await page.getByTestId('org-card-autobyteus-org').getByRole('button',{name:'Run',exact:true}).click();await page.getByTestId('run-agent-org').waitFor();
 }
 await page.locator('#org-run-runtime-kind option[value="codex_app_server"]').waitFor({state:'attached'});
 await page.waitForFunction(()=>!document.querySelector('#org-run-runtime-kind option[value="codex_app_server"]').disabled);
 if(await page.locator('#org-run-runtime-kind').inputValue()!=='codex_app_server')await page.locator('#org-run-runtime-kind').selectOption('codex_app_server');
 const modelOption=page.getByRole('option',{name:'GPT-6.1-Sol (default reasoning: low)',exact:true});
 if(await modelOption.isVisible().catch(()=>false))await modelOption.click();
 else if(await page.getByTestId('agent-org-run-config').getByRole('button',{name:'Select a model',exact:true}).count()){
  await page.getByTestId('agent-org-run-config').getByRole('button',{name:'Select a model',exact:true}).first().click();await modelOption.click();
 }
 await page.waitForFunction(()=>{const b=document.querySelector('[data-test="run-agent-org"]');return b&&!b.disabled;},{},{timeout:25000});
 await page.waitForTimeout(150);
 evidence.configSamples??=[];await Promise.all([...pending]);evidence.configSamples.push({coldRenderer,automationPreparationMs:performance.now()-configStarted,requests:evidence.requests.slice(configRequestStart).map(r=>({operation:r.operation,durationMs:r.timing.responseEnd,status:r.status,variables:r.variables})),passiveDom:await page.evaluate(()=>window.__apiConfigProbe.last),caveat:'Preparation elapsed includes automation; HTTP request duration is separately captured, not passive click-to-config DOM timing.'});
}
try{
 await save();
 for(const [kind,count] of [['warm',warm],['cold-renderer',cold]])for(let n=1;n<=count;n++){
  await prepare(kind==='cold-renderer');const transferStart=evidence.transferMetadata.length;const reqStart=evidence.requests.length;const before=await page.evaluate(()=>window.__orgLaunchProbe.samples.length);
  if(cdp)await cdp.send('Profiler.start');
  await page.getByTestId('run-agent-org').click();
  await page.waitForFunction(index=>window.__orgLaunchProbe?.samples[index]?.complete,before,{timeout:45000});await page.waitForTimeout(100);
  if(cdp){const {profile}=await cdp.send('Profiler.stop');await fs.writeFile(path.join(out,'launch-row-renderer-profile.cpuprofile'),JSON.stringify(profile));}
  await Promise.all([...pending]);
  const sample=await page.evaluate(index=>({sample:window.__orgLaunchProbe.samples[index],longTasks:window.__orgLaunchProbe.longTasks.filter(t=>t.start>=window.__orgLaunchProbe.samples[index].clickAt)}),before);
  const requests=evidence.requests.slice(reqStart),create=requests.find(r=>r.operation==='CreateAgentOrgRun');
  if(create?.createInput?.rootConfiguration?.runtimeKind!=='codex_app_server'||create?.createInput?.rootConfiguration?.llmModelIdentifier!=='gpt-6.1-sol')throw Error('Required exact model/runtime changed; no substitution');
  if(!create?.result?.success||create.result.agentOrgRunId!==sample.sample.rowId)throw Error('Exact new row does not match successful created run');
  sample.sample.transferMetadata=evidence.transferMetadata.slice(transferStart);sample.sample.kind=kind;sample.sample.n=n;sample.sample.createMs=create.timing.responseEnd;sample.sample.postData=create.createInput;
  sample.sample.requestSummary=requests.map(r=>({operation:r.operation,durationMs:r.timing.responseEnd,startFromClickMs:r.timing.startTime-sample.sample.timeOrigin-sample.sample.clickAt,responseBytes:r.responseBytes,rootCount:r.rootCount,newRootInHistory:r.rootIds?.includes(sample.sample.rowId)}));
  evidence.samples.push(sample);await page.screenshot({path:path.join(out,`${process.env.OUT_PREFIX??'api3-packaged'}-${phase}-${kind}-${n}.png`)});await save();console.log(JSON.stringify({phase,kind,n,...sample.sample,postData:undefined,beforeRows:undefined,requestSummary:undefined}));
 }
 if(evidence.configSamples.length!==warm+cold||evidence.configSamples.some(c=>!c.passiveDom||!Number.isFinite(c.passiveDom.configDomMs)||!Number.isFinite(c.passiveDom.codexOfferedMs)||!Number.isFinite(c.passiveDom.selectedConfigReadyMs)))throw Error('Incomplete passive configuration clocks');
 if(evidence.errors.length)throw Error('Page errors observed');
 if(evidence.sentFrames.some(f=>f.containsSendMessage))throw Error('Launch submitted inference unexpectedly');evidence.completedAt=new Date().toISOString();await save();
}catch(e){evidence.failure=e.stack;evidence.failedDom=await page.locator('body').innerText().catch(()=>null);evidence.pendingProbe=await page.evaluate(()=>window.__orgLaunchProbe).catch(()=>null);await save();console.error(e.stack);process.exitCode=1;}
// Lifecycle CLI exclusively owns shutdown; exit only disconnects this test observer.
process.exit(process.exitCode??0);
