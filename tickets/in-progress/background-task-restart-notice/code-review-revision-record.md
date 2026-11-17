# Code Review Revision Record

## Revision Index

| Revision ID | Canonical Review Report | Entry Point / Trigger | Prior Result | Current Result | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| CRR-001 | `code-review-report.md` | Implementation Review, round 1 (IR-001, part 1) | N/A | Pass | None |
| CRR-002 | `code-review-report.md` | API/E2E Failure-Origin Review, round 2 (API-REV-001 F-1) | Pass | Fail (Requirement Gap) | CR-001 |
| CRR-003 | `code-review-report.md` | Implementation Review, round 3 (IR-002, DEC-008) | Fail (Requirement Gap) | Pass | CR-001 (resolved) |
| CRR-004 | `api-e2e-test-review-report.md` | Proportional API/E2E test-code review, round 1 (API-REV-002 Pass) | N/A (first test review) | Pass | None |

## Revision Entries

### CRR-001 — Part 1 (restart reminder) source review: Pass

- Canonical review report updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/background-task-restart-notice/tickets/in-progress/background-task-restart-notice/code-review-report.md`
- Review entry point and round: Implementation Review, round 1
- Review scope: `Full Review` (`4cbf9e7881..d5e9f350cf`)
- Triggering role, report path, and finding or scenario IDs: implementation engineer, `implementation-handoff.md` (IR-001); BEH-001..BEH-004
- Relevant solution revision IDs: SR-003
- Relevant architecture-review revision IDs: ARCH-REV-002
- Relevant implementation revision IDs: IR-001
- Relevant API/E2E revision IDs: N/A
- Relevant delivery revision IDs: N/A
- Prior authoritative result: N/A
- Current authoritative result: `Pass`
- What changed in the review result and why: baseline. Spines, ownership, startup order and the exactly-once paths match SR-003 and are tested; the seven implementation choices are sound.
- Supported product scenario / material-premise basis changes: none; C-01..C-06 rejected with reasons (time format, prune inputs at take, stale pending entries, at-least-once on a crash, report count, tick cost).

#### Prior Finding Resolution

None.

- New or remaining finding IDs: none
- Material score or classification changes: N/A (baseline; every category ≥ 9.3)
- Recommended recipient: API/E2E engineer
- Remaining risks or uncertainty: R-4/R-5/R-6 as designed; at least once across a crash right after a delivery.

### CRR-002 — Failure origin of F-1: Requirement Gap

- Canonical review report updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/background-task-restart-notice/tickets/in-progress/background-task-restart-notice/code-review-report.md` (section "Latest Round")
- Review entry point and round: API/E2E Failure-Origin Review, round 2
- Review scope: `N/A` (failure-origin)
- Triggering role, report path, and finding or scenario IDs: API/E2E engineer, `api-e2e-execution-coverage-report.md` F-1; API-06 / RR-02; SCN-004, REQ-002, AC-001 (kill)
- Relevant solution revision IDs: SR-003
- Relevant architecture-review revision IDs: ARCH-REV-002
- Relevant implementation revision IDs: IR-001
- Relevant API/E2E revision IDs: API-REV-001
- Relevant delivery revision IDs: N/A
- Prior authoritative result: CRR-001 `Pass` (implementation review)
- Current authoritative result: `Fail`, failure origin `Requirement Gap`
- What changed in the review result and why: after a server SIGKILL the native background command survives in the old process group (RR-02, 13 s later), while the approved reminder tells the agent "the restart stopped them". The code follows the approved text and design, so this is not an implementation defect. The approved text's premise is false for the `unexpected_stop` cause. A fix needs a user-level decision: new wording, or stopping the previous session's surviving command groups at start (other functionality, possibly a prerequisite).
- Supported product scenario / material-premise basis changes: BEH-004 reclassified `Contradicted`; Material-Premise Gate `Fail` (no design, architecture or code review record validated the crash premise; review gap stated in the report).

#### Prior Finding Resolution

None (round 1 had no findings).

- New or remaining finding IDs: CR-001 (= API/E2E F-1)
- Material score or classification changes: round 1 scorecard unchanged (not repeated); classification `Requirement Gap`
- Recommended recipient: Solution Designer
- Remaining risks or uncertainty: other runtimes' survival of a server SIGKILL is unmeasured (Unclear); FU-002 and the environment failures are recorded by API/E2E, outside this entry point.

### CRR-003 — DEC-008 wording reviewed: Pass

- Canonical review report updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/background-task-restart-notice/tickets/in-progress/background-task-restart-notice/code-review-report.md` (section "Latest Round")
- Review entry point and round: Implementation Review, round 3
- Review scope: `Targeted Delta Review` (`cf5ce8d109..b78555d7bb`: `restart-notice.ts`, its unit test, one RR-02 e2e assertion, two docs; no spine, interface or shape change)
- Triggering role, report path, and finding or scenario IDs: implementation engineer, `implementation-handoff.md` (IR-002, choice 8); CR-001 / F-1
- Relevant solution revision IDs: SR-004
- Relevant architecture-review revision IDs: ARCH-REV-003
- Relevant implementation revision IDs: IR-002
- Relevant API/E2E revision IDs: API-REV-001
- Relevant delivery revision IDs: N/A
- Prior authoritative result: CRR-002 `Fail` (Requirement Gap)
- Current authoritative result: `Pass`
- What changed in the review result and why: the user decided DEC-008 (a). The background line now depends on the cause, and the unexpected-stop text equals the approved text exactly (verified by evaluating the constant against requirements-doc L137). The update and restart line is unchanged. Unit tests assert each line; IMP-04 passes 120 tests at `b78555d7bb`.
- Supported product scenario / material-premise basis changes: BEH-004 `Confirmed` again under SR-004; Material-Premise Gate `Pass`. Stopping a crashed session's survivors is FU-004 (not this ticket, by the user's decision).

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| CR-001 | Open (Requirement Gap) | Resolved | SR-004 DEC-008, ARCH-REV-003, IR-002, `b78555d7bb` | `restart-notice.ts` cause-dependent line; exact-text check against the requirements; `restart-notice.test.ts` per-cause assertions; `evidence/IMP-04-dec008-rerun.log` |

- New or remaining finding IDs: none
- Material score or classification changes: none (9.43 carried forward)
- Recommended recipient: API/E2E engineer (rerun RR-02 on the built server); then the implementation engineer (informational)
- Remaining risks or uncertainty: other runtimes' survival of a server SIGKILL remains unmeasured; the new wording says "may", which holds either way.

### CRR-004 — Proportional test-code review after API/E2E round 2: Pass

- Canonical review report updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/background-task-restart-notice/tickets/in-progress/background-task-restart-notice/api-e2e-test-review-report.md`
- Review entry point and round: successful API/E2E test-code review, round 1
- Review scope: `N/A` (test review)
- Triggering role, report path, and finding or scenario IDs: API/E2E engineer, `api-e2e-execution-coverage-report.md` (API-REV-002 Pass); RR-01..RR-09
- Relevant solution revision IDs: SR-004
- Relevant architecture-review revision IDs: ARCH-REV-003
- Relevant implementation revision IDs: IR-002
- Relevant API/E2E revision IDs: API-REV-001, API-REV-002
- Relevant delivery revision IDs: N/A
- Prior authoritative result: N/A for test review (implementation review CRR-003 Pass)
- Current authoritative result: `Pass`
- What changed in the review result and why: reviewed the built-server restart suite as a whole (its first test review). Every case enters through real triggers: the built server, GraphQL and WebSocket, SIGTERM and SIGKILL, and a stamped previous release for an update. The assertions prove the cause, record, take, wake, text and exactly-once requirements; RR-02 asserts DEC-008, and RR-09 shows a live model acting on it.
- Supported product scenario / material-premise basis changes: none

#### Prior Finding Resolution

None.

- New or remaining finding IDs: none (one cosmetic note on the previous-release copy folder)
- Material score or classification changes: N/A
- Recommended recipient: delivery engineer
- Remaining risks or uncertainty: FU-002, FU-004, ACP live Not Tested, environmental watcher failures (API-01).
