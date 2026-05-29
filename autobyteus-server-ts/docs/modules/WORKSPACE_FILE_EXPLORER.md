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

Workspace/file-explorer acquisition is intentionally lazy. Snapshot GraphQL operations acquire a file explorer lease without starting a native watcher, while live File Explorer WebSocket sessions acquire a separate watcher lease. The final live watcher release logically stops the parent watcher and delegates native chokidar close to the watcher runtime child process so workspace/file-explorer cleanup does not block unrelated backend capabilities.
