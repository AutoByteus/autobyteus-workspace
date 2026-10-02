import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {startBuiltTestServer,removeOwnedTestRuntime,resolveTestDatabaseLocation,createSanitizedTestEnvironment,serverRoot} from '../../../../../test-support/live-e2e/test-runtime-bootstrap.mjs';
import {runCapturedLiveE2eProcess,LiveE2eEvidenceScanner} from '../../../../../test-support/live-e2e/live-e2e-evidence-scanner.mjs';
const here=path.dirname(fileURLToPath(import.meta.url));
const runtimeRoot=path.join(serverRoot,'tests/.tmp/api-rev-007-deepseek'),databaseUrlOverride='file:./db/api-rev-007-deepseek.db';
const database=resolveTestDatabaseLocation(databaseUrlOverride);
assert(!fs.existsSync(runtimeRoot));assert(fs.existsSync(database.databasePath)&&fs.existsSync(database.rootKeyPath),'Expected importer-created owned vault');
const ledger=path.resolve(here,'../../api-e2e-test-case-ledger.md');
const scanner=new LiveE2eEvidenceScanner(['synthetic-live-e2e-scan-canary']);
let server;const results={case:'API007-C08',started:new Date().toISOString(),database,runtimeRoot,attempts:[]};
const record=()=>fs.writeFileSync(path.join(here,'execution.json'),JSON.stringify(results,null,2));
try{
 server=await startBuiltTestServer({runtimeRoot,databaseUrlOverride});
 results.serverUrl=server.serverUrl;results.pid=server.child.pid;record();
 assert(!fs.readFileSync(path.join(runtimeRoot,'.env'),'utf8').includes('AUTOBYTEUS_COMPACTION_MODEL_SETTINGS'));
 for(const phase of ['preflight','flow','quality']){
  if(phase==='flow')fs.writeFileSync(path.join(here,'campaign-state.json'),JSON.stringify({parent:0,summary:0,closed:false,deadline:Date.now()+720000},null,2),{flag:'wx'});
  const testFile=phase==='quality'?'real-e2e-compaction-quality.e2e.test.ts':'real-e2e-provider-capabilities.e2e.test.ts';
  const args=['exec','vitest','run','tests/e2e/secret-management/'+testFile,'--no-watch',...(phase!=='preflight'?['--config',path.join(here,'vitest-live.config.mts')]:[])];
  const extra={RUN_REAL_E2E:'1',AUTOBYTEUS_TEST_RUNTIME_ROOT:runtimeRoot,AUTOBYTEUS_TEST_SERVER_URL:server.serverUrl,AUTOBYTEUS_TEST_DATABASE_URL:database.databaseUrl,AUTOBYTEUS_LIVE_E2E_SCENARIOS:'deepseek.compaction-agent-flow',...(phase==='preflight'?{AUTOBYTEUS_LIVE_E2E_PREFLIGHT_ONLY:'1'}:{API007_PHASE:phase})};
  fs.appendFileSync(ledger,'\nAPI007-C08 '+phase+' started '+new Date().toISOString()+'; global13call/12minute bound, manifest frozen.\n');
  const command=phase==='preflight'?'pnpm':process.execPath;
  const actualArgs=phase==='preflight'?args:[path.join(here,'bounded-worker.mjs'),...args];
  const result=await runCapturedLiveE2eProcess({command,args:actualArgs,cwd:serverRoot,env:createSanitizedTestEnvironment(extra)});
  fs.writeFileSync(path.join(here,phase+'.log'),result.stdout+'\n'+result.stderr);
  results.attempts.push({phase,command:[command,...actualArgs],cwd:serverRoot,environment:extra,status:result.status,signal:result.signal,completed:new Date().toISOString()});record();
  fs.appendFileSync(ledger,'\nAPI007-C08 '+phase+' completed exit '+result.status+'; api-rev-007/'+phase+'.log. Manual semantic adjudication pending; exit does not decide acceptance.\n');
  if(result.status!==0){results.stopReason=phase+'_COMMAND_FAILED';process.exitCode=1;break;}
  if(phase==='preflight'){
   const observation=result.stdout.split('\n').filter(l=>l.startsWith('{')).map(l=>{try{return JSON.parse(l)}catch{return null}}).find(v=>v?.scenarioId==='deepseek.compaction-agent-flow'&&v?.health);
   assert(observation&&observation.health==='READY'&&observation.missing?.length===0,'Preflight not ready; no generation');
  }else{
   const campaign=JSON.parse(fs.readFileSync(path.join(here,'campaign-state.json'),'utf8'));
   assert(!campaign.closed,'Campaign guard closed');
  }
 }
}catch(error){results.error={name:error.name,message:error.message};process.exitCode=1;}
finally{
 try{if(server){await server.stop();scanner.assertEvidenceClean(server.output());fs.writeFileSync(path.join(here,'server.log'),server.output());}}
 finally{
  for(const phase of ['flow','quality']){
   const file=path.join(here,phase+'-worker.json');
   if(fs.existsSync(file)){const worker=JSON.parse(fs.readFileSync(file,'utf8'));if(!worker.closed){try{process.kill(-worker.pid,'SIGKILL');}catch(error){if(error.code!=='ESRCH')throw error;}}}
  }
  await removeOwnedTestRuntime(runtimeRoot,database);
  results.cleanup={runtimeRemoved:!fs.existsSync(runtimeRoot),databaseRemoved:!fs.existsSync(database.databasePath),rootKeyRemoved:!fs.existsSync(database.rootKeyPath)};
  const f=path.join(here,'campaign-state.json');if(fs.existsSync(f)){const c=JSON.parse(fs.readFileSync(f,'utf8'));results.finalCounters=c;c.closed=true;fs.writeFileSync(f,JSON.stringify(c,null,2));}
  results.finished=new Date().toISOString();record();
 }
}
console.log(JSON.stringify(results));
