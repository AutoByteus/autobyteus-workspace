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

### Status Contract

The WebSocket status contract is intentionally coarse and transport-owned.
Provider/native runtimes may keep detailed internal lifecycle states, but
clients receive only these status messages:

```ts
type AgentStatusPayload = {
  status: "offline" | "initializing" | "idle" | "running" | "error";
  can_interrupt: boolean;
  agent_id?: string;
  agent_name?: string;
};

type TeamStatusPayload = {
  status: "offline" | "initializing" | "idle" | "running" | "error";
};
```

`AGENT_STATUS` is emitted for single-agent runs and for team members. Team
member messages include `agent_id` and/or `agent_name` when the handler can
resolve that identity, and member `can_interrupt` is the authority for the
frontend stop/interrupt affordance.

Successful single-agent termination publishes a terminal
`AGENT_STATUS { status: "offline", can_interrupt: false, agent_id }` to
already-connected WebSocket clients before the run stream is torn down. Clients
should treat that message as the authoritative live transition from an active
run to an inactive/offline run; socket close or history reload is not the only
termination signal.

`TEAM_STATUS` is only the aggregate team status and intentionally does not
carry `can_interrupt`. Team aggregation is derived from member statuses plus
the native team status: any error wins, otherwise any running member/native
running state yields `running`, otherwise any active idle member/native idle
state yields `idle`, and an all-inactive/no-runtime team is `offline`.
Clients must not apply aggregate `TEAM_STATUS` back onto every member. Member
rows are driven by member `AGENT_STATUS` snapshots/events or member-scoped
history; an active running team can legitimately contain one running member and
other offline members.

Status payloads do not expose legacy target fields such as `new_status` or
`old_status`. Those names may still exist in native runtime-internal packages
for their own streams, but they are not part of the server WebSocket status
contract.

Segment payloads use snake-case `turn_id` as the canonical transport field for
all `SEGMENT_START`, `SEGMENT_CONTENT`, and `SEGMENT_END` messages. Native
AutoByteus segment conversion drops outbound camel-case `turnId` aliases from
segment payloads, while the final WebSocket mapper still tolerates inbound
legacy aliases and re-emits only `turn_id`.

Stream terminalization is explicit. Interrupted turns end active segments with
`interrupted: true` / `reason`; non-interrupt LLM stream failures end active
segments with `failed: true` / `error` before the backend emits the runtime
error. Failed partial tool segments are not executable invocations and should be
rendered as terminal error state by clients.

Runtime backends run each base normalized event batch through
`AgentRunEventPipeline` before any subscriber fan-out. The stream therefore
already includes derived events such as `FILE_CHANGE` for explicit
write/edit/generated-output semantics. Clients consume `FILE_CHANGE` for the
Artifacts tab and must not expect a legacy file-change-update event alias or
derive artifact rows from arbitrary `file_path` tool arguments.

Native AutoByteus team runs use one backend-owned native event bridge per active
team backend. The bridge converts and enriches each native member event,
processes it through the pipeline once, then fans out the processed source and
derived events to every server subscriber. Multiple websocket/API subscribers
must therefore observe the same `FILE_CHANGE` sequence without causing duplicate
processing.

Accepted `INTER_AGENT_MESSAGE` events are processor input for Team
Communication. When an accepted inter-agent message carries explicit
`payload.reference_files`, the payload also carries message-owned reference
metadata. `TeamCommunicationMessageProcessor` emits one normalized
`TEAM_COMMUNICATION_MESSAGE` event for that accepted message. Clients consume
`TEAM_COMMUNICATION_MESSAGE` into the Team Communication store; they must not
derive references by parsing rendered chat text, linkifying raw paths, or adding
those rows to the run-file-changes projection.

Content route ownership stays split:

- Agent Artifact rows use `/runs/:runId/file-change-content?path=...`.
- Team Communication reference rows use
  `/team-runs/:teamRunId/team-communication/messages/:messageId/references/:referenceId/content`
  after resolving persisted `teamRunId + messageId + referenceId` identity.

The focused frontend member decides whether a message is shown in the sent or
received Team Communication perspective; sender/receiver identity is metadata on
the message, not a receiver-owned route or projection owner.

## Connection And Command Recovery Contract

Connection establishment is restore-aware:

1. The handler resolves the requested `runId` / `teamRunId` through the domain service.
2. The service first checks the active in-memory registry.
3. If no active runtime exists, the service attempts to restore the persisted run.
4. The handler creates a WebSocket session only after it has a runtime subject and can subscribe to that subject's event stream.

`SEND_MESSAGE` follows the same restore-aware boundary. On every follow-up chat message, the handler resolves the session's run again, rebinds the WebSocket subscription if a stopped persisted run was restored, and posts the user input to the resolved runtime subject. For team runs, the payload's `target_member_name` / `target_agent_name` remains the member routing key for the restored team runtime.

Control commands remain active-only:

- `INTERRUPT_GENERATION`
- `APPROVE_TOOL`
- `DENY_TOOL`

Those commands intentionally require an already-active runtime lookup and do not call the restore path. Clients should not treat interrupt/approval messages as a way to resume a stopped run; stopped-run recovery is owned by connection setup, explicit restore mutations, and `SEND_MESSAGE`.

Team interrupt uses a stricter command shape than single-agent interrupt. A
client sending `INTERRUPT_GENERATION` to `/ws/agent-team/:teamRunId` must include
`payload.target_member_name` as the stable focused-member route key. It may also
include `payload.agent_id`, but that value is only a guard for the expected
member run id; it is never the authoritative selector. The server rejects
missing `target_member_name` and route-key/run-id mismatches without invoking a
member runtime and without falling back to aggregate team interruption. The
single-agent `/ws/agent/:runId` command remains a no-payload
`INTERRUPT_GENERATION`.

Approval commands are active-turn control commands, not queued runtime input.
For native AutoByteus single-agent runs, `APPROVE_TOOL` / `DENY_TOOL` delegate
to the active run backend and then to the agent's public
`postToolExecutionApproval(...)` boundary. For native team runs, the team
backend resolves the target member and routes the decision through that member
agent's public approval API via the async team event path. The backend may
publish approval status/projection events after a valid decision, but
`ToolExecutionApprovalEvent` is not a WebSocket command payload that can start a
turn, restore a run, or bypass the active member runtime. Stale, inactive,
no-pending, and interrupted approval attempts are non-restoring failures.
Native AutoByteus treats only pending approval records as approval authority:
membership in the active tool invocation batch is not enough for
`APPROVE_TOOL` / `DENY_TOOL` to succeed. Auto-executing active tools and stale
client retries therefore reject as no-pending without status mutation.

`INTERRUPT_GENERATION` should also not be treated as an immediate send-readiness
acknowledgement. A client that sends interrupt should wait for the backend's
terminal lifecycle/status stream projection for the affected turn before
enabling a follow-up send. Runtime adapters that own provider processes must
finish their cancellation boundary first; for Claude Agent SDK sessions this
means aborting/closing the active query and clearing active turn/query state
before the interrupted/idle projection is emitted. In the public WebSocket
contract, that idle projection is an `AGENT_STATUS` payload such as
`{ status: "idle", can_interrupt: false }`.

Native AutoByteus runtimes follow the same interrupt-vs-stop split:
single-agent `INTERRUPT_GENERATION` delegates to the active run
`interrupt(...)` path, while team `INTERRUPT_GENERATION` delegates through the
active team member `interruptMember(...)` route described above. Terminal
stop/termination remains the shutdown path. Stale or inactive control commands
must not restore a stopped run and must not fall back to shutdown cleanup.

Explicit GraphQL termination of an active Claude Agent SDK run follows the same
provider-settlement invariant before final session termination. The session must
settle any active turn through the interrupt-safe query closure path first; only
after that may the manager emit `SESSION_TERMINATED`, close/remove the run
session, and leave later follow-up recovery to explicit restore plus
`SEND_MESSAGE`.

## Error And Close Semantics

- Missing or unrestorable single-agent runs emit `AGENT_NOT_FOUND` and close with `4004`.
- Missing or unrestorable team runs emit `TEAM_NOT_FOUND` and close with `4004`.
- Runs that resolve but cannot expose a stream subscription emit `AGENT_STREAM_UNAVAILABLE` or `TEAM_STREAM_UNAVAILABLE` and close with `1011`.
- Unknown client message types are logged and ignored instead of changing run state.

## Operational Notes

- Session lifecycle is tied to socket lifecycle.
- Errors are logged and emitted as terminal stream events.
- Managers are singleton-backed and shared across requests, but stream handlers depend on the outer run-service boundary for restore and active lookup.
