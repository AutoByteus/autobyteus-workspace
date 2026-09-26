# API/E2E Revision Record — claude-sdk-streaming-input-session

## Revision Index

| Revision ID | Trigger / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | code_reviewer CRR-002 Pass, round 1 | SR-011, ARCH-REV-004, IR-003, CRR-002 | N/A | Fail / 88% |
| API-REV-002 | code_reviewer CRR-004 Pass, round 2 | SR-012, ARCH-REV-005 (IC-5), IR-004, CRR-004 | Fail / 88% | Pass / 94.6% |

## Revision Entries

### API-REV-001 — Initial baseline: live lifecycle, mid-turn delivery, Codex steer, team and replay validated; crash-reopen usage loss found

- Trigger: `code_reviewer`, `code-review-report.md` (CRR-002), round 1
- Triggering scenarios: the reviewer's residual list (AC-014, AC-004, AC-016, AC-001/006, AC-007, AC-008, AC-009, AC-012, RSK-007, web replay render)
- Related revisions: SR-011, ARCH-REV-004, IR-003, CRR-002
- Why recorded: first completed API/E2E result
- Durable test paths changed:
  - added `tests/e2e/helpers/claude-live-agent-harness.ts`, `tests/e2e/runtime/claude-agent-streaming-session-lifecycle.e2e.test.ts` and `tests/e2e/runtime/team-busy-member-mid-turn-delivery.e2e.test.ts`;
  - updated `tests/e2e/runtime/claude-agent-websocket-interrupt-resume.e2e.test.ts` (AC-016), `tests/integration/agent-execution/codex-agent-run-backend-factory.integration.test.ts` (AC-014) and `tests/e2e/runtime/claude-agent-background-task.e2e.test.ts` (shared harness).
- Scenarios: E2E-LIFE-01..07 (incl. 05b RSK-007), RACE-01, CODEX-01, TEAM-01, WEB-01, regressions
- Environment: `RUN_CLAUDE_E2E=1` / `RUN_CODEX_E2E=1`; PATH claude 2.1.283 + bundled 2.1.280; codex 0.156.1 with gpt-5.6-luna; `pnpm dev` + browser for C15. Parent Claude session env stripped.

#### Prior Failure Resolution

None.

- Canonical artifacts: `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, `api-e2e-test-case-ledger.md`, `api-e2e-evidence/`
- Prior result and confidence: N/A
- Current result and confidence: Fail / 88%
- New or remaining failure IDs: **API-F-001**. RSK-007: after an unexpected CLI exit, the first resumed turn's usage is suppressed (`claude_sdk_selected_regressed`, `accounting_total_tokens: null`). Reproduced on both CLIs. Preliminary classification: `Design Impact`.
- Recommended recipient: `/code_reviewer` (failure-origin review)
- Remaining risks / untested scope:
  - api-key auth mode live;
  - inherited `CLAUDE_CODE_DISABLE_BACKGROUND_TASKS` passes through (OBS-2);
  - stale pre-existing `refType` team E2Es and Codex factory cases.

### API-REV-002 — RSK-007 fix validated live (crash reopen and restore); proportionate re-validation

- Trigger: `code_reviewer`, `code-review-report.md` (CRR-004, "Round 4 Implementation Review — SR-012 Delta"), round 2
- Triggering finding: API-F-001 (RSK-007)
- Related revisions: SR-012, ARCH-REV-005 (IC-5), IR-004, CRR-004
- Coverage change: the RSK-007 case in `tests/e2e/runtime/claude-agent-streaming-session-lifecycle.e2e.test.ts` now:
  - adds a clean shutdown + restore leg;
  - asserts the raw `claude_sdk_series_restart` mark exactly on the crash-reopen and restore turns;
  - asserts `claude_sdk_series_restart_main_loop_delta` with accounting == main loop on those turns, and cumulative-delta bounds elsewhere;
  - asserts no `regressed` flag.
  No other durable changes.
- Rechecked: C08-R first, then C16 (unit), C17 (lifecycle ×2 CLIs), C18 (live regressions), C19 (OBS-2 probe). Not re-run: C12, C13, C15 (paths unchanged).

#### Prior Failure Resolution

| Prior Failure | Previous Classification | Current Resolution | Evidence |
| --- | --- | --- | --- |
| API-F-001 (RSK-007) | Design Impact | Resolved (IR-004). Restart turns counted: PATH 13,771 / 13,927, bundled 13,700 / 13,848 (== main loop); later turns exact | `api-e2e-evidence/r2-c08r-rsk007-rerun.log` |

- Canonical artifacts updated: investigation (Round 2 Update), execution report (authoritative round 2), ledger (C08-R, C16–C19)
- Prior result and confidence: Fail / 88%
- Current result and confidence: Pass / 94.6%
- New or remaining failure IDs: none
- Recommended recipient: `/code_reviewer` (proportional test-code review)
- Remaining risks:
  - api-key auth mode not live;
  - main-loop approximation on restart turns (design-accepted);
  - pre-existing stale E2Es.
