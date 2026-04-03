# Implementation Sketch

- Ticket: `stream-handler-service-layering`
- Design Version: `v1`
- Scope Classification: `Small`
- Last Updated: `2026-04-01T15:57:46Z`

## Goal

Restore boundary encapsulation in the websocket stream handlers by making each handler depend on one authoritative service boundary per run domain, then operate on the resolved run subject instead of reaching into the underlying manager.

## Spine Inventory

| Spine ID | Scope | Start | End | Owning Node / Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| `DS-001` | `Primary End-to-End` | websocket route attach | run command accepted by `AgentRun` / `TeamRun` | stream handler | Core user command path for live websocket sessions |
| `DS-002` | `Return-Event` | run event emission | websocket message send | stream handler | Core live-stream path for runtime events |
| `DS-003` | `Bounded Local` | session bind or reconnect check | subscription attached to run subject | stream handler | Local binding loop that currently contains the manager bypass |

## Current Problem

- `AgentStreamHandler` depends on both `AgentRunService` and `AgentRunManager`.
- `AgentTeamStreamHandler` depends on both `TeamRunService` and `AgentTeamRunManager`.
- That shape violates boundary encapsulation because the handler is above the service boundary but still reaches into the manager that the service already owns.

## Target Direction

### Agent path

`WebSocket route -> AgentStreamHandler -> AgentRunService.getAgentRun(runId) -> AgentRun`

- `AgentStreamHandler` resolves the active run through `AgentRunService`.
- Once it has the `AgentRun` subject, it subscribes to run events and invokes runtime commands directly on that run subject.
- Activity recording remains on `AgentRunService`.

### Team path

`WebSocket route -> AgentTeamStreamHandler -> TeamRunService.getTeamRun(teamRunId) -> TeamRun`

- `AgentTeamStreamHandler` resolves the active team run through `TeamRunService`.
- Event subscription is performed on the returned `TeamRun` subject via `TeamRun.subscribeToEvents(...)`.
- Approval-target resolution uses the resolved `TeamRun` context/member metadata rather than `AgentTeamRunManager.getTeam(...)`.
- Activity recording remains on `TeamRunService`.

## Ownership Rules

| Owner | Owns | Must Not Own |
| --- | --- | --- |
| `AgentRunService` | authoritative lookup and activity persistence for single-agent runs | websocket session state or socket-specific subscription lifecycle |
| `TeamRunService` | authoritative lookup and activity persistence for team runs | websocket session state or socket-specific subscription lifecycle |
| `AgentStreamHandler` | websocket session lifecycle, run binding, event forwarding, command parsing | direct dependency on `AgentRunManager` |
| `AgentTeamStreamHandler` | websocket session lifecycle, run binding, event forwarding, command parsing | direct dependency on `AgentTeamRunManager` |
| `AgentRun` / `TeamRun` | live runtime commands and runtime event subscription | metadata persistence |

## Change Inventory

| Change ID | Type | Path | Rationale |
| --- | --- | --- | --- |
| `C-001` | `Modify` | `autobyteus-server-ts/src/services/agent-streaming/agent-stream-handler.ts` | remove manager dependency and resolve runs through `AgentRunService` |
| `C-002` | `Modify` | `autobyteus-server-ts/src/services/agent-streaming/agent-team-stream-handler.ts` | remove manager dependency, subscribe via `TeamRun`, resolve member names from `TeamRun` context |
| `C-003` | `Modify` | focused unit tests for both handlers | align validation with the new authoritative boundary |

## Removal Plan

| Item To Remove | Why It Becomes Unnecessary | Replaced By |
| --- | --- | --- |
| `AgentRunManager` dependency from `AgentStreamHandler` | service already owns run lookup authority | `AgentRunService.getAgentRun(...)` |
| `AgentTeamRunManager` dependency from `AgentTeamStreamHandler` | service already owns run lookup authority; `TeamRun` owns event subscription | `TeamRunService.getTeamRun(...)` + `TeamRun.subscribeToEvents(...)` |
| backend-team lookup in `resolveApprovalTargetName` | runtime member context already contains member identity | `TeamRun.context.runtimeContext.memberContexts` / `config.memberConfigs` |

## Validation Plan

1. Update unit tests for `AgentStreamHandler`.
2. Update unit tests for `AgentTeamStreamHandler`.
3. Run focused Vitest coverage for the touched handler tests.
