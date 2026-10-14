# API/E2E Test Review Report — output-tps-precision

## Review Meta

- Review Round: 1 (proportional test-code review)
- Trigger: api_e2e_engineer Pass, API-REV-002 (round 2, IR-002), with a request for review of the changed durable test
- Requirements Doc Reviewed As Context: `requirements-doc.md` (R3; AC-004 and DEC-002 Codex wording aligned in SR-006)
- Investigation Notes Reviewed As Context: `investigation-notes.md` (including "SR-006 findings")
- Solution Revision Record Reviewed As Context: `solution-revision-record.md` (SR-006)
- Design Spec Reviewed As Context: `design-spec.md` (D3.2)
- Supplemental Task Artifacts Reviewed As Context: N/A (evidence only)
- Architecture Review Revision Record Reviewed As Context: `architecture-review-revision-record.md` (ARCH-REV-003)
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md` (IR-002)
- Original Code Review Report: `code-review-report.md` (CRR-003 Pass)
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-004`
- Coverage Investigation: `api-e2e-coverage-investigation.md`
- Execution Coverage Report: `api-e2e-execution-coverage-report.md`
- API/E2E Revision Record Reviewed As Context: `api-e2e-revision-record.md` (API-REV-001, API-REV-002)
- Delivery Revision Record Reviewed As Context: N/A
- API/E2E Result: Pass (API-REV-002)
- Final Validation Confidence: 95%
- Prior unresolved test-review findings rechecked: none (first test review)
- Project testing guideline(s) applied: root `TESTING.md`, which requires:
  - gated live suites, with the gate and command in the test file header;
  - a clean environment for E2E and live runs;
  - real-provider credentials in the target database's vault;
  - a skip does not count as a pass.

  No conflict with this skill. One discrepancy was already recorded by API/E2E: the agy token-file isolation recipe does not apply to agy 1.3.5. It goes to delivery as a TESTING.md update.
- Supported Product Scenario Basis Confirmed: `Yes`. The tests exercise these approved scenarios:
  - SCN-001: a single-call turn per runtime;
  - SCN-002/003: a Codex turn with a multi-second tool, and a Codex turn with a user-held approval;
  - DEC-002: the method per runtime.

## Changed Durable Test Scope

| Durable Test Path | Change | Related Scenario / Requirement | Coherent Test Responsibility | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/runtime/token-meter-tps-live.e2e.test.ts` | Added (round 1), Updated (round 2: API-L08, API-L09, external-server mode) | AC-001–004, AC-010; REQ-002/003/009; SCN-001–003 | Live per-runtime check of what each model call's `TOKEN_USAGE_UPDATED` carries as `output_throughput`, through public GraphQL and the agent WebSocket | Gated by `RUN_TOKEN_TPS_LIVE_E2E=1`; `TPS_LIVE_RUNTIMES` selects runtimes |

- No durable test file changed: `No`
- Not reviewed as durable code: `evidence/api-e2e/probes/stdout-stamp-wrapper.mjs` and `run-against-test-server.mjs`, which are temporary execution probes, plus the logs and screenshots. All other changed tests were written during implementation and were reviewed in CRR-001 and CRR-003.

## Proportional Test-Code Checks

| Check | Result | Evidence / Notes |
| --- | --- | --- |
| Scenario grouping and names make intent clear | Pass | One suite. Cases are named `API-L01`–`L09` with runtime and expected method. Shared helpers (`startRun`, `runTurn`, `checkReadings`, `singleCallCase`) are named for their role |
| Assertions prove approved requirements instead of incidental implementation details | Pass | The checks follow the approved requirements rather than implementation details: <ul><li>method per DEC-002;</li><li>numerator equals the call's own output (Codex `last.outputTokens`);</li><li>minimum sample;</li><li>duration never longer than the time since send;</li><li>exact three-field shape.</li></ul> L04 and L08 encode SCN-002 with a bound that does not depend on which event ends the call (the reading spans neither the tool nor the approval wait), so it would catch the round-1 defect and accepts the D3.2 result. AGY asserts end-to-end only when thinking > 0, because a thinking-free short window may legitimately fall back |
| Fixtures, setup, helpers, and data builders reuse meaningful repetition | Pass | Reuses the existing `startStudioE2eRuntimeServer` and `sendE2eSendMessageCommand` helpers. Per-case setup is factored into `singleCallCase` |
| Test isolation and determinism are appropriate for the exercised boundary | Pass | The live suite is non-deterministic by nature, so assertions use bounds rather than exact values. Each case owns its definitions, runs, workspace and data dir and cleans them up via GraphQL. L08 sets the real server setting `CODEX_APP_SERVER_APPROVAL_POLICY` (read in `codex-thread-bootstrapper.ts`) only for its own run start and restores it in `finally`. The header requires a clean env |
| Large files remain coherent and navigable | Pass | 406 lines, one behavior (per-call TPS on real runtimes) |
| No stale, duplicated, disabled-without-reason, or compatibility-only tests remain | Pass | Skips come only from the documented gate or runtime selection |
| Added, updated, and removed coverage agrees with the coverage investigation and execution evidence | Pass | The ledger and execution report list L01–L09. Round-2 evidence (`round2/live/codex*`, `deepseek`) matches the cases |
| Test callers and fixtures exercise an independently established supported scenario | Pass | Each case corresponds to an approved scenario or AC |
| Each test enters through its scenario's real trigger and follows the real actor's or event's steps | Pass | Real agent definition and run via GraphQL, a user message over the WebSocket, and approval via the real `APPROVE_TOOL` command after a human-like wait. The external mode uses the built test server, with keys imported through the supported `pnpm secrets:import` |

Non-actionable observations (no change required):
- The header says the suite "removes token-usage rows afterwards". In external-server mode (API-L09), runs and definitions are removed via GraphQL, but token-usage rows stay in the persistent, gitignored test DB. API-L08's in-process policy override also has no effect in external mode, which the header scopes to API-L09.
- The header's `test-support/live-e2e/test-runtime-bootstrap.mjs` path is relative to the repository root.
- `chooseModel` falls back to the first catalog model when the preferred one is missing. Each case records the model it used, and API-L09 asserts its model explicitly.

## Findings

None.

## Follow-ups

None from this review. The out-of-scope observation from API/E2E (other Token Meter cards use the system locale, TPS uses the app locale) is pre-existing and is passed to delivery for its follow-up handling.

- Sent to: `None`

## Latest Authoritative Result

- Result: `Pass`
- Changed durable test paths reviewed: `autobyteus-server-ts/tests/e2e/runtime/token-meter-tps-live.e2e.test.ts`
- Unresolved finding IDs: none
- Recommended Recipient: `/software_engineering_team/delivery_engineer`
- Notes: items carried to delivery:
  - **C-004:** the stale `autobyteus-web/README.md` Token Meter paragraph, lines 64–68.
  - **C-010:** on the move to `tickets/done/`, repoint `codex-model-call-timing.test.ts:18` or move the captures into `tests/fixtures/`, then re-run the test.
  - **TESTING.md:** the agy 1.3.5 isolation discrepancy.
  - **`autobyteus-server-ts/db/test.db`:** it holds the user's imported keys (gitignored).
  - **Locale observation:** other Token Meter cards use the system locale; TPS uses the app locale (pre-existing).
