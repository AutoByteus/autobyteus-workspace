# Agent Streaming

## Scope

Bridges runtime stream events to GraphQL and WebSocket transport clients.

## TS Source

- `src/services/agent-streaming`
- `src/api/websocket/agent.ts`
- `src/api/graphql/types/agent-run.ts`
- `src/api/graphql/types/agent-team-run.ts`

## Operational Notes

- Team websocket fanout for team runs is handled in `src/services/agent-streaming/agent-team-stream-handler.ts`.
- Team metadata refresh work is intentionally coalesced there rather than executed on every streamed event so long workflow/team runs do not add one metadata write per event to the hot path.
