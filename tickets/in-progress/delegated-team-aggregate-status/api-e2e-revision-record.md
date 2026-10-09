# API/E2E Revision Record

The latest coverage investigation and execution coverage report remain authoritative.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Implementation Engineer, `implementation-handoff.md`, round 1 | SR-003 (req SR-002), IR-001, ARCH-REV N/A, CRR N/A | N/A | Pass / 95% |

## Revision Entries

### API-REV-001 — Baseline validation of the universal Team status

- Triggering role, report path, and round: `/software_engineering_team/implementation_engineer`, `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-team-aggregate-status/tickets/in-progress/delegated-team-aggregate-status/implementation-handoff.md`, round 1
- Triggering finding or case IDs: N/A (initial)
- Related revision IDs: SR-003 (design), SR-002 (requirements, AP-001), IR-001 (implementation). Architecture and code review: N/A (direct route).
- Why recorded: first completed API/E2E result on the direct Medium/Low route.
- Coverage decisions or durable test paths changed:
  - Added `autobyteus-web/tests/e2e/team-status-live-probe.mjs` (`test:e2e:team-status-live`, TS-001..TS-004).
  - Added a `HOLD_TURN` marker to `autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs` (`linked_skills`).
  - Added a routing case to `agy-failure-cli-routing.test.ts`.
  - Added a `TESTING.md` section.
  - All existing specs and probes judged Still Valid. `team-activity-presentation-probe.mjs` (running surface) is Out Of Scope (follow-up).
- Cases added, changed, removed, or rechecked: RC-001..RC-005 run; TS-001..TS-004 added and run (attempt 1: TS-004 failed on a probe selector, fixed; attempt 2 and two repeats pass).
- Commands, environment, fixture, or broader-validation delta:
  - Server `prebuild` + `build`.
  - Built backend + Nuxt dev + Chrome 154, with the scripted AGY CLI.
  - Documented `test:nuxt --run`: 590 files / 4035 tests pass.

#### Prior Failure Resolution

None.

- Canonical artifacts and sections updated: coverage investigation (all), execution coverage report (all), test-case ledger (all)
- Prior result and confidence: N/A
- Current result and confidence: Pass, 95% (no category below 90%)
- New or remaining failure IDs: none
- Recommended owner: Delivery (next stage)
- Remaining risks, blocked evidence, or untested scope: AC-011 explicit user verification (Delivery/user); accepted freshness assumption ASM-001; packaged-renderer rendering is covered only by AC-011.
