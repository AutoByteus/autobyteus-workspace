# Implementation Progress

## Status

- Overall: **In Progress (verification-complete for current slice)**
- Ticket: `agent-id-naming-alignment`

## Completed Work

1. Backend
- Agent run-history contracts use `agentId` across:
  - `src/run-history/domain/models.ts`
  - `src/run-history/store/run-history-index-store.ts`
  - `src/run-history/store/run-manifest-store.ts`
  - `src/run-history/services/run-history-service.ts`
  - `src/run-history/services/run-continuation-service.ts`
  - `src/run-history/services/run-projection-service.ts`
  - `src/api/graphql/types/agent-run-history.ts`

2. Frontend
- Agent history GraphQL documents updated to `agentId`:
  - `graphql/queries/runHistoryQueries.ts`
  - `graphql/mutations/runHistoryMutations.ts`
- Run-open and run-tree flows aligned to `agentId` naming:
  - `services/runOpen/runOpenCoordinator.ts`
  - `stores/runTreeStore.ts`
  - `stores/agentRunStore.ts`
  - `stores/activeContextStore.ts`
  - `components/workspace/history/WorkspaceAgentRunsTreePanel.vue`
  - `components/workspace/history/WorkspaceRunsSection.vue`
  - `composables/workspace/history/useRunTreeActions.ts`
  - `utils/runTreeProjection.ts`
  - `utils/runTreeLiveStatusMerge.ts`

3. Tests updated and passing for renamed contracts
- Backend resolver/run-history suites updated.
- Frontend store/history-panel/composable suites updated.

## Verification Runs

### Backend
- `pnpm exec vitest tests/unit/run-history/run-history-index-store.test.ts tests/unit/run-history/run-manifest-store.test.ts tests/unit/run-history/run-history-service.test.ts tests/unit/run-history/run-continuation-service.test.ts tests/unit/api/graphql/types/agent-run-history-resolver.test.ts tests/e2e/run-history/run-history-graphql.e2e.test.ts --run`
  - Result: `6 files passed, 27 tests passed`

- `pnpm exec vitest tests/e2e/run-history/team-run-restore-lifecycle-graphql.e2e.test.ts tests/integration/run-history/team-run-continuation-lifecycle.integration.test.ts tests/e2e/run-history/team-run-history-graphql.e2e.test.ts --run`
  - Result: `3 files passed, 6 tests passed`

### Frontend
- `pnpm exec vitest --run stores/__tests__/runTreeStore.spec.ts composables/workspace/history/__tests__/useRunTreeActions.spec.ts components/workspace/history/__tests__/WorkspaceRunsSection.spec.ts components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.spec.ts stores/__tests__/agentRunStore.spec.ts tests/integration/workspace-history-draft-send.integration.test.ts`
  - Result: `6 files passed, 54 tests passed`

- `pnpm exec vitest --run components/workspace/history/__tests__/TeamRunsSection.spec.ts components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.spec.ts components/workspace/history/__tests__/WorkspaceCreateInlineForm.spec.ts components/workspace/history/__tests__/WorkspaceRunsSection.spec.ts composables/workspace/history/__tests__/useRunTreeActions.spec.ts composables/workspace/history/__tests__/useRunTreeViewState.spec.ts stores/__tests__/runTreeStore.spec.ts stores/__tests__/agentRunStore.spec.ts utils/__tests__/runTreeProjection.spec.ts utils/__tests__/runTreeLiveStatusMerge.spec.ts tests/integration/workspace-history-draft-send.integration.test.ts`
  - Result: `10 files passed, 62 tests passed`

- `pnpm exec vitest --run stores/__tests__/agentTeamRunStore.spec.ts`
  - Result: `1 file passed, 1 test passed`

## Notes

- Guardrail preserved: distributed team execution naming (`teamRunId`) remains unchanged.
- Remaining end-of-ticket actions: final sweep for naming consistency in any newly touched files and commit packaging.
