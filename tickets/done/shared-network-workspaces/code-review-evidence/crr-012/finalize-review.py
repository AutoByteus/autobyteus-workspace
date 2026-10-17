"""Verify reviewer-only changes, preserve input chain, publish local review index."""
from pathlib import Path
import json,hashlib,subprocess as sp,ast
E=Path(__file__).resolve().parent;T=E.parent.parent;R=T.parent.parent.parent
base='190e130290ca74307430fac6b28f0bc736766033'
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def save(n,d):(E/n).write_text(json.dumps(d,indent=2)+'\n')
a=json.loads((E/'input-audit.json').read_text())
allowed={str(T/'code-review-report.md'),str(T/'code-review-revision-record.md')}
for p,v in a['inputReferences'].items():
 if p not in allowed: assert sha(Path(p))==v['sha256'] and Path(p).stat().st_size==v['size'],p
for v in a['retainedFiles']+a['priorDistFiles']:
 p=Path(v['path']);assert sha(p)==v['sha256'] and p.stat().st_size==v['size'],str(p)
record=T/'code-review-revision-record.md';rel=str(record.relative_to(R));prior=sp.check_output(['git','show',base+':'+rel],cwd=R)
assert record.read_bytes().startswith(prior) and record.read_text().count('## CRR-012 —')==1
changed=sp.check_output(['git','diff','--name-only',base],cwd=R,text=True).splitlines()
assert all(str(R/p) in allowed or p.startswith(str(E.relative_to(R))+'/') for p in changed),changed
for p in E.glob('*.py'):ast.parse(p.read_text())
for p in E.glob('*.json'):json.loads(p.read_text())
for p in [T/'code-review-report.md',record,*E.glob('*.md')]:
 assert all(not s.endswith((' ','\t')) for s in p.read_text().splitlines()),str(p)
refs=set(a['inputReferences'])
# Inspected source/contract context not necessarily enumerated upstream.
refs.update(str(R/x['path']) for x in a['sourceFiles'])
refs.update(str(R/p) for p in ['autobyteus-nfs/internal/platform/filesystem_darwin.go','autobyteus-server-ts/docs/design/data_migration_guideline.md'])
refs.update(str(p) for p in E.iterdir() if p.is_file())
refs.update(str(E/n) for n in ['package-index.json','final-checks.json'])
index={'round':'CRR-012','entry':'API/E2E Failure-Origin Review','result':'Fail','classification':'Design Impact','finding':'CR007 P1 / API-F005','requirements':'Approved SR018','design':'Ready SR022 / ARCH-REV006','implementation':'IR008','sourceCommit':'d65aeda24fc4b9a534a3941b194dd4a55b88c00c','inputHead':base,'api':'API-REV005 Fail57.14% / broaderRequired','task_size':'Large','architectural_risk':'High','route':'Reviewed','incomingReferenceCount':len(a['inputReferences']),'referenceCount':len(refs),'reference_files':sorted(refs),'priorResolution':'CR006/API-F004 independently resolved at executed Linux native+Docker storage/native+managed HTTP scope; not full AC003/crossOS/physical qualification','notes':'No production/durable-test edits or reviewer runtime execution; complete input chain retained. Source-hash/build/engine identities unchanged.'}
save('package-index.json',index)
save('final-checks.json',{'result':'Pass evidence/preservation checks, NOT product Pass','productResult':'Fail / Design Impact / CR007 API-F005','inputHead':base,'incomingReferenceCount':1285,'protectedIncomingPaths':len(a['inputReferences'])-2,'inputManifestVerified':a['manifestVerified'],'retainedCandidates':len(a['retainedFiles']),'oldDistFiles':len(a['priorDistFiles']),'revisionPrefixPreserved':True,'onlyAllowedReviewChanges':True,'referenceCount':len(refs),'pythonSyntax':'Pass','jsonParse':'Pass','ownedMarkdownWhitespace':'Pass','noProductionOrDurableTestChanges':True,'noRuntimeExecutionOrResources':True,'routing':json.loads((E/'routing.json').read_text())['selectedRule'],'noDelegationMergePushReleaseTaskDone':True})
assert all(Path(p).is_file() for p in refs)
print(json.dumps({'result':'Pass','refs':len(refs),'protectedIncoming':len(a['inputReferences'])-2,'retainedCandidates':len(a['retainedFiles']),'oldDist':len(a['priorDistFiles']),'currentReview':'CRR-012 Fail Design Impact'}))
