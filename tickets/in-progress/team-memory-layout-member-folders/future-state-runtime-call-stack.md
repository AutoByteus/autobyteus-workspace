# Future-State Runtime Call Stack

## Version
- Current Version: `v8`

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
3. `resolveRuntimeMemberConfigs(teamId, memberConfigs)` builds deterministic `memberAgentId` values.
4. Resolve effective per-member `hostNodeId` placement map at flattened leaf route-key level.
5. Resolve canonical per-member `memoryDir` under `memory/agent_teams/<teamId>/<memberAgentId>/`.
6. Persist manifest with populated `memberBindings[].hostNodeId` values.
7. `src/run-history/services/team-run-history-service.ts:upsertTeamRunHistoryRow(...)`
8. `src/run-history/store/team-run-manifest-store.ts:writeManifest(teamId, manifest)`
9. `src/run-history/store/team-member-memory-layout-store.ts:ensureLocalMemberSubtrees(teamId, bindings)`
10. Ensure `memory/agent_teams/<teamId>/<memberAgentId>/` exists for node-local members.
11. Runtime dispatch starts with per-member canonical `memoryDir`.

Error path:
- Invalid binding (empty route key/member ID) throws before runtime dispatch.

## UC-003: Local Nested Team Create Persists Flat Member Folders + Route-Key Mapping
Coverage: primary=Yes, fallback=N/A, error=Yes

1. `src/api/graphql/types/agent-team-instance.ts:resolveRuntimeMemberConfigs(...)`
2. `src/run-history/utils/team-member-agent-id.ts:buildTeamMemberAgentId(teamId, memberRouteKey)`
3. `buildTeamRunManifest(...)` persists `memberRouteKey` and `memberAgentId`.
4. Persist nested member `hostNodeId` and canonical `memoryDir` per binding.
5. `team-member-memory-layout-store.ts:ensureLocalMemberSubtrees(...)` creates flat member folders.
6. Nested route keys remain in manifest; filesystem remains flat by `memberAgentId`.

Error path:
- Duplicate canonical route key collision fails validation and aborts create.

## UC-004: Distributed Team Create Partitions Persistence By Host Node
Coverage: primary=Yes, fallback=Yes, error=Yes

1. Host receives team create/send request.
2. Host persists `team_run_manifest.json` at `memory/agent_teams/<teamId>/team_run_manifest.json`.
3. Host creates local member subtrees for bindings where `hostNodeId == host`.
4. Host persists manifest with explicit `hostNodeId` for all members.
5. Host sends remote bootstrap command with `teamId`, team-definition snapshot, binding snapshot (including `hostNodeId`, `memberAgentId`, `memoryDir`), run version.
6. Worker creates only its local member subtrees under `memory/agent_teams/<teamId>/<memberAgentId>/`.

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

1. `src/run-history/services/team-run-history-service.ts:deleteTeamRunHistory(teamId)`
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
3. Underlying memory append path writes raw traces/snapshots for member into `memory/agent_teams/<teamId>/<memberAgentId>/...`.
4. No writes to `memory/agents/<memberAgentId>` for team-member flows.

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
2. Host creates only local subtree (`member_professor`) under `memory/agent_teams/<teamId>/`.
3. Worker creates remote subtree (`member_scribe`) under same `teamId` on `node_b`.
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
1. Host `node_a` owns `member_professor`.
2. Worker `node_b` owns `member_scribe`, `member_analyst`.

Flow:
1. `team-run-history-service.ts:deleteTeamRunHistory(teamId)` loads manifest and groups bindings by `hostNodeId`.
2. Host marks index row `CLEANUP_PENDING`.
3. Host deletes local subtree set for `node_a`.
4. Host dispatches cleanup RPC to `node_b` with remote binding subset (`teamId`-scoped payload).
5. Worker cleanup route validates payload and forwards to `team-history-worker-cleanup-handler`.
6. Worker deletes only `node_b`-owned member subtrees and returns ack.
7. Host finalizes by deleting manifest + index row after all acks.

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

1. `team-run-history-service.ts:deleteTeamRunHistory(teamId)` starts preflight.
2. `team-history-runtime-state-probe-service.ts:probe(teamId)` checks host/worker runtime state for active run drift.
3. Probe resolves worker active state by explicit host `teamId` field stored in worker run-scoped bindings.
4. If any node reports active runtime for `teamId`, delete returns precondition failure and does not perform filesystem cleanup.
5. If probe confirms inactive state, coordinator proceeds with UC-008/UC-017..UC-020 flow.

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
