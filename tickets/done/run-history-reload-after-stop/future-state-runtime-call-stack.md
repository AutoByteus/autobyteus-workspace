# Future-State Runtime Call Stack

## UC-001 New run persists run-scoped memory and reloads after restart

1. `autobyteus-web` sends first message via `ContinueRun` mutation.
2. `RunContinuationService.createAndContinueNewRun()` creates runtime session and writes manifest/index.
3. `AgentRunManager.buildAgentConfig()` returns config without explicit `memoryDir` for single-agent runtime.
4. `AgentFactory.createRuntimeWithId()` resolves base memory dir from env and uses `agentRootSubdir='agents'`.
5. `FileMemoryStore` writes run traces to `memory/agents/<runId>/raw_traces*.jsonl`; snapshot writes to `memory/agents/<runId>/working_context_snapshot.json`.
6. User stops run and closes app.
7. App restarts; run tree row comes from run_history_index.
8. User selects run; `getRunProjection` -> `LocalMemoryRunProjectionProvider` reads run-scoped files and returns conversation.
9. Frontend hydrates projection and displays history.

## UC-002 Team member behavior unaffected

1. Team member configuration still passes explicit member memory dir.
2. Agent factory continues explicit-dir path behavior for team member runs.
3. Team member projection path remains unchanged and test coverage stays green.
