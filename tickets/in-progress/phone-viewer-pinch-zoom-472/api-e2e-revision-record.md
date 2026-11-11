# API/E2E Revision Record — phone-viewer-pinch-zoom-472 (autobyteus-472)

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Code Reviewer, `code-review-report.md` CRR-001 Pass, round 1 | SR-003, ARCH-REV-002, IR-001, CRR-001 | N/A | Fail / 87% |

## Revision Entries

### API-REV-001 — Baseline: the Android app on an emulator, Download end to end, 3× and a 25 MB PDF

- Triggering role, report path, and round: Code Reviewer (`code_reviewer_7e5608ab9b4746e0b613d7ffe65be112`), `code-review-report.md` CRR-001, round 1; code `d2b9f99603`
- Triggering finding or case IDs: CRR-001's "Still required" 1–5
- Related revision IDs: SR-003, ARCH-REV-002, IR-001, CRR-001
- Why this baseline was recorded: first API/E2E result
- Coverage decisions or durable test paths changed: none in the repository; temporary journey tools in `evidence/api-e2e/scripts/`
- Cases added, changed, removed, or rechecked: R-IMP, API-01…API-07, C-08 (Not Tested)
- Commands, environment, fixture, or broader-validation delta: own AVD (Android 15), the branch's debug APK, a test-owned host node, real touches through the touchscreen device

#### Prior Failure Resolution

None

- Canonical artifacts and sections updated: investigation, execution report, test progress log, evidence
- Prior result and confidence: N/A
- Current result and confidence: Fail, 87%
- New or remaining failure IDs: F-1 (AC-001); Unclear U-1 (REQ-006 wording)
- Recommended owner: Code Reviewer (failure-origin review), then Implementation Engineer; U-1 to the Solution Designer
- Remaining risks, blocked evidence, or untested scope: Android 8–9 Save dialog (no image); memory at 3× on a real phone; MSP-24/34/35 (autobyteus-471 FU-003)
