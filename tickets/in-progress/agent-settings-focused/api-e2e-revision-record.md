# API/E2E Revision Record

The latest coverage investigation and execution coverage report remain authoritative.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Implementation engineer, `implementation-handoff.md` IR-001, round 1 | SR-002, IR-001 | N/A | Fail / 76% |

## Revision Entries

### API-REV-001 — Baseline: hub and Team pass; an Org loses pending edits and a stopped Org copy's Save sticks

- Triggering role, report path, and round: implementation engineer, `implementation-handoff.md` (IR-001), round 1
- Triggering finding or case IDs: API-03 (Fail)
- Related revision IDs: SR-002, IR-001
- Why this baseline was recorded: first API/E2E result
- Coverage decisions or durable test paths changed: added `agent-settings-focused-cases.mjs` (AFS-001…003), its registration and script; fixed FP-P07's locator
- Cases added, changed, removed, or rechecked: API-01 reused; API-02, API-04, API-07 (folder picker) Pass; API-03 Fail; API-05, API-06, R07, R08 Not Tested
- Commands, environment, fixture, or broader-validation delta: baseline

#### Prior Failure Resolution

None.

- Canonical artifacts and sections updated: investigation, report, progress log, `evidence/api-e2e/`
- Prior result and confidence: N/A
- Current result and confidence: Fail, 76%
- New or remaining failure IDs: API-03 finding 1 (Org focus closes Settings, edit lost), finding 2 (a stopped Org copy's Save: refresh-required)
- Recommended owner: failure-origin review by the code reviewer; preliminary `Local Fix` (implementation)
- Remaining risks, blocked evidence, or untested scope: API-05, API-06 (four probes to rework), R07, R08
