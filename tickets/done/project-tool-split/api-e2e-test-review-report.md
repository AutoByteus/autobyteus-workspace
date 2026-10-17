# API/E2E Test Review Report

## Review Meta

- Review Round: 1
- Trigger: API/E2E pass handoff (API-REV-001) from `/software_engineering_team/api_e2e_engineer`, head `dec87a3915`
- Requirements Doc Reviewed As Context: `requirements-doc.md` (`Approved`, SR-001)
- Investigation Notes Reviewed As Context: `investigation-notes.md` (unchanged since CRR-001)
- Solution Revision Record Reviewed As Context: `solution-revision-record.md` (SR-001, SR-002)
- Design Spec Reviewed As Context: `design-spec.md` (SR-002)
- Supplemental Task Artifacts Reviewed As Context: N/A
- Architecture Review Revision Record Reviewed As Context: `architecture-review-revision-record.md` (ARCH-REV-001)
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md` (IR-001)
- Original Code Review Report: `code-review-report.md` (CRR-001, Pass)
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-002`
- Coverage Investigation: `api-e2e-coverage-investigation.md`
- Execution Coverage Report: `api-e2e-execution-coverage-report.md`
- API/E2E Revision Record Reviewed As Context: `api-e2e-revision-record.md` (API-REV-001)
- Delivery Revision Record Reviewed As Context: N/A
- API/E2E Result: Pass
- Final Validation Confidence: 95%
- Prior unresolved test-review findings rechecked: None (first test review)
- Project testing guideline(s) applied: `TESTING.md` at the repository root, as recorded in the coverage investigation. Rule 9 requires suite defects to be fixed in the same branch, each as its own commit labelled a baseline fix. That rule is why these fixes are in this ticket. No conflict with the skill.
- Supported Product Scenario Basis Confirmed: `Yes`. The changed tests cover existing supported regression scenarios that the original suites already established: Task closure root visibility (AC-008 of its own ticket), left-panel selection across pages (PMU-008), and the task locator leaving the center view untouched (PMU-021).

Implementation source is unchanged since CRR-001 (`285acae39a`, `79c5d2c5ef`), so the CRR-001 source review still stands.

## Changed Durable Test Scope

| Durable Test Path | Change | Related Scenario / Requirement | Coherent Test Responsibility | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/projects/task-closure-root-visibility.e2e.test.ts` (`0205b9ed79`) | Updated | the root view keeps the Manager's messages with Task A's worker and sub-copy (regression for this ticket's renamed tool lists) | the wait now covers both messages the next assertion counts (`>= 2` touching Task A, and one carrying the Manager run) | Strengthens the wait. The assertion is unchanged. The race was reproduced by delaying the second message (`tcrv-base-timing-injection.log`). |
| `autobyteus-web/tests/e2e/project-manager-ux-probe.mjs` (`50f228811f`) | Updated | PMU-008, left-panel selection across pages | opens the Team member that exists | `createDefinitions` gives the Team only `manager` (lines 162-163), so `/worker` was a stale locator left by `938933d8e2`. |
| `autobyteus-web/tests/e2e/project-manager-ux-task-locator-cases.mjs` (`dec87a3915`) | Updated | PMU-021: a locate does not change the center view or the selection | each check now compares against a baseline read right before its own action, after the live host conversation settles (`CALLED:` shown, text stable for 1 s). Failures report the first text difference. | No assertion was weakened (see the checks below). |
| `TESTING.md` (`1c7eb70151`, `7af116e8de`) | Updated (guideline, not test code) | n/a | user-directed changes to the guideline | Recorded only, not reviewed as test code. The "Known baseline exception" was removed because its cause is now known and tracked as PB-001 with `/project_task_manager`. The two affected `agent-status-websocket` integration cases still fail until PB-001 is fixed. |

- No durable test file changed: `No`

## Proportional Test-Code Checks

| Check | Result | Evidence / Notes |
| --- | --- | --- |
| Scenario grouping and names make intent clear | Pass | Each wait or baseline has a comment giving its reason. The `until` label now names both messages. `settledCenter(label)` names the action it precedes. |
| Assertions prove approved requirements, not incidental details | Pass | The task-closure assertion (`aMessageIdsBefore.length >= 2`) is unchanged. Only the wait was aligned to it. In PMU-021 the old keyboard check compared the live conversation text with a baseline read about 10 s earlier, before the delegation reply arrived. That compared conversation progress, not the effect of a locate. The new per-action baselines prove the stated behavior ("Enter / Space neither open nor toggle the row"; the locate leaves the center unchanged). The steps in between keep their own assertions. |
| Fixtures, setup, helpers reuse meaningful repetition | Pass | The `settledCenter` and `textDiff` helpers are local to the cases file and each is used twice. |
| Isolation and determinism fit the boundary | Pass | The fixes replace timing assumptions with waits on observable state. `settledCenter` fails loudly after 30 s rather than passing silently. The suites passed afterwards: projects folder 17/17 files, PMU 25/25 twice. |
| Large files coherent and navigable | Pass | No structural change. |
| No stale, duplicated, disabled or compatibility-only tests | Pass | The stale `/worker` locator is removed. Nothing is disabled. |
| Coverage changes agree with investigation and execution evidence | Pass | The execution report's §Durable Coverage Changed lists the same files, commits and causes. Logs are under `evidence/api-e2e/`. |
| Test callers exercise an independently established scenario | Pass | All three are pre-existing product scenarios from their own suites. No new scenario is introduced by a test. |
| Each test enters through its real trigger and actor steps | Pass | The real HTTP/WS root view and the scripted AGY Manager tool calls are unchanged. The renderer probe still drives real clicks and keys. No setup was added that real use would not produce. |

## Findings

None.

## Follow-ups

None new. PB-001 (`AGENT_INPUT_STATE` flushes the egress cadence window) was already reported to `/project_task_manager` by API/E2E.

- Sent to: `None`

## Latest Authoritative Result

- Result: `Pass`
- Changed durable test paths reviewed: `task-closure-root-visibility.e2e.test.ts`, `project-manager-ux-probe.mjs`, `project-manager-ux-task-locator-cases.mjs`; `TESTING.md` recorded as a user-directed guideline change
- Unresolved finding IDs: None
- Recommended Recipient: `/software_engineering_team/delivery_engineer`
- Notes: No focused rerun was needed; each change can be judged from the diff and the execution evidence. Residual risks are as recorded by API/E2E: no AutoByteus-native agent was run in the app, and Codex was not run live.
