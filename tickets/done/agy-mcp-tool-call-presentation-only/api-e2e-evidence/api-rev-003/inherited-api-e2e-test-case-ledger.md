# API/E2E Test-Case Ledger

## Ledger Meta

- Assigned task workspace / worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/agy-mcp-tool-call-presentation`
- Coverage investigation: `tickets/in-progress/agy-mcp-tool-call-presentation/api-e2e-coverage-investigation.md`
- Execution coverage report: `tickets/in-progress/agy-mcp-tool-call-presentation/api-e2e-execution-coverage-report.md`
- API/E2E revision record: `tickets/in-progress/agy-mcp-tool-call-presentation/api-e2e-revision-record.md`
- Ledger scope and reason it is required: eight independent cases, two live and long-running
- Last updated: 2026-09-30

## Planned Cases

| Case ID | Case / Journey | Requirement / AC IDs | Boundary / Execution Surface | Planned Command Or Entry Point | Planned Order | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| TC-001 | Converter and projection unit tests | AC-001..008 | Backend logic | Vitest, two unit files | 1 | |
| TC-002 | AGY regression: unit folder, source compile, existing fake-AGY transport e2e | REQ-005 | Backend + server transport | Vitest, tsc | 2 | |
| TC-003 | New deterministic MCP transport e2e | AC-001, 003..008; DEC-005 | Real server, WebSocket, history, Files | Vitest with fake AGY CLI | 3 | New durable test |
| TC-004 | Old stored run reopened (SCN-004) | BEH-006 | Persisted data, history reader | Temporary two-phase probe | 4 | |
| TC-005 | Live AGY Team/Org `send_message_to` | AC-002, REQ-002, 006 | Real AGY CLI + real server | `RUN_AGY_E2E=1` roundtrip e2e | 5 | Needs model quota |
| TC-006 | Real AGY 1.2.14 capture through the converter | AC-003, 005, 008 | Real provider payloads | Temporary probe | 6 | |
| TC-007 | Activity panel shows `delegate_task` | AC-001 (rendered part) | Browser, worktree stack | Decided after repository evidence | 7 | |
| TC-008 | Updated native-image guard | REQ-005 | Live AGY image | `RUN_AGY_CAPABILITY_E2E=1` | 8 | Needs image quota |

## Execution Events

| Sequence | Case ID | Timestamp | Event | Command / Entry Point / Material Configuration | Expected Observable Result | Observed Result Or Checkpoint | Result | Evidence / Artifact Path | Next Action / Unresolved Issue |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | TC-001 | 2026-09-30 11:13 | Completed | vitest run agy-mcp-tool-call.test.ts agy-stream-event-converter.test.ts | All tests pass | 2 files, 63 of 63 passed | Pass | api-e2e-evidence/tc-001-unit.log | TC-002 |
| 2 | TC-002 | 2026-09-30 11:14 | Completed | vitest run tests/unit/agent-execution/backends/antigravity; tsc -p tsconfig.build.json --noEmit; RUN_AGY_FAILURE_E2E=1 fake-AGY transport e2e (background-task, failure, native-image-step-output) | All pass | Unit folder 143 passed, 5 skipped (opt-in live); tsc exit 0; 3 e2e files, 8 of 8 passed | Pass | api-e2e-evidence/tc-002-*.log | TC-003 |
| 3 | TC-003 | 2026-09-30 11:16 | Completed | AGY_MCP_EVIDENCE_DIR=... RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=tests/fixtures/agy-failure-cli.mjs vitest run tests/e2e/runtime/agy-mcp-tool-call-transport.e2e.test.ts | WebSocket events, history projection (live and after termination) and Files show real names, own arguments, structured JSON output, failure under real name, fallback for incomplete wrapper, native unchanged, one Files entry for MCP generate_image | 1 of 1 passed. First attempt failed only on my own wrong expectation of the Files path (workspace-relative, not absolute); corrected and rerun | Pass | api-e2e-evidence/tc-003-mcp-transport.log, api-e2e-evidence/agy-mcp-tool-call-transport.json | TC-004 |
| 4 | TC-004 | 2026-09-30 11:17 | Completed | Temporary two-phase probe (removed): phase write with agy-stream-event-converter.ts checked out from base 5c6fb95ea, fake AGY mcp_calls turn, run terminated, server closed; converter restored to HEAD; phase read in a new server process on the same data dir | Reopened run shows call_mcp_tool with wrapper arguments and raw text output, identical to the projection the base version produced | Read phase passed: projection identical; activities view_file + 5x call_mcp_tool; delegate_task call shows wrapper args and unparsed JSON text. Also ran the new TC-003 test against the base converter: it fails on the first name assertion, so the test detects the change | Pass | api-e2e-evidence/tc-004-*.log, tc-004-old-run-written-by-base.json, tc-004-old-run-read-by-current.json, tc-003-sensitivity-on-base-converter.log | TC-006 |
| 5 | TC-006 | 2026-09-30 11:18 | Completed | Temporary vitest probe (removed) feeding agy-mcp-call-shape-probe/stdout.jsonl (real AGY 1.2.14 stream) through AgyStreamEventConverter | mcp__shape-test__<tool> at start and end, arguments equal to what the MCP server received, JSON result structured, plain text unchanged, ERROR as failed with provider message, native view_file unchanged | 1 of 1 passed; no event named call_mcp_tool | Pass | api-e2e-evidence/tc-006-real-capture.log, tc-006-real-capture-events.json | TC-005 |
| 6 | TC-005 | 2026-09-30 11:18 | Started | RUN_AGY_E2E=1 vitest run tests/e2e/runtime/agy-team-inter-agent-roundtrip.e2e.test.ts (real agy 1.2.14, model quota) | Both live tests pass with send_message_to and unwrapped arguments | running | N/A | api-e2e-evidence/tc-005-live-roundtrip.log | wait for completion |
| 7 | TC-005 | 2026-09-30 11:20 | Completed | RUN_AGY_E2E=1 vitest run tests/e2e/runtime/agy-team-inter-agent-roundtrip.e2e.test.ts (real agy 1.2.14, gemini model) | Both live tests pass: tool events named send_message_to with unwrapped arguments at start and success | 2 of 2 passed in 74 s (Team roundtrip 41 s, Org direct and nested members 29 s) | Pass | api-e2e-evidence/tc-005-live-roundtrip.log | TC-007 (browser) |
| 8 | TC-007 | 2026-09-30 11:24 | Completed | node api-e2e-evidence/tc-007-activity-panel-probe.mjs: headless Chrome -> Nuxt dev -> built backend (dist/app.js) on free ports, temp data root, fake AGY CLI case mcp_calls; user journey Chat -> Antigravity runtime -> folder -> send | Activity panel shows one item per call titled with the real tool; delegate_task shows {description, recipient_address} and structured result; same after reload and after stop + reopen | Pass on second run. First run stopped in my probe's own section-reading code (it collapsed the items); titles were already correct. Titles: view_file, delegate_task, mcp__shape-test__echo_args, mcp__shape-test__json_result, mcp__shape-test__always_fails (FAILED), call_mcp_tool (incomplete wrapper), generate_image. No page errors | Pass | api-e2e-evidence/tc-007-activity-panel-evidence.json, tc-007-live-activity.png, tc-007-reopened-activity.png, tc-007-backend.log, tc-007-frontend.log | TC-008 decision; pnpm test:e2e |
| 9 | TC-008 | 2026-09-30 11:25 | Completed | RUN_AGY_CAPABILITY_E2E=1 vitest run tests/e2e/runtime/agy-native-image-app-chat.e2e.test.ts (real agy, one native image) | Native generate_image test passes with the guard now rejecting call_mcp_tool and mcp__* starts | 1 passed, 1 skipped (the Codex-package case needs AGY_CODEX_PACKAGE_ROOT, unrelated) | Pass | api-e2e-evidence/tc-008-native-image.log, tc-008-native-image/app-native-image-chat.json | pnpm test:e2e regression |
| 10 | REG | 2026-09-30 11:32 | Completed | pnpm test:e2e (deterministic server E2E suite); then the 12 failing files rerun with the base converter; then token-usage file alone on HEAD | No failure caused by this change | Suite: 54 files passed, 12 failed, 28 skipped (196 tests passed, 43 failed, 109 skipped). No failing file is under tests/e2e/runtime or touches AGY. With the base converter, 41 of the 43 fail identically; the other 2 (token-usage) pass alone on both base and HEAD and failed in the full run on an extra usage row from another file | N/A | api-e2e-evidence/regression-test-e2e.log, regression-failing-files-on-base-converter.log, regression-token-usage-head-alone.log | Reported as pre-existing, not investigated |

## Re-entry And Reconciliation

- Last durably recorded event: sequence 10 (REG Completed)
- Last completed case and result: TC-008 Pass; regression suite recorded as REG
- Cases still running, interrupted, or not started: none
- Next case or recovery action: none
- Interruption, context-compression, or rerun note: none. TC-003 and TC-007 each needed a second run after a correction to my own test/probe code; both noted in their rows.
- Reconciled into execution coverage report: `Yes` — `api-e2e-execution-coverage-report.md`, "Test-Case Ledger Reconciliation"
- Reconciliation note for any case missing a terminal result: none

## API-REV-002 current combined plan — 2026-10-01

Basis SR-005 / IR-002 / CRR-001; Large/High. TC-009 build/migration, TC-010 full unit/architecture, TC-011 full integration, TC-012 deterministic E2E, TC-001/002/003 fake AGY, TC-005/008 live AGY, TC-007 renderer, TC-013 isolated desktop. All Not Tested at initialization. Prior TC results are historical, not current Pass.

| Case | Event/result | Evidence / next action |
| --- | --- | --- |
| TC-009 | Fresh build Pass; corrected migration running | api-e2e-evidence/api-rev-002/server-build.log (exit 0); migration.log/json pending |
| TC-009 | Pass — fresh build and 5/5 migration cases | server-build.log; migration.json/log; restored exact populated Org task ledger on initial/retry/relaunch paths. CR-F001 reviewer closure pending. |
| TC-010 | Fail — exit 1; {"numPassedTests": 4126, "numFailedTests": 2, "numPendingTests": 6, "numTotalTests": 4134, "numRuntimeErrorTestSuites": null} | api-e2e-evidence/api-rev-002/unit-architecture.log/json; opt-in pending are Not Tested, not passes |
| TC-011 | Started; unresolved | integration.log; exact command in commands.json |
| TC-011 | Pass — exit 0; {"numPassedTests": 318, "numFailedTests": 0, "numPendingTests": 64, "numTotalTests": 382, "numRuntimeErrorTestSuites": null} | api-e2e-evidence/api-rev-002/integration.log/json; opt-in pending are Not Tested, not passes |
| TC-012 | Started; unresolved | deterministic-e2e.log; exact command in commands.json |
| TC-012 | Pass — exit 0; {"numPassedTests": 238, "numFailedTests": 0, "numPendingTests": 133, "numTotalTests": 371, "numRuntimeErrorTestSuites": null} | api-e2e-evidence/api-rev-002/deterministic-e2e.log/json; opt-in pending are Not Tested, not passes |
| TC-002/003 | Started; unresolved | fake-agy.log; exact command in commands.json |
| TC-002/003 | Pass — exit 0; {"numPassedTests": 9, "numFailedTests": 0, "numPendingTests": 0, "numTotalTests": 9, "numRuntimeErrorTestSuites": null} | api-e2e-evidence/api-rev-002/fake-agy.log/json; opt-in pending are Not Tested, not passes |
| TC-005/008 | Started — real AGY 1.2.14, live transport and native image | live-agy.log/json; model quota required; Codex package opt-in remains disabled |
| TC-005/008 | Pass — live AGY 3 passed; 1 Codex-package case Not Tested (missing AGY_CODEX_PACKAGE_ROOT) | live-agy.log/json; Team and direct/nested Org send_message_to plus native image. AGY 1.2.14, 91.78s. |
| TC-007 | Started — current built backend + Nuxt + headless Chrome, fake AGY | renderer/probe.log; independent temp database and ports |
| TC-007 | Pass — live/reloaded/stopped-reopened DOM assertions; no page errors | renderer/tc-007-activity-panel-evidence.json and screenshots; owned Chrome/backend/Nuxt/temp root cleaned |
| TC-013 | Not Tested — deferred at failed architecture gate, not environmentally blocked | No desktop instance launched or existing package overwritten; required after source/test origin resolution |
| TC-010 | Fail reproduced — 2 same failures / 32 pass in isolated two-file run | architecture-reproduction.log/json; API-F001 requires failure-origin review |
| TC-001/002 | Pass within full unit run — AGY helper 21/21, converter 44/44; AGY folder 168 pass / 5 live opt-in Not Tested | unit-architecture.json; explicit fake/native transport 9/9 and live E2E separately recorded |
| TC-004/006 | Not Tested afresh — historical old-run/capture probes remain basis-limited | No current old-base-writer replay claimed; current new-run replay passed in TC-003/007 |

### API-REV-002 reconciliation
All commands completed; no running or interrupted cases. TC-010 Fail; TC-009/011/012/001/002/003/005/007/008 Pass at their stated boundary; TC-004/006 Not Tested afresh; TC-013 Not Tested/deferred at failed repository gate. Opt-ins are enumerated in *-not-tested.json. No desktop instance launched. Current round overall Fail, not blocked on a secret/account. Reconciled into canonical execution report.
