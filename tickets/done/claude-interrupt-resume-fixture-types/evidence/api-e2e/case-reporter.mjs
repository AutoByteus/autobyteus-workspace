// Reporting only, no mutation of test behavior or pass/fail policy.
import fs from 'node:fs';
const scrub=s=>String(s).replaceAll('|','/').replaceAll('\n',' ');
function id(test){const name=test.fullName;return name.match(/API-CL0[1-4]/)?.[0]??(name.includes('interrupts only')?'WS-INT':name.includes('busy agent')?'WS-BUSY':name.includes('requeues an append')?'WS-RACE':name.includes('background completion')?'WS-BG':name.includes('live E2E')?'LIVE-001':null);}
export default class {
 emit(test,event){const caseId=id(test);if(!caseId)return;const r=event==='Started'?{state:'pending'}:test.result();const result={passed:'Pass',failed:'Fail',skipped:'Not Tested',pending:'N/A'}[r.state];const row={id:caseId,utc:new Date().toISOString(),event,result,execution:process.env.TEST_API_EXECUTION,name:test.fullName,errors:r.errors,diagnostic:test.diagnostic()};fs.appendFileSync(process.env.TEST_API_EVENTS,JSON.stringify(row)+'\n');fs.appendFileSync(process.env.TEST_API_LEDGER,`| ${caseId} | ${row.utc} | ${event} | ${scrub(row.execution)} | Original assertions/exact resources; live gate skip | ${scrub(row.name)} ${r.state} | ${result} | evidence/api-e2e/${scrub(row.execution)}.log/.events.jsonl |\n`);}
 onTestCaseReady(test){this.emit(test,'Started');}
 onTestCaseResult(test){this.emit(test,'Completed');}
}
