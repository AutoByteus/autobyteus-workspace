# API/E2E Execution Coverage Report

Package `PROJ-TASKS-20260926-001` — `project-tasks`: description-only Project Tasks shown on the released Projects grid, a full-width Project page, and a three-column Task board (SR-008).

## Execution Round Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-tasks/tickets/in-progress/project-tasks/requirements-doc.md` (Approved, `SR-008`, `APPROVAL-PROJ-TASKS-20260927-002`)
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-tasks/tickets/in-progress/project-tasks/investigation-notes.md`
- Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-tasks/tickets/in-progress/project-tasks/solution-revision-record.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-tasks/tickets/in-progress/project-tasks/design-spec.md` (`SR-008`)
- Supplemental Task Artifacts: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-tasks/tickets/in-progress/project-tasks/handoff-to-architecture-review-sr-008.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-tasks/tickets/in-progress/project-tasks/design-review-report.md` (`ARCH-REV-003`, Pass)
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-tasks/tickets/in-progress/project-tasks/architecture-review-revision-record.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-tasks/tickets/in-progress/project-tasks/implementation-handoff.md` (`IR-002`)
- Implementation Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-tasks/tickets/in-progress/project-tasks/implementation-revision-record.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-tasks/tickets/in-progress/project-tasks/code-review-report.md` (`CRR-003`, Pass 9.3/10)
- Code Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-tasks/tickets/in-progress/project-tasks/code-review-revision-record.md`
- Delivery Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-tasks/tickets/in-progress/project-tasks/delivery-revision-record.md` (`DR-001`, rejected by the user; must not be finalized)
- Coverage Investigation: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-tasks/tickets/in-progress/project-tasks/api-e2e-coverage-investigation.md` (round 2)
- API/E2E Test-Case Ledger: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-tasks/tickets/in-progress/project-tasks/api-e2e-test-case-ledger.md`
- API/E2E Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-tasks/tickets/in-progress/project-tasks/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-002`
- Current Execution Round: `2`
- Trigger: `/code_reviewer` Pass `CRR-003` of `IR-002` (`ae0cd4755`, a web-only rework after `DR-001` was rejected)
- Prior Round Reviewed: round 1 (`API-REV-001`, Pass 95%). It validated the two-pane UI that SR-008 has since superseded.
- Latest Authoritative Round: `2`

## Routing Classification

- Task size: `Medium`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review`
- Proportional test-code review decision: `Required` (fresh review of the probe rewritten in `IR-002`, plus my round-2 additions)

## Investigation And Execution Basis

- Coverage investigation: round 2 section "Round 2 — SR-008 Rework Basis And Plan"
- Investigation completed before durable changes or final execution: `Yes`
- Plan followed: `Yes`
- Coverage decisions revised:
  - My round-1 two-pane Task cases are now **Stale / Replaced**. `IR-002` replaced them with board cases, which I reviewed against SR-008 and retained.
  - Added E2E-028 (width sweep) and E2E-029 (error-state Back and description clamp).
- Reroute required: `No`

## Test-Case Ledger Reconciliation

- Ledger initialized: `Yes`. Round 2 is recorded in sequences 21–25.
- Every completed case recorded: `Yes`
- Reconciled: `Yes`
- Last durably recorded event: sequence 25
- Cases still running, interrupted, or not started: none

| Case ID | Final Result | Last Event | Evidence | Reconciled Result |
| --- | --- | --- | --- | --- |
| API-001…009 | Pass | seq 21 | `/tmp/ptasks-logs/r2/server.log` | Pass (server unchanged) |
| E2E-001…013 | Pass | seq 22, 25 | `/tmp/ptasks-logs/r2/probe-run{1,2,3}/result.json` | Pass (restored v1.4.86 journeys) |
| E2E-014…027 | Pass | seq 22, 25 | same | Pass (SR-008 board journeys) |
| E2E-028, E2E-029 | Pass | seq 23–25 | same | Pass (added in round 2) |

## Compatibility / Legacy Scope Check

- Backward compatibility introduced or tolerated: `No`. The two-pane UI was removed outright: no redirects and no dual layouts. E2E-020 asserts that no list pane is rendered.
- Legacy retention: `No`
- Persisted-data transition: `Directly Usable — No Migration`. Unchanged, and re-proven by API-009 and E2E-024.
- Compatibility-only durable coverage: `No`

## Changed Boundary And Evidence Matrix

| Scenario ID | Requirement / AC | Changed Boundary | Surface | Evidence Type | Result | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| API-001…009 | AC-001–004, 006, 007, 010; REQ-003, 013 | Server Projects/Tasks (unchanged) | Full schema, isolated config, shell flags set | Durable | Pass | `projects-graphql.e2e.test.ts` |
| E2E-001…013 | Released ACs; AC-008 (flag) | Restored grid, card and Back; Workspaces tab | Browser, live nodes A/B | Durable/Browser | Pass | `result.json` |
| E2E-014 | AC-001, AC-002, AC-007 | Board, card, dialog create; grid count | Browser | Durable/Browser | Pass | same |
| E2E-015 | AC-003, AC-004 | Dialog edit and delete from a card | Browser | Durable/Browser | Pass | same |
| E2E-016 | AC-005, REQ-007, REQ-014 | Search across columns, 120 Tasks | Browser timing | Durable/Browser | Pass | same |
| E2E-017 | AC-006 | Project delete count and cascade | Browser + files | Durable/Browser | Pass | same |
| E2E-018 | AC-007, REQ-009 | Card count line variants | Browser | Durable/Browser | Pass | same |
| E2E-019 | AC-008 | Flag with Tasks | Browser | Durable/Browser | Pass | same |
| E2E-020 | AC-011, REQ-016 | Grid → full-width page → Back; deep link; not-found with Back | Browser | Durable/Browser | Pass | same |
| E2E-021 | AC-012, QR-003 | Keyboard: card buttons, dialog modes, tabs, Back, Project delete | Browser keyboard | Durable/Browser | Pass | same |
| E2E-022 | AC-012, REQ-015 | zh-CN board and grid | Browser zh-CN | Durable/Browser | Pass | same |
| E2E-023 | REQ-006 (narrow) | 700 px stack | Browser | Durable/Browser | Pass | `E2E-023-narrow-stacked.png` |
| E2E-027 | AC-002 width guards | 1200 px with the default/520 px panel; 1000 px window; 3-line clamp | Real shell + panel drag | Durable/Browser | Pass | `E2E-027-*.png` |
| E2E-028 | REQ-006, AC-002 | Container query across 760–1600 px × 2 panel widths | Real shell sweep | Durable/Browser | Pass | `result.json` › `E2E-028` |
| E2E-029 | REQ-016 | Back in the error state; 2-line description | Browser + intercepted GetProject | Durable/Browser | Pass | same |
| E2E-024 | AC-010 | Released file on live node C | Browser + file bytes | Durable/Browser | Pass | same |
| E2E-026 | AC-002, AC-005, AC-007 | Mixed statuses in three columns; filtered counts; open count excludes Done | Browser + node C | Durable/Browser | Pass | same |
| E2E-025 | AC-001, REQ-013 | Real restart | Lifecycle | Durable/Browser | Pass | same |
| AC-009 | REQ-012 | Delegated tasks (unchanged) | Existing suites | Durable | Pass | `/tmp/ptasks-logs/r2/{server,web}.log` |

## Additional Repository Coverage Execution

| Order | Command | Working Directory | Boundary | Result | Evidence |
| --- | --- | --- | --- | --- | --- |
| R2-1 | `corepack pnpm -C autobyteus-server-ts build` | worktree | Server rebuilt after the merge | Pass | `/tmp/ptasks-logs/r2/server-build.log` |
| R2-2 | `node tests/e2e/projects-feature-probe.mjs --skip-server-build --output-dir=/tmp/ptasks-logs/r2/probe-run1` | `autobyteus-web` | E2E-001…029 | 29/29 | `/tmp/ptasks-logs/r2/probe-run1/` |
| R2-3 | `corepack pnpm test:e2e:projects --skip-server-build --output-dir=/tmp/ptasks-logs/r2/probe-run{2,3}` | `autobyteus-web` | Determinism, script entry | 29/29 ×2 | `/tmp/ptasks-logs/r2/probe-run{2,3}/` |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | Change | New / Final Supporting Evidence | Residual Uncertainty |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 80% | 95% | +15 | Every SR-008 AC is directly proven through the live UI and API. AC-011's "visual comparison": the three grid files are byte-identical to v1.4.86 (`git diff e06080b00 HEAD`), `ProjectCard` differs only in the approved count line, and the grid screenshot was reviewed. | AC-009 is proven by unchanged code and existing suites, with no live LLM team run |
| Changed-boundary execution directness | 80% | 95% | +15 | The restored pages, `ProjectDetail`, board and cards all rendered in the real app shell | — |
| Cross-boundary integration realism and mock gap | 80% | 95% | +15 | Three live nodes, a real restart, the released-file node, and the real resizable side panel dragged to 520 px | Rebinding goes through `bindNodeContext` |
| Environment, configuration, identity, and fixture fidelity | 90% | 95% | +5 | Hermetic flags on both surfaces; the server was rebuilt after the merge; no config change in the diff | macOS only |
| Failure, edge-case, lifecycle, and recovery evidence | 90% | 95% | +5 | Empty/whitespace rejection, Cancel paths, no-match with focus return, not-found and error states with Back, flag off/on, restart, cascade | — |
| User-surface, browser, and desktop-shell confidence | 60% | 95% | +35 | 44-width sweep × 2 panel widths with 0 violations; 1200/1000/1024/700 px; 3-line and 2-line clamps; keyboard-only; zh-CN; screenshots reviewed | After a Task delete, focus falls to `BODY` (non-blocking; ACs met) |
| Durable regression coverage quality and relevance | 85% | 95% | +10 | 9 API cases + 29 browser cases with per-case evidence and cleanup; the layout invariant is guarded continuously by the sweep | — |

- Overall post-repository confidence: 81%
- Overall final confidence: 95%
- Calculation: simple average
- Every critical AC directly proven: `Yes`
- Any category below 90%: `No`
- 95% target met: `Yes`

## Broader Validation Decision And Execution

- Decision: `Required`. Executed in the browser with live nodes A, B and C, the real app shell (including a panel drag), restart, keyboard-only and zh-CN.
- Deviation: none. E2E-028 and E2E-029 were added.
- Environment: `ENABLE_*` scrubbed from spawned processes; `en` preset, with zh-CN in its own context; UTC.
- Seed data: UI-created when under test, otherwise GraphQL. Node C holds the released and mixed-status files written between restarts.

| Scenario / Journey Step | Expected | Actual | Evidence | Result |
| --- | --- | --- | --- | --- |
| E2E-014 board create | To Do count; description card; no controls | Headings "To Do 1 / In Progress 0 / Done 0"; card text has both lines and its accessible name is the summary; 0 inner controls, selects or draggables; "No tasks" ×3 on the empty board; order newest first; grid "3 open tasks" | `E2E-014` | Pass |
| E2E-016 search | Across columns, < 100 ms, counts, no-match | 14 matches, "To Do 14 / 0 / 0"; update ≤ 5.6 ms and painted ≤ 30.8 ms over 3 runs; no-match; Clear returns focus to search; Tasks unchanged | `E2E-016` | Pass |
| E2E-018 card counts | Variants | "4 open tasks · No workspaces", "No open tasks · No workspaces", "1 open task · 1 workspace", "120 open tasks · …" | `E2E-018-pass.png` | Pass |
| E2E-020 navigation | Grid → full-width page → Back; deep link; not-found | No list pane; detail 1117 px = main 1117 px; Back "Projects" (accessible name "Back to projects"); no reload; deep link opens Tasks; not-found Back returns to the grid | `E2E-020` | Pass |
| E2E-021 keyboard | Every action | `softFailures: []` (card open, dialog modes, tabs Home/End/arrows, Back, Project delete "1 task"). Focus after a Task delete = `BODY` (observation) | `E2E-021` | Pass |
| E2E-022 zh-CN | Localised | "4 项未完成任务 · 没有工作区"; 待办 / 进行中 / 已完成; 暂无任务; Back "返回项目列表"; no raw keys or English | `E2E-022` | Pass |
| E2E-027 guards | ≥ 240 px or stacked | 1200 px with the 320 px panel: 3×260 and a 3-line card. 520 px panel: stacked. 1000 px: stacked | `E2E-027-*.png` | Pass |
| E2E-028 sweep | Never squeezed | Side by side only when the board is ≥ 773 px (min column 247 px); a 733 px board is stacked; 0 violations or overflow at all 44 measurements | `E2E-028` | Pass |
| E2E-029 error Back and clamp | Back present and working; 2 lines | Back at (32, 20) px, returns to the grid; description 2 lines with the full text in the DOM | `E2E-029` | Pass |
| E2E-024 / 026 / 025 | Released file, mixed statuses, restart | Released file unchanged by browsing, and released fields kept on the first write. Mixed statuses: "To Do 1 / In Progress 1 / Done 1"; a "progress" search gives "0 / 1 / 0"; "2 open tasks". Restart identical | `E2E-024`, `E2E-026`, `E2E-025` | Pass |

## Desktop Application Validation

- Renderer-only change, validated in the browser against `pnpm dev` with the real app shell (including the resizable left panel). No shell change. Effect on the running desktop app: `None`.

## Platform / Runtime Targets

- macOS (darwin-arm64); Node v22.23.1; playwright-core 1.58.2 Chromium (headless)
- Viewports: 1440×900; 1200×800 (default and 520 px panel); 1024×700; 1000×800; 700×900; the sweep covers 760–1600 px wide at 900 high
- Locales: `en` and `zh-CN`; UTC; keyboard-only journeys

## Lifecycle / Upgrade / Restart / Persisted-Data Checks

- `Directly Usable — No Migration`, unchanged. The released v1.4.86 file is intact and not rewritten by reads, and the first write keeps the released fields (API-009, E2E-024). The real restart is identical (E2E-025). No version branch.

## Tests Implemented Or Updated

| Path / Scenario | Change | Requirement | Result | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-web/tests/e2e/projects-feature-probe.mjs` | `IR-002` rewrote E2E-014…027 for the board and restored E2E-001…013 (reviewed and retained). Round-2 API/E2E changes: added E2E-028 and E2E-029, corrected the header comment. | AC-001–008, 010–012; REQ-006, REQ-016 | 29/29 ×3 | Uncommitted |
| `autobyteus-server-ts/tests/e2e/projects/projects-graphql.e2e.test.ts` | Unchanged since round 1 (committed in `768c155f6`) | AC-001–004, 006, 007, 010 | 9/9 | — |

## Tests Removed As Stale Or Obsolete

| Path / Scenario | Obsolete Assertion | Upstream Evidence | Replacement |
| --- | --- | --- | --- |
| Round-1 probe cases E2E-014…026 (two-pane list pane, list rows, status filter, one-click list switching) | Two-pane layout and list presentation | SR-008 supersedes REQ-006/007/009/016 and the related ACs; the user rejected the build (`DR-001`) | `IR-002` board cases E2E-014…027, plus E2E-028/029 |
| `ProjectListPane.spec.ts`, `ProjectTasksPanel.spec.ts`, `relativeTime.spec.ts` (removed by `IR-002`) | Same | Same | `ProjectTaskBoard.spec.ts`, `ProjectTaskCard.spec.ts`, `ProjectsList.spec.ts` |

## Durable Coverage Changed In The Codebase

- Changed this round: `Yes` (uncommitted)
- Path: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-tasks/autobyteus-web/tests/e2e/projects-feature-probe.mjs`. It includes `IR-002`'s rewrite, committed in `ae0cd4755`, plus my uncommitted E2E-028/029 and header change.
- Removed: see the table above (removed by `IR-002` in `ae0cd4755`)
- Attached for review: `Yes`

## Other Execution Artifacts

| Artifact | Purpose | Retention |
| --- | --- | --- |
| `/tmp/ptasks-logs/r2/` | Logs, results and screenshots for round 2 | Retained, outside the repo |

## Dependencies Mocked Or Emulated

| Dependency | Method | Limitation |
| --- | --- | --- |
| Run managers (API e2e) | "No active runs" | None for Tasks |
| Future agent-written statuses (E2E-026) | A current-shape file on node C | Model-valid states; not a user path |
| GetProject failure (E2E-029) | Playwright route intercept | Needed to reach the error state |
| Electron window bootstrap | In-page `bindNodeContext` | Unchanged code |

## Result Summary

| Result | Scenario IDs | Summary |
| --- | --- | --- |
| Pass | API-001…009, E2E-001…029, AC-009 suites | All SR-008 ACs proven |
| Out Of Scope | `org-definition-navigation` (web) | Pre-existing |

## Cleanup Performed

| Resource | Action | Result |
| --- | --- | --- |
| Probe nodes A/B/C, frontend, browser (runs 1–3) | Process-group stop; `browser.close()` | `terminated:*` in every result |
| Probe temp roots | `fs.rm` | Removed; none left in `$TMPDIR` |
| Delivery's uncommitted docs, `autobyteus-web/test-results/` | Not mine | Untouched |

## Preliminary Classification

N/A — Pass.

## Recommended Recipient

`/code_reviewer` — a fresh proportional test-code review of the current probe (`api-e2e-test-review-report.md`)

## Evidence / Notes

These are non-blocking.

1. **Focus after a Task delete.** Focus still falls to `BODY` after deleting a Task from its dialog, because the card that opened it is gone. AC-012 and QR-003 are met. The suggested polish is to move focus to New task or the next card.
2. **Delete count.** The Project delete count uses `openTaskCount`: with a Done Task, "2 tasks" for 3. This is unreachable in this ticket; carry it to Task admission.
3. **Board stacking on common windows.** With the default 320 px panel, the board stacks below a window width of about 1140 px, and with the 520 px panel below about 1340 px. This is the approved "stack instead of squeeze" behavior, recorded so delivery and the user know where the switch happens.
4. **Stale docs.** Delivery's uncommitted docs (`autobyteus-web/docs/projects.md`, `autobyteus-web/AGENTS.md`, `autobyteus-server-ts/docs/modules/projects.md`) describe the rejected UI. Delivery will redo them, and `DR-001` must not be finalized.

## Latest Authoritative Result

- Result: `Pass`
- Final validation confidence: 95%
- Default target met: `Yes`
- Any final applicable category below 90%: `No`
- Broader validation decision: `Required` — executed
- Critical ACs lacking direct proof: none
- Required next recipient: `/code_reviewer` (proportional test-code review)
- Notes: `task_size=Medium` and `architectural_risk=High` are preserved.
