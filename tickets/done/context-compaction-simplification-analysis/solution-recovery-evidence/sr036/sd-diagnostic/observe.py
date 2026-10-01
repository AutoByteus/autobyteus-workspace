import sys,os,json,subprocess,datetime
from pathlib import Path
e=Path(__file__).resolve().parent
w=e.parents[5]
launch=json.loads((e/'start-2.json').read_text())['result']
env={**os.environ,'CHROME_REMOTE_DEBUGGING_PORT':str(launch['controlPort']),'BROWSER_AUTOMATION_ATTACH_ONLY':'1'}
name=sys.argv[1]; args=sys.argv[2:]
assert args[0] in ['run-script','screenshot','read-page','dom-snapshot','list-tabs']
argv=['bash','/Users/normy/autobyteus_org/autobyteus-skills/browser-automation/scripts/browser',*args]
with (e/(name+'.command.json')).open('x') as f:json.dump({'time':datetime.datetime.now(datetime.timezone.utc).isoformat(),'cwd':str(w),'argv':argv,'controlPort':launch['controlPort']},f,indent=2)
with (e/(name+'.json')).open('x') as out,(e/(name+'.stderr')).open('x') as err:r=subprocess.run(argv,cwd=w,env=env,stdout=out,stderr=err)
print((e/(name+'.json')).read_text());sys.exit(r.returncode)
