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

## Re-Investigation Checkpoint (2026-02-23) - Runtime Failure `AgentDefinition with ID 24 not found`

### Additional Sources Consulted
- Host DB: `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-server-ts/db/production.db`
- Docker worker DB snapshot: `/tmp/autobyteus-docker-8001.db` (copied from container `/home/autobyteus/data/db/production.db`)
- Host runtime log: `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-server-ts/logs/host-8000.log`
- Worker runtime log: `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-server-ts/docker/logs/docker-8001.log`
- `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-server-ts/src/agent-team-execution/services/agent-team-instance-manager.ts`
- `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-server-ts/src/api/graphql/types/agent-team-instance.ts`
- `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-web/stores/agentTeamRunStore.ts`
- `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-web/stores/federatedCatalogStore.ts`
- `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-server-ts/src/api/graphql/types/federated-catalog.ts`

### DB Evidence (Host `8000`)
Observed host definitions:
- `agent_definitions`: `1=SuperAgent`, `2=Professor`, `4=Student`.
- `agent_team_definitions` for `Class Room Simulation` (`id=3`) contains:
  - `professor -> reference_id=2, home_node_id=embedded-local`
  - `student -> reference_id=24, home_node_id=node-docker-8001`

Validation query result:
- `student` row resolves as `MISSING_LOCAL_DEFINITION` on host (`reference_id=24` not present in host `agent_definitions`).

### DB Evidence (Worker `8001`)
Worker `agent_definitions` contains:
- `23=Professor`, `24=Student` (plus other rows).
Worker team definition for `Class Room Simulation` uses `student.reference_id=24`.

### Runtime Log Correlation
Host log (`host-8000.log`) shows:
1. lazy team creation starts (`sendMessageToTeam: teamId not provided`),
2. `create agent team instance from definition ID: 3`,
3. hard failure:
   - `Failed to create agent team from definition ID '3': Error: AgentDefinition with ID 24 not found.`
   - `AgentTeamCreationError: Failed to create agent team: Error: AgentDefinition with ID 24 not found.`

No compensating worker-side error appears, because failure happens on host during config hydration before remote bootstrap can complete.

### Code-Path Root Cause
1. Team creation path:
   - `api/graphql/types/agent-team-instance.ts` -> `createTeamInstanceWithId(...)`
2. Host instance manager resolves member definitions via persisted team definition nodes:
   - `agent-team-instance-manager.ts:buildTeamConfigFromDefinition(...)`
   - AGENT branch calls `buildAgentConfigFromDefinition(..., member.referenceId, ...)`
3. `buildAgentConfigFromDefinition(...)` does local lookup only:
   - `agentDefinitionService.getAgentDefinitionById(agentDefinitionId)`
   - throws when not found (`AgentDefinition with ID 24 not found.`)

Critical mismatch:
- for remote members, `member.referenceId` can be a remote-node local ID (e.g., `24` on worker),
- but host build path still requires that ID to exist in host-local `agent_definitions`.

### Why This Is Still Possible After Memory Layout Work
The current ticket/design concentrated on team memory layout and distributed cleanup contracts.
This runtime failure occurs earlier, at distributed member-definition identity resolution, before team run/memory behavior can proceed.

### Additional Contract Gap Confirmed
1. Frontend currently persists node-local federated `definitionId` as `referenceId` for remote members.
2. Federated catalog contract exposes `definitionId` only; no stable cross-node definition identity is surfaced.
3. Existing `sync_id` columns are not populated for the relevant definitions in this environment, so no fallback mapping exists.

### Root Cause Statement
Distributed team definitions mix node-local agent definition IDs across nodes (`reference_id=24` from worker persisted on host), while host runtime team creation assumes every `referenceId` is resolvable in host-local `agent_definitions`.

### Implication For Ticket Status
Ticket is not complete. A blocking requirement/design gap remains:
- distributed team member definition identity resolution must be explicit and node-aware (or globally stable), so host create path does not require remote member `referenceId` to exist locally.

## Resolution Checkpoint (2026-02-23) - Cross-Node Definition-ID Gap Fixed

### Additional Sources Consulted
- `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-server-ts/src/agent-team-execution/services/agent-team-instance-manager.ts`
- `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-server-ts/tests/integration/agent-team-execution/agent-team-instance-manager.integration.test.ts`
- `/Users/normy/autobyteus_org/autobyteus-workspace/tickets/in-progress/team-memory-layout-member-folders/future-state-runtime-call-stack.md`
- `/Users/normy/autobyteus_org/autobyteus-workspace/tickets/in-progress/team-memory-layout-member-folders/future-state-runtime-call-stack-review.md`

### Implemented Correction
1. Added node-aware definition hydration in `AgentTeamInstanceManager`:
- local members remain strict: missing definition ID still fails immediately,
- remote members are proxy-safe: if host-local lookup misses, host can synthesize remote proxy metadata and continue distributed bootstrap.
2. Preserved no-legacy policy:
- no compatibility wrapper or dual-path data persistence was introduced,
- only the runtime hydration decision gate was corrected for remote-member placement.

### Verification Evidence
1. Integration regression test added for mixed local+remote team where remote `referenceId` is absent on host and present on worker-equivalent context.
2. Guard test added to prove local-member missing definition still fails.
3. Executed:
- `pnpm test tests/integration/agent-team-execution/agent-team-instance-manager.integration.test.ts --reporter=dot` -> passed,
- `pnpm test tests/unit/api/graphql/types/agent-team-instance-resolver.test.ts --reporter=dot` -> passed.

### Root-Cause Confidence
High:
- failure reproduced from runtime logs and DB state,
- failing frame was deterministic in `buildAgentConfigFromDefinition`,
- regression tests now explicitly lock expected behavior for both remote and local member cases.

## Additional Investigation Checkpoint (2026-02-23) - Distributed Workspace Portability Gap

### Finding
1. Distributed members could still be configured with host-side `workspaceId` only.
2. `workspaceId` is node-local and can be stale/unknown on the member's home node.
3. Existing hydration path attempted `workspaceId` lookup first and could skip `workspaceRootPath` fallback when `workspaceId` was present but unresolved.

### Implication
Remote members could run without intended workspace binding unless `workspaceRootPath` was both provided and selected by fallback logic. This is unreliable for cross-node execution.

### Resolution
1. Enforced remote-member `workspaceRootPath` requirement at team-config hydration gate.
2. Added home-node fallback: when `workspaceId` lookup misses and `workspaceRootPath` is present, resolve workspace by root path.
3. Added integration regression tests for:
   - remote `workspaceId`-only hard failure,
   - stale `workspaceId` to `workspaceRootPath` fallback success.

## Additional Investigation Checkpoint (2026-02-23) - Member Folder Naming Clarity Gap

### Finding
1. Team-member folder naming is currently deterministic but opaque (`member_<hash>`), which is hard to inspect manually in `memory/agent_teams/<teamId>/`.
2. Runtime and persistence contracts only require uniqueness + stability; they do not require opaque-only IDs.
3. We can preserve deterministic identity and improve operator readability simultaneously.

### Decision
1. Keep deterministic identity source unchanged: `teamId + normalized memberRouteKey`.
2. Change generated `memberAgentId` format to readable deterministic form:
   - `<route_slug>_<hash16>`
3. `route_slug` is normalized from `memberRouteKey` and path-safe (`a-z0-9_`, slash folded to `_`), with bounded length.
4. Hash suffix remains mandatory to guarantee uniqueness and stability across nested-route collisions.

### Risk Assessment
1. New runs: safe and clearer folder names.
2. Existing runs: safe because persisted manifests carry concrete `memberAgentId`; restore/projection/delete path reads manifest IDs.
3. No compatibility wrapper required under no-legacy policy for newly generated IDs.

## Additional Investigation Checkpoint (2026-02-23) - Team Folder Naming Clarity Gap

### Finding
1. Team folder names were generated as `team_<id8>` regardless of team definition name.
2. This made memory inspection less intuitive than single-agent style IDs that include readable name context.
3. Team identity safety does not require opaque prefix naming; it requires immutability after creation.

### Decision
1. Generate team IDs as `<team_name_slug>_<id8>`.
2. Use resolved team definition name (fallback to `teamDefinitionId`) as slug source.
3. Keep `teamId` immutable once created; restore/projection/delete/distributed routing continue to use persisted `teamId`.
4. Apply same naming update to both server resolver entry-point generation and core team factory generation to avoid drift between call paths.
