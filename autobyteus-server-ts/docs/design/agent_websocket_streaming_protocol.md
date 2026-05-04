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

Runtime backends run each base normalized event batch through
`AgentRunEventPipeline` before any subscriber fan-out. The stream therefore
already includes derived events such as `FILE_CHANGE` for explicit
write/edit/generated-output semantics. Clients consume `FILE_CHANGE` for the
Artifacts tab and must not expect a legacy file-change-update event alias or
derive artifact rows from arbitrary `file_path` tool arguments.

Team managers also process accepted synthetic `INTER_AGENT_MESSAGE` events
through the same pipeline before team fan-out. When an accepted inter-agent
message carries explicit `payload.reference_files`, the stream can include a
sidecar `MESSAGE_FILE_REFERENCE_DECLARED` event. Clients consume that event into
a dedicated team-level message-reference store; they must not derive references
by parsing rendered chat text, linkifying raw paths, or adding those rows to the
run-file-changes projection.

Content route ownership stays split:

- Agent Artifact rows use `/runs/:runId/file-change-content?path=...`.
- Message-reference rows use `/team-runs/:teamRunId/message-file-references/:referenceId/content`
  after resolving persisted `teamRunId + referenceId` identity.

The focused frontend member decides whether a canonical message-reference row is
shown as **Sent Artifacts** or **Received Artifacts**; sender/receiver identity is
metadata, not a receiver-owned route or projection owner.

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

`STOP_GENERATION` should also not be treated as an immediate send-readiness
acknowledgement. A client that sends stop should wait for the backend's
terminal lifecycle/status stream projection for the affected turn before
enabling a follow-up send. Runtime adapters that own provider processes must
finish their cancellation boundary first; for Claude Agent SDK sessions this
means aborting/closing the active query and clearing active turn/query state
before the interrupted/idle projection is emitted.

## Error And Close Semantics

- Missing or unrestorable single-agent runs emit `AGENT_NOT_FOUND` and close with `4004`.
- Missing or unrestorable team runs emit `TEAM_NOT_FOUND` and close with `4004`.
- Runs that resolve but cannot expose a stream subscription emit `AGENT_STREAM_UNAVAILABLE` or `TEAM_STREAM_UNAVAILABLE` and close with `1011`.
- Unknown client message types are logged and ignored instead of changing run state.

## Operational Notes

- Session lifecycle is tied to socket lifecycle.
- Errors are logged and emitted as terminal stream events.
- Managers are singleton-backed and shared across requests, but stream handlers depend on the outer run-service boundary for restore and active lookup.
