# API/E2E Revision Record — autobyteus-446

The latest coverage investigation and execution coverage report remain authoritative.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Implementation engineer, `implementation-handoff.md` IR-001, round 1 (direct route) | SR-002, IR-001 | N/A | Pass / 95.6% |

## Revision Entries

### API-REV-001 — Baseline: a closed Task's rows leave every list; durable cases MSP-24…27

- Triggering role, report path, and round: implementation engineer, `implementation-handoff.md` (IR-001), round 1.
- Triggering finding or case IDs: N/A (first validation); the handoff's asks: the design's step-4 probe case (AC-001, AC-003, AC-004, AC-005, AC-006, AC-002 on the desktop) and the Team-host check.
- Related revision IDs: SR-002, IR-001.
- Why this baseline was recorded: first completed API/E2E result.
- Coverage decisions or durable test paths changed:
  - Added `autobyteus-web/tests/e2e/mobile-closed-task-rows-cases.mjs` (MSP-24…26 on their own node delta and phones; MSP-27 a desktop window on alpha, last).
  - Updated `autobyteus-web/tests/e2e/mobile-shell-probe.mjs` (calls the module; header; runtime note).
- Cases added, changed, removed, or rechecked: API-01…07 reused from the handoff; MSP-24…27 new; API-08 the full probe; API-09 a diagnosis of the probe's verdict.
- Commands, environment, fixture, or broader-validation delta: broader validation on the phone bundle and the desktop renderer (`nuxt dev`).

#### Prior Failure Resolution

None.

- Canonical artifacts and sections updated: `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, `api-e2e-test-progress.md`, `follow-ups.md` (FU-003 added).
- Prior result and confidence: N/A.
- Current result and confidence: `Pass`, 95.6% (no category below 95%); every AC proven, none user-only.
- New or remaining failure IDs: none in this change. FU-003 (pre-existing) makes the full probe's verdict `Fail`; every case passes.
- Recommended owner: delivery engineer.
- Remaining risks, blocked evidence, or untested scope: FU-003; FU-001 (inactive hosts, out of scope); AC-003's scenario wording versus the node's reopen of a copy on reactivation (for the Solution Designer).
