# API/E2E Test-Case Ledger
Round 1; worktree and authority: api-e2e-coverage-investigation.md.
Required: multiple independently meaningful cases and long-running real desktop.
## Planned cases
| ID | Case | AC | Surface | State |
| --- | --- | --- | --- | --- |
| C-001 | Converter/normalizer/opaque-history units | AC-001–003 | Server Vitest | Planned |
| C-002 | MCP success/preservation WebSocket + reopened history | AC-001/003 | Real server, fake CLI | Planned |
| C-003 | Old/new history + broader AGY regression | AC-003 | GraphQL/history + server | Planned |
| C-004 | Consumer guards and leases | AC-002 | Nuxt/Electron | Planned |
| C-005 | Two real automatic visible opens | AC-001 | Isolated fixed desktop/real AGY | Planned |
| C-006 | Saved run reopen / cleanup | AC-003 | Desktop + process lifecycle | Planned |
## Execution events
No execution started.

| 1 | C-001 | Started | Narrow server converter/normalizer/history units | Pending |
| 2 | C-001 | Completed | 78 tests / 3 files passed | Pass; evidence/api-e2e/c001.log |
| 3 | C-002/C-003 | Started | Extended WebSocket and saved history matrix | Pending |
| 4 | C-002 | Completed | 14 provider calls: exact wire results, one terminal each, live + terminated projection | Pass; c002.log, agy-mcp-tool-call-transport.json |
| 5 | C-003 | Checkpoint | Old nested/new canonical saved GraphQL read preserved bytes | Pass; c002.log |
| 6 | C-003 | Started | Broader failure/background/history E2E | Pending |
| 7 | C-003 | Checkpoint | Broader command completed: 9 passed, 5 failed | GraphQL Codex fixtures unavailable at admission boundary; c003.log |
| 8 | C-004 | Started | Renderer guards / web boundary / Electron ownership | Pending |
| 9 | C-003 | Completed | Admission fixture maintenance rerun: 14/14 passed; no source changes | Pass; c003-rerun.log; initial failures retained |
| 10 | C-004 | Completed | 9 Nuxt/guard + 22 Electron passed | Pass; c004 logs |
| 11 | C-005 | Started | Broader gate 85.71%; isolated fixed desktop real AGY | Pending |
| 12 | C-005 | Checkpoint | Real second open 874f12; Activity → Browser automatically; native /second 696x757 | Direct positive observation; second JSON/PNG evidence |
| 13 | C-005 | Checkpoint | Third 2a801b automatically selected Browser from Activity, all prior sessions retained | Positive shell/DOM evidence; awaiting correlated assertions |
| 14 | C-006 | Started | Terminate/reopen saved conversation through UI; session continuity | Pending |
| 15 | C-005 | Completed | Correlated real trace/shell/DOM/native assertions passed for two Activity-origin opens | Pass; desktop-assertions.json |
| 16 | C-006 | Checkpoint | Terminated saved run reopened via UI, 3 exact GraphQL results, no refocus/session changes | Pass; desktop-assertions.json; cleanup next |
| 17 | C-006 | Completed | Owned isolated app stopped/data removed/ports free; owned page server stopped/port free | Pass; desktop-cleanup.json, local-page-cleanup.json |
| 18 | C-002/C-003 | Started | Final combined server rerun after import-order cleanup | Pending; final-server-e2e.log |
| 19 | C-002/C-003 | Completed | Final combined suite 15/15 passed in 5 files | Pass; final-server-e2e.log |

## Reconciliation
C-001–006 final Pass. Last event 19 final combined rerun passed. No interrupted/unstarted/running cases. Reconciled into api-e2e-execution-coverage-report.md, API-REV-001.
