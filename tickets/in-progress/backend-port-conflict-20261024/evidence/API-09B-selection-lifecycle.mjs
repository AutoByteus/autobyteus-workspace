/** API-09B current real Codex conversation -> live read-only query -> actual desktop panel.
 * No query interception or fake frontend contexts. Natural completion uses an owned fixture file.
 * Run from root: env -i PATH="$PATH" HOME="$HOME" TMPDIR="$TMPDIR" node <this-file>
 * Local deterministic Responses model only, no paid inference/auth. Own roots/CLI instance/receipts.
 */
import {createServer} from 'node:http';
import fs from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {spawn,execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const root=process.cwd(), evidence=resolve('tickets/in-progress/backend-port-conflict-20261024/evidence');
const require=createRequire(join(root,'autobyteus-web/package.json'));
const {chromium}=require('playwright-core'), WebSocket=require('ws');
const own=await fs.realpath(await fs.mkdtemp(join(tmpdir(),'ab-api09b-')));
const home=join(own,'home'), data=join(own,'data'), workspace=join(own,'workspace');
for(const p of [home,data,workspace])await fs.mkdir(p);
const env={PATH:process.env.PATH,HOME:home,CODEX_HOME:join(home,'.codex'),TMPDIR:own,USER:process.env.USER??'normy',LOGNAME:process.env.LOGNAME??'normy'};
await fs.mkdir(env.CODEX_HOME);
const q=s=>"'"+s.replaceAll("'","'\\''")+"'";
const delay=ms=>new Promise(r=>setTimeout(r,ms));
const wait=async(fn,label,ms=30000)=>{const end=Date.now()+ms;while(Date.now()<end){if(await fn())return;await delay(100);}throw Error('timeout '+label)};
const alive=pid=>{try{process.kill(pid,0);return true}catch{return false}};
const status=port=>fetch(`http://127.0.0.1:${port}`,{signal:AbortSignal.timeout(800)}).then(r=>r.status,()=>null);
const receipt=join(workspace,'listener.json');
const finish=join(workspace,'finish.json'), privacy='API09_NONSECRET_PRIVATE_MARKER';
const code=`const fs=require('fs'),http=require('http');const s=http.createServer((q,r)=>{r.writeHead(426);r.end('owned')});s.listen(0,'::',()=>fs.writeFileSync(${JSON.stringify(receipt)},JSON.stringify({pid:process.pid,port:s.address().port})));setInterval(()=>{if(fs.existsSync(${JSON.stringify(finish)}))s.close(()=>process.exit(JSON.parse(fs.readFileSync(${JSON.stringify(finish)})).exitCode));},100);/*API09_NONSECRET_PRIVATE_MARKER*/`;
let cmd='';const children=[];const sockets=[];
let calls=0,inst,browser,socket,child,page;const frames=[];
const record={case:'API-09B',commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),date:new Date().toISOString(),own,model:'deterministic local SSE; real Codex exec_command',steps:[]};
const note=(step,value)=>{record.steps.push({step,value,at:new Date().toISOString()});console.log(JSON.stringify({step,value}));};
const model=createServer(async(req,res)=>{
 let raw='';for await(const c of req)raw+=c;
 if(req.method!=='POST'){res.writeHead(200,{'content-type':'application/json'});res.end(JSON.stringify({data:[{id:'gpt-5.4',object:'model'}]}));return;}
 const id=`resp-${++calls}`;const events=[{type:'response.created',response:{id}}];
 if(calls%2===1)events.push({type:'response.output_item.done',item:{type:'function_call',call_id:'owned-exec',name:'exec_command',arguments:JSON.stringify({cmd,workdir:workspace,yield_time_ms:1000,max_output_tokens:1000,login:false})}});
 if(calls%2===1)events.push({type:'response.output_item.done',item:{type:'function_call',call_id:'foreground-'+calls,name:'exec_command',arguments:JSON.stringify({cmd:'printf FOREGROUND_NONSECRET_OUTPUT',workdir:workspace,yield_time_ms:1000,max_output_tokens:1000,login:false})}});
 else events.push({type:'response.output_item.done',item:{type:'message',id:'done-msg',role:'assistant',content:[{type:'output_text',text:'owned fixture submitted'}]}});
 events.push({type:'response.completed',response:{id,usage:{input_tokens:0,output_tokens:0,total_tokens:0}}});
 res.writeHead(200,{'Content-Type':'text/event-stream'});res.end(events.map(e=>`data: ${JSON.stringify(e)}\n\n`).join(''));
 note('model response',{call:calls,url:req.url,toolNames:JSON.parse(raw).tools?.map(t=>t.name??t.type)});
});
await new Promise(r=>model.listen(0,'127.0.0.1',r));
const sentinel=createServer((req,res)=>{res.writeHead(200);res.end('unrelated sentinel')});await new Promise(r=>sentinel.listen(0,'127.0.0.1',r));
await fs.writeFile(join(env.CODEX_HOME,'config.toml'),`model = "gpt-5.4"\nmodel_provider = "fixture"\ncheck_for_update_on_startup = false\n[model_providers.fixture]\nname = "local fixture"\nbase_url = "http://127.0.0.1:${model.address().port}/v1"\nwire_api = "responses"\nrequires_openai_auth = false\nsupports_websockets = false\n[features]\nunified_exec = true\n`);
const cli=async(args)=>{const c=spawn(process.execPath,['autobyteus-web/scripts/isolated-app/cli.mjs',...args],{cwd:root,env});let out='',err='';c.stdout.on('data',b=>out+=b);c.stderr.on('data',b=>err+=b);const exit=await new Promise(r=>c.on('exit',r));note('isolated-cli',{args,exit,out,err});assert.equal(exit,0);return JSON.parse(out).result;};
try{
 await fs.writeFile(join(data,'API-sentinel.txt'),'must survive shutdown');
 inst=await cli(['start','--from-worktree','--data-root',data]);
 browser=await chromium.connectOverCDP(`http://127.0.0.1:${inst.controlPort}`);
 page=browser.contexts()[0].pages().find(p=>!p.url().startsWith('devtools:'));
 const gql=async(query,variables={})=>{const body=await fetch(`http://127.0.0.1:${inst.serverPort}/graphql`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({query,variables})}).then(r=>r.json());note('graphql',body);assert(!body.errors,JSON.stringify(body.errors));return body.data;};
 const viewQuery='query($agentRunId:String!){agentBackgroundTaskView(agentRunId:$agentRunId){__typename ...on AgentBackgroundTaskSnapshot {agentRunId runInstanceId observedAt tasks{taskId kind description command status exitCode startedAt}} ...on AgentBackgroundTaskUnavailable {agentRunId reason}}}';
 const view=async(id)=>(await gql(viewQuery,{agentRunId:id})).agentBackgroundTaskView;
 const panelReads=[];
 page.on('response',async response=>{try{if(response.request().postDataJSON()?.operationName==='AgentBackgroundTaskView'){const body=await response.json();panelReads.push(body);note('panel live response',body);}}catch{}});
 page.on('pageerror',e=>note('page error',String(e)));
 const createRun=async(label)=>{
  const receiptPath=join(workspace,`listener-${label}.json`),finishPath=join(workspace,`finish-${label}.json`);
  cmd=`${q(process.execPath)} -e ${q(code.replaceAll(receipt,receiptPath).replaceAll(finish,finishPath))}`;
  const cat=await gql('query { providerModelCatalogSnapshots(runtimeKind:"codex_app_server") { llmModels { modelIdentifier value } } }');
  const models=cat.providerModelCatalogSnapshots.flatMap(s=>s.llmModels),modelId=(models.find(m=>m.value==='gpt-5.4')??models[0]).modelIdentifier;
  const def=await gql('mutation($input:CreateAgentDefinitionInput!){createAgentDefinition(input:$input){id}}',{input:{name:'Visibility '+label,role:'engineer',description:'owned visibility validation',instructions:'Execute the requested fixture.',toolNames:[],skillNames:[]}});
  const result=await gql('mutation($input:CreateAgentRunInput!){createAgentRun(input:$input){success message runId}}',{input:{agentDefinitionId:def.createAgentDefinition.id,workspaceRootPath:workspace,llmModelIdentifier:modelId,autoExecuteTools:true,runtimeKind:'codex_app_server'}});
  assert(result.createAgentRun.success,result.createAgentRun.message);const runId=result.createAgentRun.runId;
  const ws=new WebSocket(`ws://127.0.0.1:${inst.serverPort}/ws/agent/${runId}`),events=[];sockets.push(ws);
  ws.on('message',raw=>{const f=JSON.parse(raw.toString());events.push(f);note('ws '+label,f)});
  await new Promise((r,j)=>{ws.once('open',r);ws.once('error',j)});await wait(()=>events.some(f=>f.type==='CONNECTED'),'connected '+label);
  ws.send(JSON.stringify({type:'SEND_MESSAGE',payload:{content:'Run the owned background and foreground fixtures.',message_id:'msg-'+label,dedupe_key:'agent_run_input:msg-'+label,context_file_paths:[],image_urls:[]}}));
  const owned={receiptPath,finishPath,runId,label};children.push(owned);
  await wait(async()=>{try{Object.assign(owned,JSON.parse(await fs.readFile(receiptPath,'utf8')));return true}catch{return false}},'receipt '+label,45000);
  await wait(()=>events.some(f=>f.type==='TURN_COMPLETED'),'turn completed '+label,45000);
  assert.equal(await status(owned.port),426);assert(alive(owned.pid));
  const snapshot=await view(runId);assert.equal(snapshot.__typename,'AgentBackgroundTaskSnapshot');assert.equal(snapshot.tasks.length,1,'foreground excluded');assert.equal(snapshot.tasks[0].status,'running');
  assert(!JSON.stringify(snapshot).includes('NONSECRET'));assert(!JSON.stringify(snapshot).includes(workspace));
  assert(!events.some(f=>f.type==='BACKGROUND_TASK_UPDATED'),'inspection must not introduce legacy idle lease events');
  owned.taskId=snapshot.tasks[0].taskId;note('run ready',{owned,snapshot,calls});return owned;
 };
 const select=async(owned,expected)=>{
  await page.evaluate(id=>{location.hash='/chat?id='+id},owned.runId);
  await page.waitForFunction(id=>{const stores=document.querySelector('#__nuxt')?.__vue_app__?.config.globalProperties.$pinia._s;return stores?.get('agentSelection')?.selectedRunId===id && !!document.querySelector('[data-testid="agent-workspace-surface"]')},owned.runId,{timeout:20000});
  await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  if(!await page.locator('[data-test="background-tasks-header"]').isVisible())await page.getByRole('button',{name:/^(Activity|活动)$/}).click();
  if(!await page.locator('[data-test="background-tasks-list"]').isVisible())await page.locator('[data-test="background-tasks-header"]').click();
  await wait(()=>panelReads.some(r=>r.data?.agentBackgroundTaskView?.agentRunId===owned.runId),'selected live view');
  await wait(async()=>{const row=page.locator('[data-test="background-task-row"]');return await row.count()===1 && (await row.first().getAttribute('data-status'))===expected && (await row.first().innerText()).includes(owned.taskId.slice(0,8))},'correct selected row '+owned.label,12000);
  const text=await page.locator('[data-test="background-task-row"]').innerText();assert(!text.includes('NONSECRET'));assert.equal(await page.locator('[data-test="background-task-command"]').count(),0);
  note('selected panel',{label:owned.label,runId:owned.runId,text,calls});await page.screenshot({path:join(evidence,`API-09B-${owned.label}-${expected}.png`)});
 };
 const a=await createRun('A');await select(a,'running');
 const b=await createRun('B');await select(b,'running');
 const beforeObservation=calls;await fs.writeFile(a.finishPath,JSON.stringify({exitCode:7}));await wait(()=>!alive(a.pid),'A natural nonzero');
 let failed;await wait(async()=>{failed=await view(a.runId);return failed.tasks?.[0]?.status==='failed'},'A failed',12000);assert.equal(failed.tasks[0].exitCode,7);
 await select(b,'running');await select(a,'failed');assert.equal(calls,beforeObservation);
 await gql('mutation($id:String!){terminateAgentRun(agentRunId:$id){success message}}',{id:a.runId});
 const inactive=await view(a.runId);assert.equal(inactive.__typename,'AgentBackgroundTaskUnavailable');assert.equal(calls,beforeObservation);note('inactive read',{inactive,calls});
 await select(b,'running');
 let started=Date.now();await page.evaluate(()=>window.electronAPI.restartServer());await wait(async()=> (await page.evaluate(()=>window.electronAPI.getServerStatus())).status==='running','restart ready',40000);
 await wait(()=>!alive(b.pid),'B absent after restart');assert.equal(await status(b.port),null);assert.equal(await status(sentinel.address().port),200);
 note('restart active Codex',{elapsedMs:Date.now()-started,owned:b,pidAbsent:!alive(b.pid),listenerStatus:await status(b.port),sentinel:await status(sentinel.address().port),calls});
 const c=await createRun('C');await select(c,'running');
 started=Date.now();await page.evaluate(()=>window.electronAPI.startShutdown());await wait(()=>!alive(inst.pid),'desktop quit',33000);await wait(()=>!alive(c.pid),'C absent after quit');
 note('quit active Codex',{elapsedMs:Date.now()-started,owned:c,desktopAbsent:!alive(inst.pid),pidAbsent:!alive(c.pid),listenerStatus:await status(c.port),sentinel:await status(sentinel.address().port),data:await fs.readFile(join(data,'API-sentinel.txt'),'utf8'),calls});
 assert.equal(await status(c.port),null);assert.equal(await status(sentinel.address().port),200);assert.equal(await fs.readFile(join(data,'API-sentinel.txt'),'utf8'),'must survive shutdown');
 record.result='Pass';
}catch(e){record.result='Fail';record.error=String(e.stack??e);console.error(e);process.exitCode=1; if(page){try{note('failure UI',{url:page.url(),text:await page.locator('body').innerText()});await page.screenshot({path:join(evidence,'API-09B-failure.png')});}catch{}}}
finally{
 for(const ws of sockets)ws.terminate();socket?.terminate();await browser?.close().catch(()=>{});
 if(inst){try{record.cleanup=await cli(['stop',inst.instanceId,'--keep']);}catch(e){record.cleanupError=String(e)}
 try{await fs.copyFile(inst.logPath,join(evidence,'API-09B-application.log'))}catch{}}
 for(const owned of children){
  if(!owned.pid){try{Object.assign(owned,JSON.parse(await fs.readFile(owned.receiptPath,'utf8')))}catch{}}
  if(owned.pid&&alive(owned.pid)){
   const command=execFileSync('ps',['-p',String(owned.pid),'-o','command='],{encoding:'utf8'});assert(command.includes(owned.receiptPath),'refuse unknown cleanup');process.kill(owned.pid,'SIGTERM');await delay(300);if(alive(owned.pid))process.kill(owned.pid,'SIGKILL');await wait(()=>!alive(owned.pid),'owned fallback cleanup');note('fallback cleanup',{pid:owned.pid});
  }
 }
 record.children=children.map(x=>({...x,absent:x.pid?!alive(x.pid):null}));
 model.closeAllConnections();sentinel.closeAllConnections();await Promise.all([new Promise(r=>model.close(r)),new Promise(r=>sentinel.close(r))]);
 record.listenerAbsentAfterCleanup=child?!alive(child.pid):null;
 await fs.rm(own,{recursive:true,force:true,maxRetries:10,retryDelay:100});record.privateRootRemoved=true;
 await fs.writeFile(join(evidence,'API-09B-result.json'),JSON.stringify(record,null,2));
}
