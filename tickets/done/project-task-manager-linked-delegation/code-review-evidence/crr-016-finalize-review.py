from pathlib import Path
import hashlib, json, subprocess, datetime
W=Path(__file__).resolve().parents[4];T=W/'tickets/in-progress/project-task-manager-linked-delegation';C=T/'code-review-evidence'
sha=lambda p: hashlib.sha256(p.read_bytes()).hexdigest() if p.is_file() else None
git=lambda *args: subprocess.check_output(['git',*args],cwd=W)
b=json.loads((C/'crr-016-input-preservation.json').read_text()); expected={str(T/'code-review-report.md'),str(T/'code-review-revision-record.md')}
missing=[p for p in b['references'] if not Path(p).is_file()]
changed=[p for p,h in b['references'].items() if sha(Path(p))!=h]
assert not missing and set(changed)==expected,(missing,changed)
dirty={}
for e in git('status','--porcelain=v1','--untracked-files=all','-z').split(b'\0'):
 if not e: continue
 s=e[:2].decode();p=e[3:].decode()
 if p.startswith('tickets/'):continue
 dirty[p]={'status':s,'sha256':sha(W/p)}
assert dirty==b['nonTicketDirty'],'source/test/status drift during review'
idx=Path(git('rev-parse','--git-path','index').decode().strip());idx=idx if idx.is_absolute() else W/idx
assert sha(idx)==b['indexSha256'],'index changed during review'
assert git('rev-parse','HEAD').decode().strip()==b['head']
assert git('diff','--name-only','--diff-filter=U').decode().splitlines()==b['unmerged']
a=json.loads((T/'api-e2e-evidence/api-012-durable-drift.json').read_text()); assert len(a['currentCumulativePaths'])==20
assert all(sha(W/p)==h for p,h in a['currentHashes'].items()),'API durable path changed since incoming final'
r=T/'code-review-revision-record.md';assert 'CRR-001' in r.read_text() and '## CRR-016' in r.read_text()
out={'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'incomingReferenceCount':len(b['references']),'missingIncoming':missing,'changedIncoming':changed,'unexpectedIncomingChanges':[],'sourceTestNonTicketStatusAndHashesUnchangedDuringReview':True,'nonTicketDirtyIndividualPaths':len(dirty),'indexHashUnchanged':True,'headUnchanged':b['head'],'unmergedUnchanged':b['unmerged'],'API20CurrentFinalHashesUnchanged':True,'APIOriginalInputEqualsCurrentCandidate':False,'originalCRR015ArchiveMatchesIncomingReport':sha(C/'crr-015-completed-report.md')==b['references'][str(T/'code-review-report.md')],'reviewerChanges':'Only own report/history/evidence; no source/test/Git integration/app/provider operation','note':'API input-to-new-base drift preserved, not hidden by reviewer input preservation'}
(C/'crr-016-final-preservation.json').write_text(json.dumps(out,indent=2)+'\n')
(C/'crr-016-final-git-status.txt').write_bytes(git('status','--porcelain=v1','--untracked-files=all'))
files=set(json.loads((T/'api-e2e-evidence/api-012-reference-files.json').read_text()))
files.update(str(p) for p in C.rglob('crr-016*') if p.is_file())
files.update(str(p) for p in (C/'crr-016-origin-snapshots').rglob('*') if p.is_file())
for p in ['autobyteus-server-ts/src/built-in-agents/built-in-agent-bootstrapper.ts','autobyteus-server-ts/src/agent-collaboration/execution/backends/configured-agent-activation-planner.ts','autobyteus-server-ts/src/agent-team-execution/task-delegation/task-execution-identity-capabilities.ts','autobyteus-server-ts/src/agent-execution/services/agent-run-identity-allocator.ts','autobyteus-server-ts/tests/integration/agent-run-collaboration/native-root-fixture-cleanup.integration.test.ts','autobyteus-server-ts/src/api/graphql/types/collaboration-root-history.ts','autobyteus-web/graphql/queries/collaborationRootHistoryQueries.ts','autobyteus-web/stores/runHistoryLoadActions.ts','autobyteus-web/stores/runHistoryStoreSupport.ts','autobyteus-web/stores/runHistoryStore.ts']:
 files.add(str(W/p))
manifest=C/'crr-016-reference-files.json';files.add(str(manifest));manifest.write_text(json.dumps(sorted(files),indent=2)+'\n')
assert all(Path(p).is_file() for p in files)
print(json.dumps({k:out[k] for k in ['incomingReferenceCount','missingIncoming','changedIncoming','nonTicketDirtyIndividualPaths','indexHashUnchanged','API20CurrentFinalHashesUnchanged']},indent=2));print('complete current cumulative reference files:',len(files))
