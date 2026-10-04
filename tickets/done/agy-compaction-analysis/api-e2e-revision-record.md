# API/E2E Revision Record

The latest coverage investigation and execution coverage report remain authoritative.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | implementation_engineer / implementation-handoff.md / round 1 | SR-002, IR-001 | N/A | Pass / 95.0 % |

## Revision Entries

### API-REV-001 — Baseline validation of AGY compaction detection and raw-trace rotation

- Trigger: implementation_engineer "Implementation Complete", /Users/normy/autobyteus_org/autobyteus-worktrees/agy-compaction-analysis/tickets/in-progress/agy-compaction-analysis/implementation-handoff.md, round 1.
- Related revision IDs: SR-002, IR-001 (f615e5d06). Architecture review and code review: N/A (direct route).
- Coverage changes (uncommitted in the worktree):
  - Added tests/e2e/runtime/agy-compaction-gate-off-transport.e2e.test.ts.
  - Fixture `AGY_FAKE_VERSION` override in tests/fixtures/agy-failure-cli.mjs.
  - Extended tests/e2e/runtime/agy-compaction-rotation-live.e2e.test.ts: history, restore, `AGY_COMPACTION_E2E_CHECKPOINTS`.
  - New AGY case in autobyteus-web agentStatusHandler.spec.ts.
- Cases: REPO-01..04, E2E-S1, E2E-G1, WEB-1, E2E-L1, E2E-L2, UI-1.
- Environment and broader validation:
  - Live agy 1.2.16 runs: 1 checkpoint; then 2 checkpoints twice (the first two-checkpoint run had a test-assertion defect, fixed).
  - Packaged desktop isolated instance with the AGY runtime.
  - Base-worktree regression delta.

#### Prior Failure Resolution

None.

- Canonical artifacts updated: api-e2e-coverage-investigation.md, api-e2e-execution-coverage-report.md, api-e2e-test-case-ledger.md.
- Prior result: N/A. Current result: Pass, 95.0 % (lowest category 94 %).
- Failure IDs: none.
- Remaining risks:
  - Duration is not displayed in the UI row (OBS-1).
  - Doc wording and TESTING.md additions for delivery (OBS-2).
  - No real AGY < 1.2.16 binary is available; the gate is proven with the fake CLI.
  - AGY compaction failure is not observable.
