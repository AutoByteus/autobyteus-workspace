// API-owned passive resource wrapper ONLY. The retained controller and durable probe are unmodified.
// Run inside the PRIVATE mount namespace; Electron is dropped to the dedicated UID by setpriv.
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
const [own, out, uid, session] = process.argv.slice(2);
const samples = [];
const sample = () => {
  const s = fs.statfsSync('/dev/shm');
  samples.push({ at: Date.now(), capacity: s.blocks*s.bsize, free: s.bavail*s.bsize, used: (s.blocks-s.bfree)*s.bsize });
};
sample(); const timer = setInterval(sample, 20);
const log = fs.createWriteStream(path.join(out,'session.log'),{flags:'wx'});
const args = ['--reuid='+uid,'--regid='+uid,'--clear-groups','env','-i',
  'PATH='+own+'/bin:/usr/bin:/bin','HOME='+own+'/home','TMPDIR='+own+'/tmp',
  'XDG_RUNTIME_DIR='+own+'/runtime','LANG=C.UTF-8','SHELL=/bin/bash',
  'xvfb-run','-a','-e',path.join(out,'xvfb.log'),'-s','-screen 0 1600x1100x24 -nolisten tcp',
  'node',session,out];
const child = spawn('setpriv',args,{cwd:process.cwd(),stdio:['ignore','pipe','pipe']});
child.stdout.pipe(log,{end:false}); child.stderr.pipe(log,{end:false});
const code = await new Promise((resolve,reject)=>{child.once('error',reject);child.once('close',resolve)});
clearInterval(timer); sample(); log.end();
await fsp.writeFile(path.join(out,'shm-samples.json'),JSON.stringify(samples));
await fsp.writeFile(path.join(out,'resource-receipt.json'),JSON.stringify({uid:Number(uid),session,childPid:child.pid,exitCode:code,
  capacity:samples[0].capacity,peakUsed:Math.max(...samples.map(s=>s.used)),minimumFree:Math.min(...samples.map(s=>s.free)),samples:samples.length},null,2));
process.exitCode=code;
