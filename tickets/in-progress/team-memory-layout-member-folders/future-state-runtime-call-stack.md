# Future-State Runtime Call Stack

## Version
- Current Version: `v21`

## Refactor Boundary Contract (v20)
1. Runtime behavior for UC-001..UC-030 is unchanged.
2. Application orchestration frames move out of GraphQL resolver files into dedicated application services.
3. Distributed runtime composition frames are split into composition assembly and bootstrap/routing policy helper modules.
4. Run-history mutation and query frames are split into command/query services behind a stable facade.
5. Intra-service decomposition is allowed only through collaborator extraction that preserves existing entrypoint outputs.
6. Worker command handlers share one ownership-first dispatch orchestrator for local-dispatch eligibility and worker-managed-run gating.
7. Distributed runtime-binding contracts are owned by distributed-layer modules, and placement planning receives node snapshots through injected provider boundaries.

## UC-001: Single-Agent Persistence Remains Global-Agent Scoped
Coverage: primary=Yes, fallback=N/A, error=Yes

1. `src/api/graphql/types/agent-instance.ts` (single-agent create/send path).
2. `src/run-history/services/run-history-service.ts` persists/reads by `agentId`.
3. `src/agent-memory-view/store/memory-file-store.ts` resolves `memory/agents/<agentId>/...`.
4. No team-history service path is involved.

Error path:
- Invalid or missing `agentId` yields single-agent projection/restore error without team-memory fallback.

## UC-002: Local Team Create Persists Canonical Team-Member Subtrees
Coverage: primary=Yes, fallback=N/A, error=Yes

1. `src/api/graphql/types/agent-team-instance.ts:sendMessageToTeam(input)`
2. Branch: lazy-create path (`!teamId` with team definition payload).
3. `src/agent-team-execution/services/team-runtime-bootstrap-application-service.ts:prepareLazyCreate(...)`
4. Prepare deterministic `memberAgentId`, flattened route-key placement, `hostNodeId`, and canonical per-member `memoryDir`.
5. Build team manifest payload with populated `memberBindings[].hostNodeId` values.
6. `src/run-history/services/team-run-history-command-service.ts:upsertTeamRunHistoryRow(...)`
7. `src/run-history/store/team-run-manifest-store.ts:writeManifest(teamId, manifest)`
8. `src/run-history/store/team-member-memory-layout-store.ts:ensureLocalMemberSubtrees(teamId, bindings)`
9. Ensure `memory/agent_teams/<teamId>/<memberAgentId>/` exists for node-local members.
10. `src/run-history/store/team-member-run-manifest-store.ts:writeManifest(...)` persists per-member `run_manifest.json` for local bindings.
11. Runtime dispatch starts with per-member canonical `memoryDir`.

Error path:
- Invalid binding (empty route key/member ID) throws before runtime dispatch.

## UC-003: Local Nested Team Create Persists Flat Member Folders + Route-Key Mapping
Coverage: primary=Yes, fallback=N/A, error=Yes

1. `src/api/graphql/types/agent-team-instance.ts:sendMessageToTeam(input)` enters lazy-create.
2. `src/agent-team-execution/services/team-runtime-bootstrap-application-service.ts:prepareLazyCreate(...)` resolves flattened nested route keys.
3. `src/run-history/utils/team-member-agent-id.ts:buildTeamMemberAgentId(teamId, memberRouteKey)` derives deterministic member IDs.
4. Application service builds manifest payload with route-key bindings and canonical per-member `memoryDir`.
5. `src/run-history/services/team-run-history-command-service.ts:upsertTeamRunHistoryRow(...)` persists manifest and local member layout.
6. `team-member-memory-layout-store.ts:ensureLocalMemberSubtrees(...)` creates flat member folders.
7. Nested route keys remain in manifest; filesystem remains flat by `memberAgentId`.

Error path:
- Duplicate canonical route key collision fails validation and aborts create.

## UC-004: Distributed Team Create Partitions Persistence By Host Node
Coverage: primary=Yes, fallback=Yes, error=Yes

1. Host receives team create/send request.
2. `team-runtime-bootstrap-application-service.ts` prepares placement-aware member configs + manifest input.
3. Host persists `team_run_manifest.json` at `memory/agent_teams/<teamId>/team_run_manifest.json`.
4. Host creates local member subtrees for bindings where `hostNodeId == host`.
5. Host persists manifest with explicit `hostNodeId` for all members.
6. Host sends remote bootstrap command with `teamId`, team-definition snapshot, binding snapshot (including `hostNodeId`, `memberAgentId`, `memoryDir`), run version.
7. Worker creates only its local member subtrees under `memory/agent_teams/<teamId>/<memberAgentId>/`.
8. Worker bootstrap writes local member `run_manifest.json` only for bindings whose `hostNodeId` is local.
9. Worker bootstrap skips coordinator initialization if coordinator binding is non-local to worker node.

Fallback path:
- Worker unreachable returns explicit distributed create failure.

Error path:
- Invalid remote binding metadata aborts create.

## UC-005: Local Team-Member Projection Read From Canonical Subtree
Coverage: primary=Yes, fallback=N/A, error=Yes

1. `src/api/graphql/types/team-run-history.ts:getTeamMemberRunProjection(teamId, memberRouteKey)`
2. `src/run-history/services/team-member-run-projection-service.ts:getProjection(teamId, memberRouteKey)`
3. `getTeamRunResumeConfig(teamId)` returns manifest bindings.
4. Resolve binding by canonical route key.
5. `src/run-history/services/team-member-memory-projection-reader.ts:getProjection(teamId, memberAgentId)`
6. Reader loads conversation from `memory/agent_teams/<teamId>/<memberAgentId>/...`.
7. Return projection payload.

Error path:
- Missing binding or missing canonical subtree returns explicit projection error.

## UC-006: Distributed Projection Local-First + Remote Fallback
Coverage: primary=Yes, fallback=Yes, error=Yes

1. Execute UC-005 local read path.
2. Local projection is empty.
3. Resolve remote `hostNodeId` from manifest member binding (authoritative).
4. Fetch remote projection via remote GraphQL projection contract.
5. Return remote projection when available.

Fallback path:
- Remote fetch timeout/unavailable returns local result path with warning log.

Error path:
- Invalid remote host resolution returns controlled error.

## UC-007: Team Continuation Restore Uses Canonical Team-Member Subtrees
Coverage: primary=Yes, fallback=Yes, error=Yes

1. `src/run-history/services/team-run-continuation-service.ts:continueTeamRun(input)`
2. Runtime missing -> `restoreTeamRuntime(teamId)`.
3. Load manifest bindings and workspace metadata.
4. Validate workspace-binding consistency for local bindings.
5. Resolve per-member canonical `memoryDir` from manifest+layout policy.
6. Restore local members from `memory/agent_teams/<teamId>/<memberAgentId>/...`.
7. Dispatch remote restore for non-local bindings.
8. On barrier completion, dispatch user message.
9. Update team activity index.

Fallback path:
- Partial restore failure triggers rollback of restored runtime.

Error path:
- Binding/workspace inconsistency aborts restore.

## UC-008: Team Delete Distributed Cleanup
Coverage: primary=Yes, fallback=Yes, error=Yes

1. `src/run-history/services/team-run-history-command-service.ts:deleteTeamRunHistory(teamId)`
2. Verify team not active.
3. Load manifest + index row and set lifecycle to `CLEANUP_PENDING`.
4. `src/run-history/services/team-run-history-delete-coordinator-service.ts:executeDeletePlan(teamId, manifest)`
5. `src/run-history/store/team-member-memory-layout-store.ts:removeLocalMemberSubtrees(teamId, memberAgentIds)`
6. For remote node groups, dispatch dedicated team-history cleanup RPC (`teamId`, binding subset) via `team-history-cleanup-dispatcher`.
7. On complete acknowledgements, remove host manifest and index row.
8. If pending node groups remain, persist `CLEANUP_PENDING` and return retryable result.

Fallback path:
- Worker unreachable marks cleanup retryable and blocks final index removal.

Error path:
- Unsafe path resolution or active team returns immediate failure.

## UC-009: Legacy Non-Canonical Cutoff
Coverage: primary=Yes, fallback=N/A, error=Yes

1. Team-member projection/restore attempts canonical subtree read.
2. Detect legacy-only data under `memory/agents/<memberAgentId>` with absent canonical subtree.
3. Return explicit unsupported legacy-history error.

Error path:
- No compatibility fallback to global team-member reads.

## UC-010: Docs + Tests Synchronization Gate
Coverage: primary=Yes, fallback=N/A, error=Yes

1. Update docs memory-layout pages from finalized requirements/design artifacts.
2. Run/validate local + distributed + nested + delete-matrix tests.
3. Verify docs examples match observed filesystem outputs from tests.
4. Block release if docs/test contracts diverge from canonical layout.

Error path:
- Any docs/test mismatch against canonical contract is a release blocker.

## UC-011: Ongoing Team-Member Append Writes Stay Canonical
Coverage: primary=Yes, fallback=N/A, error=Yes

1. Team member processes new turn/tool events.
2. `src/run-history/services/team-run-activity-sink-service.ts` handles activity updates.
3. Runtime agent factory receives explicit per-member `memoryDir` as leaf path (`memory/agent_teams/<teamId>/<memberAgentId>`).
4. Underlying memory append path writes raw traces/snapshots directly into that leaf directory.
5. No writes to `memory/agents/<memberAgentId>` for team-member flows.

Error path:
- Missing canonical member subtree yields append failure and explicit warning/error telemetry.

## UC-012: Distributed Nested 3-Node Partitioning
Coverage: primary=Yes, fallback=Yes, error=Yes

1. Host (`node_a`) owns manifest and local member subtrees for team `team_dist_nested_*`.
2. Worker `node_b` persists only its node-local nested members under same `teamId`.
3. Worker `node_c` persists only its node-local nested members under same `teamId`.
4. Leaf route-key ownership map (`memberRouteKey -> hostNodeId`) is persisted into manifest bindings.
5. Restore/projection/delete operations apply per-node partition using manifest `hostNodeId` map.

Fallback path:
- Any single worker unavailable causes explicit partial-failure state; no silent success.

Error path:
- Host-node and manifest-node ownership mismatch aborts operation.

## UC-013: Workspace-Binding Consistency Across Manifest/Restore
Coverage: primary=Yes, fallback=N/A, error=Yes

1. Manifest member binding includes workspace metadata.
2. Restore path resolves workspace based on binding metadata.
3. Projection/operation routing uses same member binding identity set.
4. If workspace metadata is inconsistent or unresolved, return explicit restore/projection failure.

## UC-014: Distributed Mixed Placement (Local + Remote Members In One Team)
Coverage: primary=Yes, fallback=Yes, error=Yes

Example topology:
1. `professor` on `node_a` (host local).
2. `scribe` on `node_b` (remote worker).
3. Optional extra remote members also on `node_b`.

Flow:
1. Host persists manifest with `professor.hostNodeId=node_a`, `scribe.hostNodeId=node_b`.
2. Host creates only local subtree (`professor_<hash16>`) under `memory/agent_teams/<teamId>/`.
3. Worker creates remote subtree (`scribe_<hash16>`) under same `teamId` on `node_b`.
4. Projection for `scribe` on host resolves remote via manifest `hostNodeId=node_b` and fetches worker projection.
5. Restore/delete paths follow the same manifest ownership split.

Fallback path:
- Worker unavailable yields explicit remote-member unavailability state; no silent local success.

Error path:
- If `hostNodeId` is missing or mismatched for remote member, operation fails with explicit routing error.

## UC-015: Distributed Host Manifest-Only (All Members Remote)
Coverage: primary=Yes, fallback=Yes, error=Yes

1. Host receives team run request and persists `team_run_manifest.json`.
2. Manifest has no binding with `hostNodeId == host`, so host creates no local member subtree.
3. Host dispatches remote bootstrap for all members using binding snapshot.
4. Remote nodes create all member subtrees under shared `teamId`.
5. Projection/restore/delete for team members from host route remotely by manifest ownership.

Fallback path:
- Remote-node partial availability results in explicit partial-failure state; host does not report full success.

Error path:
- If any member binding lacks remote ownership metadata, bootstrap/restore fails.

## UC-016: Nested Distributed Placement With Duplicate Leaf Names
Coverage: primary=Yes, fallback=Yes, error=Yes

1. Build flattened leaf list using canonical route keys (for example `subteam_a/reviewer`, `subteam_b/reviewer`).
2. Resolve placement by route key, not by leaf `memberName` alone.
3. Persist per-route `hostNodeId` and `memberAgentId` in manifest bindings.
4. Projection/restore routing resolves ownership from binding `memberRouteKey`, avoiding name collision ambiguity.

Fallback path:
- If route-key placement for one leaf is unavailable, operation degrades explicitly without corrupting other bindings.

Error path:
- Duplicate or missing canonical route keys abort create/restore before runtime dispatch.

## UC-017: Distributed Mixed/Split Delete (Host + Worker)
Coverage: primary=Yes, fallback=Yes, error=Yes

Example topology:
1. Host `node_a` owns `professor_<hash16>`.
2. Worker `node_b` owns `scribe_<hash16>`, `analyst_<hash16>`.

Flow:
1. `team-run-history-service.ts:deleteTeamRunHistory(teamId)` facade delegates to `team-run-history-command-service.ts:deleteTeamRunHistory(teamId)`.
2. Command service loads manifest and groups bindings by `hostNodeId`.
3. Host marks index row `CLEANUP_PENDING`.
4. Host deletes local subtree set for `node_a`.
5. Host dispatches cleanup RPC to `node_b` with remote binding subset (`teamId`-scoped payload).
6. Worker cleanup route validates payload and forwards to `team-history-worker-cleanup-handler`.
7. Worker deletes only `node_b`-owned member subtrees and returns ack.
8. Host finalizes by deleting manifest + index row after all acks.

Fallback path:
- Worker ack timeout keeps lifecycle pending; host returns retryable partial delete response.

Error path:
- Missing ownership metadata for one binding aborts finalization and keeps lifecycle pending.

## UC-018: Host-Manifest-Only Delete (All Members Remote)
Coverage: primary=Yes, fallback=Yes, error=Yes

1. Host loads manifest where no binding is owned by host node.
2. Host marks `CLEANUP_PENDING` and skips local member subtree delete (none exist).
3. Host dispatches remote cleanup commands to each worker ownership group.
4. Workers delete their local member subtrees and acknowledge.
5. Host removes manifest + index row only after all remote groups complete.

Fallback path:
- One worker unavailable keeps host record pending and preserves manifest for routing on retry.

Error path:
- If all remote targets unresolved from node directory, host fails delete as pending/unresolved.

## UC-019: Nested Distributed Multi-Node Delete (A/B/C)
Coverage: primary=Yes, fallback=Yes, error=Yes

1. Host resolves route-key leaf bindings from manifest (`memberRouteKey`, `memberAgentId`, `hostNodeId`).
2. Host builds per-node cleanup plan; duplicate leaf names in different route branches remain disambiguated by route key.
3. Host executes local cleanup for node A bindings.
4. Host dispatches remote cleanup commands to node B and node C with their binding subsets.
5. Workers perform idempotent local subtree delete and ack completion.
6. Host finalizes manifest/index removal only after node A/B/C groups are complete.

Fallback path:
- If one node fails, completed node groups are not retried unnecessarily; only pending groups are retried.

Error path:
- Route-key or binding corruption causes explicit delete-plan validation failure before dispatch.

## UC-020: Retry + Idempotent Delete Lifecycle
Coverage: primary=Yes, fallback=Yes, error=Yes

1. First delete attempt enters `CLEANUP_PENDING` and partially completes (for example node B success, node C timeout).
2. Persist pending node group set in delete coordinator result/metadata.
3. Second delete attempt re-loads manifest/index and retries only pending node C group.
4. Already-deleted subtrees (host or node B) are treated as idempotent success.
5. Once pending set is empty, host deletes manifest and removes index row.

Fallback path:
- Repeated retries continue returning pending state without corrupting completed node groups.

Error path:
- If manifest is missing while lifecycle is pending and remote cleanup status unknown, return explicit reconciliation-required error.

## UC-021: Distributed-Authoritative Inactive Preflight For Delete
Coverage: primary=Yes, fallback=Yes, error=Yes

1. `team-run-history-service.ts:deleteTeamRunHistory(teamId)` facade delegates to command service.
2. `team-run-history-command-service.ts:deleteTeamRunHistory(teamId)` starts preflight.
3. `team-history-runtime-state-probe-service.ts:probe(teamId)` checks host/worker runtime state for active run drift.
4. Probe resolves worker active state by explicit host `teamId` field stored in worker run-scoped bindings.
5. If any node reports active runtime for `teamId`, delete returns precondition failure and does not perform filesystem cleanup.
6. If probe confirms inactive state, coordinator proceeds with UC-008/UC-017..UC-020 flow.

Fallback path:
- Probe timeout returns conservative retryable preflight result (no destructive cleanup started).

Error path:
- Conflicting runtime state signals across nodes return explicit reconciliation-required error.

## UC-022: Worker Run-Binding TeamId Identity Propagation
Coverage: primary=Yes, fallback=Yes, error=Yes

1. Host bootstrap dispatch includes host `teamId` in worker bootstrap payload.
2. Worker bootstrap handler validates payload and binds run with `{ teamRunId, runVersion, teamId, runtimeTeamId, ... }`.
3. Worker runtime-state probe reads binding records by `teamId` for delete preflight checks.
4. Worker cleanup guard validates requested cleanup `teamId` against active binding records to avoid cross-team deletion.

Fallback path:
- If worker lacks binding for `teamId`, worker responds inactive/no-active-binding result (non-blocking for delete preflight).

Error path:
- Missing/invalid `teamId` in bootstrap payload fails bind and prevents distributed run activation.

## UC-023: Distributed Member Definition Identity Resolution (Cross-Node IDs)
Coverage: primary=Yes, fallback=Yes, error=Yes

Example topology:
1. Host node A has local member `professor` (`referenceId=2`).
2. Remote worker node B has member `student` (`referenceId=24`), and host node A does not have `agent_definitions.id=24`.

Flow:
1. `src/api/graphql/types/agent-team-instance.ts:sendMessageToTeam(input)` delegates lazy-create prep to application service.
2. `src/agent-team-execution/services/agent-team-instance-manager.ts:buildTeamConfigFromDefinition(...)` iterates members and delegates member hydration policy.
3. `src/agent-team-execution/services/team-member-config-hydration-service.ts:resolveAgentDefinitionForMember(...)` performs strict local lookup for `member.referenceId`.
4. If lookup misses and member is local to current node, throw hard error (`AgentDefinition with ID <id> not found`).
5. If lookup misses and member is remote, allow remote-proxy-safe hydration:
6. Try optional runtime `memberConfig.agentDefinitionId` lookup.
7. If still unresolved locally, synthesize remote proxy definition metadata and continue hydration.
8. `team-member-config-hydration-service.ts:buildAgentConfigFromDefinition(...)` sets `initialCustomData.agent_definition_id` and returns hydrated `AgentConfig`.
9. Host proceeds to bootstrap remote worker; worker executes remote member with its own local definition.

Fallback path:
- If host has a mirrored row for remote definition ID, resolve normally and avoid synthetic metadata.

Error path:
- Local-member missing definition remains a hard failure and aborts team creation.

## UC-024: Distributed Workspace Binding Portability (Remote Path Authority)
Coverage: primary=Yes, fallback=Yes, error=Yes

Example topology:
1. Host node A creates team with member `student` assigned to node B.
2. `workspaceId` from host may be stale/unknown on node B.
3. `workspaceRootPath` is provided as node-portable contract.

Flow:
1. `src/api/graphql/types/agent-team-instance.ts:sendMessageToTeam(input)` enters lazy-create path.
2. `team-runtime-bootstrap-application-service.ts` prepares member configs with placement metadata.
3. `src/agent-team-execution/services/agent-team-instance-manager.ts:buildTeamConfigFromDefinition(...)` delegates hydration.
4. `team-member-config-hydration-service.ts` enforces `workspaceRootPath` for remote members (`homeNodeId` non-local).
5. During home-node hydration, attempt `workspaceId` lookup first.
6. If `workspaceId` lookup misses and `workspaceRootPath` exists, call `workspaceManager.ensureWorkspaceByRootPath(...)`.
7. Bind resolved workspace and continue runtime bootstrap.

Fallback path:
- If `workspaceId` is stale on home node, `workspaceRootPath` fallback restores workspace binding without silent degradation.

Error path:
- Remote member missing `workspaceRootPath` fails fast with `AgentTeamCreationError` before distributed bootstrap.

## UC-025: Readable Deterministic Team-Member ID Generation
Coverage: primary=Yes, fallback=N/A, error=Yes

1. `team-runtime-bootstrap-application-service.ts` requests generated ID via `buildTeamMemberAgentId(teamId, memberRouteKey)`.
2. `src/run-history/utils/team-member-agent-id.ts:normalizeMemberRouteKey(memberRouteKey)` canonicalizes route separators/whitespace.
3. Build path-safe readable slug from normalized route key:
   - lowercase,
   - `/` -> `_`,
   - non `[a-z0-9_]` collapsed to `_`,
   - bounded slug length.
4. Compute deterministic hash suffix from `teamId + normalizedRouteKey` and append as `<slug>_<hash16>`.
5. Manifest persists this generated `memberAgentId`; canonical member folder path becomes `memory/agent_teams/<teamId>/<memberAgentId>/...`.

Error path:
- Empty/invalid `teamId` or `memberRouteKey` throws validation error before manifest/runtime creation.

## UC-026: Readable Immutable Team ID Generation
Coverage: primary=Yes, fallback=N/A, error=Yes

1. Team create/lazy-create resolves team metadata (`teamDefinitionName` fallback to `teamDefinitionId`).
2. `team-runtime-bootstrap-application-service.ts:generateTeamId(teamDefinitionName)` derives `team_name_slug`:
   - lowercase,
   - path-safe normalization,
   - bounded slug length.
3. Team ID is created as `<team_name_slug>_<id8>`.
4. That `teamId` is used consistently for:
   - runtime team instance creation,
   - manifest path (`agent_teams/<teamId>/team_run_manifest.json`),
   - member folder root (`agent_teams/<teamId>/<memberAgentId>`),
   - distributed bootstrap/run bindings,
   - continuation/delete/projection routing.
5. Once created, `teamId` is never recomputed from mutable team name fields.

Error path:
- Empty/invalid team-name slug input falls back to `team` base slug; creation still yields valid `teamId`.

## UC-027: Runtime Explicit-Memory Contract Is Uniform
Coverage: primary=Yes, fallback=N/A, error=Yes

1. `autobyteus-ts/src/agent/factory/agent-factory.ts:createRuntimeWithId(...)` resolves effective memory path.
2. Decision gate:
   - explicit `memoryDir` provided (config or restore override) -> treat as final leaf directory,
   - no explicit `memoryDir` -> resolve default memory root and use `agents/<agentId>` layout.
3. Runtime memory stores initialize with no team-identity lookup or team-specific branch.
4. Team create/restore call paths supply explicit per-member leaf directories; single-agent paths keep default layout unless explicit leaf directory is supplied.

Error path:
- Explicit `memoryDir` pointing to invalid/unwritable path fails at runtime store initialization.

## UC-028: Worker Bootstrap Skips Non-Local Coordinator Initialization
Coverage: primary=Yes, fallback=N/A, error=Yes

1. `src/agent-team-execution/services/agent-team-instance-manager.ts:buildAgentConfigFromDefinition(...)`
2. Server stamps `initialCustomData.teamMemberPlacement.isLocalToCurrentNode` for each member config.
3. `autobyteus-ts/src/agent-team/bootstrap-steps/coordinator-initialization-step.ts:execute(context)`
4. Coordinator step reads coordinator placement metadata.
5. If coordinator is non-local, step returns success without calling `teamManager.ensureCoordinatorIsReady(...)`.

Error path:
- Missing placement metadata falls back to default behavior (attempt coordinator init).

## UC-029: Per-Member Run Manifest Persistence Is Node-Local
Coverage: primary=Yes, fallback=N/A, error=Yes

1. Host create/lazy-create path calls `team-run-history-command-service:upsertTeamRunHistoryRow(...)`.
2. Service persists `team_run_manifest.json` and local member subtrees.
3. Service writes local member `run_manifest.json` via `team-member-run-manifest-store`.
4. Worker remote bootstrap handler writes member `run_manifest.json` only for local bindings.
5. No node writes member `run_manifest.json` for bindings owned by another node.

Error path:
- Invalid or missing binding identity fields abort per-member run-manifest write for that binding.

## UC-030: Refactor Separation-Of-Concerns Parity Gate
Coverage: primary=Yes, fallback=N/A, error=Yes

1. GraphQL entrypoints call `team-runtime-bootstrap-application-service` for create/lazy-create preparation.
2. `agent-team-instance-manager` delegates member hydration policy to `team-member-config-hydration-service`.
3. Distributed runtime composition is assembled by `distributed-runtime-composition-factory` while bootstrap/routing helpers remain in focused modules.
4. Run-history facade delegates read flows to `team-run-history-query-service` and mutation flows to `team-run-history-command-service`.
5. UC-001..UC-029 functional outputs (memory layout, restore/projection/delete semantics, GraphQL API behavior) remain unchanged.

Error path:
- Any parity mismatch in create/send/terminate/continue/projection/delete flows blocks refactor promotion.

## UC-031: Distributed Composition Internal Collaborator Extraction Parity
Coverage: primary=Yes, fallback=N/A, error=Yes

1. `src/distributed/bootstrap/default-distributed-runtime-composition.ts:getDefaultDistributedRuntimeComposition()` keeps stable external composition API.
2. `src/distributed/bootstrap/distributed-runtime-composition-factory.ts:createDistributedRuntimeComposition()` orchestrates assembly by delegating:
   - core dependency creation to `distributed-runtime-core-dependencies.ts`,
   - host local-routing callback assembly to `host-runtime-routing-dispatcher.ts`.
3. Factory wires collaborators into `TeamRunOrchestrator`, `TeamRunLocator`, ingress, and bridge services without changing call contracts.
4. Existing bootstrap/uplink/routing behavior remains equivalent for local and distributed flows.

Error path:
- Any behavior drift in uplink/bootstrap/local routing callbacks fails parity checks and blocks promotion.

## UC-032: Team Runtime Bootstrap Collaborator Extraction Parity
Coverage: primary=Yes, fallback=N/A, error=Yes

1. `src/agent-team-execution/services/team-runtime-bootstrap-application-service.ts:prepareTeamRuntimeBootstrap(...)` keeps stable return shape (`teamId`, `resolvedMemberConfigs`, `manifest`).
2. Service delegates route-key placement planning to `team-member-placement-planning-service.ts`.
3. Service delegates manifest binding assembly to `team-run-manifest-assembly-service.ts`.
4. Service retains orchestration-only responsibilities (ID selection + collaborator coordination) and preserves output semantics.

Error path:
- Any output mismatch in member config/manifest shaping (for same inputs) fails parity checks and blocks promotion.

## UC-033: Worker Bootstrap Locality Uses Binding Ownership (embedded-local Safe)
Coverage: primary=Yes, fallback=Yes, error=Yes

1. Worker ingress receives `RUN_BOOTSTRAP` with:
   - `memberBindings[*].hostNodeId`,
   - optional team definition snapshot nodes containing `homeNodeId`.
2. `src/distributed/bootstrap/remote-envelope-bootstrap-handler.ts:createDispatchRunBootstrapHandler(...)`
3. For each binding:
   - compute local-ownership via `isBindingLocalToNode(binding.hostNodeId, workerNodeId)`,
   - set `memoryDir` only when local,
   - force `memoryDir=null` for non-local bindings.
4. `src/agent-team-execution/services/agent-team-instance-manager.ts:buildTeamConfigFromDefinition(...)`
5. Resolve effective home-node identity with precedence:
   - `memberConfig.hostNodeId` first,
   - definition `member.homeNodeId` fallback.
6. Hydration path stamps `teamMemberPlacement` from effective home-node identity.
7. `autobyteus-ts` coordinator initialization step reads placement metadata and skips coordinator boot when non-local.
8. Worker runtime persists files only for local bindings; non-local coordinator/member subtree is not created on worker.

Fallback path:
- If binding `hostNodeId` is absent (legacy/invalid payload), worker falls back to definition `homeNodeId` for locality classification.

Error path:
- If fallback classification still marks non-local member as local due invalid metadata, bootstrap may start wrong member and tests must fail the parity gate.

## UC-034: Worker Rerun Bootstrap Rebuilds Stopped Runtime Team Before Binding
Coverage: primary=Yes, fallback=Yes, error=Yes

1. Worker receives rerun `RUN_BOOTSTRAP` for existing `teamId` after prior `CONTROL_STOP`.
2. `src/distributed/bootstrap/remote-envelope-bootstrap-handler.ts:createDispatchRunBootstrapHandler(...)`
3. Existing-binding gate:
   - if binding exists and bound team runtime is running => keep binding and return fast path,
   - if binding exists but bound runtime is stopped => terminate stale runtime instance, teardown run lifecycle, unbind/finalize stale run.
4. Runtime-team gate:
   - if cached runtime team is missing => create projection runtime,
   - if cached runtime team exists but `isRunning=false` => terminate stale instance and recreate projection runtime,
   - if cached runtime team is running with mismatched bindings => recreate projection runtime.
5. After runtime liveness is guaranteed, bind rerun (`bindRun`), mark worker-managed run, set worker uplink routing port, replace event forwarder.
6. Worker local message handling and worker-originated `send_message_to` both execute against active team runtime worker.

Fallback path:
- If stale binding cleanup partially fails, bootstrap returns failure and does not publish new run binding.

Error path:
- If runtime recreation fails, rerun bootstrap fails hard and no worker-managed run is marked.

## UC-035: Worker Command Handlers Use One Ownership-First Dispatch Orchestrator
Coverage: primary=Yes, fallback=Yes, error=Yes

1. Worker command ingress receives one of:
   - `USER_MESSAGE`,
   - `INTER_AGENT_MESSAGE_REQUEST`,
   - `TOOL_APPROVAL`.
2. `src/distributed/bootstrap/remote-envelope-message-command-handlers.ts` or `src/distributed/bootstrap/remote-envelope-control-command-handlers.ts` parses command payload.
3. Handler delegates local-dispatch decision to:
   - `src/distributed/routing/worker-owned-member-dispatch-orchestrator.ts:dispatchToWorkerOwnedMemberIfEligible(...)`.
4. Orchestrator resolves ownership with:
   - `src/distributed/routing/worker-member-locality-resolver.ts:resolveWorkerMemberDispatchOwnership(...)`
   using run-scoped binding map + `selfNodeId`.
5. If ownership is local and run is worker-managed:
   - orchestrator executes local routing-port dispatch once,
   - returns `handled=true`.
6. If not handled locally:
   - message path continues to existing fallback chain (`teamManager.dispatchInterAgentMessage` then `team.postMessage`),
   - tool-approval path continues to existing fallback (`team.postToolExecutionApproval`).

Fallback path:
- Ownership result is `RUN_BINDING_NOT_FOUND` or `TARGET_MEMBER_NOT_BOUND`; local dispatch is skipped and existing fallback chain remains authoritative.

Error path:
- Local-dispatch attempt for owned member is rejected by routing adapter/runtime guard; orchestrator surfaces explicit dispatch rejection and handler returns controlled dispatch error.

## UC-036: Layering Boundaries Stay Explicit Across Runtime Binding, Placement Planning, and Worker Command Composition
Coverage: primary=Yes, fallback=N/A, error=Yes

1. Team bootstrap/create path produces application-layer member configs (`TeamMemberConfigInput`) for runtime creation concerns only.
2. Distributed composition maps member bindings into distributed-layer contract:
   - `src/distributed/runtime-binding/run-scoped-member-binding.ts` (new).
3. `src/distributed/runtime-binding/run-scoped-team-binding-registry.ts` stores `RunScopedMemberBinding[]` without importing application-service DTO types.
4. `src/distributed/routing/worker-member-locality-resolver.ts` resolves ownership from distributed-layer binding contract only.
5. `src/agent-team-execution/services/team-member-placement-planning-service.ts` resolves placement using injected node-snapshot provider input, not `getDefaultDistributedRuntimeComposition()` singleton reads.
6. `src/distributed/bootstrap/remote-envelope-command-handlers.ts` passes `selfNodeId` naming through worker command-handler dependency boundaries without `hostNodeId` aliasing.

Error path:
- Any cross-layer type import from distributed runtime-binding/routing modules to application-service DTO files or singleton-based placement snapshot lookup fails layering gate and blocks promotion.

## UC-037: Run-History Runtime Defaults Are Composition-Root Injected (WS-22)
Coverage: primary=Yes, fallback=Yes, error=Yes
Source Type: Design-Risk

1. `src/app.ts:buildApp()` creates distributed runtime composition.
2. `src/app.ts` configures run-history runtime dependency registry:
   - `configureTeamRunHistoryRuntimeDependencies(distributedRuntime)`.
3. GraphQL/team-history read path invokes:
   - `src/run-history/services/team-run-history-service.ts` (facade),
   - `src/run-history/services/team-run-history-query-service.ts` and/or
   - `src/run-history/services/team-member-run-projection-service.ts`.
4. Service-default runtime identity/base URL reads resolve via:
   - `src/run-history/services/team-run-history-runtime-dependencies.ts:getTeamRunHistoryRuntimeDependencies()`.
5. If registry-provided values exist, services use them as runtime defaults.
6. On application shutdown, `src/app.ts` resets registry via:
   - `configureTeamRunHistoryRuntimeDependencies(null)`.

Fallback path:
- If runtime dependency registry is unset, services fall back to environment-derived defaults (`AUTOBYTEUS_SERVER_HOST`, node identity fallback).

Error path:
- If runtime defaults are unavailable and required node identity cannot be resolved for distributed projection fallback, service returns explicit resolution failure.

## UC-038: File-Explorer Integration Timing Remains Deterministic Under Parallel Load
Coverage: primary=Yes, fallback=N/A, error=Yes
Source Type: Design-Risk

1. Parallel backend suite executes file-explorer integration scenarios.
2. `tests/integration/file-explorer/file-name-indexer.integration.test.ts` waits for index conditions with bounded polling + enriched timeout diagnostics.
3. `tests/integration/file-explorer/file-system-watcher.integration.test.ts` validates event/no-event behavior with bounded wait windows sized for parallel load.
4. Assertions remain behavior-based (no unbounded sleeps), preserving deterministic outcomes.

Error path:
- If event/index conditions are not reached within bounded windows, tests fail with actionable diagnostics (current index/events context).
