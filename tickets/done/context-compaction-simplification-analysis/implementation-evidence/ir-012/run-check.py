import datetime,json,os,subprocess,sys
from pathlib import Path
e=Path(__file__).resolve().parent;r=e.parents[4]
name,*cmd=sys.argv[1:];base=e/name
assert not base.with_suffix('.log').exists()
start=datetime.datetime.now(datetime.timezone.utc).isoformat()
with base.with_suffix('.log').open('w') as log:
 result=subprocess.run(cmd,cwd=r,stdout=log,stderr=subprocess.STDOUT,env={**os.environ,'GIT_OPTIONAL_LOCKS':'0'})
base.with_suffix('.exit').write_text(str(result.returncode)+'\n')
base.with_suffix('.json').write_text(json.dumps({'command':cmd,'cwd':str(r),'start':start,'end':datetime.datetime.now(datetime.timezone.utc).isoformat(),'exit':result.returncode},indent=2)+'\n')
print(name, 'exit', result.returncode)
