# API/E2E Revision Record

The latest coverage investigation and execution coverage report remain authoritative.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | implementation_engineer / implementation-handoff.md / round 1 | SR-002, IR-001 | N/A | Pass / 95.1 % |

## Revision Entries

### API-REV-001 — Baseline validation of the Codex interrupted-compaction fix

- Trigger: implementation_engineer "Implementation Complete", /Users/normy/autobyteus_org/autobyteus-worktrees/codex-interrupted-compaction-fix/tickets/in-progress/codex-interrupted-compaction-fix/implementation-handoff.md, round 1.
- Related revision IDs: SR-002, IR-001 (69b0493f2). Architecture review and code review: N/A (direct route).
- Coverage changes (uncommitted in the worktree):
  - Updated tests/e2e/runtime/codex-interrupted-compaction.e2e.test.ts: shared setup; interrupt + reopened history; new terminate case (real-use invariant); new app-server crash case.
  - New Codex case in autobyteus-web agentStatusHandler.spec.ts.
- Cases: REPO-01..03, WEB-1, E2E-I, E2E-K, E2E-T, UI-1.
- Execution notes:
  - Live codex-cli 0.160.0: 4 runs of the file.
  - Packaged desktop isolated instance, using the operator launch option `CODEX_APP_SERVER_ARGS_JSON` in the instance's own .env.
  - Base-worktree regression delta.
- Mid-round finding: the first terminate case expected a `run_terminated` close. Live diagnosis showed that AgentRun terminate waits for the active turn, so the compaction completes first. The case was rewritten to the real-use invariant (OBS-1). This is not a product defect.

#### Prior Failure Resolution

None.

- Canonical artifacts updated: api-e2e-coverage-investigation.md, api-e2e-execution-coverage-report.md, api-e2e-test-case-ledger.md.
- Prior result: N/A. Current: Pass, 95.1 % (lowest category 94 %). Failure IDs: none.
- Remaining:
  - OBS-1: the terminate hook is defensive only; Terminate waits for the turn.
  - OBS-2: reopened FAILED row lacks the reason (pre-existing reader limitation).
  - OBS-3: TESTING.md wording.
  - SCN-C2 and SCN-C3 have no live trigger (replay/unit only).
