# API/E2E Test-Case Ledger — AGY compaction (API-REV-001)

## Ledger Meta

- Worktree: /Users/normy/autobyteus_org/autobyteus-worktrees/agy-compaction-analysis (f615e5d06)
- Coverage investigation: api-e2e-coverage-investigation.md; report: api-e2e-execution-coverage-report.md; revision record: api-e2e-revision-record.md
- Reason: several live and long-running cases.
- Last updated: 2026-10-04

## Planned Cases

| Case ID | Case / Journey | Requirement IDs | Surface | Entry Point | Order |
| --- | --- | --- | --- | --- | --- |
| REPO-01 | AGY/capability/factory/accumulator units | REQ-A01–A05 | Vitest | vitest run | 1 |
| REPO-02 | src typecheck | — | tsc | tsc -p tsconfig.build.json | 2 |
| E2E-S1 | scripted compaction transport | AC-A01b, BEH-A4 | fake CLI + real server | agy-compaction-rotation-transport.e2e | 3 |
| E2E-G1 | scripted gate off (1.2.15) | REQ-A04 | fake CLI + real server | agy-compaction-gate-off-transport.e2e (new) | 3 |
| REPO-03 | existing AGY scripted suites | REQ-A05 | fake CLI | agy-*-transport.e2e | 3 |
| REPO-04 | sweep HEAD vs base | REQ-A05 | Vitest | json reporter | 4 |
| WEB-1 | web specs + AGY single-phase case | BEH-A2 | Nuxt Vitest | test:nuxt | 5 |
| E2E-L1 | live compaction + history + restore | AC-A01c, BEH-A4, RU-2 | real agy 1.2.16 | RUN_AGY_COMPACTION_E2E=1 | 6 |
| E2E-L2 | live two checkpoints | SCN-A2 | real agy | + AGY_COMPACTION_E2E_CHECKPOINTS=2 | 7 |
| UI-1 | desktop journey: AGY compaction row live and after reopen | BEH-A2, BEH-A4 | isolated instance | isolated-app start --build | 8 |

## Execution Events

| Seq | Case ID | Event | Command / Configuration | Expected | Observed | Result | Evidence | Next |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | REPO-01 | Completed | `vitest run tests/unit/agent-execution/backends/antigravity tests/unit/runtime-management/antigravity-cli-capability.test.ts tests/unit/agent-memory/runtime-memory-event-accumulator.test.ts` | pass | 22 files passed (3 skipped), 352 tests passed (5 skipped) | Pass | console | — |
| 2 | REPO-02 | Completed | `tsc -p tsconfig.build.json --noEmit` | exit 0 | exit 0 | Pass | console | — |
| 3 | E2E-S1, E2E-G1, REPO-03 | Completed | `RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<abs fixture> vitest run tests/e2e/runtime/agy-*-transport.e2e.test.ts agy-native-image-step-output.e2e.test.ts` (fixture now has an `AGY_FAKE_VERSION` override; new gate-off file) | all pass | 8 files, 45 passed / 1 skipped (pre-existing skip); compaction transport 1/1; gate-off 1/1 | Pass | api-e2e-evidence/scripted-agy-e2e.log | — |
| 4 | E2E-G1 | Completed | mutation: gate-off file with version set to 1.2.16 (temp copy, deleted) | test fails | failed: "expected [COMPACTION_STATUS] to have a length of +0 but got 1" | Pass (test is sensitive) | console | — |
| 5 | WEB-1 | Completed | `nuxt prepare` (missing in worktree), then `pnpm -C autobyteus-web test:nuxt agentStatusHandler.spec.ts runProjectionActivityHydration.spec.ts --run` | pass | 29/29, incl. new AGY two-checkpoint case | Pass | console | — |
| 6 | REPO-04 | Completed | sweep HEAD then base (/tmp/agy-base @ 517409d40), json reporter | no new failures | HEAD 1773 passed / 68 failed; base 1743 / 66; same 66 on both; 2 HEAD-only = `TEST_SERVER_BUILD_REQUIRED` (first-run build) in stopped-run-model-config-graphql.e2e, isolated rerun 2/2 pass; 32 HEAD-only tests are new | Pass | sweep-head.json, sweep-base.json, rerun-stopped-run-model-config-head.log | — |
| 7 | E2E-L1 | Completed | `RUN_AGY_COMPACTION_E2E=1` (agy 1.2.16, gemini-3.8-flash-low), extended test | 1 checkpoint → 1 segment, history at boundary, restore continues | checkpoint step 9 (6.5 s) on turn 5; 1 segment; history 1 completed row; restore + "OK RESTORED" with no new compaction/segment | Pass | live-agy-run1.log | — |
| 8 | E2E-L2 | Completed (run 2) | + `AGY_COMPACTION_E2E_CHECKPOINTS=2` | 2 checkpoints, 2 segments | checkpoints 9 and 20 detected, segments matched; history assertion failed on substring "OK DUMP1" matching "OK DUMP10" (test defect) | Fail (test defect) | live-agy-run2-two-checkpoints.log | fix assertion to /OK DUMP1\b/ |
| 9 | E2E-L2 | Completed (run 3) | same, fixed assertion | pass | checkpoints 9 (7.4 s) and 20 (6.4 s); 2 segments; history 1 latest completed row; restore OK | Pass | live-agy-run3-two-checkpoints.log | — |

| 10 | UI-1 | Checkpoint | `pnpm --silent isolated-app start --build` → iso-55988-b4c4; agent via GraphQL; run Antigravity CLI / Gemini 3.8 Flash (Low) | ready | ready | — | isolated-start.json | — |
| 11 | UI-1 | Completed | 5 dumps via composer + "OK AFTER" | one completed row on the compacting turn | turn 5: 1 COMPLETED row at 6.5 s in Event Monitor + Activity (agy:…:checkpoint:9); no duration displayed (OBS-1) | Pass | ui-01-agy-live-compaction.png | — |
| 12 | UI-1 | Completed | `isolated-app restart`, reopen run, send "OK RESTORED" | history at boundary; restored run continues | reopen starts at the row; dumps 1–4 archived; OK RESTORED with no new row; disk 1 segment (9 records), marker duration_ms 6187 | Pass | ui-02-agy-reopened-restored.png, ui-run-memory/ | instance stopped, data root removed |

## Re-entry And Reconciliation

- Last durably recorded event: 12
- Cases still running or not started: none
- Reconciled into execution coverage report: `Yes`
