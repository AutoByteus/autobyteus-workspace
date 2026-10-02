import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';
import { WorkingContextSnapshotStore } from '../../../../../autobyteus-ts/dist/memory/store/working-context-snapshot-store.js';
import { WorkingContextSnapshotSerializer } from '../../../../../autobyteus-ts/dist/memory/working-context-snapshot-serializer.js';
import { WorkingContextFinalizer, createCompactedMemoryUserMessage } from '../../../../../autobyteus-ts/dist/memory/working-context-finalizer.js';
const here=path.dirname(fileURLToPath(import.meta.url));
const payload = text => WorkingContextSnapshotSerializer.serialize(new WorkingContextFinalizer().finalize({messages:[createCompactedMemoryUserMessage(text)]}),{agent_id:'owned-crash-probe'});
if(process.argv[2]==='child') {
 const [mode,dir]=process.argv.slice(3); const original=fs.renameSync;
 fs.renameSync=(from,to)=>{
  if(mode==='after')original(from,to);
  fs.writeSync(1,'CHECKPOINT\n');
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0);
  if(mode==='before')original(from,to);
 };
 new WorkingContextSnapshotStore(dir,'owned-crash-probe').write('owned-crash-probe',payload('new accepted checkpoint'));
} else {
 const ledger=path.resolve(here,'../../api-e2e-test-case-ledger.md');fs.appendFileSync(ledger,`| API-C10 | ${new Date().toISOString()} | Started | owned process SIGKILL around snapshot rename | process-snapshot-probe.mjs |\n`);
 const results=[];
 for(const mode of ['before','after']) {
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'api-rev-002-snapshot-'));
  let child;
  try {
   const store=new WorkingContextSnapshotStore(dir,'owned-crash-probe');const old=payload('previous valid checkpoint');const next=payload('new accepted checkpoint');store.write('owned-crash-probe',old);
   child=spawn(process.execPath,[fileURLToPath(import.meta.url),'child',mode,dir],{stdio:['ignore','pipe','pipe']});
   const closed=new Promise(resolve=>child.once('close',(code,signal)=>resolve({code,signal})));
   await new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(Error('checkpoint timeout')),10000);let out='';child.stdout.on('data',c=>{out+=c;if(out.includes('CHECKPOINT')){clearTimeout(timeout);resolve();}});child.once('error',reject);});
   child.kill('SIGKILL');const exit=await closed;assert.equal(exit.signal,'SIGKILL');
   const observed=store.read('owned-crash-probe');assert.equal(WorkingContextSnapshotSerializer.validate(observed),true);assert.deepEqual(observed,mode==='before'?old:next);
   results.push({mode,exit,strictV5:true,observed:mode==='before'?'old':'new'});
  } finally {if(child?.exitCode===null&&child?.signalCode===null)child.kill('SIGKILL');fs.rmSync(dir,{recursive:true,force:true});}
 }
 fs.writeFileSync(path.join(here,'API-C10.json'),JSON.stringify({result:'Pass',results,limit:'actual snapshot store primitive only; not power loss/fsync or entire archive transaction'},null,2));
 fs.appendFileSync(ledger,`| API-C10 | ${new Date().toISOString()} | Pass | SIGKILL before rename retains old strict-v5; after rename exposes new strict-v5; owned directories removed | api-e2e-evidence/api-rev-002/API-C10.json |\n`);console.log(JSON.stringify(results));
}
