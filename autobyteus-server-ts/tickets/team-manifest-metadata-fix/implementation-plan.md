# Implementation Plan (Small Scope)

## Design Basis (Small-Scope Solution Sketch)
- Replace manifest metadata derivation in `AgentTeamRunResolver.buildTeamRunManifest`.
- Resolve team definition metadata through `AgentTeamDefinitionService.getDefinitionById(teamDefinitionId)`.
- Persist:
  - `teamDefinitionName` := definition.name (fallback to input ID if unavailable)
  - `coordinatorMemberRouteKey` := normalized route for definition.coordinatorMemberName (fallback to first binding)
- Keep member bindings unchanged.
- Add resolver unit tests verifying both lazy-create and explicit-create manifest metadata.

## Planned File Changes
1. `src/api/graphql/types/agent-team-run.ts`
- Inject/use `AgentTeamDefinitionService`.
- Add helper for metadata resolution.
- Update `buildTeamRunManifest` inputs and implementation.
- Use resolved metadata in both create paths.

2. `tests/unit/api/graphql/types/agent-team-run-resolver.test.ts`
- Mock `AgentTeamDefinitionService`.
- Assert persisted manifest contains correct `teamDefinitionName` and `coordinatorMemberRouteKey`.

## Verification
- Run focused unit test file:
  - `pnpm vitest tests/unit/api/graphql/types/agent-team-run-resolver.test.ts`
- If green, report affected behavior and remaining risks.
