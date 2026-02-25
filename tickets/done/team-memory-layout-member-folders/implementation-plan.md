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
1. Update `src/agent-team-execution/services/team-runtime-bootstrap-application-service.ts`:
- persist effective per-member `hostNodeId` into manifest for create/lazy-create paths,
- set canonical per-member `memoryDir` in runtime member configs for create path,
- resolve placement by canonical `memberRouteKey` (flattened leaf route map) for nested distributed cases.
2. Keep `src/api/graphql/types/agent-team-instance.ts` as delegation-only boundary (no placement/manifest assembly logic).

### WS-5: History And Activity Services
1. Update `src/run-history/services/team-run-history-command-service.ts` and `src/run-history/services/team-run-history-query-service.ts`:
- enforce canonical path policy,
- explicit legacy-cutoff handling,
- keep delete lifecycle/coordinator logic in command service.
2. Keep `src/run-history/services/team-run-history-service.ts` as thin compatibility facade with delegation only.
3. Add `src/run-history/services/team-run-history-delete-coordinator-service.ts`:
- group delete bindings by `hostNodeId`,
- execute local subtree deletion,
- dispatch remote cleanup and return `COMPLETE`/`PENDING_RETRY`.
4. Update `src/run-history/services/team-run-activity-sink-service.ts` if required:
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
1. Update team ID generation in application/factory entry points to `<team_name_slug>_<id8>`.
2. Source slug from resolved team definition name (fallback: teamDefinitionId), with path-safe normalization + length cap.
3. Keep teamId immutable after creation; do not recompute from later metadata changes.
4. Keep resolver as delegation-only caller for team ID generation logic.
5. Update unit expectations and distributed E2E verification for lazy-create + restore lifecycle.
6. Sync ticket requirements/design/review artifacts to the finalized teamId naming contract.

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
5. Ensure manager no longer owns direct policy condition branches beyond orchestration-level validation.

### WS-13: Distributed Runtime Composition Modularization
1. Add `src/distributed/bootstrap/distributed-runtime-composition-factory.ts` with explicit dependency assembly responsibility.
2. Move bootstrap/definition-reconciliation/routing-binding helper logic from `default-distributed-runtime-composition.ts` into focused helper modules.
3. Keep exported composition API stable (`getDefaultDistributedRuntimeComposition`, ingress/event getter helpers).

### WS-14: Run-History Command/Query Split
1. Add `src/run-history/services/team-run-history-query-service.ts` and `src/run-history/services/team-run-history-command-service.ts`.
2. Move read/list logic into query service and mutation/delete/lifecycle logic into command service.
3. Keep `team-run-history-service.ts` as stable facade delegating to command/query services.
4. Preserve delete preflight/coordinator behavior and lifecycle semantics.
5. Ensure facade contains no direct mutation/query policy logic after split.

### WS-15: Distributed Composition Intra-Service Decomposition
1. Add `src/distributed/bootstrap/distributed-runtime-core-dependencies.ts`:
- isolate node-directory/auth/client/bridge dependency initialization.
2. Add `src/distributed/bootstrap/host-runtime-routing-dispatcher.ts`:
- isolate host local-routing callback assembly used by `TeamRoutingPortAdapter`.
3. Refactor `src/distributed/bootstrap/distributed-runtime-composition-factory.ts`:
- keep stable output API,
- delegate internals to WS-15 collaborators,
- preserve bootstrap/uplink/routing behavior.

### WS-16: Team Runtime Bootstrap Intra-Service Decomposition
1. Add `src/agent-team-execution/services/team-member-placement-planning-service.ts`:
- isolate flattened route-key placement planning.
2. Add `src/agent-team-execution/services/team-run-manifest-assembly-service.ts`:
- isolate manifest binding/workspace-root assembly.
3. Refactor `src/agent-team-execution/services/team-runtime-bootstrap-application-service.ts`:
- keep stable `prepareTeamRuntimeBootstrap` contract,
- delegate policy internals to WS-16 collaborators,
- preserve outputs for create/lazy-create flows.

### WS-17: Worker Locality Ownership Correction (`embedded-local` Drift Guard)
1. Update `agent-team-instance-manager` locality resolution to prefer binding `hostNodeId` over definition `homeNodeId` when both exist.
2. Ensure hydration metadata (`teamMemberPlacement`) is derived from effective ownership identity so coordinator bootstrap skips non-local members on worker.
3. Update worker remote bootstrap handler to assign `memoryDir` only for worker-local bindings (`hostNodeId` matches worker node), set non-local to `null`.
4. Add regression tests:
- unit: worker bootstrap bound payload contains `memoryDir=null` for non-local bindings,
- integration: coordinator placement metadata reflects binding ownership when definition node is `embedded-local`.

### WS-18: Worker Rerun Bootstrap Liveness Recovery
1. Update `src/distributed/bootstrap/remote-envelope-bootstrap-handler.ts` bootstrap reuse policy:
- if cached runtime team exists but `isRunning=false`, terminate/recreate projection runtime before `bindRun`.
2. Update stale bound-run handling:
- if binding exists but bound runtime team is stopped, teardown/unbind/finalize stale run before rebuild.
3. Preserve normal fast-path behavior:
- keep existing fast return only when bound runtime exists and is running.
4. Add regression tests in `tests/unit/distributed/remote-envelope-bootstrap-handler.test.ts`:
- stopped cached runtime-team on rerun bootstrap is recreated,
- stale bound-run + stopped runtime is torn down then rebuilt.

### WS-19: Worker Bootstrap SoC Decomposition
1. Add `src/distributed/bootstrap/worker-bootstrap-member-artifact-service.ts`:
- isolate worker bootstrap member-binding normalization, canonical `memoryDir` shaping, and local `run_manifest.json` persistence.
2. Add `src/distributed/bootstrap/worker-bootstrap-runtime-reconciler.ts`:
- isolate stale-binding teardown + runtime-team liveness reconciliation + run binding/marking.
3. Refactor `src/distributed/bootstrap/remote-envelope-bootstrap-handler.ts`:
- keep external behavior contract unchanged,
- delegate artifact preparation and runtime reconciliation to WS-19 collaborators.
4. Add unit coverage for new collaborators and keep existing bootstrap handler regressions green.

### WS-20: Worker Command Dispatch Policy Centralization
1. Add `src/distributed/routing/worker-owned-member-dispatch-orchestrator.ts`:
- centralize worker-owned-member locality classification + worker-managed-run local-dispatch gating.
2. Update `src/distributed/routing/worker-member-locality-resolver.ts`:
- expose explicit ownership outcomes,
- keep compatibility helper for boolean call-sites where needed.
3. Refactor `src/distributed/bootstrap/remote-envelope-message-command-handlers.ts` and `src/distributed/bootstrap/remote-envelope-control-command-handlers.ts`:
- remove duplicated locality predicates and delegate to WS-20 orchestrator.
4. Align worker command-handler dependency naming to `selfNodeId` and keep fallback chain behavior unchanged.
5. Add unit coverage:
- `tests/unit/distributed/worker-owned-member-dispatch-orchestrator.test.ts`,
- update message/control/locality resolver tests to lock parity.

### WS-21: Layering Boundary Hardening (Binding Contracts + Placement Snapshot Injection)
1. Add `src/distributed/runtime-binding/run-scoped-member-binding.ts`:
- define distributed-layer `RunScopedMemberBinding` contract independent from application-service DTOs.
2. Refactor `src/distributed/runtime-binding/run-scoped-team-binding-registry.ts` and `src/distributed/routing/worker-member-locality-resolver.ts`:
- replace `TeamMemberConfigInput` imports with `RunScopedMemberBinding`.
3. Refactor `src/agent-team-execution/services/team-member-placement-planning-service.ts`:
- remove direct `getDefaultDistributedRuntimeComposition()` access,
- consume injected node-snapshot provider dependency.
4. Refactor worker command composition boundary:
- update `src/distributed/bootstrap/remote-envelope-command-handlers.ts` and composition wiring to pass `selfNodeId` without `hostNodeId` aliasing in worker policy paths.
5. Add/adjust unit coverage for:
- runtime-binding contract decoupling,
- placement planning with injected snapshot provider stubs,
- worker command handler dependency wiring naming parity.

### WS-22: Run-History Composition-Root Wiring + File-Explorer Flake Hardening
1. Add `src/run-history/services/team-run-history-runtime-dependencies.ts`:
- define explicit run-history runtime dependency contract and composition-root registration API.
2. Refactor run-history query/projection services:
- remove direct `getDefaultDistributedRuntimeComposition()` fallback reads from `team-run-history-service` and `team-member-run-projection-service`,
- consume runtime dependencies via WS-22 registry + env fallback only.
3. Wire run-history dependencies in app composition root:
- update `src/app.ts` to configure/reset run-history runtime dependencies alongside distributed runtime lifecycle.
4. Harden file-explorer integration timing under parallel load:
- increase bounded wait windows + diagnostics in:
  - `tests/integration/file-explorer/file-name-indexer.integration.test.ts`,
  - `tests/integration/file-explorer/file-system-watcher.integration.test.ts`.
5. Preserve behavior contracts:
- no GraphQL API changes,
- no memory-layout contract changes,
- maintain existing run-history restore/list/delete semantics.

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
18. Verify resolver and run-history facade layers contain delegation-only logic (no placement/hydration/delete policy branches).
19. Verify distributed composition behavior parity after WS-15 collaborator extraction (bootstrap, uplink, host local-routing dispatch).
20. Verify runtime bootstrap output parity after WS-16 collaborator extraction (`teamId`, member configs, manifest bindings).
21. Verify worker node does not create non-local coordinator/member memory artifacts when binding ownership is remote.
22. Verify locality fallback path remains valid when binding `hostNodeId` is absent.
23. Verify rerun bootstrap after terminate does not reuse stopped cached worker team runtime and worker-originated `send_message_to` remains functional.
24. Verify WS-19 collaborator extraction keeps host-definition binding identity unchanged while worker runtime creation still uses worker-local definition identity.
25. Verify WS-20 centralization keeps worker handler fallback behavior unchanged while eliminating duplicated ownership predicates.
26. Verify WS-21 runtime-binding modules compile without importing `agent-team-instance-manager` DTO types.
27. Verify WS-21 placement planning behavior remains output-stable with injected node-snapshot provider stubs.
28. Verify WS-21 worker command composition passes `selfNodeId` end-to-end with no `hostNodeId` aliasing at worker dispatch-policy boundary.
29. Verify run-history services no longer read distributed runtime singleton directly in runtime-default path.
30. Verify parallel full backend test run no longer flakes in file-explorer integration suites.
31. Verify autobyteus-ts scoped integration flows (`agent-single-flow`, `agent-team-single-flow`) remain green after WS-22.

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
19. WS-15
20. WS-16
21. WS-17
22. WS-18
23. WS-19
24. WS-20
25. WS-21
26. WS-22
