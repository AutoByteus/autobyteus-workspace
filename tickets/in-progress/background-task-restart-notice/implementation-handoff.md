# Implementation Handoff — Part 1: the restart reminder

## Upstream Artifact Package

All paths below are in `/Users/normy/autobyteus_org/autobyteus-worktrees/background-task-restart-notice/tickets/in-progress/background-task-restart-notice/`.

- Upstream review applicability and handoff-rule result: independent architecture review selected (Medium / High) and passed (ARCH-REV-002); this package goes to code review.
- Requirements doc: `requirements-doc.md` (Approved; REQ-005 and AC-001/003/004 clarified at SR-003; DEC-008 by the user, SR-004)
- Investigation notes: `investigation-notes.md`
- Solution revision record: `solution-revision-record.md` (SR-003)
- Design spec: `design-spec.md` (Ready, SR-004, part 1)
- Supplemental task artifacts: `architecture-design-handoff.md`; no behavior-defining supplements
- Design review report: `design-review-report.md` (ARCH-REV-002, Pass)
- Architecture review revision record: `architecture-review-revision-record.md`
- Triggering rework report, revision record, or evidence: `design-review-report.md` ARCH-REV-003 (Pass, SR-004, the user's DEC-008), resolving CRR-002 / API-E2E F-1 (`api-e2e-execution-coverage-report.md`, `api-e2e-revision-record.md` API-REV-001)

## Current Implementation Summary

- Implementation cycle: `Rework` (IR-002: DEC-008, the background-task line after an unexpected stop)
- Implementation revision record: `implementation-revision-record.md`
- Current implementation revision ID: `IR-002` (IR-001 baseline)
- Related solution revision IDs: `SR-003`, `SR-004`
- Related architecture-review revision IDs: `ARCH-REV-002`, `ARCH-REV-003`
- Related code-review revision IDs: `CRR-001` (Pass), `CRR-002` (DEC-008 routed upstream), `CRR-003` (Pass, round 3; `code-review-report.md`)
- Related API/E2E revision IDs: `API-REV-001` (Fail: F-1, resolved by DEC-008)
- Related delivery revision IDs: `N/A`
- Triggering finding IDs: `F-1` (API/E2E), `CRR-002`
- Worktree / branch / commits: `/Users/normy/autobyteus_org/autobyteus-worktrees/background-task-restart-notice`, branch `codex/background-task-restart-notice`, base `4cbf9e7881` (origin/personal). Code: `4cbf9e7881..d5e9f350cf` (`8b986307a8` source, `9533765a5e` tests, `7e33d3cab3` and `aa416996c0` docs, `d5e9f350cf` self-review); API/E2E `4cec9abfea`, `cf5ce8d109`; IR-002 `b78555d7bb` (DEC-008: `restart-notice.ts`, its unit test, RR-02's assertion, `restart_resume.md`, `GLOSSARY.md`). The ticket documents and evidence are in the commit named in the handoff message.

What part 1 does: while the node runs, the busy-run record is the live list of runs held by a root that are mid-turn or have a running background task (checked every 2 s, written only on change, `shutdownAt` added at a graceful stop). At the next start, right after the server is built, `RestartResumer.takePreviousSession()` gives every entry its cause (update, restart, unexpected stop), hands them to `RestartReminderService` as persisted pending reminders, then removes the record and prunes the runs that must get none. Each reminder is delivered exactly once: by the run's next input (preface) or, for an update entry, by the wake after recovery, which claims it and posts it as the run's first input; a refused or failed wake returns it to pending.

## Routing Classification (Mandatory)

- Task size: `Medium`
- Architecture risk: `High`
- Design classification section / evidence reference: `design-spec.md` "Task Size And Architectural Risk"
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale: one subsystem extended plus a new reminder file pair, an `AgentRun` facade, composition and startup order; a transient record that is now written while the node runs (timer + persistence), a new persisted file, a startup ordering change and a new notice source in every run's input path.
- Selected route: `Code Review`
- Lightweight implementation self-review completed for the direct route: `Not Applicable`
- New design impact or escalation trigger: `None`. The live record writes only on change (at most one write per 2 s check, none while the list is unchanged); the check is a synchronous walk over in-memory runs.

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 | Update restart, mid-turn: woken with the reminder (interrupted turn + background line) | `BusyRunRecorder` (`busy-run-recorder.ts`) → `takePreviousSession()` (`restart-resumer.ts`, cause `update`) → `RestartReminderService.add` → `resumeAfterRestart` → fences, restore, re-check → `claim` → `buildRestartNotice` → post `onlyAsFirstInput` → `settleClaim` | Implemented; 285's order, fences, first-input rule and cap of 3 kept |
| BEH-002 | Update restart, idle with a background task: woken | recorder records `status: idle`, `backgroundTasks: true` (`AgentRun.hasRunningBackgroundTasks()`; Codex by `inspectBackgroundTasks()` at the graceful stop) → same path as BEH-001 without the interrupted-turn line | Implemented |
| BEH-003 | Graceful non-update restart: reminder with the next input | `restartCauseOf` → `restart` → pending reminder → `AgentRunPlatformNotices` → `RestartReminderService.takePreface` → preface → `prefaceDelivered` | Implemented (integration test through a real `AgentRun`) |
| BEH-004 | Crash, kill, power loss: reminder with the next input | live record without `shutdownAt` (≤ 2 s old) → cause `unexpected_stop` → as BEH-003 | Implemented |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`. The standalone application host, runtime backends, the status shown (part 2) and the 338 completion notices are unchanged.

## Implementation Choices Beyond The Design Text

None changes approved behavior, an owner or a boundary. The stale R-7 cells of the Final File Responsibility Mapping were not followed; the spines, interface rows and ordering example were.

1. **`reminders.claim()` is async** (the interface row shows it synchronous). The service reads its file once, at construction; every operation waits for that read, so a claim can never answer from an empty, not yet loaded service. The resumer awaits it; nothing else changes.
2. **Time and version format of the reminder.** `The application restarted at 2026-11-17 22:20 UTC (reason: an update to v1.5.14).` DEC-003's sample shows `22:20`; the date and `UTC` are added because the agent does not know the node's time zone or date. A version without a leading `v` gets one, as in the sample.
3. **The take's prune** drops pending reminders whose Task is closed (`ClosedTaskEntryFence.refusal`) or whose root history is not `present` (archived, terminated, gone): the REQ-005 rule, which the design wrote as "drop gone roots at the take".
4. **A graceful stop with nobody to tell removes the record** instead of writing an empty list with `shutdownAt`. The next start then has nothing to take, which is what an empty list would give.
5. **Runs whose status is `offline` or `error` are not recorded**, even with a background task: the record's `status` is one of `initializing`, `running`, `idle` (design shape).
6. **The take is not wrapped in `shutdown.stage`.** It never throws, runs before the cleanup is installed and before anything listens, and a stop requested meanwhile is handled by the next `checkpoint()` with the record already turned into reminders.
7. **Saving after a delivery is not awaited by the deliverer** (`prefaceDelivered` and `settleClaim` are synchronous on the port). The reminder leaves the service at once; a failed save is logged. A crash between a delivery and its save tells that run once more at the next start (at least once on a crash, exactly once otherwise).

8. **IR-002 (DEC-008): the background-task line depends on the cause.** `unexpected_stop` gets the user's DEC-008 text word for word (tasks may still be running, untracked; check them with `ps` and the pids given); `update` and `restart` keep the DEC-003 line. No structural change: the cause is already on each pending reminder.

Design-principle deviations decided during implementation: None.

## Key Files Or Areas

- `autobyteus-server-ts/src/restart-resume/`: `busy-run-record.ts` (shape, tolerant reader, `shutdownAt`), `busy-run-recorder.ts` (session ticks, final write, Codex inspection), `restart-cause.ts` (new), `restart-reminder-record.ts` (new), `restart-reminder-service.ts` (new), `restart-resumer.ts` (take, wake with claims), `restart-notice.ts` (DEC-003 text).
- `autobyteus-server-ts/src/agent-execution/domain/agent-run.ts` (`hasRunningBackgroundTasks()`), `compositions/restart-resume-composition.ts`, `compositions/build-studio-server.ts` (reminder service created before the notice slot; slot order), `server-runtime.ts` (startup order).
- Tests: `tests/unit/restart-resume/{busy-run-recorder,restart-resumer,restart-notice,restart-reminder-service}.test.ts`, `tests/integration/restart-resume/restart-reminder-preface.integration.test.ts`, `tests/unit/server-runtime-app-data-migration-gate.test.ts`, `tests/unit/agent-collaboration/configured-agent-execution-handle.test.ts`.
- Docs: `docs/modules/restart_resume.md` (rewritten), `agent_execution.md`, `agent_team_execution.md`, `README.md`; `GLOSSARY.md` (restart reminder, busy run).

## Important Assumptions

- A server without a release stamp (run from `src`) never counts an update; its previous entries read as `restart` or `unexpected_stop` (design R-5).

## Known Risks

- R-4, R-5: Codex idle runs with background terminals are recorded only at a graceful stop (their background-task view is asynchronous); ACP runs only when mid-turn (REQ-004).
- R-6: if the reminders cannot be saved at the take, the record is kept and the failure logged, but the new session's next change rewrites the record, so only the log line is certain (tested).
- Choice 7: at least once, not exactly once, across a crash right after a delivery.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Behavior Change
- Reviewed root-cause classification: Missing Invariant
- Reviewed refactor decision: `No Refactor Needed` beyond the extensions
- Implementation matched the reviewed assessment: `Yes`
- If challenged, routed as `Design Impact`: `N/A`
- Evidence / notes: the recorder is the only writer of `busy-runs.json`, the resumer its only reader and remover, the reminder service the only owner of `restart-reminders.json`; `restart-resume` imports no runtime backend; the reminder service is created in the composition root and passed to the notice slot and the resumer (Principle 16).

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None` (the tolerant record reader is a generic reader policy: missing `backgroundTasks`/`shutdownAt` read as defaults, tested)
- Legacy old-behavior retained in scope: `No`
- Dead code in the touched files and modules removed: `Yes` — the recorder's merge with an unconsumed record, `RestartResumer.resumeAfterUpdate()`, `RestartNoticeInput`, the old notice text, the 285 tests that asserted "a non-update restart notifies nothing" (rewritten to DEC-001 B). New constants without importers are module-private.
- Dead code found elsewhere, added to `follow-ups.md`: None (FU-001 is an unrelated flaky test, not dead code)
- Shared structures remain tight: `Yes` (`BusyRunEntry` gains one field; `PendingRestartReminder` holds facts only, the text is built at delivery)
- Canonical shared design guidance was reapplied during implementation: `Yes`
- Deviations from a design principle decided during implementation: `None`
- Changed source implementation files stayed within size guardrails: `Yes` — `build-studio-server.ts` 488 → 492, `agent-run.ts` 491 → 493 effective lines; largest delta `restart-reminder-service.ts` +131 (new file); none over 220.
- Notes: none.

## Persisted Data Transition Check (When Applicable)

- Approved decision: `busy-runs.json` `Directly Usable — No Migration`; `restart-reminders.json` `Not Affected` (new transient state)
- Design-spec decision reference: "Persisted Data / State Transition Decision"
- Implementation follows the approved decision: `Yes`
- Direct-use evidence: `restart-reminder-service.test.ts` "readBusyRunRecord … reads a record of the release before autobyteus-448" (mid-turn entries, `backgroundTasks: false`, `shutdownAt: null`; another release → `update`, woken as that release intended). An unreadable reminders file is logged and replaced (tested).
- Deviation from the reviewed transition decision: `None`

## Environment Or Dependency Notes

- `pnpm install --frozen-lockfile` and `pnpm -C autobyteus-server-ts prebuild` were run in this worktree. No dependency change.
- The app restarted once during implementation (an update to 1.5.13-beta.8); the work in progress was on disk and is committed; nothing was lost.

## Checks Run

Evidence files are in `tickets/in-progress/background-task-restart-notice/evidence/`.

| Check ID | Command Or Steps | Commit Tested | Environment | Code It Exercises | Behavior / Criteria IDs | Result | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-01 | `pnpm -C autobyteus-server-ts typecheck` | `d5e9f350cf` | macOS 26 arm64, node 22.23.1 | server src and tests | — | Pass | `evidence/IMP-01-server-typecheck.log` | `production errors: 0; test-file errors: 1012 in 316 files (baseline 1012 in 316 files)`, `[typecheck] PASS` |
| IMP-02 | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/restart-resume tests/integration/restart-resume tests/unit/server-runtime-app-data-migration-gate.test.ts tests/unit/agent-collaboration/configured-agent-execution-handle.test.ts --no-watch` | `d5e9f350cf` | macOS | recorder, record reader, cause rule, reminder record and service, resumer (take, wake, claims), notice text, startup order, preface through a real `AgentRun` and `AgentRunPlatformNotices`, `AgentRun.hasRunningBackgroundTasks()` | BEH-001 to 004; REQ-001 to 005; AC-001 to AC-004 (local level); the exactly-once paths named by the review (input first; wake first with input during the post; NOT_FIRST returned; failed post); MP-002 (nothing written before `startSession()`) | Pass | `evidence/IMP-02-restart-resume-tests.log` | `Test Files  10 passed (10)`, `Tests  119 passed (119)` |
| IMP-03 | `pnpm -C autobyteus-server-ts test:unit` (full) | `d5e9f350cf` | macOS, machine load average 66 to 102 | all server unit tests | regression | Pass for this change; 4 failures in an unrelated watcher test, cause recorded (FU-001) | `evidence/IMP-03-server-unit-full.log` | `Tests  4 failed | 8237 passed | 9 skipped (8250)`; the 4 are `agent-package-folder-watcher.test.ts` `Hook timed out in 10000ms` (see its cause analysis) |

| IMP-04 | `pnpm -C autobyteus-server-ts typecheck`; `pnpm -C autobyteus-server-ts exec vitest run tests/unit/restart-resume tests/integration/restart-resume tests/unit/server-runtime-app-data-migration-gate.test.ts tests/unit/agent-collaboration/configured-agent-execution-handle.test.ts --no-watch` | `b78555d7bb` | macOS | `restart-notice.ts` (cause-specific background-task line) and everything IMP-02 covers | REQ-002 (DEC-008), BEH-004 | Pass | `evidence/IMP-04-dec008-rerun.log` | `[typecheck] PASS`; `Tests  120 passed (120)`; `✓ … DEC-008: a mid-turn run after an unexpected stop gets the interrupted line and the still-running line, never the stopped line` |
- IR-002 changes only the reminder text: IMP-01 to IMP-03 stay at `d5e9f350cf`; IMP-04 reruns the typecheck and every test that reaches the text. RR-02 of the API/E2E suite asserted the old line after a SIGKILL; its assertion now expects the DEC-008 line (not run here: it needs the built server, API/E2E reruns it).
- Not run, and why: the live restart E2E on an isolated node (AC-001 before/after on base `4cbf9e7881`, AC-002, AC-003 per runtime, AC-004) and the restart and shutdown E2E fixtures: they need a built isolated instance and a real or scripted model (API/E2E). Server `test:integration` as a whole: only this ticket's integration file was run.

## Frontend Rendered-Result Check (When Applicable)

`Not Applicable`: part 1 changes no frontend; the reminder is shown by the existing system-notice card (same sender as before).

## Downstream Coverage Hints / Suggested Scenarios

- AC-001: native agent idle on `run_bash(run_in_background: true, "sleep 600")`; graceful restart on base (no message) vs this build (reminder `reason: a restart` with the next input); the same after a kill (`unexpected stop`) and after an update (woken).
- AC-002: update restart with a mid-turn agent that also has a background task: one reminder with the interrupted-turn line.
- AC-003: Claude and Antigravity idle with a background task; Codex at a graceful stop; Grok Build / DeepSeek only when mid-turn.
- AC-004: after an update, input before the wake (the input carries it, no wake follows); a closed Task and an archived root get none.
- Crash timing: the record is at most 2 s old (`busy-runs.json` without `shutdownAt` while the node runs).

## API / E2E / Executable Coverage Investigation And Execution Still Required

Yes: AC-001 to AC-004 on an isolated node with real runtimes. The checks above do not substitute for them.
