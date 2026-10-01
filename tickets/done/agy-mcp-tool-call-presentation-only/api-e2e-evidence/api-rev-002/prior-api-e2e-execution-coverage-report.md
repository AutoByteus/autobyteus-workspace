# API/E2E Execution Coverage Report

## Execution Round Meta

Paths are relative to `/Users/normy/autobyteus_org/autobyteus-worktrees/agy-mcp-tool-call-presentation/tickets/in-progress/agy-mcp-tool-call-presentation/` unless stated.

- Requirements Doc: `requirements-doc.md` (Approved, SR-002)
- Investigation Notes: `investigation-notes.md`
- Solution Revision Record: `solution-revision-record.md`
- Design Spec: `design-spec.md`
- Supplemental Task Artifacts: `solution-handoff.md`; evidence only: `agy-mcp-call-shape-probe.py`, `agy-mcp-call-shape-probe/`
- Design Review Report: `N/A — not applicable`
- Architecture Review Revision Record: `N/A — not applicable`
- Implementation Handoff: `implementation-handoff.md`
- Implementation Revision Record: `implementation-revision-record.md` (IR-001, commit `34b310118`)
- Code Review Report: `N/A — not applicable`
- Code Review Revision Record: `N/A — not applicable`
- Delivery Revision Record: N/A
- Relevant Delivery Revision IDs: N/A
- Coverage Investigation: `api-e2e-coverage-investigation.md`
- API/E2E Test-Case Ledger: `api-e2e-test-case-ledger.md`
- API/E2E Revision Record: `api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- Current Execution Round: 1
- Trigger: Implementation handoff IR-001
- Prior Round Reviewed: None exists
- Latest Authoritative Round: 1

## Routing Classification

- Task size: `Small`
- Architectural risk: `Low`
- Input route: `Direct Low-Risk`
- Successful-output route: `Delivery`
- Proportional test-code review decision: `Not Required — direct low-risk route`

## Investigation And Execution Basis

- Coverage investigation artifact: `api-e2e-coverage-investigation.md`
- Investigation completed before durable coverage changes or final execution: `Yes`
- Investigation plan followed: `Yes`. One order change: the `pnpm test:e2e` regression run was done last, after the live and browser runs.
- Existing coverage decisions revised during execution, with evidence: none.
- Reroute required before or during execution: `No`
- Notes: none.

## Test-Case Ledger Reconciliation

- Ledger path: `api-e2e-test-case-ledger.md`
- Ledger initialized before execution: `Yes`
- Every completed case recorded immediately: `Yes`
- Long-running case checkpoints recorded when needed: `Yes` (TC-005 Started, then Completed)
- Ledger reconciled into this report: `Yes`
- Last durably recorded event: sequence 10 (REG Completed)
- Cases still running, interrupted, or not started: none
- Interruption, context-compression, or rerun note: TC-003 and TC-007 each needed a second run after a correction to my own test/probe code (a wrong Files-path expectation; a selector that collapsed the Activity items). No product behavior failed.

| Case ID | Final Result | Last Event | Evidence / Artifact Path | Reconciled Result / Follow-Up |
| --- | --- | --- | --- | --- |
| TC-001 | Pass | Completed | `api-e2e-evidence/tc-001-unit.log` | 63 of 63 |
| TC-002 | Pass | Completed | `api-e2e-evidence/tc-002-*.log`, `final-fake-agy-transport.log` | Rerun at the end with the extended fixture: 4 files, 9 of 9 |
| TC-003 | Pass | Completed | `api-e2e-evidence/tc-003-mcp-transport.log`, `agy-mcp-tool-call-transport.json`, `tc-003-sensitivity-on-base-converter.log` | New durable test |
| TC-004 | Pass | Completed | `api-e2e-evidence/tc-004-*` | Temporary probe removed |
| TC-005 | Pass | Completed | `api-e2e-evidence/tc-005-live-roundtrip.log` | 2 of 2, live |
| TC-006 | Pass | Completed | `api-e2e-evidence/tc-006-*` | Temporary probe removed |
| TC-007 | Pass | Completed | `api-e2e-evidence/tc-007-*` | Probe kept in the ticket folder |
| TC-008 | Pass | Completed | `api-e2e-evidence/tc-008-native-image.log`, `tc-008-native-image/` | Live, updated guard |
| REG | N/A | Completed | `api-e2e-evidence/regression-*.log` | See "Additional Repository Coverage Execution" |

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No` — the incomplete-wrapper fallback is REQ-004 behavior for an unusable provider payload; there is no flag, dual path or replay relabelling
- Approved persisted-data transition followed without unnecessary migration or version-specific runtime fallback: `Yes`
- Durable coverage added or retained only for compatibility-only behavior: `No`
- Reroute classification used: N/A
- Upstream recipient notified: N/A

## Changed Boundary And Evidence Matrix

| Scenario ID | Product Scenario / Behavior / Requirement / AC IDs | Changed Boundary | Execution Surface / Mode | Evidence Type | Result | Evidence / Artifact |
| --- | --- | --- | --- | --- | --- | --- |
| TC-001 | SCN-001..003 / AC-001..008 | Converter and projections | Vitest unit | Durable | Pass | `tc-001-unit.log` |
| TC-002 | SCN-001 / BEH-003, 005 / REQ-005 | Native tool path through the server | Vitest unit folder, tsc, fake-AGY e2e | Durable | Pass | `tc-002-*.log` |
| TC-003 | SCN-001..003 / AC-001, 003, 004, 005, 006, 007, 008; REQ-006; DEC-005 | AGY step → WebSocket event → stored trace → `getRunProjection` and `getRunFileChanges`, live and after termination | Real server, fake AGY CLI | Durable | Pass | `tc-003-mcp-transport.log`, `agy-mcp-tool-call-transport.json` |
| TC-004 | SCN-004 / BEH-006 / DEC-004 | Stored run written by the base converter, read by the current server in a new process | Real server, fake AGY CLI | Temporary | Pass | `tc-004-*` |
| TC-005 | SCN-001 / AC-002; REQ-001, 002, 006 | Real AGY 1.2.14 → server → GraphQL/WebSocket, Team and Org members | Live | Durable, Live | Pass | `tc-005-live-roundtrip.log` |
| TC-006 | SCN-002, 003 / AC-003, 005, 008 | Real AGY 1.2.14 stream for a third-party server through the converter | Vitest probe | Temporary | Pass | `tc-006-*` |
| TC-007 | SCN-001..003 / AC-001 (rendered), AC-003, 005, 006 | Activity panel and conversation items | Headless Chrome, Nuxt dev, built backend | Browser | Pass | `tc-007-activity-panel-evidence.json`, screenshots |
| TC-008 | SCN-001 / BEH-005 / REQ-005 / AC-007 | Native `generate_image` with real AGY; no MCP-named start | Live | Durable, Live | Pass | `tc-008-native-image.log` |

Acceptance criteria: AC-001 Pass (TC-001, 003, 007), AC-002 Pass (TC-001, 005), AC-003 Pass (TC-001, 003, 006, 007), AC-004 Pass (TC-001, 003, 006), AC-005 Pass (TC-001, 003, 006, 007), AC-006 Pass (TC-001, 003, 007), AC-007 Pass (TC-001, 002, 003, 008), AC-008 Pass (TC-001, 003, 006, 007).

## Additional Repository Coverage Execution

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| 1 | `pnpm test:e2e` | worktree | Server E2E regression | 54 files passed, 12 failed, 28 skipped (196 tests passed, 43 failed, 109 skipped). No failing file is under `tests/e2e/runtime` or exercises AGY | `api-e2e-evidence/regression-test-e2e.log` |
| 2 | The 12 failing files with `agy-stream-event-converter.ts` checked out from base `5c6fb95ea` (then restored) | worktree | Whether the failures depend on this change | 41 of the 43 fail identically. The 2 `token-usage-analytics-graphql` tests passed in this run | `api-e2e-evidence/regression-failing-files-on-base-converter.log` |
| 3 | `vitest run tests/e2e/token-usage/token-usage-analytics-graphql.e2e.test.ts` on HEAD | worktree | The 2 remaining failures | 5 of 5 pass alone. In the full suite they failed on an extra usage row (`usageReportCount` 4 instead of 3) | `api-e2e-evidence/regression-token-usage-head-alone.log` |
| 4 | All four fake-AGY transport e2e files with `RUN_AGY_FAILURE_E2E=1` | worktree | Final state of the extended fixture | 4 files, 9 of 9 | `api-e2e-evidence/final-fake-agy-transport.log` |

The 12 failing files are: `agent-definitions/agent-packages-graphql`, `agent-definitions/json-file-persistence-contract`, `agent-team-definitions/agent-team-definitions-graphql`, `agent-team-runs/hierarchical-team-run-config-graphql`, `app-data-migrations/team-run-v1-production-upgrade`, `file-explorer/workspace-content-rest`, `memory-sync/memory-sync-multiprocess`, `run-history/nested-team-history-restart`, `run-history/recent-run-projection-graphql`, `run-history/run-projection-toolcalls-graphql`, `token-usage/token-usage-analytics-graphql`, `workspaces/workspaces-graphql`. I did not investigate their causes and did not run the full suite on the base commit.

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | Change | New / Final Supporting Evidence | Residual Uncertainty |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 90% | 97% | +7 | Every AC proven at two or more levels; AC-001 rendered; AC-002 live | — |
| Changed-boundary execution directness | 95% | 97% | +2 | The changed method ran with the real CLI in TC-005 | — |
| Cross-boundary integration realism and mock gap | 80% | 94% | +14 | Real AGY → server → WebSocket for `send_message_to` in a Team and an Org; real third-party payloads through the converter | `delegate_task`, a third-party server and an MCP media tool were not called by a live model through the full server. They share the code path proven live and are covered deterministically |
| Environment, configuration, identity, and fixture fidelity | 85% | 95% | +10 | Installed AGY 1.2.14 with the user's login; fixture shapes match the capture | Later AGY versions (RSK-001) |
| Failure, edge-case, lifecycle, and recovery evidence | 93% | 95% | +2 | Failure rendered with its error text; reload and reopen after stop | Denial of an MCP call only at unit level |
| User-surface, browser, and desktop-shell confidence | 70% | 95% | +25 | Rendered titles, arguments and results asserted from the DOM, live, reloaded and reopened | Packaged desktop shell not launched (no shell code changed) |
| Durable regression coverage quality and relevance | 93% | 93% | 0 | New e2e fails on the base converter; guard updated and run live | The new e2e is opt-in, like the other fake-AGY files, so plain `pnpm test:e2e` skips it |

- Overall post-repository confidence: 87%
- Overall final confidence: 95%
- Calculation method: simple average (666 / 7 = 95.1)
- Confidence change produced by broader validation: +8
- Every critical acceptance criterion directly proven: `Yes`
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `Yes`, at the threshold
- Confidence-limiting residual risks: the three live gaps listed above; the opt-in gating of the fake-AGY e2e files

## Broader Validation Decision And Execution

- Decision and selected execution mode: `Required` — Live API (TC-005, TC-008) and Browser (TC-007)
- Material deviation from the planned mode or rationale: none
- Confidence gap or residual risk actually addressed: the installed CLI's real stream through the server; the rendered Activity item
- Startup order, commands, and readiness results: `pnpm -C autobyteus-server-ts build` (exit 0); `prisma migrate deploy` on a temp SQLite DB; `node dist/app.js --host 127.0.0.1 --port 54513 --data-dir <temp>` (health OK); `pnpm dev --host 127.0.0.1 --port 54514` with `BACKEND_NODE_BASE_URL` (`/chat` OK); headless Chrome 1440×1000
- Environment choices that materially affected the run: sanitized environment; the browser run used the fake AGY CLI (`AGY_FAKE_CASE=mcp_calls`); the live e2e runs used real `agy` 1.2.14
- Seed data, fixtures, identities: seeded Daily Assistant agent; the user's AGY login for the live runs

| Scenario / Journey Step | Expected Observable Result | Actual Observable Result | Evidence | Result |
| --- | --- | --- | --- | --- |
| Chat → Antigravity runtime → first model → open folder → send | Run view opens; reply arrives | Reply `MCP_DONE`; Activity tab selected | `tc-007-activity-panel-evidence.json` | Pass |
| Activity panel, live | One item per call: `view_file`, `delegate_task`, `mcp__shape-test__echo_args`, `mcp__shape-test__json_result`, `mcp__shape-test__always_fails` (failed), `call_mcp_tool` (incomplete wrapper), `generate_image` | Exactly those seven, in order, with those statuses | same; `tc-007-live-activity.png` | Pass |
| `delegate_task` item | Arguments `{description, recipient_address}` only; result `{provider_state, output: {target_agent_run_id, message}}`; no `ServerName`/`ToolName` | As expected | same | Pass |
| Third-party item | Nested arguments | As expected | same | Pass |
| Failed item | Provider error text shown | `PROBE-FAILURE-9920: deliberate failure` | same | Pass |
| Incomplete wrapper item | `call_mcp_tool` with `{Arguments, ToolName}` | As expected | same | Pass |
| Conversation | Tool items carry the same names | `delegate_task`, `mcp__shape-test__echo_args` present; `call_mcp_tool` appears once (the fallback item) | same | Pass |
| Reload the open run | Same seven items and contents | Same | same | Pass |
| Stop the run, reopen | Same seven items and contents | Same | same; `tc-007-reopened-activity.png` | Pass |
| Page errors | None | None | same | Pass |

## Desktop Application Validation

- Validation approach executed: browser on a worktree dev stack, as planned
- Web-equivalent behavior, surface used, and evidence: TC-007
- Shell-specific or lifecycle behavior and evidence: none changed; not exercised
- Effect on any already-running desktop application: `None` — the installed AutoByteus (port 29695, `~/.autobyteus`) and another worktree's isolated instance were running and were not touched
- Behavior not directly proven and confidence consequence: packaged shell not launched; no consequence for this change

## Platform / Runtime Targets

- Operating system / platform: macOS (Darwin 25.5.0), arm64
- Runtime and relevant framework versions: Node via pnpm workspace; Vitest; AGY CLI 1.2.14
- Browser / engine: Google Chrome (installed), headless, via `playwright-core`
- Viewport / locale: 1440×1000, en-US

## Lifecycle / Upgrade / Restart / Persisted-Data Checks

- Approved persisted-data decision: `Directly Usable — No Migration`
- Representative existing data exercised: a run written by the base commit's converter containing a native step, four well-formed `call_mcp_tool` steps (one failed) and one incomplete wrapper
- Direct-use result and evidence: a new server process with the current code returns a projection identical to the one the base version returned; the items read `call_mcp_tool` with wrapper arguments and unparsed text output (`tc-004-old-run-written-by-base.json`, `tc-004-old-run-read-by-current.json`)
- Migration completion/recovery evidence: N/A
- Version-specific runtime branch, dual read/write, or compatibility fallback observed: `No`
- Residual untested persisted-data risk: none identified

## Tests Implemented Or Updated

All under `/Users/normy/autobyteus_org/autobyteus-worktrees/agy-mcp-tool-call-presentation/autobyteus-server-ts/`.

| Path / Scenario | Change | Requirement / Boundary | Execution Result | Notes |
| --- | --- | --- | --- | --- |
| `tests/e2e/runtime/agy-mcp-tool-call-transport.e2e.test.ts` | Added | AC-001, 003..008; REQ-006; DEC-005 through WebSocket, history and Files | Pass | Opt-in: `RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<abs>/tests/fixtures/agy-failure-cli.mjs` |
| `tests/fixtures/agy-failure-cli.mjs` | Updated | New case `mcp_calls` (AGY 1.2.14 step shapes) | Pass | Existing cases unchanged; their three e2e files still pass |
| `tests/e2e/runtime/agy-native-image-app-chat.e2e.test.ts` | Updated | REQ-005: the "no MCP call" guard also rejects `mcp__*` starts | Pass (live) | One assertion |

These three changes are uncommitted in the worktree. The implementation commit `34b310118` is unchanged.

## Tests Removed As Stale Or Obsolete

None.

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `Yes`
- Paths added or updated: the three paths above
- Paths removed: none
- Added or updated paths attached for proportional test-code review: `Not Applicable` (direct low-risk route); attached to the delivery handoff
- Diff or repository evidence supplied for removed paths: N/A

## Other Execution Artifacts

| Artifact Path | Type / Purpose | Retained Or Temporary | Notes |
| --- | --- | --- | --- |
| `api-e2e-evidence/` | Logs, JSON evidence, screenshots, the browser probe script | Retained | In the ticket folder |
| `autobyteus-server-ts/dist/` | Server build for the browser run | Temporary, git-ignored | Left in place |

## Temporary Execution Methods / Scaffolding

| Path / Method | Why Needed | Result / Evidence | Cleanup Result |
| --- | --- | --- | --- |
| `tests/e2e/runtime/tmp-agy-old-run-probe.e2e.test.ts` | TC-004 | Pass | File and temp data dir removed |
| `git checkout 5c6fb95ea -- …/agy-stream-event-converter.ts` (twice) | TC-004 write phase; regression comparison | — | Restored with `git checkout HEAD --`; `git status` shows no source change |
| `tests/unit/.../tmp-agy-real-capture-probe.test.ts` | TC-006 | Pass | Removed |
| `api-e2e-evidence/tc-007-activity-panel-probe.mjs` | TC-007 | Pass | Kept as evidence; its processes stopped and temp root removed |

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| AGY CLI (TC-003, TC-004, TC-007) | Fake CLI emitting AGY 1.2.14 step shapes | Determinism; a model cannot be made to fail a tool or omit a wrapper field on demand | Covered by TC-005, TC-006 and TC-008 with the real CLI or its real output |

## Result Summary

| Result | Scenario IDs | Summary / Reason |
| --- | --- | --- |
| Pass | TC-001..TC-008 | All acceptance criteria proven |
| Out Of Scope | 12 failing files in `pnpm test:e2e` | Not AGY; 41 of 43 failures reproduce with the base converter, the other 2 pass in isolation |

## Cleanup Performed

| Resource / Process / Data | Ownership | Cleanup Action | Result |
| --- | --- | --- | --- |
| Backend and Nuxt dev processes, Chrome (TC-007) | This run | SIGTERM by the probe | Exited |
| Temp roots (`agy-mcp-activity-*`, `agy-old-run-*`, e2e temp dirs) | This run | Removed | Done |
| Temporary probe test files | This run | Removed | Done |
| AGY conversation folders and one generated image under `~/.gemini/antigravity-cli/brain/` from TC-005 and TC-008 | Written by the real AGY CLI | Left in place, as the existing live tests do | — |
| Pre-existing `agy` processes and running AutoByteus apps | Not mine | Not touched | — |

## Preliminary Classification

N/A — no failure.

## Recommended Recipient

`/delivery_engineer`

## Evidence / Notes

- `TESTING.md` does not mention the AGY opt-in variables (`RUN_AGY_E2E`, `RUN_AGY_FAILURE_E2E` + `ANTIGRAVITY_CLI_COMMAND`, `RUN_AGY_CAPABILITY_E2E`); they are only in test file headers.
- `tests/unit/agent-execution/backends/antigravity/agy-mcp-team-live.test.ts` (opt-in, `AGY_LIVE=1`) writes its report into a ticket folder that no longer exists. Unrelated to this change; not run.

## Latest Authoritative Result

- Result: `Pass`
- Final validation confidence: 95%
- Default `95%` confidence target met: `Yes`
- Any final applicable confidence category below `90%`: `No`
- Broader validation decision: `Required` — executed (live AGY, browser)
- Critical acceptance criteria lacking direct proof: none
- Next recipient from `get_handoff_rules`: `/delivery_engineer`
- Notes: three durable test changes are uncommitted in the worktree.
