"""Audit the cumulative API004 package without mutating product/test source or prior evidence."""
from pathlib import Path
import json,hashlib,subprocess as sp,re
R=Path.cwd();T=R/'tickets/in-progress/shared-network-workspaces';E=Path(__file__).resolve().parent;head='902638e584d8e669b632cf81bcc0a95074892403'
allowed=[str((T/x).relative_to(R)) for x in ['api-e2e-coverage-investigation.md','api-e2e-execution-coverage-report.md','api-e2e-revision-record.md','api-e2e-test-case-ledger.md']]
def git(*a):return sp.check_output(['git',*a],cwd=R,text=True).strip()
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
up=json.loads((E/'upstream-package-index.json').read_text())['reference_files'];assert len(up)==774
expected=[E/'package-index.json',E/'artifact-audit.json',E/'evidence-manifest.json']
refs=sorted(set(up+[str(x) for x in E.iterdir() if x.is_file()]+[str(x) for x in expected]+[str(R/x) for x in allowed]))
for p in expected:
 if not p.exists():p.write_text('{}\n')
missing=[p for p in refs if not Path(p).is_file()];assert not missing
changes=git('diff',head,'--name-only').splitlines();bad=[p for p in changes if p not in allowed and not p.startswith(str(E.relative_to(R))+'/')];assert not bad,bad
prefix={}
for name in ['api-e2e-revision-record.md','api-e2e-test-case-ledger.md','api-e2e-coverage-investigation.md']:
 p=T/name;old=sp.check_output(['git','show',head+':'+str(p.relative_to(R))],cwd=R);prefix[name]={'beforeSHA256':hashlib.sha256(old).hexdigest(),'prefixPreserved':p.read_bytes().startswith(old)};assert prefix[name]['prefixPreserved']
ret=json.loads((E/'retained-input-audit.json').read_text())['files'];retained=[{'path':v['path'],'same':sha(Path(v['path']))==v['sha256'] and Path(v['path']).stat().st_size==v['size']} for v in ret];assert all(v['same'] for v in retained)
critical=['selected-create-confirm-result.json','two-reboots-result.json','normal-stop-result.json','policy-veto-result.json','node-upgrade-result.json','drained-detach-confirm-result.json','mac-native-result.json','native-client-v2-result.json','native-detach-result.json','preview-http-current-contract-result.json']
results={n:json.loads((E/n).read_text())['result'] for n in critical};assert all(v=='Pass' for v in results.values())
for n in ['preview-external-change-result.json','visibility-repro-result.json']:results[n]=json.loads((E/n).read_text())['result'];assert results[n]=='Fail'
cleanup=json.loads((E/'cleanup.json').read_text());assert cleanup['result']=='Complete' and cleanup['scratchAbsent'] and cleanup['ownedHostImageTagAbsent'] and all(cleanup['preexistingGeneratedDirs'].values())
jsonErrors=[]
for p in E.glob('*.json'):
 try:json.loads(p.read_text())
 except Exception as x:jsonErrors.append({'path':str(p),'error':str(x)})
assert not jsonErrors
pyErrors=[]
for p in E.glob('*.py'):
 try:compile(p.read_text(),str(p),'exec')
 except Exception as x:pyErrors.append({'path':str(p),'error':str(x)})
assert not pyErrors
unsafeNames=[p.name for p in E.iterdir() if ':' in p.name];assert not unsafeNames
secretHits=[]
for p in E.iterdir():
 if p.suffix in ['.json','.log','.md','.py','.mjs','.txt']:
  s=p.read_text(errors='replace')
  if re.search(r'-----BEGIN (?:OPENSSH |RSA |EC )?PRIVATE KEY-----|sk-ant-api\d{2}-[A-Za-z0-9_-]{30,}|gh[pousr]_[A-Za-z0-9]{30,}',s):secretHits.append(p.name)
assert not secretHits,secretHits
package={'round':'API-REV-004','result':'Fail','confidencePercent':57.14,'broaderValidation':'Required','inputHead':head,'sourceCommit':'d318bd9db935affdf16d141ef4e88a6c0e4939b5','classification':{'task_size':'Large','architectural_risk':'High'},'incomingReferenceCount':len(up),'referenceCount':len(refs),'reference_files':refs};(E/'package-index.json').write_text(json.dumps(package,indent=2)+'\n')
audit={'result':'Pass','inputHead':head,'referenceCount':len(refs),'incomingReferencesPreserved':len(up),'missing':missing,'trackedChangedPaths':changes,'noProductionOrDurableTestChange':not bad,'historicalPrefixes':prefix,'retainedCandidates':retained,'criticalResults':results,'jsonErrors':jsonErrors,'pythonSyntaxErrors':pyErrors,'unsafeNames':unsafeNames,'sensitiveKeyPatternHits':secretHits,'cleanupResult':cleanup['result'],'limits':'Artifact audit is not product qualification or test pass; failing runtime evidence remains Fail. No fresh full-source review claimed.'};(E/'artifact-audit.json').write_text(json.dumps(audit,indent=2)+'\n')
manifest={'scope':'All API004 files and current API canonical docs except this self-referential manifest; immutable at generation, handoff receipt if later added requires regeneration.','files':[{'path':str(p),'sha256':sha(p),'size':p.stat().st_size} for p in sorted([x for x in E.iterdir() if x.is_file() and x.name!='evidence-manifest.json']+[R/x for x in allowed])]};(E/'evidence-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(json.dumps({'result':audit['result'],'referenceCount':len(refs),'evidenceFiles':len(list(E.iterdir())),'sourceTestChanges':bad,'cleanup':cleanup['result']}))
