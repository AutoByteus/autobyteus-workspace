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

type AgentCommandAckPayload = {
  command_type: "SEND_MESSAGE";
  run_id: string;
  message_id: string;
  dedupe_key: string;
  state:
    | "accepted"
    | "duplicate_in_progress"
    | "duplicate_completed"
    | "duplicate_failed"
    | "duplicate_rejected"
    | "rejected"
    | "failed";
  accepted: boolean;
  duplicate: boolean;
  code?:
    | "RUN_COMMAND_IN_PROGRESS"
    | "INVALID_COMMAND_ID"
    | "RUN_NOT_FOUND"
    | "ACTIVATION_FAILED"
    | "RUNTIME_REJECTED"
    | "UNKNOWN_ERROR";
  message?: string;
  status?: AgentStatusPayload;
};

type TeamStatusPayload = {
  status: "offline" | "initializing" | "idle" | "running" | "error";
};
```

`AGENT_STATUS` is emitted for single-agent runs and for team members. Team
member messages include `agent_id` and/or `agent_name` when the handler can
resolve that identity, and member `can_interrupt` is the authority for the
frontend stop/interrupt affordance. When the status belongs to a delegated
task-agent execution, the payload also carries explicit task-agent identity:
`task_agent_instance_id`, `task_agent_run_id`, `task_id`, the logical
`member_path` / `member_route_key`, and canonical `source_path` /
`source_route_key`. Clients must key the transient task-agent execution by
`task_agent_run_id` and must not infer task-agent identity from generated run id
formats. When the status belongs to a task-team execution, root events carry
`execution_kind: "task_team"`, `task_team_instance_id`, `task_team_run_id`,
`task_id`, `team_path`, and `team_route_key`; child-member events inside that
task-team run additionally carry `task_team_relative_member_path` and, when
available, `task_team_relative_member_route_key`. Clients must key task-team
roots and scoped child projections by `task_team_run_id`, not by the structural
team route alone.

Startup lifecycle tokens such as `bootstrapping`, `starting`, `startup`,
`initializing`, and active `uninitialized` normalize to `initializing`, not to
`running` or `offline`. `initializing` is an active but non-interruptible
startup status, so `can_interrupt` remains `false` until a later `running`
projection explicitly grants interrupt authority.

Successful single-agent termination publishes a terminal
`AGENT_STATUS { status: "offline", can_interrupt: false, agent_id }` to
already-connected WebSocket clients before the run stream is torn down. Clients
should treat that message as the authoritative live transition from an active
run to an inactive/offline run; socket close or history reload is not the only
termination signal.

`TEAM_STATUS` is only the aggregate team status and intentionally does not
carry `can_interrupt`. Team aggregation is derived from member statuses plus
the native team status: any running member/native running state yields
`running`; otherwise startup/initializing member or native state yields
`initializing`; otherwise errors remain visible; otherwise active idle state
yields `idle`; and an all-inactive/no-runtime team is `offline`.
Clients must not apply aggregate `TEAM_STATUS` back onto every member. Member
rows are driven by member `AGENT_STATUS` snapshots/events or member-scoped
history; an active running or initializing team can legitimately contain one
active member and other offline members.

For delegated task-team execution cleanup, successful accepted settlement emits
or bridges a task-team-scoped root `TEAM_STATUS` with `status: "offline"` before
the task-team handle is disposed. The event carries the task-team identity
fields described above and uses the task-team root source path. Clients should
treat it as the authoritative live cleanup signal for the transient task-team
root and its scoped children; reconnect/reload should rely on the corresponding
absence of that settled task-team handle from backend status snapshots rather
than reconstructing it from durable task history.

Status payloads expose only normalized `status` plus documented metadata. Native runtime transition-field names are not part of the server WebSocket status contract.

### Turn Lifecycle And Error Evidence Contract

Agent lifecycle is correlated by turn identity, not inferred from message
activity or elapsed quiet time:

- `TURN_STARTED` opens an authoritative turn and establishes `running` when no
  accepted explicit status accompanies the boundary.
- A matching `TURN_COMPLETED` or `TURN_INTERRUPTED` closes that turn and
  establishes `idle` for a still-live runtime.
- Runtime termination remains stronger than turn completion and establishes
  `offline`.
- Ordinary `SEGMENT_*`, tool, inter-agent, todo, and system-task events are
  content/progress events. They cannot establish or reopen a turn.
- A duplicate or late boundary for retired turn A is a lifecycle no-op and
  cannot close newer active turn B. Late content for A is still forwarded.

`turn_id` is the canonical transport identity for lifecycle correlation. New
runtime/provider publishers should use it consistently; server internals may
tolerate `turnId` while normalizing provider events.

`ERROR` payloads preserve their existing message/source or code/details fields
and may add this structured evidence:

```ts
type ErrorLifecycleFields =
  | {
      error_scope: "turn";
      error_effect: "diagnostic" | "terminal";
      turn_id: string;
    }
  | {
      error_scope: "runtime";
      error_effect: "terminal";
    };
```

The fields are additive for transport consumers. A turn diagnostic is visible
but does not settle status or a command. A turn-terminal error applies only to
the matching identified turn. A runtime-terminal error has no `turn_id` and
applies to the runtime as a whole. Missing/empty identity, a runtime-scoped
payload that also carries a turn id, or any unsupported scope/effect
combination is unclassified and has no lifecycle authority. Clients should
render the error as appropriate but update lifecycle only from canonical
`AGENT_STATUS`, matching turn boundaries, or valid terminal evidence.

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

Accepted team-route `INTER_AGENT_MESSAGE` events are processor input for Team
Communication. When an accepted `recipient_name` message carries explicit
`payload.reference_files`, the payload also carries message-owned reference
metadata. `TeamCommunicationMessageProcessor` emits one normalized
`TEAM_COMMUNICATION_MESSAGE` event for that accepted message. Direct exact-run
`send_message_to(target_agent_run_id=...)` events intentionally omit the team
projection fields consumed by this processor. Clients consume
`TEAM_COMMUNICATION_MESSAGE` into the Team Communication store; they must not
derive references by parsing rendered chat text, linkifying raw paths, or adding
those rows to the run-file-changes projection.

Content route ownership stays split:

- Agent Artifact rows use `/runs/:runId/file-change-content?path=...`.
- Team Communication reference rows use
  `/team-runs/:teamRunId/team-communication/messages/:messageId/references/:referenceId/content`
  after resolving persisted `teamRunId + messageId + referenceId` identity.
- Task-delegation reference rows use
  `/team-runs/:teamRunId/task-delegations/:taskId/references/:referenceId/content`
  after resolving active task-owned `teamRunId + taskId + referenceId`
  identity. New task `referenceId` values are route-safe opaque identities; the
  stored `referenceFiles[].path` carries the normalized absolute local file path
  used for streaming.

The focused frontend member decides whether a message is shown in the sent or
received Team Communication perspective by deriving that focused node's
`ConversationTargetAddress` and comparing normalized address keys against each
message's `senderAddress` and `receiverAddress`. Sender/receiver identity is
message metadata, not a receiver-owned route or projection owner. Static nested
members, task-team roots, members inside task-team executions, and delegated
task-agent executions are represented by `member`, `task_team`, and
`task_agent` address segments. Current runtime/API/stream payloads do not expose
old flat Team Communication participant fields such as sender/receiver run ids,
member paths/route keys, represented-subteam fields, or task-team-scope
wrappers; old flat projection files are converted by app-data migration before
normal runtime reads.

Team events expose path-aware member identity:

- `source_path` is the canonical event source path for nested teams.
- `source_route_key` is the slash-delimited normalized form of `source_path`.
- agent-sourced events also carry `member_path` and `member_route_key` for the
  producing member.
- delegated task-agent events and member-status overlays also carry
  `task_agent_instance_id`, `task_agent_run_id`, and `task_id` for the concrete
  task-scoped child execution under that logical member.
- delegated task-team root events carry `execution_kind: "task_team"`,
  `task_team_instance_id`, `task_team_run_id`, `task_id`, `team_path`, and
  `team_route_key` for the concrete task-scoped child team execution.
- task-team child events carry `task_team_run_id` plus
  `task_team_relative_member_path` / `task_team_relative_member_route_key` so
  clients can route nested status, transcript, and tool lifecycle messages to
  the scoped child projection without mutating the structural subteam node.
- `TASK_DELEGATION_EVENT` payloads carry task-owned UI metadata such as
  task description/status/target, `referenceFiles`, and normalized
  `taskArguments` so the Team tab Tasks projection does not scrape Team
  Communication messages or raw tool-call text.
- `sub_team_node_name` is a deprecated display alias only and must not be used
  as routing identity.

Team member input is also emitted explicitly. When a user or inter-agent
delivery is accepted for a concrete leaf member, the backend emits a
`MEMBER_INPUT` team event and the WebSocket adapter forwards it as
`MEMBER_INPUT_MESSAGE` for that member. The payload includes `message_id`,
`dedupe_key`, `input_origin`, recipient member path/route identity, optional
sender path/route identity, and context-file locators derived from canonical
context-file references. This keeps local team sends and child team transcripts
truthful: accepted member input is rendered in the target transcript before the
assistant reply instead of being reconstructed from Team Communication rows
after the fact. Backend-supported external-channel ingress remains on
`EXTERNAL_USER_MESSAGE`; normal team/member accepted-input echoes do not use the
external-channel message boundary.

Server-owned task-delegation `SenderType.SYSTEM` work packets and lifecycle
notifications are not normal accepted-input echoes. They are stamped by the
task-delegation subsystem, delivered to the target runtime/model, and projected
once as a local `SYSTEM_TASK_NOTIFICATION` for the target conversation using the
stamped task-centered display content. Activation display content uses the same
`You have a new task.` template for member and team targets and does not expose
target kind/name labels. The WebSocket stream must therefore expose the visible
task-delegation notification through the system-notification surface and must
not also emit a
`MEMBER_INPUT_MESSAGE` with the same payload. AutoByteus runtime input receives
generic system-task-notification suppression metadata for these stamped messages
so runtime-originated notification conversion cannot create a second live
notification, while unstamped system notifications remain eligible for the
normal system-notification path.

## Connection And Command Recovery Contract

Single-agent connection establishment is identity/projection aware, not
runtime-restoring:

1. The handler asks `AgentRunStatusProjectionService` for the requested `runId`.
2. If the run identity is missing, the handler emits `AGENT_NOT_FOUND` and
   closes with `4004`.
3. Otherwise the handler creates a WebSocket session for that durable run id,
   registers the connection for command-status fan-out, emits `CONNECTED`, and
   sends the projected `AGENT_STATUS`.
4. If an active runtime already exists, the handler also binds the session to
   that runtime event stream. Prepared, historical inactive, and command-overlay
   identities can still connect before runtime activation.

Standalone new-run first message uses GraphQL `prepareAgentRun(...)` before the
WebSocket command. Preparation creates the durable run id, metadata, memory
directory, and history row without starting runtime. If the user abandons the
draft before sending, `cancelPreparedAgentRun(...)` can remove the unactivated
prepared identity.

Standalone `SEND_MESSAGE` is a backend-owned command and must include stable
identity fields:

```json
{
  "type": "SEND_MESSAGE",
  "payload": {
    "content": "...",
    "message_id": "client-or-external-stable-id",
    "dedupe_key": "agent_run_input:<runId>:<message_id>",
    "context_file_paths": [],
    "image_urls": []
  }
}
```

The handler routes the command through `AgentRunCommandCoordinator`. For an
inactive historical run or prepared identity, the coordinator publishes
non-interruptible `AGENT_STATUS initializing` before restore/start/activation
work, then activates/restores the runtime and forwards the message. During an
inactive-start command, restored runtime readiness is internal and does not
replace the command overlay. The overlay is replaced only by command-correlated
post-handoff lifecycle signals: command-start `AGENT_STATUS initializing`,
explicit `TURN_STARTED`, command-correlated `AGENT_STATUS`, terminal/error
events after handoff, or coordinator activation/post failure handling. Restored
runtime snapshots/readiness, WebSocket bind success, `statusHint=ACTIVE` alone,
persisted metadata, and active runtime snapshot availability do not clear or
replace the overlay. The handler sends `AGENT_COMMAND_ACK` for
accepted, duplicate, rejected, and failed outcomes. Retries with the same
`(runId, message_id)` are idempotent; a different `message_id` while another
command for the run is `STARTING` or `FORWARDED` is rejected with
`RUN_COMMAND_IN_PROGRESS` rather than queued.

Team connection establishment remains restore-aware through the team service:

1. The handler resolves the requested `teamRunId` through the team domain service.
2. The service first checks the active in-memory registry.
3. If no active runtime exists, the service attempts to restore the persisted run.
4. The handler creates a WebSocket session only after it has a runtime subject and can subscribe to that subject's event stream.

For team runs, `SEND_MESSAGE` targets are normalized at the WebSocket edge to a
`ConversationTargetAddress`, a typed segment path rooted at the WebSocket-bound
parent team run. The canonical payload is `conversation_target_address` (camel
alias `conversationTargetAddress` is accepted):

```json
{
  "type": "SEND_MESSAGE",
  "payload": {
    "content": "Please inspect this result.",
    "conversation_target_address": {
      "parent_team_run_id": "optional-parent-team-run-id-guard",
      "segments": [
        { "kind": "member", "member_route_key": "research" },
        { "kind": "task_team", "task_team_run_id": "task-team-run-id" },
        { "kind": "member", "member_route_key": "writer" },
        { "kind": "task_agent", "task_agent_run_id": "task-agent-run-id" }
      ]
    }
  }
}
```

Segment rules:

- the first segment must be `member`;
- `member` selects a structural member by `member_route_key` /
  `memberRouteKey` or `member_path` / `memberPath`;
- `task_team` selects one concrete delegated task-team execution by
  `task_team_run_id` / `taskTeamRunId` and must follow a member segment;
- `task_agent` selects one concrete delegated task-agent execution by
  `task_agent_run_id` / `taskAgentRunId`, must follow a member segment, and must
  be terminal.

Existing structural payloads remain accepted only as parser-bound compatibility
input and normalize to a one-segment `member` conversation address:

- `target_member_path` / `targetMemberPath`: array of path segments, for
  example `["research", "writer"]`
- `target_member_route_key` / `targetMemberRouteKey`: normalized route key, for
  example `research/writer`

Clients must not mix a nested `conversation_target_address` with flat
`target_member_*` selectors. Scalar command target aliases are not accepted.
Payloads containing `target_member_name`, `targetMemberName`,
`target_agent_name`, `targetAgentName`, command-side `agent_name`,
command-side `agentName`, command-side `agent_id`, command-side `agentId`, or
`member_name`/`memberName` as a target must fail with an invalid-target
response. A stale, inactive, malformed, or mismatched runtime segment also fails
as an invalid target and must not fall back to a structural member or the
coordinator.

Control commands remain active-only:

- `INTERRUPT_GENERATION`
- `APPROVE_TOOL`
- `DENY_TOOL`

Those commands intentionally require an already-active runtime lookup and do not call the restore path. Clients should not treat interrupt/approval messages as a way to resume a stopped run; standalone stopped-run recovery is owned by backend `SEND_MESSAGE`, while team stopped-run recovery is owned by the team resolve/restore path and team `SEND_MESSAGE`.

Tool approval and denial target the agent that produced the pending approval
request. Preferred team payload identity is the source identity emitted with the
event:

- `source_path` / `sourcePath`, `member_path` / `memberPath`, or
  `target_member_path` / `targetMemberPath`
- `source_route_key` / `sourceRouteKey`, `member_route_key` /
  `memberRouteKey`, or `target_member_route_key` / `targetMemberRouteKey`

For a task-team scoped child approval, the payload must also include
`task_team_run_id` / `taskTeamRunId` and must use the relative child selector
emitted by the backend: `task_team_relative_member_path` /
`taskTeamRelativeMemberPath` or `task_team_relative_member_route_key` /
`taskTeamRelativeMemberRouteKey`. A nested task-agent approval may additionally
round-trip `task_agent_run_id` / `taskAgentRunId` as the concrete run guard.

Scalar name/id fields (`agent_name`, `agentName`, `member_name`,
`memberName`, `target_member_name`, `targetMemberName`, `target_agent_name`,
`targetAgentName`, `agent_id`, and `agentId`) are rejected as approval command
targets. The client must round-trip the route/path identity emitted with the
approval request event. An approval request aimed at a subteam member rather
than a leaf agent is rejected by the runtime unless it is accompanied by the
required task-team scoped child identity.

Team interrupt uses a stricter command shape than single-agent interrupt. A
client sending `INTERRUPT_GENERATION` to `/ws/agent-team/:teamRunId` must include
`payload.target_member_path` / `targetMemberPath` or
`payload.target_member_route_key` / `targetMemberRouteKey`. It may also include
`payload.target_member_run_id` / `targetMemberRunId`, but that value is only a
guard for the expected member run id; it is never the authoritative selector.
The server rejects missing target selectors and route-key/run-id mismatches
without invoking a member runtime and without falling back to aggregate team
interruption. The single-agent `/ws/agent/:runId` command remains a no-payload
`INTERRUPT_GENERATION`.

Approval commands are active-turn control commands, not queued runtime input.
For native AutoByteus single-agent runs, `APPROVE_TOOL` / `DENY_TOOL` delegate
to the active run backend and then to the agent's public
`postToolExecutionApproval(...)` boundary. For native team runs, the team
backend resolves the target member and routes the decision through that member
agent's public approval API via the async team event path. If `task_team_run_id`
is present, the parent team first resolves that active task-team child run and
then resolves the relative child selector inside it before invoking the child
member runtime. The backend may publish approval status/projection events after
a valid decision, but
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

- Missing single-agent run identities emit `AGENT_NOT_FOUND` and close with `4004`.
- Missing or unrestorable team runs emit `TEAM_NOT_FOUND` and close with `4004`.
- Runs that resolve but cannot expose a stream subscription emit `AGENT_STREAM_UNAVAILABLE` or `TEAM_STREAM_UNAVAILABLE` and close with `1011`.
- Unknown client message types are logged and ignored instead of changing run state.

## Operational Notes

- Session lifecycle is tied to socket lifecycle.
- Errors are logged and emitted as terminal stream events.
- Managers are singleton-backed and shared across requests. Single-agent stream handlers depend on the status-projection and command-coordinator boundaries for identity/status/activation, while team stream handlers depend on the team run-service boundary for restore and active lookup.
