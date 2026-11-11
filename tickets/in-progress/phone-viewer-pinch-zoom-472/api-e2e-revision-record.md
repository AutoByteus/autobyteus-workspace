# API/E2E Revision Record — phone-viewer-pinch-zoom-472 (autobyteus-472)

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Code Reviewer, `code-review-report.md` CRR-001 Pass, round 1 | SR-003, ARCH-REV-002, IR-001, CRR-001 | N/A | Fail / 87% |
| API-REV-002 | Code Reviewer, `code-review-report.md` CRR-003 Pass (delta, IR-002), round 2 | SR-004, IR-002, CRR-003 | Fail / 87% | Pass / 94% |

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

### API-REV-002 — Recheck of F-1 in the app; U-1 closed by SR-004

- Triggering role, report path, and round: Code Reviewer, `code-review-report.md` CRR-003 (delta review of IR-002), round 2; code `1b5b7f5b0e`
- Triggering finding or case IDs: F-1 (CR-001); CRR-003's recheck list (`pan2-hold`, a moving pinch held at the 3× cap, the PDF gestures)
- Related revision IDs: SR-004, IR-002, CRR-003, API-REV-001
- Why this revision was recorded: the round's result changed (Fail → Pass)
- Coverage decisions or durable test paths changed: none by API/E2E; a `pinch-move-hold` step added to the temporary tools
- Cases added, changed, removed, or rechecked: API-01 rerun; API-07's phone file cases rerun; API-02…05 and the rest of API-07 still valid (no code they exercise changed)
- Commands, environment, fixture, or broader-validation delta: AVD recreated (same image), the phone bundle rebuilt; APK unchanged (no Android change)

#### Prior Failure Resolution

| Prior Failure ID | Resolution | Evidence |
| --- | --- | --- |
| F-1 | Resolved: a two-finger drag at 2× and a moving pinch at the 3× cap keep the pages where the fingers left them | `r2-android/journey.md` (`pan2-hold`, `pinch-move-hold`), `r2-android/shots/API-01-r2-*` |
| U-1 | Closed by the Solution Designer (SR-004) | `requirements-doc.md` SR-004 |

- Canonical artifacts and sections updated: execution report, test progress log, evidence
- Prior result and confidence: Fail, 87%
- Current result and confidence: Pass, 94%
- New or remaining failure IDs: none in scope
- Recommended owner: Code Reviewer (proportional test-code review)
- Remaining risks, blocked evidence, or untested scope: Android 8–9 Save dialog (no image); real-phone memory at 3× (user-only); MSP-24/34/35 (autobyteus-471 FU-003)
