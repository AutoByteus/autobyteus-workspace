# Implementation Handoff: run-expand-motion (autobyteus-390)

Branch `codex/run-expand-motion`, worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/run-expand-motion`, base `origin/personal` `4500e7278d`.

| Commit | What |
| --- | --- |
| `9db8b728b9` | The SR-001 package as received |
| `c5cc87d89d`, `7cc31409af` | IR-001 (SR-001): `v-if` on the delegated rows; superseded |
| `85bf73750b` | IR-001 handoff and evidence (IMP-01…05) |
| `50cf2d850b`, `4347d58b03` | SR-002, and SR-002 narrowed, as received |
| `b7fc37aa75` | First SR-002 pass: the shared move rule removed everywhere. Narrowed by the next commit |
| `3e6b5a3dd4` | **IR-002 (SR-002 narrowed): the current code** |
| the evidence commit after `3e6b5a3dd4` (see `git log`) | This handoff, IR-002 and evidence IMP-06…11 |

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: Small / Low, on the direct route. Code review was invoked by API/E2E as a failure-origin review (CRR-001: CR-001, Design Impact), which led to SR-002.
- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/run-expand-motion/tickets/in-progress/run-expand-motion/requirements-doc.md` (SR-002: REQ-001…REQ-004, AC-001…AC-006)
- Investigation notes: `.../run-expand-motion/investigation-notes.md` (E-01…E-11)
- Solution revision record: `.../run-expand-motion/solution-revision-record.md` (SR-002, narrowed)
- Design spec: `.../run-expand-motion/design-spec.md`
- Solution handoff: `.../run-expand-motion/solution-handoff.md`, sections "SR-002 Narrowed" and "Decision On The User's 'Small Moving' Feedback"
- Triggering rework reports:
  - `.../run-expand-motion/code-review-report.md` (CRR-001, with the correction `47ddf05fb5`);
  - `.../run-expand-motion/api-e2e-execution-coverage-report.md` (API-REV-001).

## Current Implementation Summary

- Implementation cycle: `Rework`
- Implementation revision record: `.../run-expand-motion/implementation-revision-record.md`
- Current implementation revision ID: `IR-002`
- Related solution revision IDs: `SR-002` (narrowed)
- Related code-review revision IDs: `CRR-001`
- Related API/E2E revision IDs: `API-REV-001`
- Related delivery revision IDs: `N/A`
- Triggering finding IDs: `CR-001`. OBS-2 was withdrawn.

**What changed:**
1. **No sliding in the Runs view.** `RunListPanel.vue` turns the `tree-row` move transition off for every tree inside its scroll container: `.run-list-scroll :deep(.tree-row-move) { transition: none; }`.
   - Vue moves a group only when its move class has a transform transition, which it checks on a clone inside the group.
   - In the Runs view, a row pushed by rows that were added, grew (a late Task line) or expanded now shows at its new place at once.
   - An Agent run's rows never drop from the top of the window.
   - A finished Task's row still fades and closes, by the shared leave rules, and the row below glides up by layout.
2. **The fold is back to the base's `v-show`.** `RunListRow.vue` restores it on `AgentRunTaskRows`, reverting SR-001's `v-if`. Folded rows stay mounted with their Task answers and show complete on unfold.
3. **The Workspaces and Projects views are unchanged** (AC-006). `treeRowLeave.css`, `useLeavingTreeRows.spec.ts` and `task-closure-tree-probe.mjs` are byte-identical to the base (`git diff 4500e7278d` is empty for them).

## Routing Classification (Mandatory)

- Task size: `Small`
- Architecture risk: `Low`
- Design classification section: design-spec.md "Task Size And Architectural Risk" and "SR-002 Revision Summary"
- Classification confirmed or changed: `Confirmed`
- Evidence:
  - the product change is one scoped CSS rule (+10 lines with its comment) and one template line restored (+1/−1 against the base);
  - there is no data, contract, store or shared-file change;
  - the escalation trigger, that a finished Task's row no longer fades and closes smoothly, did not fire: REM-06 shows opacity 1 → 0 and the row below gliding 712 → 664 px.
- Selected route: `Direct API/E2E`
- Lightweight implementation self-review completed for the direct route: `Yes` (below)
- New design impact or escalation trigger: `None`

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| REQ-001, AC-001 | Expand shows the delegated rows complete, at their final place, from the first frame | `RunListPanel.vue` scoped rule: no move, so no drop. `RunListRow.vue` `v-show`: rows and their Task lines stay mounted | Done. IMP-08 REM-04: 12 rows with `transform: none`, final tops and their Task line in each of the first 4 frames. Base (IMP-09) and SR-001 (IMP-10) fail |
| REQ-002, AC-002 | Collapse hides them at once | `v-show` | Done. IMP-08 REM-03: no row has a layout box from the first frame. IMP-06 and IMP-07: the spec asserts hidden and kept |
| REQ-004, AC-005 | In the Runs view no row slides: late Task line, Team expand. A finished Task's row fades, and the row below glides by layout | The scoped rule covers every tree inside the scroll container | Done. REM-02 (late lines: 11 rows moved at once) and REM-05 (Team expand: 9 rows pushed, 6 members) show no transform; REM-06 shows the fade and the glide. Base and SR-001 fail REM-02 (143 sliding samples) and REM-05 (117) |
| REQ-003, AC-003 | Disclosure, rows, a stopped run's stored rows, selection and the DONE leave unchanged | No other product change | Done. IMP-06 and IMP-07: same rows after unfold, one view read, Task lines kept, no second Task ask; full suite passes |
| AC-006 | The Workspaces and Projects views keep their motion; their tests and probes unchanged | `treeRowLeave.css` and its tests and probes untouched | Done. REM-07: the same delegated row has `transition: none` inside the Runs view and `transform 0.2s ease-out` outside it. `useLeavingTreeRows.spec` (unchanged) passes in IMP-07. The live Workspaces probes are byte-identical and were not rerun here (see Not run) |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`

## Key Files Or Areas

- Product:
  - `autobyteus-web/components/runList/RunListPanel.vue` (the scoped rule and the `run-list-scroll` class);
  - `components/runList/RunListRow.vue` (`v-show`).
- Tests:
  - `components/runList/__tests__/RunListRow.agent.spec.ts` (hidden and kept, Task lines kept);
  - `components/runList/__tests__/RunListPanel.spec.ts` (+1 test: the scoped rule, its container and the unchanged shared rule).
- Probe: `tests/e2e/run-expand-motion-probe.mjs` and `tests/e2e/fixtures/run-expand-motion.page.vue`. The fixture now renders the product `RunListPanel`, which is what makes the scoped rule part of the check.
- API/E2E's `tests/e2e/run-expand-motion-live-cases.mjs` (commit `b7fc37aa75`): RXM-001 and RXM-003 changed from "removed from the DOM" to "hidden" to match the restored `v-show`. They are flagged for API/E2E's review, because I changed their file.

## Important Assumptions

- The override relies on Vue's `TransitionGroup` check (`hasCSSTransform` on a move-class clone inside the group). REM-07 and REM-02…05 guard it in a real browser.
- Specificity: `.run-list-scroll[data-v-panel] .tree-row-move` (0,3,0) beats the shared scoped `.tree-row-move[data-v-tree]` (0,2,0).

## Known Risks

- The Runs view and the other views now differ. Pushed rows snap in the Runs view and slide in the Workspaces and Projects trees. The user finds both fine (design-spec Risks).

## Task Design Health Assessment Implementation Check

- Reviewed change posture: a bug fix in the Runs view.
- Reviewed root-cause classification: the shared move transition, plus SR-001's remount (E-08, E-09).
- Reviewed refactor decision: `No Refactor Needed`
- Implementation matched the reviewed assessment: `Yes`
- If challenged, routed as `Design Impact`: `N/A`. The user's "small moving" feedback was sent to the Solution Designer, who decided ("Decision On The User's 'Small Moving' Feedback").

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`
- Dead code in the touched files and modules removed: `Yes`. Nothing was left, and SR-001's comment was replaced.
- Dead code found elsewhere, added to `follow-ups.md`: None
- Shared structures remain tight: `Yes`
- Canonical shared design guidance reapplied: `Yes`
- Source files within size guardrails: `Yes` (`RunListPanel.vue` +10, `RunListRow.vue` ±1)

## Persisted Data Transition Check (When Applicable)

- Approved decision: `Not Affected`. Implementation follows it: `Yes`. Deviation: `None`.

## Environment Or Dependency Notes

- The worktree ran TESTING.md's `pnpm -C autobyteus-server-ts prebuild` and `nuxt prepare` in IR-001. All suites ran under `env -i PATH HOME=<fresh dir> TMPDIR`.
- Probes and suites ran one at a time. Each probe stopped its Nuxt and Chrome (`cleanup` in each `evidence.json`).

## Checks Run

The evidence folder is `/Users/normy/autobyteus_org/autobyteus-worktrees/run-expand-motion/tickets/in-progress/run-expand-motion/evidence/implementation/`, and each `.log` has a header. All checks ran on macOS 26.5.2 with Node v22.23.1, pnpm 10.28 and headless Chrome. IR-001's checks IMP-01…05 tested SR-001's code and are superseded by these.

| Check ID | Command Or Steps | Commit Tested | Code It Exercises | Behavior / Criteria IDs | Result | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-06 | `cd autobyteus-web && NUXT_TEST=true pnpm exec vitest run` on `RunListRow.agent.spec.ts` with SR-001's row, and on `RunListPanel.spec.ts` with the base panel | `3e6b5a3dd4` with the named file swapped | The two changed specs against the old code | AC-002, AC-003, AC-005 | Red, as expected | `IMP-06-specs-red.log` | `Tests  3 failed \| 1 passed (4)` and `Tests  1 failed \| 6 passed (7)` |
| IMP-07 | `cd autobyteus-web && NUXT_TEST=true pnpm exec vitest run` | `3e6b5a3dd4` | Whole web unit suite, including both specs green and the unchanged `useLeavingTreeRows.spec` | all; AC-003, AC-006 | Pass | `IMP-07-web-suite.log`, `IMP-07-web-suite.full.log.gz` | `Test Files  702 passed (702)`, `Tests  5161 passed \| 2 skipped (5163)` |
| IMP-08 | `cd autobyteus-web && pnpm -s test:e2e:run-expand-motion --output-dir <evidence>/IMP-08-probe-sr002` | `3e6b5a3dd4` | Product `RunListPanel` → `RunListRow` → `AgentRunTaskRows` in headless Chrome; fixture route, Task answers held then released | AC-001, AC-002, AC-005, AC-006 | Pass (REM-01…08) | `IMP-08-probe-sr002.log`, `IMP-08-probe-sr002/evidence.json`, screenshots | Every `REM-0x Pass`. REM-07 `{"insideRunsView":"none","outsideRunsView":"transform 0.2s ease-out"}`. REM-06 `nextTops` `[712,706,699,…,664]` |
| IMP-09 | The same probe with `RunListRow.vue` and `RunListPanel.vue` from the base | `3e6b5a3dd4` with both from `4500e7278d` | As IMP-08 | AC-001 ("fails on today's code") | Fail, as expected | `IMP-09-probe-base.log`, `IMP-09-probe-base/evidence.json` | `REM-04 Fail … 48 row samples moved`; first offending `top: 0`, `matrix(1, 0, 0, 1, -28, -244)`. REM-02 (143), REM-05 (117) and REM-07 fail |
| IMP-10 | The same probe with SR-001's `RunListRow.vue` (`v-if`) and the base panel | `3e6b5a3dd4` with the row from `c5cc87d89d` | As IMP-08 | AC-001, AC-005 (CR-001) | Fail, as expected | `IMP-10-probe-sr001.log`, `IMP-10-probe-sr001/evidence.json` | `REM-04 Fail … 44 row samples` (late Task lines push rows −18, −36 px); REM-02, REM-05 and REM-07 fail |
| IMP-11 | `cd autobyteus-web && pnpm typecheck; pnpm -s guard:web-boundary; pnpm -s guard:localization-boundary; pnpm -s audit:localization-literals` | `3e6b5a3dd4` | Web types, boundaries, localization | all | Pass | `IMP-11-web-typecheck-guards.log` | `production errors: 0; test-file errors: 99 in 43 files (baseline 99 in 43 files)`, `[typecheck] PASS`, three `Passed` lines |

- **Not run, and why:**
  - **The live probes `task-closure-tree` and the Workspaces and Projects probes (AC-006):** their files, and the shared CSS they exercise, are byte-identical to the base. The designer allowed relying on them unchanged. They need the full backend, so they are left to API/E2E.
  - **API/E2E's live cases (`test:e2e:run-expand-motion-live`, RXM-001…003):** I adjusted RXM-001 and RXM-003 to "hidden" but did not run them, since they need a live stack.

## Frontend Rendered-Result Check (When Applicable)

- **Surface:** the Runs view (`RunListPanel`) with an Agent run that delegated 12 Teams, below 4 other runs.
- **Inspected:**
  - the first load, with Task answers held and then released;
  - collapse and expand;
  - a delegated Team's expand;
  - a finished Task's row leaving;
  - the move rule inside and outside the Runs view;
  - frame-by-frame values and screenshots `REM-01…06*.png`.
- **Issues found and corrected:**
  - SR-002's first pass removed the motion everywhere. Narrowed as directed.
  - The fixture rendered `RunListRow` alone, which could not show a rule scoped to the panel. It now renders the real `RunListPanel`.
- **Limitations:** a fixture page with a held Task answer, not a live run. The live check is API/E2E's.

## Lightweight Implementation Self-Review (direct route)

- **Scope:** the rule is scoped to `RunListPanel` (`data-v` attribute) and to elements under `.run-list-scroll`. The Workspaces tree (`WorkspaceAgentRunsTreePanel`) and the Projects tree are other components, so it cannot reach them (REM-07).
- **Leave:** the leave rules are untouched, and REM-06 shows the fade and the glide.
- **Reduced motion:** the shared rule still disables the leave transition. Inside the Runs view the move was already off.
- **`v-show`:** the base's behavior; R-01 holds (one view read, no second Task ask).

## Downstream Coverage Hints / Suggested Scenarios

- Live app, Runs view, a Project Task Manager run with many delegated Teams and Tasks: collapse, then expand. Rows are complete and in place at once, with no drop.
- Open the Runs view while the Task answers are slow: Task lines appear and rows shift at once, with no slide.
- Expand a delegated Team in the Runs view: rows below shift at once.
- Close a Task (DONE) while expanded: its row fades and the row below glides up.
- Workspaces and Projects views: unchanged; their small moves remain (AC-006).
- RXM-001 and RXM-003 now expect "hidden" after collapse (my change to API/E2E's file).

## API / E2E / Executable Coverage Investigation And Execution Still Required

- Rerun the live cases RXM-001…003 against `3e6b5a3dd4`, and the AC-006 live probes as API/E2E decides.
