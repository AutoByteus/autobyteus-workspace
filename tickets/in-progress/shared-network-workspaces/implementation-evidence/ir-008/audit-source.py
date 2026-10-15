"""IR008 source scope, cumulative-input and retained-artifact integrity. No runtime claims."""
from pathlib import Path
import subprocess as sp,json,hashlib
R=Path.cwd();T=R/'tickets/in-progress/shared-network-workspaces';E=Path(__file__).resolve().parent
a=json.loads((E/'input-audit.json').read_text());h=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
source=sp.check_output(['git','log','-1','--format=%H','--','autobyteus-nfs'],text=True).strip()
changed=sp.check_output(['git','diff','--name-only',a['head'],source],text=True).splitlines()
expected=['autobyteus-nfs/'+s for s in ['README.md','internal/backend/ganesha.go','internal/backend/ganesha_native.go','internal/backend/backend_test.go','internal/backend/cleanup_test.go','internal/setup/status.go','internal/setup/lifecycle.go','internal/setup/hosted_config_test.go']]
assert set(changed)==set(expected),changed
exceptions=set(changed)|{str((T/f).relative_to(R)) for f in ['implementation-handoff.md','implementation-revision-record.md']}
unchanged={}
for p,digest in a['files'].items():
 if p not in exceptions:
  assert h(R/p)==digest,p;unchanged[p]=digest
for p,digest in a['preexistingUntrackedFiles'].items():assert h(R/p)==digest,p
build=json.loads((E/'build-result.json').read_text())
for x in a['retainedArtifacts']+build['files']:
 p=Path(x['path']);assert h(p)==x['sha256'] and p.stat().st_size==x['size'],str(p)
delta=[]
for name in changed:
 p=R/name;before=sp.run(['git','show',a['head']+':'+name],capture_output=True).stdout.decode()
 n=sum(bool(s.strip()) for s in p.read_text().splitlines())
 stat=sp.check_output(['git','diff','--numstat',a['head'],source,'--',name],text=True).strip().split()
 test=name.endswith('_test.go');production=not test and name.endswith('.go')
 if production:assert n<=500 and int(stat[0])+int(stat[1])<=220
 delta.append({'path':name,'sha256':h(p),'beforeNonempty':sum(bool(s.strip()) for s in before.splitlines()),'nonempty':n,'added':int(stat[0]),'removed':int(stat[1]),'production':production})
# Strict writer/verifier/activation/removal bodies themselves stay byte-identical.
name='autobyteus-nfs/internal/backend/ganesha_native.go'
old=sp.check_output(['git','show',a['head']+':'+name],text=True);new=(R/name).read_text()
def body(text,name):
 start=text.index('func '+name+'(');i=text.index('{',start);depth=1;j=i+1
 while depth:
  depth+=(text[j]=='{')-(text[j]=='}');j+=1
 return text[start:j]
strict=['WriteGanesha','VerifyGanesha','EnsureGanesha','RemoveGaneshaConfiguration']
for name in strict:assert body(old,name)==body(new,name),name
refs=json.loads((T/'architecture-review-evidence/arch-rev-006/package-index.json').read_text())['reference_files']
assert all(Path(p).is_file() for p in refs)
result={'inputHead':a['head'],'sourceCommit':source,'classification':{'task_size':'Large','architectural_risk':'High'},'delta':delta,'unchangedInputCount':len(unchanged),'unchangedInputFiles':unchanged,'retainedIR005IR007FilesUnchanged':len(a['retainedArtifacts']),'oldDistFileCountUnchanged':len(a['preexistingUntrackedFiles']),'newIR008FilesVerified':len(build['files']),'strictFunctionsUnchanged':strict,'incomingReferencesRetained':len(refs),'defaultSourceHash':(E/'source-hash.log').read_text().strip(),'sameEngineSourceHash':build['metadata']['sourceHash']}
(E/'source-audit.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps({k:v for k,v in result.items() if k not in ['unchangedInputFiles','delta']},indent=2))
