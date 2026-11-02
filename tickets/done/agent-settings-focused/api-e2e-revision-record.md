# API/E2E Revision Record

The latest coverage investigation and execution coverage report remain authoritative.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Implementation engineer, `implementation-handoff.md` IR-001, round 1 | SR-002, IR-001 | N/A | Fail / 76% |
| API-REV-002 | Implementation engineer, `implementation-handoff.md` IR-002, round 2 | CRR-001, IR-002 | Fail / 76% | Fail / 89% |
| API-REV-003 | Implementation engineer, IR-003 then IR-004 (merge of `personal`), round 3 | CRR-002, IR-003, IR-004 | Fail / 89% | Pass / 94% |

## Revision Entries

### API-REV-001 — Baseline: hub and Team pass; an Org loses pending edits and a stopped Org copy's Save sticks

- Triggering role, report path, and round: implementation engineer, `implementation-handoff.md` (IR-001), round 1
- Triggering finding or case IDs: API-03 (Fail)
- Related revision IDs: SR-002, IR-001
- Why this baseline was recorded: first API/E2E result
- Coverage decisions or durable test paths changed: added `agent-settings-focused-cases.mjs` (AFS-001…003), its registration and script; fixed FP-P07's locator
- Cases added, changed, removed, or rechecked: API-01 reused; API-02, API-04, API-07 (folder picker) Pass; API-03 Fail; API-05, API-06, R07, R08 Not Tested
- Commands, environment, fixture, or broader-validation delta: baseline

#### Prior Failure Resolution

None.

- Canonical artifacts and sections updated: investigation, report, progress log, `evidence/api-e2e/`
- Prior result and confidence: N/A
- Current result and confidence: Fail, 76%
- New or remaining failure IDs: API-03 finding 1 (Org focus closes Settings, edit lost), finding 2 (a stopped Org copy's Save: refresh-required)
- Recommended owner: failure-origin review by the code reviewer; preliminary `Local Fix` (implementation)
- Remaining risks, blocked evidence, or untested scope: API-05, API-06 (four probes to rework), R07, R08

### API-REV-002 — Round 2: the Org findings are resolved; four probes reworked; a Save whose read-back fails shows "Saved."

- Triggering role, report path, and round: implementation engineer, `implementation-handoff.md` (IR-002), round 2
- Triggering finding or case IDs: API-03 (round 1 Fail)
- Related revision IDs: CRR-001 (CR-001, CR-002), IR-002
- Why this revision was recorded: rerun after the Local Fix, and the deferred probe rework
- Coverage decisions or durable test paths changed: the four probes that read the removed list now focus each copy (see the report's Durable Coverage table)
- Cases added, changed, removed, or rechecked: API-02…API-04 rerun (Pass); API-05 run (Fail: SSR-003; 19 Pass); API-06 run (Pass); R07, R08 Not Tested
- Commands, environment, fixture, or broader-validation delta: ENV-3 (two nodes) added

#### Prior Failure Resolution

| Prior Case / Failure Reference | Previous Classification | Current Resolution | Case IDs Now Proving It |
| --- | --- | --- | --- |
| API-03 finding 1: an Org's focus change closed Settings and lost the pending edit | Local Fix (CRR-001 CR-001) | Resolved: `settingsClosedBy: []`, `pendingEditKept: true` | API-03 (AFS-002) |
| API-03 finding 2: a stopped Org copy's Save stuck in refresh-required | Local Fix (CRR-001 CR-002) | Resolved: "Saved.", the card on the saved model | API-03 (AFS-002) |

- Canonical artifacts and sections updated: investigation (round 2 note), report, progress log, `follow-ups.md` (FU-001), `evidence/api-e2e/`
- Prior result and confidence: Fail, 76%
- Current result and confidence: Fail, 89%
- New or remaining failure IDs: API-05 SSR-003 (a committed Save whose read-back fails shows "Saved." with a stale card)
- Recommended owner: failure-origin review by the code reviewer; preliminary `Local Fix` (implementation)
- Remaining risks, blocked evidence, or untested scope: R07, R08 (provider runs); FU-001

### API-REV-003 — Round 3: SSR-003 resolved; the merged head passes everything run

- Triggering role, report path, and round: implementation engineer, `implementation-handoff.md` (IR-003, then IR-004), round 3
- Triggering finding or case IDs: API-05 SSR-003 (round 2 Fail)
- Related revision IDs: CRR-002 (CR-003), IR-003, IR-004 (merge `58fdf50f33` of `origin/personal` @ `84ea944ac5`)
- Why this revision was recorded: rerun after the Local Fix and the merge
- Coverage decisions or durable test paths changed: `runtime-switch-members-probe.mjs` (merged from autobyteus-348) reworked for focused Settings
- Cases added, changed, removed, or rechecked:
  - A first run on `38f5a1eb1c` was stopped for the merge; seven cases had passed.
  - On the merged head `ebf20e056f`: all 20 cases of the launch-defaults stack, RSM-01…07, MRD-01…08, and the folder picker FP-P01, 02, 04…08 pass.
  - R07 and R08 are still not run.
- Commands, environment, fixture, or broader-validation delta: the merged-head build

#### Prior Failure Resolution

| Prior Case / Failure Reference | Previous Classification | Current Resolution | Case IDs Now Proving It |
| --- | --- | --- | --- |
| SSR-003: a committed Save whose read-back failed showed "Saved." with a stale card | Local Fix (CRR-002 CR-003) | Resolved: the fresh read rejects; "saved, but could not be refreshed", locked; Refresh shows the saved model | API-05 SSR-003 |

- Canonical artifacts and sections updated: investigation (round 3 note), report, progress log, `evidence/api-e2e/`
- Prior result and confidence: Fail, 89%
- Current result and confidence: Pass, 94%
- New or remaining failure IDs: none
- Recommended owner: delivery
- Remaining risks, blocked evidence, or untested scope: R07, R08; FU-001
