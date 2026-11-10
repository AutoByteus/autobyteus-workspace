# API/E2E Test Review Report

## Review Meta

- Review Round: `1` (CRR-005)
- Trigger: API/E2E round 2 (`API-REV-002`) `Pass`; proportional review of the durable test changes in `a380fc419f` and `188ac5c318`
- Requirements Doc Reviewed As Context: `requirements-doc.md` (SR-005)
- Investigation Notes Reviewed As Context: `investigation-notes.md` (as cited)
- Solution Revision Record Reviewed As Context: `solution-revision-record.md`
- Design Spec Reviewed As Context: `design-spec.md` (SR-005)
- Supplemental Task Artifacts Reviewed As Context: `follow-ups.md`
- Architecture Review Revision Record Reviewed As Context: `architecture-review-revision-record.md`
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md` (IR-001…IR-004)
- Original Code Review Report: `code-review-report.md` (CRR-004, Pass)
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-005`
- Coverage Investigation: `api-e2e-coverage-investigation.md`
- Execution Coverage Report: `api-e2e-execution-coverage-report.md`
- API/E2E Revision Record Reviewed As Context: `api-e2e-revision-record.md` (API-REV-001, API-REV-002)
- Delivery Revision Record Reviewed As Context: N/A
- API/E2E Result: `Pass`
- Final Validation Confidence: 95%
- Prior unresolved test-review findings rechecked: None (first test review)
- Project testing guideline(s) applied: `TESTING.md` § Browser probes and § Rules (a probe owns its stack and cleans up; assert DOM, state and API results; rule 9 for the MSP-33 attempt-1 fix). No conflict with the skill.
- Supported Product Scenario Basis Confirmed: `Yes` (SCN-005, SCN-010, SCN-011; MSP-05 relabel for AC-005-4)

Diff reviewed: `git diff d37397b40d 188ac5c318 -- autobyteus-web/tests/e2e/` (+319/−6; nothing removed). Execution evidence: `evidence/api-e2e/round2/API-17-full-probe-excerpt.txt` (36/36), `evidence/api-e2e/API-14-16-probe-excerpt.txt`.

## Changed Durable Test Scope

| Durable Test Path | Change | Related Scenario / Requirement | Coherent Test Responsibility | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-web/tests/e2e/mobile-shell-probe.mjs` — MSP-33 | Added | SCN-005; REQ-005, AC-005-1/3/6/7/8 | The phone's reload restore across row kinds, plus Create run before and after the first send | Its own paired phone context. A `MutationObserver` trace, set by an init script and reset at each page load, proves "Opening…" and never the list first |
| same file — MSP-36 | Added | SCN-011; REQ-013, AC-013-1 | Self-delegation words through real tool calls, for a standalone run and a Team member; a teammate keeps the own-team words | Counts tree nodes before and after the standalone call to show nothing was placed |
| same file — MSP-05 comment and assertion label; header entries | Updated | AC-005-4 | The Org entry reload still lands on the list | Label only; the assertion is unchanged |
| `autobyteus-web/tests/e2e/mobile-closed-task-rows-cases.mjs` — MSP-34 | Added | SCN-010; REQ-011, AC-011-1/2, QR-002 | A Task closed while its listed host is stopped, seen on two phones | Reuses the file's delta stack, `watchRows` and the read recorders |
| same file — MSP-35 | Added | SCN-010; AC-011-1 | The same on a desktop window | Own browser context, closed in `finally` |

- No durable test file changed: `No`

## Proportional Test-Code Checks

| Check | Result | Evidence / Notes |
| --- | --- | --- |
| Scenario grouping and names make intent clear | Pass | Each case has a header entry naming its requirement, a lettered sub-scenario comment, and failure labels that name the AC. MSP-34/35 sit with the other closed-Task cases (MSP-24…27). See TR-N1 for one misleading label |
| Assertions prove approved requirements instead of incidental details | Pass (TR-N1 noted) | The assertions check route queries, the run-screen state, list visibility from the DOM, node statuses and stored views through GraphQL, read counts per operation, and the exact refusal words. AC-011-2 is checked as at most one view read per digest value; QR-002 as no view read while quiet |
| Fixtures, setup, helpers, data builders reuse meaningful repetition | Pass (TR-N2 noted) | Reuses `openPhone`, `openRow`, `menuOpen`, `runScreen`, `showOlder`, `childRow`, `storedHas`, `watchRows`, `reads`, `recordReads`, `stack.agentCall` |
| Isolation and determinism appropriate for the boundary | Pass | Each case uses its own phone or browser context, closed in `finally`. Waits end on observable conditions; the fixed 12–15 s sleeps span the 5 s poll so a quiet window and a digest cycle are covered. MSP-33's attempt-1 timing fault was fixed in the test by waiting for the node's stored message, per TESTING rule 9 |
| Large files coherent and navigable | Pass | The probe file is large but stays one surface (the phone shell journeys), with its case index at the top |
| No stale, duplicated, disabled-without-reason or compatibility-only tests | Pass | MSP-05's old "a reload of a run entry lands on the list" claim is reworded to the Org entry it actually exercises. Nothing is disabled |
| Coverage agrees with the coverage investigation and execution evidence | Pass | The execution report's AC proof rows match MSP-33…36 and API-17's 36/36 run |
| Test callers exercise an independently established supported scenario | Pass | Restore, Create run, stopped-host closure and self-delegation are all approved scenarios (SCN-005/010/011) |
| Each test enters through the real trigger and follows the real actor's steps | Pass | Phone taps, reloads, Back and Forward, and the composer's first message; the PTM's own `delegate_task`; another PTM run's `update_task` closing the Task; `terminateAgentRun` to stop the host; a Team member's tool call over its stream |

## Findings

No blocking findings. Two non-blocking notes for the API/E2E engineer to take up when convenient (they do not change any verdict):

| Finding ID | Test Path / Scenario | Evidence | Required Action | Classification / Owner |
| --- | --- | --- | --- | --- |
| TR-N1 (non-blocking) | MSP-34 / MSP-35, the TODO step; the failure label "after TODO both phones agree with the node's stored view (AC-011-1, reopened)" | Setting the Task back to TODO does not reopen its executions. Only the assigning run's reactivation does (`docs/modules/projects.md:30-36`; the closed index is unmarked only on a new current entry, `task-execution-resource-service.ts:318-338`). The runs show the digest unchanged and `nodeStillClosed: true`. The assertion (the list agrees with the node) is right, but its label and the execution report's "AC-011-1 Proven" suggest the "reopened → returns" half was exercised. For a stopped host that half cannot happen: reactivation is done by the host run, which makes it active, and then the active-host rule applies | Reword the label and comment, e.g. "a Task status set back to TODO does not reopen its executions: the lists still agree with the node". In the report, record that AC-011-1's "(or reopened) … returns" half is covered for active hosts by the 446 rule and is not reachable for a stopped host | Non-blocking note (API/E2E) |
| TR-N2 (non-blocking) | MSP-33, `toList` + `showOlder` repeated before each tap | The same two lines and comment appear five times; in `createRun` they are mis-indented (lines added near `+302-304` of the diff) | Fold them into one local helper, e.g. `backToList()` | Non-blocking note (API/E2E) |

## Follow-ups

- Follow-ups this review added: None

## Latest Authoritative Result

- Result: `Pass`
- Changed durable test paths reviewed: `autobyteus-web/tests/e2e/mobile-shell-probe.mjs` (MSP-33, MSP-36, MSP-05 label, header), `autobyteus-web/tests/e2e/mobile-closed-task-rows-cases.mjs` (MSP-34, MSP-35, header)
- Unresolved finding IDs: None (TR-N1 and TR-N2 are non-blocking notes)
- Recommended Recipient: `delivery_engineer`
- Notes: for delivery's docs sync, `autobyteus-web/docs/chat.md:359,555` still give the moved composable's old path (C-09).
