/** API-10 current real Codex conversation -> live read-only query -> actual desktop panel.
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
const root=process.cwd(), evidence=resolve(process.env.TEST_API_EVIDENCE_DIR ?? 'tickets/in-progress/backend-port-conflict-20261024/evidence');
const require=createRequire(join(root,'autobyteus-web/package.json'));
const {chromium}=require('playwright-core'), WebSocket=require('ws');
const own=await fs.realpath(await fs.mkdtemp(join(tmpdir(),'ab-api10-')));
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
const cmd=`${q(process.execPath)} -e ${q(code)}`;
let calls=0,inst,browser,socket,child,page,pausedProvider;const frames=[];
const record={case:'API-10',commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),date:new Date().toISOString(),own,model:'deterministic local SSE; real Codex exec_command',steps:[]};
const note=(step,value)=>{record.steps.push({step,value,at:new Date().toISOString()});console.log(JSON.stringify({step,value}));};
const model=createServer(async(req,res)=>{
 let raw='';for await(const c of req)raw+=c;
 if(req.method!=='POST'){res.writeHead(200,{'content-type':'application/json'});res.end(JSON.stringify({data:[{id:'gpt-5.4',object:'model'}]}));return;}
 const id=`resp-${++calls}`;const events=[{type:'response.created',response:{id}}];
 if(calls===1)events.push({type:'response.output_item.done',item:{type:'function_call',call_id:'owned-exec',name:'exec_command',arguments:JSON.stringify({cmd,workdir:workspace,yield_time_ms:1000,max_output_tokens:1000,login:false})}});
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
 page=browser.contexts()[0].pages().find(p=>p.url().includes('renderer'))??browser.contexts()[0].pages()[0];
 note('desktop',{url:page.url(),status:await page.evaluate(()=>window.electronAPI.getServerStatus())});
 const gql=async(query,variables={})=>{const body=await fetch(`http://127.0.0.1:${inst.serverPort}/graphql`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({query,variables})}).then(r=>r.json());note('graphql',body);assert(!body.errors,JSON.stringify(body.errors));return body.data;};
 const viewQuery='query($agentRunId:String!){agentBackgroundTaskView(agentRunId:$agentRunId){__typename ...on AgentBackgroundTaskSnapshot {agentRunId runInstanceId observedAt tasks{taskId kind description command status exitCode startedAt}} ...on AgentBackgroundTaskUnavailable {agentRunId reason} ...on AgentBackgroundTaskUnsupported {agentRunId reason}}}';
 const view=async(id)=>(await gql(viewQuery,{agentRunId:id})).agentBackgroundTaskView;
 page.on('response',async response=>{try{const request=response.request();if(request.postDataJSON()?.operationName==='AgentBackgroundTaskView')note('panel live response',await response.json());}catch{}});
 page.on('pageerror',e=>note('page error',String(e)));
 const cat=await gql('query { providerModelCatalogSnapshots(runtimeKind:"codex_app_server") { llmModels { modelIdentifier value } sources { state safeMessage } } }');
 const models=cat.providerModelCatalogSnapshots.flatMap(s=>s.llmModels);assert(models.length,'Codex model catalog empty');
 const modelId=(models.find(m=>m.value==='gpt-5.4')??models[0]).modelIdentifier;
 const def=await gql('mutation($input:CreateAgentDefinitionInput!) { createAgentDefinition(input:$input){id} }',{input:{name:'Shutdown API fixture',role:'engineer',description:'owned shutdown validation',instructions:'Run the requested local command.',toolNames:[],skillNames:[]}});
 const run=await gql('mutation($input:CreateAgentRunInput!){createAgentRun(input:$input){success message runId}}',{input:{agentDefinitionId:def.createAgentDefinition.id,workspaceRootPath:workspace,llmModelIdentifier:modelId,autoExecuteTools:true,runtimeKind:'codex_app_server'}});
 assert(run.createAgentRun.success,run.createAgentRun.message);
 socket=new WebSocket(`ws://127.0.0.1:${inst.serverPort}/ws/agent/${run.createAgentRun.runId}`);
 socket.on('message',raw=>{const f=JSON.parse(raw.toString());frames.push(f);note('ws',f)});
 await new Promise((r,j)=>{socket.once('open',r);socket.once('error',j)});
 await wait(()=>frames.some(f=>f.type==='CONNECTED'),'WS connected');
 socket.send(JSON.stringify({type:'SEND_MESSAGE',payload:{content:'Run the local owned fixture command.',message_id:'api10-message',dedupe_key:'agent_run_input:api10-message',context_file_paths:[],image_urls:[]}}));
 await wait(async()=>{try{child=JSON.parse(await fs.readFile(receipt,'utf8'));return true}catch{return false}},'listener receipt',45000);
 await wait(()=>frames.some(f=>f.type==='TURN_COMPLETED'),'turn completed',45000);
 assert.equal(await status(child.port),426);assert(alive(child.pid));
 const runId=run.createAgentRun.runId;
 const running=await view(runId);note('running snapshot',{running,child,calls});
 await page.evaluate(id=>{location.hash='/chat?id='+id},runId);
 await page.locator('[data-testid="agent-workspace-surface"]').waitFor({timeout:20000});
 note('selected UI',{url:page.url(),text:await page.locator('body').innerText()});
 if(!await page.locator('[data-test="background-tasks-header"]').isVisible())await page.getByRole('button',{name:/^(Activity|活动)$/}).click();
 await page.locator('[data-test="background-tasks-header"]').click();
 await delay(2500);
 note('panel running',{text:await page.locator('body').innerText()});
 await page.screenshot({path:join(evidence,'API-10-running.png')});
 assert.equal(running.__typename,'AgentBackgroundTaskSnapshot');
 assert.equal(running.tasks.length,1,'actual yielded listener must be represented');
 assert.equal(running.tasks[0].status,'running');
 assert(!JSON.stringify(running).includes(privacy));
 assert(!JSON.stringify(running).includes(receipt));
 assert.equal(await page.locator('[data-test="background-task-row"][data-status="running"]').count(),1);
 const callsBeforeObservation=calls;
 const ancestry=[];let pid=child.pid;
 for(let n=0;n<12&&pid!==inst.pid;n++){
  const identity=execFileSync('ps',['-p',String(pid),'-o','pid=,ppid=,command='],{encoding:'utf8'}).trim();const match=/^(\d+)\s+(\d+)\s+(.+)$/.exec(identity);assert(match,'ancestry identity');ancestry.push({pid:Number(match[1]),parent:Number(match[2]),command:match[3]});pid=Number(match[2]);
 }
 assert.equal(pid,inst.pid,'must reach this exact isolated desktop');
 const providers=ancestry.filter(x=>/codex/.test(x.command)&&/app-server/.test(x.command));assert.equal(providers.length,1,'unambiguous captured provider');
 const provider=providers[0];note('owned provider ancestry',{ancestry,desktopPid:inst.pid,provider});pausedProvider=provider;process.kill(provider.pid,'SIGSTOP');
 const requestStarted=Date.now();const unavailable=await view(runId);note('bounded unavailable',{unavailable,elapsedMs:Date.now()-requestStarted,calls});
 assert.equal(unavailable.__typename,'AgentBackgroundTaskUnavailable');assert(Date.now()-requestStarted<6500,'read remains bounded');
 await page.locator('[data-test="background-tasks-availability"]').waitFor({state:'visible',timeout:10000});
 note('last known panel',{text:await page.locator('[data-test="background-tasks-availability"]').innerText(),counts:await page.locator('[data-test="background-tasks-counts"]').innerText(),row:await page.locator('[data-test="background-task-row"]').innerText(),calls});
 assert.match(await page.locator('[data-test="background-tasks-counts"]').innerText(),/last-known/);assert.equal(await page.locator('[data-test="background-task-row"]').count(),1);assert.equal(calls,callsBeforeObservation);
 await page.screenshot({path:join(evidence,'API-10-unavailable.png')});
 process.kill(provider.pid,'SIGCONT');pausedProvider=null;
 await wait(async()=>!await page.locator('[data-test="background-tasks-availability"]').isVisible(),'availability recovers',12000);
 const recovered=await view(runId);assert.equal(recovered.tasks[0].status,'running');assert.equal(recovered.tasks[0].taskId,running.tasks[0].taskId);assert.equal(calls,callsBeforeObservation);
 note('recovered actual provider',{recovered,calls,listenerStatus:await status(child.port),panel:await page.locator('[data-test="background-task-row"]').innerText()});await page.screenshot({path:join(evidence,'API-10-recovered.png')});
 const started=Date.now();await page.evaluate(()=>window.electronAPI.startShutdown());
 await wait(()=>!alive(inst.pid),'desktop exit',33000);
 await delay(500);
 note('postquit',{elapsedMs:Date.now()-started,desktopAbsent:!alive(inst.pid),childAbsent:!alive(child.pid),listenerStatus:await status(child.port),sentinelStatus:await status(sentinel.address().port),data:await fs.readFile(join(data,'API-sentinel.txt'),'utf8')});
 assert(!alive(child.pid),'owned Codex listener survived full desktop quit');assert.equal(await status(child.port),null);assert.equal(await status(sentinel.address().port),200);
 record.result='Pass';
}catch(e){record.result='Fail';record.error=String(e.stack??e);console.error(e);process.exitCode=1; if(page){try{note('failure UI',{url:page.url(),text:await page.locator('body').innerText()});await page.screenshot({path:join(evidence,'API-10-failure.png')});}catch{}}}
finally{
 if(pausedProvider&&alive(pausedProvider.pid)){const identity=execFileSync('ps',['-p',String(pausedProvider.pid),'-o','command='],{encoding:'utf8'}).trim();assert.equal(identity,pausedProvider.command,'resume exact provider only');process.kill(pausedProvider.pid,'SIGCONT');pausedProvider=null;}
 socket?.terminate();await browser?.close().catch(()=>{});
 if(inst){try{record.cleanup=await cli(['stop',inst.instanceId,'--keep']);}catch(e){record.cleanupError=String(e)}
 try{await fs.copyFile(inst.logPath,join(evidence,'API-10-application.log'))}catch{}}
 if(!child){try{child=JSON.parse(await fs.readFile(receipt,'utf8'))}catch{}}
 if(child&&alive(child.pid)){
  const command=execFileSync('ps',['-p',String(child.pid),'-o','command='],{encoding:'utf8'});
  assert(command.includes(receipt),'cleanup refuses unknown identity');process.kill(child.pid,'SIGTERM');await delay(300);
  if(alive(child.pid))process.kill(child.pid,'SIGKILL');await wait(()=>!alive(child.pid),'fixture cleanup');note('fixture cleanup fallback',{pid:child.pid});
 }
 model.closeAllConnections();sentinel.closeAllConnections();await Promise.all([new Promise(r=>model.close(r)),new Promise(r=>sentinel.close(r))]);
 record.listenerAbsentAfterCleanup=child?!alive(child.pid):null;
 await fs.rm(own,{recursive:true,force:true,maxRetries:10,retryDelay:100});record.privateRootRemoved=true;
 await fs.writeFile(join(evidence,'API-10-result.json'),JSON.stringify(record,null,2));
}
