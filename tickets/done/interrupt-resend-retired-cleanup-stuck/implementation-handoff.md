# Implementation Handoff

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: Independent architecture review was selected (Medium / High) and passed as ARCH-REV-001. This package goes to the Code Reviewer per `get_handoff_rules`.
- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/interrupt-resend-retired-cleanup-stuck/tickets/in-progress/interrupt-resend-retired-cleanup-stuck/requirements-doc.md` (SR-001, approved, DEC-001 = A)
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/interrupt-resend-retired-cleanup-stuck/tickets/in-progress/interrupt-resend-retired-cleanup-stuck/investigation-notes.md`
- Solution revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/interrupt-resend-retired-cleanup-stuck/tickets/in-progress/interrupt-resend-retired-cleanup-stuck/solution-revision-record.md`
- Design spec (required on every route): `/Users/normy/autobyteus_org/autobyteus-worktrees/interrupt-resend-retired-cleanup-stuck/tickets/in-progress/interrupt-resend-retired-cleanup-stuck/design-spec.md` (SR-002)
- Supplemental task artifacts: `/Users/normy/autobyteus_org/autobyteus-worktrees/interrupt-resend-retired-cleanup-stuck/tickets/in-progress/interrupt-resend-retired-cleanup-stuck/evidence/`. This holds the upstream screenshot, server log and repro probe, plus two files from this stage: `implementation-e2e-base-reproduction.txt` and `implementation-preexisting-server-test-failures.txt`.
- Design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/interrupt-resend-retired-cleanup-stuck/tickets/in-progress/interrupt-resend-retired-cleanup-stuck/design-review-report.md`
- Architecture review revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/interrupt-resend-retired-cleanup-stuck/tickets/in-progress/interrupt-resend-retired-cleanup-stuck/architecture-review-revision-record.md`
- Designer handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/interrupt-resend-retired-cleanup-stuck/tickets/in-progress/interrupt-resend-retired-cleanup-stuck/handoff-architecture-design-complete.md`
- Triggering rework report: N/A (initial implementation)
- Product Design artifacts: `N/A — not applicable`

## Current Implementation Summary

A send to a standalone run whose runtime went offline now completes the previous runtime's exact release first. This happens inside the run's transition lane and waits at most 30 s. Only then does the run claim and restore in the same conversation. A failure or timeout returns a new retryable error with plain-language text, and it is never cached as a quarantine. The registry still refuses a reclaim while a release is owed, but now uses the same retryable code. For team members and delegated copies, a failed previous release is now retry-safe.

- Implementation cycle: `Initial`
- Implementation revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/interrupt-resend-retired-cleanup-stuck/tickets/in-progress/interrupt-resend-retired-cleanup-stuck/implementation-revision-record.md`
- Current implementation revision ID: `IR-001`
- Implementation commit: `fccd1a009` on `codex/interrupt-resend-retired-cleanup-stuck` (base `origin/personal` @ `ace86bf1f`)
- Related solution revision IDs: SR-001, SR-002
- Related architecture-review revision IDs: ARCH-REV-001
- Related code-review revision IDs: N/A
- Related API/E2E revision IDs: N/A
- Related delivery revision IDs: N/A
- Triggering finding IDs: N/A. Architecture recommendations REC-001 and REC-002 are applied. REC-003 is a designer-owned doc nit.

## Routing Classification (Mandatory)

- Task size: `Medium`
- Architecture risk: `High`
- Design classification section / evidence reference: design-spec.md, "Task Size And Architectural Risk"
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale: Five production files in the planned subsystems changed, adding 84 lines and removing 5. There is no API, persistence or web change. The concurrency and lifecycle ordering at the activation/termination boundary changed exactly as designed. That is the reason for High risk.
- Selected route: `Code Review`
- Lightweight implementation self-review completed for the direct route: `Not Applicable` (High-risk route)
- New design impact or escalation trigger: `None`. Exact release proved the stop for the AGY fake (the replacement launched only after the old process exited) and for the runtime-neutral Codex fake. The termination's `releaseRun(runId)` finishes before the replacement claim, because the release completes inside the lane before `activateOnce`.

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 | Preserved: AGY interrupt stops the process | Not changed | E2E: interrupt ack `accepted`, TURN_INTERRUPTED unchanged |
| BEH-002 | Release, then restore in the same conversation | `StandaloneAgentRunLifecycleService.resolveInsideTransition` -> `awaitPreviousRuntimeRelease` -> `AgentRunManager.releaseRetiredRun` -> `releaseExactRun` -> `activateOnce`/`restoreStarted` | Done. E2E AC-001/AC-002 (same AGY `conversation_id`); real-manager lifecycle AC-003 (Codex fake, same platform id) |
| BEH-003 | The replacement starts only after the old runtime stopped; one restart | The same lane serializes callers; the host handle joins an in-flight activation; the manager joins an in-flight termination (`finishing` memo) | Done. E2E: the old process's `exit` is logged before the second `launch`, exactly one live process, two sends give one restart. Unit: concurrent `activateHost` gives one `beginActivation`, only after the stop gate opens |
| BEH-004 | A failed previous release is retry-safe for team members and delegated copies | `ConfiguredAgentExecutionHandle.initializeReady` try/catch -> `markRetrySafe()` | Done. Handle tests (throw and not-accepted variants) |
| BEH-005 | A later send retries; restart also recovers | The retryable code is not in `isAgentRunActivationQuarantineError`, so it never enters `quarantines` | Done for in-process retry (AC-008). The restart path is unchanged (AF-011); AC-007 needs user desktop verification |
| BEH-006 | Plain retryable text | `PreviousRuntimeReleasePendingError`: "The agent's previous session was still shutting down, so this message couldn't be delivered. Please send it again." | Done. A coordinator-level unit test asserts the ack text contains no "retired", "quarantin" or run id |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`. Private-candidate quarantine (`AGENT_RUN_ACTIVATION_CLEANUP_FAILED` from `quarantine()`/`completeAbort`) is unchanged.

## Key Files Or Areas

- `autobyteus-server-ts/src/agent-execution/errors.ts`: C-1, the code plus `PreviousRuntimeReleasePendingError`
- `autobyteus-server-ts/src/agent-execution/runtime/agent-run-activation-registry.ts`: C-2, `getRetiredRun` and the refusal code
- `autobyteus-server-ts/src/agent-execution/services/agent-run-manager.ts`: C-3, `releaseRetiredRun`
- `autobyteus-server-ts/src/agent-execution/services/standalone-agent-run-lifecycle-service.ts`: C-4, `awaitPreviousRuntimeRelease`, 30 s bound
- `autobyteus-server-ts/src/agent-collaboration/execution/backends/configured-agent-execution-handle.ts`: C-5, retry safety
- Tests:
  - `tests/unit/agent-execution/runtime/agent-run-activation-registry.test.ts`
  - `tests/unit/agent-execution/agent-run-manager.test.ts` (the `releaseRetiredRun` describe block)
  - `tests/unit/agent-execution/standalone-agent-run-lifecycle-service.test.ts`: coordinator ack test, no-quarantine test, and a new describe using the real `AgentRunManager` and registry with fake Codex backends
  - `tests/unit/agent-collaboration/configured-agent-execution-handle.test.ts`
  - `tests/e2e/runtime/agy-interrupt-resend-transport.e2e.test.ts` (new)
  - `tests/fixtures/agy-failure-cli.mjs` (new `interrupt_resend` case: a process log, and SIGTERM exit delayed by `AGY_FAKE_SIGTERM_EXIT_DELAY_MS`)
  - `tests/fixtures/agent-run-preparation-fixtures.ts` (default `releaseRetiredRun` on the fake manager)
  - `tests/integration/run-history/memory-layout-and-projection.integration.test.ts` (adds `releaseRetiredRun` to the mock)

## Important Assumptions

- ASM-001: AGY restore by conversation id works after an interrupt-stop. The fake CLI shows the server passes `--conversation <same id>`. The live AGY CLI is not exercised here.
- The design leaves the user text open to variation within REQ-005. I used the design's runtime-neutral wording, not the requirements' "after the interrupt" proposal, because this path also serves crashes and unexpected exits on any runtime.

## Known Risks

- The GraphQL `restoreAgentRun` (open/restore a run) also goes through `activateHost`. If a release is pending there, the same text appears, and it says "this message". This is a minor wording mismatch on a non-send path. It was left as designed and not reworded without approval.
- Status cosmetics: the E2E sees `AGENT_STATUS offline` after the interrupt, then `initializing`, then the restored run's statuses. The final status is not `error` (asserted). This matches the design's cosmetic risk.
- On a timed-out wait, the release keeps running. A later send joins it through the termination `finishing` memo, or finds it complete. Both are covered by unit tests with real termination.
- Live AGY (ASM-001) and desktop verification (AC-007) are not done at this stage.
- Base test debt: running the full server suite on base `ace86bf1f` already fails 213 tests in 58 files (stale mocks, environment-dependent suites). The list is in `evidence/implementation-preexisting-server-test-failures.txt`. With this change the same set fails and nothing else.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Bug Fix
- Reviewed root-cause classification: Missing Invariant (with a narrow Boundary Or Ownership Issue)
- Reviewed refactor decision: `No Refactor Needed`
- Implementation matched the reviewed assessment: `Yes`
- If challenged, routed as `Design Impact`: `N/A`
- Evidence / notes: The lifecycle service reaches the retired run only through `AgentRunManager.releaseRetiredRun`; `registry.getRetiredRun` is called only by the manager. The 30 s bound lives in the lifecycle service, so team, shutdown and termination callers are unchanged.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`. The "still owns retired cleanup" refusal under `AGENT_RUN_ACTIVATION_CLEANUP_FAILED` is removed, with no alias.
- Dead/obsolete code removed in scope: `Yes`
- Shared structures remain tight: `Yes`. One new error subclass, following the `PlatformAgentRunRestoreError` pattern.
- Canonical shared design guidance reapplied: `Yes`
- Changed source files within size guardrails: `Yes`. Effective lines: manager 344, lifecycle 352, handle 439, registry 296, errors 58. Total source delta +84/−5.
- Notes: none

## Persisted Data Transition Check (When Applicable)

- Approved decision: `Not Affected`
- Design-spec decision reference: "Persisted Data / State Transition Decision"
- Implementation follows the approved decision: `Yes`. Only in-memory registry and lifecycle state are touched.

## Environment Or Dependency Notes

- `pnpm -C autobyteus-server-ts typecheck` already fails on base with TS6059 rootDir errors (the tests are in the tsconfig include). I used `tsc -p tsconfig.build.json --noEmit` after `pnpm prebuild`, which generates the Prisma client. This is a TESTING/script discrepancy.
- `pnpm prebuild` produced untracked `autobyteus-application-backend-sdk/dist/` and `autobyteus-application-sdk-contracts/dist/`. They are left uncommitted.

## Local Implementation Checks Run

- Source typecheck: `npx tsc -p tsconfig.build.json --noEmit` passes.
- Focused unit and integration suites (`tests/unit/agent-execution`, `agent-collaboration`, `standalone-agent-run-root`, `agent-team-execution`, `agent-org-execution`, `tests/integration/standalone-agent-run-root`, the memory-layout integration test): 208 files, 1939 passed, 5 skipped.
- New tests fail without the fix: reverting C-4 and C-5 makes 8 new lifecycle and handle tests fail.
- New fake-AGY E2E: `RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<abs>/tests/fixtures/agy-failure-cli.mjs pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/agy-interrupt-resend-transport.e2e.test.ts --no-watch` passes 2/2. Three repeated runs together with `agy-background-task-transport` and `agy-failure-transport` all passed (28 passed, 1 skipped each time). Against base source, both cases fail with "still owns retired cleanup" and a red Error status (`evidence/implementation-e2e-base-reproduction.txt`).
- Full server suite: the failures match base (see Known Risks). The one regression it showed, missing `releaseRetiredRun` in the memory-layout integration mock, is fixed in the commit.
- These are local implementation checks only. They are not API/E2E sign-off.

## Frontend Rendered-Result Check (When Applicable)

Not Applicable. This is a server-only change. The web shows `ack.message` verbatim in the existing error card (AF-010), and no web code changed.

## Downstream Coverage Hints / Suggested Scenarios

- The live AGY CLI: interrupt a standalone run, then send at once and send later (AC-001/AC-002, ASM-001). Check for exactly one `agy` process afterwards.
- A desktop-app isolated build per TESTING.md (AC-001/AC-002/AC-007). Never use the user's app or data.
- A team member or delegated copy on AGY, interrupted and then given new work (AC-006, live variant).
- A non-AGY runtime crash or exit followed by a send (AC-003 live), for example a killed Codex app-server.

## API / E2E / Executable Coverage Investigation And Execution Still Required

- Independent API/E2E validation of AC-001..AC-006 and AC-008 at the executable boundary, including any live-runtime checks the API/E2E engineer selects.
- AC-007 user desktop verification (Delivery).
