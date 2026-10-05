# Implementation Handoff — agent-run-termination-extraction

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: architectural risk is `High`, so independent architecture review applied. ARCH-REV-001 passed SR-004 with non-blocking notes N-1–N-3, and the reviewer handed the work to `/implementation_engineer`.
- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-run-termination-extraction/tickets/in-progress/agent-run-termination-extraction/requirements-doc.md` (Approved, SR-003)
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-run-termination-extraction/tickets/in-progress/agent-run-termination-extraction/investigation-notes.md` (E-A1–E-A11, E-X1–E-X3)
- Solution revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-run-termination-extraction/tickets/in-progress/agent-run-termination-extraction/solution-revision-record.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-run-termination-extraction/tickets/in-progress/agent-run-termination-extraction/design-spec.md` (SR-004)
- Supplemental task artifacts:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-run-termination-extraction/tickets/in-progress/agent-run-termination-extraction/evidence/baseline-server-failures.txt` (AC-009 baseline).
  - Predecessor F-1–F-4 contract, read-only: `origin/personal:tickets/done/standalone-agent-run-root/design-spec.md` § 11.
- Design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-run-termination-extraction/tickets/in-progress/agent-run-termination-extraction/design-review-report.md` (ARCH-REV-001 Pass)
- Architecture review revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-run-termination-extraction/tickets/in-progress/agent-run-termination-extraction/architecture-review-revision-record.md`
- Triggering rework report: N/A (initial).

## Current Implementation Summary

- Implementation cycle: `Initial`.
- Implementation revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-run-termination-extraction/tickets/in-progress/agent-run-termination-extraction/implementation-revision-record.md`
- Current implementation revision ID: `IR-001`.
- Related solution revision IDs: SR-004 (requirements SR-003).
- Related architecture-review revision IDs: ARCH-REV-001.
- Related code-review, API/E2E and delivery revision IDs: N/A.
- Triggering finding IDs: N/A.
- Workspace: worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-run-termination-extraction`, branch `codex/agent-run-termination-extraction`.
  - Base: `origin/personal` @ `03d5db06b`.
  - Implementation commit: `1b83c8f88`, plus a commit with these artifacts.
- Summary:
  - The termination lifecycle and the root-shutdown fence attempt selection and evaluation moved from `AgentRun` to its new internal owner `AgentRunTermination`, unchanged in behavior.
  - `AgentRun` keeps its four public termination methods as plain delegations.
  - `agent-run.ts` drops from 498 to **383** effective lines; the owner is **196**.

## Routing Classification (Mandatory)

- Task size: `Medium`. Architecture risk: `High` (design-spec § Task Size And Architectural Risk).
- Classification: `Confirmed`. One new file, one modified file, one additive test and docs. No caller, contract, route or persistence change. The risk is still the concurrency on every Stop.
- Selected route: `Code Review`, because architectural risk is High.
- Lightweight self-review for the direct route: `Not Applicable` (High risk).
- New design impact or escalation trigger: `None`.
  - No existing Part A assertion changed.
  - No AgentRun state change, extra lane hop or reordering.
  - `agent-run.ts` is ≤ 400 without moving any other concern.
  - LE-O1 is pending API/E2E.

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 (REQ-001, REQ-003) | Termination and fence attempt handling are owned outside `AgentRun`, with identical behavior | `AgentRun.{prepareTermination, tryPrepareTerminationIfQuiescent, fenceInputAndInterruptForRootShutdown, terminate}` (non-async `return this.termination.x()`) → `AgentRunTermination.{prepare, tryPrepareIfQuiescent, fenceForRootShutdown, terminate}`. The four AgentRun triggers → `AgentRunTermination.scheduleRootShutdownEvaluation()` → `queueMicrotask(() => this.attempt?.evaluate())`. `AgentRunRootShutdownFence` and `createPreparedAgentRunTermination` are unchanged | Done. AC-003 suites unchanged and passing; new identity test |
| BEH-002 (REQ-002) | `agent-run.ts` ≤ 400; each new owner ≤ 400 | `agent-run.ts` 383 effective lines; `agent-run-termination.ts` 196 | Done |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`.
  - No other AgentRun concern was split.
  - Part B is untouched.
  - The fence and prepared-termination units are unchanged.

## Key Files Or Areas

- `autobyteus-server-ts/src/agent-execution/domain/agent-run-termination.ts` (new): the options port, as in the design's Interface Boundary Mapping, plus the E-A8 members.
  - Bodies are verbatim; only `this.` targets changed: `this.x` became `this.options.x` or the owner's own fields.
  - Fields follow the design's names (`attempt`, `tryingQuiescent`, `preparing`, `prepared`, `finishing`, `recoveryShutdownFenced`).
  - Mechanical rewrites of the input-dispatch reads:
    - `this.activeInputDispatch` → `this.options.inputDispatch.active()`;
    - `this.uncertainInputDispatch` truthiness → `inputDispatch.uncertainClaim()` (valid because `ClaimedInputDispatch.claim` is non-optional, N-3);
    - `this.uncertainInputDispatch.claim` → `uncertainClaim()`;
    - `this.uncertainInputDispatch = null` → `inputDispatch.clearUncertain()`.
- `autobyteus-server-ts/src/agent-execution/domain/agent-run.ts`:
  - construction with lazy closures;
  - four delegations;
  - four triggers;
  - deletions;
  - `reconcileUncertainDispatch` stays.
- `autobyteus-server-ts/tests/unit/agent-execution/agent-run.test.ts`: an additive coalescing test (29 lines added, 0 deleted).
- `autobyteus-server-ts/docs/modules/agent_execution.md`: TS Source list, "Published-Run Termination…" and "Root Shutdown Fence" now name `AgentRunTermination`.

## Important Assumptions

- **ASM-001 holds.** All lane work stays on `dispatchQueue` in the same order and in the same closures. Evaluation is still a microtask that reads the current attempt when it runs.
- **Interrupts.** The fence's `interruptActiveTurn`, the no-turn gate interrupt and the blocked-preparation interrupt all go through `options.interrupt` (`AgentRun.interrupt`, which keeps the recoverable-block branch), never `interruptState.interrupt`.
- **Async-ness.** Each owner method has the same async-ness as the original AgentRun method: `prepare` and `tryPrepareIfQuiescent` are non-async; `fenceForRootShutdown` and `terminate` are async. The public wrappers are non-async plain returns, so promise identity and tick count are unchanged.
  - The new test asserts identity (`toBe`) for concurrent `prepareTermination()` and for `tryPrepareTerminationIfQuiescent()` while a try is in flight (N-1).
  - I checked that making those wrappers `async` fails the test.
- **Laziness (N-2).** Callbacks are lazy closures: `warn: (message) => logger.warn(message)`, `reconcileRecovery`, `publishInputState`, `drainInput`, `dispatchCanonicalStatus`, and `detachFromBackendSource: () => this.unsubscribeFromBackendSource()`. That last one is assigned after construction.
- **Wait loop (N-3).** `waitForActiveInputDispatch` calls `inputDispatch.active()` on every loop iteration, as the original did.

## Known Risks

- **Subtle timing drift on Stop.** Mitigations: verbatim bodies, the unchanged AC-003 suites, the identity test, and the AC-004 live gate (pending API/E2E).
- **The 16 base-failing `agent-run-manager` tests** sit next to this code. They fail identically on the branch, by name and message.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Refactor.
- Reviewed root-cause classification: File Placement Or Responsibility Drift.
- Reviewed refactor decision: `Refactor Needed Now`.
- Implementation matched the reviewed assessment: `Yes`.
- If challenged, routed as `Design Impact`: `N/A`.
- Evidence / notes: one coherent owner with its own state and lifecycle; no forwarding layers besides the four public methods required by REQ-001.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`.
- Legacy old-behavior retained in scope: `No`.
- Dead or obsolete code removed in scope: `Yes`.
  - Moved members deleted from `AgentRun`: `recoveryShutdownFenced`, `rootShutdownFence`, the three termination promise fields and the finish promise field, `createRootShutdownFence`, `waitForActiveInputDispatch`, `prepareTerminationOnce`, `createTerminationPreparation`, `isRootShutdownQuiescent`, `isFencedRecoveryWithoutTurn`, `scheduleRootShutdownFenceEvaluation`, `finishCommittedTermination`, `finishCommittedTerminationOnce`.
  - Unused imports removed. No aliases.
- Shared structures remain tight: `Yes`. The options pass `uncertainClaim`, not the whole `ClaimedInputDispatch`.
- Canonical shared design guidance reapplied: `Yes`.
- Changed source files within size guardrails: `Yes` (383 and 196).
- Notes: the only importer of `agent-run-termination` is `agent-run.ts`, checked with `git grep` over `autobyteus-server-ts`, `test-support` and `autobyteus-web`. The other hits are the unrelated `agent-run-termination-service` test filename.

## Persisted Data Transition Check (When Applicable)

- Approved decision: `Not Affected`. Only in-memory ownership moves.

## Environment Or Dependency Notes

- Base comparison worktree, left for reuse: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-run-termination-extraction-base`, detached at `03d5db06b`, with dependencies installed and `pnpm prebuild` run. Delivery can remove it with `git worktree remove`.

## Local Implementation Checks Run

These are implementation-scoped local checks, not API/E2E sign-off.

- Server `tsc --noEmit`: clean (TS6059 noise only).
- **AC-003** (no assertion edits; the test diff is additive only, 29 lines added and 0 deleted): `agent-run.test`, `agent-run-root-shutdown-fence.test`, `agent-run-compaction-races`, `frozen-root-termination-scope`, `configured-agent-execution-handle`, `agent-org-run-termination`, `root-team-run-termination` and `native-root-termination.integration` → 8 files, 86/86.
- **AC-009:** the baseline command (`tests/unit/{agent-execution,agent-collaboration,agent-org-execution,agent-team-execution,standalone-agent-run-root}`, `tests/integration/{standalone-agent-run-root,agent-team-execution,agent-org-execution}`) was run on the branch and on a clean `03d5db06b` worktree, and compared by test name and first message line.
  - Branch: 27 failed, 1696 passed. Base: 27 failed, 1695 passed.
  - 0 new and 0 changed messages. All 27 are in `evidence/baseline-server-failures.txt`.
  - The extra pass is the new test.
- **Architecture guards:** `tests/architecture` 44/44 on both branch and base.
- **Import gate:** passed (see Notes above).
- **AC-002 counts:** `agent-run.ts` 383 effective non-empty lines (was 498); `agent-run-termination.ts` 196.

## Frontend Rendered-Result Check (When Applicable)

`Not Applicable`: a server-internal refactor with no rendered change.

## Downstream Coverage Hints / Suggested Scenarios

- **AC-004:** LE-O1 (busy Org Stop) on Codex at least 10 consecutive passes. Record any F-4 warnings, with their turn state.
- **AC-004:** `standalone-agent-collaborator-mention.e2e` and `agent-initiated-collaborators.e2e` on Claude and Codex (opt-in `RUN_CLAUDE_E2E=1`, `RUN_CODEX_E2E=1`).
- Server `stopAll` on shutdown with an active and an idle run (SCN-002).

## API / E2E / Executable Coverage Investigation And Execution Still Required

- AC-004 live gate (above).
- Server E2E (`pnpm test:e2e`) was not run.
