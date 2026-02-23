# Investigation Notes

## Sources Consulted
- `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-server-ts/src/run-history/store/team-run-manifest-store.ts`
- `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-server-ts/src/run-history/services/team-run-history-service.ts`
- `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-server-ts/src/run-history/services/team-run-continuation-service.ts`
- `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-server-ts/src/run-history/services/team-member-run-projection-service.ts`
- `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-server-ts/src/run-history/services/run-projection-service.ts`
- `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-server-ts/src/agent-memory-view/store/memory-file-store.ts`
- `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-server-ts/src/api/graphql/types/agent-team-instance.ts`
- `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-server-ts/src/api/graphql/types/team-run-history.ts`
- `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-server-ts/src/distributed/worker-execution/remote-member-execution-gateway.ts`
- `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-server-ts/src/distributed/bootstrap/remote-envelope-control-command-handlers.ts`
- `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-server-ts/src/distributed/routing/team-routing-port-adapter.ts`
- `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-server-ts/tests/e2e/run-history/team-member-projection-contract.e2e.test.ts`
- `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-server-ts/tests/e2e/run-history/team-run-history-graphql.e2e.test.ts`
- `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-server-ts/tests/integration/distributed/run-stop-cleanup.integration.test.ts`
- `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-server-ts/docs/design/agent_team_communication_local_and_distributed.md`
- Historical ticket design source:
  - `/Users/normy/autobyteus_org/tickets/team-run-history-restore-first-message/proposed-design.md`
  - `/Users/normy/autobyteus_org/tickets/team-run-history-restore-first-message/proposed-design-based-runtime-call-stack.md`

## Branch And Timeline Evidence
Investigated branch:
- `autobyteus-server-ts`: `enterprise` at `e61afb8`

Relevant commits:
1. `1a8d75d` (2026-02-17): introduced team run history store + continuation service.
2. `3eb0eba` (2026-02-19): introduced team-member projection parity service (local-first + remote fallback).
3. `96f5ea4` (2026-02-20): continuation restore fix (`memoryDir` pass-through adjustments), not team-member folder layout migration.

Conclusion from blame/log:
- The current repo history does not show an earlier commit that implemented canonical member folders under `memory/agent_teams/<teamId>/<memberAgentId>/...` and later removed them.
- In this branch lineage, drift appears at implementation introduction time, not as a late accidental regression.

## Current Implementation (As-Is)
1. Team folder persistence:
- Team manifest path is `memory/agent_teams/<teamId>/team_run_manifest.json`.
- Team store does not materialize member subfolders under team root.

2. Team member projection:
- Team member projection resolves `memberAgentId` from team manifest.
- Local projection uses `getRunProjection(memberAgentId)`.
- `RunProjectionService` reads via `MemoryFileStore`, which is rooted at `memory/agents/<agentId>/...`.

3. Team continuation restore:
- Restore reconstructs member runtime configs from manifest.
- Runtime uses `memberAgentId` identity for restore/hydration.
- No team-member path translation layer exists in current storage path contract.

4. Tests currently validate the as-is contract:
- E2E cleanup/manipulation explicitly references `memory/agents/<memberAgentId>` for team members.
- Team history manifest tests validate only `team_run_manifest.json` under `memory/agent_teams/<teamId>`.

## Additional Deep-Investigation Findings
1. Manifest host ownership is not currently persisted at create time:
- `src/api/graphql/types/agent-team-instance.ts:buildTeamRunManifest(...)` sets `hostNodeId: null` for each member binding.
2. Current continuation restore does not pass per-member canonical `memoryDir`:
- `src/run-history/services/team-run-continuation-service.ts:restoreTeamRuntime(...)` builds member configs without canonical team-member memory root.
3. Current projection remote fallback still uses shallow definition lookup fallback:
- `src/run-history/services/team-member-run-projection-service.ts:resolveRemoteNodeId(...)` can fallback to `definition.nodes.find(...)`, which is not a robust route-key-level nested ownership source.
4. Distributed bootstrap binding snapshot is sourced from runtime member configs:
- `src/distributed/bootstrap/default-distributed-runtime-composition.ts:resolveBootstrapBindingSnapshot(...)`.
- This reinforces the need for create-time runtime configs to include canonical `memberRouteKey`, `memberAgentId`, `hostNodeId`, and `memoryDir`.
5. Current workspace WIP in manifest store still contains symlink layout logic:
- `src/run-history/store/team-run-manifest-store.ts` has `agentsDir` + `ensureTeamMemberLayout*` methods.
- This violates final store-boundary policy (manifest store should be manifest-only).
6. Distributed placement resolver currently starts from `teamDefinition.nodes` at the current definition level:
- `src/distributed/member-placement/member-placement-resolver.ts:resolvePlacement(...)`.
- Nested distributed leaf ownership therefore requires explicit flattened route-key placement mapping in design/create flow rather than relying on shallow member-name scans.
7. Current team-history delete is host-local filesystem removal only:
- `src/run-history/services/team-run-history-service.ts:deleteTeamRunHistory(...)` executes `fs.rm(teamDir)` and removes index row directly.
- No distributed worker cleanup dispatch is present in this path.
8. Remote execution command gateway has no history-delete envelope kind:
- `src/distributed/worker-execution/remote-member-execution-gateway.ts:dispatchEnvelope(...)` handles only `RUN_BOOTSTRAP`, `USER_MESSAGE`, `INTER_AGENT_MESSAGE_REQUEST`, `TOOL_APPROVAL`, `CONTROL_STOP`.
9. Worker control handlers implement run-stop cleanup but not history-delete cleanup:
- `src/distributed/bootstrap/remote-envelope-control-command-handlers.ts` has `dispatchControlStop` only for runtime run teardown.
10. Existing delete tests validate only local directory removal behavior:
- `tests/e2e/run-history/team-run-history-graphql.e2e.test.ts` checks host-side `agent_teams/<teamId>` deletion.
- No distributed delete matrix tests (mixed placement, manifest-only host, nested multi-node, retry lifecycle) are present.
11. Delete lifecycle field currently exists in domain/index model but is not used for retry sequencing:
- `TeamRunDeleteLifecycle = READY | CLEANUP_PENDING` exists in `team-models.ts`, but delete flow does not transition or persist partial-progress semantics.
12. Delete identifier model and distributed command model are currently mismatched:
- history delete API is `teamId`-scoped (`deleteTeamRunHistory(teamId)`),
- distributed worker command transport is `TeamEnvelope`-scoped (`teamRunId`, `runVersion`) in `/internal/distributed/v1/commands`,
- coupling delete to runtime envelope path would introduce inactive-run routing ambiguity and separation-of-concern drift.
13. Current inactive check in delete path is host-local only:
- `TeamRunHistoryService.deleteTeamRunHistory(...)` checks `teamInstanceManager.getTeamInstance(teamId)` on host process only.
- No distributed-authoritative runtime-state preflight is present before destructive cleanup.
14. Distributed bootstrap payload currently does not carry host `teamId` as first-class binding identity:
- worker bootstrap handler reads `teamDefinitionId`, `memberBindings`, `hostNodeId` from payload, but no explicit `teamId` binding field.
15. Worker run-scoped binding registry currently stores `{ teamRunId, runVersion, teamDefinitionId, runtimeTeamId, memberBindings }` without explicit host `teamId`.
16. Without explicit worker-side `teamId` binding identity, distributed inactive-preflight and cleanup guard logic risk ambiguous matching across definition lineage/rerun scenarios.

## Historical Intended Contract (From Earlier Ticket)
Historical design explicitly defined:
- single-agent runs under `memory/agents/<agentId>/...`,
- team manifest under `memory/agent_teams/<teamId>/team_run_manifest.json`,
- each team member under `memory/agent_teams/<teamId>/<memberAgentId>/...`.

It also defined distributed partitioning:
- same logical `teamId` across nodes,
- each node stores only the member subtree for members hosted on that node,
- host manifest maps `memberRouteKey -> memberAgentId -> hostNodeId`.

## Gap Summary
Gap between intended and actual:
1. Intended: team-member artifacts grouped under team instance folder.
2. Actual: team-member artifacts stored in global single-agent folder (`memory/agents`).
3. Impact: team instance folder inspection is incomplete; operator cannot see member memory structure directly under the team instance.
4. Additional delete gap: distributed team history delete has no cross-node cleanup orchestration, so worker-owned member folders can be orphaned.

## Decision For This Ticket
1. Lock detailed requirements as canonical source for all cases:
- single-agent local,
- team local (including nested teams),
- team distributed across host/worker nodes.
2. Use those requirements as direct input for proposed design and implementation changes.
3. Keep canonical identity model stable:
- `agentId` for single-agent runs,
- `teamId` for team runs,
- `memberAgentId` for team members,
- `memberRouteKey` for nested routing identity.
