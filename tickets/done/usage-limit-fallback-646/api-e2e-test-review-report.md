# API/E2E Test Review Report — autobyteus-646 Runtime fallback on a usage limit

## Review Meta

- Review Round: 1
- Trigger: `/api_e2e_engineer`, API/E2E round 1 Pass (API-REV-001, 94%); tests `b5e56fcc50`, documents and evidence `1a7dd13a23`
- Requirements Doc Reviewed As Context: [requirements-doc.md](requirements-doc.md) (REQ-004/REQ-007 as updated by SR-011)
- Investigation Notes Reviewed As Context: [investigation-notes.md](investigation-notes.md)
- Solution Revision Record Reviewed As Context: [solution-revision-record.md](solution-revision-record.md) (SR-011)
- Design Spec Reviewed As Context: [design-spec.md](design-spec.md) (R-1, R-11, R-17…R-19)
- Supplemental Task Artifacts Reviewed As Context: [follow-ups.md](follow-ups.md) (FU-646-04, FU-646-05); `evidence/API/` (`API-01-ul-receipt.json`, `ULP-01.json`, `ULP-02.json`, the logs)
- Architecture Review Revision Record Reviewed As Context: ARCH-REV-005 (the architecture reviewer's file)
- Implementation Revision Record Reviewed As Context: IR-002
- Original Code Review Report: [code-review-report.md](code-review-report.md) (CRR-002 Pass)
- Code Review Revision Record: [code-review-revision-record.md](code-review-revision-record.md)
- Current Code Review Revision ID: `CRR-003`
- Coverage Investigation: [api-e2e-coverage-investigation.md](api-e2e-coverage-investigation.md)
- Execution Coverage Report: [api-e2e-execution-coverage-report.md](api-e2e-execution-coverage-report.md)
- API/E2E Revision Record Reviewed As Context: [api-e2e-revision-record.md](api-e2e-revision-record.md) (API-REV-001)
- Delivery Revision Record Reviewed As Context: N/A
- API/E2E Result: Pass
- Final Validation Confidence: 94%
- Prior unresolved test-review findings rechecked: none
- Project testing guideline(s) applied: TESTING.md: built-server and two-server E2E on test-owned data roots; scripted CLIs and model servers (no provider, no credits); gated suites. No conflicts.
- Supported Product Scenario Basis Confirmed: `Yes`

No `src/` change since `1bc523124e`: `git diff 1bc523124e..b5e56fcc50` touches only the four files below.

## Changed Durable Test Scope

| Durable Test Path | Change | Related Scenario / Requirement | Coherent Test Responsibility | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/run-events/usage-limit-switch-built-server.e2e.test.ts` | Updated: UL-10, UL-11, UL-12 | UL-10: R-1's not-quiet retry, REQ-008. UL-11: R-17 in a delegation (the inherited launch can't run), R-19. UL-12: R-17 for a Team member | One node, the switch and delegation journeys | UL-11 and UL-12 build on UL-01/UL-08's exhaustion, as the file states |
| `autobyteus-server-ts/tests/e2e/run-events/usage-limit-switch-peer-run.e2e.test.ts` | Updated: ULP-02 | R-17 for a peer-started copy (no inherited launch), CM-10, R-19 | The two-node journey | Uses ULP-01's nodes and asserts that ULP-01 set them up |
| `autobyteus-server-ts/tests/fixtures/codex-usage-limit-app-server.mjs` | Updated: `HOLD_LIMIT:<ms>` | UL-10 | Keeps a limited turn running, and logs each turn's end | Default behavior unchanged |
| `autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs` | Updated: `runtime_error` serves `CALL_TOOL:` as an ordinary turn | UL-11 | Lets a delegator on the exhausted AGY model act | No other suite sends `CALL_TOOL` in that case; the other `runtime_error` suites still pass (26) |

- No durable test file changed: `No`

## Proportional Test-Code Checks

| Check | Result | Evidence / Notes |
| --- | --- | --- |
| Scenario grouping and names make intent clear | Pass | Case IDs and one-paragraph intents in the file headers; each `it` names its requirement |
| Assertions prove approved requirements instead of incidental implementation details | Pass, one note | **UL-11:** the result text "(chosen by the node)" and "… is exhausted until"; the copy's metadata at the node fallback with `launchSource.origin: node_fallback`; no Codex turn. **UL-12:** the switch record says `chosenBy: node_fallback` with its reason; the tree holds the new launch; the hand-over carries the input. **UL-10:** two Codex turns, the second held; the first event before the held turn's end; one switch, after that end (evidence: ended …:15.717, switched …:16.133); the hand-over carries both messages; never "was not switched". **ULP-02:** beta's metadata at the node fallback with `node_fallback` and `delegatedFrom.nodeId`; alpha's result names the choice; no Codex turn. Note: UL-12 records the member's tree `launchSource` (`node_fallback`) in its evidence but does not assert it, so R-19's Team path for this value relies on the unit test (`team-member-runtime-switch.test.ts`, `agent_history`) and the evidence |
| Fixtures, setup, helpers, and data builders reuse meaningful repetition | Pass | The file's helpers are reused (`definition`, `agentRun`, `history`, `continueTurnOf`, `handedOverJournal`, `switchesOf`, `eventsOf`) |
| Test isolation and determinism are appropriate for the exercised boundary | Pass, one note | Waits use deadlines; the held turn's end is measured, not assumed. Note: UL-11/UL-12 depend on earlier cases' exhaustion and history on the shared node, and ULP-02 on ULP-01's nodes. This is stated and, for ULP-02, asserted, but neither runs alone with `-t` |
| Large files remain coherent and navigable rather than mixing unrelated scenarios | Pass | One subject per file |
| No stale, duplicated, disabled-without-reason, or compatibility-only tests remain | Pass | — |
| Added, updated, and removed coverage agrees with the coverage investigation and execution evidence | Pass | API-01: 12/12. API-02: ULP-01 and ULP-02 pass. API-03: the full E2E suite, 575 passed, with one teardown `ENOTEMPTY` under load in an untouched file that passes alone (FU-646-05). API-04: MRD-04 fails on the stale probe address (FU-646-04). API-07: the live limit is Not Tested, honestly reported |
| Test callers and fixtures exercise an independently established supported scenario rather than proving one by themselves | Pass | UL-10: a person's next message while the switch is pending (the only real trigger of not-quiet, since Codex ends a turn at its error; the engineer's finding). UL-11: a delegator whose own launch is exhausted. UL-12: a Team coordinator without history. ULP-02: a peer's copy without history |
| Each test enters through its scenario's real trigger and follows the real actor's or event's steps, without a setup real use does not produce | Pass — deviation recorded, reason holds | Real triggers: GraphQL, the WebSocket, `delegate_task`. Two fixture options: `HOLD_LIMIT` stands for a slow failing turn; `CALL_TOOL` in AGY's `runtime_error` case lets an agent on an exhausted model still delegate, because the native runtime never reports a limit and the scripted Codex can't call tools. Both are recorded in the fixtures and the coverage report |

## Findings

None.

## Follow-ups

- Follow-ups this review added: None.
- FU-646-05 (the API/E2E engineer's): a teardown race under load in `search-files-through-gate`, untouched by this ticket, which passes alone. I agree it is a follow-up: this change didn't cause it, it isn't in this ticket's functionality, and it isn't in a file this ticket edits.
- FU-646-04: unchanged.

## Latest Authoritative Result

- Result: `Pass`
- Changed durable test paths reviewed: the four above
- Unresolved finding IDs: none
- Recommended Recipient: `delivery_engineer`
- Notes:
  - Non-blocking: UL-12 could also assert the member's tree `launchSource.origin` (`node_fallback`), which its evidence already shows.
  - The live usage limit is Not Tested (no exhausted account, by design).
  - The release stays held on R-6 (the router template) and DEC-008, both with the founder.
