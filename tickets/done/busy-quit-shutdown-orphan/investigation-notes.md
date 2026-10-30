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

## Rebase and re-check against today's code (SR-005, 2026-10-26, autobyteus-284)
- **Bootstrap.** Task `autobyteus-284` (Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`), from
  `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`). Direction: rebase or restart
  on current `origin/personal`, re-check the design, ask the user DEC-005, implement, prove from a clean clone,
  finalize to `personal`, no release, clean up (the old worktree only after asking the Project Task Manager).
- **Rebase.** `git fetch origin`; the branch held five docs-only commits (only this ticket folder; checked with
  `git diff --name-only 02d6ddf05 HEAD`). `git rebase origin/personal` applied them cleanly. New base
  `origin/personal` @ `d74f75a51a` (2,328 commits after `02d6ddf05`). Branch head after rebase `7893a97faf`.
- **Input read:** the autobyteus-283 report and follow-ups
  (`/Users/normy/autobyteus_org/autobyteus-delivery-records/restart-resume-investigation-20261024/`): step 0 is this
  ticket (M6, F-21); FU-001 (Windows graceful stop) and FU-002 (Docker/supervisord stop grace) wait for the bound this
  ticket defines.
- All findings below are `Read` (code at the new base) unless marked otherwise.

| ID | Area | Observation at `d74f75a51a` | Effect on the design |
| --- | --- | --- | --- |
| E-A13 | Stop-now owners | `AgentRunManager.terminateAgentRun` (`agent-run-manager.ts:272-286`) and `stopAllAgentRuns` (`:288-313`) still call `prepareAgentRunTermination` → `commit().finish()` with no interrupt; `stopAllAgentRuns` still finishes runs one after another. The fence `AgentRun.fenceInputAndInterruptForRootShutdown` (`agent-run.ts:271`) → `AgentRunTermination.fenceForRootShutdown` (`agent-run-termination.ts:92-107`) is unchanged in shape. `prepareTerminationOnce` (`:142-161`) still interrupts only in the recoverable-block branch, then waits for quiescence. RC-1 still holds. | D1 unchanged. |
| E-A14 | Stop-now callers | Callers counted at call sites: GraphQL `agent-run.ts:184` → `agent-run-service.ts:140`; `standalone-agent-run-lifecycle-service.ts:112`; `application-orchestration-host-service.ts:340`; `application-execution-scope.ts:48`; `general-process-run-supervisor.ts:475` (`stopAllAgentRuns`); `application-execution-shutdown-coordinator.ts:30` (`stopAllAgentRuns`). Same set as E-A8 (line numbers moved). New since 5 October: `AgentRunTermination.forceTerminate` (`agent-run-termination.ts:115-120`, Task-scoped force release) and `tryPrepareIfQuiescent` now treats a running background task as work (`:71-90`, idle shutdown). Neither is a stop-now entry point. | DS-001, DS-001b, DS-002 unchanged; line numbers refreshed. |
| E-A15 | "Stopped on purpose" record (needed by autobyteus-283 step 1) | `recordRunTerminated` (sets `terminatedAt`) is called only by `AgentRunService.terminateAgentRun` (`agent-run-service.ts:132, 145`) and `StandaloneAgentRunLifecycleService.terminateHost` (`standalone-agent-run-lifecycle-service.ts:115`). `stopAllAgentRuns` and the supervisor's close do not call it. | New preserved behavior BEH-007: server shutdown must keep not marking runs as terminated. D1 does not touch these writers. |
| E-A16 | Server shutdown | `server-runtime.ts:29-45` `registerShutdownHandlers` is unchanged in shape: `once` SIGINT/SIGTERM, an unbounded `await app.close()`, then `process.exit`. `closeProcessResources` (`build-studio-server.ts:~95-140`) gained steps (update notifications, agent runtime status, skill-update notices) before `generalProcessRunSupervisor.close()`; `GeneralProcessRunSupervisor.closeInternal` (`general-process-run-supervisor.ts:452-490`) is still Org → Team → standalone roots → `stopAllAgentRuns`, in sequence. RC-2 still holds. | D2 unchanged. |
| E-A17 | Claude CLI ownership (changes E-A4) | The server now spawns the Claude CLI itself through the SDK's `spawn` hook: `ClaudeSdkProcessOwner` (`runtime-management/claude/client/claude-sdk-process-owner.ts`). Its `release` sends EOF, waits up to 2 s, then SIGTERM (not on Windows), up to 5 s, then SIGKILL, up to 2 s, within a 10 s deadline. It is called per session (`claude-sdk-session-opening.ts:86`). Because the Claude CLI does not exit on EOF (E9), each graceful Claude release takes about 2 s before its SIGTERM. | The sweep is still needed for a forced or wedged exit (nothing else runs then), but the graceful path now signals Claude itself. Since `stopAllAgentRuns` finishes runs one by one, several busy Claude runs can add ~2 s each and reach the 10 s bound. The bound still holds (forced path plus sweep). Validation measures the shutdown time with two busy Claude runs, and the design keeps the sequential finish (U-A1). |
| E-A18 | AGY helper (changes E-A10) | `agy-background-process-groups.ts` now exports `parseProcessTable`, `selectAgyBackgroundProcessGroups(rows, agyPid, serverPid)`, `listAgyBackgroundProcessGroups(agyPid, serverPid)`, `signalProcessGroups(pgids, signal)` (ESRCH skipped; **EPERM and others are collected and thrown** as one `AggregateError`) and `processGroupsInactive(pgids)`. Users: `agy-stream-process.ts:4, 91-114` and its test (mocked); `agy-background-process-groups.test.ts`; doc `docs/modules/antigravity_cli_runtime.md:317` names the helper. | The D2 move covers these functions and names. The server sweep catches the thrown error, logs it and continues; AGY keeps its current error semantics. The doc line is updated. |
| E-A19 | Other server-spawned processes | New since 5 October: application workers (`application-engine/runtime/application-worker-supervisor.ts:60`, `spawn(process.execPath, …)`, not detached) are stopped by `engineLauncher.stopAll()` during the application lifecycle stop (`application-platform-lifecycle.ts:177`). Runtime probes (`runtime-command-runner.ts:49`, `runtime-process-operation.ts:50`, AGY/Grok capability probes) are short-lived, not detached. All are server descendants in the server's group. | Covered by sweep target (a). No design change. |
| E-A20 | Native background processes | `BackgroundProcessManager.stopAll()` (`autobyteus-ts/src/tools/terminal/background-process-manager.ts:220`) still has no caller. The native backend reports no background tasks (`autobyteus-agent-run-backend.ts:125-126`). | FU-3 unchanged: covered at server shutdown by the sweep, not on a run Terminate. |
| E-A21 | Desktop | `electronApplication.ts`: `hasShutdownRun` (`:59`), `before-quit` 8 s timer (`:346-349`, `shutdownTimeoutMs = 8000` at `:49`), `will-quit` → `void this.stop()` with no `preventDefault` (`:353-355`), `stop()` returns early on re-entry (`:409-426`). New IPC `start-shutdown` (`:249-253`) calls `app.quit()`. `reset-server-data` (`:282-291`) and `restart-server` (via `serverStatusManager.ts:80`) also call `stopServer`. `baseServerManager.ts`: `gracefulShutdownTimeoutMs = 5000` (`:39`), `stopServer` (`:184-245`) SIGTERM then SIGKILL of the single PID. `windowsServerManager.ts:82-172`: `taskkill /t`, then `/f /t` after 5 s. Updater `appUpdater.ts:274` `quitAndInstall(false, true)`. `main.ts:46-56`: `application?.stop()` then `app.exit(1)` on a startup failure. RC-3 still holds. | D3 unchanged. The `start-shutdown` IPC, `restart-server` and `reset-server-data` are additional entries to the same memoized stop or `stopServer`; they are listed in the design (no new mechanism). |
| E-A22 | Relaunch while an old server is alive | `BaseServerManager.startAttempt` (`baseServerManager.ts:131-170`) waits up to 5 s (Linux 10 s) for the port to be free (`waitForPortToBeFree`, `:73-90`), then fails with "Port … is still in use". So a still-listening orphan blocks a second server (a start error instead); a second server appears only when the old one has already closed its listener but is still running (E7, a hanging close). | After D2 and D3 a closing server exits within ~12 s and the desktop does not finish quitting before it is gone, so a relaunch after quit, update or shutdown starts one server (new AC-009). A force-killed or crashed app is DEC-004 (FU-2), unchanged. |
| E-A23 | Bound arithmetic for follow-ups | Worst case of the server's own exit: 10 s bound + one `ps` (≤ 2 s timeout, usually ~20 ms) + 1.5 s grace ≈ 11.5–13.5 s. Docker `docker stop` and supervisord default to 10 s before SIGKILL (283 F-24). | FU-002 of autobyteus-283 should set the stop grace to about 15 s. Recorded in `follow-ups.md`. |
| E-A24 | Vocabulary | `GLOSSARY.md` § Nodes: a node is one AutoByteus server; "embedded local" is how the desktop starts its own server. This ticket's "server" means the server process of a node, and "embedded server" the desktop's own. No new domain word; "process-tree sweep" is an internal mechanism name. | No glossary change. |

- **Unknown U-A1 (to measure in validation):** shutdown time with two or more busy Claude runs (sequential finish plus
  ~2 s Claude release each, E-A17). If it routinely reaches the 10 s forced path with three or fewer busy runs, that is a
  `Design Impact` (finishing runs concurrently would be the candidate).
- **Unknown U-A2:** the Codex and Claude CLI versions at validation time (E2/E3/E5/E9 used Codex 0.160.0 and Claude
  Code 2.1.283). Validation records the versions and re-checks the E9 orphaning (Claude survives EOF) because the
  sweep design rests on it.

## Second re-check against an updated personal (SR-006, 2026-10-30)
- **Trigger:** the user: "do the analysis again, the origin personal branch has been updated a lot".
- **Rebase:** `git fetch origin`; 421 new commits since `d74f75a51a`. The six docs-only ticket commits rebased cleanly
  onto `origin/personal` @ `1a4453e553`. Head after rebase `102a34f134`.
- **The important change:** ticket `backend-port-conflict-20261024` (merged to personal 2026-10-26, merge `86bf04a785`,
  archived in `tickets/done/backend-port-conflict-20261024/`; main code commit `f34ad8749f` "own native command groups
  and await backend shutdown") built part of what this ticket designed. It was approved for owned-background cleanup
  at application/backend shutdown and port-conflict diagnosis. It explicitly kept agent stop and idle policy unchanged
  (its DEC-001, BEH-003) and made no claim about busy runs or runtime CLIs ("Existing Codex/AGY/Claude shutdown tests
  remain controls; no new universal provider claim", its design-spec line 247).
- SR-005's E-A16 (server shutdown) and E-A21 (desktop) are **superseded** by E-A25 to E-A28 below. The other SR-005
  findings still hold at `1a4453e553` (re-read: E-A13 stop-now owners, E-A14 callers, E-A15 `terminatedAt` writers,
  E-A17 Claude process owner, E-A18 AGY helper, E-A19 other spawned processes, E-A22 relaunch port wait).
- All findings are `Read` at `1a4453e553` unless marked otherwise. Nothing was run in this round.

| ID | Area | Observation at `1a4453e553` | Effect on the design |
| --- | --- | --- | --- |
| E-A25 | Server shutdown owner (new) | `src/shutdown/server-process-shutdown.ts`: `ServerProcessShutdown` is the one owner of SIGINT/SIGTERM and the Windows IPC request (`:18-23`, handlers with `on`, memoized `request()` at `:33-48`). It waits for the startup barrier, runs `cleanupOnce()` (set to `app.close()`, `server-runtime.ts:204`), sends `complete`/`failed` over IPC when present, then `exit(0/1)`. **There is no time bound on `cleanupOnce()`.** A second SIGTERM no longer takes Node's default action (the request is memoized), so only SIGKILL ends a hung server. | RC-2 still holds. D2 moves into this owner: bound the cleanup at 10 s, then always the sweep. No new `server-process-shutdown` file. N-4 no longer applies. |
| E-A26 | Native commands (new) | `NativeCommandProcessScope` (`autobyteus-ts/.../native-command-process-scope.ts`) owns every native command (foreground `run_bash` and background processes) in an anchored process group. The server closes it first in Fastify `preClose` (`native-command-shutdown.ts:8`) with a 3 s collective deadline (`:129-132`), with verified absence and an `unconfirmed` report; `onClose` aggregates it with the rest of cleanup (`build-studio-server.ts:409`). `BackgroundProcessManager.stopAll()` (`background-process-manager.ts:88`) still has no caller outside it; a run Terminate still leaves native background work alone (their DEC-001). | Native commands at server shutdown are covered without the sweep; the sweep stays the net for runtime CLIs, their tool commands and AGY daemons on a forced or bounded exit. FU-003 (native background on run Terminate) unchanged. |
| E-A27 | Desktop quit (new) | `electron/application/applicationShutdown.ts`: one memoized `stop()` with a 30 s ceiling; `quit()` prevents `will-quit` until the stop settles, then `app.quit()`, or `app.exit(1)` on failure. `electronApplication.ts:59, 347-350, 405-411` wire it. The 8 s `before-quit` timer and `hasShutdownRun` are gone. The updater calls `prepareForInstall: () => this.stop()` before `quitAndInstall` (`electronApplication.ts:73-75`, `appUpdater.ts:275-276`). | AR-002 (one stop promise, re-entry) and RC-3's "quit does not wait" are **solved**. D3's memoized stop and `will-quit` deferral are dropped from this design. |
| E-A28 | Desktop server stop (new) | `baseServerManager.ts:40` `gracefulShutdownTimeoutMs = 20000`; `stopServer` (`:175-187`) → `stopManagedBackend` (`managedBackendStop.ts`): graceful = SIGTERM, wait up to 20 s (`:189-192`); then `forceStop` = **SIGKILL of the server PID only** (`:193-195`) and up to 2 s to confirm exit. macOS/Linux spawn has no IPC and is not detached (`macOSServerManager.ts:42, 59`). Windows (`windowsServerManager.ts:38, 56-70`): spawn with an IPC channel, graceful = IPC `request` through `ManagedBackendShutdownClient`, force = `taskkill /pid /f /t` (whole tree). | The desktop waits now, but its force on macOS/Linux kills only the server. With busy runs the server does not finish (RC-1, RC-2), so today a busy quit takes about 20 s and then SIGKILLs the server: the Claude CLI and its commands survive (E9); Codex cleans up on EOF (E9). D3 shrinks to: force on POSIX sweeps the server's tree. The window value is DEC-007. |
| E-A29 | Bound arithmetic (replaces E-A23) | With D2: native drain ≤ 3 s is inside the 10 s cleanup bound; after the bound, one `ps` (≤ 2 s timeout, usually ~20 ms) + 1.5 s grace + IPC flush ≤ 250 ms. The server's own worst case is about 13.75 s, typically ~11.6 s; a busy quit with interrupting runs is expected in a few seconds (U-A1). Desktop: graceful window (20 s today, 15 s approved in DEC-002) + 2 s force confirmation, inside the 30 s app ceiling. | A 15 s desktop window leaves ~1.25 s margin over the server's worst case; 20 s leaves ~6 s. Recommendation in DEC-007: keep 20 s. Docker/supervisord 10 s (FU-004) should become about 15 s. |
| E-A30 | Windows graceful stop | The desktop now asks the Windows server to shut down over IPC before `taskkill /f /t` (E-A28). autobyteus-283's FU-001 ("Windows `taskkill` without `/f` may never run the graceful close") is answered in code by backend-port-conflict; it was not verified on a Windows host (its handoff summary: "Actual Windows/WSL … remain unclaimed"). | Nothing for this ticket. Reported to the Project Task Manager with the result. |
| E-A31 | Two process-table readers | `autobyteus-ts` `ProcessGroupObserver` (`process-group-observer.ts`, async `ps` with deadline and birth identity, for native command groups) and AGY's `agy-background-process-groups.ts` (sync `ps -A -o pid=,ppid=,pgid=`) both read the process table. Both existed before this ticket. | The design keeps moving AGY's selector for the server sweep (one shared selector for AGY and the sweep); merging the two readers across packages is FU-005. |
| E-A32 | Other new code since SR-005 | Credential proxy (`src/credential-proxy/`, an in-process loopback server closed in `closeProcessResources`, `build-studio-server.ts:144`); live tool-list updates; model routing; `read_file` media. None spawns processes or changes the stop-now path. The stop-now callers are the same seven call sites (line moves only: `general-process-run-supervisor.ts:486`, `agent-run-service.ts:143`). | No design change. |

- U-A1 and U-A2 (SR-005) still apply. **U-A3:** when the desktop force path is taken, does the sweep's SIGTERM of the
  Claude CLI end its tool commands within the 2 s force confirmation? Validation measures it with a wedged-server test
  double.

## ARCH-REV-002 premises checked (SR-008, 2026-10-30)
- `Read` at `1a4453e553`, confirming the reviewer's evidence:
  - E-A33: `agy-background-process-groups.ts:58` returns `[]` on win32, so the moved helper does not define the sweep's
    win32 result; `managedBackendShutdownClient.ts` rejects on IPC `failed`; `appUpdater.ts:273-279` shows the install
    error and does not call `quitAndInstall` when `prepareForInstall` rejects (AR-004, N-5, FU-007).
  - E-A34: `tests/unit/server-runtime-app-data-migration-gate.test.ts:289-313` runs `startConfiguredServer` in-process,
    fires the captured SIGTERM handler and asserts `process.exit(0)` (AR-005).
  - E-A35: `managedBackendStop.ts` takes the force deadline before `force()` and `waitForChildExit` returns at once for
    an exited child, so a SIGKILL of the server inside `forceStop` is confirmed without more budget (AR-006).

## Supplement Inventory
| Supplement | Purpose | Status |
| --- | --- | --- |
| `evidence/*.log`, `evidence/e6-electron-quit/` | Experiment evidence E1–E9 | Evidence |
| `evidence/tmp-diagnostic-instrumentation.diff`, `evidence/zz-tmp-bq-probe.e2e.test.ts.txt` | Reproducible probes (temporary; not product code) | Evidence |
| `/Users/normy/autobyteus_org/api-e2e-reports/busy-quit-shutdown-orphan/` | Original report and logs (T-08/T-09) | Read-only |
