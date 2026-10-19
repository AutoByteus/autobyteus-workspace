import fs from 'node:fs';
const clean = s => String(s).replaceAll('|', '/').replaceAll('\n', ' ');
function idOf(t) {
  const n=t.fullName;
  const api=n.match(/API-CL0[1-4]/)?.[0];
  if(api) return api;
  if(n.includes('interrupts only the turn')) return 'WS-INT';
  if(n.includes('busy agent')) return 'WS-BUSY';
  if(n.includes('requeues an append')) return 'WS-RACE';
  if(n.includes('background completion')) return 'WS-BG';
  if(n.includes('live E2E')) return 'LIVE-001';
  if(n.includes('PROBE-')) return n.match(/PROBE-[A-Z]+/)[0];
  return null;
}
export default class {
  emit(test, event) {
    const id=idOf(test); if(!id) return;
    const r=event==='Started'?{state:'pending'}:test.result();
    const result={passed:'Pass',failed:'Fail',skipped:'Not Tested',pending:'N/A'}[r.state];
    const row={id,event,time:new Date().toISOString(),execution:process.env.TEST_API_EXECUTION,name:test.fullName,result,diagnostic:test.diagnostic(),errors:r.errors};
    fs.appendFileSync(process.env.TEST_API_EVENTS,JSON.stringify(row)+'\n');
    fs.appendFileSync(process.env.TEST_API_LEDGER,`| ${id} | ${row.time} | ${event} | ${clean(row.execution)} | Original assertions plus owned teardown / live gated skip | ${clean(row.name)}: ${r.state} | ${result} | evidence/api-e2e/${clean(row.execution)}.log; ${clean(row.execution)}.events.jsonl |\n`);
  }
  onTestCaseReady(test) {this.emit(test,'Started');}
  onTestCaseResult(test) {this.emit(test,'Completed');}
}
