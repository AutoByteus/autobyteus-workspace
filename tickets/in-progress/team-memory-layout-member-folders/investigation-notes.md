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

## Re-Investigation Checkpoint (2026-02-24) - Terminate/Reopen Team Member History Not Loading

### Additional Sources Consulted
- `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-server-ts/src/run-history/services/team-member-memory-projection-reader.ts`
- `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-server-ts/src/run-history/services/team-member-run-projection-service.ts`
- `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-server-ts/src/api/graphql/types/team-run-history.ts`
- `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-server-ts/src/agent-memory-view/store/memory-file-store.ts`
- `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-server-ts/tests/unit/run-history/team-member-memory-projection-reader.test.ts`
- `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-server-ts/tests/unit/run-history/team-member-run-projection-service.test.ts`
- `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-server-ts/tests/e2e/run-history/team-member-projection-contract.e2e.test.ts`
- `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-server-ts/tests/e2e/run-history/team-run-restore-distributed-process-graphql.e2e.test.ts`
- Host runtime log: `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-server-ts/logs/host-8000.log`
- Worker runtime log: `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-server-ts/docker/logs/docker-8001.log`

### Root Cause (Local Member)
1. Runtime writes team-member traces under:
   - `memory/agent_teams/<teamId>/<memberAgentId>/agents/<memberAgentId>/raw_traces*.jsonl`
2. Projection reader incorrectly read from:
   - `memory/agent_teams/<teamId>/<memberAgentId>/raw_traces*.jsonl`
3. Result: terminate/reopen showed empty conversation for local members despite existing traces.

### Root Cause (Remote Member)
1. Host remote fallback queried worker `getRunProjection(agentId)` or route-key-only projection path.
2. Worker history layout is team-scoped member subtree (not global `memory/agents/<agentId>`).
3. After terminate, worker may not retain host-manifest mirror; route-key resolution can fail with:
   - `Team run manifest not found for '<teamId>'`
4. Result: host projection fallback returned empty conversation for remote members.

### Resolution
1. Local projection reader now uses member directory as memory store root:
   - reads from canonical runtime path `.../<memberAgentId>/agents/<memberAgentId>/...`.
2. Remote fallback projection now includes `memberAgentId` and supports manifest-missing fallback:
   - query `getTeamMemberRunProjection(teamId, memberRouteKey, memberAgentId?)`,
   - when manifest lookup fails on worker, service reads directly via (`teamId`, `memberAgentId`).

### Validation Evidence
1. `pnpm test tests/unit/run-history/team-member-memory-projection-reader.test.ts tests/unit/run-history/team-member-run-projection-service.test.ts --reporter=dot` -> passed.
2. `pnpm test tests/e2e/run-history/team-member-projection-contract.e2e.test.ts --reporter=dot` -> passed.
3. `pnpm test tests/e2e/run-history/team-run-restore-distributed-process-graphql.e2e.test.ts --reporter=dot` -> passed.
4. Added distributed E2E assertion for terminate/reopen projection read:
   - validate `getTeamMemberRunProjection` returns non-empty conversation for remote member before continue rerun.

## Re-Investigation Checkpoint (2026-02-24) - Flat Team-Member Layout Enforcement

### Problem Confirmation
1. Requirement contract is flat under member subtree:
   - `memory/agent_teams/<teamId>/<memberAgentId>/{raw_traces,working_context_snapshot,...}`
2. Runtime still produced nested subtree:
   - `memory/agent_teams/<teamId>/<memberAgentId>/agents/<memberAgentId>/...`
3. This contradicted the ticket requirements and made folder inspection confusing.

### Root Cause
1. `autobyteus-ts` memory stores had a hard-coded `agents` root segment.
2. Team members already use member-specific `memoryDir`, so hard-coded segment caused an extra nesting level.

### Resolution
1. Added configurable memory root subdir in runtime stores:
   - `src/memory/store/file-store.ts`,
   - `src/memory/store/working-context-snapshot-store.ts`.
2. `AgentFactory` now enables flat mode for team members (detected via `initialCustomData.teamMemberIdentity`) and keeps default single-agent behavior unchanged.
3. Projection path handling aligned with flat contract while preserving remote manifest-missing fallback behavior.

### Validation Evidence
1. `autobyteus-ts` targeted tests:
   - `pnpm exec vitest tests/unit/memory/file-store.test.ts tests/unit/memory/working-context-snapshot-store.test.ts` -> passed.
2. `autobyteus-server-ts` targeted tests:
   - `pnpm test tests/unit/run-history/team-member-memory-projection-reader.test.ts tests/unit/run-history/team-member-run-projection-service.test.ts tests/integration/run-history/team-member-remote-projection-fallback.integration.test.ts tests/e2e/run-history/team-run-restore-distributed-process-graphql.e2e.test.ts` -> passed.
3. `autobyteus-server-ts` full suite:
   - `pnpm test` -> passed (`302` files passed, `3` skipped; `1188` tests passed, `7` skipped).

### Note On Prior 2026-02-24 Entry
The earlier terminate/reopen note that documented nested member paths under `agents/<memberAgentId>` is superseded by this flat-layout enforcement checkpoint.

## Re-Investigation Checkpoint (2026-02-24) - Core `memoryDir` Contract / SoC Drift

### Additional Sources Consulted
- `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-ts/src/agent/factory/agent-factory.ts`
- `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-ts/src/memory/store/file-store.ts`
- `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-ts/src/memory/store/working-context-snapshot-store.ts`
- `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-ts/src/agent-team/context/team-manager.ts`
- `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-server-ts/src/agent-execution/services/agent-instance-manager.ts`
- `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-server-ts/src/agent-team-execution/services/agent-team-instance-manager.ts`
- `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-ts/tests/integration/agent/working-context-snapshot-restore-flow.test.ts`
- `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-ts/tests/unit/agent/factory/agent-factory.test.ts`

### Findings
1. Runtime layout choice is currently inferred from `initialCustomData.teamMemberIdentity` in `AgentFactory`.
2. This leaks team-domain knowledge into core memory wiring and violates the intended separation of concerns.
3. `restoreAgent(..., memoryDir)` is currently used with two meanings:
   - single-agent restore: base memory root,
   - team-member restore: already-resolved leaf member directory.
4. This ambiguity increases regression risk and makes contract reasoning harder across create/restore paths.

### Root Cause
The core runtime contract for explicit `memoryDir` was never formalized; team-specific heuristics were added to compensate for inconsistent call-site semantics.

### Design Direction
1. Formalize one runtime contract:
   - if explicit `memoryDir` is supplied, it is the final leaf directory for memory files,
   - if not supplied, runtime uses default single-agent layout (`memory/agents/<agentId>`).
2. Remove team-identity-based memory-layout branching from `AgentFactory`.
3. Update single-agent restore call sites/tests to pass explicit single-agent leaf directory when they provide `memoryDir`.

### Expected Impact
1. Cleaner core library boundary: memory path contract is transport-agnostic and team-agnostic.
2. Better reliability for team/local/distributed consistency because layout is controlled by explicit path input, not inferred metadata.

### Implementation + Validation Outcome
1. Implemented in:
   - `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-ts/src/agent/factory/agent-factory.ts`
   - `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-server-ts/src/agent-execution/services/agent-instance-manager.ts`
   - `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-server-ts/src/agent-team-execution/services/agent-team-instance-manager.ts`
2. Regression tests:
   - `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-ts/tests/unit/agent/factory/agent-factory.test.ts`
   - `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-ts/tests/integration/agent/working-context-snapshot-restore-flow.test.ts`
   - `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-server-ts/tests/integration/agent-execution/agent-instance-manager.integration.test.ts`
3. Outcome:
   - explicit `memoryDir` path contract is now consistent across single-agent and team-member restore/create flows,
   - no team-domain branching remains in core memory layout selection.

## Re-Investigation Checkpoint (2026-02-24) - Worker Foreign-Member Materialization + Missing Member Run Manifest

### Problem Confirmation
1. Distributed mixed placement repro (`professor` on host, `student` on worker) still produced foreign-member artifacts on worker memory.
2. Requirements mandate per-member `run_manifest.json`, but implementation only guaranteed team member directories.

### Root Cause A (Worker Foreign-Member Artifacts)
1. Worker bootstrap hydrates full team definition and runs coordinator initialization.
2. Coordinator bootstrap step initialized coordinator even when that coordinator was non-local to worker.
3. Result: worker could instantiate host-owned coordinator/member and write foreign-member memory.

### Root Cause B (Per-Member Run Manifest Gap)
1. Host run-history upsert wrote only team manifest + local member directories.
2. Worker bootstrap path created runtime bindings but did not persist local per-member `run_manifest.json`.
3. Result: member folder contract was incomplete across host/worker.

### Resolution
1. Added member placement metadata at config hydration:
   - `initialCustomData.teamMemberPlacement.{homeNodeId,isLocalToCurrentNode}`.
2. Made coordinator bootstrap locality-aware:
   - skip `ensureCoordinatorIsReady` when coordinator is non-local to current node.
3. Added new store:
   - `src/run-history/store/team-member-run-manifest-store.ts`.
4. Host path:
   - `team-run-history-service.ts` now writes per-member `run_manifest.json` for local bindings during upsert.
5. Worker path:
   - `remote-envelope-bootstrap-handler.ts` now writes per-member `run_manifest.json` only for worker-local bindings (`hostNodeId` matches local node).

### Validation Evidence
1. Targeted TS unit:
   - `pnpm -C autobyteus-ts exec vitest tests/unit/agent-team/bootstrap-steps/coordinator-initialization-step.test.ts --reporter=dot` -> passed.
2. Targeted server unit/integration:
   - `pnpm -C autobyteus-server-ts test tests/unit/distributed/remote-envelope-bootstrap-handler.test.ts tests/unit/run-history/team-member-run-manifest-store.test.ts tests/integration/run-history/team-run-history-layout-create.integration.test.ts --reporter=dot` -> passed.
3. Distributed process E2E:
   - `pnpm -C autobyteus-server-ts test tests/e2e/run-history/team-run-restore-distributed-process-graphql.e2e.test.ts --reporter=dot` -> passed (host manifest-only + worker local member manifest assertion).
4. Full backend regression:
   - `pnpm -C autobyteus-server-ts test --reporter=dot` -> passed (`303` files passed, `3` skipped; `1191` tests passed, `7` skipped).

## Re-Investigation Checkpoint (2026-02-24) - Separation-Of-Concerns Hotspot Audit

### Sources Consulted
- `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-server-ts/src/api/graphql/types/agent-team-instance.ts`
- `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-server-ts/src/agent-team-execution/services/agent-team-instance-manager.ts`
- `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-server-ts/src/distributed/bootstrap/default-distributed-runtime-composition.ts`
- `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-server-ts/src/run-history/services/team-run-history-service.ts`
- `/Users/normy/autobyteus_org/autobyteus-workspace/tickets/in-progress/team-memory-layout-member-folders/requirements.md`
- `/Users/normy/autobyteus_org/autobyteus-workspace/tickets/in-progress/team-memory-layout-member-folders/proposed-design.md`
- `/Users/normy/autobyteus_org/autobyteus-workspace/tickets/in-progress/team-memory-layout-member-folders/future-state-runtime-call-stack.md`

### Evidence
1. Hotspot file sizes are still high and cross-cutting:
   - `agent-team-instance.ts` (`693` lines),
   - `agent-team-instance-manager.ts` (`732` lines),
   - `default-distributed-runtime-composition.ts` (`643` lines),
   - `team-run-history-service.ts` (`406` lines).
2. `agent-team-instance.ts` mixes GraphQL boundary concerns with:
   - nested team-definition traversal,
   - distributed placement planning,
   - workspace-root derivation,
   - team manifest assembly,
   - runtime member config shaping.
3. `agent-team-instance-manager.ts` mixes:
   - runtime lifecycle registry/cache ownership,
   - member definition resolution policy,
   - processor/tool/skill hydration,
   - workspace fallback policy,
   - recursive team-definition hydration.
4. `default-distributed-runtime-composition.ts` mixes:
   - dependency/container wiring,
   - bootstrap payload resolution,
   - worker definition reconciliation,
   - remote bootstrap dispatch policy,
   - host runtime routing-port binding.
5. `team-run-history-service.ts` mixes:
   - list/read query responsibilities,
   - upsert + member run-manifest materialization,
   - distributed delete preflight + lifecycle transitions + finalization.

### Implication
Functional coverage is strong, but these mixed-concern hotspots raise change risk for future distributed/team-memory iterations. Small behavior changes can still require edits across oversized files with too many reasons to change.

### Design Direction
1. Keep behavior contracts from UC-001..UC-029 unchanged.
2. Add a refactor-only architecture slice that isolates application orchestration from boundary/adaptor files.
3. Split hotspot responsibilities into focused modules:
   - resolver orchestration extraction,
   - manager hydration extraction,
   - runtime composition assembly extraction,
   - run-history command/query split.

## Re-Investigation Checkpoint (2026-02-24) - Future-State Call-Stack Drift Audit

### Finding
1. After refactor-planning updates (`v16` design), the call-stack artifact still contained several pre-refactor frames:
   - resolver-internal nested-create orchestration,
   - unsplit run-history delete/preflight mutation path,
   - missing application-service/hydration-service boundaries in identity/workspace/naming use cases.

### Implication
Even with good design modules, an inconsistent call-stack artifact can mislead implementation mapping and hide concern mixing during execution planning.

### Resolution
1. Updated `future-state-runtime-call-stack.md` to `v16`.
2. Corrected affected use cases (`UC-003`, `UC-017`, `UC-021`, `UC-023`, `UC-024`, `UC-025`, `UC-026`) to match planned SoC boundaries.
3. Re-ran deep-review rounds to reconfirm stability (`Round 44 -> Round 46`).

## Re-Investigation Checkpoint (2026-02-24) - Proposed-Design Ownership Drift Audit

### Finding
1. Despite call-stack alignment (`v16`), `proposed-design.md` still had residual ownership drift:
   - runtime data-flow diagram implied resolver-owned config/placement orchestration,
   - change-inventory rows still mapped policy-heavy work to resolver/facade modules.
2. `implementation-plan.md` retained a few workstream lines that still framed resolver/facade layers as direct policy owners.

### Implication
Implementation could drift back into mixed concerns even with a clean call stack, because design/plan ownership mapping was still partially ambiguous.

### Resolution
1. Updated `proposed-design.md` to `v17`:
   - diagram ownership aligned to application-service orchestration,
   - change inventory re-mapped to strict owners (`team-runtime-bootstrap-application-service`, `team-member-config-hydration-service`, `team-run-history-command/query-service`).
2. Updated `implementation-plan.md`:
   - resolver/facade layers explicitly delegation-only,
   - command/query ownership and verification checks tightened.
3. Re-ran deep-review rounds (`Round 47 -> Round 49`) and re-established `Go Confirmed`.

## Re-Investigation Checkpoint (2026-02-24) - Post-Refactor Decomposition Opportunity Audit

### Sources Consulted
- `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-server-ts/src/distributed/bootstrap/distributed-runtime-composition-factory.ts`
- `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-server-ts/src/agent-team-execution/services/team-runtime-bootstrap-application-service.ts`
- `/Users/normy/autobyteus_org/autobyteus-workspace/tickets/in-progress/team-memory-layout-member-folders/proposed-design.md`
- `/Users/normy/autobyteus_org/autobyteus-workspace/tickets/in-progress/team-memory-layout-member-folders/future-state-runtime-call-stack.md`
- `/Users/normy/autobyteus_org/autobyteus-workspace/tickets/in-progress/team-memory-layout-member-folders/future-state-runtime-call-stack-review.md`

### Findings
1. Core behavior is stable and covered, but two files remain oversized after WS-11..WS-14:
   - `distributed-runtime-composition-factory.ts` (`399` lines),
   - `team-runtime-bootstrap-application-service.ts` (`390` lines).
2. `distributed-runtime-composition-factory.ts` still bundles multiple concern clusters:
   - transport/auth/dependency creation,
   - bootstrap dispatch closure wiring,
   - worker event uplink wiring,
   - host-local routing adapter callback wiring.
3. `team-runtime-bootstrap-application-service.ts` still bundles multiple concern clusters:
   - team identity generation + metadata fetch,
   - placement graph traversal + host-node resolution,
   - runtime member config shaping,
   - manifest assembly + workspace-root normalization.
4. Existing boundary rules are not violated, but these files still have multiple internal reasons-to-change, which weakens future iteration speed and review clarity.

### Root Cause
1. WS-11..WS-14 extracted top-level cross-file ownership boundaries first.
2. A second-stage decomposition pass for intra-service collaborator boundaries was intentionally deferred.

### Design Direction (No Behavior Drift)
1. Split distributed factory internals into collaborator modules:
   - core transport/auth dependency builder,
   - host routing-dispatch callback builder.
2. Split runtime bootstrap application internals into collaborator modules:
   - placement planning service (`memberRouteKey -> hostNodeId`),
   - manifest assembly service (workspace snapshot + binding materialization).
3. Keep public APIs and runtime contracts unchanged:
   - no GraphQL schema changes,
   - no memory-layout/path contract changes,
   - no distributed transport contract changes.

### Implementation Implication
1. This is a refactor-only continuation scope and should be treated as `Medium` with full workflow gating (requirements -> design -> call stack -> deep review -> implementation -> full tests).

## Re-Investigation Checkpoint (2026-02-24) - Worker Non-Local Member Artifact Leak

### Additional Sources Consulted
- `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-server-ts/src/distributed/bootstrap/remote-envelope-bootstrap-handler.ts`
- `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-server-ts/src/agent-team-execution/services/agent-team-instance-manager.ts`
- `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-server-ts/src/agent-team-execution/services/team-member-config-hydration-service.ts`
- `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-ts/src/agent-team/bootstrap-steps/coordinator-initialization-step.ts`
- `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-server-ts/tests/unit/distributed/remote-envelope-bootstrap-handler.test.ts`
- `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-server-ts/tests/integration/agent-team-execution/agent-team-instance-manager.integration.test.ts`
- Runtime evidence:
  - docker worker memory tree under `/home/autobyteus/data/memory/agent_teams/<teamId>/`,
  - worker log stream showing unexpected coordinator initialization.

### Findings
1. Worker memory contained non-local coordinator artifacts (`professor_*`) even though worker ownership should be `student_*` only.
2. Worker bootstrap wrote `memoryDir` for all bindings, not just worker-local bindings.
3. Locality classification inside manager/hydration path was based on definition `homeNodeId`.
4. With distributed snapshots, host-local members may still carry `homeNodeId=embedded-local`; on worker this was incorrectly interpreted as local.
5. `autobyteus-ts` coordinator bootstrap step already supports skipping non-local coordinators, but it depends on correct `teamMemberPlacement.isLocalToCurrentNode` metadata.

### Root Cause
Effective ownership on worker used the wrong source (`definition.homeNodeId`) instead of distributed binding ownership (`memberConfig.hostNodeId`) when present.

### Resolution Direction
1. Define effective locality precedence:
   - first `memberConfig.hostNodeId`,
   - fallback `definition.homeNodeId`.
2. Derive hydration placement metadata from effective locality input.
3. Assign worker `memoryDir` only for local bindings and force non-local `memoryDir=null`.
4. Lock behavior with targeted unit + integration regression tests.

## Re-Investigation Checkpoint (2026-02-24) - Worker Bootstrap Validation Policy Leakage

### Additional Sources Consulted
- `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-server-ts/src/agent-team-execution/services/agent-team-instance-manager.ts`
- `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-server-ts/src/distributed/bootstrap/remote-envelope-bootstrap-handler.ts`
- `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-server-ts/tests/integration/agent-team-execution/agent-team-instance-manager.integration.test.ts`
- `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-server-ts/tests/unit/distributed/remote-envelope-bootstrap-handler.test.ts`
- Runtime logs:
  - `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-server-ts/logs/host-8000-debug.log`
  - `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-server-ts/logs/docker-8001.log`

### Findings
1. Distributed routing failure was caused by worker bootstrap re-validating non-local member `workspaceRootPath` under strict host rules.
2. Initial hotfix introduced a low-level skip flag (`skipRemoteWorkspaceRootPathValidation`) into generic `createTeamInstance*` API calls.
3. That flag solved behavior but leaked distributed-bootstrap policy into a generic team-instance API surface, which is a separation-of-concerns smell.

### Root Cause
Worker projection creation and host strict creation have different validation policies, but were both funneled through one generic creation entrypoint without explicit creation-mode semantics.

### Resolution Direction
1. Keep strict default semantics in generic `createTeamInstance*` APIs.
2. Add explicit manager-owned worker projection entrypoint:
   - `createWorkerProjectionTeamInstanceWithId(...)`
3. Move policy ownership into manager internals (`creationMode`), and make distributed bootstrap call the explicit projection API only.
4. Keep behavior coverage with targeted regression tests and distributed lifecycle integration tests.

## Re-Investigation Checkpoint (2026-02-24) - Artifact Drift After Locality Fix

### Additional Sources Consulted
- `/Users/normy/autobyteus_org/autobyteus-workspace/tickets/in-progress/team-memory-layout-member-folders/proposed-design.md`
- `/Users/normy/autobyteus_org/autobyteus-workspace/tickets/in-progress/team-memory-layout-member-folders/future-state-runtime-call-stack.md`
- `/Users/normy/autobyteus_org/autobyteus-workspace/tickets/in-progress/team-memory-layout-member-folders/future-state-runtime-call-stack-review.md`
- `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-server-ts/src/distributed/bootstrap/remote-envelope-bootstrap-handler.ts`
- `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-server-ts/src/agent-team-execution/services/agent-team-instance-manager.ts`

### Findings
1. Ticket artifacts drifted from latest implementation after worker-locality changes:
   - design version still declared `v18` despite v19 delta content,
   - design scope/coverage did not include `UC-033`,
   - diagram still referenced generic worker create API,
   - call-stack examples still used stale `member_*` naming examples.
2. Runtime code already reflected projection-specific worker creation API and binding-first locality ownership.

### Implication
If left unresolved, deep-review artifacts would under-specify latest behavior and weaken traceability between implementation and workflow docs.

### Resolution Direction
1. Promote design metadata to `v19` and add `UC-033` design coverage.
2. Correct worker flow diagram API name to projection-specific manager entrypoint.
3. Refresh call-stack artifact version and naming examples to match readable deterministic member ID contract.

## Re-Investigation Checkpoint (2026-02-24) - Worker Rerun Bootstrap Stopped-Runtime Reuse

### Additional Sources Consulted
- `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-server-ts/logs/docker-8001.log`
- `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-server-ts/src/distributed/bootstrap/remote-envelope-bootstrap-handler.ts`
- `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-server-ts/src/distributed/bootstrap/remote-envelope-control-command-handlers.ts`
- `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-ts/src/agent-team/runtime/agent-team-runtime.ts`
- `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-ts/src/agent-team/context/team-manager.ts`
- `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-ts/src/agent/message/send-message-to.ts`

### Findings
1. Repro confirmed on rerun after terminate:
   - host->worker message delivery still succeeded,
   - worker member `send_message_to` failed with `Agent team worker ... is not active`.
2. Worker `CONTROL_STOP` stops team runtime and unbinds run, but cached team instance can remain.
3. Worker rerun bootstrap reused cached stopped team instance when bindings matched.
4. Worker local ingress can still start target member nodes on-demand, masking team-runtime inactivity.
5. Member-originated `send_message_to` routes through `teamManager.dispatchInterAgentMessageRequest -> runtime.submitEvent`, which requires active team runtime worker and therefore fails.

### Root Cause
Bootstrap reuse policy considered existence + binding match, but not runtime liveness, for cached worker team instances and stale bound-run recovery.

### Resolution Direction
1. Add runtime-liveness check in worker bootstrap reuse policy.
2. If cached runtime team exists but is stopped, terminate/recreate projection runtime before binding rerun.
3. If bound run exists but points to stopped runtime, treat as stale: teardown/unbind/finalize then rebuild.
4. Add explicit regression tests for both stale-runtime paths.

## Re-Investigation Checkpoint (2026-02-24) - Worker Bootstrap Handler Concern Concentration

### Additional Sources Consulted
- `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-server-ts/src/distributed/bootstrap/remote-envelope-bootstrap-handler.ts`
- `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-server-ts/src/distributed/bootstrap/bootstrap-payload-normalization.ts`
- `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-server-ts/tests/unit/distributed/remote-envelope-bootstrap-handler.test.ts`

### Findings
1. `remote-envelope-bootstrap-handler.ts` still mixed multiple concerns:
   - member binding canonicalization and local `memoryDir` shaping,
   - member run-manifest persistence,
   - stale binding/runtime liveness reconciliation and rebinding,
   - envelope-level orchestration and routing-port installation.
2. Behavior contracts were stable, but ownership concentration made future regression risk higher during bootstrap fixes.

### Resolution Direction
1. Extract member-artifact logic into dedicated collaborator (`worker-bootstrap-member-artifact-service.ts`).
2. Extract runtime-liveness + stale-binding reconciliation into dedicated collaborator (`worker-bootstrap-runtime-reconciler.ts`).
3. Keep `remote-envelope-bootstrap-handler.ts` orchestration-only and preserve all external contracts.
4. Add dedicated unit tests for each collaborator plus existing bootstrap/integration regressions.

## Additional Investigation Checkpoint (2026-02-24) - Worker Local Dispatch Ownership Drift

### Additional Sources Consulted
- `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-server-ts/src/distributed/bootstrap/remote-envelope-message-command-handlers.ts`
- `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-server-ts/src/distributed/bootstrap/remote-envelope-control-command-handlers.ts`
- `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-server-ts/src/distributed/routing/worker-local-dispatch.ts`
- `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-server-ts/src/distributed/runtime-binding/run-scoped-team-binding-registry.ts`
- `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-ts/src/agent-team/context/team-manager.ts`
- `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-ts/src/agent-team/routing/local-team-routing-port-adapter.ts`
- `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-server-ts/logs/docker-8001.log`
- `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-server-ts/memory`
- `docker exec autobyteus-server find /home/autobyteus/data/memory ...`

### Runtime Evidence
1. Clean-start reproduction still generated worker-side foreign member path:
- `/home/autobyteus/data/memory/agents/professor_461c3411edd11e68/...`
2. Worker log explicitly showed lazy local creation of host-owned member:
- `Lazily creating agent node 'professor' with deterministic memberAgentId='professor_461c3411edd11e68'`.

### Root Cause
1. Worker envelope handlers attempted worker-local routing for worker-managed runs without first validating target-member ownership against run binding `hostNodeId`.
2. Local routing adapter delegates to `TeamManager.ensureNodeIsReady(...)`; without an ownership gate this can lazily create non-local members.
3. This bypassed the intended distributed routing ownership model and leaked host-owned member persistence into worker node memory.

### Design Conclusion
1. Correct ownership decision belongs at distributed routing orchestration boundary (worker envelope command handlers), not as an error-driven fallback hack.
2. Worker dispatch must pre-check target-member ownership from run-scoped bindings (`memberRouteKey/memberName -> hostNodeId`) before attempting local routing.
3. TeamManager should keep a runtime invariant guard and reject non-local member startup when placement metadata marks member non-local.
4. Local routing adapter should surface a stable rejection code for non-local target attempts (`TARGET_NODE_NOT_LOCAL`) for observability and guard-rail consistency.

### Resolution Summary
1. Added binding-aware worker locality resolver and gated worker-local dispatch on target ownership.
2. Added TeamManager non-local startup guard via placement metadata.
3. Added tests covering:
- binding-aware local/remote ownership resolution,
- non-local routing surfacing `TARGET_NODE_NOT_LOCAL`,
- worker inter-agent path forwarding to team-manager/uplink when recipient is non-local.

## Additional Investigation Checkpoint (2026-02-24) - Worker Dispatch-Policy Concern Mixing

### Additional Sources Consulted
- `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-server-ts/src/distributed/bootstrap/remote-envelope-message-command-handlers.ts`
- `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-server-ts/src/distributed/bootstrap/remote-envelope-control-command-handlers.ts`
- `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-server-ts/src/distributed/routing/worker-member-locality-resolver.ts`
- `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-server-ts/src/distributed/routing/worker-local-dispatch.ts`
- `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-server-ts/src/distributed/runtime-binding/run-scoped-team-binding-registry.ts`
- `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-server-ts/tests/unit/distributed/remote-envelope-message-command-handlers.test.ts`
- `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-server-ts/tests/unit/distributed/remote-envelope-control-command-handlers.test.ts`

### Findings
1. Ownership-first dispatch logic was duplicated across worker message and control handlers:
   - per-handler ownership predicate,
   - per-handler worker-managed-run local-dispatch gate,
   - per-handler local-routing-port dispatch wrapper.
2. This duplication created architecture drift risk: behavior could diverge between `USER_MESSAGE`, `INTER_AGENT_MESSAGE_REQUEST`, and `TOOL_APPROVAL` paths.
3. Worker command-layer identity naming used `localNodeId`, which can be confused with host/member role concepts; `selfNodeId` is semantically clearer for current-process ownership checks.

### Root Cause
Layer boundary was partially corrected (ownership-first routing existed), but policy was not centralized. The same ownership decision logic lived in multiple handlers instead of one routing-orchestrator boundary.

### Resolution Direction
1. Introduce a dedicated worker dispatch orchestrator that owns:
   - binding ownership classification,
   - worker-managed-run eligibility gating,
   - conditional local-routing-port dispatch.
2. Keep message/control handlers orchestration-only (payload normalization + fallback chain).
3. Update locality resolver to expose explicit ownership outcomes and align command-layer dependency naming to `selfNodeId`.

## Additional Investigation Checkpoint (2026-02-24) - Layering Boundary Drift After Refactor

### Additional Sources Consulted
- `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-server-ts/src/distributed/runtime-binding/run-scoped-team-binding-registry.ts`
- `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-server-ts/src/distributed/routing/worker-member-locality-resolver.ts`
- `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-server-ts/src/agent-team-execution/services/team-member-placement-planning-service.ts`
- `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-server-ts/src/distributed/bootstrap/remote-envelope-command-handlers.ts`
- `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-server-ts/src/distributed/bootstrap/distributed-runtime-composition-factory.ts`
- `/Users/normy/autobyteus_org/autobyteus-workspace/tickets/in-progress/team-memory-layout-member-folders/requirements.md`
- `/Users/normy/autobyteus_org/autobyteus-workspace/tickets/in-progress/team-memory-layout-member-folders/proposed-design.md`
- `/Users/normy/autobyteus_org/autobyteus-workspace/tickets/in-progress/team-memory-layout-member-folders/future-state-runtime-call-stack.md`

### Findings
1. Distributed runtime-binding registry still imports `TeamMemberConfigInput` from application service (`agent-team-instance-manager`), creating reverse layering dependency from distributed runtime back into application layer.
2. Worker locality resolver consumes the same application DTO type through run-binding contract, extending cross-layer coupling into routing policy boundary.
3. Placement planning service reads node snapshots from global default distributed runtime singleton, coupling planning logic to runtime bootstrap initialization state.
4. Worker command composition still aliases `hostNodeId` into `selfNodeId` at command-handler boundary, which keeps naming drift and boundary ambiguity.

### Root Cause
The earlier SoC refactor split responsibilities by file size/logic clusters, but did not fully enforce layer-owned contracts for types and dependency injection. Some boundary contracts still leak across layers via shared DTO imports and singleton reads.

### Resolution Direction
1. Introduce distributed-layer binding contract type (`RunScopedMemberBinding`) and make runtime-binding/routing modules depend on that contract only.
2. Add injected node-snapshot provider boundary for placement planning and remove direct default-composition singleton access from planning service.
3. Keep worker command composition naming aligned to `selfNodeId` end-to-end so worker-local policy contracts are explicit and role-neutral.

## Additional Investigation Checkpoint (2026-02-25) - WS-22 Doc/Code Alignment (Run-History DI + Parallel Flake Stability)

### Additional Sources Consulted
- `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-server-ts/src/run-history/services/team-run-history-runtime-dependencies.ts`
- `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-server-ts/src/run-history/services/team-run-history-service.ts`
- `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-server-ts/src/run-history/services/team-member-run-projection-service.ts`
- `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-server-ts/src/app.ts`
- `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-server-ts/tests/integration/file-explorer/file-name-indexer.integration.test.ts`
- `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-server-ts/tests/integration/file-explorer/file-system-watcher.integration.test.ts`
- Verification runs:
  - `cd /Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-server-ts && npx vitest run --reporter=dot`
  - `cd /Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-ts && npx vitest run tests/integration/agent/agent-single-flow.test.ts tests/integration/agent-team/agent-team-single-flow.test.ts`

### Findings
1. Residual run-history runtime-default coupling to distributed runtime singleton was a layering-quality gap (non-blocking previously, now addressed in WS-22).
2. App composition root now owns run-history runtime dependency registration lifecycle.
3. File-explorer parallel-timing flake behavior was attributable to too-tight bounded waits under heavy suite load, not behavior contract regressions.
4. Increased bounded windows + richer diagnostics keep tests deterministic without introducing unbounded sleep logic.

### Resolution Direction Confirmed
1. Keep run-history dependency ownership strictly composition-root wired via dedicated registry API.
2. Keep file-explorer integration assertions behavior-driven with bounded waits sized for parallel execution.
3. Synchronize ticket requirements/design/call-stack artifacts to WS-22 implementation state and verification evidence.
