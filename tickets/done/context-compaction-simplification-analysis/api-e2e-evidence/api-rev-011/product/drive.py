import sys,os,json,subprocess,datetime
from pathlib import Path
e=Path(__file__).resolve().parent
w=e.parents[5]
launch=json.loads((e.parent/'isolated-start.json').read_text())
assert launch['ok'],launch
instance=launch['result']
env={**os.environ,'CHROME_REMOTE_DEBUGGING_PORT':str(instance['controlPort']),'BROWSER_AUTOMATION_ATTACH_ONLY':'1'}
name=sys.argv[1]
args=sys.argv[2:]
argv=['bash','/Users/normy/autobyteus_org/autobyteus-skills/browser-automation/scripts/browser',*args]
(e/(name+'.command.json')).write_text(json.dumps({'time':datetime.datetime.now(datetime.timezone.utc).isoformat(),'cwd':str(w),'argv':argv,'controlPort':instance['controlPort']},indent=2)+'\n')
with (e/(name+'.json')).open('x') as out,(e/(name+'.stderr')).open('x') as err:
 result=subprocess.run(argv,cwd=w,env=env,stdout=out,stderr=err)
print((e/(name+'.json')).read_text())
sys.exit(result.returncode)
