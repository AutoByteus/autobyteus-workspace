"""Final evidence/source audit; no test execution or product mutation."""
from pathlib import Path
import ast,hashlib,json,subprocess as sp,time
R=Path.cwd();T=R/'tickets/in-progress/shared-network-workspaces';E=Path(__file__).resolve().parent
h=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
a=json.loads((E/'input-audit.json').read_text());r={'time':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()),'inputHead':a['head'],'checks':{}}
r['currentHead']=sp.check_output(['git','rev-parse','HEAD'],text=True).strip()
r['checks']['changedSourcePathsByteIdentical']=all(h(R/p)==v for p,v in a['changedSourcePaths'].items())
r['productionHash']=sp.check_output(['python3','autobyteus-nfs/packaging/release.py','--source-hash'],text=True).strip();r['checks']['productionHashMatches']=r['productionHash']=='497efd6abb0c2cfa4c740a87f005c529cbf026a6fa218b3acd345826f4a923da'
r['trackedDelta']=sp.check_output(['git','diff','--name-only',a['head']],text=True).splitlines();r['checks']['onlyTicketTrackedChanges']=all(x.startswith('tickets/in-progress/shared-network-workspaces/') for x in r['trackedDelta'])
j=json.loads((E/'package-index.json').read_text());j['round2Evidence']=[str(p) for p in sorted(E.iterdir()) if p.is_file() and p.name not in ['package-index.json','artifact-audit.json','evidence-manifest.json']];(E/'package-index.json').write_text(json.dumps(j,indent=2)+'\n')
def leaves(x):
 if isinstance(x,str):yield x
 elif isinstance(x,dict):
  for v in x.values():yield from leaves(v)
 elif isinstance(x,list):
  for v in x:yield from leaves(v)
refs=sorted(set(x for x in leaves(j) if x.startswith(str(R)+'/')));r['attachmentCount']=len(refs);r['missingReferences']=[x for x in refs if not Path(x).is_file()];r['checks']['allReferencesExist']=not r['missingReferences']
r['jsonFilesParsed']=[];r['pythonFilesParsed']=[]
for p in sorted(E.iterdir()):
 if p.suffix=='.json':json.loads(p.read_text());r['jsonFilesParsed'].append(p.name)
 if p.suffix=='.py':ast.parse(p.read_text());r['pythonFilesParsed'].append(p.name)
r['checks']['allArtifactJSONAndPythonParse']=True
c=json.loads((E/'cleanup.json').read_text());r['checks']['allOwnedResourcesRetired']=c['result']=='Complete' and c['scratchAbsent'] and not Path(c['scratch']).exists() and not c['ownedVMProcessesRemaining'] and all(x['absent'] for x in c['mac']) and all(x['processAbsent'] and x['cloneAbsent'] for x in c['linux'])
r['checks']['priorFailureResolvedFirst']=json.loads((E/'prior-failure-resolution.json').read_text())['priorFailure']=='API-F001 / CR002'
r['checks']['newLinuxFailureReproduced']=all(json.loads((E/n).read_text())['result']=='Fail' for n in ['linux-native-result.json','linux-native-repro-result.json'])
trace={x['name']:x for x in json.loads((E/'linux-native-trace-corrected.json').read_text())};r['checks']['diagnosticSourceMountContrast']=trace['strace-internal-probe-source']['rc']==0 and trace['strace-internal-probe-mount']['rc']==1 and 'EREMOTEIO' in trace['strace-internal-probe-mount']['stderr'] and trace['ordinary-mounted-read-and-source-identity']['rc']==0 and trace['public-reconnect-fresh-repro']['rc']==1
r['checks']['apiOwnedDurableTestUnchanged']=sp.check_output(['git','diff',a['head'],'--','autobyteus-server-ts/tests/e2e/file-explorer/workspace-content-rest.e2e.test.ts'],text=True)==''
r['untrackedStatus']=sp.check_output(['git','status','--short','--untracked-files=normal'],text=True)
r['result']='Pass' if all(r['checks'].values()) else 'Fail';(E/'artifact-audit.json').write_text(json.dumps(r,indent=2)+'\n')
m={str(p.relative_to(R)):{'sha256':h(p),'bytes':p.stat().st_size} for p in sorted(E.iterdir()) if p.is_file() and p.name!='evidence-manifest.json'}
for n in ['api-e2e-coverage-investigation.md','api-e2e-execution-coverage-report.md','api-e2e-revision-record.md','api-e2e-test-case-ledger.md']:p=T/n;m[str(p.relative_to(R))]={'sha256':h(p),'bytes':p.stat().st_size}
(E/'evidence-manifest.json').write_text(json.dumps({'selfExcluded':True,'files':m},indent=2)+'\n')
print(json.dumps({'result':r['result'],'checks':r['checks'],'references':len(refs),'trackedDelta':r['trackedDelta']},indent=2));assert r['result']=='Pass'
