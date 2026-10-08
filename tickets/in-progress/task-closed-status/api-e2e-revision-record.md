# API/E2E Revision Record — `task-closed-status`

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Implementation Engineer direct-route handoff / `implementation-handoff.md` / round 1 | SR-004, IR-001 | N/A | Pass / 95% |

## Revision Entries

### API-REV-001 — Baseline validation of the CLOSED Task status

- Triggering role, report path, and round: Implementation Engineer; `/Users/normy/autobyteus_org/autobyteus-worktrees/task-closed-status/tickets/in-progress/task-closed-status/implementation-handoff.md`; round 1
- Triggering finding or case IDs: N/A (initial validation)
- Related revision IDs: SR-004 (solution), IR-001 (implementation, commit `17e4299a6`)
- Why recorded: first completed API/E2E result
- Coverage decisions or durable test paths changed:
  - Added CLS-API-001 to `autobyteus-server-ts/tests/e2e/projects/project-task-boundaries.e2e.test.ts`
  - Added `closedScenario`, CLS-E2E-001 and CLS-E2E-002 to `autobyteus-server-ts/tests/e2e/projects/task-reactivation-root-visibility.e2e.test.ts`
  - Added PMU-017 to `autobyteus-web/tests/e2e/project-manager-ux-probe.mjs`
  - Updated `TESTING.md` (new cases; corrected the stale migration-import note)
- Cases added, changed, removed, or rechecked: added CLS-API-001, CLS-E2E-001, CLS-E2E-002, PMU-017; temporary CLS-MUT-001; rechecked all server Projects layers, web Projects specs, full web suite, and PMU-001/002/003/005/009/015
- Commands, environment, fixture, or broader-validation delta: baseline (see execution coverage report); broader validation `Required` → Browser probe executed

#### Prior Failure Resolution

None.

- Canonical artifacts and sections updated: coverage investigation (all), execution coverage report (all), test-case ledger (all)
- Prior result and confidence: N/A
- Current result and confidence: `Pass`, 95%
- New or remaining failure IDs: None. PMU-017 runs 1–2 failed on a probe-selector defect in the new test code, which was fixed in the same round.
- Recommended owner: Delivery Engineer
- Remaining risks, blocked evidence, or untested scope: packaged desktop app and real-model behavior (delivery user verification); external Project Task Manager skill unaware of CLOSED (R-002, approved out of scope); cosmetic stale comment in `ProjectCard.vue` L34
