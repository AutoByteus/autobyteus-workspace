# Terminal

## Scope

Terminal WebSocket session management, interactive PTY stream forwarding, and lifecycle cleanup for desktop/workspace terminal surfaces.

## TS Source

- `src/api/websocket/terminal.ts` — Fastify WebSocket route, `cwd`/`rootPath` resolution, remote-access authorization, close-before-connect cleanup.
- `src/services/terminal-streaming/terminal-handler.ts` — WebSocket message parsing, read loop, input/resize forwarding, disconnect handling.
- `src/services/terminal-streaming/pty-session-manager.ts` — session registry, startup abort handling, and session cleanup.
- `autobyteus-ts/src/tools/terminal/session-factory.ts` — platform-specific interactive terminal backend selection.
- `autobyteus-ts/src/tools/terminal/isolated-pty-session.ts` — macOS isolated PTY helper-process backend.
- `autobyteus-ts/src/tools/terminal/isolated-pty-bridge-source.ts` — helper-process bridge that owns `node-pty` and shell descriptors.
- `autobyteus-ts/src/tools/terminal/node-pty-bootstrap.ts` — packaged `node-pty` `spawn-helper` executable-permission repair.

## Runtime Model

The frontend opens `/ws/terminal/{sessionId}?cwd={encodedRootPath}` or `/ws/terminal/{sessionId}?rootPath={encodedRootPath}` for an explicit filesystem root. The backend canonicalizes the requested path and rejects the connection before creating a terminal session if the path is unavailable or is not a directory.

Terminal sessions are root-path scoped. They are not tied to file-explorer tree materialization and do not start file-explorer watchers. The `workspaceId` value passed through the streaming service is the resolved root path used to group and close sessions; it is not a request to create or initialize a workspace.

## WebSocket Lifecycle

1. The route authorizes remote access for the WebSocket request.
2. It resolves and validates `cwd` / `rootPath`.
3. `TerminalHandler.connect()` asks `PtySessionManager` to create the PTY session.
4. The handler starts a read loop that forwards PTY output as base64 JSON messages.
5. Client input and resize messages are forwarded to the active session.
6. WebSocket `close`/`error`, startup abort, invalid cwd, and late connect completion all call the same cleanup path.

Important cleanup guarantees:

- A session is registered before async startup and removed if startup fails or is aborted.
- Closing before startup completes aborts startup, closes any partial session, and disconnects any late-created session.
- Disconnect removes the read-loop task, closes the PTY backend, and waits for the loop to exit.
- Invalid or missing cwd closes the WebSocket without creating a PTY session.

## Interactive Backend Selection

`autobyteus-ts` selects the interactive session backend by platform:

| Platform | Primary backend | Notes |
| --- | --- | --- |
| Android / Termux | `DirectShellSession` | Direct shell backend for Android-style environments. |
| Windows | `WslTmuxSession` | WSL/tmux-backed interactive session. |
| macOS / Darwin | `IsolatedPtySession` | Helper child process owns `node-pty`, the PTY descriptors, and the interactive shell. |
| Other Unix-like systems | `PtySession` | Parent-process `node-pty` backend, with direct-shell fallback. |

For macOS, `IsolatedPtySession` keeps `node-pty` file descriptors out of the long-lived server process. The server owns only the helper child pipes/IPC; the helper owns the PTY and exits on close. The session first repairs the packaged `node-pty` `spawn-helper` executable bit when needed, then starts the bridge process with `TERM=xterm-256color` and a deterministic prompt.

The close path asks the helper to close over IPC, ends stdin, waits briefly, then escalates to `SIGTERM` / `SIGKILL` if needed and destroys the helper streams. This prevents repeated normal close and close-before-connect cycles from leaving `/dev/ptmx`, `/dev/ttys`, revoked PTY, or child-process residue in the server process.

## Protocol Summary

Client-to-server messages:

```json
{ "type": "input", "data": "<base64>" }
{ "type": "resize", "rows": 24, "cols": 80 }
```

Server-to-client messages:

```json
{ "type": "output", "data": "<base64>" }
{ "type": "error", "message": "..." }
```

## Validation Expectations

Durable validation should keep covering:

- invalid cwd rejection before PTY creation;
- attached terminal command output and normal disconnect cleanup;
- close-before-connect / early-close cleanup;
- macOS descriptor pressure for repeated Terminal WebSocket churn;
- absence of child-process and PTY descriptor residue after churn;
- packaged `node-pty` `spawn-helper` executable-permission repair;
- no accidental file-explorer watcher acquisition from terminal-only paths.

Representative tests and evidence:

- `autobyteus-server-ts/tests/e2e/terminal/terminal-websocket-lifecycle.e2e.test.ts`
- `autobyteus-ts/tests/unit/tools/terminal/isolated-pty-session.test.ts`
- `autobyteus-ts/tests/unit/tools/terminal/node-pty-bootstrap.test.ts`
- `autobyteus-ts/tests/integration/tools/terminal/isolated-pty-session.test.ts`
- Ticket validation report `tickets/codex-agent-spawn-ebadf-root-cause/api-e2e-validation-report.md`
