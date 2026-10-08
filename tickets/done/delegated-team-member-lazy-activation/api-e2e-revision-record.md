# API/E2E Revision Record

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Implementation Engineer, Implementation Complete, round 1 | SR-002, IR-001 | N/A | Fail / 80% |
| API-REV-002 | Code Reviewer CRR-003 Pass (IR-003), round 2 | SR-003, SR-004, ARCH-REV-002, IR-003, CRR-003 | Fail / 80% | Pass / 95% |

## Revision Entries

### API-REV-001 — Baseline: real-boundary validation of delegated Team lazy activation

- Triggering role, report path, and round: `/software_engineering_team/implementation_engineer`, `implementation-handoff.md`, round 1
- Triggering finding or case IDs: N/A (initial)
- Related revision IDs: SR-002, IR-001
- Why recorded: first completed validation result
- Coverage decisions or durable test paths changed:
  - Added `autobyteus-server-ts/tests/e2e/projects/delegated-team-lazy-member-activation.e2e.test.ts`.
  - Updated `autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs` (`AGY_FAKE_EXTRA_MODELS`) and `TESTING.md`.
  - Baseline fixes (TESTING rule 9; identical failures on base; stale doubles/assertions): `configured-scope-readiness.test.ts`, `agent-team-run-manager.integration.test.ts`, `team-agent-tools-mcp-lifecycle.integration.test.ts`, `team-conversation-target-websocket.integration.test.ts`, `controlled-org-publication-http.e2e.test.ts`.
- Cases added: R-01..R-04, DTL-001..DTL-008, DTL-B01, DTL-P01/P02 (temporary), REG-E2E.
- Commands, environment, fixture, or broader-validation delta: gated scripted-AGY server E2E with idle grace 60 s; base comparison worktree.

#### Prior Failure Resolution

None.

- Canonical artifacts updated: coverage investigation, execution coverage report, test-case ledger.
- Prior result and confidence: N/A
- Current result and confidence: `Fail`, 80%
- New or remaining failure IDs:
  - DTL-003 (AC-004 / REQ-005 member branch): a member that cannot start makes the sender's teammate `send_message_to` throw `MCP error -32603: Internal error`, and the member stays `offline` with no `error` status.
  - Cause: `ConfiguredAgentExecutionHandle.reserveInput` has no start-failure handling.
- Recommended owner: Implementation Engineer (`Local Fix`, preliminary), subject to failure-origin review.
- Remaining risks, blocked evidence, or untested scope:
  - AC-007 is user verification.
  - A whole-process restart and a real-provider (Claude/Codex) delegated Team were not run this round.
  - `task-copy-idle-lifetime` showed an environmental timing/discovery flake in the serial batch and passed alone.

### API-REV-002 — Rerun on IR-003: DTL-003 resolved; real-Claude, render and cold-restart evidence

- Trigger: `/software_engineering_team/code_reviewer` CRR-003 Pass on IR-003 (`b3b28d47b`), round 2.
  - Round 2 had started on IR-002 (`d30c11204`). Solution Designer then put validation on HOLD because SR-003 supersedes IR-002.
  - The IR-002 checkpoints are in the ledger and are not a result.
- Triggering finding or case IDs: DTL-003 (API-REV-001).
- Related revision IDs: SR-003, SR-004, ARCH-REV-002, IR-003, CRR-003.
- Coverage decisions or durable test paths changed:
  - `delegated-team-lazy-member-activation.e2e.test.ts`:
    - DTL-003 asserts the new contract plus exactly one error card;
    - gated DTL-009 (real Claude) added;
    - helpers hardened (tree-file-only walk, grace-aware status check for expected-`idle` members, result JSON in messages, real HOME only for the live-Claude case).
  - `autobyteus-web/tests/e2e/task-closure-tree-probe.mjs`: rendered lazy-member status check in BR-008..010.
  - `TESTING.md` updated.
- Cases added, changed, removed, or rechecked:
  - DTL-003 rechecked first.
  - DTL-001..008 run 6 times; DTL-009 added; BR-008..011 run.
  - REG-E2E, unit and integration rerun.
- Commands, environment, fixture, or broader-validation delta:
  - Server dist built from the current worktree for the browser probe.
  - Live Claude run under the real HOME.
  - Host shared with other worktrees' E2E batches.

#### Prior Failure Resolution

| Prior Case / Failure Reference | Previous Classification | Current Resolution | Evidence |
| --- | --- | --- | --- |
| DTL-003: teammate delivery to a member that cannot start threw `MCP -32603`; member stayed `offline` | `Local Fix` (preliminary). Failure-origin review reclassified it as `Design Impact` (CR-FO-001/002/003), leading to SR-003/SR-004 | Resolved by IR-003 (`startForInput` shared by `reserveInput`/`postMessage`). Observed: `AGENT_RUN_ACTIVATION_FAILED` / `AGY_MODEL_UNAVAILABLE: dtl-retiring-model`; writer `error`; exactly 1 error card; others unaffected | `r2-ir3-dtl-*`, `r2-final-*` receipts (`org.memberStartFailure`) |

- Canonical artifacts updated: coverage investigation (round-2 delta), execution coverage report, ledger.
- Prior result and confidence: Fail, 80%
- Current result and confidence: Pass, 95%
- New or remaining failure IDs: None.
- Recommended owner: Code Reviewer (proportional test-code review, High route).
- Remaining risks:
  - AC-007 is user verification.
  - PREM-001 race is unit-only.
  - Codex runtime not run.
  - One uncaptured `accepted:false` on IR-002 (superseded) has not recurred.
