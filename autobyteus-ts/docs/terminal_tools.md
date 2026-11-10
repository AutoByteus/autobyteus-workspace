# Terminal Tools

The `run_bash` tool provides stateless non-interactive command execution for agents, in the foreground or as background tasks that report how they ended. Interactive PTY terminal sessions are a separate server/web terminal capability and are not used by the agent `run_bash` tool.

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
- **Background tasks are addressed by PID** — `kill <pid>` stops one; platform stops (run end, app quit) come from a retained owned command scope and live identity checks, not the numeric PID or an occupied port alone.
- **Long-running commands run in the background** — `run_in_background`, or normal shell syntax such as `npm run dev &`: the call returns when its foreground part ends, and each background task's end is reported to the agent.
- **Interactive terminals remain PTY-backed elsewhere** — server/web xterm sessions use the interactive `TerminalSession` backends selected by `session-factory.ts`.

## Tools

### `run_bash`

Execute a stateless command in a working directory, in the foreground or in the background. It is the only
terminal tool: background commands are started, read and stopped with ordinary shell commands through it.

```ts
const result = await runBash(context, "npm install", "/absolute/path/to/apps/web", 120);
const started = await runBash(context, "npm run dev", "/absolute/path/to/apps/web", 30, true);
```

**Parameters:**

- `command` (string): shell command to execute.
- `cwd` (string, optional): an absolute path to any existing accessible local
  directory, including one outside the agent workspace. If omitted, the
  workspace root is used when available; otherwise the system temporary
  directory is used. The value applies only to this invocation.
- `timeout_seconds` (number, optional): maximum time of the command's foreground part, default `30`. A timeout stops
  the whole command group. It does not apply with `run_in_background`.
- `run_in_background` (boolean, optional, default `false`): run the whole command as a background task.

**Returns (foreground):** `TerminalResult`

```ts
{
  stdout?: string;              // bytes before the foreground end
  stderr?: string;
  exitCode: number | null;      // the foreground part's exit code
  timedOut?: boolean;
  effectiveCwd: string;
  backgroundTasksStarted?: BackgroundTaskStart[]; // & jobs still running when the foreground part ended
  backgroundTasksEnded?: BackgroundTaskEnd[];     // this agent's background tasks that ended during this call
}
type BackgroundTaskStart = { pid: number; command: string; effectiveCwd: string; outputFile: string; startedAt: string };
type BackgroundTaskEnd = {
  pid: number; command: string; durationMs: number; outputFile: string;
  outcome: { exitCode: number } | { signal: string } | { error: string };
  lastLines: string;            // the output file's last 20 lines (at most 2,000 characters) when it ended
};
```

**Returns (`run_in_background`):** `{ pid, status: "running", effectiveCwd, outputFile }`, as soon as the command
started.

*Note: Empty or default values of a foreground result are omitted from the JSON payload to reduce LLM context token usage.*

**Key behavior:**

- Reuse `cwd` on every location-sensitive command that should run in a nested target.
- A provided relative `cwd` is rejected before path resolution or target
  process creation; provide an absolute path instead.
- An existing but inaccessible cwd is rejected before the target shell/process
  is created with a working-directory validation error; no probe process is
  started to test access.
- **The call returns when the command's foreground part ends.** An `&` job still running then is a background task:
  the result lists it in `backgroundTasksStarted` (its pid, the call's command text and the call's output file), and
  everything the call's stdout and stderr receive afterwards goes to that output file.
- **Background tasks report how they ended.** A task's end (exit code, signal, or `error` when its end could not be
  observed) is reported once: in the result of the agent's own `run_bash` call that was running when it ended
  (`backgroundTasksEnded`, for example the agent's `kill <pid>`), otherwise in a background task notice the server
  delivers to the run (see the server's Agent Execution docs).
- **Read output with ordinary commands:** `tail -n 50 <outputFile>`. Every task of one call shares the call's output
  file. Output files live in this node's OS temp area (`autobyteus-background-tasks/<agent id>/`) and are removed
  when the run ends.
- **Stop with `kill <pid>`.** For a `run_in_background` command the pid's process forwards `TERM` to everything the
  command started, so nothing of the command remains. For a plain `&` job `kill <pid>` stops that process only;
  processes it started stay until the agent kills them or the run ends. `kill -9 <pid>` cannot be forwarded.
- Processes that detach themselves (`nohup`, `setsid`, `disown`, daemons) are not tracked: they are stopped at run
  end and app quit while they stay in the command's process group, and escape when they leave it.
- On the POSIX `sh` fallback (no bash on `PATH`, e.g. Android) foreground calls run unwrapped and track no `&` jobs;
  `run_in_background` works there too.

Example long-running command:

```xml
<run_bash cwd="/absolute/path/to/apps/web" run_in_background="true">
npm run dev
</run_bash>
```

### The command wrapper

Every call runs through `command-execution/command-wrapper.ts`. The user's text is appended as written, never
parsed. The foreground form (bash) runs it in the wrapper shell with fds 62/63 kept as the original stdout/stderr
(closed for the user's block, so the processes it starts do not inherit them on bash 4+). When the foreground part
ends, the wrapper resets the shell state (`set +e +u +o pipefail`, default `IFS`, `set -x` off, ERR/DEBUG traps
cleared), runs the user's EXIT trap, writes the stdout end marker and a `FOREGROUND_DONE` frame with the exit code
and the pids of the `&` jobs still running, then stays their parent and writes one `JOB_ENDED` frame per job. The
background form (any POSIX shell) runs the command as the one job, with a `TERM` trap that stops its whole process
group. Frames are nonce-framed (`\x1e<nonce>:BODY\x1f`) on stderr and decoded by `AnchorControlDecoder` for host and
WSL commands. A command that replaces the wrapper (`exec cmd`) returns at the shell's exit instead, with no task list.

## Owned command lifetime and host shutdown

`NativeCommandProcessScope` is the lifetime owner for native non-interactive
commands. Studio and standalone application hosts inject their scope through the
native backend into agent configuration. Each agent's `BackgroundProcessManager`
owns the command groups its calls left behind: at run end (Terminate, delete,
Task close, root stop, idle shutdown) the agent's `BackgroundProcessCleanupStep`
stops them through the scope, records their ends as never reportable and removes
the agent's output files. Interrupting a turn (Stop) stops only the foreground
part; background tasks keep running. Host/backend close drains every remaining
command at app quit.

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
│   ├── anchor-control-protocol.ts        # anchor and wrapper control frames
│   ├── command-wrapper.ts                # the wrapper every run_bash call runs through
│   ├── posix-command-anchor-script.ts   # POSIX session/group anchor
│   ├── wsl-command-anchor-script.ts     # WSL session/group anchor
│   ├── process-identity.ts              # live ownership identity
│   ├── non-interactive-shell-resolver.ts # bash/WSL shell invocation
│   ├── process-group-observer.ts         # process-group scan/status/stop
│   └── shell-command-executor.ts         # one call up to its foreground end
├── background-process-manager.ts         # per-agent background tasks: start, end, reporting, run-end stop
├── background-output-log.ts              # per-call output file and its tail
├── types.ts                              # TerminalResult, BackgroundTaskStart/End
├── output-buffer.ts                      # bounded output ring buffer (interactive sessions)
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
