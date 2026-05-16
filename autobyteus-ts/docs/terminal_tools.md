# Terminal Tools

Terminal tools provide stateless non-interactive command execution for agents plus PID-keyed background process management. Interactive PTY terminal sessions are a separate server/web terminal capability and are not used by the agent `run_bash` tool.

## Design References

- Interactive terminal backend designs (server/web terminal session path):
  - Android direct-shell backend: `docs/terminal_android_direct_shell_backend_design.md`
  - Windows WSL/tmux backend: `docs/terminal_wsl_tmux_backend_design.md`
- Agent `run_bash` command execution is the non-interactive path documented in this file; it does not use those interactive session backends.

## Overview

- **`run_bash` is stateless** — each call runs the supplied command through a non-interactive shell in the resolved `cwd`. Do not rely on `cd` or exported variables from earlier calls.
- **Foreground execution is non-PTY** — command output is captured from process pipes, avoiding terminal prompt/echo/wrapping artifacts.
- **Background processes use PID identity** — managed background processes are returned and queried by `pid` only.
- **Long-running commands use normal shell syntax** — for example, `npm run dev > server.log 2>&1 &`. If an ordinary live descendant remains after the shell exits, it is adopted and returned in `backgroundProcesses`.
- **Interactive terminals remain PTY-backed elsewhere** — server/web xterm sessions continue to use `TerminalSessionManager`, `PtySession`, and WSL/tmux session infrastructure.

## Tools

### `run_bash`

Execute a stateless command in a working directory.

```ts
const result = await runBash(context, "npm install", "apps/web", 120);
```

**Parameters:**

- `command` (string): shell command to execute.
- `cwd` (string, optional): absolute path or workspace-root-relative path. If omitted, the workspace root is used when available.
- `timeout_seconds` (number, optional): maximum execution time, default `30`.

**Returns:** `TerminalResult`

```ts
{
  stdout: string;
  stderr: string;
  exitCode: number | null;
  timedOut: boolean;
  effectiveCwd: string;
  backgroundProcesses: Array<{
    pid: number;
    status: "running" | "exited" | "stopped";
    command: string;
    startedAt: string;
    effectiveCwd: string;
  }>;
}
```

**Key behavior:**

- Reuse `cwd` on every location-sensitive command that should run in a nested target.
- A foreground timeout stops the spawned shell process group when possible.
- The tool does not parse shell text to infer intent. It only adopts actual live ordinary background descendants after the shell exits.
- Commands that redirect output to files may produce little or no captured background output; read the log file with a later `run_bash` call.

Example long-running command:

```xml
<run_bash cwd="apps/web">
npm run dev > server.log 2>&1 &
</run_bash>
```

---

### `start_background_process`

Convenience tool for starting a long-running process when shell `&` syntax is not desired.

```ts
const info = await startBackgroundProcess(context, "yarn dev", "apps/web");
// info.pid is the PID to use with the other background tools
```

**Parameters:**

- `command` (string): command to run.
- `cwd` (string, optional): absolute path or workspace-root-relative path.

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

## Architecture

```
src/tools/terminal/
├── command-execution/
│   ├── non-interactive-shell-resolver.ts # bash/WSL shell invocation
│   ├── process-group-observer.ts         # process-group scan/status/stop
│   └── shell-command-executor.ts         # foreground run_bash lifecycle
├── background-process-manager.ts         # PID registry and output buffers
├── types.ts                              # TerminalResult and PID process types
├── output-buffer.ts                      # bounded output ring buffer
├── terminal-session-manager.ts           # interactive session infrastructure
├── pty-session.ts                        # PTY backend for interactive terminals
└── tools/                                # LLM-facing tool functions
```

## Testing

Run terminal unit tests:

```bash
pnpm exec vitest --run tests/unit/tools/terminal/
```

Run terminal integration tests:

```bash
pnpm exec vitest --run tests/integration/tools/terminal/
```

## Platform Support

- **Linux/macOS**: `run_bash` uses a non-interactive POSIX shell process.
- **Windows**: `run_bash` executes through WSL with non-interactive `bash`; WSL/tmux remains an interactive terminal backend concern.
- **Android**: command execution uses a non-interactive shell available in the Termux environment.

For macOS/server interactive terminals, `node-pty` remains relevant to the web terminal path. It is not part of stateless agent `run_bash`.

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
