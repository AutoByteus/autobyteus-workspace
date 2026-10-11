# API/E2E Test-Case Ledger — delegated-copy-task-locator

## Ledger Meta

- Assigned task workspace / worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copy-task-locator`
- Coverage investigation: `api-e2e-coverage-investigation.md`
- Execution coverage report: `api-e2e-execution-coverage-report.md`
- API/E2E revision record: `api-e2e-revision-record.md`
- Ledger scope and reason it is required: many independent browser cases and probes; full PMU and closure runs are long
- Last updated: 2026-10-11

Evidence paths are relative to `tickets/in-progress/delegated-copy-task-locator/api-e2e-evidence/`.

## Planned Cases

| Case ID | Case / Journey | Requirement / Acceptance-Criteria IDs | Boundary / Execution Surface | Planned Command Or Entry Point | Planned Order | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| REPO | Server unit + typecheck; full web `test:nuxt`; guards | all (unit level) | Repository | see investigation order 2–4 | 1 | — |
| FX-1..FX-8 | Fixture-page probes (C-002) | QR-003, C-002 | Browser (fixture pages) | `pnpm -C autobyteus-web test:e2e:<name>` | 2 | 8 probes |
| PMU-020 | Rows, values, GraphQL answers, batched reads | AC-001..003, AC-016, REQ-008 | Browser + live API | `test:e2e:project-manager-ux --cases …` | 3 | new |
| PMU-021 | Locate docked + keyboard + row click + reload | AC-004..007, AC-009, AC-013, AC-014 | Browser | same | 3 | new |
| PMU-022 | Hidden panel, narrow drawer (reduced motion), start surface | AC-008 | Browser | same | 3 | new |
| PMU-023 | REQ-012 Agent host (wide, narrow), Team host | AC-020 | Browser | same | 3 | new |
| PMU-024 | Live: rename, reconnect, follow-up, closed-before-click, pill ring, Task / Project delete | AC-010, AC-012, AC-015, AC-018 | Browser + feed | same | 3 | new |
| PMU-025 | zh-CN strings | AC-017 | Browser | same | 3 | new |
| PMU-001..019 | Existing Projects regression incl. PMU-018/019 | AC-019, BEH-008 | Browser | full probe run | 4 | regression |
| TCT | Closed rows leave (task-closure-tree) | BEH-006 | Browser | `test:e2e:task-closure-tree` | 5 | regression |
| DESK | Isolated desktop instance smoke | packaged renderer | Desktop | `pnpm --silent isolated-app start --build` | 6 | — |

## Execution Events

| Sequence | Case ID | Timestamp | Event | Command / Entry Point / Material Configuration | Expected Observable Result | Observed Result Or Checkpoint | Result | Evidence / Artifact Path | Next Action / Unresolved Issue |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | REPO | 2026-10-11 09:10 | Completed | server `vitest run tests/unit/projects tests/unit/api/graphql`; `typecheck`; web `test:nuxt --run`; 3 guards | all green | server 38 files / 255 tests; typecheck clean; web 602 files / 4178 tests (2 files / 5 tests skipped, pre-existing); guards pass | Pass | `repo/summary.txt` | — |
| 2 | PMU-020..025 | 2026-10-11 09:15 | Completed | `node autobyteus-web/tests/e2e/project-manager-ux-probe.mjs --output-dir api-e2e-evidence/pmu-new-try1 --cases PMU-020,PMU-021,PMU-022,PMU-023,PMU-025,PMU-024` | all Pass | PMU-023, PMU-025 Pass. PMU-020: harness selector (task Team rows carry the copy address, not its team run ID). PMU-021: harness assumed the Projects tab was showing (the run opened on Team). PMU-022: reduced-motion colour read during the row's 150 ms `transition-colors` start. PMU-024: holding only the closure frame made a sequence gap, so the stream re-snapshotted and the row left (harness emulation). All test-side; no product defect | Fail (harness) | `pmu-new-try1/evidence.json` | Fix the harness, re-run |
| 3 | PMU-020,021,022,024,025 | 2026-10-11 09:20 | Completed | same probe, `--output-dir pmu-new-try2` | all Pass | 020, 022, 024, 025 Pass (024: closure stream held in order, row kept, Cancelled lane located). 021: the run with a collaborator switches the panel to Team once after it opens, overriding the harness's Projects-tab click (harness) | Fail (harness) | `pmu-new-try2/evidence.json` | Retry the tab choice |
| 4 | PMU-021 | 2026-10-11 09:22 | Completed | `--cases PMU-021`, `pmu-new-try3`, `pmu-new-try4` | Pass | try3: the same tab switch after reload (harness). try4: the harness asserted the Team row stays expanded, but a row click toggles it (existing BEH-002); the coordinator opened and nothing was located | Fail (harness) | `pmu-new-try3/`, `pmu-new-try4/` | Assert toggle instead |
| 5 | PMU-001..PMU-025 | 2026-10-11 09:25 | Completed | `pnpm -C autobyteus-web test:e2e:project-manager-ux --output-dir …/pmu-full` | all Pass, clean cleanup | 25 / 25 Pass, incl. PMU-018 / PMU-019; warm-up reloads 0; Chrome closed, Nuxt and backend terminated, data root removed | Pass | `pmu-full/evidence.json` | — |
| 6 | FX-1..FX-8 | 2026-10-11 09:50 | Completed | 8 fixture probes, serial, `fixture-probes/<name>` | all Pass | 2 Pass (composer-mention, standalone-error-stop); 6 Fail: `/ws/projects` refused and `taskWorkerTasks` errors from task-row fixture pages (this branch), plus other errors | Fail | `fixture-probes/summary.txt` | Base comparison |
| 7 | FX base + helper | 2026-10-11 10:00 | Completed | Same 6 probes on a base worktree at `359d2c0ef`; then on the branch with `fixtures/task-worker-boundaries.mjs` | Branch-caused failures gone | Base: hierarchy and group-icon Pass (so branch-caused), aggregate-status / background / peer-sidebar / team-activity Fail on base too. Branch with helper: group-icon Pass, no `/ws/projects` or `taskWorkerTasks` errors anywhere; hierarchy once failed on 2 refused app-shell reads (start-up timing), passed on two later runs | Pass (branch-caused) / Fail (base) | `fixture-probes-base/`, `fixture-probes-2/`, `diag-hierarchy/` | Rule 9 causes |
| 8 | FX fixes, TCT | 2026-10-11 10:20 | Completed | peer-sidebar baseline fix (`GetRunFileChanges`); background diagnostic (`diag-bgc`, reverted); `test:e2e:task-closure-tree --cases BR-001..006,008,009,012,013`; hierarchy rerun | Pass | peer-sidebar Pass; background: base tree shape differs from the probe (reported, edit reverted); team-activity fails identically on base (reported); TCT 10 / 10 Pass with clean cleanup; hierarchy Pass | Pass / reported | `fixture-probes-3/`, `task-closure-tree/` | — |
| 9 | DESK | 2026-10-11 10:45 | Completed | `pnpm --silent isolated-app start --build` → `iso-63441-b1f0`; scripted AGY in its own `.env`; `restart`; `desktop/desktop-drive.mjs` | Summary shown; locate from a hidden panel | 46 px row with the summary; hidden right panel reopened docked on Projects, Task's Project chosen, card highlighted, no page errors; `.ring-slate-300` in packaged CSS; stop: data root removed, ports released | Pass | `desktop/` | — |

## Re-entry And Reconciliation

- Last durably recorded event: 9
- Last completed case and result: DESK Pass
- Cases still running, interrupted, or not started: none
- Next case or recovery action: none (RSK-001 rerun after the aggregate-status rebase)
- Reconciled into execution coverage report: `Yes` — `api-e2e-execution-coverage-report.md`, Test-Case Ledger Reconciliation
