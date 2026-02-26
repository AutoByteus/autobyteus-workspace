# Implementation Plan

## Status

- Stage: `Finalized`
- Date: `2026-02-21`
- Scope: `Backend parity + personal continuation path + frontend regression-restore verification`

## Design Inputs

- `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-web/tickets/in-progress/team-run-left-tree-visibility-personal/requirements.md`
- `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-web/tickets/in-progress/team-run-left-tree-visibility-personal/proposed-design.md` (`v4`)
- `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-web/tickets/in-progress/team-run-left-tree-visibility-personal/future-state-runtime-call-stack.md` (`v4`)
- `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-web/tickets/in-progress/team-run-left-tree-visibility-personal/future-state-runtime-call-stack-review.md` (`Go Confirmed`)

## Requirement Traceability

| Requirement | Use Cases | Design Change IDs | Planned Tasks | Verification |
| --- | --- | --- | --- | --- |
| R-001/R-004 | UC-001/UC-002/UC-006 | C-003/C-004/C-005/C-007/C-010/C-012/C-013 | T-01/T-02/T-03/T-08/T-09/T-10 | Team history GraphQL E2E + web run-history/panel unit tests |
| R-002/R-005 | UC-003/UC-004/UC-008 | C-008/C-009/C-012/C-013/C-014 | T-04/T-05/T-10/T-11 | Team send GraphQL E2E + store selection/hydration unit tests |
| R-003 | UC-005/UC-007 | C-006/C-012/C-013 | T-06/T-10 | Team terminate/history E2E + UI regression checks |
| R-005 | UC-009 | C-015 | T-12 | Team store unit regression for offline continue stream reconnect |

## Execution Tasks (Bottom-Up)

1. T-01 `Add` team run domain/store modules in personal backend
- Add `src/run-history/domain/team-models.ts`.
- Add `src/run-history/store/team-run-index-store.ts`.
- Add `src/run-history/store/team-run-manifest-store.ts`.

2. T-02 `Add` team run history + projection + continuation services
- Add `src/run-history/services/team-run-history-service.ts`.
- Add `src/run-history/services/team-member-run-projection-service.ts`.
- Add `src/run-history/services/team-run-continuation-service.ts`.
- Add shared route-key helper `src/run-history/utils/team-member-agent-id.ts`.

3. T-03 `Add/Modify` GraphQL team history API
- Add `src/api/graphql/types/team-run-history.ts`.
- Modify `src/api/graphql/schema.ts` to register resolver.

4. T-04 `Modify` team instance manager for deterministic team restoration id
- Add `createTeamInstanceWithId(...)` to `src/agent-team-execution/services/agent-team-instance-manager.ts`.

5. T-05 `Modify` team instance resolver for persistence + offline continuation
- Update `src/api/graphql/types/agent-team-instance.ts` to:
  - write history manifest/index on create/lazy-create,
  - update history on send/terminate,
  - route existing `teamId` sends through continuation when runtime is offline.

6. T-06 `Test` coverage and regression verification
- Integration: `tests/integration/agent-team-execution/agent-team-instance-manager.integration.test.ts`.
- E2E existing: `tests/e2e/run-history/run-history-graphql.e2e.test.ts`.
- E2E new: add team-run-history/continuation server e2e assertions in new or existing suite.


7. T-07 `Modify` runtime support in `autobyteus-ts` for deterministic team restoration
- Add `createTeamWithId(...)` to `autobyteus-ts/src/agent-team/factory/agent-team-factory.ts`.
- Update `autobyteus-ts/src/agent-team/context/team-manager.ts` to honor persisted member agent ids when provided.
- Update `autobyteus-ts/src/agent-team/shutdown-steps/agent-team-shutdown-step.ts` to clean `AgentFactory` entries during team teardown.

8. T-08 `Modify` web GraphQL docs for team run-history read/delete flow
- Update `graphql/queries/runHistoryQueries.ts` with `ListTeamRunHistory`, `GetTeamRunResumeConfig`, `GetTeamMemberRunProjection`.
- Update `graphql/mutations/runHistoryMutations.ts` with `DeleteTeamRunHistory`.

9. T-09 `Modify` web run-history store for canonical team projection
- Extend `stores/runHistoryStore.ts` to load team history in `fetchTree(...)` and expose `getTeamNodes(...)`.
- Add store actions for team-member rehydrate open path (`openTeamMemberRun`) and team-member row dispatch (`selectTreeRun` union).

10. T-10 `Modify` workspace history panel to consume store team source
- Update `components/workspace/history/WorkspaceAgentRunsTreePanel.vue` to render teams from `runHistoryStore.getTeamNodes(workspaceRootPath)`.
- Route member click through `runHistoryStore.selectTreeRun(member)` (instead of direct local focus mutation).

11. T-11 `Test` regression coverage for restored behaviors
- Update `stores/__tests__/runHistoryStore.spec.ts` for persisted-team projection + persisted-member hydrate/open flow.
- Update `components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.spec.ts` for member selection via store path and workspace team rendering from store.

12. T-12 `Modify/Test` offline continuation stream reconnect in team send flow
- Update `stores/agentTeamRunStore.ts` so successful existing-team send marks run-history team active and reconnects stream when unsubscribed.
- Add/extend `stores/__tests__/agentTeamRunStore.spec.ts` to cover persisted offline send -> stream reconnect + run-history active marker.

## Verification Strategy

- Unit: N/A for this iteration (existing behavior is integration heavy).
- Integration required: manager create/terminate semantics and restoration-by-id path.
- Runtime unit required: team factory/context/shutdown path in `autobyteus-ts` for stable team/member id restoration.
- E2E required (server):
  - `listTeamRunHistory` returns seeded rows and members.
  - `getTeamRunResumeConfig` returns persisted manifest.
  - `getTeamMemberRunProjection` returns persisted projection fallback.
  - `deleteTeamRunHistory` works only for inactive teams.
  - `sendMessageToTeam(teamId=existing)` succeeds when runtime is offline and history exists.
- Unit required (web regression restore):
  - `stores/__tests__/runHistoryStore.spec.ts` verifies persisted team projection + `openTeamMemberRun` hydration.
  - `components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.spec.ts` verifies team/member interactions use store route.

## E2E Feasibility

- Feasible in current local environment.
- No external secrets/tokens required for server GraphQL schema-level E2E.

## Risks / Mitigation

- Risk: mismatch between enterprise distributed assumptions and personal runtime.
- Mitigation: keep continuation dispatch path local (`team.postMessage`) and avoid distributed ingress dependencies.

- Risk: graph/schema break from new resolver types.
- Mitigation: run focused E2E suites immediately after schema changes.
