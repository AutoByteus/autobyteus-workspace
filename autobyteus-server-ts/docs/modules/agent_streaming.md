# Agent Streaming

## Scope

Bridges runtime stream events to GraphQL and WebSocket transport clients.

## TS Source

- `src/services/agent-streaming`
- `src/api/websocket/agent.ts`
- `src/api/graphql/types/agent-run.ts`
- `src/api/graphql/types/agent-team-run.ts`

## Operational Notes

- Single-agent WebSocket connection (`/ws/agent/:runId`) is identity/status-projection aware but does not restore or start the runtime by itself. The handler registers the connection for the durable run id, sends `CONNECTED`, and sends the current `AGENT_STATUS` projection from `AgentRunStatusProjectionService`. If an active runtime already exists, the handler also binds the session to its event stream. Team WebSocket connection (`/ws/agent-team/:teamRunId`) still resolves through `TeamRunService.resolveTeamRun(...)` because team restoration is owned by the team container.
- Stream handlers subscribe after runtime backends have run the normalized event batch through `AgentRunEventPipeline`. Clients therefore receive derived `FILE_CHANGE` events directly for the Artifacts path; there is no legacy file-change-update transport alias and stream handlers should not derive file changes from generic tool lifecycle payloads.
- Runtime status is normalized at this transport boundary. Outbound `AGENT_STATUS` payloads are `{ status: "offline" | "initializing" | "idle" | "running" | "error", can_interrupt: boolean, agent_id?, agent_name?, member_path?, member_route_key?, source_path?, source_route_key?, execution_kind?, task_agent_instance_id?, task_agent_run_id?, task_team_instance_id?, task_team_run_id?, task_id?, team_path?, team_route_key?, task_team_relative_member_path?, task_team_relative_member_route_key? }`; outbound aggregate `TEAM_STATUS` payloads are `{ status: "offline" | "initializing" | "idle" | "running" | "error" }`. Startup tokens such as `bootstrapping`, `starting`, `startup`, `initializing`, and active `uninitialized` project as active non-interruptible `initializing`, not as `running` or `offline`. These status messages emit only the current `status` plus documented metadata.
- Team streams keep member and aggregate status separate: member `AGENT_STATUS` snapshots/events drive member rows, while `TEAM_STATUS` is aggregate-only and must not be fanned out to every member during startup, refresh, or recovery. Delegated task-agent `AGENT_STATUS` snapshots/events must include explicit task-agent identity; clients key the transient child execution by `task_agent_run_id` and the logical parent by member path/route key, not by generated run-id pattern matching. Delegated task-team root/status events must include `execution_kind: "task_team"` plus `task_team_run_id`/`task_team_instance_id`; child-member events inside that task-team run must also include `task_team_run_id` and a relative child selector so clients do not route by structural team name alone.
- Team aggregate status uses active-work precedence: `running` wins first, then `initializing`, then `error`, then `idle`, otherwise `offline`; this keeps stale member/native errors from hiding active startup or running work while still surfacing terminal errors when no member is active.
- Successful single-agent termination emits a terminal `AGENT_STATUS { status: "offline", can_interrupt: false, agent_id }` to existing subscribers before the run stream is torn down, so live clients do not have to infer termination only from socket close or a later history refresh.
- Single-agent `SEND_MESSAGE` is the recoverable chat command and must include `message_id` plus `dedupe_key`. The stream handler routes it through `AgentRunCommandCoordinator`, which owns idempotency, command-level `initializing`/`error` overlays, prepared-run activation or historical restore, runtime forwarding, and activity recording. The handler sends `AGENT_COMMAND_ACK` for accepted, duplicate, rejected, and failed outcomes; the acknowledgement may include the current status payload. When the coordinator materializes/restores an active runtime, the handler binds the existing WebSocket session to that runtime stream. Restored runtime readiness or a restored status snapshot does not replace the command overlay by itself; visible replacement waits for command-correlated evidence such as `TURN_STARTED`, command-correlated `AGENT_STATUS`, terminal/error events after handoff, or coordinator failure handling.
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
- Team `INTERRUPT_GENERATION` is member-targeted. The team payload must include `target_member_path` / `targetMemberPath` or `target_member_route_key` / `targetMemberRouteKey` and may include `target_member_run_id` / `targetMemberRunId` as an optional stale-target guard. Missing targets and route-key/run-id mismatches are rejected; team interrupt must not fall back to an aggregate/team-wide stop. Single-agent interrupt remains the separate no-payload `INTERRUPT_GENERATION` command on `/ws/agent/:runId`.
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
- Segment order and segment identity are backend-owned. WebSocket handlers forward `SEGMENT_*` events in runtime emission order for both single-agent and team streams; clients should append/coalesce only when the backend-provided `segment_type` and `id` identify the same provider text or tool segment, not by turn-level heuristics or provider-specific UI repair logic.
- `turn_id` is the canonical turn field for all outbound `SEGMENT_*` payloads. Native AutoByteus conversion strips segment-level `turnId` aliases; the WebSocket mapper normalizes any tolerated legacy alias back to `turn_id` before clients see it.
- Runtime errors terminalize open segments before the error projection. Interrupt paths use `interrupted: true` / `reason`, while non-interrupt LLM stream failures use `failed: true` / `error`; clients should render failed partial tool segments as terminal error rows, not as runnable invocations.
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
