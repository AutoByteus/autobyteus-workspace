from pathlib import Path
import json,hashlib,ast,subprocess as sp
R=Path.cwd();E=Path(__file__).resolve().parent;T=E.parent.parent.parent
j=lambda p:json.loads(p.read_text())
assert j(E/'artifact-audit.json')['result']=='Pass';assert j(E/'cleanup.json')['result']=='Complete';assert j(E/'mac-cleanup.json')['result']=='Complete'
raw=j(E/'upstream-package-index.json')['reference_files'];refs=set(raw)
refs.update(str(p) for p in E.iterdir() if p.is_file())
refs.update(str(E/n) for n in ['package-index.json','evidence-manifest.json','final-checks.json'])
refs.update(str(R/p) for p in ['autobyteus-nfs/internal/platform/source.go','autobyteus-nfs/internal/config/state.go','autobyteus-nfs/internal/setup/lifecycle.go','autobyteus-nfs/internal/service/supervisor.go'])
assert len(raw)==1122
p={'round':'API-REV-005','result':'Fail','confidencePercent':57.14,'broaderValidation':'Required','sourceCommit':'d65aeda24fc4b9a534a3941b194dd4a55b88c00c','inputHead':'d963097b6e3d0cf80e3bf4e86d900173b671fd26','sourceReview':'CRR011 / da124edf1230a0cd4da2780766497c48f7a9723b','requirements':'Approved SR018','design':'Ready SR022 / ARCH-REV006','implementation':'IR008','task_size':'Large','architectural_risk':'High','incomingReferenceCount':1122,'referenceCount':len(refs),'reference_files':sorted(refs),'priorFailureResolution':'API-F004 Linux native/Docker storage native/actualmanagedHTTP scope resolved; API-F003 Linux node scope remains resolved','newFailure':'API-F005 nativeMac normal reboot persisted source device identity rejection','notReleaseQualified':True,'noProductionOrDurableTestEdits':True,'note':'Index includes itself/manifest/final checks as reference paths. Manifest excludes only itself and final checks to avoid hash cycles.'};(E/'package-index.json').write_text(json.dumps(p,indent=2)+'\n')
excluded={str(E/'evidence-manifest.json'),str(E/'final-checks.json')};files=[]
for f in sorted(refs-excluded):
 q=Path(f);assert q.is_file(),f;files.append({'path':f,'sha256':hashlib.sha256(q.read_bytes()).hexdigest(),'size':q.stat().st_size})
manifest={'round':'API-REV-005','scope':'Complete current cumulative reference package, excluding self and final-checks to avoid hash cycles','files':files};(E/'evidence-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
syntax=[]
for q in E.glob('*.py'):ast.parse(q.read_text());syntax.append(q.name)
parsed=[]
for q in E.glob('*.json'):
 if q.name=='final-checks.json':continue
 json.loads(q.read_text());parsed.append(q.name)
check=sp.run(['git','diff','--check','--',*[str(T/n) for n in ['api-e2e-coverage-investigation.md','api-e2e-execution-coverage-report.md','api-e2e-revision-record.md','api-e2e-test-case-ledger.md']]],capture_output=True,text=True);assert check.returncode==0
f={'result':'Pass — evidence/package audit, NOT product validation','productResult':'Fail API-F005','incomingPreserved':len(set(raw)&refs)==1122,'referenceCount':len(refs),'manifestFiles':len(files),'manifestSHA256':hashlib.sha256((E/'evidence-manifest.json').read_bytes()).hexdigest(),'pythonSyntax':syntax,'jsonParsed':parsed,'sourceAndIncomingAudit':'artifact-audit.json','revisionPrefixPreserved':j(E/'artifact-audit.json')['revisionPrefixPreserved'],'retainedCandidates19Unchanged':j(E/'artifact-audit.json')['retainedAllUnchanged'],'priorDist286Changed':j(E/'artifact-audit.json')['priorDistChanged'],'cleanup':'Complete; exact test resources only','canonicalMarkdownWhitespace':{'rc':check.returncode,'stdout':check.stdout,'stderr':check.stderr},'rawLogs':'Preserved, not blanket whitespace-clean claim','selectedRule':j(E/'routing.json')['selected'],'noMergePushReleaseTaskDone':True};(E/'final-checks.json').write_text(json.dumps(f,indent=2)+'\n')
assert all(Path(x).is_file() for x in refs);print(json.dumps({'result':f['result'],'productResult':f['productResult'],'referenceCount':len(refs),'manifestFiles':len(files),'pythonFiles':len(syntax),'jsonFiles':len(parsed)+1},indent=2))
