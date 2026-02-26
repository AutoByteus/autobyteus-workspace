# WebSocket Session Design

## Scope

Session handling and lifecycle across agent, team, terminal, and file-explorer sockets.

## TS Source

- `src/api/websocket`
- `src/services/agent-streaming`
- `src/services/terminal-streaming`
- `src/services/file-explorer-streaming`

## Notes

Session ownership is delegated to module-specific handlers to keep routing layer thin.
