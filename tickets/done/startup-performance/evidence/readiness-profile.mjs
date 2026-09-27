import fs from 'node:fs';
import fsp from 'node:fs/promises';
import { syncBuiltinESMExports } from 'node:module';
import { performance } from 'node:perf_hooks';
import { pathToFileURL } from 'node:url';
// Keep only the probe report sink; imported runtime writes remain denied.
const reportWrite = fs.writeSync.bind(fs);
const root='/Applications/AutoByteus.app/Contents/Resources/server/dist';
const memory='/Users/normy/.autobyteus/server-data/memory';
let phase='imports';
const stats={}, durations={}, blocked=[];
const metric=()=>stats[phase]??=( {ops:{},readBytes:0,readFiles:0,jsonParses:0,jsonCharacters:0,jsonParseMs:0});
const deny=(name)=>function(){blocked.push(name);throw new Error('Read-only probe blocked '+name);};
for(const name of ['appendFile','writeFile','write','writev','mkdir','mkdtemp','copyFile','cp','rename','rm','rmdir','unlink','truncate','ftruncate','chmod','fchmod','chown','lchown','fchown','utimes','futimes','lutimes','link','symlink','createWriteStream']){
 if(typeof fs[name]==='function')fs[name]=deny(name);
 if(typeof fs[name+'Sync']==='function')fs[name+'Sync']=deny(name+'Sync');
 if(typeof fsp[name]==='function')fsp[name]=deny('promises.'+name);
}
const safeFlag=(flag)=>flag==='r'||flag==='rs'||flag===0;
for(const [obj,name] of [[fs,'open'],[fs,'openSync'],[fsp,'open']]){
 const orig=obj[name];obj[name]=function(file,flags,...rest){if(!safeFlag(flags))return deny(name+':write-capable')();return orig.call(this,file,flags,...rest);};
}
for(const name of ['readFile','readdir','realpath','lstat','stat','access']){
 const orig=fsp[name];fsp[name]=async function(...args){
  const m=metric();const v=m.ops[name]??={calls:0,ms:0,errors:0};v.calls++;const start=performance.now();
  try{const result=await orig.apply(this,args);if(name==='readFile'){m.readFiles++;m.readBytes+=typeof result==='string'?Buffer.byteLength(result):result.byteLength;}return result;}
  catch(e){v.errors++;throw e;}finally{v.ms+=performance.now()-start;}
 };
}
syncBuiltinESMExports();
const parse=JSON.parse;
JSON.parse=function(text,...args){const m=metric();m.jsonParses++;m.jsonCharacters+=typeof text==='string'?text.length:0;const t=performance.now();try{return parse.call(this,text,...args);}finally{m.jsonParseMs+=performance.now()-t;}};
let suppressedLogs=0;
console.log=console.warn=console.error=()=>suppressedLogs++;
const output=(x)=>reportWrite(1,JSON.stringify(x,null,2)+'\n');
const tImport=performance.now();
try{
 const {RootRunPackageCurrentValidator}=await import(pathToFileURL(root+'/run-history/services/root-run-package-current-validator.js'));
 const {ContextFileCurrentReferenceValidator}=await import(pathToFileURL(root+'/context-files/services/context-file-current-reference-validator.js'));
 const {RootRunPackageReadinessIndex}=await import(pathToFileURL(root+'/run-history/services/root-run-package-readiness-index.js'));
 durations.importMs=performance.now()-tImport;
 const scan=RootRunPackageCurrentValidator.prototype.scan;
 RootRunPackageCurrentValidator.prototype.scan=async function(...args){const prev=phase;phase='structure';const t=performance.now();try{return await scan.apply(this,args);}finally{durations.structuralMs=(durations.structuralMs??0)+performance.now()-t;phase=prev;}};
 const validate=ContextFileCurrentReferenceValidator.prototype.validate;
 let groups=0;
 ContextFileCurrentReferenceValidator.prototype.validate=async function(...args){const prev=phase;phase='references';groups++;const t=performance.now();try{return await validate.apply(this,args);}finally{durations.referenceMs=(durations.referenceMs??0)+performance.now()-t;phase=prev;}};
 const index=new RootRunPackageReadinessIndex(memory,undefined,()=> 'http://localhost:29695');
 phase='readiness-other';const start=performance.now(),cpu=process.cpuUsage();await index.rebuild();durations.rebuildMs=performance.now()-start;
 const usage=process.cpuUsage(cpu);
 const reuse=performance.now();await index.awaitReady();durations.awaitReadyReuseMs=performance.now()-reuse;
 const diagnosticCounts={};for(const d of index.listDiagnostics())diagnosticCounts[d.code]=(diagnosticCounts[d.code]??0)+1;
 output({mode:'read-only exact installed module probe; no app/server/migration startup',node:process.version,at:new Date().toISOString(),memoryDataIsLiveReadOnly:true,consistentStoppedWriterSnapshot:false,blockedWriteAttempts:blocked,suppressedLogs,groups,durations,cpuMs:{user:usage.user/1000,system:usage.system/1000},admitted:{team:index.listAdmitted('agent_team').length,org:index.listAdmitted('agent_org').length,agent:index.listAdmitted('agent').length},diagnosticCounts,stats,limits:'One fresh-process read-only probe; filesystem cache/load and instrumentation affect times. Not an end-to-end cold desktop start; fs operation time sums may overlap; no production write or forced replay.'});
 if(blocked.length)process.exitCode=2;
}catch(e){output({probeError:e.message,blockedWriteAttempts:blocked,durations,stats});process.exitCode=1;}
