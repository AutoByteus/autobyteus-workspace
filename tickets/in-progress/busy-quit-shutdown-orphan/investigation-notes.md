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

## Supplement Inventory
| Supplement | Purpose | Status |
| --- | --- | --- |
| `evidence/*.log`, `evidence/e6-electron-quit/` | Experiment evidence E1–E9 | Evidence |
| `evidence/tmp-diagnostic-instrumentation.diff`, `evidence/zz-tmp-bq-probe.e2e.test.ts.txt` | Reproducible probes (temporary; not product code) | Evidence |
| `/Users/normy/autobyteus_org/api-e2e-reports/busy-quit-shutdown-orphan/` | Original report and logs (T-08/T-09) | Read-only |
