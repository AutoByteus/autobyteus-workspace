# Implementation Plan

## Solution Sketch
- Frontend:
  - keep team-level workspace picker for embedded members only,
  - require remote member `workspaceRootPath` in override panel,
  - block run when any remote member path is missing,
  - send per-member `workspaceId/workspaceRootPath` in `memberConfigs[]`.
- Backend:
  - accept/persist `workspaceRootPath` in GraphQL input and run manifest,
  - resolve workspace using `workspaceId` first, otherwise `workspaceRootPath` for local node members,
  - raise explicit creation error when local execution needs path but it is missing.

## Changes
1. Frontend input/validation:
   - `/components/workspace/config/MemberOverrideItem.vue`
   - `/components/workspace/config/TeamRunConfigForm.vue`
   - `/components/workspace/config/RunConfigPanel.vue`
2. Frontend payload/context mapping:
   - `/stores/agentTeamRunStore.ts`
   - `/stores/agentTeamContextsStore.ts`
   - `/types/agent/TeamRunConfig.ts`
3. Backend input + runtime resolution:
   - `/src/api/graphql/types/agent-team-run.ts`
   - `/src/agent-team-execution/services/agent-team-run-manager.ts`
   - `/src/distributed/runtime-binding/run-scoped-team-binding-registry.ts`
4. Test updates:
   - frontend run-config/unit suites,
   - backend resolver/unit/integration suites.

## Verification Strategy
- Frontend:
  - `pnpm vitest run components/workspace/config/__tests__/TeamRunConfigForm.spec.ts components/workspace/config/__tests__/RunConfigPanel.spec.ts stores/__tests__/agentTeamRunStore.spec.ts`
- Backend:
  - `pnpm vitest run tests/unit/api/graphql/types/agent-team-run-resolver.test.ts tests/unit/distributed/run-scoped-team-binding-registry.test.ts tests/integration/agent-team-execution/agent-team-run-manager.integration.test.ts`
