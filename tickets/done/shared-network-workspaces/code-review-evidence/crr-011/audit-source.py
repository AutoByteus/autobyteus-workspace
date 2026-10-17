"""Independent read-only IR008 source/package audit; no live resources."""
from pathlib import Path
import subprocess as sp,json,hashlib,re
R=Path.cwd();T=R/'tickets/in-progress/shared-network-workspaces';E=T/'code-review-evidence/crr-011';I=T/'implementation-evidence/ir-008'
def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def git(*a): return sp.check_output(['git',*a],text=True).strip()
def save(n,v): (E/n).write_text(json.dumps(v,indent=2)+'\n')
refs=json.loads((I/'package-index.json').read_text())['reference_files'];assert len(refs)==1088 and all(Path(p).is_file() for p in refs)
head=git('rev-parse','HEAD');assert head=='1840ab1389728dd1ed733587732f2abf3fb8641b'
files={str(Path(p).relative_to(R)):sha(Path(p)) for p in refs}
retained={str(p.relative_to(R)):{'sha256':sha(p),'bytes':p.stat().st_size} for d in ['ir005','ir007','ir008'] for p in (R/f'autobyteus-nfs/out/{d}-local-candidate').rglob('*') if p.is_file()}
old=json.loads((I/'input-audit.json').read_text());dist={p:sha(R/p) for p in old['preexistingUntrackedFiles']}
save('input-audit.json',{'head':head,'branch':git('branch','--show-current'),'status':git('status','--short'),'incomingReferences':len(refs),'files':files,'retainedArtifacts':retained,'preexistingUntrackedFiles':dist,'revisionPrefixBytes':(T/'code-review-revision-record.md').stat().st_size})
base='391d65a993fbb0ca891e043d6a7eea5e4981eebc';source='d65aeda24fc4b9a534a3941b194dd4a55b88c00c'
delta=[]
for line in git('diff','--numstat',base,source).splitlines():
 a,d,p=line.split('\t'); before=sp.run(['git','show',base+':'+p],capture_output=True,text=True).stdout;after=(R/p).read_text();prod=p.endswith('.go') and not p.endswith('_test.go')
 delta.append({'path':p,'added':int(a),'removed':int(d),'beforeNonempty':sum(bool(s.strip()) for s in before.splitlines()),'afterNonempty':sum(bool(s.strip()) for s in after.splitlines()),'production':prod,'sha256':sha(R/p)})
 if prod: assert delta[-1]['afterNonempty']<=500 and int(a)+int(d)<=220
assert len(delta)==8
unaffected=git('diff','--name-only',source,head,'--',':(exclude)tickets').splitlines();assert unaffected==[]
oldsource=git('show',base+':autobyteus-nfs/internal/backend/ganesha_native.go');newsource=(R/'autobyteus-nfs/internal/backend/ganesha_native.go').read_text();functions={}
for name in ['WriteGanesha','VerifyGanesha','EnsureGanesha','RemoveGaneshaConfiguration']:
 pattern=r'(?m)^func '+name+r'\(.*?^\}'
 a=re.search(pattern,oldsource,re.S).group();b=re.search(pattern,newsource,re.S).group();assert a==b;functions[name]=hashlib.sha256(b.encode()).hexdigest()
# Exact preserved inputs: implementation has intentionally changed eight scoped paths + its handoff/history.
exclude={d['path'] for d in delta}|{str(T.relative_to(R)/n) for n in ['implementation-handoff.md','implementation-revision-record.md']}
protected={p:h for p,h in old['files'].items() if p not in exclude};assert all(sha(R/p)==h for p,h in protected.items())
for v in old['retainedArtifacts']: assert sha(Path(v['path']))==v['sha256'] and Path(v['path']).stat().st_size==v['size']
assert all(dist[p]==(v['sha256'] if isinstance(v,dict) else v) for p,v in old['preexistingUntrackedFiles'].items())
build=json.loads((I/'build-result.json').read_text());save('source-audit.json',{'inputHead':head,'sourceCommit':source,'base':base,'reviewScope':'Targeted Delta Review','delta':delta,'strictFunctionsByteIdentical':functions,'unaffectedInputCount':len(protected),'retainedFiles':retained,'oldDistFiles':len(dist),'sourceChangesAfterSourceCommit':unaffected,'incomingReferencesRetained':len(refs)})
print(json.dumps({'deltaFiles':len(delta),'productionFiles':sum(d['production'] for d in delta),'protected':len(protected),'retained':len(retained),'oldDist':len(dist),'refs':len(refs)}))
