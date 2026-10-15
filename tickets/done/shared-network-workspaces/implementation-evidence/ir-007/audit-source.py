"""Compare actual current source against this round's pre-edit snapshot and retained inputs."""
from pathlib import Path
import subprocess as sp,json,hashlib
R=Path.cwd();T=R/'tickets/in-progress/shared-network-workspaces';E=Path(__file__).resolve().parent;S=Path((E/'scratch-path.txt').read_text().strip())
a=json.loads((E/'input-audit.json').read_text());full=json.loads((S/'full-repository-input-audit.json').read_text());head=sp.check_output(['git','rev-parse','HEAD'],text=True).strip();changed=sp.check_output(['git','diff','--name-only',a['head'],head],text=True).splitlines()
assert len(changed)==15
h=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
exceptions=set(changed)|{str((T/f).relative_to(R)) for f in ['implementation-handoff.md','implementation-revision-record.md']}
unchanged=[];other=hashlib.sha256();total=0
for name,digest in full['tracked'].items():
 if name in exceptions:continue
 assert h(R/name)==digest,name
 total+=1
 if name in a['tracked']:unchanged.append({'path':name,'sha256':digest})
 else:other.update((name+'\0'+digest+'\n').encode())
delta=[]
for name in changed:
 p=R/name;before=sp.run(['git','show',a['head']+':'+name],capture_output=True).stdout.decode();count=sum(bool(s.strip()) for s in p.read_text().splitlines())
 test=name.endswith('_test.go') or '/tests/' in name;code=not name.endswith('.md')
 if code and not test:assert count<=500,(name,count)
 delta.append({'path':name,'sha256':h(p),'beforeNonempty':sum(bool(s.strip()) for s in before.splitlines()),'nonempty':count,'test':test})
old=json.loads((T/'implementation-evidence/ir-005/retained-candidate.json').read_text());new=json.loads((E/'build-result.json').read_text())
for x in old['files']+new['files']:assert h(Path(x['path']))==x['sha256'] and Path(x['path']).stat().st_size==x['size']
refs=json.loads((T/'evidence/design-recovery/sr021/package-index.json').read_text())['reference_files']
assert all(Path(p).is_file() for p in refs)
result={'inputHead':a['head'],'sourceCommit':head,'classification':{'task_size':'Large','architectural_risk':'High'},'delta':delta,'unchangedPackagePaths':unchanged,'unchangedPackageCount':len(unchanged),'wholeRepositoryUnchangedCount':total,'outsidePackageUnchangedDigest':other.hexdigest(),'retainedIR005FilesUnchanged':len(old['files']),'newIR007CandidateFilesVerified':len(new['files']),'incomingReferencesVerified':len(refs),'defaultSourceHash':(E/'source-hash.log').read_text().strip(),'sameEngineCurrentSourceHash':new['metadata']['sourceHash'],'status':sp.check_output(['git','status','--short'],text=True)}
(E/'source-audit.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps({k:v for k,v in result.items() if k not in ['unchangedPackagePaths','delta','status']}))
