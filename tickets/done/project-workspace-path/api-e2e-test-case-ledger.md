# API/E2E Test-Case Ledger — Project workspace paths

Round 1, 2026-10-07, API-REV-001 planned. Canonical investigation/report/revision in this directory. Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/project-workspace-path`. Evidence `api-e2e-evidence/api-001/`. Required for independent cases, long-running checks and continuity. No completed result inferred.

## Planned cases
| ID | Scenario / expected result | AC | Initial status |
| --- | --- | --- | --- |
| API-001 | Owner/schema/registry/migration unit regressions pass | 001–006 | Not Tested |
| API-002 | Native/scoped-MCP path contract, auth/atomicity and Task preservation pass | 001/002/003/006 | Not Tested |
| API-003 | Aggregate/direct GraphQL historical and exact-save paths pass | 002–006 | Not Tested |
| API-004 | Two built nodes, local paths and restart unchanged bytes pass | 002/004/006 | Not Tested |
| API-005 | Both startup entrypoints retain migration/no-write continuity | 004 | Not Tested |
| API-006 | Strict feed path update/unlink/reconnect and Task roots pass | 002/005 | Not Tested |
| API-007 | Broader Project/Task integration regressions pass | Preserved | Not Tested |
| API-008 | Nuxt Project component/store regressions pass | 005/006 | Not Tested |
| API-009 | Browser PT-E2E journeys prove picker/manual/edit/unlink/reload | 002/003/005/006 | Not Tested |

## Execution events
Events appended immediately after each attempt. Started/checkpoint is not final proof. Build/setup receipts are prerequisites, not acceptance cases.

Build prerequisite: Pass (prebuild.log/build.log, current source, serialized). API-001 Started: owner units.

API-001 Completed: Pass, 17 files / 240 tests; owner.log (see log authoritative totals).
API-002 Started: pnpm -C autobyteus-server-ts exec vitest run tests/e2e/projects/project-task-boundaries.e2e.test.ts --no-watch.

API-002 Completed: Pass, 8/8, http-1.log; real Studio/scoped MCP/native/disk, owned cleanup passed.
API-003 Started: projects-graphql.e2e.test.ts, --no-watch.

API-003 Completed: Pass, 10/10, graphql-1.log; schema/resolver/store/registry actual, process managers emulated empty only for global unregistration guard.
API-004 Started: built node locality/restart suite.

API-004 Completed: Pass, 1/1, nodes-1.log; A and B restart, exact saved keys/bytes, foreign Project denial; both children/listeners/private roots cleaned.
API-005 Started: projects-startup-migration.e2e.test.ts --no-watch, current dist.

API-005 Completed: Pass, 5/5, startup-1.log; actual Studio/Standalone startup, frozen migration/retry/terminal no-op, historical per-folder no-write/restart and ordinary-save reduction.
API-006 Started: RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=$PWD/autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs pnpm -C autobyteus-server-ts exec vitest run tests/e2e/projects/project-change-feed.e2e.test.ts --no-watch.

API-008 Started (independent web suite while API-006 runs): pnpm -C autobyteus-web test:nuxt components/projects stores/__tests__/projectStore.spec.ts utils/projects --run.

API-006 Completed: Pass, 7/7, feed-1.log and feed-receipt/; actual HTTP/WS/scoped MCP with scripted AGY actor, strict current frames, path edits/unlink/reconnect.
API-008 Completed: Pass, 15 files / 119 tests, web-1.log.
API-007 Started: broad Projects suite with deterministic AGY flags; external provider flags unset.

API-007 Completed: Pass, 8 files / 41 passed / 1 skipped (real-Claude memory test not enabled), projects-all-1.log.
Post-repository confidence: 91.43%; browser required.
API-009 Started: pnpm -C autobyteus-web test:e2e:projects --skip-server-build --output-dir=<ticket>/api-e2e-evidence/api-001/browser-1 --ledger-file=<ticket>/api-e2e-test-case-ledger.md. Current built source; real owned nodes/Nuxt/Chrome; no provider calls.

PT-E2E-001: Pass; Fresh node: Projects always available after Agent Orgs, /projects opens; separate-node API isolation (projects-always-on AC-001); /Users/normy/autobyteus_org/autobyteus-worktrees/project-workspace-path/tickets/in-progress/project-workspace-path/api-e2e-evidence/api-001/browser-1/result.json

PT-E2E-002: Pass; Ordinary New Project validation/focus/Cancel and zero-link save to Tasks; /Users/normy/autobyteus_org/autobyteus-worktrees/project-workspace-path/tickets/in-progress/project-workspace-path/api-e2e-evidence/api-001/browser-1/result.json

PT-E2E-003: Pass; Picker/manual share one path; exact entries, no registration/mkdir, unavailable link editing; /Users/normy/autobyteus_org/autobyteus-worktrees/project-workspace-path/tickets/in-progress/project-workspace-path/api-e2e-evidence/api-001/browser-1/result.json

PT-E2E-004: Pass; Invalid paths/canonical duplicates and failed transport preserve Project, registry and folders; /Users/normy/autobyteus_org/autobyteus-worktrees/project-workspace-path/tickets/in-progress/project-workspace-path/api-e2e-evidence/api-001/browser-1/result.json

PT-E2E-005: Pass; Task ordinary composer validation, search-preserving Cancel, typed/file save clears search; /Users/normy/autobyteus_org/autobyteus-worktrees/project-workspace-path/tickets/in-progress/project-workspace-path/api-e2e-evidence/api-001/browser-1/result.json

PT-E2E-006: Pass; Concise detail, HTTP download, edit Cancel then save preserves ID/status/context; inline deletion focus/Escape; /Users/normy/autobyteus_org/autobyteus-worktrees/project-workspace-path/tickets/in-progress/project-workspace-path/api-e2e-evidence/api-001/browser-1/result.json

PT-E2E-007: Pass; External native tool commit -> physical non-deduplicated Refresh preserves search/route and moves status; /Users/normy/autobyteus_org/autobyteus-worktrees/project-workspace-path/tickets/in-progress/project-workspace-path/api-e2e-evidence/api-001/browser-1/result.json

PT-E2E-008: Pass; Failed Refresh retains prior success and persistent actionable error, then retry; no-match and empty are distinct; /Users/normy/autobyteus_org/autobyteus-worktrees/project-workspace-path/tickets/in-progress/project-workspace-path/api-e2e-evidence/api-001/browser-1/result.json

PT-E2E-009: Pass; Continuous divided rows and desktop/narrow container breakpoint, ordinary page wrapping; /Users/normy/autobyteus_org/autobyteus-worktrees/project-workspace-path/tickets/in-progress/project-workspace-path/api-e2e-evidence/api-001/browser-1/result.json

PT-E2E-010: Pass; Real backend process restart preserves Tasks, context HTTP bytes and links; /Users/normy/autobyteus_org/autobyteus-worktrees/project-workspace-path/tickets/in-progress/project-workspace-path/api-e2e-evidence/api-001/browser-1/result.json

PT-E2E-011: Pass; All-Task Project deletion includes Done; Cancel preserves originals, explicit cascade affects only Project; /Users/normy/autobyteus_org/autobyteus-worktrees/project-workspace-path/tickets/in-progress/project-workspace-path/api-e2e-evidence/api-001/browser-1/result.json

PT-E2E-012: Pass; Ordinary route read/Refresh ordering: late old Project response cannot populate another Project; /Users/normy/autobyteus_org/autobyteus-worktrees/project-workspace-path/tickets/in-progress/project-workspace-path/api-e2e-evidence/api-001/browser-1/result.json

PT-E2E-013: Pass; 120 current Tasks: complete search/counts/no-match across statuses, no truncation or mutation; /Users/normy/autobyteus_org/autobyteus-worktrees/project-workspace-path/tickets/in-progress/project-workspace-path/api-e2e-evidence/api-001/browser-1/result.json

PT-E2E-014: Pass; Task keyboard create/edit/inline-confirmed delete plus unknown Project/Task recovery; /Users/normy/autobyteus_org/autobyteus-worktrees/project-workspace-path/tickets/in-progress/project-workspace-path/api-e2e-evidence/api-001/browser-1/result.json

PT-E2E-015: Pass; Upgraded node with the retired flag stored as false: Projects still shown and opens, no Basics switch, the key is an ordinary deletable Advanced setting (projects-always-on AC-002/003); /Users/normy/autobyteus_org/autobyteus-worktrees/project-workspace-path/tickets/in-progress/project-workspace-path/api-e2e-evidence/api-001/browser-1/result.json

PT-E2E-016: Pass; zh-CN ordinary Project/Task forms/board/detail contain localized controls and no raw Project keys; /Users/normy/autobyteus_org/autobyteus-worktrees/project-workspace-path/tickets/in-progress/project-workspace-path/api-e2e-evidence/api-001/browser-1/result.json

API-009 Completed attempt 1: Pass, 16/16 PT-E2E cases, browser-1/result.json. No page errors. Chrome 154.0.8037.98, 1512x862; Task layout additionally 390x844/en+zh-CN. Actual browser/backend reload and backend restart. Owned browser/processes exited, three ports released and temp root removed.

API-009 Started attempt 2: same command/config, browser-2 fresh directory; PT-E2E-004 fresh response and exact rejected-request count refinement.

PT-E2E-001: Pass; Fresh node: Projects always available after Agent Orgs, /projects opens; separate-node API isolation (projects-always-on AC-001); /Users/normy/autobyteus_org/autobyteus-worktrees/project-workspace-path/tickets/in-progress/project-workspace-path/api-e2e-evidence/api-001/browser-2/result.json

PT-E2E-002: Pass; Ordinary New Project validation/focus/Cancel and zero-link save to Tasks; /Users/normy/autobyteus_org/autobyteus-worktrees/project-workspace-path/tickets/in-progress/project-workspace-path/api-e2e-evidence/api-001/browser-2/result.json

PT-E2E-003: Pass; Picker/manual share one path; exact entries, no registration/mkdir, unavailable link editing; /Users/normy/autobyteus_org/autobyteus-worktrees/project-workspace-path/tickets/in-progress/project-workspace-path/api-e2e-evidence/api-001/browser-2/result.json

PT-E2E-004: Pass; Invalid paths/canonical duplicates and failed transport preserve Project, registry and folders; /Users/normy/autobyteus_org/autobyteus-worktrees/project-workspace-path/tickets/in-progress/project-workspace-path/api-e2e-evidence/api-001/browser-2/result.json

PT-E2E-005: Pass; Task ordinary composer validation, search-preserving Cancel, typed/file save clears search; /Users/normy/autobyteus_org/autobyteus-worktrees/project-workspace-path/tickets/in-progress/project-workspace-path/api-e2e-evidence/api-001/browser-2/result.json

PT-E2E-006: Pass; Concise detail, HTTP download, edit Cancel then save preserves ID/status/context; inline deletion focus/Escape; /Users/normy/autobyteus_org/autobyteus-worktrees/project-workspace-path/tickets/in-progress/project-workspace-path/api-e2e-evidence/api-001/browser-2/result.json

PT-E2E-007: Pass; External native tool commit -> physical non-deduplicated Refresh preserves search/route and moves status; /Users/normy/autobyteus_org/autobyteus-worktrees/project-workspace-path/tickets/in-progress/project-workspace-path/api-e2e-evidence/api-001/browser-2/result.json

PT-E2E-008: Pass; Failed Refresh retains prior success and persistent actionable error, then retry; no-match and empty are distinct; /Users/normy/autobyteus_org/autobyteus-worktrees/project-workspace-path/tickets/in-progress/project-workspace-path/api-e2e-evidence/api-001/browser-2/result.json

PT-E2E-009: Pass; Continuous divided rows and desktop/narrow container breakpoint, ordinary page wrapping; /Users/normy/autobyteus_org/autobyteus-worktrees/project-workspace-path/tickets/in-progress/project-workspace-path/api-e2e-evidence/api-001/browser-2/result.json

PT-E2E-010: Pass; Real backend process restart preserves Tasks, context HTTP bytes and links; /Users/normy/autobyteus_org/autobyteus-worktrees/project-workspace-path/tickets/in-progress/project-workspace-path/api-e2e-evidence/api-001/browser-2/result.json

PT-E2E-011: Pass; All-Task Project deletion includes Done; Cancel preserves originals, explicit cascade affects only Project; /Users/normy/autobyteus_org/autobyteus-worktrees/project-workspace-path/tickets/in-progress/project-workspace-path/api-e2e-evidence/api-001/browser-2/result.json

PT-E2E-012: Pass; Ordinary route read/Refresh ordering: late old Project response cannot populate another Project; /Users/normy/autobyteus_org/autobyteus-worktrees/project-workspace-path/tickets/in-progress/project-workspace-path/api-e2e-evidence/api-001/browser-2/result.json

PT-E2E-013: Pass; 120 current Tasks: complete search/counts/no-match across statuses, no truncation or mutation; /Users/normy/autobyteus_org/autobyteus-worktrees/project-workspace-path/tickets/in-progress/project-workspace-path/api-e2e-evidence/api-001/browser-2/result.json

PT-E2E-014: Pass; Task keyboard create/edit/inline-confirmed delete plus unknown Project/Task recovery; /Users/normy/autobyteus_org/autobyteus-worktrees/project-workspace-path/tickets/in-progress/project-workspace-path/api-e2e-evidence/api-001/browser-2/result.json

PT-E2E-015: Pass; Upgraded node with the retired flag stored as false: Projects still shown and opens, no Basics switch, the key is an ordinary deletable Advanced setting (projects-always-on AC-002/003); /Users/normy/autobyteus_org/autobyteus-worktrees/project-workspace-path/tickets/in-progress/project-workspace-path/api-e2e-evidence/api-001/browser-2/result.json

PT-E2E-016: Pass; zh-CN ordinary Project/Task forms/board/detail contain localized controls and no raw Project keys; /Users/normy/autobyteus_org/autobyteus-worktrees/project-workspace-path/tickets/in-progress/project-workspace-path/api-e2e-evidence/api-001/browser-2/result.json

API-009 Completed attempt 2: Pass, 16/16, browser-2/result.json; fresh GraphQL WORKSPACE_PATH_INVALID/WORKSPACE_ALREADY_LINKED receipts, exact single 503 attempt, all DOM/disk/no-side-effect/reload/restart assertions. No page errors. Owned process/port/root cleanup passed. Earlier attempt retained, not overwritten.
Final audit: source diff check Pass; no product source/historical fixture edits; generated SDK outputs created by prebuild removed; no owned runtime processes remain (cleanup.json).

## Final reconciliation — 2026-10-07
API-001–009: **Pass** in approved deterministic web/API scope. API-007 includes one explicitly gated real-Claude case **Not Tested**, not an in-scope failure. PT-E2E-001–016 passed in both browser attempts (individual events above); final evidence is browser-2. No in-scope case running/interrupted/unstarted. Last durable event: completed browser-2 and cleanup audit. Reconciled into canonical api-e2e-execution-coverage-report.md API-REV-001; final confidence95.00%, Medium/High, proportional test review required.
