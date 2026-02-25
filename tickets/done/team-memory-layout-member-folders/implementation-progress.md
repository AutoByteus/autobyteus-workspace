# Implementation Progress

## 2026-02-22
- [x] Investigation updated with branch timeline and drift confirmation.
- [x] Requirements expanded to documentation-grade local/distributed/nested memory layouts.
- [x] Requirements refined with finalized design decisions.
- [x] Proposed design reviewed and updated to `v2`.
- [x] Future-state runtime call stack updated to `v2`.
- [x] Review loop completed with `Go Confirmed` (Round 1 No-Go -> Round 2 Candidate Go -> Round 3 Go Confirmed).
- [x] Additional deep-review loop completed with `Go Confirmed` (Round 4 No-Go -> Round 5 Candidate Go -> Round 6 Go Confirmed).
- [x] Proposed design updated to `v3` with deeper use-case coverage and file-boundary corrections.
- [x] Additional deep-review loop completed with `Go Confirmed` (Round 7 No-Go -> Round 8 Candidate Go -> Round 9 Go Confirmed).
- [x] Proposed design updated to `v4` with explicit mixed-placement coverage and core-stack feasibility constraints.
- [x] Additional deep-review loop completed with `Go Confirmed` (Round 10 No-Go -> Round 11 Candidate Go -> Round 12 Go Confirmed).
- [x] Proposed design updated to `v5` with host-manifest-only and nested route-key placement edge-case coverage.
- [x] Implementation plan synchronized with latest deep-review-approved design.
- [x] Investigation updated with delete/remove-path implementation evidence (local-only delete, no remote cleanup command, lifecycle gap).
- [x] Requirements refined with explicit delete matrix (D0-D4), partial-failure retry semantics, and lifecycle finalization rules.
- [x] Proposed design updated to `v6` with distributed delete coordinator + remote cleanup command architecture.
- [x] Future-state runtime call stack updated to `v6` with UC-017..UC-020 delete/remove flows.
- [x] Additional deep-review loop completed with `Go Confirmed` (Round 13 No-Go -> Round 14 Candidate Go -> Round 15 Go Confirmed).
- [x] Additional deep-review loop completed with `Go Confirmed` (Round 16 No-Go -> Round 17 Candidate Go -> Round 18 Go Confirmed).
- [x] Requirements refined with distributed inactive-precondition + transport-decoupling constraints (D5).
- [x] Proposed design updated to `v7` with dedicated `teamId`-scoped cleanup transport and inactive-preflight architecture.
- [x] Future-state runtime call stack updated to `v7` with UC-001, UC-010, and UC-021 coverage.
- [x] Additional deep-review loop completed with `Go Confirmed` (Round 19 No-Go -> Round 20 Candidate Go -> Round 21 Go Confirmed).
- [x] Requirements refined with distributed teamId propagation/disambiguation constraints (D6).
- [x] Proposed design updated to `v8` with worker binding `teamId` propagation and runtime wiring requirements.
- [x] Future-state runtime call stack updated to `v8` with UC-022 teamId propagation flow.
- [x] Additional deep-review revalidation completed (Round 22), `Go Confirmed` retained with no new blockers.
- [x] Implement WS-1 manifest store boundary cleanup.
- [x] Implement WS-2 team-member layout store.
- [x] Implement WS-4A manifest binding completeness (`hostNodeId` + canonical `memoryDir` on create paths).
- [x] Implement WS-3 team-member projection reader integration (manifest-authoritative remote routing).
- [x] Implement WS-4 continuation restore alignment (canonical `memoryDir` + workspace consistency).
- [x] Implement WS-5 history/activity policy enforcement (canonical append path guarantees).
- [x] Implement WS-5A distributed delete transport + worker cleanup route.
- [x] Implement WS-5B distributed inactive preflight + drift guard.
- [x] Implement WS-5C distributed bootstrap/run-binding teamId propagation + route wiring.
- [x] Implement WS-6 test updates.
- [x] Implement WS-7 docs sync.
- [x] Post-completion WS-6 gap audit performed against delete/use-case matrix.
- [x] Added distributed delete integration coverage for:
  - host-manifest-only cleanup across multiple workers,
  - nested duplicate-leaf route cleanup ownership by member binding identity,
  - partial-failure `CLEANUP_PENDING` lifecycle and retry convergence,
  - teamId disambiguation guard (active runtime from other team does not block target delete).
- [x] Verification: `pnpm test tests/integration/distributed tests/integration/run-history tests/e2e/run-history --reporter=dot` (23 files / 33 tests passed).
- [x] Verification: `pnpm test tests/unit/run-history tests/unit/distributed tests/unit/api/graphql/types/agent-team-instance-resolver.test.ts tests/unit/agent-memory-view/store/memory-file-store.test.ts --reporter=dot` (52 files / 187 tests passed).
- [x] Verification note: `pnpm typecheck` still fails on existing repo-level TS6059 (`tests/**` included while `rootDir` is `src`), unchanged by this ticket.
- [x] Verification (expanded sweep after gap-closure): `pnpm test tests/integration/distributed tests/integration/run-history tests/e2e/run-history tests/unit/run-history tests/unit/distributed --reporter=dot` (74 files / 220 tests passed).
- [x] Added run-history create-layout integration coverage:
  - local nested route keys persist as flattened member directories under `agent_teams/<teamId>/<memberAgentId>`,
  - distributed mixed placement creates only host-local member subtrees on host,
  - host-manifest-only create keeps host directory manifest-only (all members remote).
- [x] Added run-history projection integration legacy-cutoff coverage:
  - local missing canonical subtree rejects projection even if legacy `memory/agents/<memberAgentId>` traces exist.
- [x] Added continuation integration coverage:
  - restore preserves per-member `hostNodeId` (including remote bindings) in runtime member configs,
  - workspace-binding mismatch during restore fails fast with explicit mismatch error.
- [x] Strengthened team projection E2E contract coverage:
  - create-time runtime member configs assert canonical per-member `memoryDir` under `agent_teams/<teamId>/<memberAgentId>`.
- [x] Verification (targeted new suites): `pnpm test tests/integration/run-history/team-run-history-layout-create.integration.test.ts tests/integration/run-history/team-member-remote-projection-fallback.integration.test.ts tests/integration/run-history/team-run-continuation-lifecycle.integration.test.ts tests/unit/run-history/team-run-continuation-service.test.ts --reporter=dot` (4 files / 13 tests passed).
- [x] Verification (latest expanded sweep): `pnpm test tests/integration/distributed tests/integration/run-history tests/e2e/run-history tests/unit/run-history tests/unit/distributed tests/unit/api/graphql/types/agent-team-instance-resolver.test.ts tests/unit/agent-memory-view/store/memory-file-store.test.ts --reporter=dot` (77 files / 231 tests passed).

## 2026-02-23 (Re-Investigation)
- [x] Reproduced runtime failure from UI scenario: distributed team (`professor` local, `student` on docker `8001`) fails at lazy create with `AgentDefinition with ID 24 not found`.
- [x] Verified host DB (`autobyteus-server-ts/db/production.db`) vs worker DB (`/tmp/autobyteus-docker-8001.db`) mismatch:
  - host team definition references `student.reference_id=24`,
  - host local `agent_definitions` has no `id=24`,
  - worker local `agent_definitions` has `id=24`.
- [x] Correlated host runtime logs to failure line and create path (`createTeamInstanceWithId -> buildTeamConfigFromDefinition -> buildAgentConfigFromDefinition -> getAgentDefinitionById`).
- [x] Confirmed blocker classification: distributed member-definition identity resolution gap (independent of team memory folder layout).
- [x] Requirements/design/call stack write-back completed for cross-node definition identity (`Case E`, design `v9`, call stack `v9`, review rounds 23-25).
- [x] Implemented node-aware member definition hydration in `src/agent-team-execution/services/agent-team-instance-manager.ts`:
  - local member missing definition remains hard-fail,
  - remote member missing host-local definition uses remote-proxy-safe synthetic hydration.
- [x] Added integration regression tests in `tests/integration/agent-team-execution/agent-team-instance-manager.integration.test.ts`:
  - mixed local+remote team succeeds when remote `referenceId` is absent locally,
  - local member missing definition still fails.
- [x] Verification:
  - `pnpm test tests/integration/agent-team-execution/agent-team-instance-manager.integration.test.ts --reporter=dot` (14/14 passed),
  - `pnpm test tests/unit/api/graphql/types/agent-team-instance-resolver.test.ts --reporter=dot` (4/4 passed).
- [x] Post-implementation docs sync:
  - updated `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-server-ts/docs/design/agent_team_communication_local_and_distributed.md`
    with distributed member-definition identity resolution contract (remote proxy-safe, local strict).
- [x] Re-opened design-impact iteration for distributed workspace portability:
  - remote member `workspaceRootPath` is now required (fail-fast even if `workspaceId` is present),
  - home-node hydration now falls back to `workspaceRootPath` when `workspaceId` is stale.
- [x] Added integration regression tests:
  - remote member with `workspaceId`-only config fails with explicit workspace-path error,
  - stale `workspaceId` resolves via `workspaceRootPath` fallback on home node.
- [x] Verification:
  - `pnpm test tests/integration/agent-team-execution/agent-team-instance-manager.integration.test.ts --reporter=dot` (16/16 passed),
  - `pnpm test tests/unit/api/graphql/types/agent-team-instance-resolver.test.ts --reporter=dot` (4/4 passed).
- [x] Multi-node verification sweep:
  - `pnpm test tests/integration/distributed tests/integration/run-history tests/e2e/run-history --reporter=dot` (25 files / 44 tests passed).
- [x] Coverage audit note:
  - distributed transport/routing, cross-node messaging, distributed history delete, and team-memory layout paths are covered by real integration tests;
  - run-history GraphQL E2E currently validates single-node lifecycle and schema-level behavior, but not a single process-level two-node end-to-end lifecycle (create + communication + continuation) in one unified test.
- [x] Added unified distributed run-history lifecycle integration coverage in
  - `tests/integration/run-history/distributed-team-memory-lifecycle.integration.test.ts`:
    - host+worker lifecycle (layout -> continue -> terminate -> continue -> delete),
    - host-manifest-only + two-worker + nested-route lifecycle with restore-after-terminate and cross-node cleanup.
- [x] Verification:
  - `pnpm test tests/integration/run-history/distributed-team-memory-lifecycle.integration.test.ts --reporter=dot` (1 file / 2 tests passed),
  - `pnpm test tests/integration/run-history --reporter=dot` (5 files / 17 tests passed),
  - `pnpm test tests/integration/distributed tests/integration/run-history tests/e2e/run-history --reporter=dot` (26 files / 46 tests passed).

## 2026-02-23 (Naming Iteration - Readable Team Member IDs)
- [x] Re-investigated naming contract against single-agent runtime naming:
  - single-agent runtime IDs are generated in `autobyteus-ts` as `<agentName>_<role>_<random4>`,
  - team-member IDs should remain deterministic for restore/replay, so random suffix strategy is not suitable for teams.
- [x] Updated generated team-member ID format from opaque hash-only to readable deterministic:
  - old: `member_<hash16>`
  - new: `<route_slug>_<hash16>`
- [x] Implemented in `src/run-history/utils/team-member-agent-id.ts` with path-safe route slug normalization and deterministic hash suffix preservation.
- [x] Updated unit contract tests in `tests/unit/run-history/team-member-agent-id.test.ts`.
- [x] Verified targeted suites:
  - `pnpm test tests/unit/run-history/team-member-agent-id.test.ts tests/e2e/run-history/team-member-projection-contract.e2e.test.ts tests/e2e/run-history/team-run-restore-distributed-process-graphql.e2e.test.ts --reporter=dot` (3 files / 7 tests passed).
- [x] Synchronized ticket artifacts (`investigation-notes.md`, `requirements.md`, `proposed-design.md`, `implementation-plan.md`) to the finalized naming contract.

## 2026-02-23 (Naming Iteration - Readable Team IDs)
- [x] Re-investigated team ID generation path:
  - server resolver generated `team_<id8>` regardless of team name,
  - core team factory also generated `team_<id8>`.
- [x] Implemented readable team ID generation contract:
  - new format: `<team_name_slug>_<id8>`,
  - slug source: resolved team definition name (fallback `teamDefinitionId`),
  - immutable after creation.
- [x] Updated implementation:
  - `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-server-ts/src/api/graphql/types/agent-team-instance.ts`,
  - `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-ts/src/agent-team/factory/agent-team-factory.ts`.
- [x] Updated unit expectation:
  - `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-server-ts/tests/unit/api/graphql/types/agent-team-instance-resolver.test.ts`.
- [x] Verification:
  - `pnpm test tests/unit/api/graphql/types/agent-team-instance-resolver.test.ts tests/unit/run-history/team-member-agent-id.test.ts tests/e2e/run-history/team-member-projection-contract.e2e.test.ts tests/e2e/run-history/team-run-restore-distributed-process-graphql.e2e.test.ts --reporter=dot` (4 files / 11 tests passed).
- [x] Synchronized ticket artifacts (`investigation-notes.md`, `requirements.md`, `proposed-design.md`, `future-state-runtime-call-stack.md`, `future-state-runtime-call-stack-review.md`, `implementation-plan.md`) for team ID naming contract.

## 2026-02-24 (Terminate/Reopen Projection Regression)
- [x] Reproduced user-reported bug: after terminate + reopen, team member history panel loaded empty conversation for both local and remote members.
- [x] Root-cause A fixed (local path mismatch):
  - `TeamMemberMemoryProjectionReader` now reads from runtime canonical path
    `memory/agent_teams/<teamId>/<memberAgentId>/agents/<memberAgentId>/raw_traces*.jsonl`.
- [x] Root-cause B fixed (remote manifest-missing fallback):
  - remote projection query now passes `memberAgentId`,
  - `getTeamMemberRunProjection` resolver/service supports optional `memberAgentId` fallback when worker manifest is absent after terminate.
- [x] Test hardening:
  - updated `tests/unit/run-history/team-member-memory-projection-reader.test.ts` to runtime-realistic `agents/<memberId>/raw_traces` fixture layout,
  - updated `tests/e2e/run-history/team-member-projection-contract.e2e.test.ts` to runtime-realistic member subtree layout,
  - extended `tests/e2e/run-history/team-run-restore-distributed-process-graphql.e2e.test.ts` with explicit terminate/reopen projection assertion for remote member history.
- [x] Verification:
  - `pnpm test tests/unit/run-history/team-member-memory-projection-reader.test.ts tests/unit/run-history/team-member-run-projection-service.test.ts --reporter=dot` (2 files / 7 tests passed),
  - `pnpm test tests/e2e/run-history/team-member-projection-contract.e2e.test.ts --reporter=dot` (1 file / 1 test passed),
  - `pnpm test tests/e2e/run-history/team-run-restore-distributed-process-graphql.e2e.test.ts --reporter=dot` (1 file / 1 test passed).

## 2026-02-24 (Flat Layout Contract Alignment + Stability Verification)
- [x] Re-validated requirement contract mismatch from runtime screenshot:
  - requirement expects flat team-member subtree
    `memory/agent_teams/<teamId>/<memberAgentId>/{raw_traces,working_context_snapshot,...}`,
  - runtime still emitted nested `agents/<memberAgentId>` under team member dir.
- [x] Implemented flat-layout support in `autobyteus-ts` runtime memory stores:
  - `src/memory/store/file-store.ts` added `agentRootSubdir` option,
  - `src/memory/store/working-context-snapshot-store.ts` added `agentRootSubdir` option,
  - `src/agent/factory/agent-factory.ts` routes team members to flat mode via `teamMemberIdentity`.
- [x] Confirmed projection/restore contract after flattening:
  - `TeamMemberMemoryProjectionReader` reads from team-root + flat member path contract,
  - distributed projection query keeps `memberAgentId` fallback for manifest-missing worker states.
- [x] Added/updated regression coverage for flat layout:
  - `autobyteus-ts/tests/unit/memory/file-store.test.ts`,
  - `autobyteus-ts/tests/unit/memory/working-context-snapshot-store.test.ts`,
  - `autobyteus-server-ts/tests/e2e/run-history/team-run-restore-distributed-process-graphql.e2e.test.ts` (assert no nested `agents/<memberId>` path).
- [x] Updated remote projection fallback integration to new GraphQL contract:
  - `tests/integration/run-history/team-member-remote-projection-fallback.integration.test.ts` now validates `getTeamMemberRunProjection(teamId, memberRouteKey, memberAgentId)`.
- [x] Stabilized full backend suite against watcher timing flakes encountered during full-run load:
  - `tests/integration/file-explorer/file-name-indexer.integration.test.ts` increased polling timeout + explicit per-test timeout,
  - `tests/integration/file-explorer/file-system-watcher.integration.test.ts` increased event wait windows and made folder add/delete assertions predicate-based.
- [x] Verification:
  - `autobyteus-ts`: `pnpm exec vitest tests/unit/memory/file-store.test.ts tests/unit/memory/working-context-snapshot-store.test.ts` (2 files / 9 tests passed),
  - `autobyteus-server-ts`: targeted run-history suites (unit + integration + distributed e2e) all passed,
  - `autobyteus-server-ts`: full suite passed (`302 passed, 3 skipped` test files; `1188 passed, 7 skipped` tests).

## 2026-02-24 (Runtime `memoryDir` Contract Cleanup)
- [x] Re-investigated SoC drift:
  - core runtime layout selection depended on `teamMemberIdentity` metadata,
  - explicit `memoryDir` semantics were ambiguous between single-agent and team-member restore paths.
- [x] Updated runtime memory contract implementation:
  - `autobyteus-ts/src/agent/factory/agent-factory.ts` now treats explicit `memoryDir` (config or restore override) as leaf directory and no longer infers layout from team identity metadata.
  - supersedes the temporary `teamMemberIdentity`-driven flat-layout toggle introduced in the earlier 2026-02-24 checkpoint.
- [x] Updated restore call-path alignment:
  - `autobyteus-server-ts/src/agent-execution/services/agent-instance-manager.ts` now passes explicit single-agent leaf directory (`<memoryDir>/agents/<agentId>`) during restore.
  - `autobyteus-server-ts/src/agent-team-execution/services/agent-team-instance-manager.ts` now sets `AgentConfig.memoryDir` from member config for explicit runtime path propagation consistency.
- [x] Added/updated regression tests:
  - `autobyteus-ts/tests/unit/agent/factory/agent-factory.test.ts`:
    - updated restore override expectation to leaf path,
    - added explicit-memoryDir leaf-contract test (no team metadata branching).
  - `autobyteus-ts/tests/integration/agent/working-context-snapshot-restore-flow.test.ts`:
    - updated restore override input to explicit single-agent leaf directory.
- [x] Verification:
  - `pnpm -C autobyteus-ts exec vitest tests/unit/agent/factory/agent-factory.test.ts tests/integration/agent/working-context-snapshot-restore-flow.test.ts tests/unit/memory/file-store.test.ts tests/unit/memory/working-context-snapshot-store.test.ts --reporter=dot` (4 files / 21 tests passed),
  - `pnpm -C autobyteus-server-ts test tests/integration/agent-team-execution/agent-team-instance-manager.integration.test.ts tests/unit/run-history/team-member-memory-projection-reader.test.ts tests/unit/run-history/team-member-run-projection-service.test.ts tests/e2e/run-history/team-run-restore-distributed-process-graphql.e2e.test.ts --reporter=dot` (4 files / 24 tests passed),
  - `pnpm -C autobyteus-server-ts test tests/integration/agent-execution/agent-instance-manager.integration.test.ts --reporter=dot` (1 file / 6 tests passed).

## 2026-02-24 (Post UC-034 Architecture Re-Validation + Artifact Sync)
- [x] Completed general architecture deep-review sweep for communication lifecycle (`start`, `terminate`, `continue`, cross-node reply).
- [x] Confirmed no blocker-level separation-of-concerns regressions after worker rerun-liveness fix.
- [x] Synchronized ticket review artifact with two-round stability proof:
  - `future-state-runtime-call-stack-review.md` Round 69 (`Candidate Go`) and Round 70 (`Go Confirmed`).
- [x] Recorded non-blocking refactor opportunities for future follow-up (bootstrap orchestration decomposition + explicit runtime-health contract).

## 2026-02-24 (WS-19: Worker Bootstrap SoC Decomposition)
- [x] Added `src/distributed/bootstrap/worker-bootstrap-member-artifact-service.ts`:
  - owns worker-local member-binding memoryDir shaping and local member `run_manifest.json` persistence.
- [x] Added `src/distributed/bootstrap/worker-bootstrap-runtime-reconciler.ts`:
  - owns stale-binding teardown, stopped-runtime rebuild, and run-binding reconciliation.
- [x] Refactored `src/distributed/bootstrap/remote-envelope-bootstrap-handler.ts`:
  - reduced handler to orchestration flow,
  - preserved host-definition binding identity and worker-definition runtime creation identity contracts.
- [x] Added unit coverage for extracted collaborators:
  - `tests/unit/distributed/worker-bootstrap-member-artifact-service.test.ts`,
  - `tests/unit/distributed/worker-bootstrap-runtime-reconciler.test.ts`.
- [x] Verification:
  - `pnpm -C autobyteus-server-ts test tests/unit/distributed/worker-bootstrap-member-artifact-service.test.ts tests/unit/distributed/worker-bootstrap-runtime-reconciler.test.ts tests/unit/distributed/remote-envelope-bootstrap-handler.test.ts --reporter=dot` (`3 files / 9 tests passed`),
  - `pnpm -C autobyteus-server-ts test tests/integration/distributed/team-rerun-rebootstrap.integration.test.ts tests/integration/run-history/distributed-team-memory-lifecycle.integration.test.ts --reporter=dot` (`2 files / 3 tests passed`),
  - `pnpm -C autobyteus-server-ts test tests/unit/distributed --reporter=dot` (`39 files / 136 tests passed`).
- [x] Full-suite feedback + local fix:
  - full backend run initially exposed one fixture drift in `tests/integration/distributed/bootstrap-rebind-cleanup-order.integration.test.ts` (stub still used `createTeamInstanceWithId`),
  - updated fixture to use `createWorkerProjectionTeamInstanceWithId` (no design impact; local test-adapter fix).
- [x] Full backend verification:
  - `pnpm -C autobyteus-server-ts test --reporter=dot` (`310 passed, 3 skipped` test files; `1206 passed, 7 skipped` tests).
- [x] Deep-review stability gate for this iteration:
  - `future-state-runtime-call-stack-review.md` Round 71 (`Candidate Go`) and Round 72 (`Go Confirmed`).

## 2026-02-24 (Worker Locality + Member Run Manifest Iteration)
- [x] Investigated and confirmed worker-side foreign-member materialization root cause:
  - non-local coordinator initialization executed during worker bootstrap.
- [x] Implemented worker-bootstrap locality guard:
  - `autobyteus-server-ts/src/agent-team-execution/services/agent-team-instance-manager.ts` now stamps member placement metadata (`teamMemberPlacement`).
  - `autobyteus-ts/src/agent-team/bootstrap-steps/coordinator-initialization-step.ts` skips coordinator init when `isLocalToCurrentNode=false`.
- [x] Added per-member run-manifest persistence contract:
  - new `autobyteus-server-ts/src/run-history/store/team-member-run-manifest-store.ts`,
  - `autobyteus-server-ts/src/run-history/services/team-run-history-service.ts` writes local member `run_manifest.json` on upsert,
  - `autobyteus-server-ts/src/distributed/bootstrap/remote-envelope-bootstrap-handler.ts` writes local member `run_manifest.json` on worker bootstrap and excludes non-local bindings.
- [x] Added/updated tests:
  - `autobyteus-ts/tests/unit/agent-team/bootstrap-steps/coordinator-initialization-step.test.ts`,
  - `autobyteus-server-ts/tests/unit/distributed/remote-envelope-bootstrap-handler.test.ts`,
  - `autobyteus-server-ts/tests/unit/run-history/team-member-run-manifest-store.test.ts`,
  - `autobyteus-server-ts/tests/integration/run-history/team-run-history-layout-create.integration.test.ts`,
  - `autobyteus-server-ts/tests/e2e/run-history/team-run-restore-distributed-process-graphql.e2e.test.ts`.
- [x] Verification:
  - `pnpm -C autobyteus-ts exec vitest tests/unit/agent-team/bootstrap-steps/coordinator-initialization-step.test.ts --reporter=dot` (1 file / 4 tests passed),
  - `pnpm -C autobyteus-server-ts test tests/unit/distributed/remote-envelope-bootstrap-handler.test.ts tests/unit/run-history/team-member-run-manifest-store.test.ts tests/integration/run-history/team-run-history-layout-create.integration.test.ts --reporter=dot` (3 files / 8 tests passed),
  - `pnpm -C autobyteus-server-ts test tests/e2e/run-history/team-run-restore-distributed-process-graphql.e2e.test.ts --reporter=dot` (1 file / 1 test passed),
  - `pnpm -C autobyteus-server-ts test --reporter=dot` (306 files: 303 passed, 3 skipped; 1198 tests: 1191 passed, 7 skipped).
- [x] Additional core-suite check:
  - `pnpm -C autobyteus-ts exec vitest tests/integration/agent tests/integration/agent-team --reporter=dot` shows existing external/live integration instability and auth-dependent failures unrelated to this ticket (for example missing `approved-tool-invocation-event-handler` import in runtime integration test and live-provider auth failures in Claude/Gemini tests).

## 2026-02-24 (Separation-Of-Concerns Refactor Planning Re-Entry)
- [x] Re-investigated architecture hotspots for concern mixing:
  - resolver orchestration concentration in `agent-team-instance.ts`,
  - hydration policy concentration in `agent-team-instance-manager.ts`,
  - assembly+policy concentration in `default-distributed-runtime-composition.ts`,
  - query+command concentration in `team-run-history-service.ts`.
- [x] Updated requirements with explicit SoC boundary rules and acceptance criteria (`no behavior drift` guardrail).
- [x] Updated proposed design to `v16` with:
  - `UC-030` refactor parity use case,
  - `D-036..D-040` change inventory for module decomposition,
  - expanded target module responsibilities for resolver/application, manager/hydration, composition factory, and run-history command/query split.
- [x] Updated future-state runtime call stack to `v15` with refactor-boundary contract and UC-030.
- [x] Updated implementation plan with WS-11..WS-14 refactor workstreams and parity verification checkpoints.
- [x] Completed deep review re-entry loop with stable gate:
  - Round 41 `No-Go` (blocking SoC findings),
  - Round 42 `Candidate Go`,
  - Round 43 `Go Confirmed`.
- [x] Implementation kickoff completed for WS-11..WS-14 (execution started after planning gate).

## 2026-02-24 (Deep Review Re-Run: Future-State Call-Stack SoC Alignment)
- [x] Ran another deep review explicitly against future-state call-stack SoC consistency.
- [x] Found and fixed call-stack drift against `proposed-design.md v16`:
  - nested create flow still referenced resolver-internal orchestration,
  - delete/preflight flows did not show facade -> command-service delegation,
  - identity/workspace/naming flows did not consistently show application-service + hydration-service boundaries.
- [x] Updated `/Users/normy/autobyteus_org/autobyteus-workspace/tickets/in-progress/team-memory-layout-member-folders/future-state-runtime-call-stack.md` to `v16`.
- [x] Recorded review loop:
  - Round 44 `No-Go` (drift blockers),
  - Round 45 `Candidate Go`,
  - Round 46 `Go Confirmed`.

## 2026-02-24 (Deep Review Re-Run: Proposed-Design + Plan Ownership Alignment)
- [x] Ran one more deep review focused on strict SoC ownership mapping across design + implementation plan.

## 2026-02-24 (Architecture Hardening: Worker Projection Validation Ownership)
- [x] Re-investigated latest distributed send failure from runtime logs:
  - host log and worker log confirmed worker bootstrap throw:
    `AgentTeamCreationError: Remote member 'professor' requires workspaceRootPath for home node 'node-disabled'`.
- [x] Implemented behavior fix first:
  - worker bootstrap path now allows non-local projection members without requiring host-only workspace-root validation.
- [x] Performed explicit SoC cleanup (no flag-hack boundary):
  - removed low-level skip-flag usage from distributed bootstrap call sites,
  - added explicit manager-owned projection API:
    `createWorkerProjectionTeamInstanceWithId(...)`,
  - retained strict validation defaults for generic create APIs.
- [x] Updated tests to lock architecture contract:
  - `tests/unit/distributed/remote-envelope-bootstrap-handler.test.ts`,
  - `tests/integration/agent-team-execution/agent-team-instance-manager.integration.test.ts`.
- [x] Verification:
  - `pnpm -C /Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-server-ts test tests/integration/agent-team-execution/agent-team-instance-manager.integration.test.ts tests/unit/distributed/remote-envelope-bootstrap-handler.test.ts` (`20/20` passed),
  - `pnpm -C /Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-server-ts test tests/integration/distributed/team-rerun-rebootstrap.integration.test.ts tests/integration/run-history/distributed-team-memory-lifecycle.integration.test.ts` (`3/3` passed).
- [x] Found residual ownership drift:
  - design runtime-flow diagram still implied resolver-owned orchestration,
  - change-inventory rows still assigned policy-heavy work to resolver/facade modules,
  - implementation plan still had non-strict resolver/facade phrasing in a few workstreams.
- [x] Updated `proposed-design.md` to `v17`:
  - diagram ownership aligned to application-service orchestration,
  - change inventory rows remapped to strict module owners.
- [x] Updated `implementation-plan.md`:
  - resolver/facade layers marked delegation-only,
  - command/query and application/hydration ownership criteria tightened.
- [x] Recorded deep-review loop:
  - Round 47 `No-Go` (design/plan ownership blockers),
  - Round 48 `Candidate Go`,
  - Round 49 `Go Confirmed`.

## 2026-02-24 (Implementation Execution: WS-11 Resolver/Application Split)
- [x] Implemented `team-runtime-bootstrap-application-service`:
  - new file `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-server-ts/src/agent-team-execution/services/team-runtime-bootstrap-application-service.ts`
  - owns team create/lazy-create preparation (`teamId`, placement-aware member configs, manifest input).
- [x] Refactored resolver to delegation-only for team bootstrap preparation:
  - updated `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-server-ts/src/api/graphql/types/agent-team-instance.ts`
  - removed resolver-internal placement/manifest assembly helpers and now delegates to application service.
- [x] Added unit coverage for new service:
  - `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-server-ts/tests/unit/agent-team-execution/team-runtime-bootstrap-application-service.test.ts`
- [x] Regression verification:
  - `pnpm -C /Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-server-ts test tests/unit/agent-team-execution/team-runtime-bootstrap-application-service.test.ts tests/unit/api/graphql/types/agent-team-instance-resolver.test.ts --reporter=dot` (2 files / 6 tests passed).
- [x] WS-12 implemented; WS-13/WS-14 moved to active execution.

## 2026-02-24 (Implementation Execution: WS-12 Team Manager Hydration Split)
- [x] Implemented `team-member-config-hydration-service`:
  - new file `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-server-ts/src/agent-team-execution/services/team-member-config-hydration-service.ts`
  - owns member definition resolution + processor/tool/skill/workspace hydration policy.
- [x] Refactored manager orchestration to delegate hydration:
  - updated `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-server-ts/src/agent-team-execution/services/agent-team-instance-manager.ts`
  - removed in-manager hydration/policy methods and replaced with delegation to hydration service.
- [x] Regression verification:
  - `pnpm -C /Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-server-ts test tests/integration/agent-team-execution/agent-team-instance-manager.integration.test.ts tests/unit/agent-team-execution/team-runtime-bootstrap-application-service.test.ts tests/unit/api/graphql/types/agent-team-instance-resolver.test.ts --reporter=dot` (3 files / 22 tests passed).
- [x] WS-13/WS-14 implemented and verified (see next section).

## 2026-02-24 (Implementation Execution: WS-13 Distributed Composition Split + WS-14 Run-History Command/Query Split)
- [x] Implemented WS-13 distributed runtime composition modularization:
  - added `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-server-ts/src/distributed/bootstrap/distributed-runtime-composition-factory.ts` as dependency-assembly boundary,
  - added `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-server-ts/src/distributed/bootstrap/runtime-team-resolution.ts` for bound-runtime resolution helpers,
  - added `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-server-ts/src/distributed/bootstrap/worker-team-definition-reconciler.ts` for worker definition reconciliation,
  - added `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-server-ts/src/distributed/bootstrap/host-bootstrap-snapshot-resolver.ts` for host bootstrap snapshot/team lookup helpers,
  - reduced `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-server-ts/src/distributed/bootstrap/default-distributed-runtime-composition.ts` to cache + stable API re-exports + delegation.
- [x] Implemented WS-14 run-history command/query split:
  - added `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-server-ts/src/run-history/services/team-run-history-command-service.ts` for mutation/lifecycle/delete policy,
  - added `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-server-ts/src/run-history/services/team-run-history-query-service.ts` for read/list/resume/rebuild,
  - refactored `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-server-ts/src/run-history/services/team-run-history-service.ts` into thin compatibility facade delegating to command/query services.
- [x] Verification (targeted SoC regression suites):
  - `pnpm -C /Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-server-ts test tests/unit/distributed/default-distributed-runtime-composition.test.ts tests/unit/run-history/team-run-history-service.test.ts tests/unit/api/graphql/types/team-run-history-resolver.test.ts tests/unit/api/graphql/types/agent-team-instance-resolver.test.ts --reporter=dot` (4 files / 27 tests passed).
- [x] Verification (distributed + run-history integration/E2E parity):
  - `pnpm -C /Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-server-ts test tests/integration/distributed tests/integration/run-history tests/e2e/run-history --reporter=dot` (27 files / 47 tests passed).
- [x] Verification (full backend):
  - parallel default run (`pnpm test --reporter=dot`) showed non-deterministic timing flakes in existing unrelated suites (`file-name-indexer.integration` timeout on one run, `prompt-service.integration` timeout on another run),
  - isolated reruns for each failing suite passed,
  - serialized full run passed: `pnpm -C /Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-server-ts test --reporter=dot --maxWorkers=1` (307 files: 304 passed, 3 skipped; 1200 tests: 1193 passed, 7 skipped).
- [x] Post-implementation docs sync decision:
  - No external docs behavior change required in `autobyteus-server-ts/docs` for WS-13/WS-14 (refactor-only boundary split; runtime contracts unchanged). Ticket artifacts already capture architectural boundary updates.

## 2026-02-24 (Deep Review Re-Run After WS-11..WS-14)
- [x] Ran another deep architecture review over implemented core stacks for `UC-001..UC-030` with strict SoC criteria.
- [x] Review outcome:
  - Round 50 `Candidate Go` (no blockers),
  - Round 51 `Go Confirmed` (second consecutive clean round).
- [x] Artifact update:
  - `/Users/normy/autobyteus_org/autobyteus-workspace/tickets/in-progress/team-memory-layout-member-folders/future-state-runtime-call-stack-review.md` updated with rounds 50-51.
- [x] Optional (non-blocking) follow-up improvements recorded:
  - further decomposition of `distributed-runtime-composition-factory.ts`,
  - move run-history dependency wiring from facade constructor into dedicated service factory.

## 2026-02-24 (Deep Review Re-Run: Additional SoC Architecture Pass)
- [x] Performed one more deep architecture review pass over implemented boundaries and future-state core-stack mappings.
- [x] Re-validated core boundary ownership in current implementation:
  - GraphQL resolver remains delegation-only,
  - application-service and hydration-service boundaries remain explicit,
  - run-history facade remains command/query delegator,
  - distributed runtime default entry remains cache/wrapper around factory composition.
- [x] Review outcome:
  - Round 52 `Candidate Go` (no blockers),
  - Round 53 `Go Confirmed` (second consecutive clean round).
- [x] Artifact update:
  - `/Users/normy/autobyteus_org/autobyteus-workspace/tickets/in-progress/team-memory-layout-member-folders/future-state-runtime-call-stack-review.md` updated with rounds 52-53.
- [x] Optional (non-blocking) improvement candidates kept in backlog:
  - further decomposition of `distributed-runtime-composition-factory.ts`,
  - further decomposition of `team-runtime-bootstrap-application-service.ts` into placement + manifest collaborator services.

## 2026-02-24 (Implementation Execution: WS-15 + WS-16 Intra-Service Collaborator Decomposition)
- [x] Completed workflow re-entry artifacts before implementation:
  - updated `requirements.md` for continuation collaborator-split criteria,
  - updated `proposed-design.md` to `v18` with `UC-031`, `UC-032`, `D-041..D-044`,
  - updated `future-state-runtime-call-stack.md` to `v17`,
  - deep review rounds recorded as `Round 54 Candidate Go` and `Round 55 Go Confirmed`.
- [x] Implemented WS-15 distributed composition decomposition:
  - added `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-server-ts/src/distributed/bootstrap/distributed-runtime-core-dependencies.ts`,
  - added `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-server-ts/src/distributed/bootstrap/host-runtime-routing-dispatcher.ts`,
  - refactored `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-server-ts/src/distributed/bootstrap/distributed-runtime-composition-factory.ts` to delegate internal dependency and local-routing callback assembly while keeping composition API stable.
- [x] Implemented WS-16 runtime bootstrap decomposition:
  - added `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-server-ts/src/agent-team-execution/services/team-member-placement-planning-service.ts`,
  - added `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-server-ts/src/agent-team-execution/services/team-run-manifest-assembly-service.ts`,
  - refactored `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-server-ts/src/agent-team-execution/services/team-runtime-bootstrap-application-service.ts` to orchestration-only with collaborator delegation.
- [x] Added focused regression coverage for new modules:
  - `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-server-ts/tests/unit/agent-team-execution/team-member-placement-planning-service.test.ts`,
  - `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-server-ts/tests/unit/agent-team-execution/team-run-manifest-assembly-service.test.ts`,
  - `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-server-ts/tests/unit/distributed/host-runtime-routing-dispatcher.test.ts`,
  - `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-server-ts/tests/unit/distributed/distributed-runtime-core-dependencies.test.ts`.
- [x] Verification:
  - targeted suite:
    - `pnpm -C autobyteus-server-ts test tests/unit/agent-team-execution/team-runtime-bootstrap-application-service.test.ts tests/unit/agent-team-execution/team-member-placement-planning-service.test.ts tests/unit/agent-team-execution/team-run-manifest-assembly-service.test.ts tests/unit/distributed/default-distributed-runtime-composition.test.ts tests/unit/distributed/host-runtime-routing-dispatcher.test.ts tests/unit/distributed/distributed-runtime-core-dependencies.test.ts --reporter=dot`
    - result: `6` files passed, `23` tests passed.
  - full backend serialized suite:
    - `pnpm -C autobyteus-server-ts test --reporter=dot --maxWorkers=1`
    - result: `308` files passed, `3` skipped; `1199` tests passed, `7` skipped.
- [x] Post-implementation docs sync decision:
  - no external docs behavior update required in `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-server-ts/docs` for WS-15/WS-16,
  - this iteration is internal architecture decomposition only; runtime contracts and memory-layout docs remain unchanged.

## 2026-02-24 (Implementation Execution: WS-17 Worker Locality Ownership Correction)
- [x] Re-investigated worker artifact leak after fresh runtime reproduction:
  - worker memory contained non-local coordinator subtree under `memory/agent_teams/<teamId>/professor_*`,
  - root cause isolated to locality classification drift (`embedded-local` from definition snapshot interpreted as worker-local) and unconditional worker `memoryDir` assignment.
- [x] Implemented binding-first locality resolution in manager hydration path:
  - updated `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-server-ts/src/agent-team-execution/services/agent-team-instance-manager.ts` to derive effective home node by precedence:
    - `memberConfig.hostNodeId` first,
    - definition `homeNodeId` fallback.
  - workspace/locality policy and hydration placement metadata now use effective home-node identity.
- [x] Implemented worker bootstrap `memoryDir` ownership guard:
  - updated `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-server-ts/src/distributed/bootstrap/remote-envelope-bootstrap-handler.ts`,
  - worker assigns `memoryDir` only for worker-local bindings and forces non-local bindings to `memoryDir=null`.
- [x] Added/updated regression tests:
  - `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-server-ts/tests/unit/distributed/remote-envelope-bootstrap-handler.test.ts`
    - asserts non-local binding (`professor`) has `memoryDir=null`,
    - asserts local binding (`student`) keeps canonical team-member path.
  - `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-server-ts/tests/integration/agent-team-execution/agent-team-instance-manager.integration.test.ts`
    - asserts coordinator placement metadata uses binding `hostNodeId` when definition `homeNodeId` is `embedded-local`.
- [x] Verification:
  - targeted:
    - `pnpm test tests/unit/distributed/remote-envelope-bootstrap-handler.test.ts tests/integration/agent-team-execution/agent-team-instance-manager.integration.test.ts --reporter=dot` (2 files / 20 tests passed),
  - distributed/run-history:
    - `pnpm test tests/integration/distributed tests/integration/run-history tests/e2e/run-history --reporter=dot` (27 files / 47 tests passed),
  - full backend serialized:
    - `pnpm test --reporter=dot --maxWorkers=1` (311 files: 308 passed, 3 skipped; 1207 tests: 1200 passed, 7 skipped).
- [x] Ticket artifact sync for this iteration:
  - updated `investigation-notes.md`, `requirements.md`, `proposed-design.md`, `future-state-runtime-call-stack.md`, `future-state-runtime-call-stack-review.md`, `implementation-plan.md`.

## 2026-02-24 (Deep Review Re-Run: Full Use-Case Core-Stack + Artifact Drift Correction)
- [x] Ran another deep review pass across all modeled use cases with strict SoC criteria:
  - resolver/application delegation boundaries,
  - manager/hydration policy boundaries,
  - distributed composition collaborator boundaries,
  - run-history command/query boundaries,
  - worker-locality ownership contract.
- [x] Found documentation drift blockers (Round 63 `No-Go`):
  - `proposed-design.md` version metadata lagged behind v19 delta content,
  - `UC-033` missing in design scope/coverage/traceability tables,
  - worker flow diagram still referenced generic create API,
  - call-stack examples still had stale `member_*` naming examples.
- [x] Applied write-backs:
  - updated `proposed-design.md` to `v19`,
  - updated `future-state-runtime-call-stack.md` to `v18`,
  - added `UC-033` and `D-045` coverage/traceability in design,
  - aligned worker diagram to `createWorkerProjectionTeamInstanceWithId(...)`,
  - aligned distributed naming examples to `<route_slug>_<hash16>`.
- [x] Re-ran review stability gate:
  - Round 64 `Candidate Go`,
  - Round 65 `Go Confirmed`.

## 2026-02-24 (Implementation Execution: WS-18 Worker Rerun Bootstrap Liveness Recovery)
- [x] Re-investigated terminate->rerun worker reply failure from docker runtime logs:
  - observed host->worker dispatch success with worker-member `send_message_to` failure:
    `Agent team worker for '<teamId>' is not active.`
  - confirmed split path: worker local ingress can start nodes on-demand even when team runtime worker is stopped.
- [x] Implemented bootstrap liveness recovery in:
  - `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-server-ts/src/distributed/bootstrap/remote-envelope-bootstrap-handler.ts`
    - stopped cached runtime-team is now treated as stale and rebuilt before `bindRun`,
    - stale bound-run pointing to stopped runtime now runs teardown/unbind/finalize before rebuild,
    - fast path remains only for bound-and-running runtime.
- [x] Added regression coverage:
  - `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-server-ts/tests/unit/distributed/remote-envelope-bootstrap-handler.test.ts`
    - `recreates stopped runtime team on rerun bootstrap before binding run`,
    - `rebuilds stale bound run when bound runtime team exists but is stopped`.
- [x] Verification:
  - `pnpm -C /Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-server-ts test tests/unit/distributed/remote-envelope-bootstrap-handler.test.ts --reporter=dot` (`5/5` passed),
  - `pnpm -C /Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-server-ts test tests/integration/distributed/team-rerun-rebootstrap.integration.test.ts tests/integration/run-history/distributed-team-memory-lifecycle.integration.test.ts --reporter=dot` (`3/3` passed).
- [x] Workflow artifact sync for this iteration:
  - updated `investigation-notes.md`, `requirements.md`, `proposed-design.md`, `future-state-runtime-call-stack.md`, `future-state-runtime-call-stack-review.md`, `implementation-plan.md`.
- [x] Review gate result:
  - Round 66 `No-Go` (stopped-runtime reuse blocker),
  - Round 67 `Candidate Go`,
  - Round 68 `Go Confirmed`.

## 2026-02-24 (Implementation Execution: WS-20 Worker Dispatch Policy Centralization)
- [x] Re-investigated worker dispatch-layer concern mixing:
  - message/control handlers duplicated ownership predicates + worker-managed-run local-dispatch gates,
  - worker command-layer identity naming was ambiguous (`localNodeId`) for current-process ownership checks.
- [x] Implemented centralized worker dispatch orchestrator:
  - added `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-server-ts/src/distributed/routing/worker-owned-member-dispatch-orchestrator.ts`.
- [x] Refactored locality resolver contract:
  - updated `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-server-ts/src/distributed/routing/worker-member-locality-resolver.ts` with explicit ownership outcomes and `selfNodeId` naming.
- [x] Removed duplicated local-dispatch policy logic from worker handlers:
  - updated `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-server-ts/src/distributed/bootstrap/remote-envelope-message-command-handlers.ts`,
  - updated `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-server-ts/src/distributed/bootstrap/remote-envelope-control-command-handlers.ts`,
  - updated `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-server-ts/src/distributed/bootstrap/remote-envelope-command-handlers.ts`.
- [x] Added/updated tests:
  - added `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-server-ts/tests/unit/distributed/worker-owned-member-dispatch-orchestrator.test.ts`,
  - updated `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-server-ts/tests/unit/distributed/worker-member-locality-resolver.test.ts`,
  - updated `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-server-ts/tests/unit/distributed/remote-envelope-message-command-handlers.test.ts`,
  - updated `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-server-ts/tests/unit/distributed/remote-envelope-control-command-handlers.test.ts`.
- [x] Verification:
  - `pnpm -C /Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-server-ts test tests/unit/distributed/worker-member-locality-resolver.test.ts tests/unit/distributed/worker-owned-member-dispatch-orchestrator.test.ts tests/unit/distributed/remote-envelope-message-command-handlers.test.ts tests/unit/distributed/remote-envelope-control-command-handlers.test.ts tests/unit/distributed/remote-envelope-command-handlers.test.ts --reporter=dot` (`5 files / 16 tests passed`),
  - `pnpm -C /Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-server-ts build` (passed).
- [x] Workflow artifact sync:
  - updated `investigation-notes.md`, `requirements.md`, `proposed-design.md`, `future-state-runtime-call-stack.md`, `future-state-runtime-call-stack-review.md`, `implementation-plan.md`.

## 2026-02-24 (Deep Review Re-Run: Layering Boundary Sweep)
- [x] Performed another architecture/layering deep review focusing on:
  - distributed runtime-binding type ownership boundaries,
  - placement planning dependency injection boundaries,
  - worker command composition identity naming boundaries.
- [x] Found blocker-level layering drift (Round 78 `No-Go`):
  - distributed runtime-binding/routing modules still imported `TeamMemberConfigInput`,
  - placement planning still read snapshots through default distributed runtime singleton,
  - worker command composition still aliased `hostNodeId` into `selfNodeId`.
- [x] Applied workflow write-backs:
  - updated `requirements.md` with Case K + new acceptance/constraint/risk rules,
  - updated `proposed-design.md` to `v23` with `UC-036` and `D-049..D-051`,
  - updated `future-state-runtime-call-stack.md` to `v21` with `UC-036`,
  - updated `future-state-runtime-call-stack-review.md` with rounds 78-80.
- [x] Review-gate stability outcome:
  - Round 79 `Candidate Go`,
  - Round 80 `Go Confirmed`.
- [x] WS-21 implemented:
  - added distributed-layer binding contract:
    - `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-server-ts/src/distributed/runtime-binding/run-scoped-member-binding.ts`,
    - runtime-binding registry + locality resolver now depend on distributed contract types only (no `agent-team-instance-manager` DTO import).
  - injected node-snapshot provider boundary for placement planning:
    - added `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-server-ts/src/distributed/node-directory/placement-candidate-snapshot-provider.ts`,
    - updated `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-server-ts/src/agent-team-execution/services/team-member-placement-planning-service.ts` to consume injected provider and remove direct runtime-composition singleton access,
    - threaded provider option through `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-server-ts/src/agent-team-execution/services/team-runtime-bootstrap-application-service.ts`.
  - removed command-handler boundary aliasing (`hostNodeId -> selfNodeId`):
    - updated `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-server-ts/src/distributed/bootstrap/remote-envelope-command-handlers.ts`,
    - updated composition wiring in `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-server-ts/src/distributed/bootstrap/distributed-runtime-composition-factory.ts`.
  - updated tests:
    - `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-server-ts/tests/unit/distributed/run-scoped-team-binding-registry.test.ts`,
    - `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-server-ts/tests/unit/distributed/remote-envelope-command-handlers.test.ts`,
    - `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-server-ts/tests/unit/agent-team-execution/team-member-placement-planning-service.test.ts`,
    - `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-server-ts/tests/unit/agent-team-execution/team-runtime-bootstrap-application-service.test.ts`,
    - `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-server-ts/tests/integration/distributed/bootstrap-rebind-cleanup-order.integration.test.ts`.
  - verification:
    - targeted WS-21 suite:
      - `pnpm -C /Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-server-ts test tests/unit/distributed/run-scoped-team-binding-registry.test.ts tests/unit/distributed/worker-member-locality-resolver.test.ts tests/unit/distributed/remote-envelope-message-command-handlers.test.ts tests/unit/distributed/remote-envelope-control-command-handlers.test.ts tests/unit/distributed/remote-envelope-command-handlers.test.ts tests/unit/agent-team-execution/team-member-placement-planning-service.test.ts tests/unit/agent-team-execution/team-runtime-bootstrap-application-service.test.ts tests/integration/distributed/bootstrap-rebind-cleanup-order.integration.test.ts --reporter=dot` (8 files / 21 tests passed),
    - build:
      - `pnpm -C /Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-server-ts build` (passed),
    - full backend:
      - `pnpm -C /Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-server-ts test --reporter=dot` (`312` files passed, `3` skipped; `1213` tests passed, `7` skipped).

## 2026-02-24 (Post-Refactor Architecture Re-Assessment + Validation)
- [x] Re-ran architecture deep review after latest WS-22 boundary updates:
  - review rounds updated to `Round 81 Candidate Go` and `Round 82 Go Confirmed`.
  - no blocker-level SoC/layering regressions found in resolver, distributed bootstrap, worker dispatch-policy, or run-history command/query boundaries.
- [x] Backend build verification:
  - `pnpm -C /Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-server-ts build` (passed).
- [x] Backend targeted regression sweep (latest refactor touchpoints):
  - `pnpm -C /Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-server-ts test tests/unit/distributed/team-command-ingress-service.test.ts tests/unit/api/graphql/types/agent-team-instance-resolver.test.ts tests/unit/distributed/remote-envelope-bootstrap-handler.test.ts tests/unit/distributed/worker-bootstrap-member-artifact-service.test.ts tests/unit/distributed/worker-bootstrap-runtime-reconciler.test.ts tests/unit/distributed/remote-envelope-command-handlers.test.ts tests/unit/distributed/remote-envelope-message-command-handlers.test.ts tests/unit/distributed/remote-envelope-control-command-handlers.test.ts tests/integration/distributed/bootstrap-rebind-cleanup-order.integration.test.ts --reporter=dot` (`9` files / `30` tests passed).
- [x] Backend full-suite verification:
  - parallel run: `pnpm -C /Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-server-ts test --reporter=dot` produced `2` timing-flake failures in file-explorer integration tests under heavy load:
    - `tests/integration/file-explorer/file-name-indexer.integration.test.ts`,
    - `tests/integration/file-explorer/file-system-watcher.integration.test.ts`.
  - serial rerun of failing suites passed:
    - `pnpm -C /Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-server-ts test tests/integration/file-explorer/file-name-indexer.integration.test.ts tests/integration/file-explorer/file-system-watcher.integration.test.ts --maxWorkers=1` (`2` files / `12` tests passed).
- [x] Core library scoped verification requested by user:
  - `npx vitest run tests/integration/agent/agent-single-flow.test.ts tests/integration/agent-team/agent-team-single-flow.test.ts`
  - both tests failed in this environment because expected output files were not created by the tool-call runtime path; this is runtime/environment dependent and not a compile-time regression in this refactor set.

## 2026-02-25 (Implementation Execution: WS-22 Run-History DI Tightening + Parallel Flake Stabilization)
- [x] Re-entered workflow pipeline for remaining non-blocking improvements identified in Round 82:
  - remove residual run-history service fallback dependency on default distributed runtime singleton,
  - stabilize file-explorer integration timing under parallel full-suite load.
- [x] Implemented composition-root runtime dependency registry for run-history:
  - added `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-server-ts/src/run-history/services/team-run-history-runtime-dependencies.ts`,
  - updated `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-server-ts/src/run-history/services/team-run-history-service.ts` to use injected runtime dependencies,
  - updated `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-server-ts/src/run-history/services/team-member-run-projection-service.ts` to consume runtime dependency registry,
  - updated `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-server-ts/src/app.ts` to configure/reset run-history runtime dependencies at composition root.
- [x] Implemented file-explorer parallel-run stability hardening:
  - updated `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-server-ts/tests/integration/file-explorer/file-name-indexer.integration.test.ts` (higher bounded timeout + richer timeout diagnostics),
  - updated `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-server-ts/tests/integration/file-explorer/file-system-watcher.integration.test.ts` (increased bounded waits for event/no-event assertions and test-level timeout budgets).
- [x] Verification:
  - full backend parallel run:
    - `cd /Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-server-ts && npx vitest run --reporter=dot`
    - result: `312` files passed, `3` skipped; `1215` tests passed, `7` skipped.
  - core library scoped integration run:
    - `cd /Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-ts && npx vitest run tests/integration/agent/agent-single-flow.test.ts tests/integration/agent-team/agent-team-single-flow.test.ts`
    - result: `2` files passed; `2` tests passed.
- [x] Workflow artifact sync for this iteration:
  - updated `implementation-plan.md`, `implementation-progress.md`, `future-state-runtime-call-stack-review.md`.

## 2026-02-25 (Post-Verification Ticket Doc Sync: WS-22)
- [x] Updated ticket artifacts to reflect implemented WS-22 boundaries and test evidence:
  - `requirements.md` (Case L + acceptance/constraints/risks addenda),
  - `proposed-design.md` (Design Delta v24, `D-052..D-057`),
  - `future-state-runtime-call-stack.md` (`UC-037`, `UC-038`),
  - `investigation-notes.md` (WS-22 investigation checkpoint).
- [x] Deep-review doc-alignment gate passed:
  - `future-state-runtime-call-stack-review.md` Round 85 `Candidate Go`, Round 86 `Go Confirmed`.
