# API/E2E Test Review Report

## Review Meta

- Review Round: `1`
- Trigger: API/E2E Pass (API-REV-001); one durable test added in commit `5fa0a9c597`
- Requirements Doc Reviewed As Context: `requirements-doc.md` (SR-002)
- Investigation Notes Reviewed As Context: through the design spec (no change since CRR-001)
- Solution Revision Record Reviewed As Context: `solution-revision-record.md` (SR-002)
- Design Spec Reviewed As Context: `design-spec.md` (SR-002)
- Supplemental Task Artifacts Reviewed As Context: N/A for this test review
- Architecture Review Revision Record Reviewed As Context: ARCH-REV-002 (unchanged)
- Implementation Revision Record Reviewed As Context: IR-001 (source unchanged since `f4490d258a`; `git diff --stat f4490d258a..HEAD -- autobyteus-server-ts` shows only the new test)
- Original Code Review Report: `code-review-report.md` (CRR-001, Pass)
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-002`
- Coverage Investigation: `api-e2e-coverage-investigation.md`
- Execution Coverage Report: `api-e2e-execution-coverage-report.md`
- API/E2E Revision Record Reviewed As Context: `api-e2e-revision-record.md` (API-REV-001)
- Delivery Revision Record Reviewed As Context: N/A
- API/E2E Result: Pass
- Final Validation Confidence: 96%
- Prior unresolved test-review findings rechecked: None (first test review)
- Project testing guideline(s) applied: `TESTING.md` (worktree root, recorded in the coverage investigation). It applies here through:
  - the gated live suites (`RUN_*`);
  - the clean environment with real `HOME`/`USER`/`LOGNAME` for a signed-in CLI;
  - "skip ≠ pass";
  - suite details belong in the test file's header.

  No conflicts with this skill.
- Supported Product Scenario Basis Confirmed: `Yes` (SCN-001, Supported Normal Scenario; user traces and the AC-007 isolated-instance run)

## Changed Durable Test Scope

| Durable Test Path | Change | Related Scenario / Requirement | Coherent Test Responsibility | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/runtime/claude-self-started-turn-lifecycle.e2e.test.ts` | Added | SCN-001; AC-001, AC-003, REQ-004 normal case | A turn Claude starts on its own after background tasks keeps its text (chat and memory), status `running`, and no lifecycle notice or rejection log, under real CLI timing | Gated `RUN_CLAUDE_E2E=1`; one `it.each` over CLI × {idle, loaded}; 205 lines |

- No durable test file changed: `No`

## Proportional Test-Code Checks

| Check | Result | Evidence / Notes |
| --- | --- | --- |
| Scenario grouping and names make intent clear | Pass | One describe, one parametrised case named for the outcome; the header gives purpose, stack, gate, command and why the loaded variant exists (as TESTING.md asks). |
| Assertions prove approved requirements instead of incidental implementation details | Pass | Assertions, through observable surfaces (WebSocket messages, status snapshot, run memory, server log):<br>• 0 `AGENT_SEGMENT_LIFECYCLE_INVALID` and the self-started turn's text contains the nonce and marker (AC-001);<br>• `running` at every text delivery of that turn, `idle` after (AC-003);<br>• text in run memory through the production recorder (AC-001);<br>• 0 `[AgentSegmentLifecycleRejected*]` lines (REQ-004 normal case).<br>The setup precondition (2 background tasks) has its own message, so a provider-setup failure isn't mistaken for a product failure. |
| Fixtures, setup, helpers, and data builders reuse meaningful repetition | Pass | Reuses `claude-live-agent-harness.ts`, `claude-cli-executable-candidates.ts` and `websocket-command-helpers.ts`; no local copy of the harness. |
| Test isolation and determinism are appropriate for the exercised boundary | Pass | Its own temp workspace and memory root, cleaned up in reverse order; a random run id and nonce; spies restored in `afterEach`. Because it calls a real model, the turn shape is the CLI's choice. That suits a gated live layer, and the scripted unit test `claude-provider-turn-race.test.ts` forces the same burst every time. |
| Large files remain coherent and navigable rather than mixing unrelated scenarios | Pass | One scenario. |
| No stale, duplicated, disabled-without-reason, or compatibility-only tests remain | Pass | The skip comes only from the documented gate or no installed CLI. |
| Added, updated, and removed coverage agrees with the coverage investigation and execution evidence | Pass | API-05 (head): 4/4 pass, each shape line shows `lifecycleNotices: 0`, `rejectionLogLines: 0`. API-06c (base): the 2 loaded variants fail and the 2 idle variants pass, as the report states. |
| Test callers and fixtures exercise an independently established supported scenario rather than proving one by themselves | Pass | SCN-001 is established independently (user traces; the AC-007 isolated instance reproduced the shape, with T2 starting 8 ms after T1). The test reproduces it; it doesn't define it. |
| Each test enters through its scenario's real trigger and follows the real actor's or event's steps, without a setup real use does not produce | Pass | Enters through a WebSocket send-message command; real Claude CLI and background tasks; real frames. On the load emulation, see the judgement below. |

### Judgement on the "loaded" variant (requested)

The loaded variant wraps the default pipeline's `process` with a 25 ms async delay per batch. I find this **acceptable in a durable test**:

- **It only slows processing; the order and content of events are unchanged.** It doesn't inject, drop or reorder events, and it doesn't touch lifecycle state. It reproduces one real condition: the per-run dispatch queue lagging the runtime, as slow processing or I/O under load does. That lag is the precondition of SCN-001 (REQ-001's "before AutoByteus has processed the queue"), and the user's reported run hit it on a real machine.
- **It doesn't replace the thing under test.** The ledger, both states, the transformer, the backend and the CLI all stay real; the spy calls through to the real `process`.
- **The test proves it matters:** the loaded variant fails on base (8 notices, none of T2's text) and passes on the fix, while the idle variant alone passes on both. Without it, the live test couldn't tell base from the fix.
- **Scope and cleanup are sound:** the spy applies only inside its case and is restored in `afterEach`. The header documents why it exists.

Non-blocking note (no action required): a pass of one case doesn't guarantee the race shape happened. In API-05, path-claude/loaded ran as one provider turn. The assertions still hold as requirements, and the execution report records the shape for each run. Asserting the provider's turn shape would make the suite flaky on a choice the CLI makes, so the scripted unit test is the right deterministic proof.

## Findings

None.

## Follow-ups

| Follow-up ID | What is wrong, where | Evidence | Why it is outside this ticket | Suggested Task description |
| --- | --- | --- | --- | --- |
| CR-FU-001 | The existing live Claude E2E helper no longer matches current types. `tests/e2e/helpers/claude-live-agent-harness.ts`:<br>• l.78: the `agentDefinition` literal is missing required `AgentDefinition` fields;<br>• l.129: `AgentStatusPayload` has no `can_interrupt` property, and `AgentRunStatusProjection` has no `canInterrupt`.<br>So the helper's run projection relies on a field that no longer exists (`canInterrupt` is always `false`). | `evidence/API-05-new-test-typecheck.log` (temporary tsconfig extending `tsconfig.build.json`; 3 errors, all in the helper). Vitest doesn't typecheck, so the live suites still run. `tsconfig.build.json` excludes `tests`, so no required check catches it. | Present before this ticket, and this change doesn't touch the helper. The new test runs correctly and doesn't depend on `canInterrupt`. | "Align `autobyteus-server-ts/tests/e2e/helpers/claude-live-agent-harness.ts` with the current `AgentDefinition`, `AgentStatusPayload` and `AgentRunStatusProjection` types (TS2740 l.78; TS2353/TS2339 l.129: `can_interrupt`/`canInterrupt` removed), and consider typechecking `tests/e2e` helpers so contract drift is caught." |

- Sent to: `/project_task_manager` (the "Requested by" agent in the requirements doc), one message from this review.

## Latest Authoritative Result

- Result: `Pass`
- Changed durable test paths reviewed: `autobyteus-server-ts/tests/e2e/runtime/claude-self-started-turn-lifecycle.e2e.test.ts`
- Unresolved finding IDs: None
- Recommended Recipient: `/software_engineering_team/delivery_engineer`
- Notes:
  - I didn't rerun anything; the diff and the API-05/API-06c logs were enough.
  - `code-review-report.md`, `code-review-revision-record.md` and this report are in the ticket folder, uncommitted, for Delivery to commit with the ticket documents.
