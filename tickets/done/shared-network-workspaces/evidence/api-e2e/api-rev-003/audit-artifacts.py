"""Evidence/reference/source/cleanup audit. Does not execute tests or change source."""
from pathlib import Path
import subprocess as sp,json,hashlib,re
R=Path.cwd();T=R/'tickets/in-progress/shared-network-workspaces';E=Path(__file__).resolve().parent
BASE='e8ed5627da2afa646c9ab89c6ce69b3a0bc0826c';canonical=[T/x for x in ['api-e2e-coverage-investigation.md','api-e2e-execution-coverage-report.md','api-e2e-revision-record.md','api-e2e-test-case-ledger.md']]
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def git(*a):return sp.check_output(['git',*a],cwd=R,text=True)
a={'result':'Running','inputHead':BASE,'currentHead':git('rev-parse','HEAD').strip(),'commands':[]}
try:
 allowed={str(x.relative_to(R)) for x in canonical};changed=set(git('diff','--name-only',BASE,'--').splitlines());unexpected=[x for x in changed if x not in allowed and not x.startswith(str(E.relative_to(R))+'/')];assert not unexpected,unexpected;a['onlyAPIOwnedPathsChanged']=True
 for name,args,expect in [('default',[],'4568593b99bb3dff263e9824ceb7176e04a95ec90e3cd14a9f7421b4e43055ac'),('actualArm64',['--engine-manifest','autobyteus-nfs/out/ir005-local-candidate/engine-candidate/engine-manifest.json'],'5563645d23aaac13aaa26948490d68dfc12fef31775bb66156185f9052ab0acc')]:
  argv=['/usr/bin/python3','-B','autobyteus-nfs/packaging/release.py','--source-hash',*args];p=sp.run(argv,cwd=R,capture_output=True,text=True);a['commands'].append({'argv':argv,'rc':p.returncode,'stdout':p.stdout,'stderr':p.stderr});assert p.returncode==0 and p.stdout.strip()==expect;a[name+'SourceHash']=expect
 test=R/'autobyteus-server-ts/tests/e2e/file-explorer/workspace-content-rest.e2e.test.ts';old=sp.check_output(['git','show',BASE+':'+str(test.relative_to(R))]);assert hashlib.sha256(old).hexdigest()==sha(test);a['cumulativeDurableTest']={'path':str(test),'sha256':sha(test),'unchanged':True}
 retained=json.loads((T/'implementation-evidence/ir-005/retained-candidate.json').read_text());a['retainedCandidate']=[{'path':x['path'],'sha256':sha(Path(x['path'])),'unchanged':sha(Path(x['path']))==x['sha256']} for x in retained['files']];assert all(x['unchanged'] for x in a['retainedCandidate'])
 oldrev=git('show',BASE+':'+str((T/'api-e2e-revision-record.md').relative_to(R)));newrev=(T/'api-e2e-revision-record.md').read_text();assert oldrev[oldrev.index('## API-REV-001'):].strip()==newrev[newrev.index('## API-REV-001'):newrev.index('## API-REV-003')].strip();a['priorAPIRevisionBodiesUnchanged']=True
 cleanup=json.loads((E/'cleanup.json').read_text());assert cleanup['result']=='Complete' and cleanup['scratchAbsent'] and not Path(cleanup['scratch']).exists();a['cleanupComplete']=True
 for pid in [26890,65865,57800]:assert sp.run(['/bin/ps','-p',str(pid),'-o','command='],capture_output=True).returncode!=0
 files=[p for p in E.rglob('*') if p.is_file() and '__pycache__' not in p.parts];a['jsonParseFailures']=[];a['snapshotOnlyRunningFields']=[]
 for p in files:
  if p.suffix=='.json':
   try:d=json.loads(p.read_text())
   except Exception as x:a['jsonParseFailures'].append({'path':str(p),'error':repr(x)});continue
   if isinstance(d,dict) and d.get('result')=='Running':a['snapshotOnlyRunningFields'].append(p.name)
 assert not a['jsonParseFailures'];allowedSnapshots={'guest-ssh-readiness.json','pre-client-resources.json','artifact-audit.json'};assert set(a['snapshotOnlyRunningFields'])<=allowedSnapshots;a['snapshotReconciliation']='Read-only interim snapshots inherited generic Running metadata; no live task. Final SSH/desktop/resource/cleanup receipts supersede their setup status, not their raw output.'
 a['hygiene']={'privateKeyPEMFiles':[],'credentialTokenPatternFiles':[],'excludedBytecode':[]}
 for p in files:
  if p.suffix in ('.png','.jpg'):continue
  raw=p.read_bytes()
  if re.search(rb'-----BEGIN (?:OPENSSH |RSA |EC )?PRIVATE KEY-----',raw):a['hygiene']['privateKeyPEMFiles'].append(str(p))
  if re.search(rb'(?:sk-proj-[A-Za-z0-9_-]{30,}|ghp_[A-Za-z0-9]{30,}|gho_[A-Za-z0-9]{30,})',raw):a['hygiene']['credentialTokenPatternFiles'].append(str(p))
 assert not a['hygiene']['privateKeyPEMFiles'] and not a['hygiene']['credentialTokenPatternFiles'];a['hygiene']['limits']='Pattern scan plus clean-env/build/input review; public SSH host/key and synthetic private sentinels are not live credentials. No claim of general secret detection.'
 upstream=json.loads((E/'upstream-package-index.json').read_text())['reference_files'];refs=set(upstream)|{str(p) for p in canonical}|{str(p) for p in files}|{str(E/x) for x in ['package-index.json','artifact-audit.json','evidence-manifest.json','routing.json']};refs|={str(R/x) for x in ['autobyteus-nfs/internal/setup/lifecycle.go','autobyteus-nfs/internal/service/supervisor.go','autobyteus-nfs/internal/docker/recreate.go','autobyteus-nfs/internal/docker/engine.go']}
 index={'round':'API-REV-003','result':'Fail','confidence':57.14,'broaderValidation':'Required','inputHead':BASE,'incomingCount':len(upstream),'referenceCount':len(refs),'reference_files':sorted(refs),'limits':'Full cumulative authorities/source/test/evidence retained. No prior failure relabelled. Current round no source/test edit. Routing receipt updates after confirmed send.'};(E/'package-index.json').write_text(json.dumps(index,indent=2)+'\n');a['missingReferences']=[x for x in refs if not Path(x).exists() and Path(x).name not in ['artifact-audit.json','evidence-manifest.json','routing.json']];assert not a['missingReferences'];a['incomingReferenceCount']=len(upstream);a['referenceCount']=len(refs)
 report=(T/'api-e2e-execution-coverage-report.md').read_text();a['acceptanceRows']=re.findall(r'^\| (\d{3}) \|',report,re.M);assert a['acceptanceRows']==[f'{i:03d}' for i in range(1,21)];a['confidenceScores']=[50,50,50,50,50,75,75];a['confidence']=round(sum(a['confidenceScores'])/7,2);assert a['confidence']==57.14
 a['expectedFailure']=json.loads((E/'new-failure-summary.json').read_text())['id'];assert json.loads((E/'managed-reboot-repro-result.json').read_text())['result']=='Reproduced';a['result']='Pass evidence consistency, not product validation'
except BaseException as x:a['result']='Fail evidence audit';a['error']=repr(x)
(E/'artifact-audit.json').write_text(json.dumps(a,indent=2)+'\n')
exclude={'evidence-manifest.json','routing.json','artifact-audit.json','package-index.json'}
m={'scope':'All substantive E3 evidence and canonical API artifacts. Excludes this manifest and mutable routing/audit/reference-index metadata to avoid circular hashes; raw evidence remains unchanged.','files':[{'path':str(p),'size':p.stat().st_size,'sha256':sha(p)} for p in sorted(set(canonical)|{p for p in E.rglob('*') if p.is_file() and '__pycache__' not in p.parts and p.name not in exclude})]};(E/'evidence-manifest.json').write_text(json.dumps(m,indent=2)+'\n');print(json.dumps({'result':a['result'],'error':a.get('error'),'referenceCount':a.get('referenceCount'),'substantiveFiles':len(m['files'])}),flush=True)
if a['result'].startswith('Fail'):raise SystemExit(1)
