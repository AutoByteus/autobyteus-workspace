# API/E2E Revision Record

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Implementation Engineer, `implementation-handoff.md` IR-001, round 1 | SR-001, IR-001 | N/A | Fail / 85% |

## Revision Entries

### API-REV-001 — Baseline: the Memory layout validated on every view; two AC-001 layout failures

- Triggering role, report path, and round: Implementation Engineer, `tickets/in-progress/memory-layout-652/implementation-handoff.md` (IR-001, direct route), round 1, commit `7bf21db56e`.
- Triggering finding or case IDs: none (baseline).
- Related revision IDs: SR-001, IR-001.
- Why recorded: the first completed validation result.
- Coverage decisions or durable test paths changed: `autobyteus-web/tests/e2e/semantic-memory-view-probe.mjs`: the implementation's updates kept; SMV-110…121 added (SMV-120, SMV-121 reproduce F-2, F-1).
- Cases: API-001, 002R, 003, 010 (and 010b, 010c), 011…015.
- Commands, environment, fixture, or broader-validation delta: my render stack (an org, an imported source, a long document, file kinds) and its view steps.

#### Prior Failure Resolution

None.

- Canonical artifacts and sections updated: coverage investigation, execution report, progress log, `evidence/api-e2e/`.
- Prior result and confidence: N/A.
- Current result and confidence: `Fail`, 85%.
- New or remaining failure IDs: F-1 (Episodic cards wider than a 390 px window with a long workspace path), F-2 (the owner page's name cut beside its subtitle at 1440 and 1280 px).
- Recommended owner: failure-origin review (`/code_reviewer`); preliminary `Local Fix` → implementation.
- Remaining risks: the owner and member card grids share F-1's pattern (read, not run).
