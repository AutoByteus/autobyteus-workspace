import datetime,json,pathlib,subprocess,sys
E=pathlib.Path(__file__).resolve().parent
T=E.parents[2]
W=T.parents[2]
case,cwd,*cmd=sys.argv[1:]
def checkpoint(s):
 with (T/'api-e2e-test-case-ledger.md').open('a') as f:f.write('\n'+s+'\n')
r={'case':case,'cwd':str(W/cwd),'argv':cmd,'started':datetime.datetime.now(datetime.timezone.utc).isoformat(),'mode':'repository; no real-provider flags'}
checkpoint(f'API006 IR007 {case} Started; exact argv in ir007-resume/{case}.json.')
with (E/(case+'.json')).open('w') as f:json.dump(r,f,indent=2)
with (E/(case+'.log')).open('w') as out:
 try:p=subprocess.run(cmd,cwd=W/cwd,stdout=out,stderr=subprocess.STDOUT,timeout=240);code=p.returncode
 except subprocess.TimeoutExpired:code=124
r.update(exitCode=code,finished=datetime.datetime.now(datetime.timezone.utc).isoformat())
(E/(case+'.json')).write_text(json.dumps(r,indent=2)+'\n')
checkpoint(f'API006 IR007 {case} completed exit{code}; '+('Pass scoped to executed assertions' if code==0 else 'Fail; investigate origin/fixture validity')+f'; ir007-resume/{case}.log/.json. No overall Pass.')
print(json.dumps(r));sys.exit(code)
