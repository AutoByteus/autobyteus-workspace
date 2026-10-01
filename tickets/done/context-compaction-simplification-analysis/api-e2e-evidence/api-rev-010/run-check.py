import subprocess,sys,json,datetime,os
from pathlib import Path
e=Path(__file__).resolve().parent;w=e.parents[4]
name=sys.argv[1];cmd=json.loads((e/'commands.json').read_text())[name]
start=datetime.datetime.now(datetime.timezone.utc).isoformat()
with (e/(name+'.log')).open('x') as f:
 r=subprocess.run(cmd,cwd=w,stdout=f,stderr=subprocess.STDOUT,env={**os.environ,'GIT_OPTIONAL_LOCKS':'0'})
(e/(name+'.json')).write_text(json.dumps({'command':cmd,'cwd':str(w),'started':start,'finished':datetime.datetime.now(datetime.timezone.utc).isoformat(),'exit':r.returncode},indent=2))
with (e.parent.parent/'api-e2e-test-case-ledger.md').open('a') as f:f.write('\nAPI010 '+name+' completed exit'+str(r.returncode)+'; exclusive log/command at api-e2e-evidence/api-rev-010/'+name+'.{log,json}. Counts and validity reviewed separately.\n')
print(name,r.returncode,flush=True)
sys.exit(r.returncode)
