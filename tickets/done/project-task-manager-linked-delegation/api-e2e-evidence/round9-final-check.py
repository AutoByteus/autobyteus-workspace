from pathlib import Path
import json,hashlib,datetime,re,subprocess
W=Path('/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-manager-linked-delegation');T=W/'tickets/in-progress/project-task-manager-linked-delegation';E=T/'api-e2e-evidence';now=datetime.datetime.now(datetime.timezone.utc).isoformat()
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
start=json.loads((E/'api-009-round9-input-preservation.json').read_text());allowed={str(T/n) for n in ['api-e2e-coverage-investigation.md','api-e2e-execution-coverage-report.md','api-e2e-revision-record.md','api-e2e-test-case-ledger.md']}
package=[]
for p,h in start['reviewedPackage'].items():
 f=W/p;package.append({'path':p,'incomingSha256':h,'currentSha256':sha(f) if f.is_file() else None,'unchanged':f.is_file() and sha(f)==h})
refs=[]
for p,h in start['references'].items():
 f=Path(p);refs.append({'path':p,'incomingSha256':h,'currentSha256':sha(f) if f.is_file() else None,'unchanged':f.is_file() and sha(f)==h,'intentionalCanonicalUpdate':p in allowed})
assert len(package)==287 and all(x['unchanged'] for x in package)
assert len(refs)==1329 and all(x['unchanged'] or x['intentionalCanonicalUpdate'] for x in refs)
branch=subprocess.check_output(['git','branch','--show-current'],cwd=W,text=True).strip();head=subprocess.check_output(['git','rev-parse','HEAD'],cwd=W,text=True).strip();assert branch==start['branch'] and head==start['head']
status=subprocess.check_output(['git','status','--short'],cwd=W,text=True);fullStatus=subprocess.check_output(['git','status','--short','--untracked-files=all'],cwd=W,text=True)
oldNonTicket=[x for x in (E/'api-009-round9-input-git-status.txt').read_text().splitlines() if 'tickets/' not in x];newNonTicket=[x for x in status.splitlines() if 'tickets/' not in x];assert oldNonTicket==newNonTicket
(E/'api-009-round9-final-git-status.txt').write_text(fullStatus)
diff=subprocess.run(['git','diff','--check'],cwd=W,text=True,capture_output=True);(E/'api-016-round9-final-diffcheck.log').write_text('cwd='+str(W)+'\ncommand=git diff --check\n'+diff.stdout+diff.stderr+'\nPROCESS_EXIT_CODE='+str(diff.returncode)+'\n');assert diff.returncode==0
archive=json.loads((E/'api-009-round9-owned-evidence-manifest.json').read_text());files=archive['files'];assert len(files)==58
for x in files: assert Path(x['archive']).is_file() and sha(Path(x['archive']))==x['sha256']
prior=json.loads((E/'api-008-coverage-inventory.json').read_text());paths=prior['retainedCumulativePaths']+prior['newUpdated'];assert len(set(paths))==15
cov={'at':now,'round':'API-REV-009','newAdded':[],'newUpdated':[],'newRemoved':[],'retainedCumulativePaths':paths,'currentHashes':[{'path':p,'sha256':sha(W/p),'incomingCRR012Sha256':start['references'].get(str(W/p)),'unchangedThisRound':start['references'].get(str(W/p))==sha(W/p)} for p in paths],'decision':'No round9 source/durable test edit. All15 cumulative paths including API8 compact HTTP oracle carried for later successful Large/High proportional review, not current successful-test review. Temporary actual-product probes remain evidence only.'};assert all(x['unchangedThisRound'] for x in cov['currentHashes']);(E/'api-009-round9-coverage-inventory.json').write_text(json.dumps(cov,indent=2)+'\n')
logInventory=[]
for p in sorted(E.glob('*round9*.log')):
 s=p.read_text();exits=re.findall(r'PROCESS_EXIT_CODE=(\d+)',s);logInventory.append({'path':str(p),'command':next((x[8:] for x in s.splitlines() if x.startswith('command=')),None),'innerExit':int(exits[-1]) if exits else None,'testFiles':[x for x in s.splitlines() if x.strip().startswith('Test Files')],'tests':[x for x in s.splitlines() if x.strip().startswith('Tests ')],'tail':s.splitlines()[-4:]})
(E/'api-009-round9-execution-inventory.json').write_text(json.dumps(logInventory,indent=2)+'\n')
result={'at':now,'round':'API-REV-009','branch':branch,'head':head,'inputReferenceCount':len(refs),'reviewedPackageCount':len(package),'reviewedPackageUnchanged':all(x['unchanged'] for x in package),'reviewedPackage':package,'incomingReferenceChecks':refs,'intentionalCanonicalAPIUpdates':[x['path'] for x in refs if not x['unchanged'] and x['intentionalCanonicalUpdate']],'unexpectedIncomingChanges':[],'normalNonTicketGitStatusExactlyUnchanged':True,'nonTicketStatus':newNonTicket,'diffCheckExit':diff.returncode,'cumulativeDurableCount':15,'currentHttpOracleSha256':sha(W/'autobyteus-server-ts/tests/e2e/projects/project-task-boundaries.e2e.test.ts'),'ownedArchiveCount':58,'ownedArchiveHashesVerified':True,'executionLogCount':len(logInventory),'scope':'Preservation only; no source/test edits and no product repair. Old API evidence/history/packets/supplements untouched. Only four canonical API artifact changes allowed.'}
(E/'api-009-round9-final-preservation.json').write_text(json.dumps(result,indent=2)+'\n')
owners=['autobyteus-server-ts/src/api/graphql/types/collaboration-root-history.ts','autobyteus-server-ts/src/run-history/services/collaboration-root-history-service.ts','autobyteus-server-ts/src/services/agent-streaming/collaboration-execution-tree-dto-projection.ts','autobyteus-server-ts/src/run-history/store/agent-org-run-execution-tree-store.ts','autobyteus-server-ts/tests/unit/run-history/services/collaboration-root-history-readiness.test.ts','autobyteus-web/stores/runHistoryLoadActions.ts','autobyteus-web/stores/runHistoryStoreSupport.ts','autobyteus-web/types/collaboration/agentOrgExecution.ts','autobyteus-web/stores/__tests__/runHistoryStore.spec.ts','autobyteus-server-ts/tests/integration/agent-run-collaboration/native-compaction-root-fixture.ts','autobyteus-server-ts/src/agent-collaboration/collaborators/collaborator-definition-catalog.ts','test-support/native-input-history/native-accepted-input-history.integration.test.ts','autobyteus-web/components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.regressions.spec.ts','autobyteus-web/composables/useWorkspaceHistorySelectionActions.ts','autobyteus-web/stores/agentSelectionStore.ts']
refsSet=set(start['references'])|{str(W/p) for p in paths}|{str(W/p) for p in owners}
# All retained round9 files, including recursive owned data / raw byte baselines / failed attempts.
for p in E.rglob('*'):
 if p.is_file() and any('round9' in part for part in p.relative_to(E).parts):refsSet.add(str(p))
for p in [E/'api-009-round9-reference-files.json',E/'api-009-round9-reference-check.json']:refsSet.add(str(p))
(E/'api-009-round9-reference-files.json').write_text(json.dumps(sorted(refsSet),indent=2)+'\n')
check={'at':now,'round':'API-REV-009','references':len(refsSet),'incomingReferencesIncluded':len(set(start['references']) & refsSet),'reviewedSourceTestPackageIncluded':len({str(W/p) for p in start['reviewedPackage']} & refsSet),'durablePathsIncluded':len({str(W/p) for p in paths} & refsSet),'missing':[],'outsideWorktree':[],'purpose':'Complete cumulative actual upstream plus every round9 evidence/probe/archive/baseline file, carried15 durable tests and public history/stale fixture owners. Current Fail requests focused origin review, not successful-test review.'}
(E/'api-009-round9-reference-check.json').write_text(json.dumps(check,indent=2)+'\n')
missing=[p for p in refsSet if not Path(p).is_file()];check['missing']=missing;check['outsideWorktree']=[p for p in refsSet if not Path(p).is_relative_to(W)];assert not missing and not check['outsideWorktree'];assert check['incomingReferencesIncluded']==1329 and check['reviewedSourceTestPackageIncluded']==287 and check['durablePathsIncluded']==15
(E/'api-009-round9-reference-check.json').write_text(json.dumps(check,indent=2)+'\n')
print(json.dumps({'packageUnchanged':287,'incomingReferences':1329,'intentionalAPIUpdates':len(result['intentionalCanonicalAPIUpdates']),'nonTicketStatusSame':True,'diffCheckExit':0,'archiveHashesVerified':58,'durableUnchanged':15,'executionLogs':len(logInventory),'completeReferenceFiles':len(refsSet),'missing':missing}))
