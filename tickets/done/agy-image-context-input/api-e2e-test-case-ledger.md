# API/E2E Test-Case Ledger

## Ledger Meta

- Assigned task workspace / worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/agy-image-context-input`
- Coverage investigation: `api-e2e-coverage-investigation.md`
- Execution coverage report: `api-e2e-execution-coverage-report.md`
- API/E2E revision record: `api-e2e-revision-record.md`
- Ledger scope and reason it is required: several independent server E2E cases plus live AGY model cases.
- Deviation: the planned cases were listed in the coverage investigation before execution, but this ledger file was written right after execution. The session was not interrupted, and every result below comes from the saved logs in `api-e2e-evidence/`.
- Last updated: 2026-10-09 (round 2 rows appended after each case in this session)

## Planned Cases

| Case ID | Case / Journey | Requirement / AC IDs | Boundary / Execution Surface | Planned Command Or Entry Point | Planned Order | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| FX-001 | Fake CLI `context_files` route | Fixture | Local process | `vitest run tests/unit/.../agy-failure-cli-routing.test.ts` | 1 | — |
| E2E-CF-001 | Standalone: uploaded image + .txt + .pdf, exact AGY text, files readable, stored message unchanged | REQ-001/002/003/006, AC-001/002/005 | Real server REST+WS, fake CLI | `agy-context-files-transport.e2e.test.ts` | 2 | Includes E2E-CF-004 |
| E2E-CF-002 | Attach-only image send | REQ-004, AC-003 | same | same | 2 | — |
| E2E-CF-003 | Remote URL + pasted absolute image path outside the workspace | REQ-005, AC-004 | same | same | 2 | — |
| E2E-CF-004 | Plain follow-up text unchanged | REQ-006, BEH-004 | same | same | 2 | — |
| E2E-CF-005 | Team member: uploaded image + .txt | REQ-001/002, SCN-003 | Real server Team WS, fake CLI | same | 2 | — |
| REG-001 | Delegated `reference_files` to AGY worker (CTX-E2E-003) + AGY transport regressions | AC-007 | Real server, fake CLI | 5 existing e2e files | 3 | — |
| REG-002 | agent-execution + agent-team-execution unit suites, context-file integration tests | AC-008 | Unit/integration | vitest | 4 | — |
| LIVE-CF-001 | Real agy: uploaded image + "her" | AC-006, SCN-001 | Real server + real agy | `agy-context-files-live.e2e.test.ts` | 5 | — |
| LIVE-CF-002 | Real agy: pasted absolute path outside the workspace | AC-006, SCN-006/RU-002 | same | same | 5 | — |
| LIVE-CF-003 | Real agy team member: image + note | AC-006, SCN-003 | same | same | 5 | — |
| WEB-001 | Web unit suite (round 2) | AC-003 | Unit/component | `test:nuxt` | 6 | — |
| DJ-001 | Desktop Chat composer + AGY (round 2) | AC-003, AC-006 | Isolated desktop app | isolated-app + browser-automation | 7 | — |
| DJ-002 | Desktop run-view composer + AGY (round 2) | AC-003, AC-006 | same | same | 7 | — |

## Execution Events

| Sequence | Case ID | Timestamp | Event | Command / Configuration | Expected Observable Result | Observed Result | Result | Evidence | Next Action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | FX-001 | 2026-10-08 | Completed | routing unit test | Route records raw line, view_file per path | 17/17 passed | Pass | console run; AGY unit folder rerun 308 passed | — |
| 2 | E2E-CF-001 | 2026-10-08 | Completed | `RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<abs>/agy-failure-cli.mjs` | Exact text with 3 stored absolute paths; sha256 of uploaded bytes; projection shows typed text only | As expected. The first two attempts failed only on test-helper bugs (tool result shape, path regex), which were fixed. | Pass | `api-e2e-evidence/e2e-cf-transport.log` | — |
| 3 | E2E-CF-002 | 2026-10-08 | Completed | same | Attach-only send accepted, AGY gets `Attached images…` text | Rejected before AGY: ACK `accepted:false`, `code:RUNTIME_REJECTED`, "AgentRun input content must be a non-empty string." No AGY input recorded. | Fail | `api-e2e-evidence/e2e-cf-transport.log` | Route as Requirement Gap |
| 4 | E2E-CF-003 | 2026-10-08 | Completed | same | Pasted path under image heading, URL line after it | Exact text matched; path opened (sha256 ok) | Pass | same | — |
| 5 | E2E-CF-004 | 2026-10-08 | Completed | same | Plain text byte-identical, same conversation | Matched | Pass | same | — |
| 6 | E2E-CF-005 | 2026-10-08 | Completed | same, Team WS | Exact text with team-member stored paths; both readable | Matched | Pass | same | — |
| 7 | REG-001 | 2026-10-08 | Completed | 5 fake-CLI e2e files | All pass | 32 passed, 3 skipped (team roundtrip file is gated separately) | Pass | `api-e2e-evidence/e2e-agy-regression.log` | — |
| 8 | REG-002 | 2026-10-08 | Completed | unit + 2 integration files | All pass | 162 files / 1535 tests passed, 6 skipped | Pass | `api-e2e-evidence/unit-integration.log` | — |
| 9 | LIVE-CF-001 | 2026-10-08 | Completed | `RUN_AGY_CONTEXT_FILES_E2E=1`, gemini-3.8-flash-low | view_file on stored path; reply mentions red | view_file on `…/context_files/ctx_…__Screenshot_2026-10-08.png`; "I received the solid red image…" | Pass | `api-e2e-evidence/live/LIVE-CF-001-standalone-her.json`, `live-cf.log` | — |
| 10 | LIVE-CF-002 | 2026-10-08 | Completed | same | view_file on pasted path; "green" | view_file on `/…/agy-context-files-live-outside-…/pasted image.png`; reply "Green" | Pass | `live/LIVE-CF-002-standalone-pasted-path.json` | — |
| 11 | LIVE-CF-003 | 2026-10-08 | Completed | same, team member | view_file on image + note; "blue" + marker | view_file on both; "is **blue**", marker NOTE-MARKER-6612 | Pass | `live/LIVE-CF-003-team-member.json` | — |
| 12 | E2E-CF-002 (revised) | 2026-10-09 | Completed | round 2, fake CLI | Whitespace + image rejected `RUNTIME_REJECTED` before AGY (no stdin line, no turn); same image with text delivered | As expected | Pass | `api-e2e-evidence/e2e-cf-transport.log` | — |
| 13 | E2E-CF-001/003/004/005 | 2026-10-09 | Completed | round 2 re-run | Unchanged expectations | 4/4 file pass | Pass | same | — |
| 14 | REG-001 | 2026-10-09 | Completed | round 2 re-run | All pass | 32 passed, 1 skipped | Pass | `api-e2e-evidence/e2e-agy-regression.log` | — |
| 15 | REG-002 | 2026-10-09 | Completed | round 2 re-run | All pass | 1535 passed | Pass | `api-e2e-evidence/unit-integration.log` | — |
| 16 | WEB-001 | 2026-10-09 | Completed | `pnpm -C autobyteus-web test:nuxt --run` | All pass incl. IR-002 specs | 3998 passed, 3 skipped | Pass | `api-e2e-evidence/web-unit.log` | — |
| 17 | DJ-001 | 2026-10-09 | Completed | isolated desktop iso-57725-bf13, Daily Assistant on AGY | Chat: file only → Send disabled, Enter no run; "her"+file → sent; agent views image | As expected; reply "solid red square" after view_file | Pass | `api-e2e-evidence/desktop/desktop-journey-dom-states.json` | — |
| 18 | DJ-002 | 2026-10-09 | Completed | same run, run-view composer | File only → Send disabled, Enter nothing; text+file → sent; agent views image | As expected; reply "This one is blue" after view_file | Pass | same | — |

## Re-entry And Reconciliation

- Last durably recorded event: 18
- Last completed case and result: DJ-002 Pass (round 2)
- Cases still running, interrupted, or not started: None
- Next case or recovery action: None — round 2 complete
- Interruption, context-compression, or rerun note: None
- Reconciled into execution coverage report: `Yes` — `api-e2e-execution-coverage-report.md` "Result Summary"
