# Terminal Tools

PTY-based terminal tools providing stateful command execution and background process management for agents.

## Overview

These tools replace the legacy `bash_executor` with a PTY-based implementation where:

- **State persists** — `cd` and environment variables persist across commands
- **Background processes** — Start servers, check output, stop them

## Tools

### `run_bash`

Execute a command in a stateful terminal session.

```ts
await runBash(context, "npm install", 120);
```

**Parameters:**

- `command` (string): Bash command to execute
- `timeout_seconds` (number): Maximum wait time (default: 30)
- `background` (boolean): Run asynchronously and return a process handle (default: false)

**Returns:**

- Foreground (`background=false`): `TerminalResult` with `stdout`, `stderr`, `exit_code`, `timed_out`
- Background (`background=true`): `{ mode: "background", processId, command, status, startedAt }`

**Key behavior:**

- State persists between calls (`cd`, `export` work as expected)
- Command is killed if timeout exceeded
- Background mode returns a process handle for `get_process_output` and `stop_background_process`

---

### `start_background_process`

Start a long-running process (server, watcher) in the background.

```ts
const result = await startBackgroundProcess(context, "yarn dev");
// result: { processId: "bg_001", status: "started" }
```

**Parameters:**

- `command` (string): Command to run

**Returns:** object with `processId` and `status`

---

### `get_process_output`

Read recent output from a background process.

```ts
const result = await getProcessOutput(context, "bg_001", 50);
// result: { output: "...", isRunning: true, processId: "bg_001" }
```

**Parameters:**

- `process_id` (string): ID from `start_background_process`
- `lines` (number): Number of lines to return (default: 100)

---

### `stop_background_process`

Stop a background process.

```ts
const result = await stopBackgroundProcess(context, "bg_001");
// result: { status: "stopped", processId: "bg_001" }
```

## Architecture

```
src/tools/terminal/
├── types.ts                   # TerminalResult, ProcessInfo types
├── output-buffer.ts           # Ring buffer for output (bounded memory)
├── prompt-detector.ts         # Detects when commands complete
├── pty-session.ts             # Low-level PTY wrapper (fork/exec)
├── terminal-session-manager.ts # Main stateful terminal
├── background-process-manager.ts # Background process lifecycle
└── tools/                     # LLM-facing tool functions
```

## Testing

Run all terminal tests:

```bash
pnpm exec vitest --run tests/unit/tools/terminal/
```

Run integration tests only (spawn real PTY):

```bash
pnpm exec vitest --run tests/integration/tools/terminal/
```

### Windows-Specific Testing

**Important**: On Windows, PTY-backed tests rely on WSL. Use the WSL-specific tests instead:

```bash
# Run Windows-specific WSL tests
pnpm exec vitest --run tests/unit/tools/terminal/wsl-tmux-session.test.ts
```

The Windows tests:

- Only import WSL-related modules (no Unix dependencies)
- Verify WSL executable and distro availability
- Test real bash command execution inside WSL
- Validate state persistence and background processes

**Prerequisites**:

- WSL installed and configured (see Windows Setup Guide below)
- Ubuntu or another Linux distro installed in WSL
- `tmux` installed inside the WSL distro (`sudo apt install tmux`)

## Platform Support

- **Linux/macOS**: Full support out of the box.
- **Windows**: Supported via **WSL (Windows Subsystem for Linux)**.

### 🪟 Windows Setup Guide (Required for `run_bash`)

On Windows, the `run_bash` tool executes commands inside a real Linux environment running via WSL. Follow these steps to set it up:

#### 1. Install WSL

Open PowerShell as **Administrator** and run:

```powershell
wsl --install
```

- **Restart your computer** when prompted.
- After restarting, a window will open to finish installing Ubuntu (or the default distro).
- Create a **username** and **password** when asked (remember these!).

#### 2. Set Ubuntu as the default WSL distro

If you have multiple distros (for example, Docker's minimal distro), set Ubuntu
as the default so tools run against a full Linux environment:

```powershell
wsl -l -v
wsl --set-default Ubuntu
```

#### 3. Install Node.js & npm (Required)

Install the latest Node.js LTS version:

```bash
# Install Node Version Manager (nvm)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash

# Close and reopen your terminal, or source the profile
source ~/.bashrc

# Install Node.js LTS
nvm install --lts

# Verify installation
node --version
npm --version
```

#### 4. Install tmux (Required)

The Windows terminal backend uses tmux inside WSL:

```bash
sudo apt install -y tmux
tmux -V
```

#### 5. Accessing your Windows Files (Automatic)

WSL automatically "mounts" your Windows drives. You can access your Windows folders using the path `/mnt/<drive-letter>/`.

- **Your C: Drive**: Accessible at `/mnt/c/`
- **Your Projects**: If your code is in `C:\Code\my-project`, the agent can access it via:
  ```bash
  cd /mnt/c/Code/my-project
  ```

This allows Autobyteus agents to manage your Windows folders seamlessly using Linux tools.

#### 6. GUI Support (Optional)

Modern WSL supports graphical applications. If you install a Linux app inside Ubuntu, it will automatically appear in your **Windows Start Menu**.

For easier file management, you can install a Linux file manager:

```bash
sudo apt install nautilus -y
```

Then, just search for **"Nautilus"** in your Windows Start Menu to browse your WSL and Windows files graphically.

#### 8. How it works

When an agent runs `run_bash("npm install")`:

1.  Autobyteus (running on Windows) talks to WSL and uses `tmux` for the shell session.
2.  The command executes inside your WSL Ubuntu instance.
3.  Files created (like `node_modules`) live in the WSL file system, or on your Windows drive if you `cd` there first.
