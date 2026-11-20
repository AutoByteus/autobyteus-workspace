# API/E2E Test Review Report — ios-demo-mode-279 (autobyteus-279)

## Review Meta

- Review Round: 1
- Trigger: API/E2E engineer, API-REV-002 (Pass, 91%); HEAD `e81f54e272`; code under test `4ad317c20d` (IR-002 `930477c533`)
- Requirements / Design reviewed as context: `requirements-doc.md` (SR-001), `design-spec.md` (SR-004)
- Original Code Review Report: `code-review-report.md` (CRR-003 Pass)
- Code Review Revision Record: `code-review-revision-record.md`; Current Code Review Revision ID: `CRR-004`
- Coverage Investigation / Execution Coverage / API/E2E Revision Record: `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, `api-e2e-revision-record.md` (API-REV-001, API-REV-002)
- API/E2E Result: Pass; Final Validation Confidence: 91% (the gap is NT-01, the build-only workflow run, and the device and TestFlight checks, both waiting on the right word)
- Prior unresolved test-review findings rechecked: none
- Project testing guideline(s) applied: `TESTING.md` (isolated nodes, fresh-start builds, browser probes). No conflicts.
- Supported Product Scenario Basis Confirmed: `Yes`

## Changed Durable Test Scope

| Durable Test Path | Change | Related Scenario | Responsibility | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-web/tests/e2e/mobile-code-wrap-cases.mjs` (`4352ec81fa`, API/E2E) | Updated (+3) | MSP-50…52 (preserved), REQ-008 | The host-fit walk skips `display: contents` ancestors | Correct by CSS: such an element has no box and clips nothing. The wrappers are this change's single-pane wrappers (`MobilePairedShell.vue`). Nothing else is skipped; the assertions are unchanged. MSP-50…52 pass. |
| iOS core tests (IR-002): `SavedNodeDisplayNamePlaceholderMigrationTests.swift` (7), `SavedNodeEntryNamesTests.swift`, `NodeConnectionFlowTests.swift`, `ConnectionValidatorTests.swift`, `NativeNodeNameReadsTests.swift` | Added / updated | CR-001, REQ-013 | The migration's rewrite, field preservation, re-run and two interruption points; the name rule; the flow's rename; a source guard that no native view reads `displayName` | The migration cases cover each write step. The source guard reads the sources through `#filePath`, which works on a simulator, the only place these tests run (noted, not a defect). |

API/E2E's round-2 UI tests stay temporary evidence (`evidence/api-e2e/scripts/ios/`).

## Proportional Test-Code Checks

| Check | Result | Evidence / Notes |
| --- | --- | --- |
| Scenario grouping and names clear | Pass | Test names state the rule (`testAnInterruptionAfterTheRewriteIsRestoredAndRunAgain`) |
| Assertions prove requirements | Pass | Stored names after migration; the shown name never an address; MSP host fit |
| Fixtures/helpers reuse | Pass | — |
| Isolation/determinism | Pass | Each migration test uses its own `UserDefaults` suite; FS-iOS 56/56 from a non-symlinked path (FU-005 recorded) |
| Large files coherent | Pass | — |
| No stale/disabled tests | Pass | Two stale validator assertions rewritten with the removed `serverName` |
| Coverage agrees with evidence | Pass | `r2/API-04a-shipped-app.log`, `r2/API-04b-update.log`, `r2/API-04b-saved-after-update.txt`; smoke 8/8 with no skips |
| Callers exercise established scenarios | Pass | The update over the shipped app is the founder's own case |
| Real trigger and steps | Pass | The shipped build installed first, then the new app over it, on a real isolated node |

## Findings

None.

## Follow-ups

- Follow-ups this review added: None (FU-005, the symlinked-path test, was recorded by API/E2E).

## Latest Authoritative Result

- Result: `Pass`
- Changed durable test paths reviewed: `mobile-code-wrap-cases.mjs` (`4352ec81fa`), the IR-002 iOS core tests
- Unresolved finding IDs: none
- Recommended Recipient: `delivery_engineer`
- Notes: open before release are NT-01 (the build-only `release-ios.yml` run, which needs a push on the right word) and the device and TestFlight checks (on the founder's word). Observation, not a finding: after Switch node, reopening the current node keeps a connection sheet that was opened earlier.
