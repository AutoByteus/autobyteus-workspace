# API/E2E Revision Record — ios-demo-mode-279 (autobyteus-279)

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Code Reviewer, `code-review-report.md` CRR-001 Pass, round 1 | SR-001, SR-002, ARCH-REV-002, IR-001, CRR-001 | N/A | Fail (F-1) / 88% |

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
