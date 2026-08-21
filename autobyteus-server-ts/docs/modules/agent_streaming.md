# Agent Streaming

## Scope

Bridges canonical `AgentRunEvent` / `TeamRunEvent` streams to strict standalone
and Team WebSocket clients. Provider parsing, run-owned lifecycle admission,
Team execution correlation, transport projection, and presentation cadence are
separate boundaries.

## TS Source

- `src/services/agent-streaming`
- `src/services/agent-streaming/websocket-egress`
- `src/agent-execution/events`
- `src/agent-execution/events/processors/segment-lifecycle`
- `src/agent-team-execution/services/team-agent-event-adapter.ts`
- `@autobyteus/team-stream-contracts`
- `src/config/streaming-content-flush-interval-setting.ts`
- `src/api/websocket/agent.ts`
- `src/api/graphql/types/agent-run.ts`
- `src/api/graphql/types/agent-team-run.ts`

## Canonical Event Pipeline

Every runtime converts provider-native output into source `AgentRunEvent`s.
`AgentRun` serializes those batches through its per-run
`AgentRunEventDispatchQueue`, then the default `AgentRunEventPipeline` applies
canonical lifecycle admission and downstream processors before listener fanout.
Persistence, memory, file-change derivation, application producers, Team
adaptation, and WebSocket mapping consume only post-pipeline events.

The segment lifecycle is owned by exactly one non-persisted
`AgentSegmentLifecycleState` per `AgentRun`:

- identity is the compound `{ turnId, segmentId }`;
- type is the finite `text | tool_call | write_file | edit_file | run_bash |
  reasoning | media` vocabulary;
- provider source `SEGMENT_START` carries `id`, `turn_id`, and `segment_type`;
- provider source `SEGMENT_CONTENT` carries only `id`, `turn_id`, and `delta`;
- provider source `SEGMENT_END` carries `id`, `turn_id`, and terminal metadata;
- the lifecycle transformer admits a valid start, derives the canonical type
  onto each content event, and emits a type-less canonical end;
- a repeated identical active start or repeated end is an idempotent no-op;
- a missing start, retired turn, mismatched type, surplus source field, missing
  identity, or conflicting lifecycle emits `AGENT_SEGMENT_LIFECYCLE_INVALID`
  diagnostic evidence and no segment mutation; and
- matching turn terminal events, runtime-global terminal errors, offline/error
  status, or accepted run termination clear the applicable live lifecycle.

This state is live-only. Restore and history replay do not reconstruct or resume
partial segments. Consumers must not synthesize turns, IDs, types, missing
starts, end text, or provider-specific aliases.

Instruction transparency is a separate run-scoped semantic event, not a
segment. After a newly created strict raw trace is committed, Native, Claude,
and Codex normalize it to
`SYSTEM_INSTRUCTIONS_SUPPLIED { trace_id, content, ts }` with `statusHint: null`.
Native and Codex stage the newly created fact until the `AgentRun` listener is
bound, then publish it once before the first backend input. Claude publishes
after the SDK query is usable and persistence succeeds; a persistence failure
closes that query and emits no event. Reusing an unchanged active capture emits
no duplicate event. The runtime memory accumulator ignores this already-
persisted event so the WebSocket pipeline cannot write a second raw row.

## Team Stream Contract

The Team transport uses strict DTOs from `@autobyteus/team-stream-contracts`.
Every Agent-originated Team message carries one correlated `agent_execution`:

- `persistent_agent` for a persistent Team Agent;
- `task_agent` when `execution_address.task_agent_run_id` equals the real task
  AgentRun ID; or
- `task_team_agent` for an Agent inside a task Team, with the exact
  `agent_run_id` added because the address itself identifies the task-Team chain
  and member placement rather than that leaf AgentRun.

The nested execution coordinate is `TeamExecutionAddress`:

```text
{
  root_team_run_id,
  task_team_run_ids,
  member_address,
  task_agent_run_id
}
```

`member_address` is one canonical rooted AgentTeam address. The task-Team run ID
array records the concrete nested task-Team chain; `task_agent_run_id` is either
one concrete delegated AgentRun ID or `null`. The transport does not expose or
accept legacy member/source paths, route keys, task-instance IDs, represented
subteams, generated identity, or scalar target aliases.

`TeamAgentEventAdapter` verifies the AgentRun binding and maps post-pipeline
Agent events into the finite Team domain without owning lifecycle state. The
Team WebSocket projector then emits exact strict payloads. Segment start/content
carry required non-empty turns and the finite type; segment end carries the same
turn and ID without repeating type. `ERROR` carries required nullable
`error_scope`, `error_effect`, and `turn_id` evidence. Turn/runtime diagnostics
remain visible and non-terminal; only explicit terminal evidence can settle
lifecycle.

For `SYSTEM_INSTRUCTIONS_SUPPLIED`, Team transport preserves the exact common
`trace_id`, `content`, and `ts` payload and adds only the existing Team routing
envelope. The browser Team adapter removes that routing before using the same
common Activity handler as a standalone run. There is no Team-specific prompt
shape, redacted-content variant, turn identity, or compatibility alias.

## Commands And Connection

- Standalone WebSocket connection (`/ws/agent/:runId`) binds to the durable run
  identity and projects current status; it does not restore or start a runtime.
  `SEND_MESSAGE` routes through `AgentRunCommandCoordinator`, which owns
  idempotency, prepared/historical activation, command overlay, typed command
  lifecycle, and activity recording. The resolved AgentRun—not the coordinator
  or WebSocket—owns FIFO admission and start/append/wait dispatch selection.
- Team WebSocket connection (`/ws/agent-team/:teamRunId`) resolves through
  `TeamRunService.resolveActiveTeamRun(...)`, because supported restore belongs
  to the Team container. An unmanaged persisted root may be restored, but a
  manager-owned root that is stopping/non-command-active is not replaced. The
  handler subscribes to events and manager lifecycle before reading a fresh
  snapshot.
- Team `SEND_MESSAGE`, `INTERRUPT_GENERATION`, `APPROVE_TOOL`, and `DENY_TOOL`
  accept exactly one strict `execution_address`. The address root must equal the
  WebSocket-bound Team run. The backend follows the exact task-Team chain and
  member/task-Agent selection; it never falls back to a structural template,
  coordinator, name, path, route key, or generated ID.
- Team `SEND_MESSAGE` additionally carries content, context paths, image URLs,
  `message_id`, and `dedupe_key`, and dispatches through
  `TeamRun.executeMemberCommand(...)` to the same exact member AgentRun admission
  owner. Acceptance is input ownership, not provider completion.
- Team interrupts and tool decisions remain active-only. Interrupt
  acknowledgements echo the client `command_id` and exact execution address;
  the frontend accepts an acknowledgement only when both match its pending
  command.
- Manager lookup distinguishes a command-**active** root from a **managed** root
  that is still owned during initialization, Stop, or a nonterminal Stop
  failure. Root `TEAM_RUN_LIFECYCLE { is_active }` represents that manager
  ownership and stays true until exact unregister. It is separate from exact
  leaf `AGENT_STATUS`; an all-`offline` member projection does not make the root
  inactive. Connection state, root liveness, Agent lifecycle, task lifecycle,
  and open-work settlement must not be inferred from one another.
- Stop is a non-destructive exact-root lifecycle operation: it interrupts and
  terminates the admitted recursive runtime, retains Team history, and only
  then emits terminal inactive. Permanent Delete is not a WebSocket command.
  It is available only on the later inactive `READY` history row, requires a
  separate confirmation, and runs through the GraphQL/history catalog boundary.
  The transport never composes Stop and Delete.

## WebSocket Content Egress

Each standalone or Team session owns one `AgentStreamWebSocketEgress` between
canonical mapped events and `connection.send(...)`. Runtime publication,
persistence, memory, raw traces, and non-WebSocket subscribers remain
unthrottled.

- A first pending `SEGMENT_CONTENT` opens a fixed, non-sliding window using
  `AUTOBYTEUS_STREAMING_CONTENT_FLUSH_INTERVAL_MS` (default 500 ms; accepted
  range 100–2,000 ms).
- Adjacent content coalesces only when every payload field except `delta` is
  deeply equal. Exact run/execution, turn, segment, and type identity is
  therefore preserved.
- `CONNECTED`, acknowledgements, token usage, and non-terminal status can pass
  immediately without altering the pending content lane.
- Segment/tool/lifecycle boundaries, terminal statuses, errors, completion,
  interruption, and unknown message types flush earlier content first.
- Disposal of an already-lost socket cancels its timer and discards unsendable
  connection-local presentation state; the transport does not claim replay.

## Consumer Rules

- Browser state keys a segment by exact turn plus segment ID and retains the
  admitted canonical type. Existing-segment mutation requires type agreement.
  A late subscriber may create the exact typed segment from canonical content;
  missing/unknown type is rejected rather than treated as text.
- Content/end consumers must not read provider aliases or recover an omitted
  start. End resolution is exact turn plus segment ID and does not infer type.
- `RuntimeMemoryEventAccumulator` and run-history projection consume admitted
  canonical segment events and preserve tool/reasoning ordering without segment
  fallback.
- `SYSTEM_INSTRUCTIONS_SUPPLIED` is admitted directly to Activity by raw trace
  ID. It does not alter conversation, Event Monitor, lifecycle, or runtime
  status. Supported server/browser streaming debug modes log only its type,
  trace ID, timestamp, and derived Unicode code-point length; they must never
  serialize the instruction body to diagnostic output.
- `FILE_CHANGE`, Team Communication, task delegation, external messages,
  application events, and token usage retain their own canonical identities and
  do not become segment-lifecycle authorities.

## Failure And Close Semantics

Missing or unrestorable runs close with `AGENT_NOT_FOUND` or `TEAM_NOT_FOUND`
and code `4004`. A resolved run whose event stream cannot be subscribed closes
with the corresponding `*_STREAM_UNAVAILABLE` error and code `1011`. Invalid
Team messages fail strict parsing or return an execution-target error; they do
not trigger compatibility routing. Runtime diagnostics remain visible without
closing an open segment/tool or changing status, while turn-terminal and
runtime-global evidence follow their explicit lifecycle effects.
