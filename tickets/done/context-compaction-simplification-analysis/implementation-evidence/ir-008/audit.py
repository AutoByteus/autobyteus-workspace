from pathlib import Path
import hashlib,json,subprocess,datetime
r=Path(__file__).resolve().parents[5];t=r/'tickets/in-progress/context-compaction-simplification-analysis';e=t/'implementation-evidence/ir-008'
def digest(p):return hashlib.sha256(p.read_bytes()).hexdigest() if p.is_file() else None
def cmd(*args):return subprocess.check_output(args,cwd=r)
def write(n,d):(e/n).write_text(json.dumps(d,indent=2)+'\n')
entry=json.loads((e/'entry-audit.json').read_text()); allowed=set(json.loads((e/'intervention-paths.json').read_text()))
allowed|={str((t/n).relative_to(r)) for n in ['implementation-handoff.md','implementation-revision-record.md']}
changes=[{'path':p,'before':h,'after':digest(r/p)} for p,h in entry['sha256'].items() if h!=digest(r/p)]
unexpected=[x for x in changes if x['path'] not in allowed]
write('owner-preservation.json',{'entryPins':len(entry['sha256']),'changed':changes,'unexpected':unexpected,'unchanged':len(entry['sha256'])-len(changes)})
core=json.loads((e/'core-dist-preemit.json').read_text())
now={str(p.relative_to(r)):digest(p) for p in (r/'autobyteus-ts/dist').rglob('*') if p.is_file()}
write('core-dist-emit-audit.json',{'beforeArchive':core['archive'],'beforeArchiveSha256':core['archiveSha256'],'archiveCurrentSha256':digest(Path(core['archive'])),'beforeCount':len(core['files']),'afterCount':len(now),'changed':[{'path':p,'before':h,'after':now.get(p)} for p,h in core['files'].items() if h!=now.get(p)],'new':{p:h for p,h in now.items() if p not in core['files']},'removed':[p for p in core['files'] if p not in now],'cleanDistRun':False})
apis=['test-support/live-e2e/'+x for x in ['live-e2e-harness.ts','run-live-e2e.mjs','compaction-quality-checks.ts','live-e2e-safe-error.ts']]
apis+=['autobyteus-server-ts/tests/unit/secret-management/'+x for x in ['live-e2e-harness.test.ts','live-e2e-compaction-boundary.test.ts','live-e2e-compaction-observation.test.ts']]
apis+=['autobyteus-server-ts/tests/e2e/'+x for x in ['server-settings/server-settings-graphql.e2e.test.ts','secret-management/real-e2e-compaction-quality.e2e.test.ts','secret-management/real-e2e-provider-capabilities.e2e.test.ts']]
apis+=['autobyteus-ts/tests/integration/agent/working-context-snapshot-restore-flow.test.ts','autobyteus-web/stores/__tests__/retainedActivityTermination.spec.ts']
write('api-owner-preservation.json',[{'path':p,'before':entry['sha256'].get(p),'after':digest(r/p),'unchanged':p in entry['sha256'] and entry['sha256'][p]==digest(r/p)} for p in apis])
scopes={
'autobyteus-server-ts/src/services/agent-streaming/agent-collaboration-view-projector.ts':[(15,40)],
'autobyteus-collaboration-stream-contracts/src/agent-org-execution-dtos.ts':[(131,145)],
'autobyteus-collaboration-stream-contracts/src/agent-run-collaboration-dtos.ts':[(40,53)],
'autobyteus-server-ts/src/agent-run-collaboration/domain/agent-run-collaboration-root.ts':[(57,76),(180,194),(309,360)],
'autobyteus-server-ts/src/agent-execution/services/agent-run-service.ts':[(112,140)],
'autobyteus-server-ts/src/agent-run-collaboration/services/agent-run-collaboration-root-manager.ts':[(176,186)],
'autobyteus-server-ts/src/agent-collaboration/execution/backends/root-agent-execution-registry.ts':[(63,75)],
'autobyteus-web/stores/agentRunStore.ts':[(426,493)],
'autobyteus-web/stores/agentRunCollaborationStore.ts':[(59,69),(112,122),(157,166)],
'autobyteus-web/services/agentCollaboration/agentRunCollaborationContext.ts':[(66,78),(145,164)],
'autobyteus-web/services/agentCollaboration/agentRunCollaborationHydration.ts':[(80,141)],
'autobyteus-web/services/agentCollaboration/agentRunCollaborationStreamingService.ts':[(193,215)],
'autobyteus-web/composables/agentCollaboration/useAgentRunCollaborationSync.ts':[(18,32)],
'autobyteus-web/services/runStatus/agentRuntimeStatusState.ts':[(25,35)],
'autobyteus-server-ts/tests/unit/agent-execution/root-recovery-command.test.ts':[(15,24)],
'autobyteus-server-ts/src/agent-collaboration/execution/domain/member-execution-context.ts':[(48,70)],
}
evidence=[]
for p,ranges in scopes.items():
 lines=(r/p).read_text().splitlines(); evidence.append({'path':p,'sha256':digest(r/p),'effectiveNonEmptyLines':sum(bool(x.strip()) for x in lines),'excerpts':[{'from':a,'to':min(b,len(lines)),'text':'\n'.join(f'{i+1}: {lines[i]}' for i in range(a-1,min(b,len(lines))))} for a,b in ranges]})
write('source-evidence.json',evidence)
interventions=json.loads((e/'intervention-paths.json').read_text())
write('source-inventory.json',[{'path':p,'entry':entry['sha256'].get(p),'current':digest(r/p),'kind':'deleted' if not (r/p).exists() else 'regenerated' if '/dist/' in p else 'mechanical-resolution'} for p in interventions])
for name,args in [('owned-diff-check',['git','diff','--cached','--check','--',*interventions]),('full-staged-diff-check',['git','diff','--cached','--check'])]:
 result=subprocess.run(args,cwd=r,stdout=subprocess.PIPE,stderr=subprocess.STDOUT)
 (e/(name+'.log')).write_bytes(result.stdout);(e/(name+'.exit')).write_text(str(result.returncode)+'\n')
stage=cmd('git','ls-files','--stage'); status=cmd('git','status','--porcelain=v1','-uall'); staged=cmd('git','diff','--cached','--name-only').decode().splitlines(); unstaged=cmd('git','diff','--name-only').decode().splitlines()
(e/'final-status.txt').write_bytes(status); (e/'final-index.txt').write_bytes(stage)
state={'head':cmd('git','rev-parse','HEAD').decode().strip(),'mergeHead':cmd('git','rev-parse','MERGE_HEAD').decode().strip(),'originPersonal':cmd('git','rev-parse','origin/personal').decode().strip(),'branch':cmd('git','branch','--show-current').decode().strip(),'mergeInProgress':True,'unmergedEntries':cmd('git','ls-files','-u').decode().splitlines(),'stagedPathCount':len(staged),'stagedPaths':staged,'unstagedTrackedPaths':unstaged,'indexListingSha256':hashlib.sha256(stage).hexdigest(),'statusSha256':hashlib.sha256(status).hexdigest(),'newCommit':False}
write('git-state.json',state)
refs=set(json.loads((e/'input-reference-index.json').read_text()))
refs|={str(p) for p in t.iterdir() if p.is_file()}
refs|={str(p) for p in (t/'delivery-evidence/dr-002').rglob('*') if p.is_file()}
refs|={str(p) for p in (r/'tickets/done/cross-scope-agent-mentions').glob('*.md')}
refs|={str(r/p) for p in scopes}
refs|={str(r/p) for p in json.loads((e/'upstream-paths.json').read_text()) if (r/p).is_file()}
refs|={str(p) for p in e.rglob('*') if p.is_file()}
# These audit products are created/rewritten below.
refs|={str(e/n) for n in ['reference-index.json','reference-check.json','final-audit.json']}
missing=sorted(p for p in refs if not Path(p).is_file() and p not in {str(e/n) for n in ['reference-index.json','reference-check.json','final-audit.json']})
valid=sorted(refs-set(missing));write('reference-index.json',{'paths':valid})
write('reference-check.json',{'currentReferenceCount':len(valid),'missingInheritedReferences':missing,'note':'Missing obsolete references are not inferred to have prior results; retained input index and beforeimages carry provenance.'})
checks={}
for p in e.glob('*.exit'):checks[p.stem]=int(p.read_text().strip())
backup=json.loads((t/'delivery-evidence/dr-002/integration-blocker.json').read_text())
write('final-audit.json',{'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'result':'Design Impact','findingIds':['IR008-DI001','IR008-LF001'],'taskSize':'Large','architecturalRisk':'High','entryPins':len(entry['sha256']),'unchangedPins':len(entry['sha256'])-len(changes),'changedPins':len(changes),'unexpectedChanges':unexpected,'apiDurablePathCount':len(apis),'apiAllUnchanged':all(entry['sha256'].get(p)==digest(r/p) for p in apis),'head':state['head'],'mergeHead':state['mergeHead'],'unmergedCount':len(state['unmergedEntries']),'mergeInProgress':True,'stagedPathCount':len(staged),'interventionPaths':len(interventions),'checks':checks,'deliveryBackup':backup['preMergeFileBackup'],'deliveryBackupExpectedSha256':backup['backupSha256'],'deliveryBackupActualSha256':digest(Path(backup['preMergeFileBackup'])),'fullAutomergeAuditComplete':False,'sourceReviewReady':False,'apiSignoff':False,'renderedResultVerified':False,'electronBuiltOrLaunched':False,'commitPushRelease':False,'referenceCount':len(valid)})
print(json.dumps({'pins':len(entry['sha256']),'changed':len(changes),'unexpected':unexpected,'apiAllUnchanged':all(entry['sha256'].get(p)==digest(r/p) for p in apis),'staged':len(staged),'unstagedTracked':unstaged,'refs':len(valid),'missing':missing,'checks':checks},indent=2))
