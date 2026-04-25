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
- `SEND_MESSAGE` is the recoverable chat command. Before posting, stream handlers resolve the session run again, rebind event subscription to the restored runtime subject when needed, and then record the run/team as active after the message is accepted. This keeps follow-up chat working after local stop/termination or process restart when persisted metadata is still available.
- Non-send control commands (`STOP_GENERATION`, `APPROVE_TOOL`, and `DENY_TOOL`) stay active-only. They use the current in-memory runtime lookup and do not restore stopped runs as a side effect, so stale control commands cannot accidentally resurrect a stopped run.
- Missing or unrestorable runs close the socket with the subject-specific not-found error (`AGENT_NOT_FOUND` or `TEAM_NOT_FOUND`) and close code `4004`. A resolved run whose event stream cannot be subscribed closes with `*_STREAM_UNAVAILABLE` and close code `1011`.
- Team websocket fanout for team runs is handled in `src/services/agent-streaming/agent-team-stream-handler.ts`.
- Team metadata refresh work is intentionally coalesced there rather than executed on every streamed event so long workflow/team runs do not add one metadata write per event to the hot path. Accepted team follow-up messages still record run activity immediately through `TeamRunService.recordRunActivity(...)` so run history reflects the resumed active state.
