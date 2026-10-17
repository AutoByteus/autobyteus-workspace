"""IR006 read-only source/candidate audit plus own evidence output; no execution."""
from pathlib import Path
import subprocess as sp,hashlib,json
R=Path.cwd();T=R/'tickets/in-progress/shared-network-workspaces';E=Path(__file__).resolve().parent
C='eb7934072a1f98832b7b6330a1bc6a7f348fd93d'
B=sp.check_output(['git','rev-parse',C+'^'],text=True).strip()
old=json.loads((T/'implementation-evidence/ir-005/source-audit.json').read_text())
incoming=json.loads((T/'code-review-evidence/crr-006/package-index.json').read_text())['reference_files']
changed=sp.check_output(['git','diff','--name-only',B,C],text=True).splitlines()
assert changed==['.github/workflows/release-nfs.yml','scripts/tests/test_nfs_release_workflow.py']
paths={x['path'] for x in old['unchangedReviewedAndAuthorityPaths']+old['delta']}
paths.update(str(Path(p).relative_to(R)) for p in incoming)
paths.update(sp.check_output(['git','ls-tree','-r','--name-only',B,'autobyteus-nfs','tickets/in-progress/shared-network-workspaces'],text=True).splitlines())
exclude=set(changed)|{str((T/'implementation-handoff.md').relative_to(R)),str((T/'implementation-revision-record.md').relative_to(R))}
unchanged=[]
for name in sorted(paths-exclude):
    blob=sp.run(['git','show',B+':'+name],capture_output=True)
    if blob.returncode:continue
    data=(R/name).read_bytes();assert data==blob.stdout,name
    unchanged.append({'path':name,'sha256':hashlib.sha256(data).hexdigest()})
delta=[]
for name in changed:
    p=R/name;before=sp.run(['git','show',B+':'+name],capture_output=True).stdout
    delta.append({'path':name,'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'beforeNonemptyLines':sum(bool(s.strip()) for s in before.decode().splitlines()),'nonemptyLines':sum(bool(s.strip()) for s in p.read_text().splitlines()),'kind':'production workflow' if name.endswith('.yml') else 'durable regression test'})
rc=json.loads((T/'implementation-evidence/ir-005/retained-candidate.json').read_text())
assert all(hashlib.sha256(Path(x['path']).read_bytes()).hexdigest()==x['sha256'] and Path(x['path']).stat().st_size==x['size'] for x in rc['files'])
a={'inputReviewCommit':'28775788db8d1a3d1d54b86a29ebfac34e1a463b','handoffReceiptBaseline':B,'sourceCommit':C,'trigger':'CRR006/CR-004 P2 Local Fix','classification':{'task_size':'Large','architectural_risk':'High'},'delta':delta,'unchangedCount':len(unchanged),'unchanged':unchanged,'retainedIR005CandidateFilesUnchanged':len(rc['files']),'currentDefaultSourceHash':(E/'source-hash.log').read_text().strip(),'currentSourceWithSameArm64EngineInputs':(E/'candidate-input-source-hash.log').read_text().strip(),'oldCandidateStatus':'IR005 CLI/release metadata unchanged, now prior-workflow aggregate; unchanged engine package bytes may be reused but new CLI/metadata must be generated for current-source qualification. No rebuild or qualification claimed.'}
(E/'source-audit.json').write_text(json.dumps(a,indent=2)+'\n')
print(json.dumps({'delta':delta,'unchanged':len(unchanged),'baseline':B}))
