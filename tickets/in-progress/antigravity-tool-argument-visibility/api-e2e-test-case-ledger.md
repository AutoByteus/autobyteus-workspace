# API/E2E Test-Case Ledger
Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/antigravity-tool-argument-visibility`; canonical sibling coverage investigation/report/revision record. Round 1; multiple cases, provider/browser interruption risk. Initialized before execution 2026-10-03.

## Planned Cases
| ID | Journey | REQ / AC | Order / surface |
| --- | --- | --- | --- |
| E-001 | Full first native inputs / typed persistence / source-free reopen | 001,002,004 / 001–004,006 | 1; fake CLI real server |
| E-002 | Missing/ambiguous optional evidence | 003,004 / 005 | 2; fake CLI real server |
| E-003 | Actual restore / future enriched calls / unchanged old summary | 002,004 / 004 | 3; GraphQL restore + WS |
| R-001 | Focused units/source typecheck and preserved transport regressions | all / 005,006 | 4; Vitest |
| L-001 | Current real-native implemented backend capture | 001,002,004 / 001–004 | 5; Live API/CLI |
| B-001 | Integrated live/reopened Activity arguments | 001,002 / 001–004 | 6; Nuxt/Chrome |

## Execution Events
| Seq | Case | Time | Event | Expected / observed | Result | Evidence / next |
| --- | --- | --- | --- | --- | --- | --- |


| 1 | E-001/E-002/E-003 | 2026-10-03 | Started | New deterministic real-server transport suite | N/A | api-e2e-evidence/native-transport.log |
| 2 | E-001/E-003 | 2026-10-03 | Completed | Initial attempt: captured all full objects but new test wrongly extracted all UUIDs from metadata (run + provider). API-owned fixture/assertion correction: use explicit platformAgentRunId; not product defect. | Fail | native-transport.log; rerun |
| 3 | E-002 | 2026-10-03 | Completed | Missing and ambiguous detail both retained summary and completed | Pass | native-transport.log |
| 4 | E-001/E-002/E-003 | 2026-10-03 | Started | Corrected binding reader; per-case finished hook now writes ledger immediately | N/A | native-transport-final.log |
| auto | E-001 | 2026-10-03T15:47:17.561Z | Completed | E-001 captures complete typed first STARTED before terminal, then reopens without provider evidence | Pass | native-transport-final.log |
| auto | E-002 | 2026-10-03T15:47:18.453Z | Completed | E-002 retains truthful summary and completion for SUMMARY_ONLY detail | Pass | native-transport-final.log |
| auto | E-002 | 2026-10-03T15:47:19.366Z | Completed | E-002 retains truthful summary and completion for AMBIGUOUS detail | Pass | native-transport-final.log |
| auto | E-003 | 2026-10-03T15:47:21.483Z | Completed | E-003 actually restores the bound conversation, captures future calls, and leaves old summary bytes unchanged | Pass | native-transport-final.log |
| 5 | R-001 | 2026-10-03 | Started | 13 focused files plus preserved fake transports and source typecheck | N/A | regressions.log |
| 6 | R-001 | 2026-10-03 | Completed | 23 files / 266 tests Pass, 3 opt-in files / 5 tests skipped (not counted as proof); source typecheck Pass | Pass | regressions.log, source-typecheck.log |
| live | L-001 | 2026-10-03T15:53:29.443Z | Started | Real AGY 1.2.16 via actual Studio backend; disposable app/workspace | N/A | live-native.json / browser.json |
| live | B-001 | 2026-10-03T15:53:49.116Z | Started | Nuxt real HTTP hydration and production AgentStreamingService ready before native send | N/A | live-native.json / browser.json |
| live | L-001 | 2026-10-03 | Checkpoint | All nine actual native tool calls finished; independent owned-disk/provider comparison exact. Initial rendered probe waits for incorrect case-sensitive RUNNING instead of actual Running, so browser checkpoint is unresolved; no source defect. | N/A | initial-live-comparison.json; wait for owned cleanup then correct probe |
| live | B-001 | 2026-10-03 | Completed | Initial temporary probe timed out on case-sensitive RUNNING; actual label is Running. Cleanup confirmed. API-owned probe fix, no product defect. | Fail | live-validation-initial.log / live-cleanup-initial.json; corrected rerun |
| live | L-001 | 2026-10-03T15:58:19.388Z | Started | Real AGY 1.2.16 via actual Studio backend; disposable app/workspace | N/A | live-native.json / browser.json |
| live | B-001 | 2026-10-03T15:58:31.888Z | Started | Nuxt real HTTP hydration and production AgentStreamingService ready before native send | N/A | live-native.json / browser.json |
| live | B-001 | 2026-10-03T15:58:51.303Z | Checkpoint | Live stream-rendered replacement JSON exact while actual native command RUNNING | N/A | live-native.json / browser.json |
| live | L-001 | 2026-10-03T15:58:58.271Z | Completed | Nine real native calls: provider actual typed args = first STARTED = terminal = raw disk; repeated edits and final file exact | Pass | live-native.json / browser.json |
| live | B-001 | 2026-10-03 | Completed | Second probe: live arguments proven, L-001 completed Pass; saved step incorrectly used Playwright default data-testid locator against data-test button. API probe locator fix only. All owned resources cleaned. | Fail | live-validation-second.log / live-cleanup-second.json; rerun corrected locator |
| live | L-001 | 2026-10-03T16:01:11.294Z | Started | Real AGY 1.2.16 via actual Studio backend; disposable app/workspace | N/A | live-native.json / browser.json |
| live | B-001 | 2026-10-03T16:01:23.455Z | Started | Nuxt real HTTP hydration and production AgentStreamingService ready before native send | N/A | live-native.json / browser.json |
| live | B-001 | 2026-10-03T16:01:41.602Z | Checkpoint | Live stream-rendered replacement JSON exact while actual native command RUNNING | N/A | live-native.json / browser.json |
| live | L-001 | 2026-10-03T16:01:48.597Z | Completed | Nine real native calls: provider actual typed args = first STARTED = terminal = raw disk; repeated edits and final file exact | Pass | live-native.json / browser.json |
| live | B-001 | 2026-10-03T16:01:49.513Z | Completed | Actual live WS handlers and fresh network-only history hydration rendered nine equal native argument objects; disclosure/collapse/narrow overflow Pass | Pass | live-native.json / browser.json |
| 7 | R-001 | 2026-10-03 | Started | Additional directly relevant web lifecycle/history/ToolActivityItem tests after integrated inspection | N/A | web-regressions.log |
| auto | E-001 | 2026-10-03T16:03:56.191Z | Started | E-001 captures complete typed first STARTED before terminal, then reopens without provider evidence | N/A | native-transport-final.log |
| auto | E-001 | 2026-10-03T16:03:57.491Z | Completed | E-001 captures complete typed first STARTED before terminal, then reopens without provider evidence | Pass | native-transport-final.log |
| auto | E-002 | 2026-10-03T16:03:57.492Z | Started | E-002 retains truthful summary and completion for SUMMARY_ONLY detail | N/A | native-transport-final.log |
| auto | E-002 | 2026-10-03T16:03:58.405Z | Completed | E-002 retains truthful summary and completion for SUMMARY_ONLY detail | Pass | native-transport-final.log |
| auto | E-002 | 2026-10-03T16:03:58.406Z | Started | E-002 retains truthful summary and completion for AMBIGUOUS detail | N/A | native-transport-final.log |
| auto | E-002 | 2026-10-03T16:03:59.318Z | Completed | E-002 retains truthful summary and completion for AMBIGUOUS detail | Pass | native-transport-final.log |
| auto | E-003 | 2026-10-03T16:03:59.319Z | Started | E-003 actually restores the bound conversation, captures future calls, and leaves old summary bytes unchanged | N/A | native-transport-final.log |
| auto | E-003 | 2026-10-03T16:04:01.491Z | Completed | E-003 actually restores the bound conversation, captures future calls, and leaves old summary bytes unchanged | Pass | native-transport-final.log |
| 8 | R-001 | 2026-10-03 | Completed | Additional unchanged web lifecycle/history/ToolActivityItem: 8 files / 59 tests Pass | Pass | web-regressions.log |

## Re-entry And Reconciliation
Final E-001/E-002/E-003/R-001/L-001/B-001 all Pass. Initial fixture/probe-only failures preserved above and corrected before baseline completion. No remaining running/interrupted/unstarted planned case. Initial local fixture iteration results were appended at suite return; final acceptance reruns use immediate per-case Started/Completed hooks. Live checkpoints/completions recorded within the probe before next phase. No prior completed API result exists; these local iterations are not separate API revision rounds. Reconciled into canonical api-e2e-execution-coverage-report.md, Ledger Reconciliation section. Last final narrow event E-003 Pass; web-regression event R-001 Pass also recorded.

## API-REV-002 — latest-base renewal (initialized before execution)

E shorthand in this section is api-e2e-evidence/api-rev-002. Existing native hook native-transport-final.log resolves in that directory, not the historical round1 file. Runtime error helper child IDs API-D01/D02/A/T/O/C02 belong to F-001; its evidence prefix uses the supplied relative log path. Prior cases remain historical.

| Round | Case | UTC | Stage | Expected | Observed | Result | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| API-REV-002 | E-001 | planned | Planned | first typed STARTED/raw before terminal/all9/source-free history | Not started | Not Tested | E |
| API-REV-002 | E-002 | planned | Planned | absent and ambiguous truthful summary completion | Not started | Not Tested | E |
| API-REV-002 | E-003 | planned | Planned | actual restore/exact conversation/future full calls/old prefix unchanged | Not started | Not Tested | E |
| API-REV-002 | F-001 | planned | Planned | supplied message/privacy/partial work/normal next turn/restore | Not started | Not Tested | E |
| API-REV-002 | R-001 | planned | Planned | AGY preserved regression units/transports/web and compiler | Not started | Not Tested | E |
| API-REV-002 | L-001 | planned | Planned | actual native9 capture/file outcome | Not started | Not Tested | E |
| API-REV-002 | B-001 | planned | Planned | real live/saved rendered9 inputs/disclosure/narrow viewport | Not started | Not Tested | E |
| auto | E-001 | 2026-10-03T17:19:21.190Z | Started | E-001 captures complete typed first STARTED before terminal, then reopens without provider evidence | N/A | native-transport-final.log |
| auto | E-001 | 2026-10-03T17:19:22.587Z | Completed | E-001 captures complete typed first STARTED before terminal, then reopens without provider evidence | Pass | native-transport-final.log |
| auto | E-002 | 2026-10-03T17:19:22.587Z | Started | E-002 retains truthful summary and completion for SUMMARY_ONLY detail | N/A | native-transport-final.log |
| auto | E-002 | 2026-10-03T17:19:23.475Z | Completed | E-002 retains truthful summary and completion for SUMMARY_ONLY detail | Pass | native-transport-final.log |
| auto | E-002 | 2026-10-03T17:19:23.476Z | Started | E-002 retains truthful summary and completion for AMBIGUOUS detail | N/A | native-transport-final.log |
| auto | E-002 | 2026-10-03T17:19:24.397Z | Completed | E-002 retains truthful summary and completion for AMBIGUOUS detail | Pass | native-transport-final.log |
| auto | E-003 | 2026-10-03T17:19:24.399Z | Started | E-003 actually restores the bound conversation, captures future calls, and leaves old summary bytes unchanged | N/A | native-transport-final.log |
| auto | E-003 | 2026-10-03T17:19:26.640Z | Completed | E-003 actually restores the bound conversation, captures future calls, and leaves old summary bytes unchanged | Pass | native-transport-final.log |
| API-REV-002 | F-001 | 2026-10-03T17:19:43Z | Started | real error transport/privacy/next-turn/restore | Executing | N/A | E/runtime-error-transport.log |
| auto | API-D01 | 2026-10-03T17:19:53.442Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/../../api-e2e-evidence/api-rev-002/runtime-error-transport.log |
| auto | API-D01 | 2026-10-03T17:19:53.814Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/../../api-e2e-evidence/api-rev-002/runtime-error-transport.log |
| auto | API-D02 | 2026-10-03T17:19:53.815Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/../../api-e2e-evidence/api-rev-002/runtime-error-transport.log |
| auto | API-D02 | 2026-10-03T17:19:54.140Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/../../api-e2e-evidence/api-rev-002/runtime-error-transport.log |
| auto | API-A-01 | 2026-10-03T17:19:54.141Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/../../api-e2e-evidence/api-rev-002/runtime-error-transport.log |
| auto | API-A-01 | 2026-10-03T17:19:54.521Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/../../api-e2e-evidence/api-rev-002/runtime-error-transport.log |
| auto | API-A-02 | 2026-10-03T17:19:54.522Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/../../api-e2e-evidence/api-rev-002/runtime-error-transport.log |
| auto | API-A-02 | 2026-10-03T17:19:54.916Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/../../api-e2e-evidence/api-rev-002/runtime-error-transport.log |
| auto | API-A-03 | 2026-10-03T17:19:54.917Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/../../api-e2e-evidence/api-rev-002/runtime-error-transport.log |
| auto | API-A-03 | 2026-10-03T17:19:55.316Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/../../api-e2e-evidence/api-rev-002/runtime-error-transport.log |
| auto | API-A-04 | 2026-10-03T17:19:55.316Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/../../api-e2e-evidence/api-rev-002/runtime-error-transport.log |
| auto | API-A-04 | 2026-10-03T17:19:55.742Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/../../api-e2e-evidence/api-rev-002/runtime-error-transport.log |
| auto | API-A-05 | 2026-10-03T17:19:55.742Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/../../api-e2e-evidence/api-rev-002/runtime-error-transport.log |
| auto | API-A-05 | 2026-10-03T17:19:56.156Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/../../api-e2e-evidence/api-rev-002/runtime-error-transport.log |
| auto | API-A-06 | 2026-10-03T17:19:56.157Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/../../api-e2e-evidence/api-rev-002/runtime-error-transport.log |
| auto | API-A-06 | 2026-10-03T17:19:56.561Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/../../api-e2e-evidence/api-rev-002/runtime-error-transport.log |
| auto | API-A-07 | 2026-10-03T17:19:56.561Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/../../api-e2e-evidence/api-rev-002/runtime-error-transport.log |
| auto | API-A-07 | 2026-10-03T17:19:56.975Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/../../api-e2e-evidence/api-rev-002/runtime-error-transport.log |
| auto | API-T-01 | 2026-10-03T17:19:56.975Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/../../api-e2e-evidence/api-rev-002/runtime-error-transport.log |
| auto | API-T-01 | 2026-10-03T17:19:57.798Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/../../api-e2e-evidence/api-rev-002/runtime-error-transport.log |
| auto | API-T-02 | 2026-10-03T17:19:57.799Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/../../api-e2e-evidence/api-rev-002/runtime-error-transport.log |
| auto | API-T-02 | 2026-10-03T17:19:58.554Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/../../api-e2e-evidence/api-rev-002/runtime-error-transport.log |
| auto | API-T-03 | 2026-10-03T17:19:58.554Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/../../api-e2e-evidence/api-rev-002/runtime-error-transport.log |
| auto | API-T-03 | 2026-10-03T17:19:59.299Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/../../api-e2e-evidence/api-rev-002/runtime-error-transport.log |
| auto | API-T-04 | 2026-10-03T17:19:59.299Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/../../api-e2e-evidence/api-rev-002/runtime-error-transport.log |
| auto | API-T-04 | 2026-10-03T17:20:00.141Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/../../api-e2e-evidence/api-rev-002/runtime-error-transport.log |
| auto | API-T-05 | 2026-10-03T17:20:00.141Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/../../api-e2e-evidence/api-rev-002/runtime-error-transport.log |
| auto | API-T-05 | 2026-10-03T17:20:00.959Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/../../api-e2e-evidence/api-rev-002/runtime-error-transport.log |
| auto | API-T-06 | 2026-10-03T17:20:00.960Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/../../api-e2e-evidence/api-rev-002/runtime-error-transport.log |
| auto | API-T-06 | 2026-10-03T17:20:01.717Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/../../api-e2e-evidence/api-rev-002/runtime-error-transport.log |
| auto | API-T-07 | 2026-10-03T17:20:01.717Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/../../api-e2e-evidence/api-rev-002/runtime-error-transport.log |
| auto | API-T-07 | 2026-10-03T17:20:02.554Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/../../api-e2e-evidence/api-rev-002/runtime-error-transport.log |
| auto | API-O-01 | 2026-10-03T17:20:02.555Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/../../api-e2e-evidence/api-rev-002/runtime-error-transport.log |
| auto | API-O-01 | 2026-10-03T17:20:03.545Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/../../api-e2e-evidence/api-rev-002/runtime-error-transport.log |
| auto | API-O-02 | 2026-10-03T17:20:03.545Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/../../api-e2e-evidence/api-rev-002/runtime-error-transport.log |
| auto | API-O-02 | 2026-10-03T17:20:04.500Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/../../api-e2e-evidence/api-rev-002/runtime-error-transport.log |
| auto | API-O-03 | 2026-10-03T17:20:04.500Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/../../api-e2e-evidence/api-rev-002/runtime-error-transport.log |
| auto | API-O-03 | 2026-10-03T17:20:05.390Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/../../api-e2e-evidence/api-rev-002/runtime-error-transport.log |
| auto | API-O-04 | 2026-10-03T17:20:05.390Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/../../api-e2e-evidence/api-rev-002/runtime-error-transport.log |
| auto | API-O-04 | 2026-10-03T17:20:06.228Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/../../api-e2e-evidence/api-rev-002/runtime-error-transport.log |
| auto | API-O-05 | 2026-10-03T17:20:06.228Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/../../api-e2e-evidence/api-rev-002/runtime-error-transport.log |
| auto | API-O-05 | 2026-10-03T17:20:07.059Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/../../api-e2e-evidence/api-rev-002/runtime-error-transport.log |
| auto | API-O-06 | 2026-10-03T17:20:07.059Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/../../api-e2e-evidence/api-rev-002/runtime-error-transport.log |
| auto | API-O-06 | 2026-10-03T17:20:07.893Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/../../api-e2e-evidence/api-rev-002/runtime-error-transport.log |
| auto | API-O-07 | 2026-10-03T17:20:07.894Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/../../api-e2e-evidence/api-rev-002/runtime-error-transport.log |
| auto | API-O-07 | 2026-10-03T17:20:08.733Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/../../api-e2e-evidence/api-rev-002/runtime-error-transport.log |
| auto | API-C02 | 2026-10-03T17:20:08.734Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/../../api-e2e-evidence/api-rev-002/runtime-error-transport.log |
| auto | API-C02 | 2026-10-03T17:20:09.319Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/../../api-e2e-evidence/api-rev-002/runtime-error-transport.log |
| API-REV-002 | F-001 | 2026-10-03T17:20:09Z | Completed | real error transport/privacy/next-turn/restore | exit0 | Pass | E/runtime-error-transport.log |
| API-REV-002 | R-001 | 2026-10-03T17:20:35Z | Started | AGY regression/unit/preserved transports and web/tsc | Executing | N/A | E/regressions.log |
| API-REV-002 | R-001 | 2026-10-03T17:21:05Z | Checkpoint | production lifecycle/history/card/error regressions | exit0 | Pass | E/web-regressions.log |
| API-REV-002 | R-001 | 2026-10-03T17:21:07Z | Checkpoint | AGY server regressions | exit0 | Pass | E/regressions.log |
| API-REV-002 | R-001 | 2026-10-03T17:23:00.875552+00:00 | Checkpoint | focused production/native/error/routing compiler | source tsc0; expanded error-test tsc TS2769 recordCase Promise unknown | Fail | E/test-typecheck.log |
| auto | API-D01 | 2026-10-03T17:23:31.627Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/../../api-e2e-evidence/api-rev-002/transport-after-typing-fix.log |
| auto | API-D01 | 2026-10-03T17:23:32.030Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/../../api-e2e-evidence/api-rev-002/transport-after-typing-fix.log |
| auto | API-D02 | 2026-10-03T17:23:32.031Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/../../api-e2e-evidence/api-rev-002/transport-after-typing-fix.log |
| auto | API-D02 | 2026-10-03T17:23:32.354Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/../../api-e2e-evidence/api-rev-002/transport-after-typing-fix.log |
| auto | API-A-01 | 2026-10-03T17:23:32.355Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/../../api-e2e-evidence/api-rev-002/transport-after-typing-fix.log |
| auto | API-A-01 | 2026-10-03T17:23:32.732Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/../../api-e2e-evidence/api-rev-002/transport-after-typing-fix.log |
| auto | API-A-02 | 2026-10-03T17:23:32.732Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/../../api-e2e-evidence/api-rev-002/transport-after-typing-fix.log |
| auto | API-A-02 | 2026-10-03T17:23:33.109Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/../../api-e2e-evidence/api-rev-002/transport-after-typing-fix.log |
| auto | API-A-03 | 2026-10-03T17:23:33.109Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/../../api-e2e-evidence/api-rev-002/transport-after-typing-fix.log |
| auto | API-A-03 | 2026-10-03T17:23:33.486Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/../../api-e2e-evidence/api-rev-002/transport-after-typing-fix.log |
| auto | API-A-04 | 2026-10-03T17:23:33.487Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/../../api-e2e-evidence/api-rev-002/transport-after-typing-fix.log |
| auto | API-A-04 | 2026-10-03T17:23:33.867Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/../../api-e2e-evidence/api-rev-002/transport-after-typing-fix.log |
| auto | API-A-05 | 2026-10-03T17:23:33.868Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/../../api-e2e-evidence/api-rev-002/transport-after-typing-fix.log |
| auto | API-A-05 | 2026-10-03T17:23:34.239Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/../../api-e2e-evidence/api-rev-002/transport-after-typing-fix.log |
| auto | API-A-06 | 2026-10-03T17:23:34.240Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/../../api-e2e-evidence/api-rev-002/transport-after-typing-fix.log |
| auto | API-A-06 | 2026-10-03T17:23:34.623Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/../../api-e2e-evidence/api-rev-002/transport-after-typing-fix.log |
| auto | API-A-07 | 2026-10-03T17:23:34.624Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/../../api-e2e-evidence/api-rev-002/transport-after-typing-fix.log |
| auto | API-A-07 | 2026-10-03T17:23:34.998Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/../../api-e2e-evidence/api-rev-002/transport-after-typing-fix.log |
| auto | API-T-01 | 2026-10-03T17:23:34.999Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/../../api-e2e-evidence/api-rev-002/transport-after-typing-fix.log |
| auto | API-T-01 | 2026-10-03T17:23:35.790Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/../../api-e2e-evidence/api-rev-002/transport-after-typing-fix.log |
| auto | API-T-02 | 2026-10-03T17:23:35.790Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/../../api-e2e-evidence/api-rev-002/transport-after-typing-fix.log |
| auto | API-T-02 | 2026-10-03T17:23:36.554Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/../../api-e2e-evidence/api-rev-002/transport-after-typing-fix.log |
| auto | API-T-03 | 2026-10-03T17:23:36.554Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/../../api-e2e-evidence/api-rev-002/transport-after-typing-fix.log |
| auto | API-T-03 | 2026-10-03T17:23:37.313Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/../../api-e2e-evidence/api-rev-002/transport-after-typing-fix.log |
| auto | API-T-04 | 2026-10-03T17:23:37.314Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/../../api-e2e-evidence/api-rev-002/transport-after-typing-fix.log |
| auto | API-T-04 | 2026-10-03T17:23:38.085Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/../../api-e2e-evidence/api-rev-002/transport-after-typing-fix.log |
| auto | API-T-05 | 2026-10-03T17:23:38.086Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/../../api-e2e-evidence/api-rev-002/transport-after-typing-fix.log |
| auto | API-T-05 | 2026-10-03T17:23:38.844Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/../../api-e2e-evidence/api-rev-002/transport-after-typing-fix.log |
| auto | API-T-06 | 2026-10-03T17:23:38.845Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/../../api-e2e-evidence/api-rev-002/transport-after-typing-fix.log |
| auto | API-T-06 | 2026-10-03T17:23:39.594Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/../../api-e2e-evidence/api-rev-002/transport-after-typing-fix.log |
| auto | API-T-07 | 2026-10-03T17:23:39.595Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/../../api-e2e-evidence/api-rev-002/transport-after-typing-fix.log |
| auto | API-T-07 | 2026-10-03T17:23:40.399Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/../../api-e2e-evidence/api-rev-002/transport-after-typing-fix.log |
| auto | API-O-01 | 2026-10-03T17:23:40.399Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/../../api-e2e-evidence/api-rev-002/transport-after-typing-fix.log |
| API-REV-002 | R-001 | 2026-10-03T17:23:40.535968+00:00 | Checkpoint | expanded focused compiler after generic signature fix | exit0; signature-only test helper fix | Pass | E/test-typecheck-final.log |
| auto | API-O-01 | 2026-10-03T17:23:41.264Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/../../api-e2e-evidence/api-rev-002/transport-after-typing-fix.log |
| auto | API-O-02 | 2026-10-03T17:23:41.265Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/../../api-e2e-evidence/api-rev-002/transport-after-typing-fix.log |
| auto | API-O-02 | 2026-10-03T17:23:42.173Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/../../api-e2e-evidence/api-rev-002/transport-after-typing-fix.log |
| auto | API-O-03 | 2026-10-03T17:23:42.174Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/../../api-e2e-evidence/api-rev-002/transport-after-typing-fix.log |
| auto | API-O-03 | 2026-10-03T17:23:43.028Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/../../api-e2e-evidence/api-rev-002/transport-after-typing-fix.log |
| auto | API-O-04 | 2026-10-03T17:23:43.028Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/../../api-e2e-evidence/api-rev-002/transport-after-typing-fix.log |
| auto | API-O-04 | 2026-10-03T17:23:43.881Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/../../api-e2e-evidence/api-rev-002/transport-after-typing-fix.log |
| auto | API-O-05 | 2026-10-03T17:23:43.881Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/../../api-e2e-evidence/api-rev-002/transport-after-typing-fix.log |
| auto | API-O-05 | 2026-10-03T17:23:44.737Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/../../api-e2e-evidence/api-rev-002/transport-after-typing-fix.log |
| auto | API-O-06 | 2026-10-03T17:23:44.738Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/../../api-e2e-evidence/api-rev-002/transport-after-typing-fix.log |
| auto | API-O-06 | 2026-10-03T17:23:45.589Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/../../api-e2e-evidence/api-rev-002/transport-after-typing-fix.log |
| auto | API-O-07 | 2026-10-03T17:23:45.589Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/../../api-e2e-evidence/api-rev-002/transport-after-typing-fix.log |
| auto | API-O-07 | 2026-10-03T17:23:46.502Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/../../api-e2e-evidence/api-rev-002/transport-after-typing-fix.log |
| auto | API-C02 | 2026-10-03T17:23:46.503Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/../../api-e2e-evidence/api-rev-002/transport-after-typing-fix.log |
| auto | API-C02 | 2026-10-03T17:23:47.083Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/../../api-e2e-evidence/api-rev-002/transport-after-typing-fix.log |
| auto | E-001 | 2026-10-03T17:23:49.964Z | Started | E-001 captures complete typed first STARTED before terminal, then reopens without provider evidence | N/A | native-transport-final.log |
| auto | E-001 | 2026-10-03T17:23:51.447Z | Completed | E-001 captures complete typed first STARTED before terminal, then reopens without provider evidence | Pass | native-transport-final.log |
| auto | E-002 | 2026-10-03T17:23:51.447Z | Started | E-002 retains truthful summary and completion for SUMMARY_ONLY detail | N/A | native-transport-final.log |
| auto | E-002 | 2026-10-03T17:23:52.478Z | Completed | E-002 retains truthful summary and completion for SUMMARY_ONLY detail | Pass | native-transport-final.log |
| auto | E-002 | 2026-10-03T17:23:52.479Z | Started | E-002 retains truthful summary and completion for AMBIGUOUS detail | N/A | native-transport-final.log |
| auto | E-002 | 2026-10-03T17:23:53.425Z | Completed | E-002 retains truthful summary and completion for AMBIGUOUS detail | Pass | native-transport-final.log |
| auto | E-003 | 2026-10-03T17:23:53.426Z | Started | E-003 actually restores the bound conversation, captures future calls, and leaves old summary bytes unchanged | N/A | native-transport-final.log |
| auto | E-003 | 2026-10-03T17:23:55.695Z | Completed | E-003 actually restores the bound conversation, captures future calls, and leaves old summary bytes unchanged | Pass | native-transport-final.log |
| API-REV-002 | F-001/E-001/E-002/E-003 | 2026-10-03T17:23:55Z | Completed final rerun | same transport after type-only helper change | exit0 | Pass | E/transport-after-typing-fix.log |
| API-REV-002 | R-001 | 2026-10-03T17:24:48.003881+00:00 | Completed | server/web/production and expanded-test compiler | 292server +87web Pass; source/focused tsc0; final28 transport Pass after type-only fix | Pass | E/regressions.log +web-regressions.log +test-typecheck-final.log |

Final native hooks emitted their unchanged native-transport-final.log label; for hooks following the compiler-fix checkpoint, authoritative execution log is E/transport-after-typing-fix.log. These are repeated same IDs, not extra independent acceptance cases.
| live | L-001 | 2026-10-03T17:24:56.638Z | Started | Real AGY 1.2.16 via actual Studio backend; disposable app/workspace | N/A | api-e2e-evidence/api-rev-002/live-native.json / browser.json |
| live | B-001 | 2026-10-03T17:25:19.744Z | Started | Nuxt real HTTP hydration and production AgentStreamingService ready before native send | N/A | api-e2e-evidence/api-rev-002/live-native.json / browser.json |
| live | B-001 | 2026-10-03T17:25:37.667Z | Checkpoint | Live stream-rendered replacement JSON exact while actual native command RUNNING | N/A | api-e2e-evidence/api-rev-002/live-native.json / browser.json |
| live | L-001 | 2026-10-03T17:25:44.267Z | Completed | Nine real native calls: provider actual typed args = first STARTED = terminal = raw disk; repeated edits and final file exact | Pass | api-e2e-evidence/api-rev-002/live-native.json / browser.json |
| live | B-001 | 2026-10-03T17:25:45.329Z | Completed | Actual live WS handlers and fresh network-only history hydration rendered nine equal native argument objects; disclosure/collapse/narrow overflow Pass | Pass | api-e2e-evidence/api-rev-002/live-native.json / browser.json |

| API-REV-002 | All7 / cleanup | 2026-10-03T17:34:19.472131+00:00 | Reconciled | completed cases and owned resources cleaned | E001/E002/E003/F001/R001/L001/B001 Pass;5roots absent2ports closed3temporaryfiles absent | Pass | E/cleanup-audit.json +canonical report |
