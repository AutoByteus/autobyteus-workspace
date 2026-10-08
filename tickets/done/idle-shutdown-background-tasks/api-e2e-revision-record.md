# API/E2E Revision Record

The coverage investigation and execution coverage report are the current truth.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | code_reviewer / `code-review-report.md` CRR-003 / round 3 | SR-003, ARCH-REV-002, IR-003, CRR-003 | N/A | Pass / 95.2% |

## Revision Entries

### API-REV-001 — Hybrid idle shutdown validated across roots and runtimes

- Triggering role, report path, and round: `/software_engineering_team/code_reviewer`, `code-review-report.md` CRR-003 (round 3, full re-audit, Pass 9.5/10).
- Triggering finding or case IDs: N-001 (TESTING.md row); suggested coverage AC-001..AC-007.
- Related revision IDs: SR-003, ARCH-REV-002, IR-003, CRR-003. An earlier SR-002 investigation (round 1) was stopped by the Solution Designer before any result. It recorded no result and is superseded.
- Why this baseline was recorded: first completed API/E2E result.
- Coverage decisions or durable test paths changed:
  - Added `tests/e2e/projects/task-copy-idle-lifetime.e2e.test.ts` and `tests/e2e/runtime/agy-delegated-background-task.e2e.test.ts`. Both replace the uncommitted SR-002 versions.
  - Updated `tests/fixtures/agy-failure-cli.mjs` (`BACKGROUND_STEP` route), `tests/unit/agent-execution/backends/antigravity/agy-failure-cli-routing.test.ts` and `TESTING.md`.
- Cases added, changed, removed, or rechecked: E2E-HYB (A/T/O), E2E-HYB-BASE, LIVE-AGY, FIX-001 added; LIVE-CLAUDE, LIVE-MIXED, E2E-REG, R-FOCUS(-BASE), R-UNIT, AC008 executed.
- Commands, environment, fixture, or broader-validation delta: see the report. Live Claude 2.1.283, AGY 1.3.1, codex-cli 0.161.0 (`CODEX_E2E_TOOL_MODEL=gpt-5.6-luna`), LM Studio `qwen/qwen3.8-27b`.

#### Prior Failure Resolution

None.

- Canonical artifacts and sections updated: coverage investigation (round 2), execution coverage report, test-case ledger.
- Prior result and confidence: N/A
- Current result and confidence: Pass, 95.2%
- New or remaining failure IDs: None
- Recommended owner: `/software_engineering_team/code_reviewer` (proportional test-code review)
- Remaining risks, blocked evidence, or untested scope:
  - QR-002/DEC-005 (accepted): an externally killed AGY daemon gets no exit message on 1.3.1, and a missed Claude terminal frame is possible. Either keeps a copy live until DONE or a stop.
  - Server-process stop with a running task and AC-003 with a Claude member are unit-level only.
