# Investigation Notes — task-copy-assignment-race-464

## Investigation Meta

- Package identifier: `task-copy-assignment-race-464`
- Request / ticket: Project Task `autobyteus-464`, FU-005 of autobyteus-447
- Workspace root / worktree / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-copy-assignment-race-464`, branch `codex/task-copy-assignment-race-464`
- Repository mode: `Git`
- Resolved base: `origin/personal` @ `c8f303af700bcf69e81ba6d89d98eaa2503d770d` (fetched 2026-11-10)
- Finalization target: `origin/personal`
- Bootstrap result: worktree created; `pnpm install --frozen-lockfile` and `pnpm -C autobyteus-server-ts prebuild` exit 0. No blocker.
- Current solution revision ID: `SR-001`
- Authorities read (2026-11-10, this conversation): `references/requirements-engineering.md`, `finding-the-cause.md`, `ticket-scope.md`, `architecture-design.md`, `design-principles.md`, `project-documents.md`; `DESIGN.md`; `docs/design-cases.md` (Cases 1, 2); `TESTING.md`
- Investigation status: Complete; cause reproduced and fix prototyped (both reverted)

## Source Log

| Date | Source Type | Exact Source | Why | Finding |
| --- | --- | --- | --- | --- |
| 2026-11-10 | Code | `src/agent-team-execution/local/registries/task-team-execution-registry.ts:47-51` (`restore`); `task-agent-execution-registry.ts:113` (same for Agent copies) | Origin of "already active or reserved" | `restore` refuses while the TeamRun is still in `active` or `reserved` |
| 2026-11-10 | Code | `task-team-execution-registry.ts:151-159` (`discardReleased`), `:162-174` (`release`) | Release lifecycle | `release` leaves the run in `active`; only `discardReleased` (when terminated) or shutdown removes it; `discardReleased` silently returns while the run is not terminated |
| 2026-11-10 | Code | `src/agent-collaboration/execution/task/root-task-execution-lifecycle.ts:170-215` (`assignToExistingCopy`) | Assignment path | Queue step `reopen` = `prepareClosedCopyForResume` (skips an open copy); then commit `assignExistingTaskExecution` **outside** the queue; then delivery under a live lease (wake step → `restoreChain`) |
| 2026-11-10 | Code | same file `:286-307` (`reactivateClosedTarget`) | Parallel path | Same shape: queue step, then `reopenAssignment` outside the queue |
| 2026-11-10 | Code | same file `:309-318` | Stated rule | "A copy already open (a concurrent reopen or assignment) is never released." |
| 2026-11-10 | Code | same file `:250-252`; `root-task-execution-resource-scope.ts:94-123` | Closure release | `releaseTaskExecutions` runs **directly**, not through the queue; it fences remote copies (peer network call) and releases hosted closed copies, re-checking `isClosed` at call time |
| 2026-11-10 | Code | `src/projects/runtime/task-execution-resource-release.ts:12-14`; `src/projects/services/project-task-service.ts:357`; `src/compositions/project-task-execution-resource-composition.ts:60-61` | Who triggers it | After a DONE/CANCELLED commit the Task side requests the release fire-and-forget (`void`); nothing awaits it (ASM-001) |
| 2026-11-10 | Code | `root-task-execution-command-queue.ts` | Queue contract | One FIFO per root; doc: serializes activation, wake, idle shutdown, user Stop, model change and "the runtime step of a reactivation"; rejects after admission closes |
| 2026-11-10 | Code | `root-task-dispatch.ts:65-70` | Precedent | New-copy activation commits inside its queue step |
| 2026-11-10 | Code | `projects.service` `assignExistingTaskExecution`, `reopenAssignment` (`project-task-service.ts:308-338`) | Task-side ordering | Task side serializes DONE vs assignment per copy/Task; the race is only in the runtime release |
| 2026-11-10 | Code | `tests/unit/agent-collaboration/root-task-existing-copy-assignment.test.ts:210-256`; `root-task-reactivation.test.ts` | Existing coverage | QR-001 cases cover "DONE before the step" and "release after the commit"; none covers "copy open at the step, release in flight across the commit and the wake" |
| 2026-11-10 | Code | `agent-org-run.ts:110`, `standalone-agent-run-root.ts:167`, `team-task-execution-service.ts:32` | Root kinds | All three use `RootTaskExecutionLifecycle` |
| 2026-11-10 | Doc | `docs/modules/projects.md` "Follow-up Task to an existing copy" (path steps 3–4); `docs/modules/agent_team_execution.md:609-615` | Docs to update | Describe step 3 and the commit as separate steps |

## Runtime, Probe, Or Reproduction Findings

| Method / Command | Scenario | Observation | Established | Evidence |
| --- | --- | --- | --- | --- |
| REPRO-01: temporary `DIAG464` logging (registry restore/release/discard, closure release decision, reopen step, commit, wake) and dense offsets in EXC-E2E-004; `env -i PATH HOME=<temp> TMPDIR NO_COLOR=1 RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<abs>/tests/fixtures/agy-failure-cli.mjs pnpm -C autobyteus-server-ts exec vitest run --no-watch tests/e2e/projects/task-existing-copy-assignment.e2e.test.ts -t EXC-E2E-004`, load average ~60–78 (other work on the machine) | SCN-001, Team root, Team copy | Failed at offset 5 on the first run. Sequence: reopen step sees the copy **open** (0 ms) → DONE commits and its release starts (+27) → B commits (+80) → wake: copy not live (+81) → restore refused: `active=true runActive=false runTerminated=false` (+83) → release done (+103) | Reproduced | `evidence/REPRO-01-race-diagnostics.log` |
| PROTO-01: prototype (closure release queued; assignment and reactivation commit inside their reopen step), same command twice, load ~66–72 | SCN-001 | Both passed; release found the copy open again 12/15 times (not stopped); assignment found it closed 13/12 times (settled, discarded, restored fresh); 0 restore refusals | Reproduced | `evidence/PROTO-01-queued-release-prototype.log` |

- Temporary diagnostics: DIAG464 lines in four source files, dense offsets in the test, and the prototype; all reverted with `git checkout` (worktree clean of source changes).
- Reproduction for implementation to start from: the new unit case (design D4), which must fail before the fix; plus REPRO-01's command (load-dependent).

## Architecture Investigation Findings

- Root cause: **one sequence, two owners** (design-principles Principle 13, design Case 1). The root's lifecycle queue owns a copy's runtime transitions (activate, wake/restore, shutdown, Stop, reopen step), but the closure release, and the reopening commits of assignment and reactivation, run outside it. Their interleaving lets a release stop a copy that a commit has just reopened, and lets the wake meet a copy that is still stopping.
- The Task-side lock already orders DONE and the assignment's records; only the runtime side is split.
- Remote copies: fencing calls a peer and must not hold the queue; it does not touch hosted runtime.

## Supplemental Artifact Inventory

| Artifact Path | Owner | Purpose | Related IDs | Status |
| --- | --- | --- | --- | --- |
| `evidence/REPRO-01-race-diagnostics.log` | Solution Designer | Reproduction | REQ-001 | Current |
| `evidence/PROTO-01-queued-release-prototype.log` | Solution Designer | Prototype under load | REQ-001, REQ-002 | Current |

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Resolution | Status |
| --- | --- | --- | --- | --- |
| ASM-001 | Assumption | No queue step awaits the closure release (deadlock otherwise) | Read: fire-and-forget; `discardReleasedExecution` settles directly | Verified by reading |
| RSK-001 | Risk | The hosted release (and its `closed` publication) now waits behind queued steps; an activation step can take seconds | Accepted: the Task's DONE is already visible on the board; the copy's `closed` event follows when the release runs | Accepted (design) |
| RSK-002 | Risk | A commit inside the queue step holds the queue during a Task-side write | Lock order: queue head, then `serializeCopyInTask`; no Task-side code under its locks awaits the root queue (release fire-and-forget). Any reverse edge escalates (design spec, Risks; ARCH-REV-001 AR-002) | Accepted |
