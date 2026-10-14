from pathlib import Path
import subprocess as sp,json,sys
E=Path(__file__).resolve().parent;r=json.loads((E/'desktop-start-result.json').read_text());assert r['result']=='Ready';env=r['environment'];env['CHROME_REMOTE_DEBUGGING_PORT']=str(r['response']['result']['controlPort']);env['BROWSER_AUTOMATION_ATTACH_ONLY']='1';name=sys.argv[1];assert all(c.isalnum() or c in '-_' for c in name);argv=['bash','/Users/normy/autobyteus_org/autobyteus-skills/browser-automation/scripts/browser',*sys.argv[2:]];out=E/('desktop-'+name+'.json');assert not out.exists()
p=sp.run(argv,cwd=Path.cwd(),env=env,capture_output=True,text=True,timeout=120);v={'argv':argv,'rc':p.returncode,'stdout':p.stdout,'stderr':p.stderr};out.write_text(json.dumps(v,indent=2)+'\n');print(p.stdout);print(p.stderr,file=sys.stderr)
