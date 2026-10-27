/** P-007 candidate mechanism feasibility, NOT production implementation/acceptance. */
import { test, expect } from 'vitest';
import { spawn, execFile, type ChildProcess } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import { NonInteractiveShellResolver } from '../../../../autobyteus-ts/src/tools/terminal/command-execution/non-interactive-shell-resolver';
const exec = promisify(execFile);
const delay = (ms: number) => new Promise(r => setTimeout(r, ms));
const live = async (pid: number) => {
  try { const {stdout} = await exec('ps', ['-p', String(pid), '-o', 'stat='], {timeout:500}); return !!stdout.trim() && !stdout.includes('Z'); }
  catch (e: any) { if (e.code === 1) return false; throw e; }
};
const group = async (pid: number) => (await exec('ps', ['-p',String(pid),'-o','pgid='],{timeout:500})).stdout.trim();
const waitFor = async (predicate: () => boolean) => { for (let i=0;i<150&&!predicate();i++) await delay(10); expect(predicate()).toBe(true); };
const nodeAnchor = `
const {spawn} = require('node:child_process');
let launched=false;
process.on('SIGTERM',()=>{});
process.on('message',message=>{
  if (message.kind==='start'&&!launched) {
    launched=true;
    const command=spawn(message.executable,message.args,{cwd:message.cwd,env:process.env,detached:false,stdio:['ignore','inherit','inherit']});
    command.on('spawn',()=>process.send({kind:'started',pid:command.pid}));
    command.on('exit',(code,signal)=>process.send({kind:'result',code,signal}));
  } else if(message.kind==='release') process.exit(0);
});
process.on('disconnect',()=>process.exit(1));
process.send({kind:'ready',pid:process.pid});
`;
// Exercises the WSL candidate's bash anchor locally under POSIX detached creation.
// It does NOT execute WSL or prove Linux setsid/WSL pipe behavior.
const bashAnchor = `
nonce=$1; shift
trap ':' TERM
printf '%s:READY:%s\\n' "$nonce" "$$" >&2
IFS= read -r control || exit 1
[ "$control" = "$nonce:START" ] || exit 1
"$@" </dev/null &
command_pid=$!
printf '%s:STARTED:%s\\n' "$nonce" "$command_pid" >&2
while :; do
  wait "$command_pid"
  code=$?
  if kill -0 "$command_pid" 2>/dev/null; then continue; fi
  break
done
printf '%s:RESULT:%s\\n' "$nonce" "$code" >&2
while :; do
  if IFS= read -r control; then
    [ "$control" = "$nonce:RELEASE" ] && exit 0
  else
    code=$?
    [ "$code" -gt 128 ] && continue
    exit 1
  fi
done
`;

for (const mode of ['node-posix','bash-local-model'] as const) {
 test(`P-007 ${mode}: anchor overlaps quick shell return and retained survivor`, async()=>{
  const root=await mkdtemp(join(tmpdir(),'ab-anchor-candidate-'));
  const env={PATH:process.env.PATH,HOME:root,TMPDIR:root};
  const resolver=new NonInteractiveShellResolver({env});
  const receipts:any[]=[];
  const spawned:ChildProcess[]=[];
  try {
   for(let i=0;i<5;i++) {
    const invocation=resolver.resolve('/bin/sleep 60 & printf "%s" "$!"',root);
    const nonce=randomBytes(16).toString('hex');
    const child=mode==='node-posix'
      ?spawn(process.execPath,['-e',nodeAnchor],{env,cwd:root,detached:true,stdio:['pipe','pipe','pipe','ipc']})
      :spawn('/bin/bash',['--noprofile','--norc','-c',bashAnchor,'anchor',nonce,invocation.executable,...invocation.args],{env,cwd:root,detached:true,stdio:['pipe','pipe','pipe']});
    spawned.push(child);
    let ready=false,result=false,started=0,stdout='',stderr='';
    child.stdout!.on('data',b=>{stdout+=b});
    child.stderr!.on('data',b=>{stderr+=b; if(stderr.includes(`${nonce}:READY:`))ready=true; if(stderr.includes(`${nonce}:RESULT:0`))result=true; const m=stderr.match(new RegExp(nonce+':STARTED:(\\d+)'));if(m)started=Number(m[1]);});
    child.on('message',(m:any)=>{if(m.kind==='ready')ready=true;if(m.kind==='started')started=m.pid;if(m.kind==='result'){expect(m.code).toBe(0); result=true;}});
    await waitFor(()=>ready);
    expect(await group(child.pid!)).toBe(String(child.pid)); // anchor is an exclusive new group leader
    const before=(await exec('ps',['-p',String(child.pid),'-o','pid=,pgid=,lstart='],{timeout:500})).stdout.trim();
    if(mode==='node-posix') child.send!({kind:'start',executable:invocation.executable,args:invocation.args,cwd:root});
    else child.stdin!.write(nonce+':START\n');
    await waitFor(()=>result&&/^\d+$/.test(stdout));
    const survivor=Number(stdout);
    expect(await live(started)).toBe(false);
    expect(await live(survivor)).toBe(true);
    expect(await group(survivor)).toBe(String(child.pid));
    expect((await exec('ps',['-p',String(child.pid),'-o','pid=,pgid=,lstart='],{timeout:500})).stdout.trim()).toBe(before);
    process.kill(-child.pid!,'SIGTERM');
    for(let j=0;j<50&&await live(survivor);j++)await delay(10);
    expect(await live(survivor)).toBe(false);
    expect(await live(child.pid!)).toBe(true); // TERM cannot drop the anchor before verification
    const exited=new Promise<number|null>(resolve=>child.once('exit',code=>resolve(code)));
    if(mode==='node-posix')child.send!({kind:'release'});else child.stdin!.write(nonce+':RELEASE\n');
    expect(await exited).toBe(0);
    receipts.push({anchor:child.pid,command:started,survivor,resultBeforeAnchorExit:true,anchorSurvivedTerm:true});
   }
   console.log(JSON.stringify({check:'P-007',mode,receipts}));
  } finally {
   for(const p of spawned){if(p.exitCode===null&&p.signalCode===null){try{process.kill(-p.pid!,'SIGKILL')}catch{}} p.stdout?.destroy();p.stderr?.destroy();p.stdin?.destroy();}
   await rm(root,{recursive:true,force:true});
  }
 },15000);
}
for (const mode of ['node-posix','bash-local-model'] as const) {
 test(`P-008 ${mode}: anchor remains while TERM-resistant foreground command needs force`,async()=>{
  const root=await mkdtemp(join(tmpdir(),'ab-anchor-force-'));
  const env={PATH:process.env.PATH,HOME:root,TMPDIR:root};
  const quote=(s:string)=>"'"+s.replaceAll("'","'\\''")+"'";
  const invocation=new NonInteractiveShellResolver({env}).resolve(`exec ${quote(process.execPath)} -e ${quote('process.on("SIGTERM",()=>{}); console.log("CHILD_READY"); setInterval(()=>{},1000)')}`,root);
  const nonce=randomBytes(16).toString('hex');
  const child=mode==='node-posix'
    ?spawn(process.execPath,['-e',nodeAnchor],{env,cwd:root,detached:true,stdio:['pipe','pipe','pipe','ipc']})
    :spawn('/bin/bash',['--noprofile','--norc','-c',bashAnchor,'anchor',nonce,invocation.executable,...invocation.args],{env,cwd:root,detached:true,stdio:['pipe','pipe','pipe']});
  let ready=false,result=false,started=0,stdout='',stderr='';
  child.stdout!.on('data',b=>stdout+=b);
  child.stderr!.on('data',b=>{stderr+=b;if(stderr.includes(`${nonce}:READY:`))ready=true;if(stderr.includes(`${nonce}:RESULT:`))result=true;const m=stderr.match(new RegExp(nonce+':STARTED:(\\d+)'));if(m)started=Number(m[1]);});
  child.on('message',(m:any)=>{if(m.kind==='ready')ready=true;if(m.kind==='started')started=m.pid;if(m.kind==='result')result=true;});
  try {
    await waitFor(()=>ready);
    expect(await group(child.pid!)).toBe(String(child.pid));
    if(mode==='node-posix')child.send!({kind:'start',executable:invocation.executable,args:invocation.args,cwd:root});else child.stdin!.write(nonce+':START\n');
    await waitFor(()=>started>0&&stdout.includes('CHILD_READY'));
    process.kill(-child.pid!,'SIGTERM'); await delay(100);
    expect(await live(child.pid!)).toBe(true);expect(await live(started)).toBe(true);expect(result).toBe(false);
    process.kill(-child.pid!,'SIGKILL');
    for(let i=0;i<50&&(await live(started)||await live(child.pid!));i++)await delay(10);
    expect(await live(started)).toBe(false);expect(await live(child.pid!)).toBe(false);
    console.log(JSON.stringify({check:'P-008',mode,anchor:child.pid,command:started,noFalseResultOnTerm:!result,forceRemovedBoth:true}));
  } finally {
    if(await live(child.pid!)){try{process.kill(-child.pid!,'SIGKILL')}catch{}}
    child.stdout?.destroy();child.stderr?.destroy();child.stdin?.destroy();
    await rm(root,{recursive:true,force:true});
  }
 },10000);
}
