import subprocess,json,sys
from pathlib import Path
E=Path(__file__).parent; runner=str(E/'run-case.py')
cases=[
('API-003@round12-e2e','Deterministic actual Project/current-array/startup/Team/Org HTTP boundaries',['pnpm','-C','autobyteus-server-ts','exec','vitest','run','tests/e2e/projects','tests/e2e/agent-team-runs/task-delegation-api-surface.e2e.test.ts','tests/e2e/runtime/team-task-event-current-contract.e2e.test.ts','tests/e2e/runtime/team-run-current-graphql-documents.e2e.test.ts','tests/e2e/agent-org-runs/stopped-org-workspace-graphql.e2e.test.ts','--no-watch']),
('API-004@round12-integration','Current Native root/private/termination/compaction plus actual MCP tool Task lifecycle',['pnpm','-C','autobyteus-server-ts','exec','vitest','run','tests/integration/agent-run-collaboration/native-root-termination.integration.test.ts','tests/integration/agent-run-collaboration/native-compaction-root.integration.test.ts','tests/integration/agent-team-execution/task-delegation-tool-lifecycle.integration.test.ts','--no-watch']),
('API-017@round12-tool-log','Strict TOOL_LOG correlation and hosted Team noncollaboration controls',['pnpm','-C','autobyteus-server-ts','exec','vitest','run','tests/unit/agent-execution/backends/codex/events/codex-tool-log-correlation.test.ts','tests/unit/agent-team-execution/team-system-instruction-admission.test.ts','tests/unit/agent-team-execution/team-agent-file-change-admission.test.ts','tests/unit/agent-team-execution/team-agent-background-task-admission.test.ts','--no-watch']),
('API-006@round12-web','Actual stores/stream/selection/component affected consumers',['pnpm','-C','autobyteus-web','test:nuxt','services/agentCollaboration/__tests__/agentRunCollaborationStreamingService.spec.ts','services/agentCollaboration/__tests__/agentRunCollaborationContext.spec.ts','services/agentOrgExecution/__tests__/agentOrgStreamingService.spec.ts','services/agentOrgExecution/__tests__/agentOrgContextHydration.spec.ts','composables/__tests__/useWorkspaceHistorySelectionActions.spec.ts','composables/__tests__/useWorkspaceHistorySubjectActions.coldHistory.spec.ts','stores/__tests__/runHistoryStore.spec.ts','components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.regressions.spec.ts','--run']),
('API-006@round12-native-input','Unchanged web boundary guard then native/FIFO/saved hydration workspace surface',['pnpm','test:native-input-history'])
]
results=[]
for cid,label,cmd in cases:
 p=subprocess.run(['python3',runner,cid,label,*cmd],text=True,capture_output=True);print(p.stdout,flush=True);print(p.stderr,flush=True);assert p.returncode==0
 r=json.loads(p.stdout.strip().splitlines()[-1]);results.append(r);(E/'api-012-repository-results.json').write_text(json.dumps(results,indent=2)+'\n')
 if r['exit']!=0:sys.exit(r['exit'])
