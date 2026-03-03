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

## Operational Notes

- Session lifecycle is tied to socket lifecycle.
- Errors are logged and emitted as terminal stream events.
- Managers are singleton-backed and shared across requests.
