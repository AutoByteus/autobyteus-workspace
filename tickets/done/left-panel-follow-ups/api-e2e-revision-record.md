# API/E2E Revision Record

The latest coverage investigation and execution coverage report remain authoritative.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Implementation engineer, `implementation-handoff.md` IR-001, round 1 | SR-001, IR-001 | N/A | Fail / 87% |
| API-REV-002 | Implementation engineer, `implementation-handoff.md` IR-002, round 2 | CRR-001 (CR-001 Design Impact), SR-002, IR-002 | Fail / 87% | Pass / 94% |

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

### API-REV-002 — Round 2: the Projects view reads every run; removals elsewhere are noticed

- Triggering role, report path, and round: implementation engineer, `implementation-handoff.md` (IR-002), round 2
- Triggering finding or case IDs: API-04 (round 1 Fail)
- Related revision IDs: CRR-001 CR-001, SR-002, IR-002
- Why this revision was recorded: rerun after the fix
- Coverage decisions or durable test paths changed: none in this round (PLN-11 from round 1)
- Cases added, changed, removed, or rechecked:
  - API-01, API-03 and API-04 reused from IMP-08…IMP-11 (my probe, unchanged, on `1112f13de1`);
  - API-02 and API-05 still valid;
  - API-06 added (the read budget).
- Commands, environment, fixture, or broader-validation delta: the read-budget probe on this build

#### Prior Failure Resolution

- API-04 (AC-003): resolved. The older run's removal now re-reads the open Projects (`mUnlistedMs: true`, `readsAfterOlderArchive: 5`). PLN-11 fails on SR-001's host (IMP-12).

- Canonical artifacts and sections updated: investigation (round 2), report, progress log, `evidence/api-e2e/API-06-*`
- Prior result and confidence: Fail, 87%
- Current result and confidence: Pass, 94%
- New or remaining failure IDs: none
- Recommended owner: delivery engineer
- Remaining risks, blocked evidence, or untested scope: signing and notarization (runner only)
