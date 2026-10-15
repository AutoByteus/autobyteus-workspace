"""Personal scope/integrity audit; no runtime qualification claims."""
from pathlib import Path
import json,hashlib,subprocess as sp,re
R=Path.cwd();T=R/'tickets/in-progress/shared-network-workspaces';E=Path(__file__).resolve().parent
h=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
a=json.loads((E/'input-audit.json').read_text());source=(E/'source-commit.txt').read_text().strip()
paths=json.loads((E/'source-paths.json').read_text())
changed=sp.check_output(['git','diff','--name-only',a['head'],source],text=True).splitlines();assert set(paths)==set(changed)
exceptions=set(paths)|{str((T/x).relative_to(R)) for x in ['implementation-handoff.md','implementation-revision-record.md']}
unchanged={}
for path,digest in a['files'].items():
 if path not in exceptions:assert h(R/path)==digest,path;unchanged[path]=digest
for path,digest in a['preexistingUntrackedFiles'].items():assert h(R/path)==digest,path
build=json.loads((E/'build-result.json').read_text())
for f in a['retainedArtifacts']+build['files']:
 p=Path(f['path']);assert h(p)==f['sha256'] and p.stat().st_size==f['size'],str(p)
delta=[]
for name in changed:
 p=R/name;num=sp.check_output(['git','diff','--numstat',a['head'],source,'--',name],text=True).split()
 n=sum(bool(l.strip()) for l in p.read_text().splitlines());production=name.endswith('.go') and not name.endswith('_test.go')
 if production:assert n<=500 and int(num[0])+int(num[1])<=220,name
 delta.append({'path':name,'sha256':h(p),'nonempty':n,'added':int(num[0]),'removed':int(num[1]),'production':production})
checks=json.loads((E/'checks-result.json').read_text());assert len(checks)==14 and all(x['rc']==x['expected'] for x in checks)
mut=json.loads((E/'mutation-result.json').read_text());assert len(mut)==10 and all(x['rc']==1 and x['failureIsTest'] for x in mut)
plain=sp.check_output(['python3','autobyteus-nfs/packaging/release.py','--source-hash'],text=True).strip();assert plain==(E/'source-hash.log').read_text().strip()
meta=json.loads(sp.check_output(['python3','autobyteus-nfs/packaging/release.py','--tag','v'+json.loads((R/'autobyteus-web/package.json').read_text())['version'],'--engine-manifest',str(R/'autobyteus-nfs/out/ir005-local-candidate/engine-candidate/engine-manifest.json')],text=True));assert meta==build['metadata']
s=(E/'go-race.log').read_text();counts={'topLevelPasses':len(re.findall(r'^--- PASS:',s,re.M)),'firstLevelSubcases':len(re.findall(r'^    --- PASS:',s,re.M)),'packages':len(re.findall(r'^ok\s',s,re.M)),'skips':re.findall(r'^.*SKIP.*$',s,re.M)}
(E/'test-counts.json').write_text(json.dumps(counts,indent=2)+'\n')
r={'inputHead':a['head'],'sourceCommit':source,'delta':delta,'protectedInputCount':len(unchanged),'protectedInputFiles':unchanged,'retainedOldArtifacts':len(a['retainedArtifacts']),'preexistingDistFiles':len(a['preexistingUntrackedFiles']),'newCandidateFiles':len(build['files']),'inputReferences':len(a['references']),'defaultSourceHash':plain,'sameEngineSourceHash':meta['sourceHash'],'checks':len(checks),'mutations':len(mut),'testCounts':counts,'task_size':'Large','architectural_risk':'High'}
(E/'source-audit.json').write_text(json.dumps(r,indent=2)+'\n');print(json.dumps({k:v for k,v in r.items() if k not in ['delta','protectedInputFiles']},indent=2))
