# API/E2E Revision Record

The latest coverage investigation and execution coverage report remain authoritative.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Implementation engineer, `implementation-handoff.md` IR-001, round 1 | SR-001, IR-001 | N/A | Fail / 87% |

## Revision Entries

### API-REV-001 — Baseline: runs started elsewhere list live; a removed run older than its folder's 6 newest is missed

- Triggering role, report path, and round: implementation engineer, `implementation-handoff.md` (IR-001), round 1
- Triggering finding or case IDs: API-04 (PLN-11)
- Related revision IDs: SR-001, IR-001
- Why this baseline was recorded: first API/E2E result
- Coverage decisions or durable test paths changed: PLN-11 added to `projects-left-navigation-probe.mjs`
- Cases added, changed, removed, or rechecked: API-01 reused; API-02, API-03, API-05 Pass; API-04 Fail
- Commands, environment, fixture, or broader-validation delta: baseline

#### Prior Failure Resolution

None.

- Canonical artifacts and sections updated: investigation, report, progress log, `evidence/api-e2e/`
- Prior result and confidence: N/A
- Current result and confidence: Fail, 87%
- New or remaining failure IDs: API-04 (AC-003)
- Recommended owner: failure-origin review by the code reviewer; preliminary `Design Impact`
- Remaining risks, blocked evidence, or untested scope: signing and notarization (runner only)
