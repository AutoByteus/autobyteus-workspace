import {test,expect} from 'vitest';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {setTimeout as sleep} from 'node:timers/promises';
import {BackgroundProcessManager} from '../../../../autobyteus-ts/src/tools/terminal/background-process-manager';
import {NonInteractiveShellResolver} from '../../../../autobyteus-ts/src/tools/terminal/command-execution/non-interactive-shell-resolver';
test('group leader exit currently hides a TERM-resistant owned listener from stopAll',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'ab-group-stop-')),receipt=join(dir,'child.json');
 const manager=new BackgroundProcessManager(undefined,new NonInteractiveShellResolver({env:{PATH:process.env.PATH,HOME:dir}}));
 const code=`const fs=require('fs'),http=require('http');process.on('SIGTERM',()=>{});const s=http.createServer((q,r)=>r.end('owned'));s.listen(0,'127.0.0.1',()=>fs.writeFileSync(${JSON.stringify(receipt)},JSON.stringify({pid:process.pid,port:s.address().port})));`;
 const quote=(s:string)=>"'"+s.replaceAll("'","'\\''")+"'";
 let child:any,info:any;
 try{
  info=await manager.startCommand(`trap 'exit 0' TERM; ${quote(process.execPath)} -e ${quote(code)} & wait`,dir);
  for(let i=0;i<100;i++){try{child=JSON.parse(await readFile(receipt,'utf8'));break}catch{await sleep(30)}}
  expect(child).toBeTruthy();
  const count=await manager.stopAll();
  expect(count).toBe(1);expect(()=>process.kill(info.pid,0)).toThrow();
  expect((await fetch(`http://127.0.0.1:${child.port}`)).status).toBe(200);
  console.log(JSON.stringify({case:'leader-exit',leader:info.pid,child,stopAllReported:count,listenerSurvived:true}));
 }finally{
  if(child){try{process.kill(child.pid,'SIGKILL')}catch{}}await manager.stopAll();
  await rm(dir,{recursive:true,force:true});console.log(JSON.stringify({case:'leader-exit',cleanup:'exact owned child killed; shell exited; private root removed'}));
 }
},10000);
