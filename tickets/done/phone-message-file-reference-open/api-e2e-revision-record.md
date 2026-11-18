# API/E2E Revision Record

The latest coverage investigation and execution coverage report remain authoritative.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Implementation Engineer, `implementation-handoff.md`, round 1 | `SR-001`, `IR-001` | N/A | `Pass` / 96% |

## Revision Entries

### API-REV-001 — Phone conversation file link validated on the phone bundle; desktop probe repaired

- Triggering role, report path, and round: Implementation Engineer, `tickets/in-progress/phone-message-file-reference-open/implementation-handoff.md`, round 1
- Triggering finding or case IDs: N/A (initial)
- Related revision IDs: `SR-001`, `IR-001`; architecture review and code review N/A (direct Small/Low route)
- Why this baseline was recorded: first completed API/E2E result
- Coverage decisions or durable test paths changed: added `mobile-shell-probe.mjs` MSP-16 (`59b3ff975c`); `TESTING.md` rules for late `inject` callers and phone-bundle cases (`d124785e06`); baseline fix of the `event-monitor-file-preview-probe.mjs` saved-Org fixture (`419003d961`)
- Cases added, changed, removed, or rechecked: API-01..API-03 reused (IMP-02..IMP-05); API-04 full `test:nuxt`; API-05 MSP-16 on the base bundle (expected Fail); API-06 MSP-08 + MSP-16 on the HEAD bundle; API-07 desktop probe (run 3 Pass after two fixture fixes)
- Commands, environment, fixture, or broader-validation delta: broader validation Required and run (phone bundle in headless Chrome against probe-owned nodes; packaged desktop isolated instance)

#### Prior Failure Resolution

None.

- Canonical artifacts and sections updated: `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, `api-e2e-test-progress.md`, `evidence/API-*`
- Prior result and confidence: N/A
- Current result and confidence: `Pass`, 96% (no category below 95%)
- New or remaining failure IDs: none
- Recommended owner: Delivery Engineer
- Remaining risks, blocked evidence, or untested scope: Android WebView not driven (same bundle); phone remote-run status line proven at unit level only (unchanged code); FU-001 unchanged
