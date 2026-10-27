/** API-06 real packaged desktop -> GraphQL/WS -> native command tools -> ended-run restart / active-run quit.
 * Run from root: env -i PATH="$PATH" HOME="$HOME" TMPDIR="$TMPDIR" node <this-file>
 * Local deterministic Chat Completions model only, no paid inference/auth. Own roots/CLI instance/receipts.
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
const own=await fs.realpath(await fs.mkdtemp(join(tmpdir(),'ab-api06-')));
const home=join(own,'home'), data=join(own,'data'), workspace=join(own,'workspace');
for(const p of [home,data,workspace])await fs.mkdir(p);
const env={PATH:process.env.PATH,HOME:home,CODEX_HOME:join(home,'.codex'),TMPDIR:own,USER:process.env.USER??'normy',LOGNAME:process.env.LOGNAME??'normy'};
await fs.mkdir(env.CODEX_HOME);
const q=s=>"'"+s.replaceAll("'","'\\''")+"'";
const delay=ms=>new Promise(r=>setTimeout(r,ms));
const wait=async(fn,label,ms=30000)=>{const end=Date.now()+ms;while(Date.now()<end){if(await fn())return;await delay(100);}throw Error('timeout '+label)};
const alive=pid=>{try{process.kill(pid,0);return true}catch{return false}};
const status=port=>fetch(`http://127.0.0.1:${port}`,{signal:AbortSignal.timeout(800)}).then(r=>r.status,()=>null);
const commands=()=>[0,1].map(i=>{
 const receipt=join(workspace,`listener-${turn}-${i}.json`);
 const code=`const fs=require('fs'),http=require('http');${i===0?`process.on('SIGTERM',()=>fs.writeFileSync(${JSON.stringify(receipt+'.term')},'TERM observed'));`:''}const s=http.createServer((q,r)=>{r.writeHead(426);r.end('owned')});s.listen(0,'::',()=>fs.writeFileSync(${JSON.stringify(receipt)},JSON.stringify({pid:process.pid,port:s.address().port})));`;
 const base=`${q(process.execPath)} -e ${q(code)}`;
 return {receipt,name:i===0?'start_background_process':'run_bash',command:i===0?base:`${base} > ${q(receipt+'.log')} 2>&1 & while [ ! -s ${q(receipt)} ]; do sleep 0.01; done`};
});
let calls=0,inst,browser,socket;const frames=[];let children=[];let turn=1;let allChildren=[];
const record={case:'API-06',commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),date:new Date().toISOString(),own,model:'deterministic local SSE; real native tools',steps:[]};
const note=(step,value)=>{record.steps.push({step,value,at:new Date().toISOString()});console.log(JSON.stringify({step,value}));};
const model=createServer(async(req,res)=>{
 let raw='';for await(const c of req)raw+=c;
 if(req.method!=='POST'){res.writeHead(200,{'content-type':'application/json'});res.end(JSON.stringify({data:[{id:'fixture-model',object:'model'}]}));return;}
 const input=JSON.parse(raw);calls++;
 const names=(input.tools??[]).map(t=>t.function?.name??t.name);
 const shouldCall=names.includes('start_background_process')&&!input.messages?.some(m=>m.role==='tool');
 const delta=shouldCall?{role:'assistant',tool_calls:commands().map((c,i)=>({index:i,id:`call-${turn}-${i}`,type:'function',function:{name:c.name,arguments:JSON.stringify({command:c.command,cwd:workspace})}}))}:{role:'assistant',content:'owned fixture submitted'};
 const chunk=(delta,finish_reason)=>({id:`chat-${calls}`,object:'chat.completion.chunk',created:Math.floor(Date.now()/1000),model:'fixture-model',choices:[{index:0,delta,finish_reason}]});
 res.writeHead(200,{'Content-Type':'text/event-stream'});res.end(`data: ${JSON.stringify(chunk(delta,null))}\n\ndata: ${JSON.stringify(chunk({},shouldCall?'tool_calls':'stop'))}\n\ndata: [DONE]\n\n`);
 note('model response',{call:calls,url:req.url,toolNames:names,shouldCall});
});
await new Promise(r=>model.listen(0,'127.0.0.1',r));
const sentinel=createServer((req,res)=>{res.writeHead(200);res.end('unrelated sentinel')});await new Promise(r=>sentinel.listen(0,'127.0.0.1',r));
await fs.writeFile(join(env.CODEX_HOME,'config.toml'),`model = "gpt-5.4"\nmodel_provider = "fixture"\ncheck_for_update_on_startup = false\n[model_providers.fixture]\nname = "local fixture"\nbase_url = "http://127.0.0.1:${model.address().port}/v1"\nwire_api = "responses"\nrequires_openai_auth = false\nsupports_websockets = false\n[features]\nunified_exec = true\n`);
const cli=async(args)=>{const c=spawn(process.execPath,['autobyteus-web/scripts/isolated-app/cli.mjs',...args],{cwd:root,env});let out='',err='';c.stdout.on('data',b=>out+=b);c.stderr.on('data',b=>err+=b);const exit=await new Promise(r=>c.on('exit',r));note('isolated-cli',{args,exit,out,err});assert.equal(exit,0);return JSON.parse(out).result;};
try{
 await fs.writeFile(join(data,'API-sentinel.txt'),'must survive shutdown');
 inst=await cli(['start','--from-worktree','--data-root',data]);
 browser=await chromium.connectOverCDP(`http://127.0.0.1:${inst.controlPort}`);
 const page=browser.contexts()[0].pages().find(p=>p.url().includes('renderer'))??browser.contexts()[0].pages()[0];
 note('desktop',{url:page.url(),status:await page.evaluate(()=>window.electronAPI.getServerStatus())});
 const gql=async(query,variables={})=>{const body=await fetch(`http://127.0.0.1:${inst.serverPort}/graphql`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({query,variables})}).then(r=>r.json());note('graphql',body);assert(!body.errors,JSON.stringify(body.errors));return body.data;};
 const provider=await gql('mutation($input:CustomProviderInputObject!){createCustomProvider(input:$input){provider{id}}}',{input:{name:'Local shutdown fixture',baseUrl:`http://127.0.0.1:${model.address().port}/v1`,apiKey:'test-owned-nonsecret'}});
 const cat=await gql('mutation($id:String!){ensureProviderModelCatalog(providerId:$id,runtimeKind:"autobyteus"){llmModels{modelIdentifier value}}}',{id:provider.createCustomProvider.provider.id});
 const models=cat.ensureProviderModelCatalog.llmModels;assert(models.length,'native model catalog empty');const modelId=models[0].modelIdentifier;
 const def=await gql('mutation($input:CreateAgentDefinitionInput!) { createAgentDefinition(input:$input){id} }',{input:{name:'Shutdown API fixture',role:'engineer',description:'owned shutdown validation',instructions:'Run the requested local command.',toolNames:['start_background_process','run_bash'],skillNames:[]}});
 for(turn=1;turn<=2;turn++){
 frames.length=0;children=[];
 const run=await gql('mutation($input:CreateAgentRunInput!){createAgentRun(input:$input){success message runId}}',{input:{agentDefinitionId:def.createAgentDefinition.id,workspaceRootPath:workspace,llmModelIdentifier:modelId,autoExecuteTools:true,runtimeKind:'autobyteus'}});
 assert(run.createAgentRun.success,run.createAgentRun.message);
 socket=new WebSocket(`ws://127.0.0.1:${inst.serverPort}/ws/agent/${run.createAgentRun.runId}`);
 socket.on('message',raw=>{const f=JSON.parse(raw.toString());frames.push(f);note('ws',f)});
 await new Promise((r,j)=>{socket.once('open',r);socket.once('error',j)});
 await wait(()=>frames.some(f=>f.type==='CONNECTED'),'WS connected');
 socket.send(JSON.stringify({type:'SEND_MESSAGE',payload:{content:'Run the local owned fixture command.',message_id:`api06-message-${turn}`,dedupe_key:`agent_run_input:api06-message-${turn}`,context_file_paths:[],image_urls:[]}}));
 await wait(async()=>{try{children=await Promise.all(commands().map(async c=>({...JSON.parse(await fs.readFile(c.receipt,'utf8')),receipt:c.receipt})));return true}catch{return false}},'listener receipts',45000);
 allChildren.push(...children);
 await wait(()=>frames.some(f=>f.type==='TURN_COMPLETED'),'turn completed',45000);
 for(const c of children){assert.equal(await status(c.port),426);assert(alive(c.pid));c.anchor=Number(execFileSync('ps',['-p',String(c.pid),'-o','pgid='],{encoding:'utf8'}).trim());}
 if(turn===1){
  const ended=await gql('mutation($id:String!){terminateAgentRun(agentRunId:$id){success message}}',{id:run.createAgentRun.runId});assert(ended.terminateAgentRun.success);
  for(const c of children){assert(alive(c.pid),'ordinary agent stop must preserve native preview');assert.equal(await status(c.port),426);}
  note('ended-agent-preview-preserved',children);
 }
 note('pre-shutdown',{turn,children,calls});await page.screenshot({path:join(evidence,`API-06-before-${turn}.png`)});
 const started=Date.now();
 if(turn===1){await page.evaluate(()=>window.electronAPI.restartServer());await wait(async()=>{const s=await page.evaluate(()=>window.electronAPI.getServerStatus());return s.status==='running'},'healthy restarted server',30000);}
 else {await page.evaluate(()=>window.electronAPI.startShutdown());await wait(()=>!alive(inst.pid),'desktop exit',33000);}
 await delay(300);
 const observations=await Promise.all(children.map(async c=>({...c,absent:!alive(c.pid),anchorAbsent:!alive(c.anchor),listenerStatus:await status(c.port),termObserved:await fs.readFile(c.receipt+'.term','utf8').then(()=>true,()=>false)})));
 note('post-shutdown',{turn,trigger:turn===1?'restart-after-agent-ended':'quit-active-run',elapsedMs:Date.now()-started,observations,sentinelStatus:await status(sentinel.address().port),data:await fs.readFile(join(data,'API-sentinel.txt'),'utf8')});
 for(const c of observations){assert(c.absent,'native listener survived');assert(c.anchorAbsent,'native anchor survived');assert.equal(c.listenerStatus,null);}
 assert(observations[0].termObserved,'TERM-resistant fixture did not observe graceful attempt');assert.equal(await status(sentinel.address().port),200);
 socket.terminate();
 }
 record.result='Pass';
}catch(e){record.result='Fail';record.error=String(e.stack??e);console.error(e);process.exitCode=1;}
finally{
 socket?.terminate();await browser?.close().catch(()=>{});
 if(inst){try{record.cleanup=await cli(['stop',inst.instanceId,'--keep']);}catch(e){record.cleanupError=String(e)}
 try{await fs.copyFile(inst.logPath,join(evidence,'API-06-application.log'))}catch{}}
 for(const c of allChildren){
 if(alive(c.pid)){const command=execFileSync('ps',['-p',String(c.pid),'-o','command='],{encoding:'utf8'});assert(command.includes(c.receipt),'cleanup refuses unknown identity');process.kill(c.pid,'SIGKILL');await wait(()=>!alive(c.pid),'fixture cleanup');note('fixture cleanup fallback',{pid:c.pid});}
 }
 model.closeAllConnections();sentinel.closeAllConnections();await Promise.all([new Promise(r=>model.close(r)),new Promise(r=>sentinel.close(r))]);
 record.listenersAbsentAfterCleanup=allChildren.every(c=>!alive(c.pid));
 await fs.rm(own,{recursive:true,force:true,maxRetries:10,retryDelay:100});record.privateRootRemoved=true;
 await fs.writeFile(join(evidence,'API-06-result.json'),JSON.stringify(record,null,2));
}
