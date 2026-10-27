import {test,expect} from 'vitest';
import {spawn,execFileSync} from 'node:child_process';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {setTimeout as sleep} from 'node:timers/promises';
import {once} from 'node:events';
import {build} from '../../../../node_modules/.pnpm/esbuild@0.27.3/node_modules/esbuild/lib/main.js';
test('SIGTERM plus complete native shutdown reports success yet detached listener survives',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'ab-native-signal-')),receipt=join(dir,'listener.json'),bundle=join(dir,'probe.cjs');
 await build({entryPoints:['tickets/in-progress/backend-port-conflict-20261024/evidence/native-signal-child.ts'],outfile:bundle,bundle:true,platform:'node',format:'cjs',packages:'external'});
 const proc=spawn(process.execPath,[bundle,dir,receipt],{env:{PATH:process.env.PATH,HOME:dir,TMPDIR:dir},stdio:['ignore','pipe','pipe']});let logs='',child:any;proc.stdout.on('data',d=>logs+=d);proc.stderr.on('data',d=>logs+=d);
 try{
  for(let i=0;i<100;i++){try{child=JSON.parse(await readFile(receipt,'utf8'));break}catch{await sleep(30)}}
  expect(child,logs).toBeTruthy();
  const exited=once(proc,'exit');proc.kill('SIGTERM');const exit=await exited;
  expect(exit[0],logs).toBe(0);
  expect((await fetch(`http://127.0.0.1:${child.port}`)).status).toBe(426);
  const ancestryAfter=execFileSync('ps',['-p',String(child.pid),'-o','pid=,ppid=,pgid='],{encoding:'utf8'}).trim();
  console.log(JSON.stringify({case:'native-sigterm',parentPid:proc.pid,child,exit,ancestryAfter,logs,listenerSurvived:true,limitation:'real native shutdown orchestrator in signal harness, not full Studio/Electron'}));
 }finally{
  if(child){try{process.kill(child.pid,'SIGTERM')}catch{};await sleep(100);try{process.kill(child.pid,'SIGKILL')}catch{}}
  if(proc.exitCode===null&&proc.signalCode===null){proc.kill('SIGKILL');await once(proc,'exit')}
  await rm(dir,{recursive:true,force:true});console.log(JSON.stringify({case:'native-sigterm',cleanup:'exact owned child gone; parent exited; temp root removed'}));
 }
},10000);
