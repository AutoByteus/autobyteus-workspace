# Investigation Notes — busy-quit-shutdown-orphan

## Bootstrap
- **Package:** `busy-quit-shutdown-orphan`.
- **Worktree:** `/Users/normy/autobyteus_org/autobyteus-worktrees/busy-quit-shutdown-orphan`, branch `codex/busy-quit-shutdown-orphan`, created 2026-10-05 from
  `origin/personal` @ `02d6ddf05` (fetched the same day). Target `personal`.
- **Origin:** `/api_e2e_engineer` (run `api_e2e_engineer_59b3926abc024b0ca092e1888f2beb5e`), 2026-10-05, at the
  user's direction. The user asked to "first do enough experiments to find out exactly why it happens and how it should
  be fixed, before designing."
- **Material:** `/Users/normy/autobyteus_org/api-e2e-reports/busy-quit-shutdown-orphan/` (issue brief, probe
  source, probe logs, desktop app log). Predecessor evidence is in
  `origin/personal:tickets/done/agent-run-termination-extraction/api-e2e-evidence/`.
- **Setup:** `pnpm install --frozen-lockfile --offline`; shared packages built; Prisma generated. Codex CLI 0.160.0
  (logged in via ChatGPT); Claude Code 2.1.283; Electron 42.4.1 (`autobyteus-web`).

## Method
- A temporary diagnostic patch (`evidence/tmp-diagnostic-instrumentation.diff`, reverted, never committed) logs
  `[BQ-DIAG]` at each await of server shutdown: supervisor `closeInternal` stages, standalone root `terminateOnce`,
  `AgentRunManager.stopAllAgentRuns`, `AgentRunTermination.prepareTerminationOnce`, `AgentRun.interrupt`, Codex
  `turn/interrupt` and Codex `turn/*` events.
- A temporary probe (`evidence/zz-tmp-bq-probe.e2e.test.ts.txt`, removed from the tree) starts a real Studio server
  in-process, creates a standalone run on a live runtime, makes it busy in a foreground shell command, then performs an
  action and records:
  - the process tree with PID, PPID and process group;
  - WebSocket events;
  - close timing; for a stalled close, it kills the busy command to see what unblocks.
- Actions: `shutdown` (`fastify.close()`, the SIGTERM path), `interrupt` (`INTERRUPT_GENERATION`), `terminate`
  (`terminateAgentRun`), `codex-sigterm`, `codex-sigkill`, `codex-stdin-eof`, and `hold` (the outer harness SIGKILLs
  the server).
- The Electron quit lifecycle was reproduced with a minimal app on the product's Electron 42.4.1
  (`evidence/e6-electron-quit/main.js`). It copies `electronApplication.ts`'s quit wiring and
  `baseServerManager.stopServer`'s SIGTERM→5 s→SIGKILL escalation, with a stand-in server child.
- No processes from these experiments remain. The user's installed AutoByteus app (PID 22963) and the Codex desktop
  daemon were present on the machine and left untouched.

## Experiments
| ID | Runtime | Scenario | Result | Evidence |
| --- | --- | --- | --- | --- |
| E1 | Codex | Busy in `sleep 300`, server shutdown | Org, Team and standalone-root stages finish in < 1 ms. `agentRuns.stopAll` → `termination.prepare` with `recoveryBlocked=false`, `activeTurn=IDENTIFIED`: **no interrupt is sent**; it waits in `inputAdmissionState.waitForQuiescence()`. Still pending at 60 s. Killing `sleep` → Codex completes the turn ("SLEPT") → quiescent → finish → close **6 s later** | `e1-codex-shutdown.log` |
| E2 | Codex | `INTERRUPT_GENERATION` while busy | `turn/interrupt` → `turn/completed status=interrupted` in **12 ms**, but **`sleep` keeps running** (alive 30 s later). A later shutdown closes in **0.028 s**, and `sleep` is gone after close | `e2-codex-interrupt.log` |
| E3 | Codex | Signal the `codex app-server` directly while busy | SIGTERM: the app-server exits and **its commands are killed**. stdin EOF (what the server's death causes): exits and **commands killed**. SIGKILL: **command orphaned (PPID 1)** | `e3-codex-*.log` |
| — | Codex | Process tree | `codex app-server` runs in the server's process group; **each tool command and helper (`sleep`, code-mode host, node_repl) gets its own process group**. One app-server per workspace cwd, reference-counted; the last run release sends it SIGTERM (`CodexAppServerClient.close`). `getCodexAppServerClientManager().close()` is never called on server shutdown | `e1` TREE; `codex-app-server-client{,-manager}.ts`; `build-studio-server.ts:156` |
| E4 | Claude | `sleep 300` (invalid busy case) | Claude Code blocks a standalone `sleep 300` ("Blocked: standalone sleep 300"); the model reran it in the background and the turn ended. **Not a foreground busy case**; superseded by E5 | `e4-*.log`, `e4b-claude-shutdown.log` |
| E5 | Claude | Foreground `python3 -c "import time; time.sleep(300)"`; shutdown | Same block: no interrupt; waiting for quiescence. After the command was killed **the agent re-ran it** (new PID); close was still pending 60 s after the kill | `e5-claude-shutdown.log` |
| E5 | Claude | Interrupt while busy | The Claude interrupt **kills the running command** (gone within 5 s) and ends the turn. Shutdown afterwards: **0.39 s** | `e5-claude-interrupt.log` |
| E6 | Electron | Quit with a server that does not exit on SIGTERM (`app.quit()` = user quit, and SIGTERM to main) | `before-quit` → `will-quit` → `stopServer` sends SIGTERM → **main exits in the same millisecond** (`will-quit` is not deferred). **The 5 s SIGKILL escalation never runs**; the child is orphaned (PPID 1). With a child that exits on SIGTERM, everything is clean | `e6-electron-quit/run-*.log` |
| E7 | Codex | Port during a hanging close | **ECONNREFUSED at +5 s**: the listener closes first, so a relaunch sees the port free and starts a second server on the same data root. Codex **re-ran `sleep`** after it was killed (new PID) and the turn continued. The probe's data-dir removal raced with the hanging server's own writes (`ENOTEMPTY`) | `e7-codex-port-during-hang.log` |
| E8 | Codex | **User Terminate** (`terminateAgentRun`) of a busy run | **Same hang**: `prepare` has no interrupt and waits for quiescence; the mutation was still pending at 60 s | `e8-codex-user-terminate.log` |
| E9 | Codex | Server SIGKILLed while busy | The app-server and `sleep` are **gone within 3 s** (pipe EOF → Codex cleans up) | `e9-server-sigkill-codex.log` |
| E9 | Claude | Server SIGKILLed while busy | The **`claude` CLI survives** (PPID 1), with its bash and Python command still running at +15 s and later. A SIGTERM to the orphaned CLI then removed the CLI, bash and Python together | `e9-server-sigkill-claude.log` |

## Root causes
- **RC-1 (server, primary): run termination never interrupts the active turn.**
  - `AgentRunTermination.prepareTerminationOnce` (`agent-execution/domain/agent-run-termination.ts:133-151`) interrupts
    only in the recoverable-block branch.
  - Normally it calls `inputAdmissionState.quiesce()`, drains, and awaits `waitForQuiescence()`. That resolves only
    when the FIFO is empty and the active claim is cleared, i.e. when the current turn **completes naturally**.
  - This is the documented contract of `PreparedAgentRunTermination` ("drains every earlier FIFO entry without
    terminating the provider runtime").
  - It is runtime-agnostic. It is used by `AgentRunManager.prepareAgentRunTermination`, which serves server
    `stopAllAgentRuns`, user Terminate (`terminateAgentRun`, E8), `StandaloneAgentRunLifecycleService.terminateHost`
    and Mixed-Team-member stop.
  - The wait is unbounded: agents continue or retry work (E5, E7).
  - By contrast, root-hosted children (Team/Org members, collaborators, task copies) are fenced with
    `fenceInputAndInterruptForRootShutdown` first, which interrupts. Busy-Org Stop on Codex passed 11/11 in the
    predecessor's LE-O1. Standalone hosts (the common case: every chat) are not fenced.
- **RC-2 (server): shutdown has no bound and no runtime teardown fallback.**
  - `server-runtime.ts` `shutdown` awaits `app.close()` without a timeout.
  - `closeStudioProcessResources` stops roots and runs strictly in sequence.
  - The Codex client manager is never closed on shutdown; app-servers die only per-run or when the server process
    exits.
- **RC-3 (desktop): quit does not wait for the server and never escalates.**
  - `electronApplication.ts:339-341` runs `will-quit` → `void this.stop()` without `preventDefault`, so Electron exits
    right after `stopServer` sends SIGTERM.
  - `baseServerManager.stopServer`'s 5 s SIGKILL timer is dead on the quit path (E6). This applies to the normal user
    quit (`app.quit()`), not only to SIGTERM.
  - The server is spawned as an ordinary child (`macOSServerManager.ts:59`), so it is not killed with main.
- **RC-4 (runtime cleanup differs):**
  - Codex kills its tool commands on SIGTERM or EOF but not on its own SIGKILL (E3, E9), and its interrupt leaves the
    command running (E2). Its commands live in separate process groups.
  - The Claude CLI kills its tree on SIGTERM and interrupt, but **not on EOF** (E9).
  - Consequence: killing the server alone cleans up Codex but **orphans Claude**. Server-side runtime teardown must
    signal each runtime process, not rely on pipe closure.
- **RC-5 (consequence): a second server on the same data root.**
  - A hanging server stops listening at once (E7), and the desktop launch only waits for the port to be free
    (`baseServerManager.waitForPortToBeFree`). Nothing guards the data root.
  - The orphan keeps running and writing (E7's `ENOTEMPTY`) while a relaunched server opens the same data.
- **Not established / unknowns for architecture:**
  - other runtimes: AutoByteus native in-process tool commands; AGY (which already signals its process groups,
    `agy-stream-process.ts:68-83`); ACP (`acp-agent-process.ts:59-64`, stdin close → SIGTERM → SIGKILL); Grok;
  - Windows (`windowsServerManager.ts` has its own timeout path);
  - whether the orphan's late writes can actually corrupt data, as opposed to merely conflicting.
  - Relaunch after a busy quit continued every conversation in the predecessor's T-08c.

## Architecture investigation (SR-003, 2026-10-05)
- **E-A1, project guideline.** `DESIGN.md` applies: the smallest coherent owner; "preserve guarantees, not machinery";
  no speculative machinery. The predecessor design (`agent-run-termination-extraction`, SR-006 § 11 fence) is the
  interrupt mechanism to reuse.
- **E-A2, where graceful drain is intended.**
  - `prepareTermination` / `tryPrepareTerminationIfQuiescent` (drain without interrupting, cancellable) are used on
    purpose throughout the Team, Org and task-copy flows. Callers: `configured-agent-execution-handle.ts:201-214`,
    `flat-team-execution-manager.ts:258-348`, the task agent/team registries, `root-*-execution-*`, and
    `agent-run-manager.ts:195-236`.
  - Those flows cancel preparations (`managed-agent-run-termination.ts:25`, registries `local.cancel()`). Changing
    `prepareTermination` globally would break them.
  - Only two entry points mean "stop now": `AgentRunManager.terminateAgentRun` (`agent-run-manager.ts:275-289`; user
    Terminate via `StandaloneAgentRunLifecycleService.terminateHost:104-113`; history delete/archive and root stop
    through `stopRoot` → host) and `AgentRunManager.stopAllAgentRuns` (`:291-316`; server shutdown).
- **E-A3, fence reuse.** `AgentRun.fenceInputAndInterruptForRootShutdown()` (`AgentRunTermination.fenceForRootShutdown`):
  - root-fences input, which silently invalidates reservations and cancels admitted pre-forward input (DEC-001; test
    `agent-run.test.ts` "root shutdown silently invalidates reservations and cancels admitted pre-forward input once");
  - interrupts the active turn and settles accepted once quiescent;
  - bounds a rejected interrupt at 5 s (F-2); a failed attempt can be retried (F-3).
  - Afterwards `prepareTermination` is immediate (already quiescent). A cancelled preparation does not reopen
    root-fenced admission (test "does not reopen root-fenced admission…"), which is the right outcome for Terminate.
- **E-A4, runtime process spawning.**
  - Codex: `CodexAppServerClient.start` (`spawn`, default process group); the manager has `close()` but it is never
    called on shutdown.
  - Claude: the CLI is spawned **inside the Claude Agent SDK** (`claude-session-process.ts` → `openSession`); the
    server holds no `ChildProcess`. `ClaudeSessionManager` has only `closeRunSession(runId)`.
  - ACP (`acp-agent-process.ts`: stdin close → SIGTERM → SIGKILL), AGY (`agy-stream-process.ts`: signals its process
    groups), Grok: per-process close only.
  - A central child-process registry is therefore not feasible for SDK-spawned processes.
  - Runtime CLIs inherit the server's process group. Their tool commands sit in their own groups and are cleaned by
    the CLI on SIGTERM (Codex E3; Claude E9 follow-up).
- **E-A5, desktop spawn and stop.**
  - `macOSServerManager.ts:39-59` and `linuxServerManager.ts` spawn `process.execPath app.js` with
    `{cwd, env, stdio:['ignore','pipe','pipe']}`, not detached, so the server shares Electron's process group.
  - `BaseServerManager.stopServer` (`:184-245`): SIGTERM, then SIGKILL after `gracefulShutdownTimeoutMs = 5000`.
  - `WindowsServerManager` overrides stop with `taskkill /pid /t` (tree), then forced; same 5 s.
  - `ElectronApplication.installLifecycleHandlers` (`:331-345`): `before-quit` arms an 8 s `app.quit()` timer;
    `will-quit` → `void this.stop()` with no `preventDefault`.
  - Tests exist: `server/__tests__/BaseServerManager.spec.ts`; no quit-lifecycle test.
- **E-A6, server side.**
  - `server-runtime.ts:29-46`: `shutdown` awaits `app.close()` without a bound; the handlers are `once` (a second
    SIGTERM gets Node's default action).
  - `app.close()` → the `onClose` hook → `currentApplicationRuntime.lifecycle.stop()` → `closeProcessResources`
    (`build-studio-server.ts:282-287`, `78-110`) → `GeneralProcessRunSupervisor.close` (`:405-430`): Org, Team,
    standalone roots, then standalone runs, in sequence.
- **E-A7, non-desktop deployments.** Docker stop sends SIGTERM, then SIGKILL to the whole container after its grace
  period. Terminal Ctrl-C sends SIGINT to the whole foreground process group. Both already reach the runtime CLIs.
  The orphaning in this ticket is specific to the server being a child of the Electron app.

## ARCH-REV-001 follow-up investigation (SR-004, 2026-10-05)
- **E-A8, application callers of the stop-now owners (AR-001).**
  - `application-orchestration/services/application-orchestration-host-service.ts:340` (`terminateRunBinding`,
    reached from the application engine capability handler) → `agentExecution.terminateAgentRun`.
  - `application-platform/execution/application-execution-scope.ts:47` (SDK `terminateAgentRun`) →
    `kernel.agentRunService.terminateAgentRun`.
  - Both reach `AgentRunManager.terminateAgentRun`, so D1 changes their behavior too: an application terminating a
    busy run would interrupt its turn instead of waiting.
  - `application-platform/execution/application-execution-shutdown-coordinator.ts:30` → the application-scope
    `stopAllAgentRuns` during server close (`application-platform-lifecycle.ts:178`, `build-studio-server.ts:284`). This
    is part of SCN-002 and already in scope.
- **E-A9, native AutoByteus commands (AR-003 a, b).**
  - Foreground: `autobyteus-ts/src/tools/terminal/command-execution/shell-command-executor.ts:36-41` spawns
    `detached: true` (its own group). It stops that group on `options.signal` abort (`abortHandler` →
    `stopActiveProcess`) or on timeout.
  - The native turn's `AbortSignal` (`agent/interruption/turn-execution-scope.ts`) is passed to tools
    (`agent/loop/tool-phase.ts:159,222`) and to `run_bash` (`tools/terminal/tools/run-bash.ts:23-26`).
  - **(a) answered:** a native interrupt aborts the running foreground command, so D1 covers native foreground
    commands.
  - Background: `BackgroundProcessManager` (`background-process-manager.ts:78`, spawn `detached: true` at `:233-236`)
    is created **per agent context** (`background-process-context.ts`: stored as `_backgroundProcessManager` on the
    agent context).
  - Its `stopAll()` (`:220`) has **no caller**. Background processes outlive run Terminate and server shutdown on every
    path today.
- **E-A10, AGY (AR-003).**
  - `agy-background-process-groups.ts` already reads the POSIX process table (`ps -A -o pid=,ppid=,pgid=`). It selects
    process groups **led by a live descendant** of a root pid, excluding the root's and the server's groups, and
    signals them independently, skipping ESRCH/EPERM.
  - AGY's owner uses it while AGY is alive, because AGY daemons survive a SIGTERM to AGY alone.
  - Windows is not covered (`[]`). This is an existing, tested precedent for process-tree sweeps
    (`agy-background-process-groups.test.ts`).
- **E-A11, process-tree reachability.**
  - Every process the server spawns is a descendant of the server pid until its parent dies: runtime CLIs (codex,
    claude, acp, agy, grok), native foreground and background shells, and those CLIs' tool commands and daemons.
  - Runtime CLIs share the server's process group. Native shells, Codex and Claude tool commands, and AGY daemons lead
    their own groups (E1 tree; E9; E-A9; E-A10).
  - A sweep that records (a) descendant pids in the server's own group and (b) groups led by descendants, **before**
    signalling, survives re-parenting during teardown: groups are signalled as groups, and leaders recorded up front.
  - It never signals the server's own group, so it is safe whether or not the server leads its group (dev, Docker,
    terminal or desktop).
  - With the sweep, the env flag, detached spawn and the leader-only group kill of SR-003 become unnecessary.
- **E-A12, Electron re-entry (AR-002).**
  - `ElectronApplication.stop()` returns immediately on re-entry (`hasShutdownRun`, `electronApplication.ts:392`), so
    a `.finally(app.quit)` keyed to a second call would quit early.
  - The stop must be one memoized promise.
  - Updater: `appUpdater.ts:252` `autoUpdater.quitAndInstall(false, true)` (to verify under deferral, N-2).

## Supplement Inventory
| Supplement | Purpose | Status |
| --- | --- | --- |
| `evidence/*.log`, `evidence/e6-electron-quit/` | Experiment evidence E1–E9 | Evidence |
| `evidence/tmp-diagnostic-instrumentation.diff`, `evidence/zz-tmp-bq-probe.e2e.test.ts.txt` | Reproducible probes (temporary; not product code) | Evidence |
| `/Users/normy/autobyteus_org/api-e2e-reports/busy-quit-shutdown-orphan/` | Original report and logs (T-08/T-09) | Read-only |
