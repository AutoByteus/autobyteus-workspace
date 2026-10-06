# API/E2E Test Review Report

## Review Meta

- Review Round: 1
- Trigger: API/E2E `Pass` (API-REV-002, round 2) from `/api_e2e_engineer`
- Requirements Doc Reviewed As Context: `<T>/requirements-doc.md` (SR-002)
- Investigation Notes Reviewed As Context: `<T>/investigation-notes.md`
- Solution Revision Record Reviewed As Context: `<T>/solution-revision-record.md` (SR-001, SR-002)
- Design Spec Reviewed As Context: `<T>/design-spec.md`
- Supplemental Task Artifacts Reviewed As Context: None
- Architecture Review Revision Record Reviewed As Context: `<T>/architecture-review-revision-record.md` (ARCH-REV-001, ARCH-REV-002)
- Implementation Revision Record Reviewed As Context: `<T>/implementation-revision-record.md` (IR-001, IR-002)
- Original Code Review Report: `<T>/code-review-report.md` (CRR-003 Pass)
- Code Review Revision Record: `<T>/code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-004`
- Coverage Investigation: `<T>/api-e2e-coverage-investigation.md`
- Execution Coverage Report: `<T>/api-e2e-execution-coverage-report.md`
- API/E2E Revision Record Reviewed As Context: `<T>/api-e2e-revision-record.md` (API-REV-001, API-REV-002)
- Delivery Revision Record Reviewed As Context: N/A
- API/E2E Result: `Pass`
- Final Validation Confidence: 96%
- Prior unresolved test-review findings rechecked: None (first test review)
- Supported Product Scenario Basis Confirmed: `Yes`. The tests cover SCN-001, SCN-002 (server API for any run) and SCN-003 (server API for any run) under SR-002, plus AC-001..AC-006.

`<T>` = `/home/autobyteus/workspace/.codex/worktrees/run-file-change-live-projection-ownership/tickets/in-progress/run-file-change-live-projection-ownership`

## Changed Durable Test Scope

| Durable Test Path | Change | Related Scenario / Requirement | Coherent Test Responsibility | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/runtime/agy-native-image-multi-artifact-preview.e2e.test.ts` | Added | SCN-001..SCN-003; AC-001..AC-004, AC-006 (server); REQ-001..REQ-004 | Real Studio server: a multi-image AGY turn stays listable and previewable while active, after terminate, and after restore with a new turn; standalone (E-001/E-003) and Team member (E-002/E-004) | 301 lines, two coherent cases. Gated behind `RUN_AGY_FAILURE_E2E=1` plus a working fake CLI |
| `autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs` | Updated | Supports the E2E above | Fake AGY CLI: new multi-step image mode with an optional file gate | The single-image `image_done` branch is unchanged (fake-CLI routing passes 14/14 per API-REV-002) |
| `autobyteus-server-ts/tests/integration/api/run-file-changes-api.integration.test.ts` | Updated | AC-005, REQ-004 | Adds the streaming → completed step to the existing active-run regression: 409 becomes 200 with the right bytes, and the list stays at 4 entries | Extends the CRR-001-reviewed regression case |

- No durable test file changed: `No`

## Proportional Test-Code Checks

| Check | Result | Evidence / Notes |
| --- | --- | --- |
| Scenario grouping and names make intent clear | Pass | The test names cite E-IDs and the lifecycle phases. The header comment states the scenario and the run command. `runWatchedImageTurn` documents the user-watching sequence |
| Assertions prove approved requirements, not incidental details | Pass | Previews assert 200, `image/png`, `no-store` and exact bytes (REQ-001, preserved response shape). Lists assert exact path sets and `available`/`generated_output` (REQ-002). Historical reads after terminate check REQ-003. The integration test checks 409 → 200 (REQ-004) |
| Fixtures/helpers reuse meaningful repetition | Pass | Shared `expectPreviews`, `expectListed`, `plantImage`, `scriptImageTurn` and `runWatchedImageTurn`. Reuses the existing E2E helpers (`startStudioE2eRuntimeServer`, `sendE2eSendMessageCommand`, `flattenE2eConfiguredAgentExecutions`). The fixture extends the existing CLI rather than adding a new one |
| Isolation and determinism appropriate for the boundary | Pass | Temp HOME is set before modules load, with a private data dir. A unique gate path per turn sequences the steps without timing races. Gates are released in `finally`. Waits are deadline-bounded (20 s). Resources are cleaned up in `afterAll`, with a 60 s timeout. Per API-REV-001, 8/8 repeats were stable |
| Large files coherent and navigable | Pass | One surface (multi-image artifact serving), two cases |
| No stale/duplicated/disabled-without-reason/compat-only tests | Pass | `describe.skip` is used only when the opt-in env or the fake CLI is unavailable, which matches the existing AGY E2E convention |
| Coverage agrees with the investigation and execution evidence | Pass | E-001..E-004 and I-001 match the ledger and the execution report. Run against base `src`, the E2E reproduces the user's 404 (`base-source-run.log`) |
| Callers/fixtures exercise an independently established scenario | Pass | The scenarios come from the approved requirements (user report and screenshots). The tests only reproduce them |
| Real trigger and real actor steps, without unrealistic setup | Pass | Run creation, terminate and restore go through real GraphQL mutations. Messages are sent over the real WebSocket. File changes come from the real AGY event processing. Only the CLI is scripted, and it plants step output plus image bytes before reporting DONE, as AGY does. The gate models the user opening earlier images while the agent is still working |

Non-blocking observations (no action required):
- `plantImage` writes all of a turn's image bytes before the turn starts. This does not weaken the proof, because the exact-set list assertions after each step would catch any entry recorded early.
- The fixture's gate wait has no internal timeout. That is acceptable, because the test always releases every gate in `finally` and the server terminates the CLI on cleanup.

## Findings

None.

## Latest Authoritative Result

- Result: `Pass`
- Changed durable test paths reviewed:
  - `tests/e2e/runtime/agy-native-image-multi-artifact-preview.e2e.test.ts` (added)
  - `tests/fixtures/agy-failure-cli.mjs` (updated)
  - `tests/integration/api/run-file-changes-api.integration.test.ts` (updated)
- Unresolved finding IDs: None
- Recommended Recipient: `/delivery_engineer`
- Notes:
  - The three test changes are still uncommitted in the worktree. Delivery should include them in the integrated change.
  - Out of scope and tracked elsewhere:
    - the pre-existing stale-seed integration case "hydrates historical AutoByteus team-member file changes"
    - the Team-member UI hydration follow-up ticket
    - RSK-001
