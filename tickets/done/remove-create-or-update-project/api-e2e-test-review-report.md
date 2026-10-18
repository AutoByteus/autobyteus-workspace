# API/E2E Test Review Report

## Review Meta

- Review Round: 1
- Trigger: API/E2E pass handoff (API-REV-001) from `/software_engineering_team/api_e2e_engineer`, head `d1796f010d`
- Requirements Doc Reviewed As Context: `requirements-doc.md` (`Approved`, SR-001)
- Investigation Notes Reviewed As Context: `investigation-notes.md` (unchanged)
- Solution Revision Record Reviewed As Context: `solution-revision-record.md` (SR-001, SR-002)
- Design Spec Reviewed As Context: `design-spec.md` (SR-002)
- Supplemental Task Artifacts Reviewed As Context: N/A
- Architecture Review Revision Record Reviewed As Context: `architecture-review-revision-record.md` (ARCH-REV-001)
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md` (IR-001, IR-002)
- Original Code Review Report: `code-review-report.md` (CRR-002, Pass)
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-003`
- Coverage Investigation: `api-e2e-coverage-investigation.md`
- Execution Coverage Report: `api-e2e-execution-coverage-report.md`
- API/E2E Revision Record Reviewed As Context: `api-e2e-revision-record.md` (API-REV-001)
- Delivery Revision Record Reviewed As Context: N/A
- API/E2E Result: Pass
- Final Validation Confidence: 96%
- Prior unresolved test-review findings rechecked: None (this is the first test review)
- Project testing guideline(s) applied: `TESTING.md` at the repository root. Rule 9 requires that a failure be fixed from its cause, in the same branch, as its own commit labelled a baseline fix. Both changes follow it. No conflicts.
- Supported Product Scenario Basis Confirmed: `Yes`. Both changed tests cover scenarios their own suites already established: the idle-shutdown lifetime of delegated copies, and the conversation continuing when a follow-up Task goes to an existing copy. This ticket did not cause either failure.

Implementation source is unchanged since CRR-002 (`4807095aed`).

## Changed Durable Test Scope

| Durable Test Path | Change | Related Scenario / Requirement | Coherent Test Responsibility | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/projects/task-copy-idle-lifetime.e2e.test.ts` (`c740d16b3c`) | Updated | idle shutdown and the lifetime of delegated copies (that suite's AC-006/AC-007); regression for this ticket | the process scan no longer blocks the server under test | `liveAgyCwds` is now asynchronous and makes one `lsof -p a,b,c` call instead of a synchronous `spawnSync` per pid. The sampler skips while a scan is running. Every call site awaits the scan. Failure messages now include the wake result and the cause of a failed fetch. No assertion changed. The cause was measured: 90 scans in 1 s, the longest 2.07 s, in `tcil-diag/full-run-3-instrumented.log`. |
| `autobyteus-web/tests/e2e/task-closure-tree-probe.mjs` (`d1796f010d`) | Updated | BR-012..016: a follow-up Task given to an existing copy continues its conversation | the expected text uses the Task's key, which is what the product sends | The product text is `New Task assigned to you: ${taskReference}` (`task-execution-input.ts:72`), and task-keys REQ-018 makes that reference the key. One `createTask` helper records each key, and `assignedText()` builds the expected text. This matches `task-existing-copy-assignment.e2e.test.ts:136-137, 510`. All five Task creation sites in the probe now go through the helper. |

- No durable test file changed: `No`

## Proportional Test-Code Checks

| Check | Result | Evidence / Notes |
| --- | --- | --- |
| Scenario grouping and names make intent clear | Pass | Doc comments on `liveAgyCwds`, `taskKeys`, `createTask` and `assignedText` explain why each exists. `allGone` names its check. |
| Assertions prove approved requirements, not incidental details | Pass | The idle-lifetime assertions are unchanged; only their inputs became asynchronous. The probe now expects the product's real message (the Task key), so its assertion tests actual behavior instead of an outdated taskId string. |
| Fixtures, setup, helpers reuse meaningful repetition | Pass | Four duplicated `createProjectTask` GraphQL snippets became one `createTask` helper. |
| Isolation and determinism fit the boundary | Pass | The fix removes the event-loop stall that caused the timing failures. The sampler's re-entry guard stops scans from overlapping. Partial `lsof` exits (a process ending mid-scan) still return the remaining cwds. `until` (`agy-runtime-error-fixture.ts:17`) accepts async predicates. If `lsof` failed outright, the scan would return an empty list. The "gone" waits would then pass without proving anything, but the earlier `processLive(...) === true` assertions would fail first. Nothing passes silently. The full folder passed twice (18/18 files, 88 tests). The probe passed 16/16. |
| Large files coherent and navigable | Pass | No structural change. |
| No stale, duplicated, disabled or compatibility-only tests | Pass | The stale taskId expectation is gone. Nothing is disabled. |
| Coverage changes agree with investigation and execution evidence | Pass | The execution report lists the same commits and causes, and its diagnostic logs are under `evidence/api-e2e/`. |
| Test callers exercise an independently established scenario | Pass | Both scenarios already exist in their suites. |
| Each test enters through its real trigger and actor steps | Pass | Real HTTP/WS, the scripted AGY Manager tool calls and the renderer flows are unchanged. The new helper uses the same GraphQL mutation the product exposes. |

## Findings

None.

## Follow-ups

None.

- Sent to: `None`

## Latest Authoritative Result

- Result: `Pass`
- Changed durable test paths reviewed: `task-copy-idle-lifetime.e2e.test.ts`, `task-closure-tree-probe.mjs`
- Unresolved finding IDs: None
- Recommended Recipient: `/software_engineering_team/delivery_engineer`
- Notes: No focused rerun was needed; the diffs and the execution evidence were enough to judge both changes. The remaining risk, as recorded by API/E2E: the Codex runtime was not run live (covered by the unit runtime-parity skip test).
