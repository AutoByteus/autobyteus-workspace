from pathlib import Path
import json,subprocess
W=Path.cwd();T=W/'tickets/in-progress/project-task-manager-linked-delegation';E=T/'api-e2e-evidence'
run=lambda case,label,args:subprocess.run(['python3',str(E/'api-017-run.py'),case,label,'--',*args],check=True)
run('API-002@round17','remaining-durable-consumers',['pnpm','-C','autobyteus-server-ts','exec','vitest','run',
'tests/unit/agent-execution/backends/codex/events/codex-tool-log-correlation.test.ts',
'tests/unit/api/graphql/project-tasks-schema.test.ts',
'tests/unit/app-data-migrations/raw-trace-active-file-name-migration.test.ts',
'tests/unit/app-data-migrations/team-run-execution-tree-v1-app-data-migration.test.ts',
'tests/unit/app-data-migrations/token-usage-run-records-v1-app-data-migration.test.ts',
'tests/unit/app-data-migrations/token-usage-run-records-v1-source-token-decoding.test.ts',
'tests/unit/services/team-communication/team-communication-service.test.ts','--no-watch'])
commands=json.loads((T/'code-review-evidence/crr-022/owned-commands.json').read_text())
run('API-004@round17','current-native-task-integration',next(a for n,a in commands if n=='native-task-integration'))
run('API-008@round17','current-shared-server-bootstrap-build',['pnpm','-C','autobyteus-server-ts','build'])
run('API-003@round17','project-public-http-startup',['pnpm','-C','autobyteus-server-ts','exec','vitest','run','tests/e2e/projects','--no-watch'])
run('API-005@round17','current-scoped-org-history',['pnpm','-C','autobyteus-server-ts','exec','vitest','run','tests/e2e/agent-org-runs/scoped-org-history-graphql.e2e.test.ts','--no-watch'])
run('API-005@round17','current-controlled-publication',['env','RUN_AGY_FAILURE_E2E=1','ANTIGRAVITY_CLI_COMMAND='+str(W/'autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs'),'pnpm','-C','autobyteus-server-ts','exec','vitest','run','tests/e2e/agent-org-runs/controlled-org-publication-http.e2e.test.ts','tests/e2e/runtime/agy-native-tool-arguments-transport.e2e.test.ts','--no-watch'])
run('API-006@round17','current-nuxt-history-consumers',['pnpm','-C','autobyteus-web','test:nuxt','components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.regressions.spec.ts','composables/__tests__/useWorkspaceHistorySubjectActions.coldHistory.spec.ts','components/workspace/collaboration/__tests__/CollaborationMessagesOrgRoot.integration.spec.ts','components/workspace/collaboration/__tests__/CollaborationOverviewPanel.spec.ts','stores/__tests__/agentRunCollaborationStore.spec.ts','services/agentCollaboration/__tests__/agentRunCollaborationContext.spec.ts','--run'])
run('API-006@round17','current-native-web-boundary',['pnpm','test:native-input-history'])
