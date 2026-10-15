from pathlib import Path
import json,hashlib,subprocess
R=Path(__file__).resolve().parents[6]
# Resolve from known owned evidence location without relying on the caller's cwd.
assert (R/'.git').exists(),R
T=R/'tickets/in-progress/shared-network-workspaces';E=Path(__file__).parent
j=json.loads((E/'input-audit.json').read_text())
def sig(p):
 b=Path(p).read_bytes();return {'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
fail=[]
for kind in ['protected','dist']:
 for p,v in j[kind].items():
  if not Path(p).is_file() or sig(p)!=v:fail.append([kind,p])
old=(E/'prior-solution-revision-record.md').read_bytes()
if not (T/'solution-revision-record.md').read_bytes().startswith(old):fail.append(['history','prefix'])
# Technical source and all historical specialists protected above; no edits outside owned docs.
changed=subprocess.check_output(['git','diff',j['head'],'--name-only'],cwd=R,text=True).splitlines()
allowed={str(Path(p).relative_to(R)) for p in j['owned_before']}
fail += [['unexpected-tracked-change',p] for p in changed if p not in allowed and not p.startswith(str(E.relative_to(R))+'/' ) and p!=str(T.relative_to(R)/'approval-record-sr024.md')]
for p,v in j['owned_before'].items():
 if sig(E/('prior-'+Path(p).name))!=v:fail.append(['snapshot',p])
for p in E.glob('*.json'):
 json.loads(p.read_text())
refs=sorted(set(j['reference_files']+[str(T/'approval-record-sr024.md')]+[str(p) for p in E.iterdir() if p.is_file()]+[str(E/'final-audit.json'),str(E/'package-index.json')]))
missing=[p for p in refs if not Path(p).is_file() and Path(p).name not in ['final-audit.json','package-index.json']]
fail += [['missing',p] for p in missing]
for token in ['Approved — SR-024','IV-F01','IV-F06','IV-D01','IV-D02','IV-D03','IV-R01','DEC016']:
 if token not in (T/'requirements-doc.md').read_text():fail.append(['missing-contract',token])
# REQ015 did not require a functional change.
def row(s,start):return next(x for x in s.splitlines() if x.startswith(start))
assert row((E/'prior-requirements-doc.md').read_text(),'| REQ-015 |')==row((T/'requirements-doc.md').read_text(),'| REQ-015 |')
result={'result':'PASS' if not fail else 'FAIL','inputHead':j['head'],'currentHead':subprocess.check_output(['git','rev-parse','HEAD'],cwd=R,text=True).strip(),'scope':'Artifact consistency and preservation only; no runtime/API tests','incomingReferences':len(j['reference_files']),'protectedUnchanged':len(j['protected']),'distUnchanged':len(j['dist']),'priorSolutionHistoryExactPrefix':not any(x[0]=='history' for x in fail),'changedTrackedFiles':changed,'referenceCount':len(refs),'failures':fail,'noProductionOrSpecialistEdits':not any(x[0] in ['protected','unexpected-tracked-change'] for x in fail),'latestUserBoundary':'All required VM cross-node filesystem cases before increment closeout; no agents required; physical/authenticated-agent/personal qualification deferred','apiStatusUnchanged':'API006 Blocked67.86%; new round belongs to API owner'}
(E/'final-audit.json').write_text(json.dumps(result,indent=2)+'\n')
manifest={p:sig(p) for p in refs if Path(p).is_file() and Path(p)!=E/'package-index.json'}
(E/'package-index.json').write_text(json.dumps({'revision':'SR024','status':'Approved acceptance / Ready design alignment','technicalDesign':'SR023/ARCH007 unchanged','task_size':'Large','architectural_risk':'High','incomingCount':len(j['reference_files']),'reference_files':refs,'manifest':manifest,'indexSelfHash':'N/A avoids self-reference'},indent=2)+'\n')
print(json.dumps(result,indent=2));assert not fail
