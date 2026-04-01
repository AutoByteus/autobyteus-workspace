# Investigation Notes

- Ticket: `stream-handler-service-layering`
- Last Updated: `2026-04-01T15:57:46Z`
- Scope Triage: `Small`

## Investigation Goal

Determine whether the stream handlers violate the intended service-layer boundary by depending on both service and manager objects for the same run domain, and identify the smallest clean refactor that restores boundary encapsulation.

## Findings

### 1. `AgentStreamHandler` bypasses the authoritative service boundary

- File: `autobyteus-server-ts/src/services/agent-streaming/agent-stream-handler.ts`
- The handler injects both `AgentRunManager` and `AgentRunService`.
- The manager is used for active-run lookup in `connect`, `bindSessionToRun`, `handleSendMessage`, `handleStopGeneration`, and `handleToolApproval`.
- `AgentRunService` already exposes `getAgentRun(runId)` and `resolveAgentRun(runId)`, so the handler does not need direct manager access for the behavior it owns.
- This is a direct violation of the workflow design principle that callers above an authoritative boundary should not depend on both that boundary and one of its internal owned mechanisms at the same time.

### 2. `AgentTeamStreamHandler` has the same encapsulation problem

- File: `autobyteus-server-ts/src/services/agent-streaming/agent-team-stream-handler.ts`
- The handler injects both `AgentTeamRunManager` and `TeamRunService`.
- The manager is used for:
  - active/team run lookup (`connect`, `bindSessionToTeamRun`, `resolveCommandRun`)
  - event subscription (`bindSessionToTeamRun`)
  - approval-target lookup via backend-owned team state (`resolveApprovalTargetName`)
- `TeamRunService` already exposes `getTeamRun(teamRunId)` and `resolveTeamRun(teamRunId)`.
- The returned `TeamRun` object already owns `subscribeToEvents`, `postMessage`, `approveToolInvocation`, and `interrupt`.
- `TeamRun.context.runtimeContext` already exposes member runtime contexts, including `memberName` and `memberRunId`, so approval-target resolution can be derived from the run subject instead of the manager/backend.

### 3. No new service pass-through appears necessary

- For both handlers, the missing behavior is not actually missing at the service boundary.
- The clean shape is:
  - handler resolves the run subject through the authoritative service,
  - handler interacts with the returned domain run object for streaming and command actions,
  - handler records activity back through the service.
- Adding a new pass-through subscription API on the services would add indirection without new ownership. The run subject already owns event subscription.

## Design Implications

1. Remove `AgentRunManager` from `AgentStreamHandler`.
2. Remove `AgentTeamRunManager` from `AgentTeamStreamHandler`.
3. Keep `AgentRunService` and `TeamRunService` as the authoritative entrypoints for run lookup and metadata/activity recording.
4. Use `AgentRun` and `TeamRun` domain objects, returned by the services, as the runtime subjects for websocket subscription and command dispatch.
5. Keep the refactor local to the stream-handler subsystem unless validation exposes another hidden boundary leak.

## Evidence

- `autobyteus-server-ts/src/services/agent-streaming/agent-stream-handler.ts`
- `autobyteus-server-ts/src/services/agent-streaming/agent-team-stream-handler.ts`
- `autobyteus-server-ts/src/agent-execution/services/agent-run-service.ts`
- `autobyteus-server-ts/src/agent-team-execution/services/team-run-service.ts`
- `autobyteus-server-ts/src/agent-team-execution/domain/team-run.ts`
- `autobyteus-server-ts/src/agent-team-execution/domain/team-run-context.ts`
