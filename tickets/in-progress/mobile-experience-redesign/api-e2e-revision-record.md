# API/E2E Revision Record — mobile-experience-redesign (autobyteus-277)

The coverage investigation and the execution coverage report are the current truth; this file is the history.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | code_reviewer, code-review-report.md CRR-002 Pass, round 1 | SR-003, SR-004, ARCH-REV-002, IR-002, CRR-002 | N/A | Fail / 81% |
| API-REV-002 | code_reviewer, code-review-report.md CRR-005 Pass, round 2 | SR-005, SR-006, ARCH-REV-004, IR-003, IR-004, CRR-003…CRR-005 | Fail / 81% | Fail / 90% |
| API-REV-003 | code_reviewer, code-review-report.md CRR-007 Pass, round 3 | IR-005, CRR-006, CRR-007 | Fail / 90% | Pass / 95% |

## Revision Entries

### API-REV-001 — Baseline: the rebuilt phone shell on real nodes, the Android shell, WebKit and the desktop regression

- Triggering role, report path, and round: code_reviewer, [code-review-report.md](code-review-report.md) CRR-002 (Pass), round 1.
- Triggering finding or case IDs: the handoff's "Not run" list (browser probe, two-server remote case, Android, iOS, R-001/R-002, 401, fresh-run-auto-approval, desktop regression).
- Related revision IDs: SR-003 (requirements), SR-004 (design), ARCH-REV-002, IR-002, CRR-002.
- Why recorded: the first completed API/E2E result.
- Coverage decisions or durable test paths changed: added `autobyteus-web/tests/e2e/mobile-shell-probe.mjs` (`test:e2e:mobile-shell`); updated the phone paths of `node-vocabulary-probe.mjs` (NVP-04), `large-runs-load-less-cases.mjs` (LRL-004), `workspace-views-chooser-cases.mjs` (WVC-004) and `owner-scoped-file-reads-probe.mjs` (B-006, B-007), which still drove the removed Home, tabs and work picker.
- Cases: API-01…05, MSP-01…14, UPD-NVP, UPD-LRL-004, UPD-WVC-004, UPD-OSR, DSK-01…03, ADR-01…05, IOS-01, IOS-02.
- Commands, environment, broader validation: real two-node stack from this worktree's server build with the production phone bundle; Android 15 emulator with this worktree's debug APK; WebKit 26.0; iOS 26.1 Safari.

#### Prior Failure Resolution

None.

- Canonical artifacts updated: coverage investigation, execution coverage report, test progress log, `follow-ups.md` (FU-002…FU-006).
- Prior result and confidence: N/A.
- Current result and confidence: Fail, 81% (requirement proof 50%, user surface 60%).
- New or remaining failure IDs: F-01…F-09 (execution report, Findings).
- Recommended owner: code_reviewer for failure-origin review; preliminary: implementation for F-01…F-06, Solution Designer for F-07, F-08 (Design Impact) and F-09 (prerequisite candidate).
- Remaining risks, blocked evidence, or untested scope: QR-003 and AC-005's confirmation on the user's phone; his Android device; a paired iOS Safari session (IOS-02 in WebKit covers the paired screens).

### API-REV-002 — Round 2: the SR-005 basis on real nodes, Android 15 and 14, WebKit and the desktop regression

- Triggering role, report path, and round: code_reviewer, [code-review-report.md](code-review-report.md) CRR-005 (Pass), round 2. Code `400457d5f7`.
- Triggering finding or case IDs: F-01…F-09 (round 1); AC-002a, AC-003a, AC-011; review residuals C-12 (keyboard on API 34) and the running-root live case.
- Related revision IDs: SR-005, SR-006, ARCH-REV-004, IR-003, IR-004, CRR-003, CRR-004, CRR-005.
- Why recorded: the second completed result.
- Coverage decisions or durable test paths changed:
  - `mobile-shell-probe.mjs` expectations follow DEC-009 (beside the member), DEC-010 (Task lines equal the desktop's; members one line) and DEC-013 (last-read state, updated when the root opens);
  - a second Org whose first member is a Team (AC-003a); the Org run row in MSP-07;
  - the reviewer lookup fixed.
  - `TESTING.md`: the design's phone rule is not added (the user: project documents hold only what every future change follows). At his request, one-suite details and a dated note were removed (`c5319f0bf4`, `dce25fdd50`).
- Cases added, changed, removed, or rechecked:
  - added ADR-06 (send over HTTP on Android) and ADR-07 (keyboard, API 35 and API 34);
  - rerun MSP-01…14, ADR-01…05, IOS-02, DSK-01…03, UPD-LRL-004;
  - still valid: UPD-WVC-004, UPD-OSR, UPD-NVP, IOS-01, API-05 (B08).
- Commands, environment, broader-validation delta: the phone bundle rebuilt; this branch's APK (up to date); the API 34 emulator added.

#### Prior Failure Resolution

| Prior Case / Failure Reference | Previous Classification | Current Resolution | Case IDs Now Proving It |
| --- | --- | --- | --- |
| F-01 Org run row did not open | Local Fix | Fixed: opens the first member, or that Team's coordinator | MSP-03, MSP-07 |
| F-02 sends failed on a non-secure origin | Local Fix | Fixed: one id helper | MSP-03, MSP-06, ADR-06 |
| F-03 unpair confirmation under the sheet | Local Fix | Fixed | MSP-09, ADR-03 |
| F-04 reference screen header and 28 px controls | Local Fix | Fixed | MSP-11 |
| F-05 path part 41 px | Local Fix | Fixed | MSP-11 |
| F-06 no second line on delegated rows | Local Fix | Fixed (DEC-010) | MSP-02 |
| F-07 member's task agent beside the member | Design Impact | Decided: as on the desktop (DEC-009) | MSP-02 |
| F-08 states under a run not open | Design Impact | Decided: as on the desktop (DEC-013) | MSP-02 |
| F-09 Android 15 status bar | Requirement Gap | Fixed in the shell (REQ-011) | ADR-05, ADR-01 |

- Canonical artifacts updated: coverage investigation (Round 2 Plan), execution coverage report, progress log.
- Prior result and confidence: Fail, 81%.
- Current result and confidence: Fail, 90% (requirement proof 85%, user surface 80%).
- New or remaining failure IDs: F-10 (keyboard: the conversation container stays scrolled; no double padding).
- Recommended owner: code_reviewer for failure-origin review; preliminary: implementation, Local Fix.
- Remaining risks, blocked evidence, or untested scope: the user's phone (QR-003, AC-005's confirmation, AC-011 on his device).

### API-REV-003 — Round 3: F-10's fix on Android 15 and 14; the run screen rerun

- Triggering role, report path, and round: code_reviewer, CRR-007 (Pass), round 3. Code `e3dd8c4677`.
- Triggering finding or case IDs: F-10; review residual C-16.
- Related revision IDs: IR-005, CRR-006, CRR-007.
- Why recorded: the third completed result.
- Coverage decisions or durable test paths changed: none in the repository. The ticket's Android script gains ADR-08 (C-16), ADR-07 now also asserts an unscrolled conversation, and the ADR-08 key collision is fixed.
- Cases rechecked: MSP-03, MSP-05, MSP-11; ADR-01, 05, 06, 07, 08 on API 35; ADR-01, 07, 08 on API 34. Everything else is still valid.
- Commands, environment, broader-validation delta: the phone bundle rebuilt; the same APK (no Android change).

#### Prior Failure Resolution

| Prior Case / Failure Reference | Previous Classification | Current Resolution | Case IDs Now Proving It |
| --- | --- | --- | --- |
| F-10 conversation scrolled with the keyboard open | Local Fix | Fixed (`overflow: clip` on the conversation host): `scrollTop` 0, composer 62 px above the keyboard on API 35 and API 34 | R3-ADR-35, R3-ADR-34 |

- Canonical artifacts updated: coverage investigation (Round 3 Plan), execution coverage report, progress log.
- Prior result and confidence: Fail, 90%.
- Current result and confidence: Pass, 95%.
- New or remaining failure IDs: none.
- Recommended owner: code_reviewer, proportional test-code review.
- Remaining risks, blocked evidence, or untested scope: the user's phone (QR-003, AC-005's confirmation, AC-010/AC-011 on his device); iOS Safari's paired screens (WebKit covers them).
