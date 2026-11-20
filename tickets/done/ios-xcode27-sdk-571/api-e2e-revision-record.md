# API/E2E Revision Record — ios-xcode27-sdk-571 (autobyteus-571)

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Implementation Engineer, `implementation-handoff.md` IR-001 (direct route), round 1 | SR-001, IR-001 | N/A | Pass / 94% |

## Revision Entries

### API-REV-001 — Baseline: the Xcode gate from a fresh clone, its decision table, the real `xcode-27` run read independently, no release

- Triggering role, report path, and round: Implementation Engineer, `implementation-handoff.md` IR-001, round 1; HEAD `b03bb0e609` (code `e3950f9d07`)
- Triggering finding or case IDs: AC-001…005
- Related revision IDs: SR-001, IR-001
- Why this baseline was recorded: first API/E2E result
- Coverage decisions or durable test paths changed: none in the repository; the temporary probe `evidence/api-e2e/scripts/pr-01-standins.sh`
- Cases added, changed, removed, or rechecked: R-IMP01 (reused), FS-LOCAL, PR-01, GH-01, GH-02; NT-01 not tested (the archive job: the founder's word)
- Commands, environment, fixture, or broader-validation delta: a fresh clone outside symlinked folders; stand-in Apple tools; read-only `gh` calls on run 44730865039 and P-01's run 44725773809

#### Prior Failure Resolution

None

- Canonical artifacts and sections updated: investigation, execution report, test progress log, evidence
- Prior result and confidence: N/A
- Current result and confidence: Pass, 94%
- New or remaining failure IDs: none
- Recommended owner: Delivery Engineer
