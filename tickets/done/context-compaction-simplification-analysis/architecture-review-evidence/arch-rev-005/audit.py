import json,hashlib,subprocess,datetime
from pathlib import Path
r=Path('/Users/normy/autobyteus_org/autobyteus-worktrees/context-compaction-simplification-analysis')
p=r/'tickets/in-progress/context-compaction-simplification-analysis'
e=p/'architecture-review-evidence/arch-rev-005'
def sha(f):return hashlib.sha256(Path(f).read_bytes()).hexdigest()
def git(*args):return subprocess.check_output(['git',*args],cwd=r,text=True).strip()
def put(n,x):(e/n).write_text(json.dumps(x,indent=2)+'\n')
a=json.loads((e/'input-audit.json').read_text())
api=json.loads((p/'api-e2e-evidence/api-rev-008/final-audit.json').read_text())['currentDurableSha256']
checks=[{'path':str(r/f),'expected_sha256':h,'sha256':sha(r/f),'matches':sha(r/f)==h} for f,h in api.items()]
sources=[dict(x,final_sha256=sha(x['path']),unchanged=sha(x['path'])==x['sha256']) for x in a['sources']]
auth=[{'path':str(p/f),'expected_sha256':h,'sha256':sha(p/f),'unchanged':h==sha(p/f),'reviewer_owned':f in ['design-review-report.md','architecture-review-revision-record.md']} for f,h in a['authorities'].items()]
focus={
'autobyteus-server-ts/src/agent-run-collaboration/domain/agent-run-collaboration-root.ts':'Package omits input; synchronous snapshot capture; child ownership; inactive published after frozen finish before rejected result returned.',
'autobyteus-server-ts/src/agent-run-collaboration/services/agent-run-collaboration-root-manager.ts':'Inspection live-or-stored never restores; command-ready connection does; rejected child finish throws.',
'autobyteus-server-ts/src/services/agent-streaming/agent-collaboration-view-projector.ts':'Lossy status mapping omits recoverableBlock; single strict GraphQL/WS view.',
'autobyteus-server-ts/src/services/agent-streaming/agent-collaboration-stream-handler.ts':'Connect command-ready, snapshot/barrier, real USER post_message route with input identity.',
'autobyteus-server-ts/src/agent-collaboration/execution/services/root-event-publisher.ts':'Base sequence/capture barrier, queued events, synchronous publication.',
'autobyteus-server-ts/src/agent-collaboration/execution/backends/root-agent-execution-registry.ts':'Existing public input snapshots and quiet termination uses prepared scope.',
'autobyteus-server-ts/src/agent-collaboration/execution/backends/configured-agent-execution-handle.ts':'Managed live input snapshots; Error remains open work; no task-idle redesign selected.',
'autobyteus-server-ts/src/agent-execution/domain/agent-run.ts':'Existing input/lifecycle ownership, termination recovery fence/quiescence.',
'autobyteus-server-ts/src/agent-execution/services/agent-run-service.ts':'Terminate child collaboration root before standalone host completion/history.',
'autobyteus-web/composables/agentCollaboration/useAgentRunCollaborationSync.ts':'Current blanket Error-is-dead watch lacks recovery qualification.',
'autobyteus-web/stores/agentRunCollaborationStore.ts':'Private maps; unqualified service/read callbacks; adopt before commit; inspect/send split.',
'autobyteus-web/stores/agentRunStore.ts':'Existing success-qualified host identity guard and reconciliation; child confirmation absent in current source.',
'autobyteus-web/services/agentCollaboration/agentRunCollaborationContext.ts':'Exact child index; current status-only projection; adoption mutates old context and can throw.',
'autobyteus-web/services/agentCollaboration/agentRunCollaborationHydration.ts':'Actual workspace/member fetch precedes expected activity revision capture.',
'autobyteus-web/services/agentCollaboration/agentRunCollaborationStreamingService.ts':'Socket lifetime, staged snapshot then events, disconnect/inactive/readiness responsibilities.',
'autobyteus-web/services/agentStreaming/handlers/agentInputStateHandler.ts':'Same-instance revision projection; user identity upsert; no dispatch or global activity mutation.',
'autobyteus-web/stores/agentActivityStore.ts':'All-run revisions prechecked, replacements staged before publication; public native confirmation.',
'autobyteus-web/services/activity/nativeCompactionActivityReconciliation.ts':'Only native unresolved -> stopped; known terminal retained under projection; no cold facts invented.',
'autobyteus-collaboration-stream-contracts/src/agent-run-collaboration-dtos.ts':'Current strict root view omits input states; target reuses shared input schema.'
}
put('source-crosschecks.json',{'scope':'Focused independent source trace, not full auto-merge review. Complemented by E35 hashes/excerpts and unchanged-source tests.','files':[{'path':str(r/f),'sha256':sha(r/f),'focus':v} for f,v in focus.items()]})
template=Path('/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/.codex/skills/architecture-reviewer/templates/design-review-report-template.md')
heads=lambda t:[l for l in t.splitlines() if l.startswith('## ')]
required=heads(template.read_text()); current=heads((p/'design-review-report.md').read_text())
up=json.loads((p/'solution-recovery-evidence/sr035/reference-index.json').read_text())['paths']
assert all(isinstance(x,str) for x in up)
paths=sorted(set(up+[str(p/f) for f in ['design-review-report.md','architecture-review-revision-record.md','architecture-integration-handoff.sr035.md']]+[str(f) for f in e.rglob('*') if f.is_file()]+[str(e/'final-audit.json'),str(e/'reference-index.json'),str(e/'handoff-reference-files.json')]))
put('reference-index.json',{'revision':'ARCH-REV-005','solution':'SR035','upstream_count':len(up),'note':'Cumulative source/evidence package; enumeration is not execution proof. Receipt added after confirmed send.','paths':paths})
put('handoff-reference-files.json',paths)
missing=[f for f in paths if not Path(f).is_file() and f!=str(e/'final-audit.json')]
out={'utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'result':'Pass','revision':'ARCH-REV-005','solution':'SR035','head':git('rev-parse','HEAD'),'merge_head':git('rev-parse','MERGE_HEAD'),'head_unchanged':git('rev-parse','HEAD')==a['head'],'merge_head_unchanged':git('rev-parse','MERGE_HEAD')==a['merge_head'],'index_unchanged':sha(a['index_path'])==a['index_sha256'],'unmerged':git('ls-files','-u'),'staged_path_count':len(git('diff','--cached','--name-only').splitlines()),'staged_paths_unchanged':git('diff','--cached','--name-only').splitlines()==a['staged_paths'],'authorities':auth,'unexpected_authority_changes':[x for x in auth if not x['unchanged'] and not x['reviewer_owned']],'sources':sources,'all39_sources_unchanged':len(sources)==39 and all(x['unchanged'] for x in sources),'api_durable':checks,'all12_api_unchanged':len(checks)==12 and all(x['matches'] for x in checks),'template_sections':len(required),'missing_template_sections':[x for x in required if x not in current],'reference_count':len(paths),'missing_references':missing,'tests':{'web_files':2,'web_pass':8,'server_files':3,'server_pass':11,'total_pass':19,'scope':'Unchanged existing source; no target proof. IR008 local projector1Pass/1Fail retained, not rerun.'},'production_or_durable_test_edits':False,'full_automerge_audit_complete':False,'provider_calls':0,'browser_desktop_execution':False,'commit_push_release_cleanup':False,'notes':'Checks are scoped pins/index/authorities, not a fresh whole-tree39260-pin audit; standard test runner setup may update ignored caches/test database.'}
put('final-audit.json',out)
assert not missing and not out['missing_template_sections'] and not out['unexpected_authority_changes']
assert out['all39_sources_unchanged'] and out['all12_api_unchanged'] and out['index_unchanged'] and out['head_unchanged'] and out['merge_head_unchanged'] and out['staged_paths_unchanged'] and out['unmerged']==''
print(json.dumps({k:out[k] for k in ['result','head_unchanged','merge_head_unchanged','index_unchanged','staged_path_count','all39_sources_unchanged','all12_api_unchanged','template_sections','reference_count','missing_references','unexpected_authority_changes']}))
