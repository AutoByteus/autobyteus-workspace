# API/E2E Revision Record

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | implementation_engineer, `implementation-handoff.md`, round 1 | SR-001, IR-001 | N/A | Pass / 95% |

## Revision Entries

### API-REV-001 — Baseline: switching back to Antigravity on member kinds, with a restart, a failed start and a real CLI

- Triggering role, report path, and round: implementation engineer, `implementation-handoff.md` (IR-001), direct route, round 1.
- Triggering finding or case IDs: AC-001..AC-007; the implementer's suggestions (live switch back, restart before the third hop).
- Related revision IDs: SR-001, IR-001.
- Why recorded: first validation of the direct package.
- Coverage decisions or durable test paths changed: added `agy-switch-back-built-server.e2e.test.ts` (SB-01..03) and `agy-switch-back-live.e2e.test.ts` (LV-01); the implementer's unit and built-server cases kept. The failed-start retry (AC-005), which the implementer could not stage, is staged on a built server by making the real archive step fail after the Antigravity candidate was prepared.
- Cases added, changed, removed, or rechecked: API-01..API-05, UNIT, X-A, X-B; IMP-06 reused.
- Commands, environment, fixture, or broader-validation delta: built-server and live runs listed in the report; Codex was out of credits, so Claude was the other live runtime.

#### Prior Failure Resolution

None

- Canonical artifacts and sections updated: investigation, report, progress log, revision record, evidence, `follow-ups.md` (FU-1), `TESTING.md` (rule 10).
- Prior result and confidence: N/A; current: Pass / 95%.
- New or remaining failure IDs: none in scope; FU-1 recorded.
- Recommended owner: none.
- Remaining risks: Codex and live Org/copy returns not exercised; FU-1.
