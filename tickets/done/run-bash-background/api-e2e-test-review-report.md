# API/E2E Test Review Report

## Review Meta

- Review Round: `1`
- Trigger: API/E2E engineer, API-REV-001 Pass (2026-11-10); durable test changes in `60900cd0f7`, `e4e106f93a`, `341368dee0` (product code unchanged at `ddd594d07b`)
- Requirements Doc Reviewed As Context: `requirements-doc.md` (SR-005)
- Investigation Notes Reviewed As Context: via the coverage investigation
- Solution Revision Record Reviewed As Context: SR-005 (via the design spec)
- Design Spec Reviewed As Context: `design-spec.md` (notice format, Concrete Examples; Command Wrapper Contract)
- Supplemental Task Artifacts Reviewed As Context: N/A
- Architecture Review Revision Record Reviewed As Context: ARCH-REV-003 (context only)
- Implementation Revision Record Reviewed As Context: IR-002
- Original Code Review Report: `code-review-report.md` (CRR-002, Pass)
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-003`
- Coverage Investigation: `api-e2e-coverage-investigation.md`
- Execution Coverage Report: `api-e2e-execution-coverage-report.md`
- API/E2E Revision Record Reviewed As Context: `api-e2e-revision-record.md` (API-REV-001)
- Delivery Revision Record Reviewed As Context: N/A
- API/E2E Result: Pass
- Final Validation Confidence: 95% (as reported by API/E2E)
- Prior unresolved test-review findings rechecked: None (first test review)
- Project testing guideline(s) applied: `/TESTING.md` (the guideline the coverage investigation records). Applied: clean-environment commands (`env -i PATH HOME TMPDIR`), keys from the test vault only, and rule 9 (the harness baseline failure was diagnosed and fixed, in its own commit). No conflict or discrepancy with this skill.
- Supported Product Scenario Basis Confirmed: `Yes` (SCN-001..SCN-012 from the approved requirements)

## Changed Durable Test Scope

| Durable Test Path | Change | Related Scenario / Requirement | Coherent Test Responsibility | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/runtime/autobyteus-background-task-transport.e2e.test.ts` | Added | AC-001..AC-011, AC-013; SCN-001..SCN-012; QR-002/QR-004 | Native background tasks through the real server, the real native runtime and real processes; only inference is scripted (BGT-01..09) | 678 lines; one surface, one case per acceptance criterion group, with a header index; gated `RUN_NATIVE_BACKGROUND_TASK_E2E=1` |
| `autobyteus-server-ts/tests/e2e/runtime/autobyteus-background-task-live.e2e.test.ts` | Added | requirements' definition of success; REQ-002..004; ASM-002 | The same path with real Anthropic and OpenAI models: two builds, one progress read, one notice, both results reported | Gated, plus a live capability from the test vault (a missing key is a skip, not a pass) |
| `autobyteus-server-ts/tests/e2e/shutdown/native-standalone-host-fixture.mjs` | Updated | REQ-009 / DEC-003 (AC-006) | Turn 1 now asserts that run end stops the run's commands (≤ 10 s) instead of keeping them | The removed assertion ("ordinary agent end retains previews") encoded the behavior DEC-003 retired; run 1 evidence shows it failing for that reason |
| `autobyteus-server-ts/tests/e2e/shutdown/native-standalone-host-shutdown.e2e.test.ts` | Updated | same | Name and header describe the new run-end expectation | — |
| `autobyteus-server-ts/tests/e2e/helpers/native-runtime-live-harness.ts` | Updated | shared live harness (baseline) | `gql` goes through the global fetch, so the owner credential is attached; HTTP errors now surface; `url` getter | Baseline fix in its own commit `60900cd0f7`; local requests pass through the recorder unrecorded (L277-284) |

- No durable test file changed: `No`

## Proportional Test-Code Checks

| Check | Result | Evidence / Notes |
| --- | --- | --- |
| Scenario grouping and names make intent clear | Pass | Case IDs BGT-01..09 carry their AC IDs in names and the file header; the live cases are named by provider |
| Assertions prove approved requirements instead of incidental implementation details | Pass | Assertions check what the model receives: tool list, start/kill results, and notice text in the design's format. They also check the panel contract (`BACKGROUND_TASK_UPDATED` status path), process-table absence, folder removal, and timing bounds taken from the ACs (< 2 s, ≤ 5 s, ≤ 10 s). The AC-008 warning check reads the resolver's "Skipping" line, which the AC itself asks for |
| Fixtures, setup, helpers, and data builders reuse meaningful repetition | Pass | One `ScriptedModel`, `start`/`requests`/`turnEnd`/`idleAfter`/`until`, `tagged` processes and `cleanupTags`; the shared live harness is reused rather than copied |
| Test isolation and determinism are appropriate for the exercised boundary | Pass | Real process timing is bounded by script control (scripted turns, `delayMs`, release file in the live suite); each case has its own workspace and run, `afterEach` kills tagged processes, runs are stopped in `finally` (BGT-06 stops the run in its body; `afterAll` closes the server otherwise). Note (non-blocking): BGT-04 L433 calls `processTable()` inside the `filter`, so it runs `ps` once per process row. It is correct, but slower and each read is a fresh snapshot; hoisting the anchor's `pgid` lookup would be cleaner if the file is touched again |
| Large files remain coherent and navigable | Pass | The 678-line transport suite covers one surface with a header index and helpers at the top |
| No stale, duplicated, disabled-without-reason, or compatibility-only tests remain | Pass | The stale standalone-host assertion was replaced (with run-1 evidence), not skipped; the skips are gate-based, with the reason in the header |
| Added, updated, and removed coverage agrees with the coverage investigation and execution evidence | Pass | Matches the execution report's Cases table (API-02..API-13) and the per-case evidence JSON (BGT-01/04/05/06/07 and the live OpenAI case spot-checked by path) |
| Test callers and fixtures exercise an independently established supported scenario | Pass | Every case maps to an approved scenario (SCN-001..012); no scenario is created by the test |
| Each test enters through its scenario's real trigger without setup real use does not produce | Pass | Runs start through GraphQL and the agent WebSocket, as the app does. The model issues `run_bash` calls; real `npm run dev`, real `kill`, real Stop (`INTERRUPT_GENERATION`), Terminate, and delegation through `delegate_task` with the real idle-shutdown grace. BGT-08's outside `process.kill` is SCN-002's "command ends" by signal. The live suite's release file only controls when the user's own build scripts finish (REQ-004 batching), not platform state |

## Findings

None.

## Follow-ups

- Follow-ups this review added: None

## Latest Authoritative Result

- Result: `Pass`
- Changed durable test paths reviewed: the five paths above
- Unresolved finding IDs: None
- Recommended Recipient: `delivery_engineer`
- Notes: The suites prove the acceptance criteria at the product boundary with real processes, and the live suite validates ASM-002. WSL remains Not Tested (no Windows host); the execution report has steps for the user. One optional tidy-up in BGT-04 is noted above; it does not affect the result.
