# API/E2E Revision Record

The latest coverage investigation and execution coverage report remain authoritative.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Implementation engineer, `implementation-handoff.md` IR-001, round 1 | SR-001, IR-001 | N/A | Fail / 87% |
| API-REV-002 | Implementation engineer, `implementation-handoff.md` IR-002, round 2 | CRR-001 (CR-001 Design Impact), SR-002 (narrowed), IR-002 | Fail / 87% | Pass / 94% |

## Revision Entries

### API-REV-001 — Baseline: live rows with a Task line still move after expand

- Triggering role, report path, and round: implementation engineer, `implementation-handoff.md` (IR-001), round 1
- Triggering finding or case IDs: API-03 (Fail)
- Related revision IDs: SR-001, IR-001
- Why this baseline was recorded: first API/E2E result
- Coverage decisions or durable test paths changed:
  - added `run-expand-motion-live-cases.mjs` (RXM-001…003), its opt-in registration and its script;
  - TESTING.md "Fresh-start build" (own `docs(testing)` commit).
- Cases added, changed, removed, or rechecked: API-01, API-02 reused; API-04, API-05, API-06 Pass; API-03 Fail
- Commands, environment, fixture, or broader-validation delta: baseline

#### Prior Failure Resolution

None.

- Canonical artifacts and sections updated: investigation, report, progress log, `evidence/api-e2e/`, TESTING.md
- Prior result and confidence: N/A
- Current result and confidence: Fail, 87%
- New or remaining failure IDs: API-03 (AC-001)
- Recommended owner: failure-origin review by the code reviewer. Preliminary `Local Fix` (implementation), or `Design Impact` if the fix moves Task-summary ownership
- Remaining risks, blocked evidence, or untested scope: signing and notarization (runner only). OBS-2 withdrawn: the user reports the Workspaces and Projects views are fine

### API-REV-002 — Round 2: rows show complete and in place; nothing slides in the Runs view

- Triggering role, report path, and round: implementation engineer, `implementation-handoff.md` (IR-002), round 2
- Triggering finding or case IDs: API-03 (round 1 Fail)
- Related revision IDs: CRR-001 CR-001, SR-002 (narrowed to the Runs view), IR-002
- Why this revision was recorded: rerun after the fix
- Coverage decisions or durable test paths changed:
  - `run-expand-motion-live-cases.mjs`: I reviewed the implementer's `v-show` edit and kept it;
  - RXM-001 adds the Task line in every frame and a Team expand with no slide (AC-005);
  - RXM-002 adds the layout glide with no transform (AC-005);
  - RXM-003's first fold check expects the tree hidden.
- Cases added, changed, removed, or rechecked: API-01, API-02 reused from IMP-06…IMP-11; API-03…API-06 rerun; API-07 added (AC-006)
- Commands, environment, fixture, or broader-validation delta:
  - fresh-start rerun at `3f78b649ef` (`package.json` changed after round 1's run);
  - server `dist` reused (no server change).

#### Prior Failure Resolution

- API-03 (AC-001): resolved. Folded rows stay mounted with their Task answers, and the Runs view has no move transition. RXM-001: 4 frames × 4 rows at their final tops, with the Task line and `transform: none`. IMP-10 shows the fixture probe fails on SR-001's code.

- Canonical artifacts and sections updated: investigation (round 2 section), report, progress log, `evidence/api-e2e/`
- Prior result and confidence: Fail, 87%
- Current result and confidence: Pass, 94%
- New or remaining failure IDs: none
- Recommended owner: delivery engineer
- Remaining risks, blocked evidence, or untested scope: signing and notarization (runner only); OBS-1 (not this ticket)
