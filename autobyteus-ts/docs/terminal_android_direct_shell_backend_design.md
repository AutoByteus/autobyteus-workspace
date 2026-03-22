# Android Direct-Shell Terminal Backend Design

## Context

`node-pty` is not a reliable Android runtime dependency. For Android support (`Termux + Node.js`), terminal tools use a direct-shell backend implemented with `child_process` pipes.

## Goals

- Keep existing terminal tool contracts unchanged.
- Support stateful shell execution on Android without PTY.
- Keep non-Android PTY preference unchanged while allowing shared startup recovery when PTY bootstrap fails.
- Centralize backend selection policy in one place.

## Non-goals

- Full PTY/TUI parity on Android.
- Replacing tool names or response schema.
- Changing WebSocket protocol.

## Concrete Design

### 1) Backend policy (`session-factory.ts`)

- Android detection:
  - `process.platform === "android"` OR
  - `ANDROID_ROOT`/`ANDROID_DATA` env markers.
- Selection matrix:
  - Android -> `DirectShellSession`
  - Windows -> `WslTmuxSession`
  - Other platforms -> `PtySession` (preferred backend), with shared startup recovery allowed to use `DirectShellSession` if PTY startup fails

This keeps Android behavior explicit and prevents PTY fallback on Android.

### 2) Session contract (`terminal-session.ts`)

All backends implement:

```ts
start(cwd) -> Promise<void>
write(data) -> Promise<void>
read(timeout?) -> Promise<Buffer | null>
resize(rows, cols) -> void
close() -> Promise<void>
isAlive: boolean
selectedShell?: string | null
```

Core and server terminal managers both depend on this shared contract.

### 3) Direct shell runtime (`direct-shell-session.ts`)

- Shell selection on Android:
  - prefer executable `bash` in `PATH`
  - fallback to executable `sh` (or `/system/bin/sh`)
- Spawn mode:
  - interactive shell (`bash --noprofile --norc -i` or `sh -i`)
  - stdio pipes (`stdin/stdout/stderr`)
- Output model:
  - both `stdout` and `stderr` are queued into one read stream
  - pending reads are resolved immediately when data arrives
- Resize:
  - no-op (pipes do not provide PTY resize semantics)

### 4) Command execution semantics (`terminal-session-manager.ts`)

- `executeCommand()` writes command to persistent shell session.
- Completion detection uses `PromptDetector` on buffered output.
- Exit code is fetched by a second command: `echo $?`.
- ANSI codes are stripped before returning `TerminalResult`.

This preserves stateful behavior (`cd`, environment changes) across calls.

### 5) Background process semantics (`background-process-manager.ts`)

- Starts a dedicated session per background process.
- Writes command once, then continuously reads output in a loop.
- Stores bounded output in ring buffer (`OutputBuffer`).
- `getOutput` returns cleaned recent lines and running state.
- `stopProcess` closes session and removes process handle.

### 6) Android packaging/runtime gate (workspace integration)

- `node-pty` is optional in core package dependency model.
- Android profile is verified by:
  - dependency graph probe (no `node-pty` resolution/link)
  - import probe (`import("node-pty")` must fail)
  - policy probe (`getDefaultSessionFactory()` must resolve `DirectShellSession`)

## Operational Notes

- Official Android profile is `Termux + Node.js`.
- Companion Android app `Termux:API` is required for hardware bridge commands.
- For Android bootstrap, use workspace-scoped install flow (server/core/gateway) to avoid desktop-only package postinstall paths on Android.
