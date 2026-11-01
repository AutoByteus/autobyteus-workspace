# API/E2E Revision Record

The latest coverage investigation and execution coverage report remain authoritative.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Code reviewer, `code-review-report.md` CRR-002 Pass, round 1 | SR-003, ARCH-REV-003, IR-003, CRR-002 | N/A | Fail / 88% |
| API-REV-002 | Code reviewer, `code-review-report.md` CRR-005 Pass, round 2 | SR-004, SR-005, SR-006, IR-004, IR-005, CRR-003…CRR-005 | Fail / 88% | Fail / 90% |
| API-REV-003 | Code reviewer, `code-review-report.md` CRR-007 Pass, round 3 | SR-007, SR-008, IR-006, CRR-006, CRR-007 | Fail / 90% | Pass / 94% |

## Revision Entries

### API-REV-001 — Baseline: every AC proven; a running hub re-reads its message list on every context publish

- Triggering role, report path, and round: code reviewer, `code-review-report.md` (CRR-002 Pass), round 1
- Triggering finding or case IDs: API-08 (Fail)
- Related revision IDs: SR-003, ARCH-REV-003, IR-001…IR-003, CRR-001, CRR-002
- Why this baseline was recorded: first API/E2E result
- Coverage decisions or durable test paths changed: added `autobyteus-web/tests/e2e/large-runs-load-less-cases.mjs` (LRL-001…004), registered in `delegated-launch-defaults-probe.mjs` with the script `test:e2e:large-runs-load-less`. In `delegated-copies-large-hub-probe.mjs`: L-010's AC-007 display checks, and a baseline fix replacing the removed `isChildHydrated` with `MemberLoader`
- Cases added, changed, removed, or rechecked: API-01 and API-02 reused; API-03…API-07 Pass; API-08 Fail
- Commands, environment, fixture, or broader-validation delta: baseline (report: ENV-1, ENV-2)

#### Prior Failure Resolution

None.

- Canonical artifacts and sections updated: investigation, report, progress log, `follow-ups.md` (FU-004), `evidence/api-e2e/`
- Prior result and confidence: N/A
- Current result and confidence: Fail, 88%
- New or remaining failure IDs: API-08 (a running hub's participant lists reloaded on every context publish)
- Recommended owner: failure-origin review by the code reviewer; preliminary `Design Impact` (Solution Designer)
- Remaining risks, blocked evidence, or untested scope: FU-004; remote participants, the sequence-gap reopen and the reasoning renderer (residuals in the investigation)

### API-REV-002 — Round 2: the running-hub click and running-Team open fetch once; a delegation still refetches every loaded list

- Triggering role, report path, and round: code reviewer, `code-review-report.md` (CRR-005 Pass), round 2
- Triggering finding or case IDs: API-08 (round 1 Fail)
- Related revision IDs: CRR-003 (failure origin: Design Impact), SR-004, SR-005, SR-006, ARCH-REV-004…006, IR-004, IR-005, CRR-004, CRR-005
- Why this revision was recorded: rerun after the rework
- Coverage decisions or durable test paths changed:
  - LRL-005 added (`large-runs-load-less-cases.mjs`; script and probe header updated).
  - The hub probe's L-001/L-002 assert the participant counts and record the hub's stored message count around the delegation.
- Cases added, changed, removed, or rechecked:
  - API-08 rechecked first: Fail, narrowed to the delegation.
  - API-09 new: Pass.
  - API-03…API-07 rerun: Pass.
  - API-01 reuses IR-005's checks; API-02 kept.
- Commands, environment, fixture, or broader-validation delta: server `dist` rebuilt at `99cd853f79`; the round-1 seed reused

#### Prior Failure Resolution

| Prior Case / Failure Reference | Previous Classification | Current Resolution | Case IDs Now Proving It |
| --- | --- | --- | --- |
| API-08: a running hub's selection fetched its list twice | Design Impact (CRR-003) | Fixed by SR-004/SR-005 (IR-004): one fetch | API-08 L-001 (`API-08-r2-hub-participant-requests.log` line 84) |
| API-08: every publication re-read every loaded list (each new delegation) | Design Impact (CRR-003) | Not fixed for a delegation: with no hub message added (62 → 62), both loaded lists are fetched again (4/4 runs) | API-08 L-002 (`API-08-r2-delegation-refetch.log`) |
| (CR-003) a running Team's open fetched twice | Design Impact (SR-006) | Fixed (IR-005): one fetch | API-09 |

- Canonical artifacts and sections updated: investigation (meta, round 2 plan), report (all sections), progress log, `follow-ups.md` (FU-006), `evidence/api-e2e/`
- Prior result and confidence: Fail, 88%
- Current result and confidence: Fail, 90%
- New or remaining failure IDs: API-08 L-002 (a delegation with no hub message refetches every loaded list)
- Recommended owner: failure-origin review by the code reviewer (Local Fix or Design Impact)
- Remaining risks, blocked evidence, or untested scope: FU-004, FU-006; remote participants, the sequence-gap reopen and the reasoning renderer (residuals)

### API-REV-003 — Round 3: a delegation with no hub message keeps the lists; Pass

- Triggering role, report path, and round: code reviewer, `code-review-report.md` (CRR-007 Pass), round 3
- Triggering finding or case IDs: API-08 L-002 (round 2 Fail)
- Related revision IDs: CRR-006 (failure origin: Design Impact), SR-007, SR-008, ARCH-REV-007/008, IR-006, CRR-007
- Why this revision was recorded: rerun after the rework
- Coverage decisions or durable test paths changed: the hub probe gains L-012 (a delegation whose copy reports at once) and records browser errors with time and stack
- Cases added, changed, removed, or rechecked: API-08 rechecked first (Pass, 5 runs); API-03…API-07 and API-09 rerun (Pass); API-01 reuses IR-006's checks
- Commands, environment, fixture, or broader-validation delta: server `dist` rebuilt at `65a5b34c9b`; the seed removed after the round

#### Prior Failure Resolution

| Prior Case / Failure Reference | Previous Classification | Current Resolution | Case IDs Now Proving It |
| --- | --- | --- | --- |
| API-08 L-002: a delegation with no hub message refetched every loaded list | Design Impact (CRR-006) | Resolved by SR-007/SR-008 (IR-006): `participants: {}` with 62 → 62 in all 5 runs | API-08 L-002 (`API-08-r3-hub-participant-requests.log`) |

- Canonical artifacts and sections updated: investigation (round 3 note), report (all sections), progress log, `follow-ups.md` (FU-006 trace), `evidence/api-e2e/`
- Prior result and confidence: Fail, 90%
- Current result and confidence: Pass, 94%
- New or remaining failure IDs: none
- Recommended owner: code reviewer (proportional test-code review)
- Remaining risks, blocked evidence, or untested scope: FU-004, FU-006; remote participants, the sequence-gap reopen and the reasoning renderer (residuals)
