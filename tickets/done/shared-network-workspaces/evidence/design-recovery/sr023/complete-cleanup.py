from pathlib import Path
import json,subprocess as s,shutil
E=Path(__file__).resolve().parent;d=json.loads((E/'resource.json').read_text());r=json.loads((E/'cleanup.json').read_text());r['firstAttemptError']='Assertion used raw substring against JSON slash escaping; decoded exact cache Name is present. Clone already stopped/deleted.'
for a in ([d['tart'],'list','--format','json'],['/bin/ps','-p',str(d['vmPid']),'-o','args=']):
 p=s.run(a,env=d['env'],capture_output=True,text=True,timeout=30);q={'argv':a,'rc':p.returncode,'stdout':p.stdout,'stderr':p.stderr};r['commands'].append(q)
 if a[1]=='list':
  assert p.returncode==0;names=[v['Name'] for v in json.loads(p.stdout)];assert d['clone'] not in names and d['image'] in names
 else: assert d['clone'] not in p.stdout
p=Path(d['scratch']);assert str(p)=='/private/tmp/nfs-sr023-gc5go40z' and p.is_dir();shutil.rmtree(p);assert not p.exists()
r.update(result='Complete',ownCloneAbsent=True,ownProcessAbsent=True,ownScratchAbsent=True,publicBaselineRetained=True,productResourcesCreated=False);(E/'cleanup.json').write_text(json.dumps(r,indent=2)+'\n');print(r['result'])
