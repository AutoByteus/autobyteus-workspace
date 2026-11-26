# API/E2E Revision Record

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Implementation Engineer, `implementation-handoff.md` IR-001, round 1 | SR-001, IR-001 | N/A | Fail / 85% |
| API-REV-002 | Implementation Engineer, IR-002 (CRR-001 Local Fix), round 2 | CRR-001, IR-002 | Fail / 85% | Fail / 88% |

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

### API-REV-002 — F-1 and F-2 fixed; F-3 at laptop widths

- Triggering role, report path, and round: Implementation Engineer, `implementation-handoff.md` IR-002 (CRR-001 CR-001, CR-002), round 2, commit `0072beea13`.
- Triggering finding or case IDs: F-1 (SMV-121), F-2 (SMV-120).
- Related revision IDs: CRR-001, IR-002.
- Why recorded: the rerun after the fix.
- Coverage decisions or durable test paths changed: none this round; SMV-122 (F-3) comes with its fix.
- Cases rechecked: specs (45 files, 304 tests), the probe (54/54), the three changed components' views at 1440, 1280, 1024, 900, 768 and 390 (API-016, with a very long owner name added to the stack).

#### Prior Failure Resolution

| Prior Case / Failure Reference | Previous Classification | Current Resolution | Case IDs Now Proving It |
| --- | --- | --- | --- |
| F-1: Episodic cards wider than a 390 px window | Local Fix (CRR-001 CR-001) | Resolved by `1cf6e23765` (`grid-cols-1` on the three card grids) | SMV-121, API-016 |
| F-2: the owner page's name cut beside its subtitle | Local Fix (CRR-001 CR-002) | Resolved at 1440 and 1280 by `1cf6e23765` (the places line `flex-1 basis-0`) | SMV-120, API-016 |

- Canonical artifacts and sections updated: execution report, coverage investigation, progress log, `evidence/api-e2e/API-016-round2-fix/`, `API-003-semantic-memory-probe/smv4-*`.
- Prior result and confidence: Fail, 85%.
- Current result and confidence: Fail, 88%.
- New or remaining failure IDs: F-3 (the header's name shrinks to nothing at 1024 px and to 36 px at 768: agent, team and run pages).
- Recommended owner: failure-origin review (`/code_reviewer`); preliminary `Local Fix` → implementation.
