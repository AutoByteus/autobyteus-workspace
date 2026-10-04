#!/usr/bin/env python3
# Temporary ticket-owned executor; not production/durable suite code.
import sys, pathlib, json, datetime, subprocess, time, os
p=pathlib.Path(__file__).resolve().parent; case,log,*argv=sys.argv[1:]
start=datetime.datetime.now(datetime.timezone.utc).isoformat(); t=time.monotonic()
with (p/log).open('w') as f:
 f.write('cwd='+os.getcwd()+'\nargv='+json.dumps(argv)+'\nstart='+start+'\n'); f.flush()
 proc=subprocess.run(argv,stdout=f,stderr=subprocess.STDOUT)
 elapsed=time.monotonic()-t; f.write('\nexit='+str(proc.returncode)+' elapsed_seconds='+str(elapsed)+'\n')
j=p/'api-execution-commands.json'; rows=json.loads(j.read_text()); rows.append(dict(case=case,argv=argv,cwd=os.getcwd(),startedAt=start,finishedAt=datetime.datetime.now(datetime.timezone.utc).isoformat(),exitCode=proc.returncode,elapsedSeconds=elapsed,log=str(p/log))); j.write_text(json.dumps(rows,indent=2)+'\n')
with (p.parent/'api-e2e-test-case-ledger.md').open('a') as f: f.write('\n- '+case+' command checkpoint: '+('Pass' if proc.returncode==0 else 'Fail')+' exit '+str(proc.returncode)+'; '+json.dumps(argv)+'; evidence '+str(p/log)+'. Case result requires reconciliation of all steps.\n')
print((p/log).read_text()[-5000:]); sys.exit(proc.returncode)
