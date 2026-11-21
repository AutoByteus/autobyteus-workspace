# API/E2E Revision Record — ios-icon-compliance-594 (autobyteus-594)

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Implementation Engineer, `implementation-handoff.md` IR-001 (direct route), round 1 | SR-001, IR-001 | N/A | Pass / 95% (94.7%) |

## Revision Entries

### API-REV-001 — Baseline: the icon and the compliance key in built bundles, on the home screen and on the runner; drift faults; three fresh-start builds

- Triggering role, report path, and round: Implementation Engineer, `implementation-handoff.md` IR-001, round 1; HEAD `d9689619e6` (code `f0e6d1eb33`)
- Triggering finding or case IDs: AC-001…005
- Related revision IDs: SR-001, IR-001
- Why this baseline was recorded: first API/E2E result
- Coverage decisions or durable test paths changed: none in the repository; temporary tools in `evidence/api-e2e/scripts/`
- Cases added, changed, removed, or rechecked: R-IMP (reused), GH-01, FS-iOS, FT-01, HS-01, FS-DOCKER, FS-DESKTOP; NT-01 not tested (App Store Connect; not an AC)
- Commands, environment, fixture, or broader-validation delta: fresh clones; my own simulators; a Release device build without signing; read-only `gh`

#### Prior Failure Resolution

None

- Canonical artifacts and sections updated: investigation, execution report, test progress log, evidence
- Prior result and confidence: N/A
- Current result and confidence: Pass, 95% (94.7%)
- New or remaining failure IDs: none
- Recommended owner: Delivery Engineer
