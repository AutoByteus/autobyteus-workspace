from pathlib import Path
import json,hashlib,subprocess as sp,re
R=Path.cwd();T=R/'tickets/in-progress/shared-network-workspaces';E=Path(__file__).resolve().parent;a=json.loads((E/'input-audit.json').read_text())
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
allowed={str((T/n).relative_to(R)) for n in ['code-review-report.md','code-review-revision-record.md']}
for p,h in a['files'].items():
 if p not in allowed:assert sha(R/p)==h,p
for p,h in a['oldDist'].items():assert sha(R/p)==h,p
for r in a['oldArtifacts']+a['newArtifacts']:
 p=Path(r['path']);assert sha(p)==r['sha256'] and p.stat().st_size==r['size'],str(p)
nb=int((E/'input-history-bytes.txt').read_text());prefix=(T/'code-review-revision-record.md').read_bytes()[:nb]
assert hashlib.sha256(prefix).hexdigest()==(E/'prior-history.sha256').read_text().strip()
checks=json.loads((E/'checks-result.json').read_text());assert len(checks)==12 and all(r['rc']==r['expected'] for r in checks)
assert json.loads((E/'cleanup.json').read_text())['removed']
assert not Path((E/'scratch-path.txt').read_text().strip()).exists()
for p in E.glob('*.py'):compile(p.read_text(),str(p),'exec')
for p in E.glob('*.json'):json.loads(p.read_text())
report=(T/'code-review-report.md').read_text();assert report.count('| Pass |')>=24 and report.count('| 10.0 |')==10
assert not sp.check_output(['git','diff','d3c88f3','--','autobyteus-nfs']).strip()
prod=sp.run(['git','diff','--check','7b2db1b','d3c88f3'],capture_output=True,text=True);assert prod.returncode==0
(E/'source-whitespace.log').write_text(prod.stdout+prod.stderr)
whitespace=[]
for p in E.rglob('*'):
 if p.is_file() and p.name not in ['artifact-whitespace.json','input-audit.json','prior-code-review-report-crr012.md']:
  for i,l in enumerate(p.read_text().splitlines(),1):
   if l.rstrip(' \t')!=l:whitespace.append({'path':str(p.relative_to(R)),'line':i,'text':l})
assert all(r['path'].endswith('/go-race.log') for r in whitespace),whitespace
(E/'artifact-whitespace.json').write_text(json.dumps({'rawDiagnosticLines':whitespace,'note':'Retained raw evidence; source whitespace passes independently; artifact-only blank-at-eol exception'},indent=2)+'\n')
refs=sorted(set(a['references']+[str(p) for p in E.rglob('*') if p.is_file()]+[str(E/'package-index.json'),str(E/'final-checks.json')]))
final={'result':'Pass implementation source CRR013, not API/product closure','reviewScope':'Full Re-Audit','score':100,'source':a['source'],'input':a['head'],'inputReferencesRetained':len(a['references']),'referenceCount':len(refs),'protectedInputPathsVerified':a['protectedCount'],'oldArtifactsUnchanged':len(a['oldArtifacts']),'newArtifactsVerified':len(a['newArtifacts']),'oldDistFilesUnchanged':len(a['oldDist']),'priorHistoryPrefixUnchanged':True,'reviewerCheckCommands':len(checks),'intendedMutationFailures':3,'sourceWhitespace':'Pass','rawDiagnosticWhitespaceLines':len(whitespace),'cleanup':'Complete','apiAuthority':'API005 Fail57.14% broader Required unchanged','productClosure':'Not claimed; public API-F005 FIRST','productionEdits':False,'releaseOrTaskDoneClaim':False}
(E/'final-checks.json').write_text(json.dumps(final,indent=2)+'\n')
(E/'package-index.json').write_text(json.dumps({'round':'CRR-013','result':'Pass implementation source only','task_size':'Large','architectural_risk':'High','sourceCommit':a['source'],'inputCommit':a['head'],'incomingReferenceCount':len(a['references']),'referenceCount':len(refs),'reference_files':refs},indent=2)+'\n')
assert all(Path(p).is_file() for p in refs)
print(json.dumps(final))
