// Actual installed Codex dependency; no model, credentials, user home or app used.
import { test, expect } from 'vitest';
import { mkdtemp, readFile, rm, realpath } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { CodexAppServerClient } from '../../../../autobyteus-server-ts/src/runtime-management/codex/client/codex-app-server-client';
test('actual Codex command child lifetime after production client close',async()=> {
 const dir=await realpath(await mkdtemp(join(tmpdir(),'ab-codex-stop-'))), receipt=join(dir,'listener.json');
 const client=new CodexAppServerClient({command:'/Users/normy/.local/bin/codex',args:['app-server'],cwd:dir,env:{PATH:process.env.PATH,HOME:dir,CODEX_HOME:dir,TMPDIR:dir}});
 let child:any,command:any; let closeError:string|undefined;
 try {
  await client.start();
  await client.request('initialize',{clientInfo:{name:'shutdown-investigation',version:'1'},capabilities:{experimentalApi:true}});
  client.notify('initialized',{});
  const code=`const fs=require('fs'),http=require('http');const s=http.createServer((q,r)=>{r.writeHead(426);r.end('owned probe');});s.listen(0,'::',()=>fs.writeFileSync(${JSON.stringify(receipt)},JSON.stringify({pid:process.pid,port:s.address().port})));`;
  command=client.request('command/exec',{command:[process.execPath,'-e',code],cwd:dir,timeoutMs:20000,sandboxPolicy:{type:'dangerFullAccess'}}).catch(e=>({error:String(e)}));
  for(let i=0;i<150;i++){try{child=JSON.parse(await readFile(receipt,'utf8'));break}catch{await sleep(40)}}
  expect(child).toBeTruthy();
  const ancestryBefore=execFileSync('ps',['-p',String(child.pid),'-o','pid=,ppid=,pgid=,command='],{encoding:'utf8'}).trim();
  expect((await fetch(`http://127.0.0.1:${child.port}`)).status).toBe(426);
  try {await client.close()} catch(e){closeError=String(e)}
  await sleep(250);
  const alive=await fetch(`http://127.0.0.1:${child.port}`,{signal:AbortSignal.timeout(1000)}).then(r=>r.status,()=>null);
  console.log(JSON.stringify({case:'codex-command-close',version:'0.164.0',child,ancestryBefore,closeError,afterCloseHttpStatus:alive,limitation:'standalone command/exec; not model-driven exec_command or historical Nuxt'}));
 } finally {
  if(child){try{process.kill(child.pid,'SIGTERM')}catch{};await sleep(150);try{process.kill(child.pid,'SIGKILL')}catch{}}
  await client.close().catch(()=>{});if(command)await command;
  await rm(dir,{recursive:true,force:true});
  console.log(JSON.stringify({case:'codex-command-close',cleanup:'owned child and client stopped; private home removed'}));
 }
},15000);
