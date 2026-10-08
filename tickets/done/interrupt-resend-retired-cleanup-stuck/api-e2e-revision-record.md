# API/E2E Revision Record

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Code Reviewer / `code-review-report.md` (CRR-001 Pass) / round 1 | SR-001, SR-002, ARCH-REV-001, IR-001, CRR-001 | N/A | Pass / 95.4% |

## Revision Entries

### API-REV-001 — Baseline: live AGY/Codex and desktop proof of interrupt-resend recovery

- Triggering role, report path, and round: `/software_engineering_team/code_reviewer`, `tickets/in-progress/interrupt-resend-retired-cleanup-stuck/code-review-report.md`, round 1
- Triggering finding or case IDs: the reviewer's open items: AC-001/AC-002 and ASM-001 on live AGY, AC-006 live, AC-003 on a live non-AGY runtime
- Related revision IDs: SR-001, SR-002, ARCH-REV-001, IR-001, CRR-001
- Why recorded: first completed API/E2E result
- Coverage decisions or durable test paths changed:
  - Added the fake-AGY Team member case (AC-006) in `tests/e2e/runtime/agy-interrupt-resend-transport.e2e.test.ts`.
  - Added LIVE-STANDALONE-INT and LIVE-TEAM-INT to `tests/e2e/runtime/agy-runtime-stop-recovery-live.e2e.test.ts`, plus a test-only fix of the LIVE-ORG-R7 Stop-ack race in `stopMidTurn`.
  - Added `tests/e2e/runtime/codex-runtime-exit-resend.e2e.test.ts` (AC-003 live; fails on base source).
- Cases: R-01..R-06, E2E-TEAM-INT, L-01..L-05, D-01 (see ledger)
- Commands, environment, fixture, or broader-validation delta: live runs with real `agy` 1.3.1 and `codex-cli` 0.161.0; isolated desktop instance of this worktree's build (`iso-50614-5374`, stopped and cleaned)

#### Prior Failure Resolution

None.

- Canonical artifacts: `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, `api-e2e-test-case-ledger.md`, `evidence/api-e2e/`
- Prior result and confidence: N/A
- Current result and confidence: Pass, 95.4% (no category below 92%)
- New or remaining failure IDs: none. Within this round, LIVE-ORG-R7's first full-file failure was a test race that is now fixed.
- Recommended owner: Code Reviewer (proportional test-code review)
- Remaining risks:
  - AC-004 and QR-001 (release failure or timeout text) are unit-proven only.
  - AC-007 is Delivery/user verification.
  - The transient offline/initializing status is cosmetic.
  - 23 base team-execution integration failures (stale doubles) are reported as a separate item.
