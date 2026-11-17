# API/E2E Test Review Report — phone-run-model-runtime-458 (autobyteus-458)

## Review Meta

- Review Round: 1
- Trigger: API/E2E engineer, API-REV-002 (Pass, 94%); fix `6ddf9bb8f5` (IR-002); evidence `126b33aeed`
- Requirements / Design reviewed as context: `requirements-doc.md` (REQ-008, REQ-011), `design-spec.md`
- Original Code Review Report: `code-review-report.md` (CRR-001 failure-origin: CR-001)
- Code Review Revision Record: `code-review-revision-record.md`; Current Code Review Revision ID: `CRR-002`
- Coverage Investigation / Execution Coverage / API/E2E Revision Record: `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, `api-e2e-revision-record.md` (API-REV-001, API-REV-002)
- API/E2E Result: Pass; Final Validation Confidence: 94% (the gap is the environment, plus base-side flaky checks FU-002 and FU-003)
- Prior unresolved test-review findings rechecked: none
- Project testing guideline(s) applied: `TESTING.md` (isolated nodes, scripted runtimes, browser probes). No conflicts.
- Skill basis: design principles as updated on 2026-11-17 (a required collaborator is a required parameter; one picture, one builder).
- Supported Product Scenario Basis Confirmed: `Yes`

## Changed Durable Test Scope

| Durable Test Path | Change | Related Scenario | Responsibility | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-web/tests/e2e/mobile-code-wrap-cases.mjs` (`cdb3ad0025`) | Updated | MSP-50/51 (preserved) | Copy with `ControlOrMeta+C` | A baseline fix: Ctrl+C copies nothing in Chrome on macOS; proof in `api-01-copy-shortcut-macos.log`. The assertions are unchanged. |
| `autobyteus-web/tests/e2e/mobile-shell-probe.mjs` MSP-08 (`1054deb132`) | Updated | UIS-002 (Settings in the run's menu) | The run menu's items in order | The exact order is asserted for a Team member and a standalone agent ("Settings last"); this is tighter, not looser, than before. |
| `autobyteus-web/tests/e2e/mobile-run-settings-cases.mjs` MSP-65 (`41638611b4`) | Added | REQ-008, UXJ-004, VIS-017 (CR-001) | A live Org member: the stop icon, one tap stops the Org on the node, the phone stays on Settings with the rows open, no `unsupported=` | Observable outcomes plus the node's `isActive`. It failed on F-1 and passes after the fix. |
| IR-002 specs: `useWorkspaceHistorySubjectActions.spec.ts`, `useRunStopAction.spec.ts`, `MobileRunSettings.spec.ts` | Updated | CR-001 | The phone shell writes no route on an Org stop (also when the final read fails); the caller's shell is passed through; phone Settings passes `mobile` | Closes the gap that let F-1 escape (the specs had mocked the composable without its setup) |

## Proportional Test-Code Checks

| Check | Result | Evidence / Notes |
| --- | --- | --- |
| Scenario grouping and names clear | Pass | Case IDs with requirement IDs; spec names state the rule |
| Assertions prove requirements | Pass | URL has no `unsupported=`, Settings open, rows enabled, node `isActive false` |
| Fixtures/helpers reuse | Pass | Uses the probe's `runCase`, `waitFor`, `settingsState`, `orgConfig` |
| Isolation/determinism | Pass | MSP-65 creates its own Org run; the timeouts fall through to the asserts |
| Large files coherent | Pass | — |
| No stale/disabled tests | Pass | MSP-41's intermittent failure is base-side (FU-003, 1/6 on base), not changed here |
| Coverage agrees with evidence | Pass | `r2-api-01-mobile-shell.log`, `r2-api-01b-rest.log`, `r2-android/journey.md`, `r2-desktop/desktop-org-stop.log` |
| Callers exercise established scenarios | Pass | The phone's own menu → Settings → stop icon |
| Real trigger and steps | Pass | Real taps in the Android app for the Org's direct agent and an Org Team member |

## Findings

None.

Observation (not a finding): `useRunStopAction`'s `shell` is optional and defaults to the desktop, the same convention as `useWorkspaceHistorySubjectActions(setup = {})` that every desktop caller relies on. A future phone caller that forgets it would repeat F-1. That is a structure one might prefer to change (shell required), not a defect of this change; the product works and is covered by MSP-65.

## Follow-ups

- Follow-ups this review added: None (FU-001…FU-003 were recorded upstream).

## Latest Authoritative Result

- Result: `Pass`
- Changed durable test paths reviewed: `mobile-code-wrap-cases.mjs`, `mobile-shell-probe.mjs` (MSP-08), `mobile-run-settings-cases.mjs` (MSP-65), the IR-002 specs
- Unresolved finding IDs: none
- Recommended Recipient: `delivery_engineer`
- Notes: FU-002 (U03 at 1024×440) and FU-003 (MSP-41) fail intermittently on the base too.
