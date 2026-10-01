from pathlib import Path
import hashlib,json,subprocess,datetime,difflib
r=Path('/Users/normy/autobyteus_org/autobyteus-worktrees/context-compaction-simplification-analysis');p=r/'tickets/in-progress/context-compaction-simplification-analysis';e=p/'solution-recovery-evidence/sr035'
def h(q):return hashlib.sha256(q.read_bytes()).hexdigest() if q.is_file() else None
def write(n,o):(e/n).write_text(json.dumps(o,indent=2)+'\n')
def git(*a):return subprocess.check_output(['git',*a],cwd=r)
scopes={
'autobyteus-server-ts/src/agent-run-collaboration/domain/agent-run-collaboration-root.ts':[(57,76),(180,199),(306,364)],
'autobyteus-server-ts/src/agent-run-collaboration/services/agent-run-collaboration-root-manager.ts':[(115,137),(164,212)],
'autobyteus-server-ts/src/agent-run-collaboration/services/agent-run-collaboration-member-view-projection-service.ts':[(42,76)],
'autobyteus-server-ts/src/agent-execution/services/agent-run-service.ts':[(113,140)],
'autobyteus-server-ts/src/agent-execution/services/standalone-agent-run-lifecycle-service.ts':[(75,90)],
'autobyteus-server-ts/src/agent-execution/services/standalone-agent-run-collaboration-binding.ts':[(1,25)],
'autobyteus-server-ts/src/services/agent-streaming/agent-collaboration-view-projector.ts':[(15,42)],
'autobyteus-server-ts/src/services/agent-streaming/agent-collaboration-stream-handler.ts':[(44,108)],
'autobyteus-server-ts/src/api/graphql/types/agent-run-collaboration.ts':[(40,61)],
'autobyteus-server-ts/src/agent-collaboration/execution/services/root-event-publisher.ts':[(25,90)],
'autobyteus-server-ts/src/agent-collaboration/execution/domain/live-agent-input-snapshot.ts':[(1,3)],
'autobyteus-server-ts/src/agent-collaboration/execution/backends/root-agent-execution-registry.ts':[(43,78)],
'autobyteus-server-ts/src/agent-collaboration/execution/backends/root-team-execution-directory.ts':[(28,55)],
'autobyteus-server-ts/src/agent-collaboration/execution/backends/configured-agent-execution-handle.ts':[(105,115)],
'autobyteus-server-ts/src/agent-team-execution/domain/team-run.ts':[(17,35)],
'autobyteus-server-ts/src/agent-team-execution/local/flat-team-run-backend.ts':[(18,32)],
'autobyteus-server-ts/src/agent-org-execution/domain/agent-org-run.ts':[(314,326)],
'autobyteus-server-ts/src/services/agent-streaming/agent-org-execution-view-projector.ts':[(30,53)],
'autobyteus-collaboration-stream-contracts/src/agent-run-collaboration-dtos.ts':[(1,15),(40,51)],
'autobyteus-collaboration-stream-contracts/src/agent-org-execution-dtos.ts':[(132,150)],
'autobyteus-web/stores/agentRunStore.ts':[(426,493)],
'autobyteus-web/stores/agentRunCollaborationStore.ts':[(30,123),(155,172),(215,229)],
'autobyteus-web/services/agentCollaboration/agentRunCollaborationContext.ts':[(49,99),(145,172)],
'autobyteus-web/services/agentCollaboration/agentRunCollaborationHydration.ts':[(32,60),(78,137)],
'autobyteus-web/services/agentCollaboration/agentRunCollaborationStreamingService.ts':[(40,106),(176,217)],
'autobyteus-web/services/agentCollaboration/agentRunCollaborationChildContextFactory.ts':[(1,40)],
'autobyteus-web/services/agentCollaboration/agentRunCollaborationIndex.ts':[(40,81)],
'autobyteus-web/composables/agentCollaboration/useAgentRunCollaborationSync.ts':[(1,34)],
'autobyteus-web/stores/agentOrgContextsStore.ts':[(53,90),(125,145),(263,304)],
'autobyteus-web/services/agentOrgExecution/agentOrgExecutionContext.ts':[(58,106),(134,158)],
'autobyteus-web/services/agentStreaming/handlers/agentInputStateHandler.ts':[(1,34)],
'autobyteus-web/services/runStatus/agentRuntimeStatusState.ts':[(25,37),(61,77)],
'autobyteus-web/services/activity/nativeCompactionActivityReconciliation.ts':[(1,49)],
'autobyteus-web/stores/agentActivityStore.ts':[(335,401)],
'autobyteus-web/stores/windowNodeContextStore.ts':[(50,85)],
'autobyteus-server-ts/src/run-history/store/agent-run-collaboration-tree-schema.ts':[(45,84)],
'autobyteus-server-ts/tests/unit/agent-execution/root-recovery-command.test.ts':[(15,24)],
'autobyteus-server-ts/src/agent-collaboration/execution/domain/member-execution-context.ts':[(48,70)],
'TESTING.md':[(1,30),(59,108)],
}
evidence=[]
for path,ranges in scopes.items():
 q=r/path;lines=q.read_text().splitlines();evidence.append({'path':path,'sha256':h(q),'excerpts':[{'from':a,'to':min(b,len(lines)),'text':'\n'.join(f'{i+1}: {lines[i]}' for i in range(a-1,min(b,len(lines))))} for a,b in ranges]})
write('source-evidence.json',{'method':'Source read + inherited execution evidence, no SD product tests or probes','files':evidence})
entry=json.loads((e/'entry-preservation.json').read_text());allowed={str((p/n).relative_to(r)) for n in ['design-spec.md','investigation-notes.md','solution-revision-record.md','solution-progress-result.md']}
changed=[{'path':path,'before':v,'after':h(r/path)} for path,v in entry['sha256'].items() if h(r/path)!=v]
unexpected=[x for x in changed if x['path'] not in allowed]
index=git('ls-files','--stage');head=git('rev-parse','HEAD').decode().strip();mh=git('rev-parse','MERGE_HEAD').decode().strip()
refs=set(json.loads((p/'implementation-evidence/ir-008/reference-index.json').read_text())['paths'])
refs|={str(r/q) for q in scopes}|{str(q) for q in p.glob('*.md')}|{str(q) for q in e.iterdir() if q.is_file()}
refs|={str(p/'history'/f'{n}.before-sr035.md') for n in ['design-spec.md','investigation-notes.md','solution-revision-record.md','solution-progress-result.md']}
future={'final-audit.json','reference-index.json','reference-check.json','design-delta.diff','final-status.txt'}
refs|={str(e/n) for n in future}
missing=sorted(q for q in refs if not Path(q).is_file() and Path(q).name not in future)
write('reference-index.json',{'package':'context-compaction-simplification-analysis','revision':'SR035','note':'Navigation preserves complete inherited current package; not a claim every path was read or rerun. Current source review and API results are pre-integration only.','paths':sorted(refs-set(missing))})
write('reference-check.json',{'count':len(refs-set(missing)),'missing':missing})
prior=(p/'history/design-spec.md.before-sr035.md').read_text().splitlines(True)
(e/'design-delta.diff').write_text(''.join(difflib.unified_diff(prior,(p/'design-spec.md').read_text().splitlines(True),fromfile='Ready SR034',tofile='Ready SR035')))
(e/'final-status.txt').write_bytes(git('status','--porcelain=v1','-uall'))
req='tickets/in-progress/context-compaction-simplification-analysis/requirements-doc.md'
api=json.loads((p/'implementation-evidence/ir-008/api-owner-preservation.json').read_text())
audit={'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'result':'Architecture Design Complete','task_size':'Large','architectural_risk':'High','entryPins':len(entry['sha256']),'unchangedPins':len(entry['sha256'])-len(changed),'changed':changed,'unexpected':unexpected,'requirementsUnchanged':entry['sha256'][req]==h(r/req),'apiDurablePaths':len(api),'apiAllUnchanged':all(entry['sha256'].get(a['path'])==h(r/a['path']) for a in api),'head':head,'mergeHead':mh,'headUnchanged':head==entry['head'],'mergeHeadUnchanged':mh==entry['mergeHead'],'indexUnchanged':hashlib.sha256(index).hexdigest()==entry['indexSha256'],'unmergedEntries':len(git('ls-files','-u').decode().splitlines()),'stagedPathCount':len(git('diff','--cached','--name-only').decode().splitlines()),'mergeInProgress':True,'sourceEvidenceFiles':len(evidence),'referenceCount':len(refs-set(missing)),'missingReferences':missing,'sdTestsProbesProviderCalls':0,'sourceOrDurableTestEdits':False,'fullAutomergeAuditCertified':False,'implementationOrApiAcceptance':False,'electronBuildLaunch':False,'commitPushReleaseCleanup':False}
write('final-audit.json',audit)
print(json.dumps({k:v for k,v in audit.items() if k not in ['changed']},indent=2))
assert not unexpected and not missing and audit['requirementsUnchanged'] and audit['apiAllUnchanged'] and audit['indexUnchanged'] and audit['headUnchanged'] and audit['mergeHeadUnchanged']
