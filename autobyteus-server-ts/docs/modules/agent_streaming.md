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
- Runtime status is normalized at this transport boundary. Outbound `AGENT_STATUS` payloads are `{ status: "offline" | "initializing" | "idle" | "running" | "error", can_interrupt: boolean, agent_id?, agent_name? }`; outbound aggregate `TEAM_STATUS` payloads are `{ status: "offline" | "initializing" | "idle" | "running" | "error" }`. Startup tokens such as `bootstrapping`, `starting`, `startup`, `initializing`, and active `uninitialized` project as active non-interruptible `initializing`, not as `running` or `offline`. These status messages emit only the current `status` plus documented metadata.
- Team streams keep member and aggregate status separate: member `AGENT_STATUS` snapshots/events drive member rows, while `TEAM_STATUS` is aggregate-only and must not be fanned out to every member during startup, refresh, or recovery.
- Team aggregate status uses active-work precedence: `running` wins first, then `initializing`, then `error`, then `idle`, otherwise `offline`; this keeps stale member/native errors from hiding active startup or running work while still surfacing terminal errors when no member is active.
- Successful single-agent termination emits a terminal `AGENT_STATUS { status: "offline", can_interrupt: false, agent_id }` to existing subscribers before the run stream is torn down, so live clients do not have to infer termination only from socket close or a later history refresh.
- Single-agent `SEND_MESSAGE` is the recoverable chat command and must include `message_id` plus `dedupe_key`. The stream handler routes it through `AgentRunCommandCoordinator`, which owns idempotency, command-level `initializing`/`error` overlays, prepared-run activation or historical restore, runtime forwarding, and activity recording. The handler sends `AGENT_COMMAND_ACK` for accepted, duplicate, rejected, and failed outcomes; the acknowledgement may include the current status payload. When the coordinator materializes/restores an active runtime, the handler binds the existing WebSocket session to that runtime stream.
- Team `SEND_MESSAGE` remains team-container owned: the team handler resolves/rebinds the team run as needed, normalizes the member target, and records activity after acceptance.
- Team `SEND_MESSAGE` payloads are normalized to `TeamMemberSelector` at the
  WebSocket edge from `target_member_path` or `target_member_route_key` only.
  Scalar target aliases such as `target_member_name`, `target_agent_name`,
  command-side `agent_name`, command-side `agent_id`, and camelCase equivalents
  are rejected with invalid-target errors.
- Non-send control commands (`INTERRUPT_GENERATION`, `APPROVE_TOOL`, and `DENY_TOOL`) stay active-only. They use the current in-memory runtime lookup and do not restore stopped runs as a side effect, so stale control commands cannot accidentally resurrect a stopped run.
- Team tool approvals must target the emitted `source_path` /
  `source_route_key` or `member_path` / `member_route_key` for the requesting
  agent. Scalar name/id aliases, including command-side `agent_name` and
  `agent_id`, are rejected instead of being mapped back to member paths.
- Team `INTERRUPT_GENERATION` is member-targeted. The team payload must include `target_member_path` / `targetMemberPath` or `target_member_route_key` / `targetMemberRouteKey` and may include `target_member_run_id` / `targetMemberRunId` as an optional stale-target guard. Missing targets and route-key/run-id mismatches are rejected; team interrupt must not fall back to an aggregate/team-wide stop. Single-agent interrupt remains the separate no-payload `INTERRUPT_GENERATION` command on `/ws/agent/:runId`.
- Tool approval commands route through the active runtime's public approval boundary. Single-agent AutoByteus approval uses `Agent.postToolExecutionApproval(...)`; team approval resolves the member and calls that member agent's public approval API through the async team event path. Approval status/projection events remain stream output only: stale/no-active/no-pending/interrupted approvals must not be queued as runtime input, start a new turn, restore a stopped run, or bypass member runtime state. Native approval requires an actual pending-approval marker; active auto-executing tool-batch membership alone is not enough authority for `APPROVE_TOOL` / `DENY_TOOL`.
- Team member input is emitted as `EXTERNAL_USER_MESSAGE` from backend
  `MEMBER_INPUT` events. Those payloads carry stable message/dedupe identity,
  input origin, recipient member path/route key, optional sender identity, and
  context-file locators so nested child transcripts show inbound prompts before
  the responding assistant output.
- `INTERRUPT_GENERATION` is a control request, not a send-readiness signal. Clients should leave the affected run/member in a sending or interrupted-in-flight state until the backend stream emits the terminal lifecycle/status projection (`TURN_COMPLETED`, `AGENT_STATUS { status: "idle", can_interrupt: false }`, or an error path) for that turn. Claude Agent SDK sessions in particular emit that projection only after their active query has been aborted/closed and the per-turn cleanup task has settled, so same-run follow-up chat does not reuse stale SDK process resources.
- Segment order and segment identity are backend-owned. WebSocket handlers forward `SEGMENT_*` events in runtime emission order for both single-agent and team streams; clients should append/coalesce only when the backend-provided `segment_type` and `id` identify the same provider text or tool segment, not by turn-level heuristics or provider-specific UI repair logic.
- `turn_id` is the canonical turn field for all outbound `SEGMENT_*` payloads. Native AutoByteus conversion strips segment-level `turnId` aliases; the WebSocket mapper normalizes any tolerated legacy alias back to `turn_id` before clients see it.
- Runtime errors terminalize open segments before the error projection. Interrupt paths use `interrupted: true` / `reason`, while non-interrupt LLM stream failures use `failed: true` / `error`; clients should render failed partial tool segments as terminal error rows, not as runnable invocations.
- Missing or unrestorable runs close the socket with the subject-specific not-found error (`AGENT_NOT_FOUND` or `TEAM_NOT_FOUND`) and close code `4004`. A resolved run whose event stream cannot be subscribed closes with `*_STREAM_UNAVAILABLE` and close code `1011`.
- Team websocket fanout for team runs is handled in `src/services/agent-streaming/agent-team-stream-handler.ts`.
- Nested team events expose `source_path` / `source_route_key`; agent events
  also expose `member_path` / `member_route_key`. Display-only aliases, if
  present, are not routing identity and are not accepted as command targets.
- Team metadata refresh work is intentionally coalesced there rather than executed on every streamed event so long workflow/team runs do not add one metadata write per event to the hot path. Accepted team follow-up messages still record run activity immediately through `TeamRunService.recordRunActivity(...)` so run history reflects the resumed active state.
