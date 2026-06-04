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

Terminal behavior is rooted in the resolved filesystem cwd, not workspace materialization. Callers may provide an explicit `cwd` / `rootPath` for a workspace/root target; when both are omitted, the WebSocket route resolves the cwd to the backend server process user's home directory. Terminal sessions remain independent of File Explorer watcher lifecycle and do not create workspace metadata for the default-home path.
