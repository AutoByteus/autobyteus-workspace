# Future-State Runtime Call Stacks

- Scope Classification: `Small`
- Call Stack Version: `v1`
- Requirements: `tickets/done/stream-handler-service-layering/requirements.md` (`Design-ready`)
- Source Artifact: `tickets/done/stream-handler-service-layering/implementation.md`
- Source Design Version: `v1`

## Use Case Index

| use_case_id | Spine ID(s) | Spine Scope | Governing Owner | Source Type | Requirement ID(s) | Use Case Name | Coverage Target |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `UC-001` | `DS-001`, `DS-002`, `DS-003` | `Primary End-to-End`, `Return-Event`, `Bounded Local` | `AgentStreamHandler` | `Requirement` | `R-001`, `R-003` | Agent websocket connect, bind, and send message through service-resolved run | `Primary/Yes, Error/Yes` |
| `UC-002` | `DS-001`, `DS-002`, `DS-003` | `Primary End-to-End`, `Return-Event`, `Bounded Local` | `AgentTeamStreamHandler` | `Requirement` | `R-002`, `R-003` | Team websocket connect, bind, and approve tool through service-resolved team run | `Primary/Yes, Error/Yes` |

## Use Case: `UC-001` Agent websocket uses `AgentRunService`

### Goal

Bind a websocket session to an active agent run without bypassing the service boundary, then forward commands and events through the resolved `AgentRun` subject.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-server-ts/src/api/websocket/agent.ts:registerAgentWebsocket(...)
└── autobyteus-server-ts/src/services/agent-streaming/agent-stream-handler.ts:connect(...)
    ├── autobyteus-server-ts/src/agent-execution/services/agent-run-service.ts:getAgentRun(runId)
    ├── autobyteus-server-ts/src/services/agent-streaming/agent-stream-handler.ts:bindSessionToRun(...) [STATE]
    │   └── autobyteus-server-ts/src/agent-execution/domain/agent-run.ts:subscribeToEvents(...)
    └── autobyteus-server-ts/src/services/agent-streaming/agent-stream-handler.ts:handleMessage(...)
        ├── autobyteus-server-ts/src/agent-execution/services/agent-run-service.ts:getAgentRun(runId)
        ├── autobyteus-server-ts/src/agent-execution/domain/agent-run.ts:postUserMessage(...) [ASYNC]
        └── autobyteus-server-ts/src/agent-execution/services/agent-run-service.ts:recordRunActivity(...) [IO]
```

### Error Path

```text
[ERROR] if the active run is missing
autobyteus-server-ts/src/services/agent-streaming/agent-stream-handler.ts:connect(...)
└── createErrorMessage("AGENT_NOT_FOUND", ...)
```

## Use Case: `UC-002` Team websocket uses `TeamRunService`

### Goal

Bind a websocket session to an active team run without bypassing the team service boundary, then resolve approval targets from the resolved `TeamRun` subject rather than backend-manager state.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-server-ts/src/api/websocket/agent.ts:registerAgentWebsocket(...)
└── autobyteus-server-ts/src/services/agent-streaming/agent-team-stream-handler.ts:connect(...)
    ├── autobyteus-server-ts/src/agent-team-execution/services/team-run-service.ts:getTeamRun(teamRunId)
    ├── autobyteus-server-ts/src/services/agent-streaming/agent-team-stream-handler.ts:bindSessionToTeamRun(...) [STATE]
    │   └── autobyteus-server-ts/src/agent-team-execution/domain/team-run.ts:subscribeToEvents(...)
    └── autobyteus-server-ts/src/services/agent-streaming/agent-team-stream-handler.ts:handleToolApproval(...)
        ├── autobyteus-server-ts/src/agent-team-execution/services/team-run-service.ts:getTeamRun(teamRunId)
        ├── autobyteus-server-ts/src/services/agent-streaming/agent-team-stream-handler.ts:resolveApprovalTargetName(...)
        ├── autobyteus-server-ts/src/agent-team-execution/domain/team-run.ts:approveToolInvocation(...) [ASYNC]
        └── autobyteus-server-ts/src/agent-team-execution/services/team-run-service.ts:recordRunActivity(...) [IO]
```

### Error Path

```text
[ERROR] if the active team run is missing
autobyteus-server-ts/src/services/agent-streaming/agent-team-stream-handler.ts:connect(...)
└── createErrorMessage("TEAM_NOT_FOUND", ...)
```
