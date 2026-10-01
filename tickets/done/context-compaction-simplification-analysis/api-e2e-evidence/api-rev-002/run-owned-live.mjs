// Retained temporary runner: registered live tests with isolated explicit bootstrap targets.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createSanitizedTestEnvironment,serverRoot } from '../../../../../test-support/live-e2e/test-runtime-bootstrap.mjs';
import { runCapturedLiveE2eProcess } from '../../../../../test-support/live-e2e/live-e2e-evidence-scanner.mjs';
const here=path.dirname(fileURLToPath(import.meta.url));
const server=JSON.parse(fs.readFileSync(path.join(here,'owned-server.json'),'utf8'));
const preflight=process.argv.includes('--preflight');
const quality=process.argv.includes('--quality');
const id=preflight?'API-C08-preflight':quality?'API-C08-quality':'API-C08-first';
const ledger=path.resolve(here,'../../api-e2e-test-case-ledger.md');
const started=new Date().toISOString();
const event=(result)=>fs.appendFileSync(ledger,`| API-C08 | ${new Date().toISOString()} | ${result} | ${id}; actual registered test with owned server | api-e2e-evidence/api-rev-002/${id}.log |\n`);
event('Started');
const args=['exec','vitest','run',quality?'tests/e2e/secret-management/real-e2e-compaction-quality.e2e.test.ts':'tests/e2e/secret-management/real-e2e-provider-capabilities.e2e.test.ts','--no-watch'];
const extra={RUN_REAL_E2E:'1',AUTOBYTEUS_TEST_RUNTIME_ROOT:server.runtimeRoot,AUTOBYTEUS_TEST_SERVER_URL:server.serverUrl,AUTOBYTEUS_TEST_DATABASE_URL:server.database.databaseUrl,LMSTUDIO_HOSTS:'http://localhost:1234',AUTOBYTEUS_LIVE_E2E_SCENARIOS:preflight?'deepseek.compaction-agent-flow,lmstudio.qwen36.compaction-agent-flow':'lmstudio.qwen36.compaction-agent-flow',...(preflight?{AUTOBYTEUS_LIVE_E2E_PREFLIGHT_ONLY:'1'}:{})};
try{
 const result=await runCapturedLiveE2eProcess({command:'pnpm',args,cwd:serverRoot,env:createSanitizedTestEnvironment(extra)});
 fs.writeFileSync(path.join(here,id+'.log'),result.stdout+'\n'+result.stderr);
 fs.writeFileSync(path.join(here,id+'.json'),JSON.stringify({id,started,completed:new Date().toISOString(),command:['pnpm',...args],cwd:serverRoot,environment:extra,status:result.status,signal:result.signal},null,2));
 event(`Completed exit ${result.status}; read configured/skipped/test evidence, not inferred Pass`);
 console.log(result.stdout.slice(-15000));console.log(result.stderr.slice(-5000));process.exitCode=result.status;
}catch(error){fs.writeFileSync(path.join(here,id+'.log'),String(error));event('Fail capture: '+String(error));throw error;}
