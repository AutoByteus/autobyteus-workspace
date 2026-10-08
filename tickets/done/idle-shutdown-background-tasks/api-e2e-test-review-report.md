# API/E2E Test Review Report

## Review Meta

- Review Round: 1
- Trigger: API/E2E Pass (API-REV-001) from `/software_engineering_team/api_e2e_engineer` for the SR-003 hybrid (IR-003, after CRR-003); durable test changes are uncommitted in the worktree at HEAD `330cc5cef`
- Requirements Doc Reviewed As Context: `requirements-doc.md` (SR-003)
- Investigation Notes Reviewed As Context: `investigation-notes.md`
- Solution Revision Record Reviewed As Context: `solution-revision-record.md`
- Design Spec Reviewed As Context: `design-spec.md` (SR-003)
- Supplemental Task Artifacts Reviewed As Context: `problem-report.md`; `evidence/api-e2e/` (logs and receipts)
- Architecture Review Revision Record Reviewed As Context: `architecture-review-revision-record.md` (ARCH-REV-002)
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md` (IR-003)
- Original Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/idle-shutdown-background-tasks/tickets/in-progress/idle-shutdown-background-tasks/code-review-report.md` (CRR-003, Pass)
- Code Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/idle-shutdown-background-tasks/tickets/in-progress/idle-shutdown-background-tasks/code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-004`
- Coverage Investigation: `api-e2e-coverage-investigation.md`
- Execution Coverage Report: `api-e2e-execution-coverage-report.md`
- API/E2E Revision Record Reviewed As Context: `api-e2e-revision-record.md` (API-REV-001)
- Delivery Revision Record Reviewed As Context: N/A
- API/E2E Result: Pass
- Final Validation Confidence: 95.2%
- Prior unresolved test-review findings rechecked: None (first test review). Source-review note N-001 (`TESTING.md` row for the kept live E2E) is resolved by the new "Delegated background-task idle shutdown live E2E" row.
- Project testing guideline(s) applied: repo-root `TESTING.md` (gated live/scripted E2E inventory, isolated data and HOME, owned cleanup, rule 9). No conflicts. Rule 9: the 56/43 pre-existing base failures stay tracked as a separate item, as the implementer and API/E2E reported.
- Supported Product Scenario Basis Confirmed: `Yes` (SCN-001..005 and AC-001..008 from the approved SR-003 requirements)

## Changed Durable Test Scope

| Durable Test Path | Change | Related Scenario / Requirement | Coherent Test Responsibility | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/projects/task-copy-idle-lifetime.e2e.test.ts` | Added | SCN-002..005; AC-002, AC-003, AC-004, AC-006, AC-007 | Hybrid idle-shutdown lifetime of delegated copies across the Agent, Team and Org roots through the real server, with only the AGY CLI scripted | 426 lines; one coherent surface; gated `RUN_AGY_FAILURE_E2E=1`; fails on base in all three roots (receipt `evidence/api-e2e/e2e-idle-base`) |
| `autobyteus-server-ts/tests/e2e/runtime/agy-delegated-background-task.e2e.test.ts` | Added | SCN-002/003; AC-002, AC-004 | Real AGY worker daemon outlives two grace periods on the same process, then is released one grace period after its own exit | Gated `RUN_AGY_BACKGROUND_E2E=1 RUN_CLAUDE_E2E=1` |
| `autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs` | Updated | AC-002/004 (scripted) | New `linked_skills` route `BACKGROUND_STEP:{seconds,exitCode}`: an open daemon step at turn end plus AGY's exit-message file after N s | Mirrors the real AGY contract (no exit file if the process dies first) |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/antigravity/agy-failure-cli-routing.test.ts` | Updated | Fixture contract | Proves the new route's exit file parses with the production `scanAgyTaskExitMessages`; other modes unchanged | Reviewer rerun: 16 passed |
| `TESTING.md` | Updated | N-001 | Inventory row for the Claude and AGY delegated live E2Es; section for the scripted hybrid E2E | Guideline doc, reviewed as test inventory |

- No durable test file changed: `No`

## Proportional Test-Code Checks

| Check | Result | Evidence / Notes |
| --- | --- | --- |
| Scenario grouping and names make intent clear | Pass | Header comments map each step to AC IDs. `rootScenario` reads in lifecycle order: quiet control → past grace → DONE → wake → step end → root stop. Test titles state the outcome |
| Assertions prove approved requirements instead of incidental implementation details | Pass | Observable outcomes only: `offline` on the root's view, the CLI process gone (pgrep/lsof), task end statuses, `--conversation` relaunch, timing windows of one grace period (min grace −1/−2 s, max +15 s). No internal state is inspected |
| Fixtures, setup, helpers, and data builders reuse meaningful repetition | Pass | Reuses existing E2E helpers (`startStudioE2eRuntimeServer`, `until`, `sendE2eSendMessageCommand`, team metadata helpers). `startRoot`/`delegate`/`timeline`/`ended` factor out the three-root repetition. The live AGY file follows the existing Claude live E2E shape (accepted repo pattern) |
| Test isolation and determinism are appropriate for the exercised boundary | Pass | Temporary data dir and disposable HOME (restored in `afterAll`); env saved and restored; owned-cleanup assertion that no AGY process is left. Real-timer windows are bounded and documented; the live AGY daemon is left to exit by itself (no external kill, which AGY 1.3.1 does not report) |
| Large files remain coherent and navigable rather than mixing unrelated scenarios | Pass | The 426-line scripted E2E covers one surface (copy lifetime under idle shutdown) for three roots at once |
| No stale, duplicated, disabled-without-reason, or compatibility-only tests remain | Pass | SR-002-era drafts were rewritten in place and never committed; gating is documented in headers and `TESTING.md` |
| Added, updated, and removed coverage agrees with the coverage investigation and execution evidence | Pass | Receipts: `r2-e2e-idle-3.log`, `e2e-idle/task-copy-idle-lifetime.json`, `r2-live-agy-3.log`, `r2-live-claude.log`, `r2-live-mixed-2.log`. Base run fails as expected |
| Test callers and fixtures exercise an independently established supported scenario rather than proving one by themselves | Pass | Scenarios come from the approved SCN-001..005. The scripted CLI reproduces AGY's documented exit-message contract at the external process boundary, and that contract is checked against the production reader |
| Each test enters through its scenario's real trigger and follows the real actor's or event's steps, without a setup real use does not produce | Pass | The operator message goes to the Manager. The Manager calls the actual `delegate_task` / `create_or_update_task` / `send_message_to` tools through scoped MCP. Copies end turns with an open step. Grace comes from the operator setting (`.env` / env); root stop goes through GraphQL. No hidden state mutation |

## Findings

No actionable findings.

Optional editorial note (no action required): the header of `task-copy-idle-lifetime.e2e.test.ts` (l.30) says "About 5 minutes", while `TESTING.md` and the execution report say about 3 minutes.

## Latest Authoritative Result

- Result: `Pass`
- Changed durable test paths reviewed: `tests/e2e/projects/task-copy-idle-lifetime.e2e.test.ts` (Added), `tests/e2e/runtime/agy-delegated-background-task.e2e.test.ts` (Added), `tests/fixtures/agy-failure-cli.mjs` (Updated), `tests/unit/agent-execution/backends/antigravity/agy-failure-cli-routing.test.ts` (Updated), `TESTING.md` (Updated). No durable test removed.
- Unresolved finding IDs: None
- Recommended Recipient: `/software_engineering_team/delivery_engineer`
- Notes: The test changes are uncommitted in the worktree (API/E2E made no commits); delivery should include them. Accepted residual QR-002/DEC-005. Server-stop with a running task and AC-003 with a Claude team member are covered at unit level only.
