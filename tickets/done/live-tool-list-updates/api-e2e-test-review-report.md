# API/E2E Test Review Report

## Round 2 (API-REV-003): Not Applicable

- Trigger: API/E2E `Pass` at API-REV-003 after the delivery-stage Local Fix IR-005 (test-only web spec, reviewed in CRR-007).
- No durable API/E2E test file changed: `git diff db27b28223 b404e0b519` over `tool-list-reopen-failure.e2e.test.ts`, `tool-list-update-cases.mjs` and `delegated-launch-defaults-probe.mjs` is empty, and `b404e0b519` touches only ticket files. The IR-005 spec change is implementation-owned and was reviewed in CRR-007.
- API-05 reran on `1c454e1ec1`: "Tests 1 passed (1)" (`evidence/api-e2e/API-05-round3-rerun.log`).
- Result: `Not Applicable`. Recommended recipient: `delivery_engineer`. API-04 (the real Grok CLI run) is still owed; see Latest Authoritative Result.

## Review Meta (Round 1)

- Review Round: 1
- Trigger: API/E2E `Pass` at API-REV-002 for every case that can run now. API-04 (the real Grok CLI run) is owed because of the user's Grok usage limit
- Requirements Doc Reviewed As Context: `requirements-doc.md` (SR-007; AC-001, AC-003, AC-006, AC-007)
- Investigation Notes Reviewed As Context: not reread
- Solution Revision Record Reviewed As Context: `solution-revision-record.md` (SR-010)
- Design Spec Reviewed As Context: `design-spec.md` (SR-010)
- Supplemental Task Artifacts Reviewed As Context: none
- Architecture Review Revision Record Reviewed As Context: N/A for this review
- Implementation Revision Record Reviewed As Context: IR-004 (code `011275b49a`, unchanged since: the test commits touch only tests and `package.json`)
- Original Code Review Report: `code-review-report.md` (CRR-005, Pass)
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-006`
- Coverage Investigation: `api-e2e-coverage-investigation.md`
- Execution Coverage Report: `api-e2e-execution-coverage-report.md` (Cases, Acceptance-Criteria Proof)
- API/E2E Revision Record Reviewed As Context: `api-e2e-revision-record.md` (API-REV-001, API-REV-002)
- Delivery Revision Record Reviewed As Context: N/A
- API/E2E Result: Pass (API-01, 03, 05, 06, 07); API-04 owed
- Final Validation Confidence: 94%
- Prior unresolved test-review findings rechecked: none (first test review)
- Project testing guideline(s) applied: `TESTING.md` (clean environment; test-owned data root, HOME, ports and processes; stop what you started; assertions first; browser probes own their stack and pass a fresh `--output-dir`). No conflicts
- Supported Product Scenario Basis Confirmed: `Yes`. SCN-004 (single run, failed reopen) and SCN-001/003/005 through the app's edit path

## Changed Durable Test Scope

| Durable Test Path | Change | Related Scenario / Requirement | Coherent Test Responsibility | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/runtime/tool-list-reopen-failure.e2e.test.ts` | Added (`ff1aaa2d60`) | AC-007, REQ-010, SCN-004 (single Grok run) | Failed reopen on the real Studio server: shown failure, not sent, other run untouched, retry succeeds with the notice | Not gated; scripted ACP agent; no provider |
| `autobyteus-web/tests/e2e/tool-list-update-cases.mjs` | Added (`db27b28223`) | AC-001, AC-003, AC-006; REQ-006, REQ-007 (TLU-001) | The app's edit path while an AGY run is open: add → card and call works; remove → refused and card; stopped → restored with a card | Registered in the shared browser probe |
| `autobyteus-web/tests/e2e/delegated-launch-defaults-probe.mjs` | Updated (+13/−2) | TLU-001 | Registers the case; sets `AGY_FAKE_TOOL_LOG` in the owned backend env; passes `agyToolCalls` | Header case list updated |
| `autobyteus-web/package.json` | Updated (+1) | TLU-001 | `test:e2e:tool-list-updates` | — |

- No durable test file changed: `No`

## Proportional Test-Code Checks

| Check | Result | Evidence / Notes |
| --- | --- | --- |
| Scenario grouping and names make intent clear | Pass | Each file's header states its cases, criteria and trigger. The test name and the TLU-001 title say what is proven |
| Assertions prove approved requirements instead of incidental implementation details | Pass | **Server e2e:** it asserts what the user sees (`ERROR` frames or a rejected `SEND_MESSAGE` ack) with the exact approved text (`REOPEN_FAILED`), "not sent" from the agent processes' methods, no notice, run B untouched, and the retry carrying "Now available". **TLU-001:** the card count and text (header stripped); the server's refusal as the MCP client received it; the restored run's card and call. Note 1 below is a non-blocking tightening |
| Fixtures, setup, helpers, and data builders reuse meaningful repetition | Pass | The existing Studio e2e helpers, the Grok ACP fixture and the probe's shared helpers (`newChatFor`, `callFromComposer`, `openAgentRun`) are reused. The per-run shell wrapper is local and documented |
| Test isolation and determinism are appropriate for the exercised boundary | Pass | Resolved temp data root, env restored, sockets and runs terminated, data dir removed. The `fail-next-load` flag is consumed only by a reopen process (`n != 0`), so run B can't take it. Polling has deadlines and labels. Note 2 below concerns one fixed wait |
| Large files remain coherent and navigable | Pass | 187 and 127 lines, each one scenario |
| No stale, duplicated, disabled-without-reason, or compatibility-only tests remain | Pass | — |
| Coverage agrees with the investigation and execution evidence | Pass | API-05 (`API-05-round2-rerun.log`, "Tests 1 passed (1)"); API-06 (`API-06-tool-list-browser-probe.json`, three screenshots) |
| Test callers and fixtures exercise an independently established supported scenario | Pass | A tool change via the app's save (GraphQL `updateAgentDefinition`, or the Edit form); a message via the run WebSocket or the composer; the scripted runtimes stand in only for the provider CLI |
| Each test enters through its scenario's real trigger and follows the real actor's steps | Pass | TLU-001 uses Agents → Edit → Tools → Save Changes in the browser. The stop uses GraphQL `terminateAgentRun` as setup (stopping is not under test); the restore uses the user's next message |

## Findings

None.

Non-blocking notes (no action required for delivery; for whoever next touches these files):

1. `tool-list-reopen-failure.e2e.test.ts:164` still accepts either code (`RUNTIME_SESSION_REOPEN_FAILED|RUNTIME_REJECTED`). That was deliberate while the channel was undecided (round 1). SR-010 made it an `ERROR` with `RUNTIME_SESSION_REOPEN_FAILED`, and the integration test already asserts that code exactly, so the e2e could be exact too.
2. `tool-list-reopen-failure.e2e.test.ts:158` waits a fixed 2 s for the definition change to be applied before the next message. The apply pass is in-memory and coalesced, so this is generous. A late pass would make the test fail rather than falsely pass.

## Follow-ups

- Follow-ups this review added: None. API/E2E recorded FU-004 (a card's position after a reload; existing replay code) and closed FU-003.

## Latest Authoritative Result

- Result: `Not Applicable` (round 2, API-REV-003). Round 1: `Pass`
- Changed durable test paths reviewed: none in round 2; the four above in round 1
- Unresolved finding IDs: None
- Recommended Recipient: `delivery_engineer`
- Notes:
  - **API-04 is still owed.** The real Grok CLI run waits for the user's Grok credit (expected tomorrow), and API/E2E will send its result before delivery. The requirements' success definition asks for a real run per runtime, and DEC-004's "merge does not wait" covers Codex only. Delivery should therefore not finalize until API-04's result arrives, or until the Solution Designer decides.
  - Codex's real run passed (API-03).
