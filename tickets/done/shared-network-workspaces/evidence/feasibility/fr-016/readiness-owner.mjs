/** Designer-owned bounded readiness capability, NOT production admission.
 * Mount metadata is local; RPC NULL is a transport/liveness check, not auth or storage identity.
 * File IO is child-owned; a timed-out child retains its slot until actual exit.
 */
import fs from 'node:fs';
import net from 'node:net';
import {spawn} from 'node:child_process';
import {createInterface} from 'node:readline';
import path from 'node:path';
const cfg=JSON.parse(process.argv[2]);
let owner=null,starts=0,alive=0,maxAlive=0,heartbeats=0;
const report=x=>process.stdout.write(JSON.stringify(x)+'\n');
fs.writeFileSync('/tmp/owned-local-heartbeat','0');
const beat=setInterval(()=>{heartbeats++;fs.writeFileSync('/tmp/owned-local-heartbeat',String(heartbeats));},100);
const delay=n=>new Promise(r=>setTimeout(r,n));
async function rpcNull() {
  return await new Promise(resolve=>{
    const xid=Math.floor(Math.random()*0xffffffff);
    const words=[xid,0,2,100003,4,0,0,0,0,0];
    const bytes=Buffer.alloc(44);bytes.writeUInt32BE(0x80000028,0);
    words.forEach((value,i)=>bytes.writeUInt32BE(value,4+i*4));
    let received=Buffer.alloc(0),done=false;
    const socket=net.createConnection({host:cfg.server,port:2049});
    const finish=value=>{if(done)return;done=true;clearTimeout(timer);socket.destroy();resolve(value);};
    const timer=setTimeout(()=>finish({ok:false,code:'RPC_TIMEOUT'}),600);
    socket.on('connect',()=>socket.write(bytes));
    socket.on('error',e=>finish({ok:false,code:e.code}));
    socket.on('data',data=>{
      received=Buffer.concat([received,data]);
      if(received.length<4)return;
      const length=received.readUInt32BE(0)&0x7fffffff;
      if(length>4096)return finish({ok:false,code:'RPC_OVERSIZE'});
      if(received.length<4+length)return;
      const body=received.subarray(4,4+length);
      const accepted=body.length===24&&body.readUInt32BE(0)===xid&&body.readUInt32BE(4)===1&&body.readUInt32BE(8)===0&&body.readUInt32BE(16)===0&&body.readUInt32BE(20)===0;
      finish({ok:accepted,code:accepted?'RPC_NULL_SUCCESS':'RPC_REPLY_REJECTED',replyBytes:body.length});
    });
  });
}
function topology(config) {
  const rows=fs.readFileSync('/proc/self/mountinfo','utf8').split('\n');
  const row=rows.find(line=>line.split(' ')[4]===config.mount);
  if(!row)return {status:'MISSING_MOUNT'};
  const [before,after]=row.split(' - '),fields=after?.split(' ')??[];
  if(fields[0]!=='nfs4'&&fields[0]!=='nfs')return {status:'WRONG_FILESYSTEM',observedType:fields[0]};
  if(fields[1]!==config.expectedSource)return {status:'WRONG_MOUNT_SOURCE',observedSource:fields[1]};
  return null;
}
async function check(config,prechecked=false) {
  const start=performance.now();
  const wrap=value=>({...value,seconds:(performance.now()-start)/1000,starts,alive,maxAlive,heartbeats});
  const bad=topology(config);if(bad)return wrap(bad);
  if(owner)return wrap({status:'INDETERMINATE',code:'PREVIOUS_CHILD_NOT_EXITED'});
  if(!prechecked){const rpc=await rpcNull();if(!rpc.ok)return wrap({status:'UNAVAILABLE',rpc});}
  let stdout='',timer;
  let settle;
  const answer=new Promise(resolve=>{settle=resolve;});
  const child=spawn(process.execPath,[path.join(path.dirname(new URL(import.meta.url).pathname),'mount-probe.mjs'),JSON.stringify(config)],{stdio:['ignore','pipe','pipe']});
  starts++;alive++;maxAlive=Math.max(maxAlive,alive);owner=child;
  let closed=false,finished=false;
  const finish=value=>{if(finished)return;finished=true;clearTimeout(timer);settle(wrap(value));};
  child.stdout.on('data',data=>{stdout+=data;if(stdout.length>65536){child.kill('SIGKILL');finish({status:'INDETERMINATE',code:'CHILD_OUTPUT_LIMIT'});}});
  child.on('error',error=>finish({status:'INDETERMINATE',code:'CHILD_SPAWN_ERROR',message:String(error)}));
  child.on('close',(code,signal)=>{
    closed=true;alive--;if(owner===child)owner=null;
    if(!finished){try{finish({...JSON.parse(stdout.trim()),childExit:code,signal});}catch{finish({status:'INDETERMINATE',code:'CHILD_NO_RECEIPT',childExit:code,signal});}}
  });
  timer=setTimeout(()=>{
    child.kill('SIGTERM');
    setTimeout(()=>{if(!closed)child.kill('SIGKILL');},250);
    finish({status:'INDETERMINATE',code:'FILESYSTEM_PROBE_DEADLINE',exactChildPid:child.pid,exitConfirmed:false});
  },1500);
  return await answer;
}
const reader=createInterface({input:process.stdin});
report({event:'READY',uid:process.getuid(),configuration:cfg});
try {
  for await(const line of reader){
    const command=JSON.parse(line);
    if(command.action==='close')break;
    if(command.action==='rpc')report({event:'RPC',result:await rpcNull()});
    if(command.action==='check')report({event:'CHECK',result:await check({...cfg,...command.override},Boolean(command.prechecked))});
    if(command.action==='state')report({event:'STATE',starts,alive,maxAlive,heartbeats,localHeartbeat:fs.readFileSync('/tmp/owned-local-heartbeat','utf8')});
  }
} finally {
  if(owner){const child=owner;child.kill('SIGKILL');for(let i=0;owner&&i<50;i++)await delay(100);if(owner)throw new Error('Exact child exit not confirmed; retain resources for recovery');}
  clearInterval(beat);reader.close();
}
