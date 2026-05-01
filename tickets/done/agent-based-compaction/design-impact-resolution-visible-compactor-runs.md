# Design Impact Resolution: Visible Normal Compactor Runs

## Status

Resolved by solution designer on 2026-04-28; pending architecture re-review.

## Trigger

Implementation paused because the reviewed hidden/internal child-run design required changes in generic run config/manager and Codex/Claude backend bootstrap/thread/session internals. The user objected that compaction is just another agent run and should not invade the mature existing agent-run framework.

## User Clarification

- A compactor agent is still just an agent.
- It should use the existing top-level normal run API, specifically `AgentRunService.createAgentRun` and normal `AgentRun` operations, instead of reaching into backend-manager internals.
- The design should not modify Codex internal components or Claude internal components just because a run is used for compaction.
- If the existing framework makes the compactor run appear on the frontend/run history, that is good: users can inspect whether compaction quality is good or bad.

## Revised Decision

Replace hidden/internal child-run semantics with visible normal compactor runs.

New execution shape:

```text
AgentCompactionSummarizer
  -> CompactionAgentRunner
  -> ServerCompactionAgentRunner
  -> AgentRunService.createAgentRun(selected compactor agent)
  -> AgentRun.postUserMessage(compaction task)
  -> collect normal run events
  -> AgentRunService.terminateAgentRun(runId)
  -> return final text to autobyteus-ts parser
```

## Consequences

### Keep

- `CompactionAgentRunner` boundary in `autobyteus-ts`.
- `AgentCompactionSummarizer` replacing direct model summarization.
- Server setting `AUTOBYTEUS_COMPACTION_AGENT_DEFINITION_ID`.
- Server Settings -> Basics compactor-agent selector.
- Selected compactor agent's normal `defaultLaunchConfig` for runtime/model/config.
- Clean-cut removal of `LLMCompactionSummarizer`, `AUTOBYTEUS_COMPACTION_MODEL_IDENTIFIER`, and active-model fallback.

### Change

- Compactor runs are visible normal runs in history.
- Parent compaction status should include `compaction_run_id` for inspection/correlation.
- `ServerCompactionAgentRunner` should use `AgentRunService`, not a custom internal-task runner.
- A compactor run should be terminated after final output/failure/timeout to avoid active-run leaks, while preserving history.

### Revert / Avoid

Implementation should revert or avoid these partial directions:

- `internalTask` fields or compaction policy in `AgentRunConfig`.
- hidden/internal run filtering or create options in `AgentRunManager`.
- `autobyteus-server-ts/src/agent-execution/internal-tasks/` for compaction.
- compaction/internal-task/tool-suppression branches in Codex bootstrap/thread config/thread manager.
- compaction/internal-task/tool-suppression branches in Claude bootstrap/session code.
- backend-specific hidden-history or ephemeral-thread behavior for compaction.

## Tool / Capability Policy

No backend-specific tool suppression in this refactor.

First implementation should use normal run launch inputs and conservative defaults:

- `autoExecuteTools=false`
- `skillAccessMode=PRELOADED_ONLY`

If the compactor asks for tool approval instead of returning final JSON, compaction should fail clearly and leave the visible run available for inspection. A future design can add explicit compactor launch-policy settings if users need auto-executed tools.

## Architecture Rationale

The existing run framework already owns cross-runtime execution, metadata, history, and frontend visibility. Reusing it keeps the design cleaner than adding hidden/internal behavior to generic runtime infrastructure. This also matches the user's preference and gives operators an inspectable audit/debug surface for compaction quality.
