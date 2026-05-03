# Agent Streaming

## Scope

Bridges runtime stream events to GraphQL and WebSocket transport clients.

## TS Source

- `src/services/agent-streaming`
- `src/api/websocket/agent.ts`
- `src/api/graphql/types/agent-run.ts`
- `src/api/graphql/types/agent-team-run.ts`

## Operational Notes

- WebSocket connection for both single-agent (`/ws/agent/:runId`) and team (`/ws/agent-team/:teamRunId`) streams resolves through the owning run service (`AgentRunService.resolveAgentRun(...)` or `TeamRunService.resolveTeamRun(...)`). If the run is persisted but not active in memory, the service attempts to restore it before the stream handler binds the session.
- Stream handlers subscribe after runtime backends have run the normalized event batch through `AgentRunEventPipeline`. Clients therefore receive derived `FILE_CHANGE` events directly for the Artifacts path; there is no legacy file-change-update transport alias and stream handlers should not derive file changes from generic tool lifecycle payloads.
- `SEND_MESSAGE` is the recoverable chat command. Before posting, stream handlers resolve the session run again, rebind event subscription to the restored runtime subject when needed, and then record the run/team as active after the message is accepted. This keeps follow-up chat working after local stop/termination or process restart when persisted metadata is still available.
- Non-send control commands (`STOP_GENERATION`, `APPROVE_TOOL`, and `DENY_TOOL`) stay active-only. They use the current in-memory runtime lookup and do not restore stopped runs as a side effect, so stale control commands cannot accidentally resurrect a stopped run.
- `STOP_GENERATION` is a control request, not a send-readiness signal. Clients should leave the affected run/member in a sending or interrupted-in-flight state until the backend stream emits the terminal lifecycle/status projection (`TURN_COMPLETED` / `AGENT_STATUS IDLE`, or an error path) for that turn. Claude Agent SDK sessions in particular emit that projection only after their active query has been aborted/closed and the per-turn cleanup task has settled, so same-run follow-up chat does not reuse stale SDK process resources.
- Segment order and segment identity are backend-owned. WebSocket handlers forward `SEGMENT_*` events in runtime emission order for both single-agent and team streams; clients should append/coalesce only when the backend-provided `segment_type` and `id` identify the same provider text or tool segment, not by turn-level heuristics or provider-specific UI repair logic.
- Missing or unrestorable runs close the socket with the subject-specific not-found error (`AGENT_NOT_FOUND` or `TEAM_NOT_FOUND`) and close code `4004`. A resolved run whose event stream cannot be subscribed closes with `*_STREAM_UNAVAILABLE` and close code `1011`.
- Team websocket fanout for team runs is handled in `src/services/agent-streaming/agent-team-stream-handler.ts`.
- Team metadata refresh work is intentionally coalesced there rather than executed on every streamed event so long workflow/team runs do not add one metadata write per event to the hot path. Accepted team follow-up messages still record run activity immediately through `TeamRunService.recordRunActivity(...)` so run history reflects the resumed active state.
