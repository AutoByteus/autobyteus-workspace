# API/E2E Test Review Report — claude-sdk-streaming-input-session

## Review Meta

- Review Round: 1
- Trigger: API/E2E `Pass`, API-REV-002 (round 2), from `/api_e2e_engineer`. HEAD `d3e227389` (IR-004); the durable test changes are uncommitted.
- Requirements Doc Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-streaming-input-session/tickets/in-progress/claude-sdk-streaming-input-session/requirements-doc.md` (SR-011 baseline)
- Investigation Notes Reviewed As Context: `…/investigation-notes.md`
- Solution Revision Record Reviewed As Context: `…/solution-revision-record.md` (through SR-012)
- Design Spec Reviewed As Context: `…/design-spec.md` (SR-012)
- Supplemental Task Artifacts Reviewed As Context: `probe-evidence/` (evidence only); `api-e2e-evidence/` (execution evidence only)
- Architecture Review Revision Record Reviewed As Context: `…/architecture-review-revision-record.md` (ARCH-REV-005)
- Implementation Revision Record Reviewed As Context: `…/implementation-revision-record.md` (IR-004)
- Original Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-streaming-input-session/tickets/in-progress/claude-sdk-streaming-input-session/code-review-report.md`
- Code Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-streaming-input-session/tickets/in-progress/claude-sdk-streaming-input-session/code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-005`
- Coverage Investigation: `…/api-e2e-coverage-investigation.md` (Round 2 Update)
- Execution Coverage Report: `…/api-e2e-execution-coverage-report.md` (authoritative round 2)
- API/E2E Revision Record Reviewed As Context: `…/api-e2e-revision-record.md` (API-REV-001, API-REV-002)
- Delivery Revision Record Reviewed As Context: N/A
- API/E2E Result: `Pass`
- Final Validation Confidence: 94.6%. The only unmet item is live api-key auth mode (no key available); it is unit-covered and recorded as a residual.
- Prior unresolved test-review findings rechecked: None (first test review)
- Supported Product Scenario Basis Confirmed: `Yes`. Every case exercises an approved AC (AC-001..AC-016) or RSK-007/REQ-010 through production paths.

## Changed Durable Test Scope

All paths are under `autobyteus-server-ts/`.

| Durable Test Path | Change | Related Scenario / Requirement | Coherent Test Responsibility | Notes |
| --- | --- | --- | --- | --- |
| `tests/e2e/helpers/claude-live-agent-harness.ts` | Added | Shared by the AC suites | Live stack: real AgentRun, Claude backend and session, SDK/CLI, and the agent websocket. Also restore, stream waits and pid lookup | Replaces the harness previously inlined in the background-task E2E |
| `tests/e2e/runtime/claude-agent-streaming-session-lifecycle.e2e.test.ts` | Added | AC-001/006, 003, 005, 007, 008, 009, 012/013; RSK-007 | Streaming-session lifecycle, run live on both CLIs; gated by `RUN_CLAUDE_E2E` | 485 lines. One coherent surface, one `it.each` per AC |
| `tests/e2e/runtime/team-busy-member-mid-turn-delivery.e2e.test.ts` | Added | AC-004, plus AC-014 via the teammate path | GraphQL team runtime: a teammate `send_message_to` reaches a busy Claude or Codex member inside its running turn | Gated by `RUN_CLAUDE_E2E` / `RUN_CODEX_E2E` |
| `tests/e2e/runtime/claude-agent-websocket-interrupt-resume.e2e.test.ts` | Updated | AC-016 | Deterministic fake-CLI race: an append reaches the session after T settles, is requeued, and starts the next turn | The harness now returns `agentRun` |
| `tests/integration/agent-execution/codex-agent-run-backend-factory.integration.test.ts` | Updated | AC-014 | Live Codex `turn/steer` into the same turn id through a real AgentRun | — |
| `tests/e2e/runtime/claude-agent-background-task.e2e.test.ts` | Updated | AC-002 | Moved onto the shared harness (−177 lines of duplicated setup), with no behavior change | — |

- No durable test file changed: `No`
- No test file removed.

## Proportional Test-Code Checks

| Check | Result | Evidence / Notes |
| --- | --- | --- |
| Scenario grouping and names make intent clear | Pass | Every case name states the behavior and AC ID; `it.each` over CLI candidates labels each run `[path-claude]` or `[sdk-bundled-claude]` |
| Assertions prove approved requirements instead of incidental implementation details | Pass | Examples: pid identity and `--resume` argv for AC-001/006/007/009; per-input lifecycle facts resolving exactly once; one TURN_STARTED per busy-member turn with receipt before completion (AC-004); dispatch-kind sequence `start_turn, append, start_turn` plus one terminal not equal to T (AC-016); RSK-007 checks the restart mark and flag and `accounting == mainLoop` on restart turns, and `mainLoop ≤ accounting ≤ cumulative` elsewhere, with no regressed flag and one observation per turn. Model-output checks use tolerant codeword/marker assertions |
| Fixtures, setup, helpers, and data builders reuse meaningful repetition | Pass | The shared live harness removes duplicated setup; `sendAndAwaitTurn`, `killCliDuringForegroundCommand` and `longForegroundCommand` are local helpers with clear purpose |
| Test isolation and determinism are appropriate for the exercised boundary | Pass | Unique run ids, workspaces and markers; cleanup in `afterEach` (harness close, workspace removal, GraphQL terminate/delete); env stubbing restored. Live timing is guarded by condition waits (e.g. the command must be running before a Stop or kill), not fixed sleeps. The one fixed 10 s wait in the team test is a deliberate negative window |
| Large files remain coherent and navigable rather than mixing unrelated scenarios | Pass | The lifecycle file (485 lines) covers one surface. The team file covers one scenario for two worker runtimes |
| No stale, duplicated, disabled-without-reason, or compatibility-only tests remain | Pass | The background-task duplication is removed. The team test uses the current GraphQL schema (no `refType`) |
| Added, updated, and removed coverage agrees with the coverage investigation and execution evidence | Pass | Matches the ledger (C04–C19, C08-R) and the round 1/2 logs. The round-1 controls show AC-014, AC-004 and AC-016 fail on the base claim rule or without the undelivered flag, and the round-1 RSK-007 run (c08) is the failing control for the new assertion |
| Test callers and fixtures exercise an independently established supported scenario rather than proving one by themselves | Pass | The SIGKILL simulates the approved unexpected-exit event (REQ-008). The AC-016 `submitInput` wrapper only forces the approved end-of-turn race ordering (CR-SCN-001) through production AgentRun and session code |

## Findings

None blocking.

Non-blocking notes (no action required for delivery):
- `team-busy-member-mid-turn-delivery.e2e.test.ts`: when `RUN_CODEX_E2E` is not set, the Codex worker case `return`s early after a `console.info`, so it reports as passed rather than skipped. A future cleanup could filter the cases or use `it.skipIf` so skipped live coverage is visible in runner output. The execution ledger records the real live runs, so requirement proof for this ticket is unaffected.
- `claude-agent-streaming-session-lifecycle.e2e.test.ts` AC-001/006: the loop counter `second` shadows the outer `const second`. It is block-scoped and correct, only mildly confusing.

## Latest Authoritative Result

- Result: `Pass`
- Changed durable test paths reviewed: the 6 paths listed above (3 added, 3 updated, 0 removed)
- Unresolved finding IDs: None
- Recommended Recipient: `/delivery_engineer`
- Notes:
  - The durable test changes are still uncommitted in the worktree, so delivery must include them.
  - Residuals from API-REV-002: api-key auth mode is not live-validated; the restart turn counts main-loop usage only (design-accepted); pre-existing stale E2Es (`refType`, Codex factory statusHint/gpt-5.4) are out of scope; OBS-1 (the CLI blocks `sleep N; …` foreground chains).
