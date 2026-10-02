import datetime, json, pathlib, subprocess, sys
E=pathlib.Path(__file__).resolve().parent
T=E.parent.parent.parent
W=T.parent.parent.parent
case,cwd,*cmd=sys.argv[1:]
def checkpoint(text):
    with (T/'api-e2e-test-case-ledger.md').open('a') as f:f.write('\n'+text+'\n')
result={'case':case,'cwd':str(W/cwd),'command':cmd,'started':datetime.datetime.now(datetime.timezone.utc).isoformat(),'mode':'No remote provider flags; repository validation'}
checkpoint(f'API005 resumed {case} Started; evidence ir005-resume/{case}.log; command {cmd!r}.')
with (E/(case+'.log')).open('w') as out:
    proc=subprocess.run(cmd,cwd=W/cwd,stdout=out,stderr=subprocess.STDOUT)
result.update(exitCode=proc.returncode,finished=datetime.datetime.now(datetime.timezone.utc).isoformat())
(E/(case+'.json')).write_text(json.dumps(result,indent=2)+'\n')
checkpoint(f'API005 resumed {case} completed exit{proc.returncode}; '+('Pass for executed assertions only' if proc.returncode==0 else 'Fail; current assertion/origin triage required')+f'; ir005-resume/{case}.log/.json. No overall result inferred.')
print(json.dumps(result))
sys.exit(proc.returncode)
