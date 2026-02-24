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

### WS-8: Readable Team-Member ID Naming
1. Update `src/run-history/utils/team-member-agent-id.ts` to generate readable deterministic IDs using `<route_slug>_<hash16>`.
2. Keep deterministic uniqueness source unchanged (`teamId + normalized memberRouteKey` hash suffix).
3. Update unit tests and targeted E2E assertions that derive expected IDs via `buildTeamMemberAgentId`.
4. Sync ticket requirements/design/review artifacts to the finalized naming contract.

### WS-9: Readable Team ID Naming
1. Update team ID generation in resolver/factory entry points to `<team_name_slug>_<id8>`.
2. Source slug from resolved team definition name (fallback: teamDefinitionId), with path-safe normalization + length cap.
3. Keep teamId immutable after creation; do not recompute from later metadata changes.
4. Update unit expectations and distributed E2E verification for lazy-create + restore lifecycle.
5. Sync ticket requirements/design/review artifacts to the finalized teamId naming contract.

### WS-10: Runtime `memoryDir` Contract Cleanup
1. Update `autobyteus-ts` `AgentFactory` so explicit `memoryDir` (config or restore override) is treated as the final leaf memory directory.
2. Remove team-identity-driven layout branching from runtime memory wiring.
3. Update single-agent restore path in `autobyteus-server-ts` to pass explicit single-agent leaf directory when using restore override.
4. Update/extend `autobyteus-ts` unit/integration tests to lock the explicit-memory contract.
5. Sync ticket requirements/design/call-stack/review/progress artifacts after verification.

### WS-11: Resolver/Application Orchestration Split
1. Add `src/agent-team-execution/services/team-runtime-bootstrap-application-service.ts`.
2. Move team create/lazy-create preparation from resolver into service:
- teamId generation,
- placement-aware member-config shaping (`hostNodeId`, `memberAgentId`, `memoryDir`),
- manifest-input assembly.
3. Keep resolver as GraphQL boundary only (input conversion, service delegation, response mapping).
4. Preserve GraphQL API shape and error semantics.

### WS-12: Team Manager Hydration Split
1. Add `src/agent-team-execution/services/team-member-config-hydration-service.ts`.
2. Move member-definition + processor/tool/skill/workspace hydration logic from `agent-team-instance-manager.ts`.
3. Keep `agent-team-instance-manager.ts` focused on runtime lifecycle registry and team start/stop/list orchestration.
4. Preserve local-strict/remote-proxy resolution policy and workspace portability rules.

### WS-13: Distributed Runtime Composition Modularization
1. Add `src/distributed/bootstrap/distributed-runtime-composition-factory.ts` with explicit dependency assembly responsibility.
2. Move bootstrap/definition-reconciliation/routing-binding helper logic from `default-distributed-runtime-composition.ts` into focused helper modules.
3. Keep exported composition API stable (`getDefaultDistributedRuntimeComposition`, ingress/event getter helpers).

### WS-14: Run-History Command/Query Split
1. Add `src/run-history/services/team-run-history-query-service.ts` and `src/run-history/services/team-run-history-command-service.ts`.
2. Move read/list logic into query service and mutation/delete/lifecycle logic into command service.
3. Keep `team-run-history-service.ts` as stable facade delegating to command/query services.
4. Preserve delete preflight/coordinator behavior and lifecycle semantics.

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
12. Verify generated member folders are human-readable in team directories while retaining deterministic restore compatibility.
13. Verify generated team folders are human-readable while preserving distributed identity continuity.
14. Verify explicit runtime `memoryDir` always writes directly to leaf directory without extra `agents/<agentId>` nesting.
15. Verify GraphQL create/lazy-create/terminate/send responses are unchanged after resolver orchestration split.
16. Verify distributed bootstrap/routing behavior is unchanged after runtime-composition modularization.
17. Verify run-history list/resume/delete behaviors are unchanged after command/query split.

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
12. WS-8
13. WS-9
14. WS-10
15. WS-11
16. WS-12
17. WS-13
18. WS-14
