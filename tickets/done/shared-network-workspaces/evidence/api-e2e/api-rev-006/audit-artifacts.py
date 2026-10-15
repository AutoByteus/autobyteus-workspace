from pathlib import Path
import json,hashlib,subprocess as sp,ast
R=Path.cwd();E=Path(__file__).resolve().parent;T=E.parent.parent.parent
inp=json.loads((E/'input-audit.json').read_text());allowed={str(T/n) for n in ['api-e2e-coverage-investigation.md','api-e2e-execution-coverage-report.md','api-e2e-revision-record.md','api-e2e-test-case-ledger.md']}
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
r={'result':'Running','incomingCount':len(inp['references']),'verifiedProtected':[],'allowedCanonicalChanges':[],'candidates':[],'dist':[]}
for row in inp['references']:
 p=Path(row['path']);assert p.is_file(),p
 if str(p) in allowed:r['allowedCanonicalChanges'].append(str(p));continue
 assert p.stat().st_size==row['size'] and sha(p)==row['sha256'],p;r['verifiedProtected'].append(str(p))
for key in ['candidates','dist']:
 for row in inp[key]:
  p=Path(row['path']);assert p.is_file() and p.stat().st_size==row['size'] and sha(p)==row['sha256'],p;r[key].append(row)
rev=(T/'api-e2e-revision-record.md').read_bytes();assert hashlib.sha256(rev[:inp['priorRevisionBytes']]).hexdigest()==inp['priorRevisionSHA256'];r['priorRevisionPrefixUnchanged']=True
originalTracked=set(sp.check_output(['git','ls-tree','-r','--name-only',inp['head']],text=True).splitlines());allChanged=sp.check_output(['git','diff',inp['head'],'--name-only'],text=True).splitlines();changed=[x for x in allChanged if x in originalTracked];new=[x for x in allChanged if x not in originalTracked];assert all(str(R/x) in allowed for x in changed),changed;assert all((R/x).is_relative_to(E) for x in new),new;r['trackedChanges']=changed;r['newEvidencePaths']=new
r['syntax']=[]
for p in sorted(E.iterdir()):
 if p.suffix=='.json':json.loads(p.read_text());r['syntax'].append(p.name)
 if p.suffix=='.py':ast.parse(p.read_text(),filename=str(p));r['syntax'].append(p.name)
for file in ['mac-native-result.json','mac-volume-result.json','mac-new-source-confirm-result.json','linux-native-resume-result.json','linux-new-source-detach-result.json']:assert json.loads((E/file).read_text())['result']=='Pass',file
assert json.loads((E/'mac-controls-confirm-v2-result.json').read_text())['result'].startswith('Pass');assert json.loads((E/'cleanup.json').read_text())['result']=='Complete'
p=sp.run(['git','diff',inp['head'],'--check','--',*[str(Path(x).relative_to(R)) for x in allowed]],capture_output=True,text=True);r['canonicalWhitespace']={'rc':p.returncode,'stdout':p.stdout,'stderr':p.stderr};assert p.returncode==0
r.update(result='Pass',sourceAndDurableTestsUnchanged=True,protectedCount=len(r['verifiedProtected']),candidateCount=len(r['candidates']),oldDistFileCount=len(r['dist']))
(E/'artifact-audit.json').write_text(json.dumps(r,indent=2)+'\n')
index=json.loads((E/'upstream-package-index.json').read_text());refs=set(index['reference_files']);assert len(refs)==1488
refs.update(str(p) for p in E.rglob('*') if p.is_file());refs.update(allowed);refs.add(str(E/'package-index.json'))
pkg={'round':'API-REV-006','result':'Blocked','confidence':67.85714285714286,'broaderValidation':'Blocked','task_size':'Large','architectural_risk':'High','sourceCommit':inp['source'],'inputCommit':inp['head'],'incomingReferenceCount':1488,'referenceCount':len(refs),'reference_files':sorted(refs)};(E/'package-index.json').write_text(json.dumps(pkg,indent=2)+'\n')
print(json.dumps({'result':'Pass','protected':r['protectedCount'],'candidates':r['candidateCount'],'oldDistFiles':r['oldDistFileCount'],'referenceCount':len(refs),'onlyTrackedChanges':changed}))
