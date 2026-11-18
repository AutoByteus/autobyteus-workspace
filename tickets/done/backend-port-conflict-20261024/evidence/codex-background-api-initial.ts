/** Actual Codex conversation/tool path; deterministic local model fixture, no paid provider. */
import { test, expect } from 'vitest';
import { createServer } from 'node:http';
import { mkdtemp, realpath, writeFile, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { CodexAppServerClient } from '../../../../autobyteus-server-ts/src/runtime-management/codex/client/codex-app-server-client';
const quote=(s:string)=>"'"+s.replaceAll("'","'\\''")+"'";
for(const mode of ['yielded-clean','shell-background','natural-completion'] as const){
 test(`P-010 Codex conversation exec_command ${mode}`,async()=>{
  const dir=await realpath(await mkdtemp(join(tmpdir(),'ab-codex-turn-')));
  const receipt=join(dir,'listener.json');let child:any;let client:CodexAppServerClient|undefined;
  let calls=0;const notices:any[]=[];const toolsSeen:string[]=[];
  const listenerCode=`const fs=require('fs'),http=require('http'); const s=http.createServer((q,r)=>{r.writeHead(426);r.end('owned fixture')});s.listen(0,'::',()=>fs.writeFileSync(${JSON.stringify(receipt)},JSON.stringify({pid:process.pid,port:s.address().port})));${mode==='natural-completion'?'setTimeout(()=>s.close(()=>process.exit(0)),2500);':''}`;
  const command=`${quote(process.execPath)} -e ${quote(listenerCode)}`+(mode==='shell-background'?` > ${quote(join(dir,'command.log'))} 2>&1 & while [ ! -s ${quote(receipt)} ]; do sleep 0.01; done; sleep 0.1`:'');
  const model=createServer(async(req,res)=>{
   const chunks:Buffer[]=[];for await(const c of req)chunks.push(c as Buffer);
   const raw=Buffer.concat(chunks).toString();
   if(req.method!=='POST'){res.writeHead(200,{'Content-Type':'application/json'});res.end('{"data":[]}');return;}
   let input:any={};try{input=JSON.parse(raw)}catch{}
   toolsSeen.push(...(input.tools??[]).map((t:any)=>t.name??t.type));
   const id=`resp-${++calls}`;
   const events:any[]=[{type:'response.created',response:{id}}];
   if(calls===1)events.push({type:'response.output_item.done',item:{type:'function_call',call_id:'owned-exec',name:'exec_command',arguments:JSON.stringify({cmd:command,workdir:dir,yield_time_ms:1000,max_output_tokens:1000,login:false})}});
   else events.push({type:'response.output_item.done',item:{type:'message',id:'done-msg',role:'assistant',content:[{type:'output_text',text:'fixture command submitted'}]}});
   events.push({type:'response.completed',response:{id,usage:{input_tokens:0,output_tokens:0,total_tokens:0}}});
   res.writeHead(200,{'Content-Type':'text/event-stream'});res.end(events.map(e=>`data: ${JSON.stringify(e)}\n\n`).join(''));
  });
  await new Promise<void>(r=>model.listen(0,'127.0.0.1',r));const modelPort=(model.address() as any).port;
  try{
   await writeFile(join(dir,'config.toml'),`model = "gpt-5.4"\nmodel_provider = "fixture"\ncheck_for_update_on_startup = false\n[model_providers.fixture]\nname = "local fixture"\nbase_url = "http://127.0.0.1:${modelPort}/v1"\nwire_api = "responses"\nrequires_openai_auth = false\nsupports_websockets = false\n[features]\nunified_exec = true\n`);
   client=new CodexAppServerClient({command:'/Users/normy/.local/bin/codex',args:['app-server'],cwd:dir,env:{PATH:process.env.PATH,HOME:dir,CODEX_HOME:dir,TMPDIR:dir}});
   client.onNotification(m=>notices.push(m));
   await client.start();await client.request('initialize',{clientInfo:{name:'owned-command-probe',version:'1'},capabilities:{experimentalApi:true}});client.notify('initialized',{});
   const started:any=await client.request('thread/start',{cwd:dir,model:'gpt-5.4',modelProvider:'fixture',sandbox:'danger-full-access',approvalPolicy:'never',ephemeral:true});
   await client.request('turn/start',{threadId:started.thread.id,input:[{type:'text',text:'Run the local owned fixture command.',text_elements:[]}]});
   for(let i=0;i<300&&!notices.some(n=>n.method==='turn/completed');i++)await delay(50);
   for(let i=0;i<40;i++){try{child=JSON.parse(await readFile(receipt,'utf8'));break}catch{await delay(25)}}
   console.log(JSON.stringify({check:'P-010-preclose',mode,calls,child,toolsSeen:[...new Set(toolsSeen)],events:notices.filter(n=>['turn/completed','error'].includes(n.method)||n.params?.item?.type==='commandExecution')}));
   expect(child).toBeTruthy();expect(notices.some(n=>n.method==='turn/completed')).toBe(true);
   let ancestry='exited before inspection';try{ancestry=execFileSync('ps',['-p',String(child.pid),'-o','pid=,ppid=,pgid=,lstart='],{encoding:'utf8'}).trim()}catch{}
   const before=await fetch(`http://127.0.0.1:${child.port}`,{signal:AbortSignal.timeout(1000)}).then(r=>r.status,()=>null);
   const listed:any=await client.request('thread/backgroundTerminals/list',{threadId:started.thread.id});
   let cleanupReply:any;
   if(mode==='yielded-clean') {
    expect(listed.data.length).toBeGreaterThan(0);
    cleanupReply=await client.request('thread/backgroundTerminals/clean',{threadId:started.thread.id});
   }
   if(mode==='natural-completion')await delay(2400);else await delay(250);
   const listedAfter:any=await client.request('thread/backgroundTerminals/list',{threadId:started.thread.id});
   const afterApi=await fetch(`http://127.0.0.1:${child.port}`,{signal:AbortSignal.timeout(1000)}).then(r=>r.status,()=>null);
   console.log(JSON.stringify({check:'P-010-api',mode,listed,cleanupReply,listedAfter,httpAfterApiOrNatural:afterApi,commandEvents:notices.filter(n=>n.params?.item?.type==='commandExecution'||n.method.includes('terminalInteraction'))}));
   if(mode!=='shell-background'){expect(listedAfter.data).toHaveLength(0);expect(afterApi).toBe(null);}
   await client.close();await delay(300);
   const after=await fetch(`http://127.0.0.1:${child.port}`,{signal:AbortSignal.timeout(1000)}).then(r=>r.status,()=>null);
   console.log(JSON.stringify({check:'P-010',mode,codex:'0.164.0',child,ancestry,httpBeforeClose:before,httpAfterClose:after,model:'deterministic localhost SSE fixture; actual Codex conversation exec_command'}));
  }finally{
   await client?.close().catch(()=>{});
   if(!child){try{child=JSON.parse(await readFile(receipt,'utf8'))}catch{}}
   if(child){try{process.kill(child.pid,'SIGTERM')}catch{};await delay(100);try{process.kill(child.pid,'SIGKILL')}catch{}}
   model.closeAllConnections();await new Promise<void>(r=>model.close(()=>r()));await rm(dir,{recursive:true,force:true});
   console.log(JSON.stringify({check:'P-010-cleanup',mode,pid:child?.pid,privateRootRemoved:true}));
  }
 },25000);
}
