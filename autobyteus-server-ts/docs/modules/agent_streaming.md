# Agent Streaming

## Scope

Bridges runtime stream events to GraphQL and WebSocket transport clients.

## TS Source

- `src/services/agent-streaming`
- `src/services/agent-streaming/websocket-egress`
- `src/config/streaming-content-flush-interval-setting.ts`
- `src/api/websocket/agent.ts`
- `src/api/graphql/types/agent-run.ts`
- `src/api/graphql/types/agent-team-run.ts`

## WebSocket Content Egress

Each standalone or team WebSocket session owns one
`AgentStreamWebSocketEgress`, and every mapped post-session server message uses
that sink. The egress is a presentation-only pipeline between the
fine-grained canonical run-event stream and `connection.send(...)`; runtime
adapters, `AgentRun`/`TeamRun` publication, persistence, memory, raw traces, and
other internal subscribers remain unthrottled.

- The shared default composition runs mapped messages through ordered filters,
  one scheduler, the terminal serializer/sink, and isolated observers. Filters
  can only forward or suppress; the scheduler is the only control that can
  buffer or reorder by flushing; observers receive immutable outcomes and
  cannot change delivery. Standalone and team handlers use this same
  composition after team/member/task identity enrichment.
- `AgentStatusTransitionFilter` stores the last admitted `AGENT_STATUS` payload
  for each exact standalone, stable-team-member, task-agent, or task-team-leaf
  presentation identity. The first payload and every changed payload are
  forwarded; an exact deep-equal repeat for that identity is suppressed. An
  incomplete or inconsistent identity fails open rather than guessing. This
  cache is connection-local and is cleared on disposal, so reconnect still
  receives its fresh initial status snapshot. Canonical status companions and
  non-WebSocket subscribers are upstream of this filter and remain unchanged.
- A first pending `SEGMENT_CONTENT` message opens a fixed, non-sliding window.
  `AUTOBYTEUS_STREAMING_CONTENT_FLUSH_INTERVAL_MS` is resolved when the window
  opens, so a successful live setting change affects the next newly opened
  window on active and future sessions without restart. The effective default
  is 500 ms; persistence accepts only whole values from 100 through 2,000 ms,
  and absent/invalid direct configuration safely resolves to 500 ms.
- Adjacent content messages coalesce only when every payload field except
  `delta` is deeply equal. The sink clones the first payload, concatenates delta
  bytes in receipt order, and preserves distinct run/turn/segment/member/task
  identities as separate ordered groups.
- `CONNECTED`, `AGENT_COMMAND_ACK`, `TOKEN_USAGE_UPDATED`, and non-terminal
  `AGENT_STATUS initializing/running` are immediate companions. They remain
  visible without flushing, sealing, resetting, or otherwise changing the
  pending content lane/timer.
- Dependent or terminal messages flush all earlier pending content before being
  sent. This includes segment/tool/lifecycle boundaries, terminal statuses,
  errors, completion/interruption, and unknown message types, which default to
  correctness-first flush behavior.
- Disposing an already-lost/closed session cancels its timer and discards
  pending unsendable connection state. The transport does not claim replay for
  a physical socket loss; normal supported open-socket boundaries flush first.
- A bounded new presentation filter or observer is added by implementing its
  narrow control contract and registering one factory in
  `agent-stream-egress-control-composition.ts`. It must not introduce another
  scheduler, bypass the egress, or move lifecycle/status authority out of the
  canonical runtime pipeline.

## Operational Notes

- Single-agent WebSocket connection (`/ws/agent/:runId`) is identity/status-projection aware but does not restore or start the runtime by itself. The handler registers the connection for the durable run id, sends `CONNECTED`, and sends the current `AGENT_STATUS` projection from `AgentRunStatusProjectionService`. If an active runtime already exists, the handler also binds the session to its event stream. Team WebSocket connection (`/ws/agent-team/:teamRunId`) still resolves through `TeamRunService.resolveTeamRun(...)` because team restoration is owned by the team container.
- Stream handlers subscribe after runtime backends have run the normalized event batch through `AgentRunEventPipeline`. Clients therefore receive derived `FILE_CHANGE` events directly for the Artifacts path; there is no legacy file-change-update transport alias and stream handlers should not derive file changes from generic tool lifecycle payloads.
- Runtime status is normalized before this transport boundary. Outbound `AGENT_STATUS` payloads are `{ status: "offline" | "initializing" | "idle" | "running" | "error", can_interrupt: boolean, agent_id?, agent_name?, member_path?, member_route_key?, source_path?, source_route_key?, execution_kind?, task_agent_instance_id?, task_agent_run_id?, task_team_instance_id?, task_team_run_id?, task_id?, team_path?, team_route_key?, task_team_relative_member_path?, task_team_relative_member_route_key? }`. Startup tokens such as `bootstrapping`, `starting`, `startup`, `initializing`, and active `uninitialized` project as active non-interruptible `initializing`, not as `running` or `offline`. Root team liveness is a separate binary `TEAM_RUN_LIFECYCLE { team_run_id, is_active }` message owned by `AgentTeamRunManager`; it is not an aggregate member status and carries no interrupt authority.
- Agent lifecycle is turn-boundary owned: `running` means an authoritative turn is open; matching `TURN_COMPLETED` / `TURN_INTERRUPTED` settles a still-live runtime to `idle`; termination settles it to `offline`. Ordinary segment, tool, inter-agent, todo, or system-task traffic never establishes or reopens a turn. Delayed content for a retired turn remains on the stream, while any contradictory lifecycle projection for that old turn is rejected before subscriber fan-out. A newer turn is not closed by an older turn's delayed terminal event.
- Outbound `ERROR` payloads retain `source`/`code`, `message`, and optional details while adding lifecycle evidence when the runtime can classify it: `{ error_scope: "turn", error_effect: "diagnostic" | "terminal", turn_id: string }` or `{ error_scope: "runtime", error_effect: "terminal" }`. `turn_id` is required for turn-scoped evidence and must be absent for runtime-global evidence. Diagnostic and unclassified errors remain visible without settling lifecycle; only a matching turn-terminal or runtime-terminal classification can authorize `error`/command settlement.
- Team streams keep exact leaf-agent status and root liveness separate. Member `AGENT_STATUS` snapshots/events drive only the addressed leaf row. `TEAM_RUN_LIFECYCLE` drives only the root run's active/inactive state, while WebSocket connection state remains a separate client transport fact. Delegated task-agent `AGENT_STATUS` snapshots/events must include explicit task-agent identity; clients key the transient child execution by `task_agent_run_id` and the logical parent by member path/route key, not by generated run-id pattern matching.
- Delegated task-team child events and snapshots retain a `TaskTeamStreamScope` expressed in the enclosing `teamRunId` coordinate frame. Every ordinary parent boundary prefixes source/member/logical-team paths together and rebuilds route keys. The WebSocket mapper validates that frame and subtracts the logical-team prefix to emit `task_team_run_id` plus an exact relative child selector; it never repairs invalid frames or routes by structural team name alone. Task-team settlement removes the active task-team binding after accepted termination, so reconnect snapshots omit the settled transient execution rather than emitting a synthetic root status.
- Team stream binding subscribes to both the concrete `TeamRun` event stream and manager lifecycle before reading the fresh initial snapshot. Initial messages contain exact leaf `AGENT_STATUS` snapshots followed by `TEAM_RUN_LIFECYCLE`; the bind-before-read order prevents create/restore/termination transitions from being missed.
- Successful single-agent termination emits a terminal `AGENT_STATUS { status: "offline", can_interrupt: false, agent_id }` to existing subscribers before the run stream is torn down, so live clients do not have to infer termination only from socket close or a later history refresh.
- Single-agent `SEND_MESSAGE` is the recoverable chat command and must include `message_id` plus `dedupe_key`. The stream handler routes it through `AgentRunCommandCoordinator`, which owns idempotency, command-level `initializing`/`error` overlays, prepared-run activation or historical restore, runtime forwarding, and activity recording. `AGENT_COMMAND_ACK` is a discriminated union: its `SEND_MESSAGE` arm reports accepted/duplicate/rejected/failed outcomes and may include current status, while its `INTERRUPT_GENERATION` arm reports `accepted`/`rejected`/`failed` with the exact client `command_id` and target. When the coordinator materializes/restores an active runtime, the handler binds the existing WebSocket session to that runtime stream. Restored runtime readiness or a restored status snapshot does not replace the command overlay by itself; visible replacement waits for command-correlated evidence such as `TURN_STARTED`, command-correlated `AGENT_STATUS`, terminal/error events after handoff, or coordinator failure handling.
- Team `SEND_MESSAGE` remains team-container owned: the team handler resolves/rebinds the team run as needed, normalizes the conversation target, dispatches through the `TeamRun.postMessageToConversationTarget(...)` boundary, and records activity after acceptance.
- Team `SEND_MESSAGE` payloads are normalized to `ConversationTargetAddress` at
  the WebSocket edge. The canonical payload is `conversation_target_address` (or
  `conversationTargetAddress`) with a non-empty `segments` array rooted at the
  WebSocket-bound parent team run. Segment kinds are `member`
  (`member_route_key`/`member_path`), `task_team` (`task_team_run_id`), and
  `task_agent` (`task_agent_run_id`). Existing flat structural selectors
  `target_member_path` / `targetMemberPath` and `target_member_route_key` /
  `targetMemberRouteKey` are accepted only as compatibility input and normalize
  to a one-segment `member` address; flat selectors must not be mixed with a
  nested conversation address.
- Scalar target aliases such as `target_member_name`, `target_agent_name`,
  command-side `agent_name`, command-side `agent_id`, and camelCase equivalents
  are rejected with invalid-target errors. Missing, malformed, mismatched,
  stale, or inactive runtime segments are invalid targets and must not fall back
  to structural route keys or the coordinator.
- When a valid team `SEND_MESSAGE` target is supplied, the backend preserves the
  typed path and lets the mixed backend traverse structural members and exact
  runtime task-team/task-agent run ids before lazily starting/posting to the
  addressed participant.
- Non-send control commands (`INTERRUPT_GENERATION`, `APPROVE_TOOL`, and `DENY_TOOL`) stay active-only. They use the current in-memory runtime lookup and do not restore stopped runs as a side effect, so stale control commands cannot accidentally resurrect a stopped run.
- Team tool approvals must target the emitted `source_path` /
  `source_route_key` or `member_path` / `member_route_key` for the requesting
  agent. Task-team scoped child approvals must additionally include
  `task_team_run_id` and use `task_team_relative_member_path` /
  `task_team_relative_member_route_key` as the child selector; nested
  task-agent calls may also include `task_agent_run_id` as the stale-run guard.
  Scalar name/id aliases, including command-side `agent_name` and `agent_id`,
  are rejected instead of being mapped back to member paths.
- `INTERRUPT_GENERATION` is active-only, result-correlated control traffic. Both standalone and team payloads require a non-empty client `command_id`. Team interrupts additionally require `target_member_path` / `targetMemberPath` or `target_member_route_key` / `targetMemberRouteKey` and may include `target_member_run_id` / `targetMemberRunId` as an optional stale-target guard. The originating socket receives exactly one matching interrupt acknowledgement when it remains writable. Missing/inactive targets, route/run mismatch, provider rejection, and execution failure do not publish lifecycle; accepted acknowledgement likewise does not synthesize idle. The runtime's later terminal/status event owns readiness. Team interrupt never falls back to aggregate/team-wide stop.
- Tool approval commands route through the active runtime's public approval boundary. Single-agent AutoByteus approval uses `Agent.postToolExecutionApproval(...)`; team approval resolves the member and calls that member agent's public approval API through the async team event path. Delegated task-agent approval commands must preserve the emitted logical member route/path plus concrete `task_agent_run_id` so approval is routed to the active task-scoped runtime, not to the logical member template. Delegated task-team scoped approvals first resolve the active task-team run by `task_team_run_id`, then resolve the emitted relative child route/path inside that child team before calling the child member runtime. Approval status/projection events remain stream output only: stale/no-active/no-pending/interrupted approvals must not be queued as runtime input, start a new turn, restore a stopped run, or bypass member runtime state. Native approval requires an actual pending-approval marker; active auto-executing tool-batch membership alone is not enough authority for `APPROVE_TOOL` / `DENY_TOOL`.
- Team member input is emitted as `MEMBER_INPUT_MESSAGE` from backend
  `MEMBER_INPUT` events. Those payloads carry stable message/dedupe identity,
  input origin, recipient member path/route key, optional sender identity, and
  context-file locators so local sends and nested child transcripts preserve
  accepted user/input rows before the responding assistant output. True
  external-channel ingress remains on `EXTERNAL_USER_MESSAGE`; internal
  team/member accepted-input echoes must not be projected through the
  external-channel message boundary.
- Server-owned task-delegation system messages are the explicit exception to the
  member-input echo surface. Activation work packets, result-submitted notices,
  and revision-requested notices that are stamped by the task-delegation
  subsystem are still delivered to the runtime/model, but accepted mixed leaf
  delivery projects exactly one live `SYSTEM_TASK_NOTIFICATION` event using the
  task-delegation display-content metadata for the target conversation and does
  not also emit `MEMBER_INPUT_MESSAGE`. Activation display content is uniform for
  member and team targets and does not expose target kind/name labels. The
  AutoByteus runtime honors the paired generic suppression metadata so it does
  not emit a second runtime-originated system-task notification for the same
  server-owned payload.
- `INTERRUPT_GENERATION` is a control request, not a send-readiness signal. Clients should leave the affected run/member in a sending or interrupted-in-flight state until the backend stream emits the terminal lifecycle/status projection (`TURN_COMPLETED`, `AGENT_STATUS { status: "idle", can_interrupt: false }`, or an error path) for that turn. Claude Agent SDK sessions in particular emit that projection only after their active query has been aborted/closed and the per-turn cleanup task has settled, so same-run follow-up chat does not reuse stale SDK process resources.
- Segment order and segment identity are backend-owned. WebSocket egress
  preserves `SEGMENT_START`/`SEGMENT_END` boundaries and every content delta
  byte in runtime order for both single-agent and team streams while combining
  only exactly equal content identity payloads. Clients append each shaped
  message using the backend-provided `segment_type` and `id`; they must not add
  turn-level or provider-specific batching/reorder heuristics.
- `turn_id` is the canonical turn field for all outbound `SEGMENT_*` payloads. Native AutoByteus conversion strips segment-level `turnId` aliases; the WebSocket mapper normalizes any tolerated legacy alias back to `turn_id` before clients see it.
- Runtime errors terminalize open segments before the error projection. Interrupt paths use `interrupted: true` / `reason`, while non-interrupt LLM stream failures use `failed: true` / `error`; clients should render failed partial tool segments as terminal error rows, not as runnable invocations. Clients may display every `ERROR`, but must not infer run or member lifecycle from the presence of an error or later activity; use the canonical `AGENT_STATUS`, matching turn boundary, and structured `error_scope` / `error_effect` evidence instead.
- Missing or unrestorable runs close the socket with the subject-specific not-found error (`AGENT_NOT_FOUND` or `TEAM_NOT_FOUND`) and close code `4004`. A resolved run whose event stream cannot be subscribed closes with `*_STREAM_UNAVAILABLE` and close code `1011`.
- Team websocket fanout for team runs is handled in `src/services/agent-streaming/agent-team-stream-handler.ts`.
- Nested team events expose `source_path` / `source_route_key`; agent events
  also expose `member_path` / `member_route_key`. Task-agent-originated member
  events additionally expose `task_agent_instance_id`, `task_agent_run_id`, and
  `task_id`. Task-team-originated root and child events expose
  `execution_kind: "task_team"`, `task_team_instance_id`, `task_team_run_id`,
  `team_path` / `team_route_key`, and relative child identity when the event is
  inside the task-team child run. Display-only aliases, if present, are not
  routing identity and are not accepted as command targets.
- Team metadata refresh work is intentionally coalesced there rather than executed on every streamed event so long workflow/team runs do not add one metadata write per event to the hot path. Accepted team follow-up messages still record run activity immediately through `TeamRunService.recordRunActivity(...)` so run history reflects the resumed active state.
