# API/E2E Coverage Investigation — followups-483-517

## Investigation Meta

- Requirements Doc: `tickets/in-progress/followups-483-517/requirements-doc.md` (SR-002; REQ-004/FU-004 not in scope: DEC-003 waits for the user)
- Investigation Notes: `tickets/in-progress/followups-483-517/investigation-notes.md`
- Solution Revision Record: `tickets/in-progress/followups-483-517/solution-revision-record.md` (SR-001, SR-002)
- Design Spec: `tickets/in-progress/followups-483-517/design-spec.md` (SR-001; SR-002 refines AC-001 and adds the (c) test changes)
- Supplemental Task Artifacts: `evidence/grok-acp-probe.*` (FU-004, not in scope)
- Design Review Report / Architecture Review Revision Record: `N/A — not applicable` (direct route, Small/Low)
- Implementation Handoff: `tickets/in-progress/followups-483-517/implementation-handoff.md` (IR-002)
- Implementation Revision Record: `tickets/in-progress/followups-483-517/implementation-revision-record.md`
- Code Review Report / Revision Record: `N/A — not applicable`
- API/E2E Revision Record: `tickets/in-progress/followups-483-517/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- Current Investigation Round: 1
- Trigger: implementation handoff IR-002
- Prior Investigation Reviewed: None
- Latest Authoritative Investigation: this file

## Current Requirement And Design Basis

- REQ-003 / AC-002 (FU-003, the only product change): `AgyBackgroundTaskMonitor.list()` returns every task of the run (running, completed/failed with exit code, stopped + `run_ended`) as its latest snapshot; `backgroundTaskInspection.current()` → GraphQL `currentTasks` → the panel's and the phone's seed. A panel opened late shows an ended AGY task with its end line.
- REQ-001/002 / AC-001 (FU-002, tests only), as refined by SR-002: under the same load every base failure caused by a test wait or an elapsed bound passes on the branch; the remaining failures have recorded causes outside the tests (FU-001, FU-002, and IR-002's FU-003); each listed test passes alone.
- REQ-005 / AC-004 (FU-005, docs only): `settings.md` holds settings only; links into `settings.md#…` and `agent_execution_architecture.md#…` resolve.
- Persisted data: `Not Affected`.

## Supported Scenarios And Real Usage

- SCN-003 (UC-003): a user opens or reloads the Activity tab of an Antigravity run after a background task ended: desktop panel and phone read the node's view.
- Added real-use scenario: the phone opens the run's Activity only after the task ended (the phone reads the same view; the desktop panel probe of autobyteus-483 already proves the end line from view rows).
- UC-002: developers' server suites on a loaded machine.
- UC-005: a reader following doc links.
- Contrived/unsupported: None.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-003 AGY view keeps ended tasks | Changed (product) | REQ-003, DEC-001 | unit (IMP-01); durable E2E of the view after an exit (none exists); phone late open |
| BEH-002 test waits and budgets | Changed (tests) | REQ-001/002, SR-002 | rerun the seven files on the branch; check the recorded causes |
| BEH-005 `settings.md` | Changed (docs) | REQ-005 | link check |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | AGY monitor `list()` | IMP-01 unit 327/327 | the view after an exit through the real server | scripted-AGY E2E (BTS-03 extended) |
| API / transport / contract | No (same shape) | — | — | — | — |
| Frontend / phone | No code change; behaviour visible | the seed now gets ended AGY rows | 483 web specs and probes | the phone opening late on a real node | phone probe (new MSP case) |
| Test suites (FU-002) | Yes | waits, budgets, removed elapsed bounds | IMP-03/04/07 | state at today's load | rerun the seven files once |
| Docs | Yes | `settings.md`, `agent_execution_architecture.md` | IMP-05 | — | rerun the link check |
| Others | No | — | — | — | — |

## Project Execution Discovery

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/followups-483-517`, branch `codex/followups-483-517`, HEAD `2a553b5473`.
- Testing guideline: `TESTING.md` (root): "File watching on a busy Mac", "One heavy run at a time", phone behaviour on the phone bundle, both typechecks for a TypeScript change.
- Changed build-input paths: None (`src`, `tests`, docs) → no fresh-start build.
- Secrets: none (scripted AGY CLI; no provider).

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `tests/unit/agent-execution/backends/antigravity/agy-background-task-monitor.test.ts` | list keeps ended tasks; `stopAll` → `run_ended` | AC-002 | Still Valid (updated by implementation) | IMP-01 | Reused |
| `tests/e2e/runtime/background-task-status-count.e2e.test.ts` BTS-03 | AGY daemon step: idle 1 → idle 0 | AC-002 | Needs Update | it never reads the view after the exit | add: `currentTasks` lists the ended task with its exit code |
| `autobyteus-web/tests/e2e/mobile-background-tasks-cases.mjs` | MSP-47/48/49/59: tasks seen while open, desktop reload while running, run end | AC-002 | Needs Update | no case opens Activity after the task ended | add MSP-60 |
| `tests/e2e/projects/background-step-stop-own-view.e2e.test.ts` | own view with a stopped background step | AC-002 regression | Still Valid | IMP-02 | Reused |
| The seven FU-002 files | waits, budgets | AC-001 | Still Valid (updated) | IMP-03/04/07 | rerun once on the branch (API-03) |

## Planned Cases

| Case ID | Criteria | Boundary / Surface | Kind | Planned Command Or Steps | Why |
| --- | --- | --- | --- | --- | --- |
| API-R1 | AC-002 (unit) | AGY monitor | Reused | IMP-01 | no change to the monitor or its test since `807951b6e0` |
| API-R2 | AC-002 (regression) | scripted-AGY own view, BTS-03 count | Reused | IMP-02 | same code |
| API-R3 | AC-001 (base vs branch under load) | seven files | Reused | IMP-03, IMP-04, IMP-07 | load cannot be reproduced exactly; the evidence holds the commands, load and outcomes |
| API-01 | AC-002 | real server, scripted AGY, GraphQL view | Durable (update) | BTS-03 extended; run with `RUN_BACKGROUND_TASK_STATUS_E2E=1 ANTIGRAVITY_CLI_COMMAND=<fixture> AGY_FAKE_CASE=linked_skills` | the product change through the real view |
| API-02 | AC-002 (UC-003) | production phone bundle on a real node | Durable (add) | MSP-60 with MSP-47..49/59 in `test:e2e:mobile-shell` | "panel opened late" on the phone |
| API-03 | AC-001 | the seven files on the branch | Existing Test | one vitest run of the seven files; record load and fseventsd CPU | independent snapshot; check that remaining failures match recorded causes |
| API-04 | AC-004 | doc links | Existing Test | `python3 tickets/in-progress/followups-483-517/evidence/check-doc-anchors.py .` | cheap independent rerun |
| API-05 | — | typechecks (server change; my test edits) | Existing Test | `pnpm -C autobyteus-server-ts typecheck`, `pnpm -C autobyteus-web typecheck` | TESTING.md: both for a TypeScript change; web was not run |

- Test progress log needed: `Yes`

## Durable Coverage To Add / Update

| Case ID | Path | Change |
| --- | --- | --- |
| API-01 | `autobyteus-server-ts/tests/e2e/runtime/background-task-status-count.e2e.test.ts` (BTS-03) | after the step exits, the view's `currentTasks` lists it `completed`, `exitCode 0`, `endReason null` |
| API-02 | `autobyteus-web/tests/e2e/mobile-background-tasks-cases.mjs` (MSP-60), `mobile-shell-probe.mjs` (header) | a task that ended (exit 1) before the phone opened Activity is listed `failed` with the line `exit code 1` |

## Durable Coverage To Remove

None.

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Only The User Can Check? | Follow-Up |
| --- | --- | --- | --- | --- |
| View after an AGY Stop of a turn (the run stays active, tasks `stopped` + `run_ended`) | the scripted CLI's background step ends its turn at once, so there is no turn to stop while the step is open; unit covers `stopAll` → `run_ended` in the list, and autobyteus-483's live check covered the stream | Low | No | — |
| Live AGY | scripted CLI exercises the same monitor and message-file format | Low | No | — |

## Ambiguities Or Reroute Triggers

None. (SR-002's literal "DCF-E2E-005 uses `FILE_EVENT_TEST_TIMEOUT_MS`" was implemented as 60 s + 2 × `OS_FILE_EVENT_WAIT_MS`, because 45 s would shorten the case's existing 60 s; the intent — a budget that covers its file events — holds. Recorded as an observation.)

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes` (BTS-03, MSP-60)
- Reroute Required: `No`
