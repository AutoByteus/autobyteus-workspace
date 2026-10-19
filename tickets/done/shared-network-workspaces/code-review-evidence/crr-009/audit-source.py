"""Read-only independent chain, source, size and retained-input audit."""
from pathlib import Path
import json,hashlib,subprocess as sp
R=Path.cwd(); T=R/'tickets/in-progress/shared-network-workspaces'; E=Path(__file__).resolve().parent; I=T/'implementation-evidence/ir-007'
def digest(p): return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def git(*a): return sp.check_output(['git',*a],text=True).strip()
head=git('rev-parse','HEAD'); source='d318bd9db935affdf16d141ef4e88a6c0e4939b5'; base='50d9c9d0c883e1ad8d3a1808b9e980a7df4f132b'
assert head=='ec3bf6b270ef8d038f309b0fad1f599566d1b233'
refs=json.loads((I/'package-index.json').read_text())['reference_files']; assert len(refs)==len(set(refs))==739
assert all(Path(p).is_file() for p in refs)
a=json.loads((I/'source-audit.json').read_text()); changed=git('diff','--name-only',base,source).splitlines(); assert len(changed)==15
rows=[]
for x in a['delta']:
 p=R/x['path']; assert digest(p)==x['sha256']; before=sp.run(['git','show',base+':'+x['path']],capture_output=True).stdout.decode()
 nonempty=lambda s:sum(bool(l.strip()) for l in s.splitlines())
 assert nonempty(before)==x['beforeNonempty'] and nonempty(p.read_text())==x['nonempty']
 adds,dels=git('diff','--numstat',base,source,'--',x['path']).split()[:2]
 original=sp.run(['git','show','f13bdd0eb79aacc63dffa5995b9c86f359001468:'+x['path']],capture_output=True).stdout.decode()
 rows.append(dict(x,baseBranchNonempty=nonempty(original),added=int(adds),removed=int(dels)))
for x in a['unchangedPackagePaths']: assert digest(R/x['path'])==x['sha256'],x['path']
# Require current authorities/prior records identical to received handoff (no reviewer edits yet).
authorities=['requirements-doc.md','approval-record-sr018.md','design-spec.md','design-review-report.md','investigation-notes.md','solution-revision-record.md','architecture-review-revision-record.md','implementation-handoff.md','implementation-revision-record.md','api-e2e-execution-coverage-report.md','api-e2e-revision-record.md','code-review-report.md','code-review-revision-record.md']
for n in authorities:
 b=sp.check_output(['git','show',head+':'+str((T/n).relative_to(R))]); assert hashlib.sha256(b).hexdigest()==digest(T/n)
retained=[]
for p in [T/'implementation-evidence/ir-005/retained-candidate.json',I/'build-result.json']:
 data=json.loads(p.read_text())
 for x in data['files']:
  assert digest(x['path'])==x['sha256'] and Path(x['path']).stat().st_size==x['size']; retained.append(x)
prod=[x for x in rows if not x['test'] and not x['path'].endswith('.md')]
assert all(x['nonempty']<=500 and x['added']+x['removed']<=220 for x in prod)
result=dict(inputHead=head,sourceCommit=source,implementationBase=base,incomingReferences=len(refs),unchangedPriorPackagePaths=len(a['unchangedPackagePaths']),protectedAuthorities={n:digest(T/n) for n in authorities},delta=rows,retainedFiles=retained,sourceSizes={'maxChangedProductionNonempty':max(x['nonempty'] for x in prod),'noOver500':True,'noOver220Delta':True,'testsExcluded':True},status=git('status','--short'))
(E/'source-audit.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps({k:v for k,v in result.items() if k not in ['delta','retainedFiles','protectedAuthorities','status']},indent=2))
