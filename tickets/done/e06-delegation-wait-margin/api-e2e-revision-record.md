# API/E2E Revision Record — e06-delegation-wait-margin

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Implementation Engineer, `implementation-handoff.md` IR-001 (direct route), round 1 | SR-001, SR-002, IR-001 | N/A | Pass / 95% |

## Revision Entries

### API-REV-001 — Baseline: the e2e file 3×, the release smoke's Antigravity step, the node's discovery bounds with slow and hung CLIs

- Triggering role, report path, and round: Implementation Engineer, `implementation-handoff.md` IR-001, round 1; code `88525bc56a`, `b1b95ea158`
- Triggering finding or case IDs: the handoff's "Left to you": AC-005 independently, and the release smoke's Antigravity step
- Related revision IDs: SR-001, SR-002, IR-001
- Why this baseline was recorded: first API/E2E result
- Coverage decisions or durable test paths changed: none in the repository; temporary tools in `evidence/api-e2e/scripts/`
- Cases added, changed, removed, or rechecked: R-IMP, API-01…04
- Commands, environment, fixture, or broader-validation delta: the smoke env; `release_smoke.py`'s own step functions; `dist` rebuilt for the node checks

#### Prior Failure Resolution

None

- Canonical artifacts and sections updated: investigation, execution report, test progress log, evidence
- Prior result and confidence: N/A
- Current result and confidence: Pass, 95%
- New or remaining failure IDs: none
- Recommended owner: Delivery Engineer
