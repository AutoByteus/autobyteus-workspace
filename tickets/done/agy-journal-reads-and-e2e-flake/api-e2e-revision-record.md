# API/E2E Revision Record

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | implementation_engineer, `implementation-handoff.md`, round 1 | SR-001, IR-001 | N/A | Pass / 93% |

## Revision Entries

### API-REV-001 — Baseline: read_file and spilled outputs through the real server, the hook limit on a loaded host, the stall rerun

- Triggering role, report path, and round: implementation engineer, `implementation-handoff.md` (IR-001), direct route, round 1.
- Triggering finding or case IDs: AC-001..AC-010; the implementer's suggestions (TESTING.md edit, a spill case, spot checks of other in-process-server files, memory search after the bump).
- Related revision IDs: SR-001, IR-001.
- Coverage decisions or durable test paths changed: added `work-journal-agy-read-file-spill-scripted-agy.e2e.test.ts` and a `journal_reads` case in the scripted CLI; edited TESTING.md as the design assigned; unit tests kept.
- Cases added, changed, removed, or rechecked: API-01..API-06, UNIT; IMP-02..05 reused; AC-010 not applicable.
- Commands, environment, fixture, or broader-validation delta: real server with a scripted CLI under real host load; the stall reproduction rerun independently.

#### Prior Failure Resolution

None

- Canonical artifacts and sections updated: investigation, report, progress log, revision record, evidence, `follow-ups.md` (FU-3), `TESTING.md`.
- Prior result and confidence: N/A; current: Pass / 93%.
- New or remaining failure IDs: none; FU-3 open (the discovery timeout's cause).
- Recommended owner: none.
- Remaining risks: discovery timeout cause not established; no live Antigravity run; memory-search catch-up unit-covered only.
