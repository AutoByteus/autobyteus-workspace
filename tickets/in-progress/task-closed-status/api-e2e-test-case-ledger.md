# API/E2E Test-Case Ledger — `task-closed-status`

## Ledger Meta

- Assigned worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-closed-status` (branch `codex/task-closed-status`, base commit `17e4299a6`)
- Coverage investigation: `tickets/in-progress/task-closed-status/api-e2e-coverage-investigation.md`
- Execution coverage report: `tickets/in-progress/task-closed-status/api-e2e-execution-coverage-report.md`
- API/E2E revision record: `tickets/in-progress/task-closed-status/api-e2e-revision-record.md`
- Ledger scope and reason: several independent, long-running cases (gated live-worker E2E, a browser probe with an owned stack).
- Last updated: 2026-10-08

## Planned Cases

| Case ID | Case / Journey | Requirement / AC IDs | Boundary / Execution Surface | Planned Command Or Entry Point | Planned Order | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| CLS-API-001 | MCP + native + GraphQL CANCELLED contract | AC-004, AC-006, AC-007, AC-010, AC-012, REQ-001 | Real Studio HTTP MCP / GraphQL | `pnpm -C autobyteus-server-ts exec vitest run tests/e2e/projects/project-task-boundaries.e2e.test.ts --no-watch` | 1 | ungated |
| CLS-E2E-001 | Agent root live CANCELLED journey | AC-001, AC-003, AC-004, AC-005, AC-011 | Real HTTP/WS/scoped MCP, scripted AGY | gated `task-reactivation-root-visibility.e2e.test.ts -t CLS-E2E` | 2 | |
| CLS-E2E-002 | Team root live CANCELLED journey | same | same (Team stream) | same | 3 | |
| CLS-MUT-001 | Mutation sanity: CANCELLED made non-terminal → new cases must fail | — | temporary source edit, restored | same commands | 4 | temporary |
| REG-SRV | Server regression layers (unit + integration + tests/e2e/projects + gated siblings) | AC-012, preserved BEH | Vitest | TESTING.md commands | 5 | |
| REG-WEB | Web specs for Projects + full test:nuxt | AC-008, AC-009, AC-011, QR-001/002 | Vitest/Nuxt | `pnpm -C autobyteus-web test:nuxt … --run` | 6 | |
| PMU-017 | Browser: agent closes/reopens on Project board, Task page pill, card count, Temp board + header, right-panel board | AC-008..AC-011, REQ-008..010, QR-001 | Built backend + Nuxt dev + headless Chrome | `pnpm -C autobyteus-web test:e2e:project-manager-ux --cases PMU-017 --output-dir …` | 7 | |
| PMU-REG | Browser regression of existing DONE/board journeys | preserved BEH-003/004/008 | same | `--cases PMU-001,PMU-002,PMU-005,PMU-009,PMU-015` | 8 | |

## Execution Events

| Sequence | Case ID | Timestamp | Event | Command / Configuration | Expected Observable Result | Observed Result Or Checkpoint | Result | Evidence / Artifact Path | Next Action / Unresolved Issue |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | CLS-API-001 | 2026-10-08 16:18 | Completed | `vitest run tests/e2e/projects/project-task-boundaries.e2e.test.ts -t CLS-API-001` | all assertions pass | 1 passed (818 ms) | Pass | console | — |
| 2 | CLS-E2E-001 | 2026-10-08 16:2x | Completed | gated, `-t CLS-E2E`, `TASK_REACTIVATION_E2E_EVIDENCE_DIR=api-e2e-evidence/cls-e2e` | live closure, stop, refusals naming CANCELLED, reopen, reactivation, Temp CANCELLED, strict feed | passed (4.5 s) | Pass | `api-e2e-evidence/cls-e2e/run-1.log`, `task-reactivation-root-visibility.json` | — |
| 3 | CLS-E2E-002 | 2026-10-08 16:2x | Completed | same run | same via Team stream | passed (4.5 s) | Pass | same | — |
| 4 | CLS-MUT-001 | 2026-10-08 16:2x | Completed | `isTerminalTaskStatus` temporarily DONE-only | CLS-API-001, CLS-E2E-001/002 fail | 3 failed (`expected null to deeply equal Any<String>`); source restored (`git diff` empty for `task-status.ts`) | Pass | console | — |

| 5 | REG-SRV | 2026-10-08 | Completed | unit; integration; `tests/e2e/projects` ungated; same gated | all pass | unit 70/649; integration 2/16; ungated 4 files/27 (5 skipped files); gated 9 files/47 (1 skipped live-Claude) | Pass | `api-e2e-evidence/server-regression/` | — |
| 6 | REG-WEB | 2026-10-08 | Completed | Projects specs + localization guards | pass | 102/981; guards exit 0 | Pass | `api-e2e-evidence/web/projects-specs.log`, `localization-guards.log` | — |
| 7 | PMU-017 | 2026-10-08 | Completed | `--cases PMU-017 --output-dir …/pmu-017-run-1` | journey passes | Fail at "lane order": probe selector `[data-testid^="project-task-column-"]` also matched `-count`/`-empty` children; the product boxes were correct | Fail (test code) | `api-e2e-evidence/pmu-017-run-1/` | fix selector to `section[…]` |
| 8 | PMU-017 | 2026-10-08 | Completed | `…/pmu-017-run-2` | — | same failure: the edit had not been applied (file not re-read) | Fail (test code) | `api-e2e-evidence/pmu-017-run-2/` | apply fix |
| 9 | PMU-017 | 2026-10-08 | Completed | `…/pmu-017-run-3` (selector `section[data-testid^=…]`) | journey passes | Pass; cleanup complete | Pass | `api-e2e-evidence/pmu-017-run-3/` | — |
| 10 | PMU-REG | 2026-10-08 | Completed | `--cases PMU-001,PMU-002,PMU-003,PMU-005,PMU-009,PMU-015,PMU-017 --output-dir …/pmu-regression-run-1` | all pass | 7/7 Pass; cleanup complete | Pass | `api-e2e-evidence/pmu-regression-run-1/` | — |
| 11 | REG-WEB | 2026-10-08 | Completed | `pnpm -C autobyteus-web test:nuxt --run` | pass | 587 files passed, 2 skipped; 3978 tests; 0 failed | Pass | `api-e2e-evidence/web/full-test-nuxt.log` | — |

## Re-entry And Reconciliation

- Last durably recorded event: 11
- Last completed case and result: REG-WEB full suite — Pass
- Cases still running, interrupted, or not started: None
- Reconciled into execution coverage report: `Yes` — Test-Case Ledger Reconciliation section
- Reconciliation note: PMU-017 runs 1–2 are test-code (probe selector) failures, superseded by run 3; no case lacks a terminal result.
