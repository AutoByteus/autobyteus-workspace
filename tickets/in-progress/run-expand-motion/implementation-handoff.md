# Implementation Handoff: run-expand-motion (autobyteus-390)

Branch `codex/run-expand-motion`, worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/run-expand-motion`, base `origin/personal` `4500e7278d`.

| Commit | What |
| --- | --- |
| `9db8b728b9` | The SR-001 package as received |
| `c5cc87d89d` | The fix (`RunListRow.vue`), the component spec, the fixture probe and its package script |
| `7cc31409af` | A type cast in the new spec (typecheck) |
| the evidence commit after `7cc31409af` (see `git log`) | This handoff, IR-001 and `evidence/implementation/` |

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: Small / Low. The direct implementation route was used, without independent architecture review.
- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/run-expand-motion/tickets/in-progress/run-expand-motion/requirements-doc.md`
- Investigation notes: `.../run-expand-motion/investigation-notes.md` (E-01…E-07)
- Solution revision record: `.../run-expand-motion/solution-revision-record.md` (SR-001)
- Design spec: `.../run-expand-motion/design-spec.md`
- Supplemental task artifacts: `.../run-expand-motion/evidence/` (the Solution Designer's reproduction `repro-v-show.json` and control `control-v-if.json`)
- Design review report: `N/A — not applicable`
- Architecture review revision record: `N/A — not applicable`
- Triggering rework report: N/A

## Current Implementation Summary

- Implementation cycle: `Initial`
- Implementation revision record: `.../run-expand-motion/implementation-revision-record.md`
- Current implementation revision ID: `IR-001`
- Related solution revision IDs: `SR-001`
- Related architecture-review, code-review, API/E2E and delivery revision IDs: `N/A`
- Triggering finding IDs: `N/A`

In the Runs view, an Agent run's delegated rows (`AgentRunTaskRows`) are now mounted only while the run is expanded:

```vue
v-if="entry.kind === 'agent' && state.isRunExpanded(entry.runId)"
```

They used to stay mounted and hidden with `v-show`. Expand now shows the rows in place at once, and collapse removes them at once. The Team and Org branches keep their conditions.

## Routing Classification (Mandatory)

- Task size: `Small`
- Architecture risk: `Low`
- Design classification section: design-spec.md "Task Size And Architectural Risk"
- Classification confirmed or changed: `Confirmed`
- Evidence: one template condition in one component, plus a new spec, a fixture probe and its script. There is no data, contract, store or shared-component change. The R-01 escalation trigger did not fire (IMP-01: the same rows after fold and unfold, with one read).
- Selected route: `Direct API/E2E`
- Lightweight implementation self-review completed for the direct route: `Yes` (below)
- New design impact or escalation trigger: `None`

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| REQ-001, AC-001 | Expand shows the delegated rows in their final place at once | `autobyteus-web/components/runList/RunListRow.vue`: `AgentRunTaskRows` is mounted with `v-if="entry.kind === 'agent' && state.isRunExpanded(entry.runId)"`; the `v-show` is removed. A freshly mounted `tree-row` TransitionGroup has no old positions and no `appear`, so it does not move anything | Done. IMP-03: every row at its final top with `transform: none` in the first 4 frames. IMP-04 (base): every row at `top: 0` with `matrix(1, 0, 0, 1, -28, -244…)` |
| REQ-002, AC-002 | Collapse hides them at once | Same line: collapse unmounts the tree | Done. IMP-03 REM-02: 0 rows from the first frame and the tree is not in the DOM. IMP-01: the spec asserts the tree is absent, not only hidden |
| REQ-003, AC-003 | Disclosure, rows and a stopped run's stored rows are the same after fold and unfold; Team/Org branches unchanged; DONE-row leave while expanded unchanged | No other change. `AgentRunTaskRows.vue` and `treeRowLeave.css` are untouched. The `v-else-if` chain to Team and Org is unchanged | Done. IMP-01: the same rows after unfold, one `readAgentRunCollaboration` call (R-01), `aria-expanded` and the chevron follow, and a folded Agent row renders no Team or Org tree. IMP-02: the existing suites pass, including `AgentRunTaskRowsLeave` |
| AC-004 | Tests; suites pass | `RunListRow.agent.spec.ts`; `test:e2e:run-expand-motion` | Done here up to finalization (delivery's) |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`

## Key Files Or Areas

- `autobyteus-web/components/runList/RunListRow.vue` (the fix; a comment says why `v-if`)
- `autobyteus-web/components/runList/__tests__/RunListRow.agent.spec.ts` (new)
- `autobyteus-web/tests/e2e/run-expand-motion-probe.mjs` and `tests/e2e/fixtures/run-expand-motion.page.vue` (new)
- `autobyteus-web/package.json` (`test:e2e:run-expand-motion`)

## Important Assumptions

- The stored delegated view stays in `agentRunCollaborationStore` across fold and unfold (R-01).
- The store drops a context only in `release`, which runs only when the window's node binding changes (`bindingRevision`, on a node switch). The rows are then of other runs.
- Runs start expanded each session (`useRunListDisclosure`), so the view loads at first mount.

## Known Risks

- None new. Unmounting on collapse drops a DONE row's leave motion while collapsed. It was invisible anyway, because the rows were hidden (design-spec Risks).

## Task Design Health Assessment Implementation Check

- Reviewed change posture: a bug fix; the cause is a design problem in code from 385.
- Reviewed root-cause classification: `v-show` on a component with a TransitionGroup (E-01…E-06).
- Reviewed refactor decision: `No Refactor Needed`
- Implementation matched the reviewed assessment: `Yes`
- If challenged, routed as `Design Impact`: `N/A`
- Evidence / notes: IMP-03 and IMP-04 reproduce E-05 and E-06 on the product component.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`
- Dead code in the touched files and modules removed (Core Principle 7): `Yes` (none left; the TransitionGroup still serves DONE-row leaves)
- Dead code found elsewhere, added to `follow-ups.md`: None
- Shared structures remain tight: `Yes`
- Canonical shared design guidance was reapplied during implementation: `Yes`
- Changed source implementation files stayed within proactive size-pressure guardrails: `Yes` (`RunListRow.vue` +4/−3)
- Notes: —

## Persisted Data Transition Check (When Applicable)

- Approved decision: `Not Affected` (requirements "Data Continuity": No)
- Implementation follows it: `Yes`
- Deviation: `None`

## Environment Or Dependency Notes

- The fresh worktree had not run TESTING.md's setup step `pnpm -C autobyteus-server-ts prebuild`, so the first suite run could not load 7 files. They depend on the built `@autobyteus/application-sdk-contracts` and `autobyteus-ts`. After the prebuild, those 7 files pass (IMP-02). This is an environment effect, not a product one.
- `nuxt prepare` was also run.
- Untracked `autobyteus-application-*/dist/` folders are build outputs.

## Checks Run

Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/run-expand-motion/tickets/in-progress/run-expand-motion/evidence/implementation/`. Each `.log` starts with a header. All checks ran on macOS 26.5.2 with Node v22.23.1, pnpm 10.28 and headless Chrome, under TESTING.md isolation (`env -i PATH HOME=<fresh mktemp dir> TMPDIR`).

| Check ID | Command Or Steps | Commit Tested | Code It Exercises | Behavior / Criteria IDs | Result | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-01 | `cd autobyteus-web && NUXT_TEST=true pnpm exec vitest run components/runList/__tests__/RunListRow.agent.spec.ts`, red with the base `RunListRow.vue`, then green | red: `c5cc87d89d` with `RunListRow.vue` from `4500e7278d`; green: `7cc31409af` | `RunListRow` + real `useRunListDisclosure`, `agentRunCollaborationStore`, `AgentRunTaskRows` (hydration mocked) | REQ-002, REQ-003, AC-002, AC-003, R-01 | Pass (red 3 failed / 1 passed, then green 4/4) | `IMP-01-row-spec-red-green.log` | Red: `Tests  3 failed \| 1 passed (4)`; Green: `Tests  4 passed (4)` |
| IMP-02 | `cd autobyteus-web && NUXT_TEST=true pnpm exec vitest run`; then the 7 files that failed to load, rerun after `pnpm -C autobyteus-server-ts prebuild` | `c5cc87d89d` (`7cc31409af` changes only a type cast in the new spec, rerun in IMP-01) | Whole web unit suite | REQ-003, AC-003 | Pass after setup | `IMP-02-web-suite.log`, `IMP-02-web-suite.full.log.gz` | First run `Tests  3 failed \| 5141 passed`, with all 7 failures being `Failed to resolve entry for package "@autobyteus/application-sdk-contracts"` or `Failed to resolve import "autobyteus-ts/…"`; rerun `Test Files  7 passed (7)`, `Tests  19 passed (19)` |
| IMP-03 | `cd autobyteus-web && pnpm -s test:e2e:run-expand-motion --output-dir <evidence>/IMP-03-probe-fix` | `c5cc87d89d` | Product `RunListRow` → `AgentRunTaskRows` in headless Chrome; Nuxt dev from this worktree, fixture route, no backend | REQ-001, REQ-002, AC-001, AC-002 | Pass (REM-01…04) | `IMP-03-probe-fix.log`, `IMP-03-probe-fix/evidence.json`, `REM-01/02/03*.png`, `nuxt.log` | `REM-03 Pass Expand: from the first frame, every row is at its final place with no transform`; in `evidence.json`, `REM-03.details.frames[0]` has 12 entries with `"transform": "none"` and tops `244, 274, …`; `cleanup` shows `nuxt: SIGTERM`, `installedPageRemoved: true` |
| IMP-04 | The same probe with `RunListRow.vue` from the base (`v-show`) | `c5cc87d89d` with `RunListRow.vue` from `4500e7278d` | As IMP-03 | AC-001 ("a regression check fails on today's code") | Fail, as expected | `IMP-04-probe-base.log`, `IMP-04-probe-base/evidence.json` | `REM-03 Fail … 48 row samples moved from elsewhere on screen`; `firstOffending[0]` = `{"frame":0,"index":0,"top":0,"transform":"matrix(1, 0, 0, 1, -28, -244)","final":244}`; `REM-02 Fail … still in the DOM after collapse` |
| IMP-05 | `cd autobyteus-web && pnpm typecheck; pnpm -s guard:web-boundary; pnpm -s guard:localization-boundary; pnpm -s audit:localization-literals` | `7cc31409af` (typecheck); `c5cc87d89d` (guards) | Web types, boundaries, localization | all | Pass | `IMP-05-web-typecheck-guards.log` | `production errors: 0; test-file errors: 99 in 43 files (baseline 99 in 43 files)`, `[typecheck] PASS`, three `Passed` lines |

- Not run, and why: nothing beyond the design's list. The probe runs against a fixture route, not the full app. A live-app check of the Runs view with a real Project Task Manager run is API/E2E's to choose.

## Frontend Rendered-Result Check (When Applicable)

- **Affected surface:** the Runs view's Agent run row, expanding and collapsing its delegated work.
- **References:** requirements REQ-001…REQ-003; investigation E-05 and E-06; the design spec. No motion was designed (E-07).
- **Design system reviewed:** `AgentRunTaskRows`, `treeRowLeave.css`, and the Team and Org trees' `v-if` pattern.
- **Surface used:** the TESTING.md browser-probe pattern. Nuxt dev from this worktree, a fixture route rendering the product `RunListRow` (four runs above, one Agent run with 12 delegated Team rows), headless Chrome at 1280×1000.
- **States inspected:**
  - expanded at rest;
  - collapse (the rows gone in the first frame, the tree removed from the DOM);
  - expand (all 12 rows at their final place with no transform in each of the first 4 frames, the same tops as before collapse);
  - the chevron's rotation and the connectors, in the screenshots.
- **Issues found and corrected:** none in the product after the fix. The probe's fixture first lacked an answer for the rows' `taskWorkerTasks` query (an Apollo missing-field console error). The fixture now supplies it.
- **Remaining limitations:** the check uses a fixture page, not the full app with a live run. The delegated Team rows' own expand inside the list (a short designed move of the rows below) was not changed and not probed.

## Lightweight Implementation Self-Review (direct route)

- **Correctness:** with `v-if` the Agent branch is `entry.kind === 'agent' && expanded`, so a folded Agent row falls through to `v-else-if="entry.kind === 'team' && expanded"` and the Org branch. Both test `entry.kind`, so neither renders for an Agent row (IMP-01, last case).
- **Load (R-01):** `AgentRunTaskRows` loads a stored view on mount only when the store lacks it. Unfold therefore doesn't read again (IMP-01: one `readAgentRunCollaboration` call).
- **Disclosure:** it depends on `collaboration.taskRows(runId)`, which reads the store, not the mounted tree, so it stays while folded (IMP-01).
- **Selection:** `selected` still reads `collaboration.selectedChild`, unaffected by mounting.
- **Scope:** no other file in the product changed. The fixture and probe are test assets.

## Downstream Coverage Hints / Suggested Scenarios

- In the app, use a Project Task Manager run with many delegated Teams: collapse, then expand. The rows appear in place, and nothing slides from the top.
- Fold a stopped run with stored delegated work, switch views (Runs → Workspaces → Runs), then unfold. The rows show, with no extra read once loaded.
- While expanded, close a delegated Task (DONE): its rows leave with the designed 200 ms motion, unchanged.

## API / E2E / Executable Coverage Investigation And Execution Still Required

- The new probe `pnpm -C autobyteus-web test:e2e:run-expand-motion` exists and passes on the fix (IMP-03). API/E2E may reuse it or add a live-app check of the Runs view.
