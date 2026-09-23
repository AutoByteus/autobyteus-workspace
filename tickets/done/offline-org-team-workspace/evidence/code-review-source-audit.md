# CRR-001 independent source audit

Commit 3a52e67 over da86efe; git rename-aware added+deleted delta. Tests, docs and evidence excluded.

| Path | Nonempty lines | Added | Deleted | Delta | >500 | >220 |
| --- | ---: | ---: | ---: | ---: | --- | --- |
| `autobyteus-server-ts/src/agent-execution/runtime/general-process-run-supervisor.ts` | 368 | 1 | 0 | 1 | Pass | Pass |
| `autobyteus-server-ts/src/agent-org-execution/domain/agent-org-run-config.ts` | 33 | 13 | 2 | 15 | Pass | Pass |
| `autobyteus-server-ts/src/agent-org-execution/services/agent-org-run-config-mutator.ts` | 147 | 41 | 3 | 44 | Pass | Pass |
| `autobyteus-server-ts/src/agent-org-execution/services/agent-org-run-manager.ts` | 414 | 73 | 40 | 113 | Pass | Pass |
| `autobyteus-server-ts/src/agent-org-execution/services/agent-org-run-service.ts` | 242 | 11 | 9 | 20 | Pass | Pass |
| `autobyteus-server-ts/src/api/graphql/types/agent-org-run.ts` | 241 | 24 | 14 | 38 | Pass | Pass |
| `autobyteus-web/components/fileExplorer/FileExplorerLayout.vue` | 92 | 37 | 23 | 60 | Pass | Pass |
| `autobyteus-web/components/layout/RightSideTabs.vue` | 189 | 7 | 1 | 8 | Pass | Pass |
| `autobyteus-web/components/workspace/config/AgentOrgRunConfigForm.vue` | 140 | 1 | 0 | 1 | Pass | Pass |
| `autobyteus-web/components/workspace/config/ExistingRunConfigEditor.vue` | 222 | 5 | 3 | 8 | Pass | Pass |
| `autobyteus-web/components/workspace/config/RunConfigPanel.vue` | 410 | 3 | 3 | 6 | Pass | Pass |
| `autobyteus-web/components/workspace/config/TeamScopeConfigEditor.vue` | 338 | 8 | 6 | 14 | Pass | Pass |
| `autobyteus-web/components/workspace/config/WorkspaceSelector.vue` | 345 | 2 | 12 | 14 | Pass | Pass |
| `autobyteus-web/graphql/mutations/agentOrgRunMutations.ts` | 34 | 3 | 3 | 6 | Pass | Pass |
| `autobyteus-web/graphql/queries/runModelOptionsQueries.ts` | 25 | 4 | 4 | 8 | Pass | Pass |
| `autobyteus-web/localization/messages/en/workspace.ts` | 427 | 3 | 2 | 5 | Pass | Pass |
| `autobyteus-web/localization/messages/zh-CN/workspace.ts` | 426 | 3 | 2 | 5 | Pass | Pass |
| `autobyteus-web/services/agentOrgExecution/agentOrgExecutionContext.ts` | 353 | 19 | 19 | 38 | Pass | Pass |
| `autobyteus-web/services/agentOrgExecution/agentOrgRunConfigAdoption.ts` | 30 | 31 | 0 | 31 | Pass | Pass |
| `autobyteus-web/services/runConfigEditing/agentOrgRunConfigClient.ts` | 65 | 71 | 0 | 71 | Pass | Pass |
| `autobyteus-web/services/runConfigEditing/existingAgentOrgRunFormModel.ts` | 76 | 10 | 5 | 15 | Pass | Pass |
| `autobyteus-web/services/runConfigEditing/existingAgentOrgWorkspaceDraft.ts` | 50 | 57 | 0 | 57 | Pass | Pass |
| `autobyteus-web/services/runConfigEditing/existingRunModelConfigMutationClient.ts` | 50 | 0 | 19 | 19 | Pass | Pass |
| `autobyteus-web/services/runConfigEditing/existingRunModelOptionsClient.ts` | 21 | 5 | 3 | 8 | Pass | Pass |
| `autobyteus-web/services/runConfigEditing/existingTeamRunFormModel.ts` | 92 | 1 | 1 | 2 | Pass | Pass |
| `autobyteus-web/stores/agentOrgContextsStore.ts` | 327 | 49 | 13 | 62 | Pass | Pass |
| `autobyteus-web/stores/existingRunConfigResultActions.ts` | 159 | 166 | 0 | 166 | Pass | Pass |
| `autobyteus-web/stores/existingRunConfigStore.ts` | 458 | 58 | 89 | 147 | Pass | Pass |
| `autobyteus-web/types/agent/ExistingRunConfigDraft.ts` | 15 | 17 | 0 | 17 | Pass | Pass |
| `autobyteus-web/types/agent/ExistingRunModelConfigDraft.ts` | 41 | 0 | 13 | 13 | Pass | Pass |
| `autobyteus-web/types/agent/ExistingTeamRunFormModel.ts` | 42 | 2 | 1 | 3 | Pass | Pass |
| `autobyteus-web/types/workspace/WorkspaceSelectorModel.ts` | 5 | 6 | 0 | 6 | Pass | Pass |
