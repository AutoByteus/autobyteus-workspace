from pathlib import Path
import sys,os,json,subprocess,datetime,time,re
W=Path(__file__).resolve().parents[4]
T=W/'tickets/in-progress/project-task-manager-linked-delegation'
E=T/'api-e2e-evidence'
case,label=sys.argv[1:3]; cmd=sys.argv[3:]
if cmd and cmd[0]=='--': cmd=cmd[1:]
assert cmd
log=E/(case+'-'+label+'.log'); start=datetime.datetime.now(datetime.timezone.utc).isoformat(); tick=time.time()
with log.open('w') as f:
 f.write('START '+start+'\nCWD '+str(W)+'\nCOMMAND '+json.dumps(cmd)+'\n'); f.flush()
 p=subprocess.Popen(cmd,cwd=W,stdout=f,stderr=subprocess.STDOUT)
 print(json.dumps({'checkpoint':'Started','case':case,'label':label,'pid':p.pid,'log':str(log)}),flush=True)
 code=p.wait(); f.write('\nINNER_EXIT_CODE='+str(code)+'\n')
record={'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'case':case,'label':label,'command':cmd,'cwd':str(W),'start':start,'seconds':round(time.time()-tick,2),'pid':p.pid,'exitCode':code,'observed':'Pass' if code==0 else 'Fail','log':str(log)}
with (E/'api-017-executable-results.jsonl').open('a') as f:f.write(json.dumps(record)+'\n')
with (T/'api-e2e-test-case-ledger.md').open('a') as f:f.write('\n### '+case+' — '+label+' / '+record['at']+'\nCommand/cwd: `'+json.dumps(cmd)+'` from `'+str(W)+'`; inner exit '+str(code)+'; **'+record['observed']+'** selected command attempt. Log `'+str(log)+'`. '+str(record['seconds'])+'s. Case final outcome depends on required remaining steps; no inference from command alone.\n')
text=log.read_text(); print(json.dumps(record),flush=True)
for line in text.splitlines():
 if re.search(r'Test Files|Tests |Error|error TS|FAIL|INNER_EXIT_CODE|BUILD_FAILED|APP_',line): print(line[:900],flush=True)
sys.exit(code)
