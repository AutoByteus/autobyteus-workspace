# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete
- Current Status: Investigation complete; design-ready.
- Investigation Goal: Determine why Claude Agent SDK can recover from chat interrupt/Stop but not frontend row-level Terminate + follow-up, while Codex terminate/continue works.
- Scope Classification (`Small`/`Medium`/`Large`): Medium
- Scope Classification Rationale: The issue crosses frontend row actions, GraphQL terminate/restore, WebSocket reconnect/send, and Claude-provider active-turn shutdown sequencing. The implementation change is small/local, but validation requires backend + live runtime coverage.
- Scope Summary: Row-level terminate must close the active Claude SDK run without poisoning provider control flow, then `RestoreAgentRun` + follow-up `SEND_MESSAGE` must work.
- Primary Questions Resolved:
  - Which frontend action is the user's "terminate"? The history row button titled `Terminate run` and the running row `×` both converge on `agentRunStore.terminateRun()`; the history row does not select the row, while the running row also removes local context after successful termination.
  - Is this chat Stop/interrupt? No. Chat Stop sends WebSocket `STOP_GENERATION`; existing Claude interrupt E2E passes.
  - Does frontend follow-up restore inactive runs? Yes. `sendUserInputAndSubscribe()` calls GraphQL `RestoreAgentRun` before reconnect/send when `resumeConfig.isActive === false`; targeted frontend unit coverage passes.
  - Does backend terminate/restore work after an idle turn? Yes for Claude and Codex live E2E.
  - What is terminate-specific for active Claude turns? `ClaudeSessionManager.terminateRun()` bypasses the safe `ClaudeSession.interrupt()` active-turn settlement path and directly aborts/closes during pending tool approval/control flow, causing a live SDK `Operation aborted` unhandled rejection.

## Request Context

User reported on 2026-05-06 that Codex runtime can continue after terminating an agent run from the frontend row, but Claude Agent SDK cannot. The user clarified multiple times that the case is not chat Stop/interrupt and finally specified the **terminate button on the frontend row of the agent run**. The user further stated that Claude SDK interrupt works, but terminate does not.

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-stop-followup-resume-analysis`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-stop-followup-resume-analysis/tickets/in-progress/claude-sdk-stop-followup-resume-analysis`
- Current Branch: `codex/claude-sdk-stop-followup-resume-analysis`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-stop-followup-resume-analysis`
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: `git fetch origin --prune` completed successfully on 2026-05-06 before worktree creation.
- Task Branch: `codex/claude-sdk-stop-followup-resume-analysis`
- Expected Base Branch: `origin/personal`
- Expected Finalization Target: `personal`
- Bootstrap Blockers: None.
- Notes For Downstream Agents: Use this dedicated worktree; do not work from `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo` shared checkout.

## Source Log

| Date | Source Type | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-05-06 | Command | `git fetch origin --prune` then dedicated `git worktree add ... origin/personal` | Bootstrap current branch safely | Worktree created at `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-stop-followup-resume-analysis`. | No |
| 2026-05-06 | Code | `autobyteus-web/components/workspace/history/WorkspaceHistoryWorkspaceSection.vue` | Locate row terminate button | Active history rows render `button[title="Terminate run"]` and call `actions.onTerminateRun(run.runId)` with `@click.stop`. | No |
| 2026-05-06 | Code | `autobyteus-web/components/workspace/history/WorkspaceAgentRunsTreePanel.vue`; `autobyteus-web/composables/useWorkspaceHistoryMutations.ts` | Trace frontend row terminate | `onTerminateRun` delegates to `agentRunStore.terminateRun(runId)` and does not select the row. | No |
| 2026-05-06 | Code | `autobyteus-web/components/workspace/running/RunningRunRow.vue`; `RunningAgentsPanel.vue` | Check running row `×` button | Running row emits delete; panel calls `agentRunStore.closeAgent(runId, { terminate: true })`; that delegates to `terminateRun` then removes local context. | No |
| 2026-05-06 | Code | `autobyteus-web/stores/agentRunStore.ts` | Trace frontend terminate/restore/send | `terminateRun` calls GraphQL `TerminateAgentRun`, disconnects local stream, marks history inactive. `sendUserInputAndSubscribe` restores inactive persisted runs with GraphQL `RestoreAgentRun`, locks config, marks active, reconnects stream, then sends. | No frontend design change indicated. |
| 2026-05-06 | Code | `autobyteus-web/services/runOpen/agentRunOpenCoordinator.ts` | Trace reopening inactive historical run | Inactive run open hydrates a projection context with `ShutdownComplete`; active run open connects stream. | No |
| 2026-05-06 | Test | `autobyteus-web/stores/__tests__/agentRunStore.spec.ts` | Check frontend coverage | Existing test `sendUserInputAndSubscribe should restore persisted inactive runs before sending` covers restore-before-send. | Run targeted tests. |
| 2026-05-06 | Test | `autobyteus-web/components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.spec.ts` | Check frontend row terminate coverage | Existing test `terminates active run from row action without selecting the row` covers row action delegation. | Run targeted tests. |
| 2026-05-06 | Code | `autobyteus-server-ts/src/api/graphql/types/agent-run.ts`; `src/agent-execution/services/agent-run-service.ts` | Trace backend GraphQL terminate/restore | `TerminateAgentRun` delegates to `AgentRunService.terminateAgentRun`; `RestoreAgentRun` reconstructs runtime context from metadata. Claude restore uses `sessionId: metadata.platformAgentRunId`; Codex restore uses `threadId`. | No GraphQL API shape change indicated. |
| 2026-05-06 | Code | `autobyteus-server-ts/src/services/agent-streaming/agent-stream-handler.ts` | Trace WebSocket follow-up send | `SEND_MESSAGE` resolves/restores active run if needed, binds session, posts user message, then records run activity. `STOP_GENERATION` uses `activeRun.interrupt(null)` and is a separate path. | No WebSocket API change indicated. |
| 2026-05-06 | Code | `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session.ts` | Compare interrupt sequencing | `ClaudeSession.interrupt()` clears pending approvals, flushes pending approval responses, aborts, closes active query, awaits settled task, emits `TURN_INTERRUPTED`; follow-up can resume by provider session id or start a new provider session if no provider id was adopted. | Reuse this invariant for terminate. |
| 2026-05-06 | Code | `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session-manager.ts` | Inspect terminate sequencing | `terminateRun()` currently aborts first, clears pending approvals, waits up to 2s, emits `SESSION_TERMINATED`, then `closeRunSession()` cleanup aborts/clears/closes again. This duplicates and weakens interrupt sequencing. | Fix needed. |
| 2026-05-06 | Code | `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session-cleanup.ts` | Inspect cleanup | Cleanup aborts active controller, clears pending approvals, waits one microtask, closes active query. It is resource cleanup, not safe active-turn settlement. | Keep as final cleanup, not primary active-turn termination. |
| 2026-05-06 | Test | `autobyteus-server-ts/tests/e2e/runtime/agent-runtime-graphql.e2e.test.ts` | Check existing runtime E2E | Existing live-gated test `creates a run, restores it, and continues streaming on the same websocket` covers terminate/restore after an idle turn for Codex/Claude. Existing projection test covers history after terminate/restore/continue. | Run targeted live tests. |
| 2026-05-06 | Test | `autobyteus-server-ts/tests/e2e/runtime/claude-agent-websocket-interrupt-resume.e2e.test.ts` | Check interrupt coverage | Existing tests send `STOP_GENERATION`, not row terminate. Live test proves real Claude SDK preserves context after interrupting an incomplete turn. | No change except regression run after fix. |
| 2026-05-06 | Command | `pnpm --dir autobyteus-server-ts exec prisma generate` | Repair local generated Prisma client before E2E | Required after initial test failed with missing `.prisma/client/default`. | No |
| 2026-05-06 | Command | `RUN_CLAUDE_E2E=1 pnpm --dir autobyteus-server-ts exec vitest run tests/e2e/runtime/agent-runtime-graphql.e2e.test.ts -t "creates a run, restores it, and continues streaming on the same websocket" --reporter=verbose` | Verify Claude terminate/restore after idle turn | Passed: 1 test passed, 14 skipped. | Keep as regression. |
| 2026-05-06 | Command | `RUN_CLAUDE_E2E=1 CLAUDE_FLOW_TEST_TIMEOUT_MS=180000 CLAUDE_LIVE_INTERRUPT_STEP_TIMEOUT_MS=90000 pnpm --dir autobyteus-server-ts exec vitest run tests/e2e/runtime/claude-agent-websocket-interrupt-resume.e2e.test.ts -t "uses the real Claude SDK"` | Verify user-stated interrupt works | Passed earlier in this investigation: live Claude `STOP_GENERATION` interrupt/follow-up test passed. | Keep as regression. |
| 2026-05-06 | Probe | Temporary inserted E2E recorded in `probes/claude-active-terminate-reconnect-live-probe.md` | Reproduce active row terminate shape | Follow-up after restore/reconnect streamed successfully, but Vitest failed due to unhandled SDK `Error: Operation aborted`. This isolates active terminate cleanup sequencing as the defect. | Add durable regression after fix. |
| 2026-05-06 | Command | `pnpm --dir autobyteus-server-ts exec vitest run tests/unit/agent-execution/backends/claude/session/claude-session.test.ts tests/unit/agent-execution/backends/claude/session/claude-session-manager.test.ts --reporter=verbose` | Check current unit baseline | Passed: 2 files passed, 17 tests passed. Existing unit coverage does not yet cover active terminate using safe interrupt settlement. | Add targeted active terminate unit regression. |
| 2026-05-06 | Command | `pnpm --dir autobyteus-web exec nuxi prepare` | Prepare Nuxt types for frontend tests | Generated `.nuxt` types. | No |
| 2026-05-06 | Command | `pnpm --dir autobyteus-web exec vitest run stores/__tests__/agentRunStore.spec.ts services/runOpen/__tests__/agentRunOpenCoordinator.spec.ts components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.spec.ts -t "restore|terminate|terminates active run|sendUserInputAndSubscribe should restore persisted inactive runs" --reporter=verbose` | Verify frontend terminate/restore tests | Passed: 6 tests passed, 41 skipped, 1 file skipped. Confirms row action and restore-before-send are covered. | No frontend fix indicated. |
| 2026-05-06 | Command | `RUN_CODEX_E2E=1 pnpm --dir autobyteus-server-ts exec vitest run tests/e2e/runtime/agent-runtime-graphql.e2e.test.ts -t "creates a run, restores it, and continues streaming on the same websocket" --reporter=verbose` | Check Codex existing terminate/restore/continue | Passed: 1 test passed, 14 skipped. | Keep as regression. |

## Current Behavior / Current Flow

### Frontend row terminate flow

History row:

`WorkspaceHistoryWorkspaceSection.vue button[title="Terminate run"] -> actions.onTerminateRun(runId) -> useWorkspaceHistoryMutations.onTerminateRun(runId) -> agentRunStore.terminateRun(runId) -> GraphQL TerminateAgentRun -> local stream teardown -> mark history inactive`

Running row:

`RunningRunRow.vue × -> RunningAgentsPanel.deleteAgentRun(runId) -> agentRunStore.closeAgent(runId,{terminate:true}) -> agentRunStore.terminateRun(runId) -> removeRun(runId)`

Follow-up from an inactive historical run:

`activeContextStore.send() -> agentRunStore.sendUserInputAndSubscribe() -> runHistoryStore.getResumeConfig(runId) -> if inactive GraphQL RestoreAgentRun -> lockConfig/mark active -> ensureAgentStreamConnected(runId) -> WebSocket SEND_MESSAGE`

### Backend GraphQL/runtime flow

`TerminateAgentRun -> AgentRunService.terminateAgentRun -> activeRun.terminate() -> ClaudeAgentRunBackend.terminate() -> ClaudeSession.terminate() -> ClaudeSessionManager.terminateRun(runId)`

`RestoreAgentRun -> AgentRunService.restoreAgentRun -> AgentRunManager.restoreAgentRun -> ClaudeAgentRunBackendFactory.restoreBackend -> ClaudeSessionManager.restoreRunSession(runContext, platformAgentRunId)`

### Claude interrupt flow that works

`STOP_GENERATION -> AgentStreamHandler.handleStopGeneration -> activeRun.interrupt(null) -> ClaudeAgentRunBackend.interrupt() -> ClaudeSession.interrupt()`

`ClaudeSession.interrupt()` performs the safe order:

1. Mark active turn interrupted.
2. Clear pending tool approvals with denial.
3. Flush pending tool approval responses with a microtask and `setImmediate`.
4. Abort active controller.
5. Close active query.
6. Await the active turn's settled task.
7. Emit `TURN_INTERRUPTED`.

### Claude terminate flow that fails under active tool approval

`ClaudeSessionManager.terminateRun()` currently performs a separate order:

1. If `state.activeTurnId`, abort active controller immediately.
2. Clear pending approvals.
3. Poll/wait up to 2 seconds for `activeTurnId` to clear.
4. Emit `SESSION_TERMINATED`.
5. `closeRunSession()` cleanup clears listeners, aborts/clears again, waits one microtask, and closes the active query.

The live probe shows this order can cause the Claude SDK to reject with unhandled `Operation aborted` while a tool approval/control response is still settling. This explains why interrupt works but terminate is unstable.

## Design Health Assessment Evidence

- Change posture: Bug Fix
- Candidate root cause classification: Duplicated Policy Or Coordination
- Refactor posture evidence summary: The active-turn shutdown invariant exists in `ClaudeSession.interrupt()` but terminate duplicates a different cleanup sequence in `ClaudeSessionManager.terminateRun()` and `ClaudeSessionCleanup`. A small local refactor should make terminate reuse the interrupt-owned active-turn settlement path.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| `ClaudeSession.interrupt()` | Safe pending-tool-approval flush exists and live interrupt E2E passes. | Active-turn settlement has a correct owner/invariant already. | Reuse for terminate. |
| `ClaudeSessionManager.terminateRun()` | Direct abort-first terminate order bypasses safe interrupt settlement. | Duplicated lifecycle policy causes provider-specific failure. | Replace direct active-turn abort/wait with interrupt settlement. |
| Live active terminate probe | Restore/reconnect/follow-up streamed, but unhandled SDK `Operation aborted` failed the test run. | The restore/send path is viable; cleanup sequencing is the defect. | Add regression that fails on unhandled rejection before fix and passes after. |
| Frontend unit tests | Row terminate delegation and restore-before-send pass. | Frontend is not the primary root. | No frontend change unless implementation finds UI-specific reproduction beyond current evidence. |

## Executable Validation Results

| Command | Result | Notes |
| --- | --- | --- |
| `pnpm --dir autobyteus-server-ts exec prisma generate` | Passed | Required before E2E due missing generated Prisma client. |
| `RUN_CLAUDE_E2E=1 ... agent-runtime-graphql.e2e.test.ts -t "creates a run, restores it, and continues streaming on the same websocket"` | Passed | Claude idle terminate/restore/continue already works. |
| `RUN_CLAUDE_E2E=1 ... claude-agent-websocket-interrupt-resume.e2e.test.ts -t "uses the real Claude SDK"` | Passed | Confirms chat Stop/interrupt works, as user stated. |
| `pnpm --dir autobyteus-server-ts exec vitest run tests/unit/agent-execution/backends/claude/session/claude-session.test.ts tests/unit/agent-execution/backends/claude/session/claude-session-manager.test.ts --reporter=verbose` | Passed | 2 files passed, 17 tests passed; baseline lacks active terminate regression. |
| Temporary active terminate probe | Failed due unhandled rejection | Follow-up streamed, but SDK `Operation aborted` unhandled rejection proves active terminate cleanup bug. |
| `pnpm --dir autobyteus-web exec nuxi prepare` | Passed | Generated Nuxt test types. |
| Frontend targeted restore/terminate Vitest command | Passed | 6 passed; row terminate and restore-before-send covered. |
| `RUN_CODEX_E2E=1 ... agent-runtime-graphql.e2e.test.ts -t "creates a run, restores it, and continues streaming on the same websocket"` | Passed | Confirms existing Codex terminate/restore/continue. |

## Open Questions / Residual Risk

- The live probe waited for a Claude tool approval request before terminate. If a user terminates immediately before any provider session id is emitted, follow-up should still be accepted as a new provider session under the same AutoByteus run; preserving provider context is only possible after Claude has emitted a resumable session id.
- The implementation should decide whether to add the active terminate probe as a live-gated E2E in the existing runtime GraphQL suite or as a focused Claude-specific E2E to avoid slowing normal runs.
