# Terminal Tools

Terminal tools provide stateless non-interactive command execution for agents plus PID-keyed background process management. Interactive PTY terminal sessions are a separate server/web terminal capability and are not used by the agent `run_bash` tool.

## Design References

- Interactive terminal backend designs (server/web terminal session path):
  - Android direct-shell backend: `docs/terminal_android_direct_shell_backend_design.md`
  - Windows WSL/tmux backend: `docs/terminal_wsl_tmux_backend_design.md`
- Agent `run_bash` command execution is the non-interactive path documented in this file; it does not use those interactive session backends.
- Server/web Terminal routing is documented in `autobyteus-server-ts/docs/modules/terminal.md` from the repository root.

## Overview

- **`run_bash` is stateless** — each call runs the supplied command through a non-interactive shell in the resolved `cwd`. Do not rely on `cd` or exported variables from earlier calls.
- **Explicit terminal `cwd` is per invocation/process** — any provided `cwd`
  must be absolute and may target any existing accessible local directory,
  including one outside the agent workspace. An omitted `cwd` uses the
  workspace root when configured, otherwise the system temporary directory.
  This changes only where that command or process runs; it does not redefine
  workspace identity or persist across calls. This trusted-local terminal
  behavior is separate from generic file-tool path policy and is not a
  sandbox.
- **Foreground execution is non-PTY** — command output is captured from process pipes, avoiding terminal prompt/echo/wrapping artifacts.
- **Background tools address processes by PID** — tool results and lookups use `pid`; shutdown authority comes from a retained owned command scope and live identity checks, not the numeric PID or an occupied port alone.
- **Long-running commands use normal shell syntax** — for example, `npm run dev > server.log 2>&1 &`. If an ordinary live descendant remains after the shell exits, it is adopted and returned in `backgroundProcesses`.
- **Interactive terminals remain PTY-backed elsewhere** — server/web xterm sessions use the interactive `TerminalSession` backends selected by `session-factory.ts`.

## Tools

### `run_bash`

Execute a stateless command in a working directory.

```ts
const result = await runBash(context, "npm install", "/absolute/path/to/apps/web", 120);
```

**Parameters:**

- `command` (string): shell command to execute.
- `cwd` (string, optional): an absolute path to any existing accessible local
  directory, including one outside the agent workspace. If omitted, the
  workspace root is used when available; otherwise the system temporary
  directory is used. The value applies only to this invocation.
- `timeout_seconds` (number, optional): maximum execution time, default `30`.

**Returns:** `TerminalResult`

```ts
{
  stdout?: string;
  stderr?: string;
  exitCode: number | null;
  timedOut?: boolean;
  effectiveCwd: string;
  backgroundProcesses?: Array<{
    pid: number;
    status: "running" | "exited" | "stopped";
    command: string;
    startedAt: string;
    effectiveCwd: string;
  }>;
}
```

*Note: Empty or default values for `stdout`, `stderr`, `timedOut`, and `backgroundProcesses` are omitted from the JSON payload to reduce LLM context token usage.*

**Key behavior:**

- Reuse `cwd` on every location-sensitive command that should run in a nested target.
- A provided relative `cwd` is rejected before path resolution or target
  process creation; provide an absolute path instead.
- An existing but inaccessible cwd is rejected before the target shell/process
  is created with a working-directory validation error; no probe process is
  started to test access.
- A foreground timeout stops the spawned shell process group when possible.
- The tool does not parse shell text to infer intent. It only adopts actual live ordinary background descendants after the shell exits.
- Commands that redirect output to files may produce little or no captured background output; read the log file with a later `run_bash` call.

Example long-running command:

```xml
<run_bash cwd="/absolute/path/to/apps/web">
npm run dev > server.log 2>&1 &
</run_bash>
```

---

### `start_background_process`

Convenience tool for starting a long-running process when shell `&` syntax is not desired.

```ts
const info = await startBackgroundProcess(context, "yarn dev", "/absolute/path/to/apps/web");
// info.pid is the PID to use with the other background tools
```

**Parameters:**

- `command` (string): command to run.
- `cwd` (string, optional): an absolute path to any existing accessible local
  directory, including one outside the agent workspace. If omitted, the
  workspace root is used when available; otherwise the system temporary
  directory is used. The value applies only to this process.

**Returns:** `BackgroundProcessInfo` with `pid`, `status`, `command`, `startedAt`, and `effectiveCwd`.

---

### `get_background_processes`

List managed background processes for the current agent context.

```ts
const result = await getBackgroundProcesses(context);
// result: { processes: [{ pid, status, command, startedAt, effectiveCwd }] }
```

---

### `get_process_output`

Read recent captured output from a managed background process.

```ts
const result = await getProcessOutput(context, pid, 50);
// result: { output: "...", isRunning: true, pid, status: "running" }
```

**Parameters:**

- `pid` (number): PID returned by `run_bash`, `start_background_process`, or `get_background_processes`.
- `lines` (number): number of recent lines to return, default `100`.

---

### `stop_background_process`

Stop a managed background process by PID.

```ts
const result = await stopBackgroundProcess(context, pid);
// result: { status: "stopped", pid }
```

## Owned command lifetime and host shutdown

`NativeCommandProcessScope` is the lifetime owner for native non-interactive
commands. Studio and standalone application hosts inject their scope through the
native backend into agent configuration; per-agent background managers remain
views of commands, not the only shutdown registry. Ending an individual agent
or completing a turn does not close the host scope or terminate its previews.
Host/backend close drains retained work, including commands whose originating
run ended and ordinary shell children adopted after `run_bash` returned.

Before user code runs, an internal anchor establishes the owned process
group/session. It remains alive beyond the shell's RESULT and agent context so
quick shell exit cannot erase cleanup authority. POSIX and WSL launchers keep
that anchor separate from the user command result; WSL establishes its session
explicitly. Foreground output capture and command completion remain distinct
from ownership retirement.

Close blocks new work, drains groups together within bounded graceful/forced
phases, and verifies the owned resources are absent. A signalled parent or a
released port alone is not proof of cleanup. Observation or identity uncertainty
returns an unconfirmed result rather than signalling an unrelated PID/group or
claiming success. Host composition still attempts other resource cleanup and
reports aggregate failure. No port scan grants termination authority; escaped
untracked daemons, machine crashes and power loss are outside this guarantee.

Provider-owned Codex/Claude commands retain their provider shutdown owners;
this native scope is not a replacement for those runtimes. The read-only Codex
Background Tasks panel is documented in the server's
[Agent Execution](../../autobyteus-server-ts/docs/modules/agent_execution.md#read-only-codex-background-task-inspection).

## Architecture

```
src/tools/terminal/
├── command-execution/
│   ├── native-command-process-scope.ts   # host lifetime, leases and collective drain
│   ├── anchored-command-launcher.ts      # owned anchor/command launch
│   ├── anchor-control-protocol.ts        # command RESULT separate from anchor exit
│   ├── posix-command-anchor-script.ts   # POSIX session/group anchor
│   ├── wsl-command-anchor-script.ts     # WSL session/group anchor
│   ├── process-identity.ts              # live ownership identity
│   ├── non-interactive-shell-resolver.ts # bash/WSL shell invocation
│   ├── process-group-observer.ts         # process-group scan/status/stop
│   └── shell-command-executor.ts         # foreground run_bash lifecycle
├── background-process-manager.ts         # PID registry and output buffers
├── types.ts                              # TerminalResult and PID process types
├── output-buffer.ts                      # bounded output ring buffer
├── terminal-session-manager.ts           # agent-side interactive command manager
├── session-factory.ts                    # server/web interactive backend selection
├── session-startup.ts                    # primary/fallback backend startup
├── terminal-session.ts                   # shared interactive session contract
├── pty-session.ts                        # parent-process node-pty backend
├── isolated-pty-session.ts               # macOS helper-process node-pty backend
├── isolated-pty-bridge-source.ts         # helper-process bridge source
├── node-pty-bootstrap.ts                 # packaged selected spawn-helper executable repair
├── direct-shell-session.ts               # Android/direct-shell interactive backend
├── wsl-tmux-session.ts                   # Windows WSL/tmux interactive backend
└── tools/                                # LLM-facing tool functions
```

## Interactive Server/Web Terminal Backends

The server/web Terminal route is separate from agent `run_bash`, but it reuses the `TerminalSession` abstractions in this package.

`getDefaultSessionFactory()` selects:

| Platform | Primary backend | Fallbacks |
| --- | --- | --- |
| Android / Termux | `DirectShellSession` | none |
| Windows | `WslTmuxSession` | none |
| macOS / Darwin | `IsolatedPtySession` | `PtySession`, then `DirectShellSession` |
| Other Unix-like systems | `PtySession` | `DirectShellSession` |

### macOS isolated PTY backend

`IsolatedPtySession` is the default server/web Terminal backend on macOS. It launches a Node helper child process and runs `node-pty` inside that helper, so the helper owns the PTY, shell, and `node-pty` descriptors. The long-lived server process owns only the helper pipes/IPC and can release them deterministically when the WebSocket closes.

Startup repairs the packaged `node-pty` `spawn-helper` executable bit if needed. The repair path resolves the native directory that `node-pty` actually selects for the running platform and architecture, normalizes packaged `asar` paths to unpacked resources, and then chmods the adjacent `spawn-helper`. Static fallback scanning is only a diagnostic fallback when the selected native module cannot be inspected; it must prefer the current platform/architecture before build directories so an executable helper for a different macOS architecture does not mask the selected helper.

When startup fails, `node-pty-bootstrap.ts` exposes diagnostics such as platform, architecture, selected native directory, helper path, executable status, and resolution errors. Server/web terminal startup surfaces those diagnostics through the Terminal WebSocket error frame before closing.

Closing a session asks the helper to close over IPC, ends stdin, waits briefly, escalates to `SIGTERM` / `SIGKILL` if required, destroys helper streams, and disconnects IPC. This prevents repeated attached Terminal closes or close-before-connect churn from leaving PTY descriptors or child processes behind in the server process.

The non-interactive agent `run_bash` path does not use this backend.

## Testing

Run terminal unit tests:

```bash
pnpm exec vitest --run tests/unit/tools/terminal/
```

Run terminal integration tests:

```bash
pnpm exec vitest --run tests/integration/tools/terminal/
```

Representative interactive backend tests:

```bash
pnpm exec vitest --run \
  tests/unit/tools/terminal/session-factory.test.ts \
  tests/unit/tools/terminal/isolated-pty-session.test.ts \
  tests/unit/tools/terminal/node-pty-bootstrap.test.ts \
  tests/integration/tools/terminal/isolated-pty-session.test.ts
```

## Platform Support

- **Linux/macOS**: `run_bash` uses a non-interactive POSIX shell process.
- **Windows**: `run_bash` executes through WSL with non-interactive `bash`; WSL/tmux remains an interactive terminal backend concern.
- **Android**: command execution uses a non-interactive shell available in the Termux environment.

For server/web interactive terminals, `node-pty` remains relevant to PTY-backed sessions. On macOS it runs inside the isolated helper-process backend; on other Unix-like systems it can run in the parent-process `PtySession` backend. It is not part of stateless agent `run_bash`.

### Windows Setup Guide (Required for WSL-backed `run_bash`)

On Windows, commands execute inside a real Linux environment running via WSL.

#### 1. Install WSL

Open PowerShell as **Administrator** and run:

```powershell
wsl --install
```

Restart when prompted and finish Ubuntu (or default distro) setup.

#### 2. Set Ubuntu as the default WSL distro

```powershell
wsl -l -v
wsl --set-default Ubuntu
```

#### 3. Access Windows files

WSL mounts Windows drives under `/mnt/<drive-letter>/`. For example, `C:\Code\my-project` is available as `/mnt/c/Code/my-project`.
