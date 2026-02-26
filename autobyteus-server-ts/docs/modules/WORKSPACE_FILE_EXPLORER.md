# Workspace File Explorer

## Scope

Interaction boundary between workspace lifecycle and file explorer session streaming.

## TS Source

- `src/workspaces/workspace-manager.ts`
- `src/services/file-explorer-streaming/file-explorer-stream-handler.ts`
- `src/services/file-explorer-streaming/file-explorer-session-manager.ts`
- `src/api/websocket/file-explorer.ts`

## Notes

Temp workspace creation is startup-initialized and reused via fixed workspace ID.
