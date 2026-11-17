# API/E2E Test Review Report

## Review Meta

- Review Round: `1`
- Trigger: API/E2E engineer, API-REV-002 Pass (round 2 of API/E2E; F-1 resolved by DEC-008), 2026-11-17
- Requirements Doc Reviewed As Context: `requirements-doc.md` (SR-004, DEC-008)
- Investigation Notes Reviewed As Context: through the coverage investigation
- Solution Revision Record Reviewed As Context: SR-004
- Design Spec Reviewed As Context: `design-spec.md` (part 1)
- Supplemental Task Artifacts Reviewed As Context: N/A
- Architecture Review Revision Record Reviewed As Context: ARCH-REV-003 (context)
- Implementation Revision Record Reviewed As Context: IR-002
- Original Code Review Report: `code-review-report.md` (CRR-003, Pass)
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-004`
- Coverage Investigation: `api-e2e-coverage-investigation.md`
- Execution Coverage Report: `api-e2e-execution-coverage-report.md`
- API/E2E Revision Record Reviewed As Context: `api-e2e-revision-record.md` (API-REV-001, API-REV-002)
- Delivery Revision Record Reviewed As Context: N/A
- API/E2E Result: Pass (API-REV-002)
- Final Validation Confidence: 94% (as reported)
- Prior unresolved test-review findings rechecked: None (first test review of this ticket; round 1 of API/E2E failed and went to failure-origin review)
- Project testing guideline(s) applied: `/TESTING.md`, as the coverage investigation records it. Checked: clean environment (`env -i`), keys only from the test vault (RR-09 through `capturedTestVaultSetting`), test-owned data roots, the user's app and data untouched, and stopping what the test started (`afterAll` kills its servers, tagged processes and RR-09's process groups). No conflict or discrepancy.
- Supported Product Scenario Basis Confirmed: `Yes` (SCN-001..SCN-004; REQ-001..REQ-005; DEC-008)

## Changed Durable Test Scope

| Durable Test Path | Change | Related Scenario / Requirement | Coherent Test Responsibility | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/restart-resume/restart-reminder-built-server.e2e.test.ts` | Added in `4cec9abfea` (RR-01..08). Updated in `b78555d7bb` (RR-02 assertion to DEC-008, by the implementation engineer) and `eef8ed6195` (RR-09 live; evidence-only fields) | AC-001 (restart, kill, update), AC-002, AC-003 (native, Antigravity, Claude, Codex), AC-004; REQ-001..005; DEC-008 | The restart reminder across real restarts of the built server, one case per cause and runtime | 678 lines, one surface; header index of cases and gates. Reviewed as a whole, because this is its first test review |

- No durable test file changed: `No`

## Proportional Test-Code Checks

| Check | Result | Evidence / Notes |
| --- | --- | --- |
| Scenario grouping and names make intent clear | Pass | RR-01..09 named by cause and runtime, with AC IDs in the header; shared helpers (`TestNode`, `ScriptedModel`, `updateCase`, `liveRestart`) sit above the cases |
| Assertions prove approved requirements instead of incidental details | Pass | Each case asserts what the requirements name. **Record:** live entry within one 2 s check, no `shutdownAt` until a graceful stop. **Take:** record removed, pending reminder with its cause. **Wake:** woken only after an update. **Text:** reminder text per cause (DEC-003 line for restart/update, DEC-008 line and not the "stopped" line after a kill). **Delivery:** exactly once (`model.reminded(...)` length 1, a second input carries none), a control run without a task gets nothing, reminders file emptied after delivery. Live cases assert the agent's reaction loosely (regex on the answer), proportionate for a live model |
| Fixtures, setup, helpers, and data builders reuse meaningful repetition | Pass | `updateCase` serves RR-03/04/05; `liveRestart` serves RR-07/08; `busyNativeRun`, `recordEntry` and `expectBackgroundStarted` are shared |
| Test isolation and determinism appropriate for the boundary | Pass | Each case has its own data root and server process; the scripted model makes turns deterministic. Waits are recorded first and asserted at the end, so a build without the behavior still completes the restart. Fixed waits (5–8 s) back only negative checks ("nothing woken"), which is proportionate at this boundary. The known start-under-load failure is named as a precondition (`expectBackgroundStarted`), not hidden. Test-owned processes are cleaned by tag and, for RR-09's orphans, by process group |
| Large files remain coherent and navigable | Pass | One surface; navigable with its header index |
| No stale, duplicated, disabled-without-reason, or compatibility-only tests remain | Pass | RR-02's stale "stopped" assertion was corrected to DEC-008 in this ticket (ticket-scope.md: tests a change makes untrue). The API/E2E engineer's search found no other test asserting the old unexpected-stop line. Live cases skip by gate or a missing vault setting, with the reason in the header |
| Coverage agrees with the coverage investigation and execution evidence | Pass | Cases match the report's Cases table and `evidence/API-R2-restart-suite/` (RR-02 and RR-09 JSON spot-checked by path) |
| Test callers and fixtures exercise an independently established supported scenario | Pass | Every case maps to SCN-001..SCN-004. The update case's previous-release copy (`previousReleaseOf`) changes only the release stamp, which is the one fact the cause rule reads. It produces the same initiating state a real update does (a record written by another release) and does not create a scenario |
| Each test enters through its scenario's real trigger without setup real use does not produce | Pass | The built `dist/app.js` runs as its own process. Runs are driven through GraphQL and the agent WebSocket, as the app does. SIGTERM stands for the graceful quit, SIGKILL for a crash; the desktop Restart server and quit were proven separately (API-15). The next input comes from a real client message, and restore uses the app's mutation. The scripted model and the scripted AGY CLI replace only inference |

## Findings

None.

Non-blocking note: `previousReleaseOf` creates `.restart-reminder-e2e-previous-*` inside the server package, and `afterAll` removes it. A test process killed mid-run would leave it in the package folder. This is cosmetic and test-owned.

## Follow-ups

- Follow-ups this review added: None (FU-002 and FU-004 stand as recorded by API/E2E and the Solution Designer)

## Latest Authoritative Result

- Result: `Pass`
- Changed durable test paths reviewed: `autobyteus-server-ts/tests/e2e/restart-resume/restart-reminder-built-server.e2e.test.ts`
- Unresolved finding IDs: None
- Recommended Recipient: `delivery_engineer`
- Notes: The suite proves part 1 at the built-server boundary across every cause, the exactly-once race and four runtimes. RR-09 shows a real model acting correctly on the DEC-008 line. Residual: FU-002 (pre-existing duplicate reminder card in the web view; the designer may pull it in), FU-004 (crash orphans, out of scope by the user's decision), ACP live Not Tested, and the watcher integration files failing for environmental reasons (API-01).
