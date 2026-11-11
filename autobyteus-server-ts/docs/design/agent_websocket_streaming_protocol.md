# Agent WebSocket Streaming Protocol (TypeScript)

## Scope

Defines current chat WebSocket message ownership (standalone Agent, AgentTeam,
AgentOrg and delegated agents) after provider normalization and canonical
`AgentRun` lifecycle admission. It covers transport identity, strict Team DTOs,
commands, segment/error semantics, presentation cadence, and close behavior.

## Endpoints

- standalone Agent: `/ws/agent/:runId` (the Agent's own chat);
- AgentTeam: `/ws/agent-team/:teamRunId` (`@autobyteus/team-stream-contracts`);
- AgentOrg: `/ws/agent-org/:orgRunId`, and
- delegated agents of a standalone run: `/ws/agent-collaboration/:hostRunId`,
  both with the `ROOT_EXECUTION_EVENT` envelope of
  `@autobyteus/collaboration-stream-contracts`.

The Team, Org and delegated-agent streams are **sequenced**: every root event a
frame carries has the root's `change_sequence`, and clients require every
sequence after their snapshot's `base_change_sequence` exactly once and in order
(a gap or reorder makes them reopen). The standalone stream is not sequenced.

A root's change sequence belongs to its event publisher and starts at 0 for each
one: a stop and resume, or a server restart, starts another. Every snapshot (and
the active view a GraphQL inspection returns) therefore names its sequence with
`live_sequence_id`; a stored view carries `null`. With it comes
`last_message_change_sequence`: the sequence of the root's latest message event
through the base (0 when none; `null` in a stored view). Each root's publisher
is given its message predicate (`isStandaloneRootMessageEvent`,
`isAgentOrgMessageEvent`, `isTeamRunMessageEvent`): the events a client adds to
its participant message lists. The Team open read (`getTeamRunResumeConfig`)
gives a running Team's `liveSequenceId`, `baseChangeSequence` and
`lastMessageChangeSequence`, read together from its publisher (`null`, `0` and
`null` when the Team is not running). Clients compare sequence numbers
only within one `live_sequence_id` (autobyteus-358: the Team tab keeps its loaded
message lists across a reconnect only within one).

A WebSocket session is a transport subscriber. It does not own provider parsing,
turn/segment lifecycle, persistence, Team topology, task delegation, or runtime
identity.

## Core Components

- `src/services/agent-streaming/agent-stream-handler.ts`
- `src/services/agent-streaming/agent-team-stream-handler.ts`
- `src/services/agent-streaming/agent-org-stream-handler.ts`
- `src/services/agent-streaming/agent-collaboration-stream-handler.ts`
- `src/services/agent-streaming/agent-run-event-message-mapper.ts`
- `src/services/agent-streaming/team-agent-event-websocket-projector.ts`
- `src/services/agent-streaming/team-agent-status-websocket-projector.ts`
- `src/services/agent-streaming/team-execution-view-projector.ts`
- `src/services/agent-streaming/team-remote-event-projector.ts`
- `src/services/agent-streaming/team-agent-run-command-parser.ts`
- `src/services/agent-streaming/team-interrupt-generation-command-handler.ts`
- `src/services/agent-streaming/team-tool-approval-command-handler.ts`
- `src/services/agent-streaming/websocket-egress`
- `@autobyteus/team-stream-contracts`
- `@autobyteus/collaboration-stream-contracts`

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

A Team member is identified on the wire by its **AgentRun ID** (`agent_run_id`),
which is unique within the WebSocket-bound root TeamRun: a configured member, a
delegated task Agent and an Agent inside a delegated task Team all have their
own. Every Agent-originated Team message carries the member's `agent_run_id`
beside the root's `change_sequence`; every Team command names its target by
`agent_run_id`. Where the member sits (its address, its task-Team chain) is read
from `execution_tree` in the view, not repeated on each message.

The server resolves a command's `agent_run_id` only inside the connected root
TeamRun. A missing, malformed or foreign run ID is refused with
`INVALID_TARGET`; it is never retargeted to a coordinator, name or path. No Team
wire message or command uses member/source paths, route keys, task-instance IDs,
execution-kind aliases, generated identity, or name targets.

## Team Server Messages

`@autobyteus/team-stream-contracts` is the strict DTO authority. Server messages
include:

- Agent events: system instructions, turn, segment, Agent status, compaction,
  input state, token usage, assistant completion, tool lifecycle/log, background
  task, task notification, artifact, and file change, each the root-neutral Agent
  payload plus `change_sequence` and the member's `agent_run_id`; reply text
  leaves as `SEGMENT_CONTENT_BATCH` (see Segment Contract);
- Team-only events: `TASK_EXECUTION_STARTED {change_sequence, parent_team_run_id,
  execution}` (a delegated task Agent or task Team committed under its host
  TeamRun; the execution carries nullable `delegator_agent_run_id`),
  `TASK_EXECUTIONS_CLOSED` (task executions whose Task became DONE or CANCELLED; see below),
  `TASK_EXECUTIONS_REOPENED` (closed task executions their assigner
  reactivated; see below), `DELEGATED_LAUNCH_SELECTIONS_CHANGED` (saved model
  choices of delegated copies, by `agent_run_id` or `team_run_id`),
  `TEAM_COMMUNICATION_MESSAGE` (a message between members, by
  `sender_agent_run_id` and `receiver_agent_run_id`), `MEMBER_INPUT_MESSAGE` (an
  input a member received, by `recipient_agent_run_id` and nullable
  `sender_agent_run_id`), and `REMOTE_TASK_EXECUTION_STARTED` /
  `REMOTE_TASK_EXECUTION_SUMMARY` (runs delegated to other nodes);
- the view: `TEAM_EXECUTION_VIEW_SNAPSHOT` (`root_team_run_id`,
  `base_change_sequence`, `live_sequence_id`, `last_message_change_sequence`,
  `execution_tree`, the required `closed_task_executions`, `agent_statuses`,
  `agent_input_states`, `remote_task_executions`; no message log, autobyteus-358);
- control: `CONNECTED {session_id, root_team_run_id}`, `TEAM_RUN_LIFECYCLE
  {is_active}`, `AGENT_COMMAND_ACK`; and
- `ERROR`, with nullable `change_sequence` and `agent_run_id`: correlated to one
  member run, or uncorrelated when both are null.

Unknown fields and invalid union combinations are rejected. The browser parses
the same shared schema before mutating application state.

### Closed task executions (Task DONE or CANCELLED)

The execution tree is never filtered: every task execution stays in
`execution_tree`, so message participants and history keep their identities.
Closure is a separate fact beside the tree:

- `closed_task_executions` in the snapshot lists, as `{agent_run_id}` or
  `{team_run_id}` references, the root's task executions whose Task is DONE or CANCELLED. It is
  read at the same point as the tree, so it is consistent with
  `base_change_sequence`.
- `TASK_EXECUTIONS_CLOSED {change_sequence, task_executions}` is a sequenced
  event (a non-empty list of the same references). When DONE asks an active root
  to stop a Task's runs, the root publishes the released runs that are closed and
  present in its tree **before** it stops them, whatever the stop outcome. A
  repeated DONE re-publishes the same references; applying them again is a no-op.
- `TASK_EXECUTIONS_REOPENED {change_sequence, executions: [{parent_team_run_id, execution}]}`
  carries each reopened execution's record and host Team run, as
  `TASK_EXECUTION_STARTED` does (autobyteus-469 D-8). After the Task is moved out of DONE or
  CANCELLED, the run that assigned the work can reactivate one assignment by messaging its
  run ID (a Team copy's coordinator), or give it another Task by its run ID. A run whose
  stop was confirmed has left the root's tree; it is added back from its own file, and the
  root publishes its record after the Task-side commit and before the message is delivered.
  A Team view that does not hold the execution (it was loaded after the run left the tree)
  inserts it from the record; one that holds it keeps it. Both remove it from their closed
  set, so the execution is listed again. Its helpers keep their own closed references and
  stay hidden. Snapshots and stored reads no longer include it in
  `closed_task_executions`. See
  [Reactivation](../modules/projects.md#reactivation).
- The Workspaces tree leaves out each closed task execution and everything under
  it. Other Team surfaces keep listing them.
- Stored reads carry the same list: the Team resume config (`closedTaskExecutions`
  beside `executionTree`). A root that was not active at DONE shows the closure on
  its next read.

## Segment Contract

The finite segment type vocabulary is:

```text
text | tool_call | write_file | edit_file | run_bash | reasoning | media
```

Team segment events carry the member's `change_sequence` and `agent_run_id`:

```text
SEGMENT_START   { change_sequence, agent_run_id, segment_id, turn_id, segment_type, metadata }
SEGMENT_CONTENT { change_sequence, agent_run_id, segment_id, turn_id, segment_type, delta }
SEGMENT_END     { change_sequence, agent_run_id, segment_id, turn_id, metadata,
                  interrupted, reason, failed, error }
```

`SEGMENT_CONTENT` is what the Team socket's egress receives. On the wire, reply
text of the sequenced streams leaves only as a content batch (see Client-Bound
Content Cadence):

```text
Team:          SEGMENT_CONTENT_BATCH { change_sequence, change_sequence_through,
                                       items: [{ agent_run_id, segment_id, turn_id, segment_type, delta }] }
Org, agents:   ROOT_EXECUTION_EVENT  { root_subject_kind, root_run_id, change_sequence, change_sequence_through,
                                       event: { kind: "agent_presentation_batch",
                                                items: [{ member_address, agent_run_id, message: SEGMENT_CONTENT }] } }
```

A batch covers the contiguous root sequences `[change_sequence,
change_sequence_through]` and has at least one item. `change_sequence_through`
exists only on batches; every other frame covers its one sequence.

Standalone transport exposes the equivalent canonical Agent payload. A turn is
required for every segment event. Type is required on start and content but is
not repeated on end.

The type on content is derived by the run-owned lifecycle from the admitted
start. It is not provider padding and cannot be inferred by the Team adapter,
transport, application projection, memory, or browser. Missing IDs/turns,
unknown type, content/end without a start, conflicting type, ended-turn input,
and surplus source fields produce no segment mutation. At most one non-terminal
`AGENT_SEGMENT_LIFECYCLE_INVALID` diagnostic is sent per turn, only while that
turn is the run's current turn, with the message "Some of the agent's output in
this turn could not be shown."; the payload shape (`code`, `message`,
`error_scope: turn`, `error_effect: diagnostic`, `turn_id`) is unchanged.

Browser mutation uses exact turn plus segment ID and retains canonical type.
Existing-segment content requires type agreement. Canonical typed content may
create a late-subscriber segment. There is no ID-only lookup/removal,
type-plus-ID serialized key, missing-type text default, unknown-to-text mapping,
end-text recovery, or consumer-side missing-start synthesis.

## Turn, Status, And Error Evidence

Visible Agent status is `offline | initializing | idle | running | error`.
Turn lifecycle and status are owned upstream by `AgentRun`; Team root liveness is
separately emitted as `TEAM_RUN_LIFECYCLE {is_active}`. Transport connection,
root liveness, Agent status, delegated-child liveness, and open work are not
substitutes for one another.

Every canonical Agent error carries nullable evidence fields:

```text
error_scope:  "turn" | "runtime" | null
error_effect: "diagnostic" | "terminal" | null
turn_id:      string | null
```

The canonical error payload also requires a non-empty protocol `code`, separate
from the user-visible `message`. The message is the safe provider/runtime text
after secret redaction; transport must not replace a meaningful provider
message with a locally invented balance, quota, or authentication message.
Native standalone and Team wire payloads may additionally carry safe
`provider_status`, `provider_code`, `provider_request_id`, and redacted
`details`. Raw exceptions, stacks, causes, authorization headers, and secret
values never cross this boundary. The application-agent projector deliberately
narrows the same event to `{ type: "ERROR", message: string }` and does not
expose native/provider metadata.

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
historical activation, command overlay, typed command observation, activity
recording, and `SEND_MESSAGE` acknowledgement. After activation, the exact
AgentRun owns FIFO admission and provider dispatch selection. Multiple distinct
commands can be admitted; the transport does not impose a run-busy policy.

### Team `SEND_MESSAGE`

```text
{
  type: "SEND_MESSAGE",
  payload: {
    content,
    context_file_paths,
    image_urls,
    agent_run_id,
    message_id,
    dedupe_key,
    mentions?        // shared definitions the user @-mentioned; admitted before delivery
  }
}
```

`agent_run_id` must name a member run of the URL's root TeamRun; otherwise the
server answers `ERROR` with `INVALID_TARGET` and posts nothing. It never
retargets a stale or malformed ID. The exact member AgentRun owns admission and
may append or retain the entry according to its canonical turn and backend
capability.

### Team interrupt and tool decisions

`INTERRUPT_GENERATION` carries `{command_id,agent_run_id}`.
`APPROVE_TOOL` / `DENY_TOOL` carry `{invocation_id,agent_run_id,reason}`.
These controls are active-only and never restore stopped work.
`REFRESH_REMOTE_TASK_EXECUTIONS {}` asks the nodes of the Team's remote runs for
their summaries again.

`AGENT_COMMAND_ACK` for Team interrupt repeats the exact `command_id` and
`agent_run_id` with `accepted`, or `rejected` / `failed` with a `code` and
`message`. A client accepts the response only when both match its pending
command. Acceptance confirms request admission; later runtime events own
terminal status.

## Connection And Restore

A standalone connection binds to the durable run ID, emits `CONNECTED`, projects
current status, and subscribes if a runtime is active. It does not restore or
start the runtime. A Team connection resolves through
`TeamRunService.resolveActiveTeamRun(...)`, because the Team container owns
supported restore. It may restore an unmanaged persisted root, but it does not
create a replacement while the exact root is still manager-owned and
stopping/non-command-active. Team event and lifecycle listeners bind before a
fresh snapshot is read, preventing create/restore/termination races.

If a send materializes or restores a runtime, the existing socket is rebound to
that stream. Command overlays remain until command-correlated runtime evidence
or coordinator failure replaces them.

Manager lookup distinguishes a command-**active** root from a **managed** root
still owned during initialization, Stop, or a nonterminal Stop failure. The
wire `TEAM_RUN_LIFECYCLE {is_active}` reports manager ownership, remains true
through Stop, and becomes false only after exact unregister. Leaf
`AGENT_STATUS: offline` is not root terminality.

Stop and permanent history deletion are not one protocol operation. Stop
terminates the exact admitted recursive runtime and retains its stored history;
only after authoritative terminal inactivity may the user separately confirm
Delete on the `READY` history row through the GraphQL/history catalog boundary.
The Team WebSocket defines no Delete command, combined confirmation, or
stop-then-delete sequence.

## Client-Bound Content Cadence

Every chat socket sends through its own presentation-only egress
(`AgentStreamWebSocketEgress`), after the root's snapshot barrier. The first
pending content opens a fixed window using
`AUTOBYTEUS_STREAMING_CONTENT_FLUSH_INTERVAL_MS` (the Live response streaming
setting; default 500 ms, range 100–2,000 ms). A changed setting applies to the
next newly opened window.

Standalone `/ws/agent` (unsequenced):

- adjacent content coalesces only when every payload field except `delta` is
  deeply equal, so exact execution/turn/segment/type identity remains distinct;
- `CONNECTED`, acknowledgements, token usage and running/initializing status
  pass immediately without sealing or resetting pending content; exact repeated
  statuses are suppressed; and
- lifecycle, tool boundaries, errors, terminal status, completion,
  interruption, and unknown types flush earlier content first.

`AGENT_INPUT_STATE` is sent only for a revision the subscriber has not yet
received (its subscribe snapshot counts), so routine event batches do not end a
window early; a new revision is a boundary that flushes earlier content first.

Team, Org and delegated agents (sequenced). Nothing may leave a sequence
uncovered or overtake earlier sequences, so the rules differ:

- while a window is open, content of any agents and segments joins one pending
  batch with one ordered item per content identity (agent run, turn, segment,
  type), in order of first appearance; each item's text stays in order;
- a status identical to the last status this connection forwarded or absorbed
  for the same agent run (the routine "running" before every delta) is
  absorbed into the batch's range while a batch is pending; with no pending
  batch, or with no earlier status on this connection, it is forwarded;
- at the window's end, or when any other sequenced message or a sequence that
  does not continue the range arrives, the batch leaves as one frame covering
  everything it absorbed; the other message follows it;
- only `CONNECTED` and `AGENT_COMMAND_ACK` (unsequenced) may pass a pending
  batch. Token usage, statuses that changed, `ERROR`, lifecycle and every other
  message flush it first; and
- clients apply a frame only when its first sequence is the next expected one,
  then continue after its last.

This cadence does not affect runtime listeners, memory, history, file-change
projection, application output, the Team lifecycle observer, inspections, or
Team adaptation: they read the root's events directly and unthrottled.

## Error And Close Semantics

- missing/unrestorable run: `AGENT_NOT_FOUND` or `TEAM_NOT_FOUND`, close `4004`;
- resolved run with unavailable stream: `*_STREAM_UNAVAILABLE`, close `1011`;
- malformed Team DTO or wrong/missing execution address: reject without
  compatibility repair;
- server-initiated close (an inactive root, a projection failure): the closing
  `ROOT_LIFECYCLE` or `ERROR` is sent through the egress, which sends pending
  text first, and then the socket closes. A root `lifecycle` event takes a root
  sequence but leaves as the unsequenced `ROOT_LIFECYCLE`; an inactive root
  ends the stream;
- socket loss: dispose connection-local cadence/status filter state; do not
  claim delivery or replay of unsendable buffered output.

## Related Documentation

- [Agent Streaming](../modules/agent_streaming.md)
- [Agent Execution](../modules/agent_execution.md)
- [Agent Team Execution](../modules/agent_team_execution.md)
- [Streaming Parsing Architecture](./streaming_parsing_architecture.md)
- [Run History](../modules/run_history.md)

## Background inspection is not a stream lifecycle

The typed `agentBackgroundTaskView(agentRunId)` GraphQL query provides a read-only
selected-run snapshot for Codex. It uses an observational published-run lookup
and exact-instance/active recheck, never restoring a run. Claude, Antigravity and
AutoByteus (native `run_bash` background commands and `&` jobs) use the
background-task stream (`BACKGROUND_TASK_UPDATED`) and its store instead. No new WebSocket
event, streamed task status, idle timer reset or process-control permission is
introduced. View-only `unknown` does not extend the streamed lifecycle enum.
