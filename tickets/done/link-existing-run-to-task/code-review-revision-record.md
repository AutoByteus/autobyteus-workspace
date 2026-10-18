# Code Review Revision Record

The latest `code-review-report.md` (or `api-e2e-test-review-report.md`) remains authoritative for its current result.

## Revision Index

| Revision ID | Canonical Review Report | Entry Point / Trigger | Prior Result | Current Result | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| CRR-001 | `code-review-report.md` | Implementation Review, round 1 (IR-001) | N/A | Fail (Local Fix, 9.0/10) | CR-001, CR-002, CR-003 |
| CRR-002 | `code-review-report.md` | Implementation Review, round 2, Targeted Delta Review (IR-002) | Fail (Local Fix, 9.0/10) | Pass (9.3/10) | CR-001..CR-003 resolved |
| CRR-003 | `code-review-report.md` | API/E2E failure-origin review (API-REV-001) | Pass (9.3/10) | Fail: implementation `Local Fix` (F-001, F-003); F-002 held | F-001, F-002, F-003 |
| CRR-004 | `code-review-report.md` | Implementation Review, round 4, Targeted Delta Review (IR-003) | Fail (failure-origin) | Pass (9.3/10) | F-001, F-003 resolved; F-002 held for API/E2E |
| CRR-005 | `code-review-report.md` | API/E2E failure-origin review (API-REV-002) | Pass (9.3/10) | Fail: `Design Impact` (F-002) | F-002 |
| CRR-006 | `code-review-report.md` | Implementation Review, round 6, Targeted Delta Review (SR-009 / IR-004) | Fail (Design Impact) | Pass (9.3/10) | F-002 resolved in source |
| CRR-007 | `api-e2e-test-review-report.md` | API/E2E test-code review, round 1 (API-REV-003) | N/A (first test review) | Fail (Local Fix) | TR-001, TR-002 |
| CRR-008 | `api-e2e-test-review-report.md` | API/E2E test-code review, round 2, delta (API-REV-004) | Fail (Local Fix) | Pass | TR-001, TR-002 resolved |

## Revision Entries

### CRR-001 — Initial implementation review: adoption of runs the user started

- Canonical review report updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/link-existing-run-to-task/tickets/in-progress/link-existing-run-to-task/code-review-report.md`
- Review entry point and round: Implementation Review, round 1
- Review scope: `Full Review` (`2f211340ee..ef807beb6d`): all 27 changed source files read in full, plus the tests and docs
- Triggering role, report path, and finding or scenario IDs: implementation_engineer, `implementation-handoff.md` (IR-001); SCN-001..SCN-003
- Relevant solution revision IDs: `SR-003`..`SR-008`
- Relevant architecture-review revision IDs: `ARCH-REV-004`
- Relevant implementation revision IDs: `IR-001`
- Relevant API/E2E revision IDs: `N/A`
- Relevant delivery revision IDs: `N/A`
- Prior authoritative result: N/A
- Current authoritative result: Fail, `Local Fix` (9.0/10; Runtime Correctness 8.6, API/E2E Readiness 8.8, Cleanup 8.8)
- What changed in the review result and why:
  - Initial baseline. The adoption owner, its file-recognized steps, its resumption, the reversible own-file change and the undo on close, delete and Project delete match SR-008. The implementer's three choices (undo recognition, resume after the link, closing on delete) are sound.
  - Reviewer checks: tsc clean; 50/50 tests in the new and updated files; e2e `collaboration-prompt-wording` CPW-R3 fails on M-34.
  - Findings:
    - CR-001: three unused declarations in touched files.
    - CR-002: in every Agent root, the preserved "not one of your task agents" refusal is replaced for unknown IDs and other roots' copies, and a task agent team's member gets misleading team guidance.
    - CR-003: `projects.md` puts step 1 on the queue.
- Supported product scenario / material-premise basis changes: None. C-4..C-7 rejected with reasons.

#### Prior Finding Resolution

None.

- New or remaining finding IDs: CR-001, CR-002, CR-003
- Material score or classification changes: N/A (initial). Large / High confirmed.
- Recommended recipient: `/software_engineering_team/implementation_engineer`
- Remaining risks or uncertainty:
  - the e2e suites beyond CPW were not run by the reviewer;
  - the AC-001..AC-003 real-app check and AC-007 are at API/E2E.

### CRR-002 — CR-001..CR-003 delta re-review

- Canonical review report updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/link-existing-run-to-task/tickets/in-progress/link-existing-run-to-task/code-review-report.md`
- Review entry point and round: Implementation Review, round 2
- Review scope: `Targeted Delta Review` (`4b0986363c`: 5 source files, docs, 2 tests, the e2e log)
- Triggering role, report path, and finding or scenario IDs: implementation_engineer, `implementation-revision-record.md` IR-002; CR-001..CR-003
- Relevant solution revision IDs: `SR-008`
- Relevant architecture-review revision IDs: `ARCH-REV-004`
- Relevant implementation revision IDs: `IR-002`
- Relevant API/E2E revision IDs: `N/A`
- Relevant delivery revision IDs: `N/A`
- Prior authoritative result: Fail, `Local Fix` (CRR-001)
- Current authoritative result: Pass, 9.3/10, every category ≥ 9.0
- What changed in the review result and why:
  - IDs that aren't runs the user started keep today's `notACopyOfThisRun`, and the adoption guidance applies only to runs the user started (the team hint only for admitted team runs).
  - The unused declarations are removed and the doc is corrected.
  - Reviewer checks: tsc clean; 0 unused locals in touched files; 59/59 tests.
  - The implementer's e2e log shows the three refusal suites green, including CPW-R3 / M-34.
- Supported product scenario / material-premise basis changes: None

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| CR-001 | Local Fix | Resolved | IR-002 | `--noUnusedLocals` 0 hits in touched files |
| CR-002 | Local Fix | Resolved | IR-002 | diff; root-level refusal tests; e2e log (CPW-R3, task-existing-copy-assignment, task-reactivation) |
| CR-003 | Local Fix | Resolved | IR-002 | `projects.md` Path line |

- New or remaining finding IDs: None
- Material score or classification changes: 9.0 → 9.3. Large / High unchanged.
- Recommended recipient: `/software_engineering_team/api_e2e_engineer` (informational: `/software_engineering_team/implementation_engineer`)
- Remaining risks or uncertainty: R-1..R-3 (accepted); AC-001..AC-003 real-app check and AC-007

### CRR-003 — API/E2E failure-origin review (API-REV-001)

- Canonical review report updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/link-existing-run-to-task/tickets/in-progress/link-existing-run-to-task/code-review-report.md`
- Review entry point and round: API/E2E Failure-Origin Review, round 3
- Review scope: `N/A` (failure-origin): F-001..F-003 against the code paths and evidence
- Triggering role, report path, and finding or scenario IDs: api_e2e_engineer, `api-e2e-revision-record.md` API-REV-001 (Fail); AC-001, AC-003, BEH-002, REQ-002
- Relevant solution revision IDs: `SR-008`
- Relevant architecture-review revision IDs: `ARCH-REV-004`
- Relevant implementation revision IDs: `IR-002`
- Relevant API/E2E revision IDs: `API-REV-001`
- Relevant delivery revision IDs: `N/A`
- Prior authoritative result: Pass, 9.3/10 (CRR-002)
- Current authoritative result: Fail. F-001 and F-003 are implementation `Local Fix`; F-002 is held for a recheck after the F-001 fix.
- What changed in the review result and why:
  - F-001 is confirmed in code: the token run summary takes its claimed root from the run's latest stored record, which for a team that worked before adoption is its own Team root. The Agent-root presentation adapter rejects it, and the rejection fail-stops the PM's root.
  - This was a gap in my source review: I accepted DS-002's "nothing new" without checking per-run state that records the former root.
  - F-003: the reused existing-copy message claims a previous Task.
  - F-002 can't be separated from F-001 yet.
  - FU-2 (AGY terminate during a held turn, reproduces on base) was sent to the Project Task Manager.
- Supported product scenario / material-premise basis changes: None

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| CR-001..CR-003 | Resolved | Resolved | IR-002 | unchanged |

- New or remaining finding IDs: F-001, F-002 (held), F-003
- Material score or classification changes: Runtime Correctness 9.3 → 8.5 pending the fix. Large / High unchanged.
- Recommended recipient: `/software_engineering_team/implementation_engineer`
- Remaining risks or uncertainty:
  - F-002 may need a renderer change, which is outside the Change Scope (Solution Designer);
  - how pre-adoption usage counts in the PM's Token Meter, if the fix needs that decision.

### CRR-004 — F-001 / F-003 delta re-review

- Canonical review report updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/link-existing-run-to-task/tickets/in-progress/link-existing-run-to-task/code-review-report.md`
- Review entry point and round: Implementation Review, round 4
- Review scope: `Targeted Delta Review` (`f5001b65c6`: the token-usage accumulator, the Task message builder, the lifecycle delivery, 2 tests, the e2e log)
- Triggering role, report path, and finding or scenario IDs: implementation_engineer, `implementation-revision-record.md` IR-003; F-001, F-003
- Relevant solution revision IDs: `SR-008`
- Relevant architecture-review revision IDs: `ARCH-REV-004`
- Relevant implementation revision IDs: `IR-003`
- Relevant API/E2E revision IDs: `API-REV-001`
- Relevant delivery revision IDs: `N/A`
- Prior authoritative result: Fail (failure-origin, CRR-003)
- Current authoritative result: Pass, 9.3/10, every category ≥ 9.0
- What changed in the review result and why:
  - The live summary now claims the observation's current root; the stored record is unchanged. The stored Token Meter queries aren't validated against the live root.
  - The adopted run gets its own Task message first line.
  - Reviewer checks: tsc clean, 0 unused locals in touched files, 675/675 tests; ADO-1..ADO-4 4/4 in the e2e log.
  - The PM's meter including pre-adoption usage is recorded as a consequence of REQ-003, not a finding.
- Supported product scenario / material-premise basis changes: None

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| F-001 | Local Fix | Resolved | IR-003, `f5001b65c6` | accumulator diff; regression unit test; ADO-4 pass |
| F-003 | Local Fix | Resolved | IR-003 | message builder; root test asserts the line and no "previous Task" |
| F-002 | Held | Held | — | recheck at API/E2E |

- New or remaining finding IDs: F-002 (held)
- Material score or classification changes: Runtime Correctness 8.5 → 9.3. Large / High unchanged.
- Recommended recipient: `/software_engineering_team/api_e2e_engineer` (informational: `/software_engineering_team/implementation_engineer`)
- Remaining risks or uncertainty: F-002; the AC-007 user check

### CRR-005 — API/E2E failure-origin review of F-002 (API-REV-002)

- Canonical review report updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/link-existing-run-to-task/tickets/in-progress/link-existing-run-to-task/code-review-report.md`
- Review entry point and round: API/E2E Failure-Origin Review, round 5
- Review scope: `N/A` (failure-origin): F-002 against the renderer's history projection and the evidence
- Triggering role, report path, and finding or scenario IDs: api_e2e_engineer, `api-e2e-revision-record.md` API-REV-002 (Fail on F-002 only); AC-001, AC-003, BEH-002
- Relevant solution revision IDs: `SR-008`
- Relevant architecture-review revision IDs: `ARCH-REV-004`
- Relevant implementation revision IDs: `IR-003`
- Relevant API/E2E revision IDs: `API-REV-002`
- Relevant delivery revision IDs: `N/A`
- Prior authoritative result: Pass, 9.3/10 (CRR-004)
- Current authoritative result: Fail, `Design Impact` (F-002)
- What changed in the review result and why:
  - The renderer adds every run context opened this session as `source: 'local'` rows and team nodes, whatever the server's history says, and the server has no history push.
  - The design's "leaves its group because its history row is removed" premise is therefore wrong for runs opened in the session, and the fix (renderer) is outside the design's Change Scope.
  - F-001 and F-003 are verified fixed on the real app.
- Supported product scenario / material-premise basis changes: the material premise "history row removal removes the sidebar row" is reclassified as contradicted

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| F-001 | Resolved | Resolved (verified on the real app) | API-REV-002 | ADO-4; desktop session without rejection |
| F-003 | Resolved | Resolved (verified) | API-REV-002 | the delivered first line |
| F-002 | Held | Design Impact | API-REV-002 | `runHistoryReadModel.ts:267-281`; `runHistoryNavigationProjection.ts:180-187`; f002 evidence |

- New or remaining finding IDs: F-002
- Material score or classification changes: none to the source score. Large / High unchanged.
- Recommended recipient: `/software_engineering_team/solution_designer`
- Remaining risks or uncertainty: the renderer design choice (drop the context row, or hide it by event); the AC-007 user check

### CRR-006 — SR-009 renderer delta re-review

- Canonical review report updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/link-existing-run-to-task/tickets/in-progress/link-existing-run-to-task/code-review-report.md`
- Review entry point and round: Implementation Review, round 6
- Review scope: `Targeted Delta Review` (`fbc0f805bf`: 5 web files, specs, docs, the rendered evidence)
- Triggering role, report path, and finding or scenario IDs: implementation_engineer, `implementation-revision-record.md` IR-004 on SR-009 (ARCH-REV-005 Pass); F-002
- Relevant solution revision IDs: `SR-009`
- Relevant architecture-review revision IDs: `ARCH-REV-005`
- Relevant implementation revision IDs: `IR-004`
- Relevant API/E2E revision IDs: `API-REV-002`
- Relevant delivery revision IDs: `N/A`
- Prior authoritative result: Fail, `Design Impact` (CRR-005)
- Current authoritative result: Pass, 9.3/10, every category ≥ 9.0
- What changed in the review result and why:
  - The renderer retires an adopted run's own-group row on `task_execution_started` (rule 1) and when a later history read no longer lists it (rule 2, respecting the per-agent window; the server's `createdAt` ordering verified).
  - The three implementer decisions are accepted.
  - Reviewer checks: 69/69 tests in 4 changed specs; implementer's web run 4480; the rendered check passes.
- Supported product scenario / material-premise basis changes: the sidebar premise was corrected by SR-009

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| F-002 | Design Impact | Resolved in source (to be validated at API/E2E) | SR-009, IR-004, `fbc0f805bf` | specs (rules 1 and 2, window, never-listed, archive); rendered check evidence |
| F-001, F-003 | Resolved | Resolved | IR-003 | unchanged |

- New or remaining finding IDs: None
- Material score or classification changes: none. Large / High unchanged.
- Recommended recipient: `/software_engineering_team/api_e2e_engineer` (informational: `/software_engineering_team/implementation_engineer`)
- Remaining risks or uncertainty: D-1 on the real app; the AC-007 user check

### CRR-007 — Proportional test-code review after the API/E2E pass

- Canonical review report updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/link-existing-run-to-task/tickets/in-progress/link-existing-run-to-task/api-e2e-test-review-report.md`
- Review entry point and round: API/E2E test-code review, round 1
- Review scope: the new `hand-started-run-adoption.e2e.test.ts` (ADO-1..ADO-4), the harness options, the TESTING.md temp-`HOME` rule; the ADO evidence and ledger disclosure
- Triggering role, report path, and finding or scenario IDs: api_e2e_engineer, `api-e2e-revision-record.md` API-REV-003 (Pass)
- Relevant solution revision IDs: `SR-009`
- Relevant architecture-review revision IDs: `ARCH-REV-005`
- Relevant implementation revision IDs: `IR-004`
- Relevant API/E2E revision IDs: `API-REV-003`
- Relevant delivery revision IDs: `N/A`
- Prior authoritative result: implementation review Pass 9.3/10 (CRR-006); no prior test review
- Current authoritative result: test review Fail, `Local Fix`
- What changed in the review result and why:
  - The tests enter through real triggers and prove REQ-002..REQ-004, AC-001..AC-004 and F-001, with a control. The failed authoring runs are disclosed with their causes.
  - TR-001: the header misses ADO-4, and the Run line contradicts the new TESTING.md `HOME` rule.
  - TR-002: ADO-3's busy precondition relies on a fixed 2 s sleep.
- Supported product scenario / material-premise basis changes: None

#### Prior Finding Resolution

None (first test review).

- New or remaining finding IDs: TR-001, TR-002
- Material score or classification changes: N/A
- Recommended recipient: `/software_engineering_team/api_e2e_engineer`
- Remaining risks or uncertainty: AC-007 (the user's check at delivery)

### CRR-008 — Test-code delta re-review of TR-001 and TR-002

- Canonical review report updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/link-existing-run-to-task/tickets/in-progress/link-existing-run-to-task/api-e2e-test-review-report.md`
- Review entry point and round: API/E2E test-code review, round 2
- Review scope: `Targeted Delta Review` of the ADO file header and the ADO-3 busy precondition; `round4/ADO3-run*.log`
- Triggering role, report path, and finding or scenario IDs: api_e2e_engineer, `api-e2e-revision-record.md` API-REV-004; TR-001, TR-002
- Relevant solution revision IDs: `SR-009`
- Relevant architecture-review revision IDs: `ARCH-REV-005`
- Relevant implementation revision IDs: `IR-004`
- Relevant API/E2E revision IDs: `API-REV-004`
- Relevant delivery revision IDs: `N/A`
- Prior authoritative result: test review Fail, `Local Fix` (CRR-007)
- Current authoritative result: test review Pass; to delivery
- What changed in the review result and why: the header covers ADO-4 and follows the TESTING.md `HOME` rule; the busy precondition waits for the recorded turn input instead of a fixed sleep; the ADO-3 rerun passes; the failed first try is disclosed.
- Supported product scenario / material-premise basis changes: None

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| TR-001 | Local Fix | Resolved | API-REV-004 | header lines 11–26 |
| TR-002 | Local Fix | Resolved | API-REV-004 | lines 199–203; `round4/ADO3-run2.log` |

- New or remaining finding IDs: None
- Material score or classification changes: N/A
- Recommended recipient: `/software_engineering_team/delivery_engineer`
- Remaining risks or uncertainty: AC-007 (the user's check)
