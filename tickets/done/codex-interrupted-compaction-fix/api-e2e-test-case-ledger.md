# API/E2E Test-Case Ledger — Codex interrupted-compaction fix (API-REV-001)

## Ledger Meta

- Worktree: /Users/normy/autobyteus_org/autobyteus-worktrees/codex-interrupted-compaction-fix (69b0493f2)
- Investigation / report / revision record: api-e2e-coverage-investigation.md, api-e2e-execution-coverage-report.md, api-e2e-revision-record.md (same folder)
- Reason: timing-based live cases, repeated runs.

## Planned Cases

| Case ID | Case | Requirement | Surface | Order |
| --- | --- | --- | --- | --- |
| REPO-01 | Codex/history/accumulator units | AC-C01a/b/c | Vitest | 1 |
| REPO-02 | src typecheck | — | tsc | 2 |
| REPO-03 | sweep HEAD vs base 03d5db06b | REQ-C04 | Vitest json | 3 |
| WEB-1 | web specs + Codex abandoned case | AC-C01c | Nuxt Vitest | 4 |
| E2E-I | live interrupt during auto compaction + reopened history | SCN-C1, AC-C01d | real app server + AgentRunManager + recorder | 5 |
| E2E-T | live terminate during compaction | SCN-C5, BEH-C2 | same | 5 |
| E2E-K | live app-server SIGKILL during compaction | SCN-C4 | same | 5 |
| E2E-R | repeat the full live file (≥2 runs) | timing robustness | same | 6 |

## Execution Events

| Seq | Case ID | Event | Command / Configuration | Expected | Observed | Result | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | REPO-01 | Completed | `vitest run tests/unit/agent-execution/backends/codex tests/unit/run-history/projection tests/unit/agent-memory/runtime-memory-event-accumulator.test.ts` | pass | 350 passed; 4 failed in codex-tool-log-correlation.test.ts (also failing on the base in the prior Claude sweep; to confirm in REPO-03) | Pass (scope) | console |
| 2 | REPO-02 | Completed | `tsc -p tsconfig.build.json --noEmit` | exit 0 | exit 0 | Pass | console |
| 3 | WEB-1 | Completed | `pnpm -C autobyteus-web test:nuxt agentStatusHandler.spec.ts runProjectionActivityHydration.spec.ts --run` | pass | 30/30 incl. new Codex abandoned case | Pass | console |
| 4 | REPO-03 | Completed | sweeps HEAD then base (/tmp/codex-base @ 03d5db06b) | 0 new failures | HEAD 1808 passed / 68 failed; base 1795 / 66; same 66 (incl. 4 codex-tool-log-correlation); 2 HEAD-only = first-run `TEST_SERVER_BUILD_REQUIRED` (stopped-run-model-config), isolated rerun 2/2 pass | Pass | sweep-head.json, sweep-base.json, rerun-stopped-run-model-config-head.log |
| 5 | E2E-I/T/K | Completed (run 1) | `RUN_CODEX_E2E=1 vitest run tests/e2e/runtime/codex-interrupted-compaction.e2e.test.ts` (extended file, first version of E2E-T expecting a run_terminated close) | all pass | E2E-I pass; E2E-K pass; E2E-T hit its guard "compaction finished before terminate landed" | E2E-I/K Pass; E2E-T inconclusive | live-codex-run1.log |
| 6 | E2E-T | Completed (diagnostic) | same, `-t "run terminate"`, with event sequence in the guard message | — | terminate took 5.35 s; before backend terminate the turn finished normally (COMPACTION_STATUS compacted → TURN_COMPLETED). Source: AgentRun.prepareTerminationOnce quiesces input and waits for the active turn before backend.terminateRun | Finding: real terminate never leaves a compaction open; the backend run_terminated close is defensive | live-codex-terminate-diag.log |
| 7 | E2E-T | Updated | case rewritten to the real-use invariant: exactly one terminal status for the running compaction, markers on disk, archives match the status, history has no "started" row | — | — | — | — |
| 8 | E2E-I/T/K | Completed (run 2) | full file | 3/3 | 3/3; terminate → compacted | Pass | live-codex-run2.log |
| 9 | E2E-R | Completed (runs 3, 4) | full file ×2 | 3/3 each | 3/3 and 3/3; terminate → compacted both times | Pass | live-codex-run3.log, live-codex-run4.log |
| 10 | UI-1 | Started | `pnpm --silent isolated-app start --build`; plan: add `CODEX_APP_SERVER_ARGS_JSON=["app-server","-c","model_auto_compact_token_limit=20000"]` to the instance's own server-data/.env, restart, drive a Codex run (dumps, Stop during compaction, next turn, reopen) | — | building | — | isolated-build.log |

| 11 | UI-1 | Completed | iso-60242-b10e; instance .env + restart; Codex GPT-5.6-Luna; turns ONE, TWO(Stop), OK AFTER | interrupted row FAILED; next completes | TWO: COMPACTING 0.10 s → Stop → FAILED (reason) 0.31 s; OK AFTER: new compaction COMPLETED in 5.0 s; Activity 2 items | Pass | ui-01-codex-stop-failed.png, ui-02-codex-after-live.png |
| 12 | UI-1 | Completed | THREE, FOUR(Stop), restart, reopen, OK FINAL; disk | reopened: one FAILED row, none started; continues | reopen rows COMPLETED + FAILED; OK FINAL continues and compacts normally; disk 3 segments for 3 completed, 2 interrupted ops with compacting+failed | Pass | ui-03-codex-reopened.png, ui-run-memory/ ; instance stopped, data root removed |

## Re-entry And Reconciliation

- Last durably recorded event: 12
- No cases running or unstarted. Reconciled into the execution coverage report: `Yes`.
