# Implementation Plan

## Baseline
Design and deep-review status: `Go Confirmed`.
Canonical contract: team-member persistence under `memory/agent_teams/<teamId>/<memberAgentId>/...`.

## Workstreams

### WS-1: Manifest Store Boundary Cleanup
1. Update `src/run-history/store/team-run-manifest-store.ts`:
- keep manifest-only responsibilities,
- remove any member-layout materialization/link behavior from implementation path.

### WS-2: Team-Member Layout Store
1. Add `src/run-history/store/team-member-memory-layout-store.ts`:
- `getMemberDirPath(teamId, memberAgentId)`,
- safe path checks,
- local member-subtree ensure/remove helpers.

### WS-3: Team-Member Projection Reader
1. Add `src/run-history/services/team-member-memory-projection-reader.ts`:
- read member memory from `agent_teams/<teamId>/<memberAgentId>`.
2. Update `src/run-history/services/team-member-run-projection-service.ts`:
- local canonical read via new reader,
- remote fallback uses manifest-authoritative `hostNodeId`,
- avoid shallow team-definition fallback for nested distributed members.

### WS-4: Team Continuation Restore Alignment
1. Update `src/run-history/services/team-run-continuation-service.ts`:
- local restore reads canonical team-member subtree,
- pass canonical per-member `memoryDir`,
- workspace-binding consistency checks,
- rollback behavior preserved on partial failure.

### WS-4A: Manifest Binding Completeness
1. Update `src/api/graphql/types/agent-team-instance.ts`:
- persist effective per-member `hostNodeId` into manifest for create/lazy-create paths,
- set canonical per-member `memoryDir` in runtime member configs for create path,
- resolve placement by canonical `memberRouteKey` (flattened leaf route map) for nested distributed cases.

### WS-5: History And Activity Services
1. Update `src/run-history/services/team-run-history-service.ts`:
- enforce canonical path policy,
- explicit legacy-cutoff handling,
- replace host-local-only delete with lifecycle-driven distributed coordinator flow.
2. Add `src/run-history/services/team-run-history-delete-coordinator-service.ts`:
- group delete bindings by `hostNodeId`,
- execute local subtree deletion,
- dispatch remote cleanup and return `COMPLETE`/`PENDING_RETRY`.
3. Update `src/run-history/services/team-run-activity-sink-service.ts` if required:
- ensure append path targets canonical team-member subtree.

### WS-5A: Distributed Delete Transport + Worker Cleanup
1. Add dedicated `teamId`-scoped history cleanup transport (host dispatcher + worker cleanup route), decoupled from runtime `TeamEnvelope` command path.
2. Add worker cleanup handler to delete worker-local member subtrees idempotently for provided binding subset.
3. Persist/transition `deleteLifecycle` (`READY`/`CLEANUP_PENDING`) in host index flow during distributed cleanup retries.

### WS-5B: Distributed Inactive Preflight
1. Add distributed-authoritative runtime-state probe for `teamId` before delete cleanup.
2. Block delete execution when any node reports active runtime drift.
3. Add retry/reconciliation behavior for probe timeout or conflicting runtime signals.

### WS-5C: TeamId Propagation In Distributed Bindings
1. Extend bootstrap payload schema to include host `teamId` for worker binding.
2. Extend worker run-scoped binding registry model to store `teamId`.
3. Wire preflight/cleanup guard logic to binding `teamId` lookups (no definition-level fallback).
4. Update distributed runtime/app wiring to register and route cleanup/probe endpoints consistently.

### WS-6: Tests
1. `tests/e2e/run-history/team-member-projection-contract.e2e.test.ts`
- assert canonical subtree projection and append behavior.
2. `tests/e2e/run-history/team-run-history-graphql.e2e.test.ts`
- assert canonical layout fixtures and legacy-cutoff behavior.
3. Distributed integration tests:
- assert host/worker partitioning,
- assert 3-node nested topology behavior,
- assert mixed placement variant (for example local `professor`, remote `scribe`),
- assert host-manifest-only variant (all members remote),
- assert nested duplicate leaf-name disambiguation by route key.
4. Delete matrix tests:
- local delete idempotency,
- distributed mixed/split delete with remote ack,
- host-manifest-only delete,
- nested 3-node delete,
- partial failure and retry convergence with `CLEANUP_PENDING`.
5. Distributed inactive-preflight tests:
- active runtime on worker blocks delete,
- probe timeout blocks destructive cleanup and returns retryable result.
6. TeamId propagation tests:
- worker bootstrap persists host `teamId` in run-scoped bindings,
- preflight resolves active state by `teamId`,
- delete guard does not cross-match unrelated teams sharing definition lineage.

### WS-7: Docs Sync
1. Update docs memory-layout sections to match requirements and verified behavior.

## Verification Checklist
1. Unit tests for layout store path helpers/safety checks.
2. Unit tests for projection reader local + error branches.
3. Unit tests for continuation restore rollback + workspace-binding checks.
4. Targeted e2e/integration tests for local, distributed 2-node, distributed nested 3-node cases.
5. Targeted integration test for mixed local+remote member placement in a single team.
6. Targeted integration test for host-manifest-only distributed placement (no local member subtrees on host).
7. Negative tests for legacy non-canonical path access.
8. Targeted integration tests for delete matrix (D0-D4) and lifecycle transition persistence.
9. Targeted integration tests for delete preflight drift case (D5).
10. Targeted integration tests for teamId propagation/disambiguation (D6).
11. Manual spot-check of generated memory trees for Case A, Case B, Case B2, Case B3, Case C and delete outcomes.

## Sequence
1. WS-1
2. WS-2
3. WS-4A
4. WS-3
5. WS-4
6. WS-5
7. WS-5A
8. WS-5B
9. WS-5C
10. WS-6
11. WS-7
