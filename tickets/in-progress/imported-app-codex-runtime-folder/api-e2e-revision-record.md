# API/E2E Revision Record

The latest coverage investigation and execution coverage report remain authoritative.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Implementation Engineer, `implementation-handoff.md`, round 1 | SR-001, IR-001 | N/A | Fail / 64% |
| API-REV-002 | Implementation Engineer, `implementation-handoff.md` IR-002, round 2 (after CRR-001, SR-002) | SR-002, IR-002, CRR-001 | Fail / 64% | Pass / 95% |

## Revision Entries

### API-REV-001: Baseline. Import fixed; reload/repair quarantines Brief Studio (pre-existing)

- Triggering role, report path, and round: Implementation Engineer, `implementation-handoff.md` (IR-001), round 1
- Triggering finding or case IDs: N/A (initial)
- Related revision IDs: SR-001, IR-001
- Why this baseline was recorded: first completed validation result
- Coverage decisions or durable test paths changed: none in the test tree; drafts in evidence (`API-06-draft-signed-out-recovery.e2e.test.ts`, `API-06-repro-reload-reentry.e2e.test.ts`)
- Cases: API-01…05 reused/confirmed; API-06 Fail (reload/repair end to end); API-07 Not Tested (deferred)
- Commands, environment, fixture, or broader-validation delta: server E2E in a clean env; temporary probes and one temporary diagnostic (all removed)

#### Prior Failure Resolution

None.

- Canonical artifacts and sections updated: coverage investigation (Planned Cases, Durable Coverage To Add, Execution findings), execution report
- Prior result and confidence: N/A
- Current result and confidence: Fail, 64%
- New or remaining failure IDs: API-06 (AC-003)
- Recommended owner: Code Reviewer (failure-origin review), then Solution Designer (scope decision)
- Remaining risks, blocked evidence, or untested scope: AC-005 (API-07) deferred

### API-REV-002: Round 2. AC-003 narrowed, AC-005 on the real desktop app

- Triggering role, report path, and round: Implementation Engineer, `implementation-handoff.md` IR-002 (no code change), after code review CRR-001 (C-01) and SR-002 (DEC-004); round 2
- Triggering finding or case IDs: API-06 (round 1), C-01
- Related revision IDs: SR-002, IR-002, CRR-001
- Why this revision was recorded: requirements narrowed (AC-003) and clarified (AC-005); API-07 run
- Coverage decisions or durable test paths changed: none
- Cases added, changed, removed, or rechecked: AC-003 re-recorded against API-02 (unchanged evidence); API-06 reclassified as FU-003 evidence; API-07 run (Pass)
- Commands, environment, fixture, or broader-validation delta: isolated desktop instance of the worktree build with a throwaway `CODEX_HOME`; real `codex` 0.164.0

#### Prior Failure Resolution

| Prior Case / Failure Reference | Previous Classification | Current Resolution | Case IDs Now Proving It |
| --- | --- | --- | --- |
| API-06 (AC-003 as first written: "the application stays usable" after a reload) | Design Impact, pre-existing origin (confirmed by CRR-001 C-01) | SR-002/DEC-004 narrowed AC-003 to the folder step on reload; the reentry defect is follow-up FU-003; no code change | API-02 (AC-003 as narrowed) |

- Canonical artifacts and sections updated: coverage investigation (Round 2, Planned Cases API-06/API-07), execution report (all sections)
- Prior result and confidence: Fail, 64%
- Current result and confidence: Pass, 95%
- New or remaining failure IDs: none in scope
- Recommended owner: delivery
- Remaining risks, blocked evidence, or untested scope: FU-002, FU-003 (pre-existing, out of scope)
