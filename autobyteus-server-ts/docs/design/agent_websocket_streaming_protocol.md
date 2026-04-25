# Agent WebSocket Streaming Protocol (TypeScript)

## Scope

Defines runtime behavior for agent and team streaming WebSocket endpoints.

## Endpoints

- `GET /ws/agent/:runId`
- `GET /ws/agent-team/:teamRunId`

## Core Components

- Agent stream handlers:
  - `src/services/agent-streaming/agent-stream-handler.ts`
  - `src/services/agent-streaming/agent-team-stream-handler.ts`
- WebSocket route bindings:
  - `src/api/websocket/agent.ts`
- GraphQL streaming entry points:
  - `src/api/graphql/types/agent-run.ts`
  - `src/api/graphql/types/agent-team-run.ts`

## Event Model

Handlers forward streamed model/tool events from runtime managers to clients and normalize error/completion semantics for transport-safe delivery.

## Connection And Command Recovery Contract

Connection establishment is restore-aware:

1. The handler resolves the requested `runId` / `teamRunId` through the domain service.
2. The service first checks the active in-memory registry.
3. If no active runtime exists, the service attempts to restore the persisted run.
4. The handler creates a WebSocket session only after it has a runtime subject and can subscribe to that subject's event stream.

`SEND_MESSAGE` follows the same restore-aware boundary. On every follow-up chat message, the handler resolves the session's run again, rebinds the WebSocket subscription if a stopped persisted run was restored, and posts the user input to the resolved runtime subject. For team runs, the payload's `target_member_name` / `target_agent_name` remains the member routing key for the restored team runtime.

Control commands remain active-only:

- `STOP_GENERATION`
- `APPROVE_TOOL`
- `DENY_TOOL`

Those commands intentionally require an already-active runtime lookup and do not call the restore path. Clients should not treat approval/stop messages as a way to resume a stopped run; stopped-run recovery is owned by connection setup, explicit restore mutations, and `SEND_MESSAGE`.

## Error And Close Semantics

- Missing or unrestorable single-agent runs emit `AGENT_NOT_FOUND` and close with `4004`.
- Missing or unrestorable team runs emit `TEAM_NOT_FOUND` and close with `4004`.
- Runs that resolve but cannot expose a stream subscription emit `AGENT_STREAM_UNAVAILABLE` or `TEAM_STREAM_UNAVAILABLE` and close with `1011`.
- Unknown client message types are logged and ignored instead of changing run state.

## Operational Notes

- Session lifecycle is tied to socket lifecycle.
- Errors are logged and emitted as terminal stream events.
- Managers are singleton-backed and shared across requests, but stream handlers depend on the outer run-service boundary for restore and active lookup.
