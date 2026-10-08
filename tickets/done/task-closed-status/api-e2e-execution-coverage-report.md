# API/E2E Execution Coverage Report — `task-closed-status`

## Execution Round Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-closed-status/tickets/in-progress/task-closed-status/requirements-doc.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-closed-status/tickets/in-progress/task-closed-status/investigation-notes.md`
- Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-closed-status/tickets/in-progress/task-closed-status/solution-revision-record.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-closed-status/tickets/in-progress/task-closed-status/design-spec.md`
- Supplemental Task Artifacts: None
- Design Review Report: `N/A — not applicable`
- Architecture Review Revision Record: `N/A — not applicable`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-closed-status/tickets/in-progress/task-closed-status/implementation-handoff.md`
- Implementation Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-closed-status/tickets/in-progress/task-closed-status/implementation-revision-record.md`
- Code Review Report: `N/A — not applicable` (direct route)
- Code Review Revision Record: `N/A — not applicable`
- Delivery Revision Record: N/A
- Coverage Investigation: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-closed-status/tickets/in-progress/task-closed-status/api-e2e-coverage-investigation.md`
- API/E2E Test-Case Ledger: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-closed-status/tickets/in-progress/task-closed-status/api-e2e-test-case-ledger.md`
- API/E2E Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-closed-status/tickets/in-progress/task-closed-status/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-002`
- Current Execution Round: 2 (IR-002 SR-005 last-column layout + IR-003 SR-006 rename CLOSED → CANCELLED, commit `7f7b2c8fb`); round-1 sections below are kept as the baseline, and the **Round 2 Delta** section supersedes them where they differ
- Trigger: direct-route handoff (IR-001, implementation commit `17e4299a6`)
- Prior Round Reviewed: None
- Latest Authoritative Round: 2

## Routing Classification

- Task size: `Medium`
- Architectural risk: `Low`
- Input route: `Direct Low-Risk`
- Successful-output route: `Delivery`
- Proportional test-code review decision: `Not Required — direct low-risk route`

## Investigation And Execution Basis

- Coverage investigation artifact: see Meta
- Investigation completed before durable coverage changes or final execution: `Yes`
- Investigation plan followed: `Yes`
- Existing coverage decisions revised during execution: none. Every existing suite stayed `Still Valid`; nothing was removed.
- Reroute required: `No`
- Notes: PMU-017 failed twice on a probe-owned selector defect (`[data-testid^="project-task-column-"]` also matched the lane's `-count`/`-empty` children). Run 2 used the unchanged probe because the edit had not applied. The fixed selector is `section[data-testid^=…]`. The rendered product was correct in both failing runs (the boxes in the failure output show a full-width Cancelled lane after Done). This was test code only, with no product classification.

## Test-Case Ledger Reconciliation

- Ledger path: see Meta
- Ledger initialized before execution: `Yes` for the browser and regression cases. CLS-API-001 and CLS-E2E-001/002 were planned in the investigation before execution, and their events were recorded right after the runs and before any later case.
- Every completed case recorded: `Yes`
- Ledger reconciled into this report: `Yes`
- Last durably recorded event: see ledger (all cases terminal)
- Cases still running, interrupted, or not started: None

| Case ID | Final Result | Last Event | Evidence / Artifact Path | Reconciled Result / Follow-Up |
| --- | --- | --- | --- | --- |
| CLS-API-001 | Pass | Completed | console; regression `api-e2e-evidence/server-regression/e2e-projects-*.log` | — |
| CLS-E2E-001 | Pass | Completed | `api-e2e-evidence/cls-e2e/run-1.log`, `task-reactivation-root-visibility.json`; regression `e2e-projects-gated.log` | — |
| CLS-E2E-002 | Pass | Completed | same | — |
| CLS-MUT-001 | Pass (new cases fail under mutation) | Completed | console (recorded in ledger) | temporary; source restored |
| REG-SRV | Pass | Completed | `api-e2e-evidence/server-regression/` | — |
| REG-WEB | Pass | Completed | `api-e2e-evidence/web/projects-specs.log`, `localization-guards.log`, `full-test-nuxt.log` | see Additional Execution |
| PMU-017 | Pass (run 3) | Completed | `api-e2e-evidence/pmu-017-run-3/` (runs 1–2: probe selector defect, kept) | — |
| PMU-REG | Pass | Completed | `api-e2e-evidence/pmu-regression-run-1/` | — |

## Compatibility / Legacy Scope Check

- Requirements/design introduce or tolerate backward compatibility: `No`. Downgrade visibility is an approved non-goal and not a runtime path.
- Compatibility-only or legacy-retention behavior observed: `No`. `taskStatusLabelKey.ts` was renamed with no shim, the duplicated sets and literals were removed, and the frozen migration reader is the guideline-mandated released-boundary copy, not a runtime fallback.
- Approved persisted-data transition followed without unnecessary migration or runtime fallback: `Yes`
- Durable coverage added only for compatibility behavior: `No`
- Upstream recipient notified: N/A

## Changed Boundary And Evidence Matrix

| Case ID | Behavior / Req / AC | Changed Boundary | Execution Surface / Mode | Evidence Type | Result | Evidence / Artifact |
| --- | --- | --- | --- | --- | --- | --- |
| CLS-API-001 | BEH-001/005/007/009/010; REQ-001/004/005/011/013; AC-002, AC-004, AC-006, AC-007, AC-010, AC-012 | MCP `tools/list` and `tools/call`, native tools, GraphQL introspection and reads, persisted `task.json` and `agent_run_resources.json` | Real Studio HTTP + default scoped MCP host, test-owned data | Durable | Pass | `project-task-boundaries.e2e.test.ts` |
| CLS-E2E-001 | BEH-001/006/008; REQ-002/003/007/012; AC-001, AC-003, AC-004, AC-005, AC-011 | Agent root: closure event, physical worker stop, refusals, reactivation, strict `/ws/projects` frames, Temp task | Real HTTP/WS/scoped MCP, scripted AGY actor | Durable | Pass | `task-reactivation-root-visibility.e2e.test.ts`; `cls-e2e/task-reactivation-root-visibility.json` |
| CLS-E2E-002 | same | Team root (TASK_EXECUTIONS_CLOSED/_REOPENED) | same | Durable | Pass | same |
| CLS-MUT-001 | — | test sensitivity | `isTerminalTaskStatus` temporarily DONE-only | Temporary | Pass (3/3 new cases fail) | ledger event 4 |
| PMU-017 | BEH-002/003/004/007/008; REQ-006/008/009/010/011/012; AC-001 (display), AC-002 (no status control on the Task page), AC-003, AC-008, AC-009, AC-010, AC-011; QR-001 | Rendered Project board, Task page, Project card, Temp board/header/page, right-panel board/detail, live feed | Owned built backend (`dist/app.js`) + Nuxt dev + headless Chrome 1440×1000, en-US, scripted AGY Manager | Durable / Browser | Pass | `pmu-017-run-3/evidence.json` and screenshots |
| PMU-REG | preserved BEH-003/004/008 | existing DONE, Temp, right-panel journeys | same | Durable / Browser | Pass | `pmu-regression-run-1/evidence.json` |
| REG-SRV | preserved behavior, AC-007 (LLM contract), AC-012 | server unit/integration/E2E layers | Vitest | Durable | Pass | `server-regression/` |
| REG-WEB | AC-008, AC-009, AC-011, QR-001, QR-002 | components, store, catalogs | Vitest/Nuxt | Durable | Pass | `web/` |

## Repository Coverage Execution

All commands ran from the worktree root after `pnpm -C autobyteus-server-ts prebuild && pnpm -C autobyteus-server-ts build` (exit 0; `api-e2e-evidence/server-build.log`). Gated runs unset `AUTOBYTEUS_AGENT_PACKAGE_ROOTS`, `AUTOBYTEUS_SKILLS_PATHS` and `AUTOBYTEUS_APPLICATION_PACKAGE_ROOTS`.

| Order | Command | Configuration | Boundary Or Scenario Proven | Result | Evidence |
| --- | --- | --- | --- | --- | --- |
| 1 | `pnpm -C autobyteus-server-ts exec vitest run tests/e2e/projects/project-task-boundaries.e2e.test.ts -t CLS-API-001 --no-watch` | ungated | CLS-API-001 | Pass (1) | console |
| 2 | `… vitest run tests/e2e/projects/task-reactivation-root-visibility.e2e.test.ts -t CLS-E2E --no-watch` | `RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=$PWD/autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs TASK_REACTIVATION_E2E_EVIDENCE_DIR=…/cls-e2e` | CLS-E2E-001/002 | Pass (2) | `cls-e2e/run-1.log` |
| 3 | Mutation: same two files `-t CLS-` with `isTerminalTaskStatus` DONE-only | temporary, restored | sensitivity | 3 failed as expected | ledger |
| 4 | `… vitest run tests/unit/projects tests/unit/agent-collaboration tests/unit/agent-tools/project-tasks tests/unit/agent-tools/task-delegation tests/unit/app-data-migrations/projects-per-folder-v1-app-data-migration.test.ts tests/unit/api --no-watch` | — | unit layers incl. `task-cancelled-status.test.ts`, LLM-contract hashes, migration frozen reader | Pass (70 files / 649 tests) | `server-regression/unit.log` |
| 5 | `… vitest run tests/integration/agent-team-execution/task-delegation-tool-lifecycle.integration.test.ts tests/integration/standalone-agent-run-root/native-root-termination.integration.test.ts --no-watch` | — | helper/termination integration | Pass (2 / 16) | `server-regression/integration.log` |
| 6 | `… vitest run tests/e2e/projects --no-watch` | ungated | all Projects E2E incl. startup migration, E-007, CLS-API-001 | Pass (4 files / 27; 5 gated files skipped) | `server-regression/e2e-projects-ungated.log` |
| 7 | `… vitest run tests/e2e/projects --no-watch` | gated (as in order 2) | all 9 files incl. closure, reactivation (DONE + CANCELLED), change feed, ad-hoc, context-files delegation | Pass (9 files / 47; 1 skipped = live-Claude case) | `server-regression/e2e-projects-gated.log` |
| 8 | `pnpm -C autobyteus-web test:nuxt components/projects localization/messages/__tests__ stores/__tests__ utils/projects scripts/__tests__/localizationLiteralAudit.spec.ts --run` | — | boards, toggle, pills, store live moves, catalog parity | Pass (102 / 981) | `web/projects-specs.log` |
| 9 | `pnpm -C autobyteus-web audit:localization-literals && pnpm -C autobyteus-web guard:localization-boundary` | — | literal keys, boundary | Pass | `web/localization-guards.log` |
| 10 | `pnpm -C autobyteus-web test:nuxt --run` | full | whole web suite | Pass (587 / 3978; 0 failed) | `web/full-test-nuxt.log` |
| 11 | `pnpm -C autobyteus-web test:e2e:project-manager-ux --cases PMU-017 --output-dir …/pmu-017-run-{1,2,3}` | owned stack | PMU-017 | runs 1–2 Fail (probe selector), run 3 Pass | `pmu-017-run-*/` |
| 12 | `pnpm -C autobyteus-web test:e2e:project-manager-ux --cases PMU-001,PMU-002,PMU-003,PMU-005,PMU-009,PMU-015,PMU-017 --output-dir …/pmu-regression-run-1` | owned stack | regression + PMU-017 in sequence | Pass (7/7) | `pmu-regression-run-1/evidence.json` |

## Additional Repository Coverage Execution

| Order | Command | Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| 10 | `pnpm -C autobyteus-web test:nuxt --run` | full web suite after the probe runs | whole web suite | Pass (587 files passed, 2 skipped; 3978 tests passed, 5 skipped; 0 failed, so `CollaborationMessagesOrgRoot.integration.spec.ts`, reported flaky by implementation, passed in this run) | `api-e2e-evidence/web/full-test-nuxt.log` |

## Validation Confidence Scorecard

| Confidence Category | Post-Repository Score | Final Score | Change | New / Final Supporting Evidence | Residual Uncertainty |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 90% | 96% | +6 | AC-001..AC-012 each proven directly at their real boundary (matrix above). AC-013: server and web docs describe CANCELLED, its display and agent-only status (`docs/modules/projects.md` L25-31, L477-506; `autobyteus-web/docs/projects.md` L11-14, L115-122, L200-204) | Desktop user verification of AC-001/AC-008 is delivery-owned |
| Changed-boundary execution directness | 92% | 96% | +4 | Real MCP/GraphQL/WS, real roots and worker processes (pgrep), real rendering through the live feed | — |
| Cross-boundary integration realism and mock gap | 90% | 95% | +5 | Only the external AGY CLI/model is scripted; server, stores, feed, Nuxt store and components are real | A real model choosing CANCELLED from the description is not proven (model behavior, not the changed boundary) |
| Environment, configuration, identity, and fixture fidelity | 95% | 95% | 0 | Rebuilt current dist; owned temp data roots; Nuxt dev | Nuxt dev, not the packaged renderer (no shell change) |
| Failure, edge-case, lifecycle, and recovery evidence | 95% | 96% | +1 | Retry, DONE↔CANCELLED, input error before closure, assignment and reactivation refusals, physical stop, reopen and reactivation, Temp scope, search over hidden Cancelled, toggle reset on revisit, keyboard toggle, mutation sensitivity | A CANCELLED-vs-reactivation race is not separately raced; it shares the predicate and serialization with the raced DONE case (QR-001 test) |
| User-surface, browser, and desktop-shell confidence | 80% | 95% | +15 | PMU-017: toggle button before Refresh, absent at 0, `aria-pressed` and title, Enter/Space, full-width Cancelled lane after Done at 1440 px, text heading, muted pill vs Done (computed colors), card counts, live reopen with `moved`, Temp board/header/page, right-panel board and detail; no browser errors; screenshots consistent | zh-CN and narrow width only at component/catalog level; the lane is a `grid-column: 1 / -1` row (trivially a row in single-column layouts); packaged desktop is delivery user verification |
| Durable regression coverage quality and relevance | 90% | 96% | +6 | 3 new durable cases at the real boundaries, plus 1 browser case; documented in TESTING.md; existing suites unchanged and green | — |

- Overall post-repository confidence: 90% (simple average 90.3%; user surface 80% below gate → broader validation Required)
- Overall final confidence: 95.6% → **95%**
- Calculation method: simple average of the seven categories
- Confidence change produced by broader validation: +5 (user surface 80% → 95%)
- Every critical acceptance criterion directly proven: `Yes`
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `Yes`
- Confidence-limiting residual risks: packaged desktop app and real-model behavior (delivery user verification), external Project Task Manager skill not aware of CANCELLED (approved out of scope, R-002)

## Broader Validation Decision And Execution

- Decision and mode: `Required` → `Browser` (repository-resident `project-manager-ux` probe; TESTING.md "Renderer UI … Web unit tests + a browser dev-path probe")
- Material deviation: none
- Gap addressed: live agent-driven rendering of the hidden Cancelled lane, toggle, pills and counts across the Project board, Task page, Temp board and right panel, which the implementer checked only with statuses written to disk
- Startup: probe-owned `dist/app.js` backend (free port, private SQLite/data/HOME), Nuxt dev (free port), warm-up, headless Chrome; the scripted AGY Manager drives tools over its real input channel
- Environment choices: 1440×1000 viewport, `en-US`
- Seed data: definitions, roots, Projects, Tasks and delegations created through public GraphQL and the Manager's tool calls only

| Scenario / Journey Step | Expected Observable Result | Actual Observable Result | Evidence | Result |
| --- | --- | --- | --- | --- |
| Card before close | 2 open (TODO+TODO, DONE excluded) | "2 open tasks · No workspaces" | evidence `cardBefore` | Pass |
| Agent CANCELLED on open board | row leaves lanes live; "Cancelled (1)" toggle appears right before Refresh, unpressed; no Cancelled lane | as expected; root `closed=true` on server | `toggleHidden`, `pmu-017-board-closed-hidden.png` | Pass |
| Search for a Cancelled Task | no-match while hidden; toggle stays; toggle reveals the row | as expected | assertions | Pass |
| Toggle on | `aria-pressed=true`, title "Hide closed tasks"; lanes TODO, IN_PROGRESS, DONE, CANCELLED; Cancelled full width (1053 = grid) under the row of three | as expected; row Offline, not openable | `lanes`, `pmu-017-board-closed-lane-shown.png` | Pass |
| Keyboard | Enter hides, Space shows | as expected | assertions | Pass |
| Task page | "Cancelled" pill, muted (`rgb(255,255,255)`/`rgb(100,116,139)`) vs Done (`rgb(236,253,245)`/`rgb(6,95,70)`); no status control | as expected | `pills`, `pmu-017-task-page-closed.png` | Pass |
| Revisit board | Cancelled hidden again | as expected | assertion | Pass |
| Card after close | 1 open | "1 open task · No workspaces" | `cardClosed` | Pass |
| Agent reopen (TODO) | row back in To Do with `data-live=moved`; toggle gone; root Offline | as expected | `reopened`, `pmu-017-board-reopened.png` | Pass |
| Temp task CANCELLED | header count drops live (1 → hidden); board hides it; toggle before Refresh; Cancelled lane last, full width; page pill "Cancelled" | as expected | `tempCounts`, `tempToggle`, `tempLanes`, `tempPill`, screenshots | Pass |
| Right-panel tab | agent CANCELLED hides the row live; toggle; Cancelled lane; detail pill "Cancelled" | as expected | `panelToggle`, `panelPill`, `pmu-017-panel-*.png` | Pass |
| Regression PMU-001/002/003/005/009/015 | unchanged DONE/Temp/panel journeys | all Pass | `pmu-regression-run-1/evidence.json` | Pass |

## Desktop Application Validation

- Approach: web-equivalent renderer via the browser probe. No Electron, preload or IPC code changed.
- Effect on any running desktop application: `None`. An unrelated isolated instance from another worktree was running and was not touched.
- Behavior not directly proven: the packaged desktop renderer. Its confidence consequence is negligible because no shell code changed, and it remains delivery's explicit user verification (design "Desktop verification").

## Platform / Runtime Targets

- macOS (Darwin 25.5.0), Node (workspace), Vitest, Nuxt dev, Chrome via playwright-core (version in `evidence.json` `browserVersion`), viewport 1440×1000, locale en-US.

## Lifecycle / Upgrade / Restart / Persisted-Data Checks

- Approved decision: `Directly Usable — No Migration`
- Representative existing data: current-format Tasks (E-007), released `projects.json` fixtures (startup migration E2E, API-009), and store/migration unit fixtures.
- Result: all green on the current reader. The released migration uses the frozen 3-status reader (unit + startup E2E pass). A CANCELLED write keeps the exact `task.json` key set and reads back after reader reconstruction (CLS-API-001).
- Version-specific runtime branch or compatibility fallback observed: `No`
- Residual risk: none material. A restart with stored CANCELLED Tasks is covered at reader level (reader reconstruction) rather than by a whole-process restart.

## Durable Coverage Changed In The Codebase

- Durable coverage added or updated this round: `Yes`

| Path / Test | Change | Requirement / Boundary | Execution Result |
| --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/projects/project-task-boundaries.e2e.test.ts` › CLS-API-001 | Added | AC-002/004/006/007/010/012 at MCP/native/GraphQL | Pass (alone and in both full runs) |
| `autobyteus-server-ts/tests/e2e/projects/task-reactivation-root-visibility.e2e.test.ts` › `closedScenario`, CLS-E2E-001, CLS-E2E-002 (+ `ProjectChangeMessageSchema` import, header note) | Added | AC-001/003/004/005/011 live | Pass (alone and in the gated full run) |
| `autobyteus-web/tests/e2e/project-manager-ux-probe.mjs` › PMU-017 (`closedTasksJourney`, helpers, case list) | Added | AC-001..AC-003, AC-008..AC-011, QR-001 rendered | Pass (run 3 and regression run) |
| `TESTING.md` | Updated | documents CLS-API-001, CLS-E2E-001/002, PMU-017; corrects the stale statement that the released migration imports the current `readTaskFile` | doc |

- Added or updated paths attached for proportional test-code review: `Not Applicable` (direct low-risk route)
- Removed paths: None

## Other Execution Artifacts

- `api-e2e-evidence/server-build.log`
- `api-e2e-evidence/cls-e2e/` (run log, JSON receipt with cleanup `dataRemoved: true, remainingRoots: 0, errors: []`)
- `api-e2e-evidence/server-regression/` (summary + 4 logs)
- `api-e2e-evidence/web/` (specs, guards, full suite)
- `api-e2e-evidence/pmu-017-run-1/`, `pmu-017-run-2/` (probe selector defect, kept as history), `pmu-017-run-3/`, `pmu-regression-run-1/` (evidence.json, screenshots, backend/frontend logs, feed messages). Every run's `cleanup`: browser closed, frontend and backend terminated, data root removed.

## Temporary Validation Methods Or Setup

- CLS-MUT-001: a one-line edit to `src/projects/domain/task-status.ts` (`isTerminalTaskStatus` DONE-only), restored from a backup copy. `git diff` showed the file unchanged afterwards.

## Cleanup Performed

- All suites and probes removed their own data roots and stopped their own processes (receipts above). No isolated app instance was started. The installed app and user data were never used.

## Classification

- Result: `Pass`
- Failure classification: N/A

## Recommended Recipient

- Delivery Engineer (per handoff rules), direct low-risk route; test-code review `Not Required — direct low-risk route`.

## Evidence / Notes

- Non-blocking observations for delivery (cosmetic, no behavior impact):
  - `autobyteus-web/components/projects/ProjectCard.vue` L34 comment still says "Open Tasks are those not Done". The behavior (server `openTaskCount`) is correct and proven.
  - `delegate_task {task_id}` on a terminal Task returns `{error: {code: "TASK_AGENT_RESOURCE_CLOSED", message}}` rather than the description's `target_agent_run_id: null` shape. This is the pre-existing DONE behavior, unchanged by this ticket, and CLS-E2E asserts the current shape.
  - R-002 (external Project Task Manager skill not aware of CANCELLED) remains the approved follow-up.

## Round 2 Delta (API-REV-002)

- Trigger: IR-002 (SR-005: the Cancelled lane is the last board column, not a full-width row) and IR-003 (SR-006: rename CLOSED → CANCELLED, no alias; `CLOSED` and `CANCELED` are invalid). Implementation commit `7f7b2c8fb`, on top of delivery's merge of `origin/personal` (`b5e0da508`).
- Coverage decisions:
  - CLS-API-001 and CLS-E2E-001/002: renamed mechanically by implementation (committed in `7f7b2c8fb`). The invalid-status examples are now `CANCELED`/`CLOSED`. Still Valid; reviewed, not edited.
  - PMU-017: Needs Update for SR-005, and I updated it (uncommitted; the implementation's rename sits on top). It now asserts:
    - toggle on at 1440 px: four equal columns in one row, Cancelled last;
    - toggle off: three equal columns spanning the board;
    - 390 px: stacked, Cancelled last, no horizontal overflow;
    - right panel: stacked, Cancelled last;
    - Temp board: three equal columns, Cancelled last.
  - The full-width assertions are replaced.
  - `TESTING.md`: the PMU-017 line describes the last-column layout (uncommitted).
- Compatibility check: no alias or fallback for `CLOSED`; it is rejected as invalid (CLS-API-001). No stored CLOSED data exists in any release, so no migration is needed. Persisted decision unchanged (`Directly Usable — No Migration`).

| Order | Command | Configuration | Boundary Or Scenario Proven | Result | Evidence |
| --- | --- | --- | --- | --- | --- |
| R2-1 | `pnpm -C autobyteus-server-ts prebuild && pnpm -C autobyteus-server-ts build` | current branch | dist for E2E/probe | Pass | `api-e2e-evidence/round-2/server/build.log` |
| R2-2 | server unit (TESTING.md list + `tests/unit/api` + `tests/unit/agent-execution/prompt`) | — | renamed vocabulary, LLM-contract hashes, frozen migration reader | Pass 71/680 | `round-2/server/unit.log` |
| R2-3 | server integration (2 files) | — | helper/termination | Pass 2/17 | `round-2/server/integration.log` |
| R2-4 | `tests/e2e/projects` ungated | — | CLS-API-001 (CANCELLED), startup migration, boundaries | Pass 4 files/27 | `round-2/server/e2e-projects-ungated.log` |
| R2-5 | `tests/e2e/projects` gated (scripted AGY) | parallel files | CLS-E2E-001/002 (CANCELLED) + DONE suites | CLS-E2E-001/002 and all DONE/closure/reactivation/feed cases pass. 2 non-ticket failures (below) | `round-2/server/e2e-projects-gated.log`, `round-2/server/cls-e2e/` |
| R2-6 | failing gated files alone | — | classify | `ad-hoc-task-delegation` Pass 3/3. `task-copy-idle-lifetime` failed twice, on different timing bounds | `round-2/server/rerun-*.log` |
| R2-7 | web Projects specs + localization guards | — | renamed toggle/lanes/labels, catalog parity | Pass 103/990 | `round-2/web/projects-specs.log`, `localization-guards.log` |
| R2-8 | full `pnpm -C autobyteus-web test:nuxt --run` | — | whole web | Pass 588 files / 3996 tests, 0 failed | `round-2/web/full-test-nuxt.log` |
| R2-9 | `pnpm -C autobyteus-web test:e2e:project-manager-ux --cases PMU-001,PMU-002,PMU-005,PMU-009,PMU-015,PMU-017 --output-dir …/round-2/pmu-run-1` | owned stack | SR-005 layout + SR-006 labels rendered live; regression | Pass 6/6; cleanup complete | `round-2/pmu-run-1/evidence.json`, screenshots |

Measured layout (PMU-017, `round-2/pmu-run-1/evidence.json`):

| State | Observed |
| --- | --- |
| Board, toggle on, 1440 px | TODO / IN_PROGRESS / DONE / CANCELLED, all top 258, each 251.25 px wide in a 1053 px grid; Cancelled at left 1156.75 (last) |
| Board, toggle off, 1440 px | three columns of 340.33 px, top 258, spanning 1053 px |
| Board, toggle on, 390 px | stacked at left 66, each 308 px (= grid), Cancelled last (top 790); `scrollWidth 340 = clientWidth 340` |
| Right-panel board, toggle on | stacked at left 1002, each 426 px (= grid), Cancelled last |
| Temp board, toggle on, 1440 px | open / done / cancelled, 340.33 px each, top 204, Cancelled last |
| Labels | toggle "Cancelled (1)", titles "Show/Hide cancelled tasks", heading "Cancelled 1", pill "Cancelled" (`rgb(255,255,255)` / `rgb(100,116,139)`) vs Done (`rgb(236,253,245)` / `rgb(6,95,70)`) |

Non-ticket failures (classified, not blocking this ticket):
- `ad-hoc-task-delegation.e2e.test.ts` › Org root, in the parallel gated run only. `readdir` caught an in-flight atomic-write temp file (`agent_run_resources.json.<pid>.<ts>.tmp`) beside the expected files. It passed 3/3 when run alone. The cause is a test-side race on a directory listing while a write finishes, not ticket behavior.
- `task-copy-idle-lifetime.e2e.test.ts`. This suite came with the `origin/personal` merge (idle-shutdown-background-tasks ticket), and this branch changes no idle-shutdown code. It failed in the parallel run (model-list "not available", timing) and twice alone, each time on a different timing bound:
  - shutdown-after-step 58,683 ms against a 59,000 ms minimum. The window is anchored at the test's observation of the step's completion event, so event latency can shorten the measured gap.
  - stop times 30,586 and 17,686 ms against a 15,000 ms maximum.
  - Host load average was 11–35 during these runs. Delivery saw the same suite fail in parallel and pass isolated (DR-001, `delivery-evidence/e2e-idle-lifetime-isolated.log`).
  - Classification: contention-sensitive timing bounds in another ticket's suite. Recommended owner: the idle-shutdown-background-tasks test owner, to re-anchor or widen the bounds. TESTING.md rule 9 applies to that owner; it is not this ticket's regression.
- The interrupted IR-002 probe directory (`round-2/pmu-run-0-interrupted-ir002/`) lost its `evidence.json`. A later refused run overwrote it, because the probe's `finally` saves even when it refuses an existing output dir. This is a minor pre-existing probe quirk, and the run it held was superseded by R2-9.

Round 2 confidence (changes from round 1 only):
- User-surface: 95%. The SR-005 layout was measured directly at 1440 px, 390 px, in the right panel and on the Temp board; SR-006 labels were rendered.
- Durable regression: 96%. PMU-017 now guards the column layout.
- Every other category is unchanged, because the CANCELLED server cases passed at the real boundaries.
- Overall: 95%. Every critical AC is proven directly; no category is below 90%.

## Latest Authoritative Result

- Result: `Pass` (round 2, API-REV-002)
- Final validation confidence: 95%
- Broader validation decision: `Required` → executed (Browser, PMU-017 + regression), Pass
- Residual risks: the packaged desktop app and real-model behavior are delivery's user verification. The external Project Task Manager skill doesn't know CANCELLED (R-002). The non-ticket `task-copy-idle-lifetime` timing flakiness under load is routed to its owner. The `ProjectCard.vue` L34 comment is cosmetic.
- Notes: CLS-MUT-001 (round 1) confirmed that the durable cases detect a non-terminal status. The round-2 rename is mechanical, and the renamed cases assert `CANCELLED` and reject `CLOSED`/`CANCELED`.
