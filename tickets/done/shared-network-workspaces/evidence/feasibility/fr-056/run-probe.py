"""Designer-owned native Grok private plugin discovery; no provider call/auth/mount.
Run: python3 <this-file>. Uses installed Grok read-only binary and temporary homes.
"""
from pathlib import Path
import tempfile, subprocess, json, shutil
p=Path(__file__).resolve().parent;h=Path(tempfile.mkdtemp(prefix='ab-sf-fr056-discovery-'));w=h/'project';b=h/'plugin';w.mkdir();(h/'home').mkdir();(h/'grok').mkdir();(b/'.claude-plugin').mkdir(parents=True);(b/'skills/private-proof').mkdir(parents=True)
(b/'.claude-plugin/plugin.json').write_text(json.dumps({'name':'autobyteus-configured','version':'1.0.0','description':'Owned private skill discovery fixture'}));(b/'skills/private-proof/SKILL.md').write_text('---\nname: private-proof\ndescription: Owned discovery probe\n---\nUse the private support file.\n');(b/'skills/private-proof/support.txt').write_text('PRIVATE_NOT_PROJECT')
r={'scope':'Grok native private-plugin discovery, no model or mounted filesystem; not integrated ACP proof','commands':[],'cases':[]};env={'HOME':str(h/'home'),'GROK_HOME':str(h/'grok'),'PATH':'/usr/bin:/bin:/usr/sbin:/sbin','TERM':'dumb'}
try:
 a=['/Users/normy/.grok/bin/grok','--plugin-dir',str(b),'--cwd',str(w),'inspect','--json'];z=subprocess.run(a,env=env,cwd=w,capture_output=True,text=True,timeout=30);r['commands'].append({'argv':a,'rc':z.returncode,'stdout':z.stdout,'stderr':z.stderr});assert z.returncode==0,z.stderr
 v=json.loads(z.stdout);r['inspection']=v
 text=json.dumps(v);assert 'private-proof' in text and str(b) in text,text
 assert not list(w.iterdir()),'Plugin discovery wrote into the project'
 r['cases'].append({'name':'private plugin skill discovered by native inspect without shared project writes','status':'PASS','detail':'Inspect is not ACP session activation or an actual native tool invocation.'})
except Exception as e:r['fatal']=repr(e)
finally:
 shutil.rmtree(h);r['cleanup']={'ownedScratchRemoved':not h.exists()};(p/'probe-result.json').write_text(json.dumps(r,indent=2)+'\n')
print(json.dumps({'passes':len(r['cases']),'fatal':r.get('fatal')}));raise SystemExit(1 if r.get('fatal') else 0)
