# API/E2E Test-Case Ledger — Claude compaction rotation (API-REV-001)

## Ledger Meta

- Assigned task workspace / worktree: /Users/normy/autobyteus_org/autobyteus-worktrees/runtime-work-transfer-analysis (307d0e775)
- Coverage investigation: tickets/in-progress/runtime-work-transfer-analysis/api-e2e-coverage-investigation.md
- Execution coverage report: tickets/in-progress/runtime-work-transfer-analysis/api-e2e-execution-coverage-report.md
- API/E2E revision record: tickets/in-progress/runtime-work-transfer-analysis/api-e2e-revision-record.md
- Ledger scope and reason it is required: several independent, long-running live Claude cases with real model calls, plus repository suites.
- Last updated: 2026-10-04

## Planned Cases

| Case ID | Case / Journey | Requirement / Acceptance-Criteria IDs | Boundary / Execution Surface | Planned Command Or Entry Point | Planned Order | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| REPO-01 | Claude/memory/run-history unit suites | AC-022a/b, AC-023, AC-024, AC-025 | Vitest units | `vitest run tests/unit/agent-execution/backends/claude tests/unit/agent-memory tests/unit/run-history` | 1 | |
| REPO-02 | src typecheck | — | tsc | `tsc -p tsconfig.build.json --noEmit` | 2 | |
| REPO-03 | Broad server regression sweep, HEAD vs base | REQ-014 / AC-014 | Vitest unit+integration+e2e dirs | same command in both worktrees | 3 | |
| REPO-04 | Web pairing and history hydration specs | BEH-009, BEH-011 web | Nuxt Vitest | `pnpm -C autobyteus-web test:nuxt <specs> --run` | 4 | |
| E2E-01 | Live `/compact` → one operation, one marker pair, one archive (both CLIs) | AC-022c, AC-023, AC-024 | real AgentRun + websocket + Claude CLI + recorder | `RUN_CLAUDE_E2E=1 vitest run tests/e2e/runtime/claude-agent-compaction-rotation.e2e.test.ts` | 5 | path 2.1.283, bundled 2.1.280 |
| E2E-02 | Reopened history after `/compact` + follow-up | BEH-011, CONF-001 | production history reader on live memory | same case as E2E-01 | 5 | |
| E2E-03 | Stop during live `/compact` | REQ-025, SCN-019/020 | websocket INTERRUPT_GENERATION | same file | 6 | |
| E2E-04 | Live auto compaction (window 60000) | SCN-017, SCN-019, REQ-022–025 | live | `RUN_CLAUDE_AUTO_COMPACTION_E2E=1` | 7 | higher token cost |
| E2E-05 | CLI process exit (SIGKILL) during live `/compact` (added in round 1) | REQ-025, SCN-020 | live | same file | 9 | both CLIs |
| UI-01..03 | Packaged desktop journey: `/compact`, Stop, restart + reopen (added in round 1) | BEH-008/009/011, REQ-025, CONF-001 | isolated instance of worktree build | `pnpm --silent isolated-app start --build` + browser-automation | 10 | Haiku 4.5 |
| TMP-01 | Long compaction (>30 s) for live keepalive | AC-023 live | temporary probe through the harness | ad hoc | 8 | one attempt |

## Execution Events

| Sequence | Case ID | Timestamp | Event | Command / Entry Point / Material Configuration | Expected Observable Result | Observed Result Or Checkpoint | Result | Evidence / Artifact Path | Next Action / Unresolved Issue |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | REPO-01 | 2026-10-04 | Completed | vitest (claude, agent-memory, run-history units) | all compaction/rotation/history tests pass | 504 passed, 14 failed in 4 files (memory-location, team-memory-explorer, published-artifact projection, team-run-history catalog); none compaction-related | Pass (for scope; failures to be compared with base in REPO-03) | console | REPO-03 base comparison |
| 2 | REPO-02 | 2026-10-04 | Completed | `tsc -p tsconfig.build.json --noEmit`; grep `buildClaudeProviderCompactionEvent` | exit 0; no references | exit 0; 0 references | Pass | console | — |
| 3 | REPO-03 | 2026-10-04 | Checkpoint | HEAD sweep (json) | — | HEAD: 1773 tests, 1663 passed, 68 failed (20 files), 42 skipped; base run started | — | api-e2e-evidence/sweep-head.json | compare with base |
| 4 | REPO-04 | 2026-10-04 | Completed | web agentStatusHandler (+1 new Claude started→failed case) and runProjectionActivityHydration specs | pass | 24/24 and 4/4 | Pass | console | — |
| 5 | E2E-01/02/03 | 2026-10-04 09:23 | Completed (run 1) | `RUN_CLAUDE_E2E=1 vitest run tests/e2e/runtime/claude-agent-compaction-rotation.e2e.test.ts` | E2E-01/02 pass both CLIs; E2E-03 pass both CLIs | E2E-01/02 pass on path-claude (47.9 s) and sdk-bundled-claude (16.7 s). E2E-03: all websocket/raw-trace assertions passed on both CLIs (compacting→failed, one provider_event_id, failed before settlement, 0 archive segments, run continues); history assertion saw 2 compaction rows because the test called the provider directly, without the production dedupe | E2E-01/02 Pass; E2E-03 test defect (not product) | api-e2e-evidence/live-e2e-run1.log | fixed test to use AgentRunViewProjectionService (production dedupe); deterministic probe confirmed service → 1 failed activity; rerun |
| 6 | E2E-01..04 | 2026-10-04 | Completed (run 2) | `RUN_CLAUDE_E2E=1 RUN_CLAUDE_AUTO_COMPACTION_E2E=1 vitest run tests/e2e/runtime/claude-agent-compaction-rotation.e2e.test.ts` | all pass | 5/5 pass in 70.4 s: E2E-01/02 path-claude 13.8 s, sdk-bundled 15.1 s; E2E-03 path 6.6 s, bundled 6.5 s; E2E-04 28.4 s | Pass | api-e2e-evidence/live-e2e-run2.log | — |
| 7 | REPO-03 | 2026-10-04 | Completed | base sweep at /tmp/rwta-base (39f2dd008) + diff | no new failures at HEAD | HEAD 68 failed / base 66 failed; the same 66 fail on both; 2 HEAD-only failures were `TEST_SERVER_BUILD_REQUIRED` in stopped-run-model-config-graphql.e2e during the concurrent run; isolated rerun at HEAD 2/2 pass; 19 HEAD-only tests are the new ones | Pass | api-e2e-evidence/sweep-head.json, sweep-base.json, rerun-stopped-run-model-config-head.log | — |
| 8 | TMP-01 | 2026-10-04 | Completed | temporary probe tests/tmp-api-e2e/claude-long-auto-compaction-probe.test.ts, opus, path CLI 2.1.283, CLAUDE_CODE_AUTO_COMPACT_WINDOW=60000 | >30 s compaction with keepalives collapsed into one operation | Compaction ran 10.3 s (no keepalive). Turn 2: auto compacting→failed "too_few_groups" (one id, no rotation). Turn 3: auto compacting→compacted (pre 170796, post 1196), 1 archive segment, markers compacting,failed,compacting,compacted | Pass for auto success/failure; keepalive Not Tested (not reproducible: compaction <30 s) | api-e2e-evidence/tmp01-long-auto-compaction.json/.log | probe removed after run |
| 9 | UI-01 | 2026-10-04 | Checkpoint | `pnpm --silent isolated-app start --build` (worktree build) | isolated instance ready | ready: iso-55016-1001 (control 55016, backend 55017); agent "Claude Compaction QA" created via GraphQL; run: Claude Agent SDK, Haiku 4.5 | — | api-e2e-evidence/isolated-start.json, isolated-build.log | — |
| 10 | UI-01 | 2026-10-04 09:39 | Completed | UI: send "OK ONE", `/compact`, "OK AFTER" | one activity started→completed; one Event Monitor row | #d0bee0 COMPACTING at 0.25 s → COMPLETED at 12.8 s; 1 Activity item, 1 row | Pass | ui-01-live-compact-completed.png | — |
| 11 | UI-02 | 2026-10-04 | Completed | UI: `/compact`, Stop generation after 2 s, then "OK FINAL" | same row ends failed with error; run continues | #b9dbde → FAILED "API Error: Request was aborted." within 250 ms; "Compaction canceled."; "OK FINAL" | Pass | ui-02-live-stop-failed.png | — |
| 12 | UI-03 | 2026-10-04 | Completed | `isolated-app restart`, reopen run from sidebar | latest segment only; 1 row per op | starts at boundary row; OK ONE archived; failed op 1 row (no reason text: OBS-1); Activity 2 items; disk 1 archive segment (5 records), boundary manual 14740→1309 / 12570 ms | Pass | ui-03-reopened-history.png, ui-run-memory/ | instance stopped, data root removed |
| 13 | E2E-01..05 | 2026-10-04 | Completed (run 3) | same command + new E2E-05 (SIGKILL CLI during `/compact`) | all pass | 7/7 pass in 95.9 s; E2E-05 both CLIs: failed before ERROR, 0 archive, next turn OK; E2E-04: [failed too_few_groups, compacted 138622 tok / 13.9 s] | Pass | live-e2e-run3.log | — |

## Re-entry And Reconciliation

- Last durably recorded event: 13
- Last completed case and result: E2E run 3 Pass (7/7)
- Cases still running, interrupted, or not started: none
- Next case or recovery action: none

- Reconciled into execution coverage report: `Yes` — api-e2e-execution-coverage-report.md "Test-Case Ledger Reconciliation"
- Reconciliation note: TMP-01 keepalive portion has no terminal Pass (Not Tested; compaction under 30 s).



