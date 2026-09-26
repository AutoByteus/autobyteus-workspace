# Code Review Revision Record — claude-sdk-streaming-input-session

The latest `code-review-report.md` (or `api-e2e-test-review-report.md`) is authoritative for its current result.

## Revision Index

| Revision ID | Canonical Review Report | Entry Point / Trigger | Prior Result | Current Result | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| CRR-001 | `code-review-report.md` | Implementation Review / IR-002 `Implementation Complete` | N/A | Fail (`Local Fix`) | CR-001 |
| CRR-002 | `code-review-report.md` | Implementation Review round 2 / IR-003 `Local Fix complete` | Fail (`Local Fix`) | Pass | CR-001 (resolved) |
| CRR-003 | `code-review-report.md` | API/E2E Failure-Origin Review / API-REV-001 Fail (API-F-001) | Pass | Fail (`Design Impact`) | CR-002 |
| CRR-004 | `code-review-report.md` | Implementation Review round 4 / IR-004 (SR-012) | Fail (`Design Impact`) | Pass | CR-002 (resolved) |
| CRR-005 | `api-e2e-test-review-report.md` | Proportional API/E2E Test Review / API-REV-002 Pass | Pass (CRR-004) | Pass | None |

## Revision Entries

### CRR-001 — Initial implementation review: requeued undelivered append keeps a stale terminal

- Canonical review report updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-streaming-input-session/tickets/in-progress/claude-sdk-streaming-input-session/code-review-report.md`
- Review entry point and round: Implementation Review, round 1
- Triggering role, report path, and finding or scenario IDs: `/implementation_engineer`, `implementation-handoff.md` (IR-002); IMP-DI-001 resolved by SR-011; IC-1..IC-4
- Relevant solution revision IDs: SR-011
- Relevant architecture-review revision IDs: ARCH-REV-004
- Relevant implementation revision IDs: IR-001, IR-002
- Relevant API/E2E revision IDs: N/A
- Relevant delivery revision IDs: N/A
- Prior authoritative result: N/A
- Current authoritative result: `Fail`, classified `Local Fix` → `/implementation_engineer`
- What changed in the review result and why:
  - This is the initial baseline.
  - One promoted finding, CR-001: `applyDispatchResult`'s requeue branch does not clear `pendingTerminal`. In production the previous turn's terminal is observed while the append claim is in flight, so the requeued input later resolves immediately with the previous turn's terminal.
  - Everything else passed.
- Supported product scenario / material-premise basis changes: none. The AC-016 race was confirmed Reachable, with the additional evidence that the terminal-during-claim ordering is the dominant Claude ordering. CAND-002..008 were rejected.

#### Prior Finding Resolution

None.

- New or remaining finding IDs: CR-001
- Material score or classification changes: baseline 9.0/10. Runtime Correctness is 8.0 and API/E2E Readiness is 8.5.
- Recommended recipient: `/implementation_engineer`
- Remaining risks or uncertainty: the live API/E2E items listed in the report's Residual Risks.

### CRR-002 — Focused re-review: CR-001 resolved

- Canonical review report updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-streaming-input-session/tickets/in-progress/claude-sdk-streaming-input-session/code-review-report.md`
- Review entry point and round: Implementation Review, round 2 (focused on CR-001 and its tests; all other checks carried from CRR-001 because nothing else changed)
- Triggering role, report path, and finding or scenario IDs: `/implementation_engineer`, `implementation-revision-record.md` IR-003; CR-001; CR-SCN-001
- Relevant solution revision IDs: SR-011
- Relevant architecture-review revision IDs: ARCH-REV-004
- Relevant implementation revision IDs: IR-003
- Relevant API/E2E revision IDs: N/A
- Relevant delivery revision IDs: N/A
- Prior authoritative result: `Fail` (`Local Fix`, CRR-001)
- Current authoritative result: `Pass`
- What changed in the review result and why: commit `b7c6d86b3` clears `pendingTerminal` and `observedTurnId` on requeue. The source change is 4 lines in `agent-run-input-admission-state.ts`. It adds regression tests for the terminal-during-claim ordering (admission-state completed and failed; AgentRun with a pending dispatch). The reviewer reran 19 suites (204 tests); all pass.
- Supported product scenario / material-premise basis changes: none.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| CR-001 | Open (High) | Resolved | IR-003; `b7c6d86b3` | The diff clears `pendingTerminal`/`observedTurnId` in the requeue branch. The new tests assert that B stays `[admitted, forwarded, turn_associated]` until turn-B's terminal, then gets exactly one `completed(turn-B)`. The reviewer reran the suites: pass |

- New or remaining finding IDs: None
- Material score or classification changes: 9.0 → 9.3. Runtime Correctness 8.0 → 9.2; API/E2E Readiness 8.5 → 9.2.
- Recommended recipient: `/api_e2e_engineer` (primary); informational notice to `/implementation_engineer`
- Remaining risks or uncertainty: the live API/E2E items in the report's Residual Risks.

### CRR-003 — API/E2E failure-origin review: RSK-007 usage loss after crash reopen

- Canonical review report updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-streaming-input-session/tickets/in-progress/claude-sdk-streaming-input-session/code-review-report.md`
- Review entry point and round: API/E2E Failure-Origin Review, round 3
- Triggering role, report path, and finding or scenario IDs: `/api_e2e_engineer`, `api-e2e-execution-coverage-report.md` (API-REV-001, `Fail`); API-F-001 / RSK-007
- Relevant solution revision IDs: SR-011
- Relevant architecture-review revision IDs: ARCH-REV-004
- Relevant implementation revision IDs: IR-003
- Relevant API/E2E revision IDs: API-REV-001
- Relevant delivery revision IDs: N/A
- Prior authoritative result: `Pass` (CRR-002, implementation review)
- Current authoritative result: `Fail`, classified `Design Impact` → `/solution_designer`
- What changed in the review result and why:
  - Live evidence on both CLIs shows the first turn after an unexpected-exit reopen reports a restarted cumulative `modelUsage`. The reconciler's session+raw-model series treats it as a regression and suppresses it, so one turn's usage is lost per crash.
  - This regresses the base per-turn-process behavior and hits the design's RSK-007 escalation trigger. The fix needs a cross-contract design decision.
- Supported product scenario / material-premise basis changes: the RSK-007 premise "a resumed process continues from its saved totals" is reclassified as true only after a clean exit. The crash-reopen scenario is a Supported Explicit Edge Scenario (REQ-008/AC-009).

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| CR-001 | Resolved (CRR-002) | Resolved (unchanged) | IR-003 | API/E2E AC-016 fake-CLI race passes, including its control |

- New or remaining finding IDs: CR-002 (new; Design Impact)
- Material score or classification changes: no scorecard in a failure-origin round. Classification is `Design Impact`.
- Recommended recipient: `/solution_designer`
- Remaining risks or uncertainty:
  - The restart origin of the CLI counter after a crash is the last clean-exit total, which is not always 0; the design decision must cover both.
  - OBS-2 (an inherited `CLAUDE_CODE_DISABLE_BACKGROUND_TASKS`) is noted for the Solution Designer.

### CRR-004 — Implementation review of the SR-012 delta: CR-002 resolved

- Canonical review report updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-streaming-input-session/tickets/in-progress/claude-sdk-streaming-input-session/code-review-report.md`
- Review entry point and round: Implementation Review, round 4 (the SR-012 delta `b7c6d86b3..d3e227389`)
- Triggering role, report path, and finding or scenario IDs: `/implementation_engineer`, `implementation-revision-record.md` IR-004; CR-002; IC-5; OBS-2
- Relevant solution revision IDs: SR-012
- Relevant architecture-review revision IDs: ARCH-REV-005
- Relevant implementation revision IDs: IR-004
- Relevant API/E2E revision IDs: API-REV-001
- Relevant delivery revision IDs: N/A
- Prior authoritative result: `Fail` (`Design Impact`, CRR-003)
- Current authoritative result: `Pass`
- What changed in the review result and why:
  - The implementation follows SR-012 rules 1-4 and IC-5: a resume-generation marker is consumed only on emit; the reconciler admits the main loop, re-anchors, and flags; unmarked observations are unchanged.
  - The OBS-2 warning has no override, and the docs are corrected.
  - The duplicate-observation premise was rejected, because fold idempotency digests suppress duplicates before reconcile.
  - The reviewer reran 35 files and 317 tests (pass), and tsc is clean.
- Supported product scenario / material-premise basis changes: none beyond SR-012 (the crash-restart origin is Reachable and handled).

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| CR-002 | Open (Design Impact) | Resolved | SR-012; ARCH-REV-005; IR-004; `d3e227389` | Reconciler and session unit tests (origin 0, restore-time origin, IC-5 carry); implementer's live RSK-007 2/2 on both CLIs; API/E2E rerun pending |
| CR-001 | Resolved | Resolved (unchanged) | IR-003 | — |

- New or remaining finding IDs: None
- Material score or classification changes: the scorecard holds at 9.3/10.
- Recommended recipient: `/api_e2e_engineer` (primary); informational notice to `/implementation_engineer`
- Remaining risks or uncertainty:
  - The main-loop approximation for one turn per resume generation excludes auxiliary selected-model calls (accepted in ARCH-REV-005).
  - A clean restore is also approximated (accepted).

### CRR-005 — Proportional review of durable API/E2E test changes

- Canonical review report updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-streaming-input-session/tickets/in-progress/claude-sdk-streaming-input-session/api-e2e-test-review-report.md` (new)
- Review entry point and round: Successful API/E2E Test-Code Review, round 1
- Triggering role, report path, and finding or scenario IDs: `/api_e2e_engineer`, `api-e2e-execution-coverage-report.md` (API-REV-002, `Pass`, 94.6%)
- Relevant solution revision IDs: SR-012
- Relevant architecture-review revision IDs: ARCH-REV-005
- Relevant implementation revision IDs: IR-004
- Relevant API/E2E revision IDs: API-REV-001, API-REV-002
- Relevant delivery revision IDs: N/A
- Prior authoritative result: `Pass` (CRR-004, implementation review)
- Current authoritative result: test review `Pass`
- What changed in the review result and why:
  - Scope: 3 added and 3 updated durable test files, with no removals. They are coherent, requirement-aligned and discriminating (the round-1 controls fail on base behavior).
  - The shared live harness removes duplication.
  - Two non-blocking notes: the Codex team case reports pass when disabled, and a variable is shadowed.
- Supported product scenario / material-premise basis changes: none.

#### Prior Finding Resolution

None (no prior test-review findings; CR-001 and CR-002 remain resolved).

- New or remaining finding IDs: None
- Material score or classification changes: N/A (the proportional test review has no scorecard)
- Recommended recipient: `/delivery_engineer`
- Remaining risks or uncertainty: the API-REV-002 residuals (api-key auth mode not run live; main-loop-only restart turn; pre-existing stale E2Es).
