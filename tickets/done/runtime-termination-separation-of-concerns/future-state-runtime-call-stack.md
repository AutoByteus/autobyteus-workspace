# Future-State Runtime Call Stack

- Ticket: `runtime-termination-separation-of-concerns`
- Scope: `Medium`
- Last Updated: `2026-03-10`

## Inputs

- Requirements: `tickets/done/runtime-termination-separation-of-concerns/requirements.md` (status `Design-ready`)
- Design basis: `tickets/done/runtime-termination-separation-of-concerns/proposed-design.md`

## Runtime Call Stack Use Cases

### `UC-001` Native `autobyteus` Agent Termination Routing

1. GraphQL client calls `terminateAgentRun(id)`.
2. `AgentRunResolver.terminateAgentRun(...)` delegates to `AgentRunTerminationService.terminateAgentRun(runId)`.
3. `AgentRunTerminationService` reads `runtimeCompositionService.getRunSession(runId)`.
4. The session is either absent or has `runtimeKind === "autobyteus"`.
5. `AgentRunTerminationService` calls `agentRunManager.terminateAgentRun(runId)`.
6. `AgentRunManager` delegates to `AgentFactory.removeAgent(runId)`.
7. `AgentFactory.removeAgent(...)` deletes the active agent entry and calls `agent.stop(...)`.
8. Control returns to `AgentRunTerminationService`.
9. If native termination succeeded:
   - `runtimeCompositionService.removeRunSession(runId)` executes,
   - `runHistoryService.onRunTerminated(runId)` marks the run `IDLE`.
10. `AgentRunTerminationService` returns `{ success: true, route: "native", runtimeKind: "autobyteus" }`.
11. GraphQL resolver maps the result to `TerminateAgentRunResult`.

### `UC-002` Non-Native Runtime Agent Termination Routing

1. GraphQL client calls `terminateAgentRun(id)`.
2. `AgentRunResolver.terminateAgentRun(...)` delegates to `AgentRunTerminationService.terminateAgentRun(runId)`.
3. `AgentRunTerminationService` reads `runtimeCompositionService.getRunSession(runId)`.
4. The session exists and `runtimeKind !== "autobyteus"` (for example `codex_app_server` or `claude_agent_sdk`).
5. `AgentRunTerminationService` calls:
   - `runtimeCommandIngressService.terminateRun({ runId, mode: "agent" })`
6. `RuntimeCommandIngressService` resolves the session from `RuntimeSessionStore`.
7. `RuntimeCommandIngressService` resolves the correct runtime adapter from `RuntimeAdapterRegistry`.
8. The runtime adapter executes its runtime-specific `terminateRun(...)`.
9. Control returns to `AgentRunTerminationService`.
10. If runtime termination succeeded:
    - `runtimeCompositionService.removeRunSession(runId)` executes,
    - `runHistoryService.onRunTerminated(runId)` marks the run `IDLE`.
11. `AgentRunTerminationService` returns `{ success: true, route: "runtime", runtimeKind: <runtimeKind> }`.
12. GraphQL resolver maps the result to `TerminateAgentRunResult`.

### `UC-003` Shared Cleanup After Successful Termination

1. `AgentRunTerminationService` receives a successful termination result from either the native path or the runtime path.
2. The service runs one shared cleanup block:
   - remove runtime session,
   - mark run history `IDLE`.
3. No other layer repeats that cleanup for the same terminate request.
4. The returned result already reflects the final success state.

### `UC-004` Not-Found / Already-Inactive Termination

1. GraphQL client calls `terminateAgentRun(id)`.
2. `AgentRunTerminationService` inspects the runtime session.
3. If the chosen route cannot terminate the run:
   - native path returns `false`, or
   - runtime ingress returns `accepted: false`.
4. `AgentRunTerminationService` skips shared cleanup.
5. `AgentRunTerminationService` returns `{ success: false, route: "not_found", runtimeKind: <known-or-null> }`.
6. GraphQL resolver returns the stable not-found message.

## Boundary Expectations

- GraphQL owns response mapping and error translation only.
- `AgentRunTerminationService` owns route selection and shared cleanup.
- `AgentRunManager` remains the native-lifecycle owner for `autobyteus`.
- `RuntimeCommandIngressService` remains the runtime-lifecycle owner for Codex/Claude.

## Failure-Mode Notes

- A stale non-native runtime session should not trigger a fallback native removal attempt.
- A native `autobyteus` run must not be routed exclusively through runtime ingress until native adapter terminate semantics are brought to parity with `AgentFactory.removeAgent(...)`.
- Shared cleanup must remain after-the-fact only; no cleanup on failed terminate attempts.
