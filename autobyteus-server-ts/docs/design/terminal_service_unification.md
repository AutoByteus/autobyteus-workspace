# Terminal Service Unification (TypeScript)

## Scope

Terminal interactions are exposed through a single websocket-facing terminal service stack.

## Components

- WebSocket route: `src/api/websocket/terminal.ts`
- Stream service:
  - `src/services/terminal-streaming/terminal-handler.ts`
  - `src/services/terminal-streaming/index.ts`

## Design Goals

- Keep terminal session management centralized.
- Keep transport adapter thin.
- Provide stable stream semantics independent of caller surface.

## Notes

Terminal behavior remains workspace-aware and integrates with workspace lifecycle from `src/workspaces`.
