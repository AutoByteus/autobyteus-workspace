# API/E2E Test-Case Ledger

Package `PROJ-TASKS-20260926-001` — `project-tasks`.

## Ledger Meta

- Assigned task workspace / worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-tasks`
- Coverage investigation: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-tasks/tickets/in-progress/project-tasks/api-e2e-coverage-investigation.md`
- Execution coverage report: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-tasks/tickets/in-progress/project-tasks/api-e2e-execution-coverage-report.md`
- API/E2E revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-tasks/tickets/in-progress/project-tasks/api-e2e-revision-record.md`
- Ledger scope and reason it is required: about 35 cases across un-mocked GraphQL e2e and a long-running multi-process browser probe
- Last updated: 2026-09-26 (round 1 complete)

## Planned Cases

| Case ID | Case / Journey | Requirement / AC IDs | Boundary / Execution Surface | Planned Command Or Entry Point | Planned Order | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| API-001…006 | Released API cases (hermetic env; API-006 + Task) | Released; AC-001, REQ-013 | GraphQL e2e | `npx vitest run tests/e2e/projects` (shell env not scrubbed) | 1 | — |
| API-007 | Task CRUD contract | AC-001–004, 007; REQ-003 | GraphQL e2e | same | 2 | — |
| API-008 | Cascade | AC-006; QR-001 | GraphQL e2e | same | 3 | — |
| API-009 | Released v1.4.86 file | AC-010; REQ-013 | GraphQL e2e | same | 4 | — |
| E2E-001…013 | Released journeys on two panes | Released; AC-008, AC-011 in part | Browser | `pnpm test:e2e:projects` | 5 | Adapted by `IR-001` |
| E2E-014 | Create / empty / summary / To Do / count / no status control / order | AC-001, AC-002, AC-007 | Browser | same | 6 | — |
| E2E-015 | Edit and delete with Cancel paths | AC-003, AC-004 | Browser | same | 7 | — |
| E2E-016 | 120 Tasks: search timing, filter, no-match | AC-005, QR-002 | Browser | same | 8 | — |
| E2E-017 | Project delete with 5 Tasks | AC-006 | Browser + files | same | 9 | — |
| E2E-018 | Open counts | AC-007 | Browser | same | 10 | — |
| E2E-019 | Flag off/on keeps Tasks | AC-008 | Browser | same | 11 | — |
| E2E-020 | Two-pane navigation | AC-011 | Browser | same | 12 | — |
| E2E-021 | Keyboard-only Task journey | AC-012, QR-003 | Browser | same | 13 | — |
| E2E-022 | zh-CN Task surfaces | AC-012, REQ-015 | Browser | same | 14 | — |
| E2E-023 | Narrow stacking below md | REQ-016 | Browser | same | 15 | — |
| E2E-024 | Released file on live node C | AC-010 | Browser + node C | same | 16 | — |
| E2E-025 | Tasks survive restart | AC-001, REQ-013 | Lifecycle | same | 17 | — |
| E2E-026 | Mixed-status file: labels, filter, open count | AC-002, AC-007, QR-003 | Browser + node C | same | 18 | Delete count is only observed |

## Execution Events

| Sequence | Case ID | Timestamp | Event | Command / Entry Point / Material Configuration | Expected Observable Result | Observed Result Or Checkpoint | Result | Evidence / Artifact Path | Next Action / Unresolved Issue |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | API-001…006 | 2026-09-26 19:40 | Checkpoint | Baseline `npx vitest run tests/e2e/projects`, with the shell `ENABLE_*` variables set and then unset | Released cases pass | With the shell env, API-001 fails: the test inherits `ENABLE_PROJECTS=true` from the developer shell. Scrubbed, 6/6 pass. This is a test-fidelity defect in my released test and is fixed in the harness. | N/A | `/tmp/ptasks-logs/server-e2e-env{set,unset}.log` | Update harness |
| 2 | API-001…006 | 2026-09-26 19:44 | Completed | Updated file; shell env **not** scrubbed | Hermetic; API-006 also restores a Task after restart | 6/6 | Pass | `/tmp/ptasks-logs/server-e2e-new.log` | — |
| 3 | API-007 | 2026-09-26 19:44 | Completed | same | Trim; `project_task_` id; TODO; newest first; validation codes; edit moves to top; Project fields and `updatedAt` untouched; `openTaskCount`; delete true/false; no status mutation; no bare `Task`/`TaskStatus` types | As expected | Pass | same | — |
| 4 | API-008 | 2026-09-26 19:44 | Completed | same | Cascade removes the Project and its 5 Tasks; the other Project's Task is kept; `workspaces.json` byte-identical | As expected | Pass | same | — |
| 5 | API-009 | 2026-09-26 19:44 | Completed | same | Released file read intact (0 open, `[]`), bytes and mtime unchanged by reads; first Task write keeps every released field; stored Task has no `projectId` | As expected. 3 consecutive runs pass; the combined server e2e run shows only the pre-existing workspaces-e2e failure. | Pass | `/tmp/ptasks-logs/server-e2e-run{1,2,3}.log`, `server-e2e-combined.log` | — |
| 6 | E2E-001…013 | 2026-09-26 19:50 | Completed | `node tests/e2e/projects-feature-probe.mjs --skip-server-build --output-dir=/tmp/ptasks-logs/probe-run1` | Released journeys pass on two panes | 13/13 | Pass | `/tmp/ptasks-logs/probe-run1/result.json` | — |
| 7 | E2E-014 | 2026-09-26 19:50 | Completed | same | Empty state and "0 open"; field error associated; To Do; first-line summary; "1 open" live without reload; full description in view; no status control in the row, view, edit or create; newest first; persists on reload | As expected (the row shows "just now") | Pass | same | — |
| 8 | E2E-015 | 2026-09-26 19:50 | Completed | same | Edit: prefill, Cancel discards, empty rejected, save shows the full text, the summary updates and moves to the top. Delete: the message names the summary, Cancel keeps it, confirm removes it, "2 open" | As expected | Pass | same | — |
| 9 | E2E-016 | 2026-09-26 19:50 | Completed | same | 120 Tasks: "release" matches 14 (including later-line matches); update < 100 ms; no-match; clear; filter DONE/IN_PROGRESS → no-match; Clear restores ALL; Tasks unchanged | Max update 4.3 ms; max to painted frame 17 ms | Pass | same | — |
| 10 | E2E-017 | 2026-09-26 19:50 | Completed | same | "its 5 tasks?" on both tabs; Cancel keeps; confirm cascades; file clean; `workspaces.json` and memory dir unchanged; other Tasks untouched | As expected | Pass | same | — |
| 11 | E2E-018 | 2026-09-26 19:50 | Completed | same | "4 open", "0 open", "2 open", "120 open" | As expected | Pass | same | — |
| 12 | E2E-019 | 2026-09-26 19:50 | Completed | same | Toggle off hides the route and deep link; Tasks kept; on shows the same Tasks | As expected | Pass | same | — |
| 13 | E2E-020 | 2026-09-26 19:50 | Completed | same | Select prompt with no highlight; one click switches with the same pane node and no reload; tab change keeps the pane; deep link opens Tasks; not-found in the right pane and the pane stays usable | As expected (switch 171 ms including the network) | Pass | same | — |
| 14 | E2E-021 | 2026-09-26 19:50 | Completed | same | Keyboard-only: validation, trap, Escape and focus return, Ctrl/⌘+Enter multi-line create, view/edit/Cancel/Save, delete with Cancel then confirm, tabs End/Home/arrow wrap, search → filter in tab order, Project delete "1 task" | As expected; `softFailures: []`. Observation: after a Task is deleted, focus falls to `BODY`, because the opener row is gone. | Pass | same | Non-blocking recommendation |
| 15 | E2E-022 | 2026-09-26 19:50 | Completed | same | zh-CN prompt, "4 项未完成", tabs, New task, To Do, dialogs, validation, delete, empty state; no raw keys; no English Task strings | As expected | Pass | same | — |
| 16 | E2E-023 | 2026-09-26 19:50 | Completed | same | At 700×900: `flex-direction: column`, pane (342 px) above content, no overflow, controls in view, Task dialog fits | As expected | Pass | same, `E2E-023-narrow-*.png` | — |
| 17 | E2E-024 | 2026-09-26 19:50 | Completed | same (node C) | Released file on a restarted live node: intact, 0 open, link AVAILABLE; bytes unchanged after browsing; UI Task write keeps released fields | As expected | Pass | same | — |
| 18 | E2E-026 | 2026-09-26 19:50 | Completed | same (node C) | Status as text for all 3 states; per-status filter; "2 open" excludes Done | As expected. Observed (not asserted): the delete message says "2 tasks" for 3 Tasks, the known `openTaskCount` note, unreachable in this ticket. | Pass | same | Note for admission |
| 19 | E2E-025 | 2026-09-26 19:50 | Completed | same | Real restart: all Projects and Tasks identical; UI list and "2 open" | As expected | Pass | same | — |
| 20 | E2E-001…026 | 2026-09-26 20:00 | Completed | `corepack pnpm test:e2e:projects --skip-server-build --output-dir=/tmp/ptasks-logs/probe-run{2,3}` | Determinism | 26/26 twice; max update 4.3 / 4.1 ms; painted 24.2 / 17 ms; cleanup complete | Pass | `/tmp/ptasks-logs/probe-run{2,3}/result.json` | — |

## Re-entry And Reconciliation

- Last durably recorded event: sequence 20 (determinism reruns, Pass)
- Last completed case and result: all 35 cases pass (API-001…009, E2E-001…026)
- Cases still running, interrupted, or not started: none
- Next case or recovery action: none; route to `/code_reviewer` for the proportional test-code review
- Interruption, context-compression, or rerun note: the probe passed on its first full run (run 1), and runs 2 and 3 were identical
- Reconciled into execution coverage report: `Yes`
- Reconciliation note for any case missing a terminal result: none
