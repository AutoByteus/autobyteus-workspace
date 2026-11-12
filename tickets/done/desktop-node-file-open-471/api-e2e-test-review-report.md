# API/E2E Test Review Report — desktop-node-file-open-471 (autobyteus-471)

## Review Meta

- Review Round: 1
- Trigger: API/E2E engineer, API-REV-002 (Pass, 95%); code under test `b0f3d1c42b`; report and evidence `d85ff5aae0`
- Requirements / Design reviewed as context: `requirements-doc.md` (SR-002), `design-spec.md` (SR-002; direct route)
- Original Code Review Report: `code-review-report.md` (CRR-001 failure-origin: CR-001…CR-003)
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-002`
- Coverage Investigation / Execution Coverage / API/E2E Revision Record: `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, `api-e2e-revision-record.md`
- API/E2E Result: Pass; Final Validation Confidence: 95%
- Prior unresolved test-review findings rechecked: none
- Project testing guideline(s) applied: `TESTING.md` § Browser probes. No conflicts.
- Supported Product Scenario Basis Confirmed: `Yes`

## Changed Durable Test Scope

| Durable Test Path | Change | Related Scenario | Responsibility | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-web/tests/e2e/event-monitor-file-preview-probe.mjs` (`32dccf58fa`) | Updated | AC-005 preserved; N-003 | `activate` waits for the tab focus after the content shows | The handler focuses one task after `revealTool` (`setTimeout(0)`). The focus is still asserted, now through the state timeout; the delay is recorded. |
| `autobyteus-web/tests/e2e/search-pdf-preview-probe.mjs` (`b49b5c539f`) | Updated | AC-005 preserved; API-003 | Waits for the re-read on reopen (autobyteus-450, `edd84787f7`) before asserting | Same assertions after the wait |
| `autobyteus-web/tests/e2e/mobile-shell-probe.mjs` (`23524436af`) | Updated | AC-005 preserved; MSP-20 (AC-009c of its own ticket) | The "no status read while hidden" window starts once the run screen shows; reads are counted by send time (`sentAt`) | Not weakened: a poll on the run screen (every 5 s across 11 s) is still caught. Only reads sent while the list was still on screen are excluded. Diagnosis over three instrumented runs: `r2-API-05-MSP-20-diagnosis/`. The background window gets the same send-time rule. |

The implementation's new specs (`AgentEventMonitor.remoteRunFiles.spec.ts`, store read-only cases in `fileExplorerNodeRouting.spec.ts`) belong to the IR fix. I checked that they exist and match CRR-001's asks: a component-level remote-run link and attachment test on desktop and phone, and a store read-only test.

- No durable test file changed: `No`

## Proportional Test-Code Checks

| Check | Result | Evidence / Notes |
| --- | --- | --- |
| Scenario grouping and names clear | Pass | Case IDs unchanged; each fix comments its cause |
| Assertions prove requirements | Pass | No assertion removed or loosened; each waits for the behavior it already asserted |
| Fixtures/helpers reuse | Pass | Uses existing `waitState` / `until` / `phoneOps`; one `sentAt` field added at the single request hook |
| Isolation/determinism | Pass | Each fix replaces a race with a condition, not a sleep; MSP-20's cause was measured before the change |
| Large files coherent | Pass | Small local edits |
| No stale/disabled tests | Pass | — |
| Coverage agrees with evidence | Pass | Report Cases notes, `r2-API-05-MSP-20-after-fix.log`, N-001…N-009, API-04 pass |
| Callers exercise established scenarios | Pass | Existing probe journeys |
| Real trigger and steps | Pass | Clicks and visibility events as before |

## Findings

None.

## Follow-ups

- Follow-ups this review added: None (FU-001…FU-003 already recorded by API/E2E).

## Latest Authoritative Result

- Result: `Pass`
- Changed durable test paths reviewed: `event-monitor-file-preview-probe.mjs`, `search-pdf-preview-probe.mjs`, `mobile-shell-probe.mjs`
- Unresolved finding IDs: none
- Recommended Recipient: `delivery_engineer`
- Notes: residuals are the Windows/Linux desktop (not run), RSK-001 (accepted by the user), and MSP-24/34/35 (FU-003, outside this ticket).
