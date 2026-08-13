# Agent WebSocket Streaming Protocol (TypeScript)

## Scope

Defines current standalone and Team WebSocket message ownership after provider
normalization and canonical `AgentRun` lifecycle admission. It covers transport
identity, strict Team DTOs, commands, segment/error semantics, presentation
cadence, and close behavior.

## Endpoints

- standalone Agent: `/ws/agent/:runId`
- AgentTeam: `/ws/agent-team/:teamRunId`

A WebSocket session is a transport subscriber. It does not own provider parsing,
turn/segment lifecycle, persistence, Team topology, task delegation, or runtime
identity.

## Core Components

- `src/services/agent-streaming/agent-stream-handler.ts`
- `src/services/agent-streaming/agent-team-stream-handler.ts`
- `src/services/agent-streaming/agent-run-event-message-mapper.ts`
- `src/services/agent-streaming/team-agent-event-websocket-projector.ts`
- `src/services/agent-streaming/team-run-event-websocket-mapper.ts`
- `src/services/agent-streaming/team-execution-address-command-parser.ts`
- `src/services/agent-streaming/websocket-egress`
- `@autobyteus/team-stream-contracts`

## Canonical Upstream Boundary

Provider converters emit source `AgentRunEvent` batches. `AgentRun` serializes
those batches through `AgentRunEventDispatchQueue`, and the default pipeline
applies the run-owned segment and turn lifecycle before any WebSocket subscriber
receives an event. Transport mappers must not accept source-only aliases, infer
missing lifecycle, or reclassify errors.

For Team runs, the concrete member handle verifies the real AgentRun binding and
supplies one `TeamAgentExecutionBinding`. `TeamAgentEventAdapter` maps the finite
post-pipeline Agent event into a correlated Team domain event. The strict Team
projector is then the only server owner of snake-case wire serialization.

## Team Execution Identity

Every concrete Team Agent event and every Team Agent command uses this exact
address:

```json
{
  "root_team_run_id": "root-run-id",
  "task_team_run_ids": [],
  "member_address": "/review_team/reviewer",
  "task_agent_run_id": null
}
```

The root ID identifies the WebSocket-bound collaboration root. The ordered
task-Team array identifies a concrete nested task-Team chain. The rooted member
address identifies the Agent placement. The optional task-Agent run ID selects
one delegated Agent execution.

Agent-originated Team messages wrap that address in one `agent_execution` union:

- `{kind:"persistent_agent",execution_address}`;
- `{kind:"task_agent",execution_address}` where the task-Agent ID is present and
  equals the real AgentRun ID; or
- `{kind:"task_team_agent",execution_address,agent_run_id}` where the address
  has a non-empty task-Team chain and no task-Agent ID.

No Team wire message or command uses legacy member/source paths, route keys,
task-instance IDs, represented-subteam fields, execution-kind aliases, generated
identity, or scalar name/id targets.

## Team Server Messages

`@autobyteus/team-stream-contracts` is the strict DTO authority. Server messages
include:

- Agent events: turn, segment, Agent status, compaction, token usage, assistant
  completion, tool lifecycle/log, todo, task notification, artifact, and file
  change, each with exact `agent_execution`;
- Team-only events: `TASK_DELEGATION_EVENT`, `TEAM_COMMUNICATION_MESSAGE`,
  `MEMBER_INPUT_MESSAGE`, and `EXTERNAL_USER_MESSAGE` with their explicit exact
  execution/participant addresses;
- control: `CONNECTED`, `TEAM_RUN_LIFECYCLE`, `AGENT_COMMAND_ACK`; and
- `ERROR`, either correlated to an `agent_execution` or explicitly uncorrelated.

Unknown fields and invalid union combinations are rejected. The browser parses
the same shared schema before mutating application state.

## Segment Contract

The finite segment type vocabulary is:

```text
text | tool_call | write_file | edit_file | run_bash | reasoning | media
```

Team wire shapes are:

```text
SEGMENT_START   { agent_execution, segment_id, turn_id, segment_type, metadata }
SEGMENT_CONTENT { agent_execution, segment_id, turn_id, segment_type, delta }
SEGMENT_END     { agent_execution, segment_id, turn_id, metadata,
                  interrupted, reason, failed, error }
```

Standalone transport exposes the equivalent canonical Agent payload. A turn is
required for every segment event. Type is required on start and content but is
not repeated on end.

The type on content is derived by the run-owned lifecycle from the admitted
start. It is not provider padding and cannot be inferred by the Team adapter,
transport, application projection, memory, or browser. Missing IDs/turns,
unknown type, content/end without a start, conflicting type, retired-turn input,
and surplus source fields produce a non-terminal
`AGENT_SEGMENT_LIFECYCLE_INVALID` diagnostic and no segment mutation.

Browser mutation uses exact turn plus segment ID and retains canonical type.
Existing-segment content requires type agreement. Canonical typed content may
create a late-subscriber segment. There is no ID-only lookup/removal,
type-plus-ID serialized key, missing-type text default, unknown-to-text mapping,
end-text recovery, or consumer-side missing-start synthesis.

## Turn, Status, And Error Evidence

Visible Agent status is `offline | initializing | idle | running | error`.
Turn lifecycle and status are owned upstream by `AgentRun`; Team root liveness is
separately emitted as `TEAM_RUN_LIFECYCLE {is_active}`. Transport connection,
root liveness, Agent status, task state, and open-work settlement are not
substitutes for one another.

Every canonical Agent error carries nullable evidence fields:

```text
error_scope:  "turn" | "runtime" | null
error_effect: "diagnostic" | "terminal" | null
turn_id:      string | null
```

Evidence must be absent together or complete together. Turn scope requires a
turn ID; runtime scope forbids one. Turn/runtime diagnostics are visible without
closing an open segment/tool, failing an application, or changing status.
Turn-terminal evidence can settle only its matching turn. Runtime-terminal
evidence clears the run-level lifecycle. Unclassified errors remain visible but
carry no lifecycle authority.

## Client Commands

### Standalone `SEND_MESSAGE`

Standalone send carries stable `message_id` and `dedupe_key` and routes through
`AgentRunCommandCoordinator`. The coordinator owns idempotency, prepared or
historical activation, command overlay, runtime forwarding, activity recording,
and `SEND_MESSAGE` acknowledgement.

### Team `SEND_MESSAGE`

```text
{
  type: "SEND_MESSAGE",
  payload: {
    content,
    context_file_paths,
    image_urls,
    execution_address,
    message_id,
    dedupe_key
  }
}
```

The address root must equal the URL TeamRun ID. The server traverses the exact
execution chain and never retargets a stale/malformed address.

### Team interrupt and tool decisions

`INTERRUPT_GENERATION` carries `{command_id,execution_address}`.
`APPROVE_TOOL` / `DENY_TOOL` carry `{invocation_id,execution_address,reason}`.
These controls are active-only and never restore stopped work.

`AGENT_COMMAND_ACK` for Team interrupt repeats the exact command ID and execution
address with `accepted`, `rejected`, or `failed`. A client accepts the response
only when both match its pending command. Acceptance confirms request admission;
later runtime events own terminal status.

## Connection And Restore

A standalone connection binds to the durable run ID, emits `CONNECTED`, projects
current status, and subscribes if a runtime is active. It does not restore or
start the runtime. A Team connection resolves through
`TeamRunService.resolveTeamRun(...)`, because the Team container owns supported
restore. Team event and lifecycle listeners bind before a fresh snapshot is
read, preventing create/restore/termination races.

If a send materializes or restores a runtime, the existing socket is rebound to
that stream. Command overlays remain until command-correlated runtime evidence
or coordinator failure replaces them.

## Client-Bound Content Cadence

Each connection owns one presentation-only egress:

- the first pending content message opens a fixed window using
  `AUTOBYTEUS_STREAMING_CONTENT_FLUSH_INTERVAL_MS` (default 500 ms, range
  100–2,000 ms);
- adjacent content coalesces only when every payload field except `delta` is
  deeply equal, so exact execution/turn/segment/type identity remains distinct;
- immediate companion messages do not seal/reset pending content; and
- lifecycle, tool boundaries, errors, terminal status, completion,
  interruption, and unknown types flush earlier content first.

This cadence does not affect runtime listeners, memory, history, file-change
projection, application output, or Team adaptation.

## Error And Close Semantics

- missing/unrestorable run: `AGENT_NOT_FOUND` or `TEAM_NOT_FOUND`, close `4004`;
- resolved run with unavailable stream: `*_STREAM_UNAVAILABLE`, close `1011`;
- malformed Team DTO or wrong/missing execution address: reject without
  compatibility repair;
- socket loss: dispose connection-local cadence/status filter state; do not
  claim delivery or replay of unsendable buffered output.

## Related Documentation

- [Agent Streaming](../modules/agent_streaming.md)
- [Agent Execution](../modules/agent_execution.md)
- [Agent Team Execution](../modules/agent_team_execution.md)
- [Streaming Parsing Architecture](./streaming_parsing_architecture.md)
- [Run History](../modules/run_history.md)
