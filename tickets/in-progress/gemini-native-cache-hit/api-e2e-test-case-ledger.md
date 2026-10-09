# API/E2E Test-Case Ledger — gemini-native-cache-hit

## Ledger Meta

- Assigned task worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/gemini-native-cache-hit`
- Coverage investigation: `tickets/in-progress/gemini-native-cache-hit/api-e2e-coverage-investigation.md`
- Execution coverage report: `tickets/in-progress/gemini-native-cache-hit/api-e2e-execution-coverage-report.md`
- API/E2E revision record: `tickets/in-progress/gemini-native-cache-hit/api-e2e-revision-record.md`
- Ledger scope and reason it is required: seven independently meaningful cases, gated fake-CLI runs, and one live AGY probe
- Last updated: 2026-10-09

## Planned Cases

| Case ID | Case / Journey | Requirement / AC IDs | Boundary / Execution Surface | Planned Command Or Entry Point | Planned Order | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| AE-007 | AGY usage without `cache_read_tokens` → `not_reported`, gross = input | AC-002 (alternate) | Unit: converter + production basis resolver | `vitest run tests/unit/agent-execution/backends/antigravity/agy-stream-event-converter.test.ts` | 1 | Durable |
| AE-001 | 11 recorded AGY 1.2.16 turns through the real server (WS + GraphQL + DB) | REQ-002, AC-002, AC-003 (server side) | Fake-CLI transport E2E | `RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=… vitest run tests/e2e/runtime/agy-token-usage-transport.e2e.test.ts` | 2 | Durable |
| AE-002 | Native 3.1 Pro 150K → 2.00 / 0.20 / 12 (reasoning 12) | REQ-004, AC-005 | Native normalizer → enrichment → store → GraphQL | `vitest run tests/e2e/token-usage/gemini-native-pricing-graphql.e2e.test.ts` | 3 | Durable |
| AE-003 | Native 3.1 Pro 250K → 4.00 / 0.40 / 18 | REQ-004, AC-005 | same | same | 3 | Durable |
| AE-004 | 200,000 → `prompt_le_200k`; 200,001 → `prompt_gt_200k` | REQ-004 (tier boundary) | same | same | 3 | Durable |
| AE-006 | 3.8 Flash 2026 and 2027 prices unchanged | AC-006 | same | same | 3 | Durable |
| AE-005 | AGY series spanning the fix: shapes A and B through the real DB store | REQ-005, AC-007 | AGY converter → enrichment → persistence → SQL → GraphQL | `vitest run tests/e2e/token-usage/agy-token-usage-upgrade-continuation.e2e.test.ts` | 4 | Durable |
| TP-001 | New tests fail against the pre-fix production values | Discrimination | Temporary revert of the 2 production files | Order 4 of the investigation | 5 | Temporary |
| TP-002 | Live installed `agy` 1.3.2 through the real server: 3 tiny turns | AC-003 (server side), the cumulative contract | Live AGY + real server (temporary probe) | `RUN_TP002=1 vitest run tests/e2e/runtime/tmp-tp002-agy-usage-live.e2e.test.ts` (deleted after) | 6 | Temporary; uses AGY quota |

## Execution Events

| Sequence | Case ID | Timestamp | Event | Command / Entry Point / Material Configuration | Expected Observable Result | Observed Result Or Checkpoint | Result | Evidence / Artifact Path | Next Action / Unresolved Issue |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | AE-001 | 2026-10-09 12:18 | Completed | Fake CLI `usage_report`, 3 turns (first version) | gross = input + read; miss = input; rate < 1 | 514,722 / 256,802 / 257,920; rate 0.501 | Pass | `api-e2e-logs/ae-001-agy-token-usage-transport.log` | Extended to 11 turns (seq 6) |
| 2 | AE-002/003/004/006 | 2026-10-09 | Completed | `gemini-native-pricing-graphql.e2e.test.ts` | Official tier prices; 3.8 Flash unchanged | 5/5 passed | Pass | `api-e2e-logs/ae-002-006-gemini-native-pricing.log` | — |
| 3 | AE-005 | 2026-10-09 | Completed | First version (pre-fix turns 1–2 of the recording) | Pre-fix record read unchanged | Failed: the pre-fix turn 2 was rejected as `cumulative_snapshot_regressed` by the **old** basis (standard 83,140 < 91,684). This is a test-design issue, not a product defect | Fail (test) | `api-e2e-logs/ae-005-agy-upgrade-continuation.log` (overwritten by seq 5) | Redesigned into shapes A/B |
| 4 | AE-005 | 2026-10-09 | Completed | Shape B, first expectation (true totals) | — | Totals 343,148 / 175,287 / 256,802 miss / 167,861 read: the rejected pre-fix snapshot advanced the checkpoint. Expectation corrected (within accepted fix-forward); the stored run-level flag is historical | Fail (test) | debug output in conversation | Assertions corrected |
| 5 | AE-005 | 2026-10-09 | Completed | Shapes A + B | A: miss catches up, gross lacks pre-fix reads; B: true post-fix increment; no new regression flag | 2/2 passed | Pass | `api-e2e-logs/ae-005-agy-upgrade-continuation.log` | — |
| 6 | AE-001 | 2026-10-09 | Completed | Extended to all 11 recorded turns (2 real compactions) | No regression flag on any turn; final 1,601,365 / 696,661 / 904,704 | Passed | Pass | `api-e2e-logs/ae-001-agy-token-usage-transport.log` | — |
| 7 | AE-007 | 2026-10-09 | Completed | Focused unit run (converter, routing guard, `tests/unit/token-usage`) | `not_reported`, gross = input | 19 files / 201 tests passed | Pass | `api-e2e-logs/order1-unit-focused.log` | — |
| 8 | TP-001 | 2026-10-09 | Completed | Pre-fix values from `927796780` for the 2 production files; then restored (0 diff lines) | New cases fail; AE-006 passes | 8 failed (AE-001, AE-002, AE-003, AE-004, AE-005 A/B, converter semantic, AE-007); AE-006 passed | Pass | `api-e2e-logs/tp-001-fail-before.log` | — |
| 9 | — | 2026-10-09 | Completed | Order 5: 6 sibling AGY fake-CLI transport suites | Fixture routes coexist | 37 passed, 1 skipped (browser gate) | Pass | `api-e2e-logs/order5-agy-sibling-transport.log` | — |
| 10 | — | 2026-10-09 | Completed | Order 6: `tests/e2e/token-usage` | Green | 2 failures in `token-usage-analytics-graphql`: pre-existing facet leak from 2 other files (reproduced without the new files) | Fail (base) | `api-e2e-logs/order6-e2e-token-usage.log` | Baseline fix `871f01cb3` |
| 11 | — | 2026-10-09 | Completed | Order 6 rerun after the baseline fix, `--no-cache` and cached orders | Green | 13 files / 40 tests passed, twice | Pass | `api-e2e-logs/order6-e2e-token-usage.log` | — |
| 12 | — | 2026-10-09 | Completed | Order 7: typecheck, `test:unit`, `test:integration:prepare` + `test:integration` | Green (known exception allowed) | typecheck Pass; unit 5,104 passed; integration only the 2 documented `agent-status-websocket` cadence cases failed | Pass | `api-e2e-logs/order7-*.log` | — |
| 13 | — | 2026-10-09 | Completed | Order 8: `autobyteus-ts` `tests/unit/llm` | Green except the known base failure | 399/400; the known `compaction-single-attempt-transport` Gemini timeout (OBS-002) | Pass (known base failure) | `api-e2e-logs/order8-autobyteus-ts-llm-unit.log` | Already reported |
| 14 | TP-002 | 2026-10-09 | Completed | Live `agy` 1.3.2 through the real server, 3 tiny turns, `gemini-3.8-flash-low` | Cumulative `result.usage`; correct per-turn deltas; `base_excludes_cache`; no regression | Raw input 8,919 → 17,920 → 27,003 (cumulative, total = input + output); deltas 8,919 / 9,001 / 9,083; record 27,003 gross = miss; 0 cache reads (small prompts); no errors or regression flags | Pass | `api-e2e-logs/tp-002-live-agy-usage.json`, `.log` | Probe file deleted |
| 15 | LV-001 | 2026-10-09 | Completed | User-requested live check (round 2): isolated desktop instance `iso-63523-dd36` built from worktree HEAD `78df53634`; installed `agy` 1.3.2, Gemini 3.8 Flash (Low), Temp workspace with a ~480 KB data file; 2 composer sends; Token tab | AC-003: gross = input + cache read ≥ cache reads; hit < 100% with uncached input; no regression flag | Turn 1 (reply 77567, correct): AGY input 67,632 + cache read 24,458 (total 68,320 = input + output) → meter gross 92,090, cache hit 26.6%, uncached 67,632. Turn 2 (reply 32589, correct): cumulative input 95,560, read 24,458 → gross 120,018, hit 20.4%, 2 reports; no regression flag. Pre-fix code would have shown gross 67,632 after turn 1 | Pass | `live-check/ac-003-live-receipt.json`, `live-check/ac-003-token-meter-after-turn-2.png` | Instance stopped; data root removed; ports released |

## Re-entry And Reconciliation

- Last durably recorded event: 15 (LV-001)
- Last completed case and result: LV-001 Pass
- Cases still running, interrupted, or not started: None
- Next case or recovery action: None
- Interruption, context-compression, or rerun note: the first LV-001 build was interrupted by a power-off and restarted from scratch (no partial instance left). On turn 2 the first scripted type-and-send left no message and an empty composer; the immediate retry sent normally. This is a driver-level timing observation that was not reproduced, and no user-visible error appeared. AE-005 was redesigned twice (test-design corrections, not product failures); AE-001 was extended from 3 to 11 turns
- Reconciled into execution coverage report: `Yes`, in `api-e2e-execution-coverage-report.md` › Test-Case Ledger Reconciliation
- Reconciliation note for any case missing a terminal result: None
