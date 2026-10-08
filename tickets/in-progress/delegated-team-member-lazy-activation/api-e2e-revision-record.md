# API/E2E Revision Record

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Implementation Engineer, Implementation Complete, round 1 | SR-002, IR-001 | N/A | Fail / 80% |

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
