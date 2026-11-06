# API/E2E Revision Record

The latest coverage investigation and execution coverage report remain authoritative.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Implementation engineer, `implementation-handoff.md` IR-001, round 1 | SR-001, IR-001 | N/A | Fail / 87% |

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
