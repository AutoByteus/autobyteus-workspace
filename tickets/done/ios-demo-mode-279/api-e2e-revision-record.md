# API/E2E Revision Record — ios-demo-mode-279 (autobyteus-279)

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Code Reviewer, `code-review-report.md` CRR-001 Pass, round 1 | SR-001, SR-002, ARCH-REV-002, IR-001, CRR-001 | N/A | Fail (F-1) / 88% |
| API-REV-002 | Code Reviewer, `code-review-report.md` CRR-003 (failure-origin review of F-1 → IR-002), round 2 | CRR-002, IR-002, CRR-003 | Fail (F-1) / 88% | Pass / 91% |

## Revision Entries

### API-REV-001 — Baseline: fresh-start builds of three release jobs, the phone probe, the iOS app with a real node, the shipped app's update, the share extension, iPad rotation, a large download

- Triggering role, report path, and round: Code Reviewer, `code-review-report.md` CRR-001 (Pass), round 1; HEAD `429af9bd66`
- Triggering finding or case IDs: CRR-001's "Still required from API/E2E" 1–8
- Related revision IDs: SR-001, SR-002, ARCH-REV-002, IR-001, CRR-001
- Why this baseline was recorded: first API/E2E result
- Coverage decisions or durable test paths changed: `autobyteus-web/tests/e2e/mobile-code-wrap-cases.mjs` (MSP-50…52's host check skips `display: contents` ancestors)
- Cases added, changed, removed, or rechecked: R-IMP, FS-iOS, FS-DOCKER, FS-DESKTOP, API-01…05; NT-01, NT-02 not tested (push; founder's word)
- Commands, environment, fixture, or broader-validation delta: own simulators (English), fresh clones outside symlinked folders, a real node admitting only this Mac, temporary UI tests in clones

#### Prior Failure Resolution

None

- Canonical artifacts and sections updated: investigation, execution report, test progress log, `follow-ups.md` (FU-005), evidence
- Prior result and confidence: N/A
- Current result and confidence: Fail, 88%
- New or remaining failure IDs: F-1
- Recommended owner: Code Reviewer (failure-origin review)

### API-REV-002 — F-1 rerun after IR-002: the shipped app → update, the three connect paths with names on the page and natively, the iPhone smoke

- Triggering role, report path, and round: Code Reviewer, `code-review-report.md` CRR-003, round 2; HEAD `4ad317c20d` (IR-002 code `930477c533`)
- Triggering finding or case IDs: F-1; CRR-003's reruns 1–4
- Related revision IDs: CRR-002, IR-002, CRR-003
- Why this revision was recorded: IR-002 fixed F-1 (a one-time placeholder-name migration and one name rule for saved computers)
- Coverage decisions or durable test paths changed: none in the repository. Temporary: `scripts/ios/ApiE2E279UITests.swift` gains `recordNames` (the page's node button and connection sheet, then "Switch node" → the native rows, More, the Remove sheet and confirmation); `scripts/run-base.sh` (a clean install of the shipped app, pairs, decodes the saved entry); `run-new.sh` takes `API279_OUT`/`API279_COMMIT`
- Cases added, changed, removed, or rechecked: rechecked FS-iOS, FS-DOCKER, API-04a…e (API-04 split into a…e); kept from round 1 (untouched by IR-002): FS-DESKTOP, API-01, API-02, API-03, API-05
- Commands, environment, fixture, or broader-validation delta: new clones at `4ad317c20d`, new simulators, a new node; evidence in `evidence/api-e2e/r2/`

#### Prior Failure Resolution

| Prior Failure ID | Result Now | Evidence |
| --- | --- | --- |
| F-1 | Resolved | `r2/API-04a-shipped-app.log` (saved as "AutoByteus Desktop") → `r2/API-04b-update.log`: page "Test Node 279"; native "AutoByteus node"; "AutoByteus Desktop" nowhere; `r2/API-04b-saved-after-update.txt` (marker, backup) |

- Canonical artifacts and sections updated: execution report (all sections), test progress log, evidence `r2/`, scripts
- Prior result and confidence: Fail (F-1), 88%
- Current result and confidence: Pass, 91%
- New or remaining failure IDs: none
- Recommended owner: Code Reviewer (Large/High Pass: the proportional test-code review of `4352ec81fa`)
