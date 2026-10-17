# API/E2E Test-Case Ledger — task-keys-declutter

## Ledger Meta

- Assigned worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-keys-declutter` (branch `codex/task-keys-declutter`, base `aa84fd026c`, uncommitted)
- Coverage investigation: `api-e2e-coverage-investigation.md`
- Execution coverage report: `api-e2e-execution-coverage-report.md`
- API/E2E revision record: `api-e2e-revision-record.md`
- Ledger scope: API-REV-001; repository checks, two probes, a live GraphQL check and a desktop session
- Last updated: 2026-10-17

## Planned Cases

| Case ID | Case / Journey | AC | Surface | Entry Point | Order |
| --- | --- | --- | --- | --- | --- |
| B1 | Server prebuild + packaged app build | — | build | `build:electron:mac` | 1 |
| U1 | Server typecheck + `tests/unit/projects`, `tests/unit/api/graphql` | AC-004 | server | vitest | 2 |
| U2 | Web `test:nuxt --run` + guards | AC-001–004 | web | nuxt vitest | 3 |
| P1 | Projects probe PT-E2E-001..017 | AC-001, AC-003 | browser | `test:e2e:projects` | 4 |
| P2 | PM-UX probe (all) | AC-002, AC-001 (tab) | browser, scripted AGY | `project-manager-ux-probe.mjs` | 5 |
| G1 | Live GraphQL: `taskWorkerTasks` without `taskKey`; `taskKey` selection rejected | AC-004 | built server | ticket script | 6 |
| DSK-D1 | Desktop board page: no key lines, badge with key | AC-001, AC-005 | isolated instance | `evidence/api-e2e/scripts/dsk-declutter.mjs` | 7 |
| DSK-D2 | Desktop tab board + tab Task view | AC-001, AC-003, AC-005 | isolated instance | same | 7 |
| DSK-D3 | Desktop tree: Project Task copy and Temp copy, summary only, title | AC-002, AC-005 | isolated instance | same | 7 |
| DSK-D4 | Desktop Task page chip, dependency rows, picker keys | AC-003, AC-005 | isolated instance | same | 7 |

## Execution Events

| Sequence | Case ID | Timestamp | Event | Command / Entry Point / Material Configuration | Expected | Observed | Result | Evidence | Next Action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | B1 | 2026-10-17 | Completed | server prebuild; `pnpm -C autobyteus-web build:electron:mac` | fresh dist + packaged app | exit 0; app 1.5.5-beta.3 build of this worktree | Pass | `evidence/api-e2e/logs/electron-build.log` | — |
| 2 | DSK-D1..D4, G1 | 2026-10-17 | Completed | `isolated-app start --from-worktree --data-root <owned>` (iso-59740-05cd); scripted AGY in the owned `.env` + restart; `evidence/api-e2e/scripts/dsk-declutter.mjs` | board page and tab board without key lines and with the keyed badge; tree copies (Project + Temp) summary only with key-free title / name; Task page / tab view / picker keys kept; worker answer without `taskKey`, `taskKey` selection rejected | 6/6 steps Pass, 0 page errors; locate from the tree still works | Pass | `evidence/api-e2e/desktop/dsk-declutter.json`, `dsk-d*.png` | instance stopped, ports released, root removed |
| 3 | U1 | 2026-10-17 | Completed | server typecheck; `vitest run tests/unit/projects tests/unit/api/graphql` | pass | typecheck exit 0; 42 files / 306 tests pass | Pass | `evidence/api-e2e/logs/server-*.log` | — |
| 4 | U2 | 2026-10-17 | Completed | `test:nuxt --run`; guards | pass | 632 files / 4,473 tests pass (3 skipped), 0 fail; guards pass | Pass | `evidence/api-e2e/logs/web-*.log` | — |
| 5 | P1 | 2026-10-17 | Completed | `test:e2e:projects --skip-server-build` (host load avg ~197) | PT-E2E-001..017 pass | 17/17; cleanup receipt complete | Pass | `evidence/api-e2e/browser/projects-feature/` | — |
| 6 | P2 | 2026-10-17 | Completed | `project-manager-ux-probe.mjs` (all, scripted AGY) | 25/25 | 25/25; cleanup receipt complete | Pass | `evidence/api-e2e/browser/project-manager-ux/` | — |

## Re-entry And Reconciliation

- Last durably recorded event: 6 (P2)
- Cases still running, interrupted, or not started: none
- Reconciled into execution coverage report: `Yes`
