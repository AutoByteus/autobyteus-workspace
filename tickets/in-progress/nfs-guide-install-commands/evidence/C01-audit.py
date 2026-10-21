# C01: own artifact and source audit before direct handoff;2c6b414/current66b00b8;macOS;2026-10-21.
from pathlib import Path
import subprocess,json,datetime,re
N=Path.cwd();T=N/'tickets/in-progress/nfs-guide-install-commands';E=T/'evidence'
files=sorted(p for p in E.rglob('*') if p.is_file() and re.match(r'^(R01-|R02-|C01-)',p.relative_to(E).parts[0]))
errors=[];raw=[]
for p in files:
 if p.suffix=='.png':continue
 data=p.read_text()
 if p.suffix=='.json':json.loads(data)
 if p.suffix=='.py':compile(data,str(p),'exec')
 if p.suffix=='.mjs':subprocess.run(['node','--check',str(p)],check=True,capture_output=True)
 assert not re.search(r'(?:ghp_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----)',data),p
 dirty=[i for i,l in enumerate(data.splitlines(),1) if l.rstrip()!=l]
 if dirty:raw.append({'path':str(p.relative_to(T)),'lines':dirty,'reason':'Original captured Nuxt log whitespace'})
 assert not dirty or p.name=='nuxt.log',p
assert not subprocess.check_output(['git','diff','--name-only'],text=True)
assert not subprocess.check_output(['git','diff','--name-only','2c6b41462a','HEAD','--',':!tickets'],text=True)
progress=(T/'api-e2e-test-progress.md').read_text()
for cid in ['R01','R02','R03','C01']:assert progress.count(f'| {cid} | Completed | Pass |')==1,cid
report=(T/'api-e2e-execution-coverage-report.md').read_text()
for s in ['Pass, 96.43%','Not Required — direct low-risk route','No installer','No Only The User Can Check','Not Affected/N/A','53tests','zero browser errors','NO release']:
 assert s.lower() in report.lower(),s
r=json.loads((E/'R02-attempt-2/result.json').read_text());assert r['result']=='Pass' and not r['errors']
assert json.loads((E/'R02-attempt-1/result.json').read_text())['result']=='Fail'
assert json.loads((E/'C01-cleanup.json').read_text())['pass']
summary=json.loads((E/'R02-summary.json').read_text());assert summary['clipboardChecks']==36 and not summary['installerOrReleaseRequests']
# JSON strict-schema/raw-output files use their companion result/header; no raw result fabricated.
result={'case':'C01','step':'Validate own evidence JSON/driver syntax/expected failed-attempt preservation and current source cleanliness','commit':subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip(),'environment':'NFS guide task/macOS no product rerun','date':datetime.datetime.now(datetime.timezone.utc).isoformat(),'ownedEvidenceFiles':len(files),'fourCasesCompleted':True,'allFiveCriteriaProvenInScopedReport':True,'productDeltaSinceImplementation':[],'durableTestChanges':[],'failedHarnessAttemptsPreserved':True,'secretPatternHits':[],'rawWhitespaceExceptions':raw,'pass':True}
(E/'C01-artifact-checks.json').write_text(json.dumps(result,indent=2)+'\n');print('C01 ARTIFACT AUDIT PASS',len(files),'evidence files')
