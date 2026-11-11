# API/E2E Revision Record — phone-viewer-pinch-zoom-472 (autobyteus-472)

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Code Reviewer, `code-review-report.md` CRR-001 Pass, round 1 | SR-003, ARCH-REV-002, IR-001, CRR-001 | N/A | Fail / 87% |
| API-REV-002 | Code Reviewer, `code-review-report.md` CRR-003 Pass (delta, IR-002), round 2 | SR-004, IR-002, CRR-003 | Fail / 87% | Pass / 94% |
| API-REV-003 | Delivery Engineer, `delivery-revision-record.md` DR-001 blocked (merged state with autobyteus-452), round 3 | SR-004, CRR-004, DR-001 | Pass / 94% | Fail / 86% |
| API-REV-004 | Code Reviewer, `code-review-report.md` CRR-006 Pass (delta, IR-003), round 4 | IR-003, CRR-006, API-REV-003 | Fail / 86% | Fail / 87% |

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

### API-REV-003 — Merged state with autobyteus-452: the duplicate case ID; AC-005 live

- Triggering role, report path, and round: Delivery Engineer (`delivery_engineer_1ab9155cd97f42e38ba989a573506c57`), `delivery-revision-record.md` DR-001 (blocked: `mobile-shell probe: duplicate case IDs MSP-39`), round 3; merged state `965a6b43c4`, branch at `1eca27d1c3`
- Triggering finding or case IDs: DR-001's requests 1–4
- Related revision IDs: SR-004, CRR-004, DR-001, API-REV-002
- Why this revision was recorded: the merged state was validated; the result changed (Pass → Fail)
- Coverage decisions or durable test paths changed: `mobile-file-zoom-cases.mjs`, `mobile-shell-probe.mjs`: MSP-39 → MSP-43 (`3eebc0b7a4`)
- Cases added, changed, removed, or rechecked: API-08 (full phone probe on the merged state, new); API-06 rerun live in the app (now possible through 452's refresh)
- Commands, environment, fixture, or broader-validation delta: server and phone bundle rebuilt on the merged state; AVD recreated; files in the run's folder rewritten on the node

#### Prior Failure Resolution

| Prior Failure ID | Resolution | Evidence |
| --- | --- | --- |
| DR-001 duplicate case ID | Resolved: MSP-43; 43/43 phone cases pass on the merged state | `r3-API-08-mobile-shell.log` |

- Canonical artifacts and sections updated: execution report, test progress log, evidence
- Prior result and confidence: Pass, 94% (pre-merge)
- Current result and confidence: Fail, 86% (merged state)
- New or remaining failure IDs: F-2 (AC-005: a zoomed PDF loses its position on 452's live refresh)
- Recommended owner: Code Reviewer (failure-origin review), then Implementation Engineer
- Remaining risks, blocked evidence, or untested scope: Android 8–9 and real-phone memory (accepted by the user)

### API-REV-004 — Recheck of F-2 in the app: a partial-layout restore remains (F-3)

- Triggering role, report path, and round: Code Reviewer, `code-review-report.md` CRR-006 (delta review of IR-003), round 4; code `43ef1748da`
- Triggering finding or case IDs: F-2 (CR-002); CRR-006's recheck list (API-06 PDF and image, including a rewrite that redraws twice; MSP-43)
- Related revision IDs: IR-003, CRR-006, API-REV-003
- Why this revision was recorded: the recheck finished; F-2's path is fixed, a related failure remains
- Coverage decisions or durable test paths changed: none (temporary traced probes in `scripts/`: `restore-trace.mjs`, `fling-after-pinch.mjs`, `refresh-soon-after-scroll.mjs`, `deep-restore-trace.mjs`)
- Cases added, changed, removed, or rechecked: API-06 r4 (about 40 refreshes, traced), API-08 r4 (11 file cases)
- Commands, environment, fixture, or broader-validation delta: AVD recreated; phone bundle rebuilt; frame-by-frame recorders in the page

#### Prior Failure Resolution

| Prior Failure ID | Resolution | Evidence |
| --- | --- | --- |
| F-2 | Resolved for its cause (the in-place reload now puts the position back; a double redraw too) | `r4-android/restore-trace.json`, `r4-android/journey.md` |
| F-3 (new) | Open: the restore can land on a partial layout | `r4-android/late-trials.json` trials 2 and 4 |

- Canonical artifacts and sections updated: execution report, test progress log, evidence
- Prior result and confidence: Fail, 86%
- Current result and confidence: Fail, 87%
- New or remaining failure IDs: F-3
- Recommended owner: Code Reviewer (failure-origin review), then Implementation Engineer
- Remaining risks, blocked evidence, or untested scope: as round 3
