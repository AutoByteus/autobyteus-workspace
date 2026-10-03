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
