# Implementation Handoff

## Upstream Artifact Package

- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/transient-team-cleanup-bug/tickets/in-progress/transient-team-cleanup-bug/requirements.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/transient-team-cleanup-bug/tickets/in-progress/transient-team-cleanup-bug/investigation-notes.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/transient-team-cleanup-bug/tickets/in-progress/transient-team-cleanup-bug/design-spec.md`
- Design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/transient-team-cleanup-bug/tickets/in-progress/transient-team-cleanup-bug/design-review-report.md`

## What Changed

Implemented the reviewed backend lifecycle fix for intermittent stale transient task-team cleanup:

- Native Autobyteus agent runs now have active/stopping lifecycle storage in `AgentFactory`; stopping agents remain known but non-routable until graceful stop settles, and duplicate removals join the same stop promise.
- `AutoByteusAgentRunBackend` now owns held-run termination convergence with active/terminating/terminated state, idempotent repeated terminate calls, and new-work rejection during termination.
- Mixed team termination now lives in `MixedTeamManager` with active/terminating/terminated state, one termination promise, accepted-only disposal, root offline publication before disposal, and retry-preserving failure behavior.
- `MixedTeamRunBackend.terminate()` no longer blocks termination via an active precheck; work commands remain active-gated.
- Task-team settlement now uses known directory entries rather than active-only entries, tracks settlement state, suppresses duplicate destructive close paths, and unbinds/detaches task-team active state only after accepted parent settlement.
- Mixed member handles no longer restore inactive platform runs solely to terminate them and only dispose after accepted termination.
- Mixed task-team handles preserve/bridge scoped root offline status and publish a fallback scoped root offline before accepted disposal when the child run did not already emit one.
- Added owner-local unit coverage for native lifecycle, native backend termination convergence, mixed manager termination, task-team directory known lookup, task-team settlement dedupe/cleanup, and mixed member/task-team handle termination behavior.

## Key Files Or Areas

- `autobyteus-ts/src/agent/factory/agent-factory.ts`
  - Replaced active-only map with active/stopping lifecycle entries.
  - Kept stopping entries non-routable but known for ID reuse/removal convergence.
- `autobyteus-server-ts/src/agent-execution/backends/autobyteus/autobyteus-agent-run-backend.ts`
  - Added backend-local termination lifecycle and promise joining.
- `autobyteus-server-ts/src/agent-team-execution/backends/mixed/mixed-team-manager.ts`
  - Added mixed team lifecycle, command gating, termination sequencing, root offline publication, and accepted-only disposal.
- `autobyteus-server-ts/src/agent-team-execution/backends/mixed/mixed-team-run-backend.ts`
  - Delegates terminate to manager without active pre-rejection.
- `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-team-active-run-directory.ts`
  - Added `resolveKnownEntryByTaskTeamRunId` for settlement cleanup while preserving active-only routing/snapshot APIs.
- `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-team-settlement-coordinator.ts`
  - Added settlement lifecycle state and known-entry cleanup behavior.
- `autobyteus-server-ts/src/agent-team-execution/backends/mixed/members/mixed-agent-member-handle.ts`
  - Removed restore-for-terminate behavior; dispose only on accepted terminate.
- `autobyteus-server-ts/src/agent-team-execution/backends/mixed/members/mixed-task-team-member-handle.ts`
  - Added scoped root offline observation/fallback; dispose only on accepted terminate.
- `autobyteus-server-ts/src/agent-team-execution/backends/mixed/members/mixed-sub-team-member-handle.ts`
  - Dispose only on accepted terminate.
- Added/updated tests:
  - `autobyteus-ts/tests/unit/agent/factory/agent-factory.test.ts`
  - `autobyteus-server-ts/tests/unit/agent-execution/backends/autobyteus/autobyteus-agent-run-backend.test.ts`
  - `autobyteus-server-ts/tests/unit/agent-team-execution/mixed-team-manager.test.ts`
  - `autobyteus-server-ts/tests/unit/agent-team-execution/task-team-active-run-directory.test.ts`
  - `autobyteus-server-ts/tests/unit/agent-team-execution/task-team-settlement-coordinator.test.ts`
  - `autobyteus-server-ts/tests/unit/agent-team-execution/mixed-agent-member-handle-termination.test.ts`
  - `autobyteus-server-ts/tests/unit/agent-team-execution/mixed-task-team-member-handle-termination.test.ts`

## Important Assumptions

- Frontend accepted-review behavior is intentionally unchanged: accepted task review is not terminal for projection cleanup; scoped root offline remains the live cleanup signal.
- Settlement should not directly terminate child agents; it requests the parent team-run task-team settlement boundary and cleans up active bindings only on accepted result.
- Already-stopping/already-absent runs are success-equivalent for lifecycle cleanup, but real active termination failures must still surface as rejected results.
- Historical task records, activity, memory, and run evidence remain persisted; only active runtime/directory projection state is cleaned up.

## Known Risks

- `TaskTeamSettlementCoordinator` retains a settled marker in memory after accepted cleanup to suppress duplicate re-entry. This is intentional for the lifecycle invariant but should be watched if long-lived parents process many task-team instances.
- The broad `pnpm -C autobyteus-server-ts run typecheck` command is currently blocked by repository `tsconfig.json` including tests while `rootDir` is `src`; source build typecheck was run separately and passed.
- API/E2E coverage still needs to exercise realistic nested task delegation and reconnect snapshots; implementation checks here are not API/E2E sign-off.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Bug Fix
- Reviewed root-cause classification: Missing Invariant, with backend lifecycle boundary/ownership signal
- Reviewed refactor decision (`Refactor Needed Now`/`No Refactor Needed`/`Deferred`): Refactor Needed Now, bounded to native agent termination, mixed team termination, and task-team settlement lifecycle
- Implementation matched the reviewed assessment (`Yes`/`No`): Yes
- If challenged, routed as `Design Impact` (`Yes`/`No`/`N/A`): N/A
- Evidence / notes:
  - Native remove-before-stop was replaced with explicit active/stopping state.
  - Mixed termination is now owned by `MixedTeamManager`, not frontend filtering or task-team settlement internals.
  - Task-team settlement remains thin and uses known task-team directory entries for cleanup after accepted parent settlement.
  - Existing frontend root-offline cleanup contract is preserved.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`
- Dead/obsolete code, obsolete files, unused helpers/tests/flags/adapters, and dormant replaced paths removed in scope: `Yes`
- Shared structures remain tight (no one-for-all base or overlapping parallel shapes introduced): `Yes`
- Canonical shared design guidance was reapplied during implementation, and file-level design weaknesses were routed upstream when needed: `Yes`
- Changed source implementation files stayed within proactive size-pressure guardrails (`>500` avoided; `>220` assessed/acted on): `Yes`
- Notes:
  - Removed/changed obsolete behaviors: active-map deletion before stop completion, mixed terminate active precheck, restore solely for terminate, unconditional member/task-team disposal after rejected termination, and missing/flattened offline lifecycle signal for task-team cleanup.
  - No frontend compatibility shim or accepted-as-terminal filtering was added.
  - Source implementation non-empty line counts remain below 500: `mixed-team-manager.ts` 456, `mixed-agent-member-handle.ts` 398, `mixed-sub-team-member-handle.ts` 341, `mixed-task-team-member-handle.ts` 271, `mixed-team-run-backend.ts` 250, `agent-factory.ts` 230, `autobyteus-agent-run-backend.ts` 229, `task-team-active-run-directory.ts` 126, `task-team-settlement-coordinator.ts` 95.

## Environment Or Dependency Notes

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/transient-team-cleanup-bug`
- Branch: `codex/transient-team-cleanup-bug`
- Base tracked branch: `origin/personal`
- `pnpm install --frozen-lockfile` was run because dependencies were missing in the worktree.
- `pnpm -C autobyteus-server-ts exec prisma generate --schema ./prisma/schema.prisma` was run after the first server test attempt lacked generated Prisma client output.
- `pnpm -C autobyteus-web exec nuxt prepare` was run after the first frontend test attempt lacked `.nuxt/tsconfig.json`.
- Generated/ignored local artifacts from setup/checks include `node_modules/`, `autobyteus-ts/dist/`, `autobyteus-web/.nuxt/`, `autobyteus-web/.nuxtrc`, `autobyteus-web/dist/`, and `autobyteus-server-ts/tests/.tmp/`.
- The implementation skill referenced a local `design-principles.md` file that is not present under that skill directory; I used the team shared canonical design principles at `/Users/normy/autobyteus_org/autobyteus-agents/agent-teams/software-engineering-team/shared/design-principles.md`.

## Local Implementation Checks Run

Implementation-scoped checks only; API/E2E execution is still downstream.

- PASS: `pnpm -C autobyteus-ts exec vitest run tests/unit/agent/factory/agent-factory.test.ts`
  - 1 test file, 11 tests passed.
- PASS: `pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-execution/backends/autobyteus/autobyteus-agent-run-backend.test.ts tests/unit/agent-team-execution/mixed-team-manager.test.ts tests/unit/agent-team-execution/task-team-active-run-directory.test.ts tests/unit/agent-team-execution/task-team-settlement-coordinator.test.ts tests/unit/agent-team-execution/mixed-agent-member-handle-termination.test.ts tests/unit/agent-team-execution/mixed-task-team-member-handle-termination.test.ts tests/unit/agent-team-execution/task-delegation-service.test.ts`
  - 7 test files, 41 tests passed.
- PASS: `pnpm -C autobyteus-web exec vitest run services/agentStreaming/__tests__/TeamStreamingService.spec.ts`
  - 1 test file, 38 tests passed.
- PASS: `pnpm -C autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit`
- PASS: `git diff --check`
- FAIL / repo config issue: `pnpm -C autobyteus-server-ts run typecheck`
  - `pretypecheck` / `prepare:shared` completed and built `autobyteus-ts`, `@autobyteus/application-sdk-contracts`, and `@autobyteus/application-backend-sdk`.
  - `tsc -p tsconfig.json --noEmit` then failed with repeated `TS6059` because `autobyteus-server-ts/tsconfig.json` includes `tests` while `rootDir` is `src`. This appears unrelated to the implementation; the source build tsconfig check above passed.

## Downstream Coverage Hints / Suggested Scenarios

- Exercise a realistic nested team flow like `Nested Classroom Test Team`: parent delegates to a child team, child submits result, parent accepts via `review_task_result`, and the transient task-team row disappears only after scoped root offline/settlement.
- Verify duplicate child wakeups or repeated settlement triggers for the same `taskTeamRunId` do not start duplicate destructive close sequences.
- Verify native child agent stop races: already-stopping/already-absent member runs should not block accepted cleanup, while a real active stop failure should remain rejected and leave the handle attached.
- Verify reconnect/reload snapshots after accepted settlement do not include the settled task-team handle/directory binding.
- Verify active delegated task teams remain visible before settlement and historical task/run evidence remains inspectable after active cleanup.

## API / E2E / Executable Coverage Investigation And Execution Still Required

Required. This handoff only reports implementation-scoped local checks. API/E2E coverage investigation and execution should proceed after code review, including realistic task-delegation runtime coverage and reconnect/snapshot validation.
