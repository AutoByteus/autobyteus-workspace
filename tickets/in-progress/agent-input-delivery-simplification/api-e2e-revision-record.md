# API/E2E Revision Record — Agent Input Delivery Simplification

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Code Reviewer CRR-002 Pass, round 1 | SR-003, SR-004, SR-005, ARCH-REV-002, IR-003, CRR-002 | N/A | Pass / 95% |
| API-REV-002 | Code Reviewer CRR-003 (TR-001 Local Fix, N-1), round 2 | IR-003, CRR-003 | Pass / 95% (test-review Fail on TR-001) | Pass / 95% |

## Revision Entries

### API-REV-001 — Baseline: unified teammate delivery and the REQ-012 race at the real server boundary

- Triggering role, report, round: `/software_engineering_team/code_reviewer`, `code-review-report.md` (CRR-002), round 1
- Triggering finding or case IDs: N/A (initial)
- Related revision IDs: SR-003/004/005, ARCH-REV-002, IR-003, CRR-002
- Coverage decisions or durable test paths changed:
  - Added `autobyteus-server-ts/tests/e2e/projects/teammate-delivery-task-closure-race.e2e.test.ts` (TDR-001..003).
  - Updated `tests/fixtures/agy-failure-cli.mjs` with opt-in `AGY_FAKE_TOOL_TIMEOUT_MS` and `AGY_FAKE_TOOL_LOG`.
  - Updated `TESTING.md`.
- Cases: R-01..R-03, TDR-001..003, TDR-B, REG-E2E, LIVE-RT.
- Commands, environment, fixture, or broader-validation delta: gated scripted-AGY server E2E with one history write held at the store, a cross-root Task closure, and gated real Claude/Codex suites. The host was shared under heavy load.

#### Prior Failure Resolution

None.

- Canonical artifacts updated: coverage investigation, execution coverage report, ledger.
- Prior result and confidence: N/A
- Current result and confidence: Pass, 95%
- New or remaining failure IDs: none in scope.
- Recommended owner: Code Reviewer (proportional test-code review, Large/High).
- Remaining risks:
  - CAND-002 is unit-only.
  - The opaque MCP error for thrown delivery errors is pre-existing (observation 1).
  - Stale gated round-trip suites and a machine-dependent unit test are pre-existing and need owners.
  - `task-copy-idle-lifetime` is timing-sensitive under load.

### API-REV-002 — TR-001: exact agent-visible outcome matching; N-1 precondition

- Trigger: `/software_engineering_team/code_reviewer` CRR-003 (`api-e2e-test-review-report.md`), TR-001 Local Fix, optional N-1.
- Change (test code only, `teammate-delivery-task-closure-race.e2e.test.ts`):
  - `toolOutcome`/`awaitToolOutcome` now match exactly one `send_message_to` call by exact `content` and the intended target (run ID or recipient address). Before, a substring anywhere in the arguments matched, so the blocker case picked up the Manager's wrapper call to A's lead.
  - The blocking-message assertion now also requires `target_agent_run_id` = A's mate.
  - N-1: the delivery spy records start times, and TDR-002 asserts that B's delivery started before Task B closed.
- Rerun: 3/3 roots pass (`api-e2e-evidence/tdr-run7/`).
  - `blockerAgentSaw.target_agent_run_id` equals A's mate in all three roots.
  - B's delivery started about 3.06–3.07 s before Task B closed.

#### Prior Failure Resolution

| Prior Case / Failure Reference | Previous Classification | Current Resolution | Evidence |
| --- | --- | --- | --- |
| TR-001: TDR-002 blocking-message assertion matched the Manager → A lead wrapper call | `Local Fix` (test code), CRR-003 | Fixed: exact matching plus a target assertion; receipt shows A's mate | `tdr-run7/teammate-delivery-task-closure-race.json` |

- Canonical artifacts updated: execution coverage report (TDR-002 row, E-01, durable coverage), ledger, this record.
- Prior result: Pass, 95% (test review Fail on TR-001). Current result: Pass, 95%.
- New or remaining failure IDs: none.
- Recommended owner: Code Reviewer (re-review of the changed lines).
