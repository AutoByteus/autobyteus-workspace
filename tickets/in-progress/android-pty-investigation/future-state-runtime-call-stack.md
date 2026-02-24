# Future-State Runtime Call Stacks (Debug-Trace Style)

## Metadata

- Version: `v7`
- Scope: `Large`
- Design Basis: `tickets/in-progress/android-pty-investigation/proposed-design.md` (`v7`)
- Requirements: `tickets/in-progress/android-pty-investigation/requirements.md` (`Refined`)

## Conventions

- Frame format: `path/to/file.ts:functionName(...)`
- Tags: `[ENTRY]`, `[ASYNC]`, `[STATE]`, `[IO]`, `[FALLBACK]`, `[ERROR]`

## Use-Case Coverage Status

| use_case_id | Primary | Fallback | Error |
| --- | --- | --- | --- |
| UC-001 | Yes | N/A | Yes |
| UC-002 | Yes | Yes | Yes |
| UC-003 | Yes | Yes | Yes |
| UC-004 | Yes | N/A | Yes |
| UC-005 | Yes | N/A | N/A |
| UC-006 | Yes | Yes | Yes |
| UC-007 | Yes | Yes | N/A |
| UC-008 | Yes | N/A | Yes |

## CS-001 (UC-001): Android Build/Install Excludes `node-pty` Hard Dependency

1. `[ENTRY]` `autobyteus-ts/package.json:(dependency resolution)`
2. `[STATE]` dependency model marks `node-pty` as non-mandatory for install profile.
3. `[STATE]` `scripts/android-bootstrap-termux.sh` runs Android-scoped workspace install (`autobyteus-ts`, `autobyteus-server-ts`, `autobyteus-message-gateway`) and excludes desktop-only package install paths.
4. `[ASYNC]` Android install/build executes dependency resolution.
5. `[FALLBACK]` if `node-pty` is unavailable, install/build still succeeds for Android profile.
6. `[ENTRY]` `scripts/verify-android-profile.sh:(verification execution)`
7. `[STATE]` verification checks dependency graph + runtime import behavior for `node-pty`, and probes backend resolution under Android markers.
8. `[ERROR]` if verification detects resolved/linked/importable `node-pty` or non-`DirectShellSession` selection, fail with explicit message.

## CS-002 (UC-002): `run_bash` on Android Uses Direct Shell

1. `[ENTRY]` `src/tools/terminal/tools/run-bash.ts:runBash(...)`
2. `[STATE]` `src/tools/terminal/tools/run-bash.ts:getTerminalManager(...)`
3. `[ASYNC]` `src/tools/terminal/terminal-session-manager.ts:ensureStarted(...)`
4. `[STATE]` `src/tools/terminal/session-factory.ts:getDefaultSessionFactory(...)`
5. `[STATE]` platform policy selects `DirectShellSession` on Android.
6. `[ASYNC]` `src/tools/terminal/direct-shell-session.ts:start(cwd)`
7. `[STATE]` shell selection attempts `bash` first in Termux profile.
8. `[FALLBACK]` if `bash` missing, switch to `sh`.
9. `[STATE]` no PTY fallback path is allowed on Android.
10. `[IO]` `TerminalSessionManager.executeCommand` writes command to shell stdin.
11. `[IO]` output read loop accumulates stdout/stderr bytes into output buffer.
12. `[STATE]` prompt/command completion detection determines command finished.
13. `[IO]` exit code extraction returns command result.
14. `[ERROR]` startup or shell spawn failure returns explicit terminal backend error.

## CS-003 (UC-003): Background Process Tools on Android Direct Shell

1. `[ENTRY]` `src/tools/terminal/tools/start-background-process.ts:startBackgroundProcess(...)`
2. `[ASYNC]` `src/tools/terminal/background-process-manager.ts:startProcess(...)`
3. `[STATE]` session factory selects `DirectShellSession` on Android.
4. `[IO]` command written to session stdin and detached read loop starts.
5. `[STATE]` process id returned to caller.
6. `[ENTRY]` `src/tools/terminal/tools/get-process-output.ts:getProcessOutput(...)`
7. `[IO]` output buffer returns recent lines.
8. `[ENTRY]` `src/tools/terminal/tools/stop-background-process.ts:stopBackgroundProcess(...)`
9. `[ASYNC]` process read loop stopped and session closed.
10. `[ERROR]` missing process id returns `not_found` contract response.

## CS-004 (UC-004): Non-Android PTY Path Preserved

1. `[ENTRY]` `src/tools/terminal/session-factory.ts:getDefaultSessionFactory(...)`
2. `[STATE]` if `win32` -> `WslTmuxSession`; else -> `PtySession`.
3. `[ASYNC]` `PtySession.start(...)` or `WslTmuxSession.start(...)` executes.
4. `[IO]` existing PTY behavior preserved for read/write/resize lifecycle.
5. `[ERROR]` PTY-specific initialization errors remain scoped to PTY environments.

## CS-005 (UC-005): Observability for Backend Selection

1. `[ENTRY]` terminal session manager/session factory initialization.
2. `[STATE]` selected backend and shell decision emitted in logs.
3. `[STATE]` diagnostics include backend type and shell executable.
4. `[STATE]` logging reads backend metadata via shared terminal session contract (`selectedShell` optional field).

## CS-006 (UC-006): Server Terminal WebSocket Uses Policy-Driven Backend

1. `[ENTRY]` `autobyteus-server-ts/src/api/websocket/terminal.ts:registerTerminalWebsocket(...)`
2. `[ASYNC]` `autobyteus-server-ts/src/services/terminal-streaming/terminal-handler.ts:connect(...)`
3. `[ASYNC]` `autobyteus-server-ts/src/services/terminal-streaming/pty-session-manager.ts:createSession(...)`
4. `[STATE]` session manager resolves default session factory + shared terminal session contract from `autobyteus-ts`.
5. `[STATE]` Android selects `DirectShellSession` per policy.
6. `[IO]` websocket message input writes to session; read loop streams output frames.
7. `[FALLBACK]` if Android websocket semantics are intentionally constrained, route returns explicit actionable error.
8. `[ERROR]` session startup failure closes websocket with clear error reason.

## CS-007 (UC-007): Termux + Node Baseline with Shell Fallback

1. `[ENTRY]` Android runtime startup in Termux environment.
2. `[STATE]` Node server starts successfully in supported profile.
3. `[STATE]` direct-shell backend resolves preferred shell.
4. `[IO]` persistent interactive `bash` session is started as the primary shell path.
5. `[FALLBACK]` if `bash` unavailable unexpectedly, persistent interactive `sh` session is started.

## CS-008 (UC-008): Android Runtime Uses File Persistence and Skips Prisma Migrations

1. `[ENTRY]` `autobyteus-server-ts/src/app.ts:startServer(...)`
2. `[ASYNC]` `autobyteus-server-ts/src/config/app-config.ts:initialize(...)`
3. `[STATE]` `autobyteus-server-ts/src/persistence/profile.ts:getPersistenceProfile(...)`
4. `[STATE]` Android runtime markers (`platform === android` or `ANDROID_ROOT`/`ANDROID_DATA`) resolve profile to `file`.
5. `[ENTRY]` `autobyteus-server-ts/src/startup/migrations.ts:runMigrations(...)`
6. `[STATE]` `isFilePersistenceProfile(profile)` returns true.
7. `[FALLBACK]` migration path exits early with log `Skipping Prisma migrations for file persistence profile.`
8. `[ERROR]` if Android detection is absent/misconfigured and SQL path is selected, Prisma engine load may fail; this is prevented by Android persistence policy.
