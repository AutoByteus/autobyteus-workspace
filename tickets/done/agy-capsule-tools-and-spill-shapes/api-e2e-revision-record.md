# API/E2E Revision Record

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | implementation_engineer, `implementation-handoff.md`, round 1 | SR-001, SR-002, IR-001 | N/A | Pass / 95% |

## Revision Entries

### API-REV-001 — Baseline: the registry warning through a built server, the real agy with the unchanged allowlist

- Triggering role, report path, and round: implementation engineer, `implementation-handoff.md` (IR-001), direct route, round 1.
- Triggering finding or case IDs: AC-001..003; the implementer's suggestion (a live run through the built server).
- Coverage decisions or durable test paths changed: added `agy-capsule-tool-registry.e2e.test.ts` (CR-01..04) and changed the scripted CLI's `init.tools` default plus the `AGY_FAKE_INIT_TOOLS` knob.
- Cases added or rechecked: API-01..04, X-A; IMP-04..07 reused.
- Finding: the scripted fixture's `tools: []` made the warning fire on every scripted start (the handoff's claim that the scripted CLI emits no `tools` field was wrong); fixed in the fixture, one more fixture left as FU-1.

#### Prior Failure Resolution

None

- Canonical artifacts and sections updated: investigation, report, progress log, revision record, evidence, `follow-ups.md` (FU-1).
- Prior result and confidence: N/A; current: Pass / 95%.
- New or remaining failure IDs: none.
- Recommended owner: none.
- Remaining risks: a registry missing a name is scripted only.
