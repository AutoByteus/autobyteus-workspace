# Design Spec — busy-quit-shutdown-orphan

## Solution And Approval Basis
- Current solution revision ID: `SR-003` (architecture design).
- Approved requirements: `requirements-doc.md`, Approved in SR-002 (2026-10-05). DEC-001 is "cancel queued input",
  DEC-002 is "10 s / 15 s", and DEC-003 and DEC-004 are not in this ticket.
- Behavior-defining supplements: none.
- Design status: `Ready`.
- Investigation notes: `investigation-notes.md` (E1–E9, RC-1 to RC-5, E-A1 to E-A7).
- Workspace:
  - Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/busy-quit-shutdown-orphan`.
  - Branch `codex/busy-quit-shutdown-orphan`.
  - Base `origin/personal` @ `02d6ddf05`. Target `personal`.

## Current-State Read
- **Stopping a run now (RC-1).**
  - User Terminate and server shutdown reach `AgentRunManager.terminateAgentRun` and `stopAllAgentRuns`. Both use
    `prepareAgentRunTermination`, a graceful drain that never interrupts and waits for the active turn to finish
    (E1, E5, E8).
  - Root-hosted children are fenced and interrupted first by their roots, so they stop promptly (predecessor LE-O1).
  - The graceful drain is correct and intended for the Team, Org and task-copy flows that may cancel (E-A2). It is
    wrong only for the two "stop now" entry points.
- **Server shutdown (RC-2):** `server-runtime.ts` awaits `app.close()` without a bound (E-A6).
- **Desktop (RC-3):**
  - The server is an ordinary child in Electron's process group.
  - `will-quit` does not wait, so Electron exits right after SIGTERM, and the 5 s SIGKILL escalation never runs (E6,
    E-A5).
- **Runtimes (RC-4):** runtime CLIs inherit the server's process group, and each CLI cleans its own tool commands on
  SIGTERM. Codex also cleans up on EOF; Claude does not (E3, E9, E-A4). The server cannot enumerate SDK-spawned
  processes.

## Task Size And Architectural Risk (Mandatory)
- **Task size: `Large`.** Three subsystems:
  - server run termination (`agent-execution/services`);
  - server process shutdown (`server-runtime`);
  - desktop server lifecycle (`autobyteus-web/electron`: server managers and the application quit flow).

  Each needs live and desktop validation on two runtimes.
- **Architectural risk: `High`.**
  - It changes the stop semantics of every standalone run (interrupt instead of drain) on every runtime.
  - It adds a forced-termination path with process-group signalling.
  - It changes Electron's quit lifecycle (deferred quit).
  - All of these are concurrency- and process-ownership-sensitive.
- **Escalation triggers:**
  - interrupt-first changes a result that callers of `terminateAgentRun`/`stopAllAgentRuns` depend on;
  - a runtime's CLI does not clean its commands on SIGTERM;
  - deferring `will-quit` blocks an idle quit or another quit path (updates, `window-all-closed`);
  - detached spawn breaks server output piping or startup.

## Architecture Investigation Evidence
- Project design guideline: `DESIGN.md` (root). Applied: reuse the existing interrupt mechanism (the fence); smallest
  owners; no registry or framework; preserve guarantees. No conflicts.

| Source | Observation | Decision |
| --- | --- | --- |
| E1, E5, E8; `agent-run-termination.ts:133-151` | No interrupt on prepare; waits for the turn | D1: fence first at the stop-now entry points |
| E-A2 | Graceful drain is used with cancellation by Team, Org and copies | D1 is limited to `terminateAgentRun` and `stopAllAgentRuns`; `prepareTermination` is unchanged |
| E-A3 | The fence interrupts, cancels queued input, bounds rejected interrupts at 5 s and can be retried | D1 reuses it as is (DEC-001 matches) |
| E2, E5 | After an interrupt, shutdown closes in 0.028 s (Codex) and 0.39 s (Claude) | D1 is enough for the normal path; D2 is the safety net |
| E-A4, E3, E9 | Runtime CLIs inherit the group, clean commands on SIGTERM, and are not enumerable | D2/D3: process-group SIGTERM, not a registry |
| E6, E-A5 | `will-quit` is not deferred; the server is not a group leader | D3: defer quit, detached spawn, group escalation |
| E-A7 | Docker and terminal already signal the whole group | D2 signals its group only when Electron made it the leader |

## Intended Change
- **D1 — Stop-now interrupts (REQ-001).**
  - `AgentRunManager.terminateAgentRun(runId)` first awaits `run.fenceInputAndInterruptForRootShutdown()`.
    - If it is not accepted: return `false` (Terminate rejected; the user can retry, F-3) without preparing.
    - If it is accepted: continue to `prepareAgentRunTermination` → `commit().finish()`, unchanged.
  - `AgentRunManager.stopAllAgentRuns()` fences **all** active runs concurrently (`Promise.allSettled`) before the
    existing sequential prepare/finish loop.
    - A run whose fence was not accepted or threw is recorded in `errors` and skipped in the loop. The run stays
      root-fenced; the D2 bound ends the process.
    - Prepared-but-unpublished runs (the first loop) are unchanged.
  - `prepareTermination`, `tryPrepareTerminationIfQuiescent` and every Team, Org and copy caller are **unchanged**.
- **D2 — Bounded server shutdown (REQ-002, REQ-003).**
  - `server-runtime.ts` races `app.close()` against `SERVER_SHUTDOWN_TIMEOUT_MS = 10_000`.
  - On a clean close: `process.exit(0)`, as today.
  - On a close error: `process.exit(1)`, as today.
  - On expiry, the forced exit:
    1. log `Server shutdown exceeded 10s; forcing exit` with the still-pending stage, if known;
    2. **if `AUTOBYTEUS_SERVER_PROCESS_GROUP_LEADER=1`** (set only by the desktop app, D3): ignore further SIGTERM,
       send `SIGTERM` to its own process group (`process.kill(-process.pid, "SIGTERM")`), wait
       `RUNTIME_PROCESS_GROUP_GRACE_MS = 1500` so the runtime CLIs can clean their tool commands, then send
       `SIGKILL` to the group;
    3. otherwise exit only itself. Docker and terminals already signal the whole group (E-A7).
    4. `process.exit(1)`.
  - Owner: a new `src/server-process-shutdown.ts` beside `server-runtime.ts`, holding the race, the forced exit and
    the group signal. `registerShutdownHandlers` calls it.
- **D3 — The desktop quit waits and escalates (REQ-004).**
  - macOS and Linux managers spawn the server with `detached: true` (own process group; stdio pipes unchanged) and set
    `AUTOBYTEUS_SERVER_PROCESS_GROUP_LEADER=1` in its env.
  - `BaseServerManager.stopServer`:
    1. SIGTERM the server;
    2. wait for `close` up to `serverShutdownTimeoutMs = 15_000` (replacing `gracefulShutdownTimeoutMs = 5000`);
    3. on expiry: `SIGTERM` the server's process group (`process.kill(-pid, …)`), wait 1.5 s, then `SIGKILL` the group;
    4. resolve on `close`, or after the group SIGKILL.
  - `WindowsServerManager`: the same 15 s for its existing `taskkill /t` → `/f` sequence (it already kills the tree).
  - `ElectronApplication`:
    - `will-quit`: if the server stop has not completed, `event.preventDefault()`, run `stop()` once, then call
      `app.quit()` when it settles. A re-entrant `will-quit` while stopping is prevented again; once stopped it passes
      through.
    - The existing `before-quit` 8 s timer (`app.quit()`) stays harmless: it re-enters `will-quit`, which is still
      prevented while stopping.
- **Docs:**
  - `autobyteus-server-ts/docs/modules/agent_execution.md` ("Published-Run Termination": stop-now entry points fence
    first);
  - the server shutdown bound (in the server runtime docs, or wherever startup/shutdown is documented);
  - the `autobyteus-web` Electron docs (quit waits up to 15 s; the server runs in its own process group).

## Relevant Behavior And Production-Path Map (Mandatory)
| BEH | REQ / AC | Trigger | Existing | Target path | Spine |
| --- | --- | --- | --- | --- | --- |
| BEH-001 | REQ-001; AC-001 | User Terminate | E8 | `terminateAgentRun` → fence (interrupt, cancel queued) → prepare → finish | DS-001 |
| BEH-002 | REQ-001, REQ-002; AC-002, AC-003 | SIGTERM/quit | E1, E5 | `shutdown` → bounded `app.close` → `stopAll…` → fence all → finish; at 10 s, forced exit | DS-002 |
| BEH-003 | REQ-003; AC-002, AC-003 | Shutdown | E3, E9 | Graceful: per-run runtime close (existing). Forced: group SIGTERM → CLIs clean their commands → group SIGKILL | DS-002, DS-003 |
| BEH-004 | REQ-004; AC-004, AC-005 | Cmd+Q / SIGTERM to the app | E6 | `will-quit` deferred → `stopServer` 15 s → group escalation → `app.quit` | DS-003 |
| BEH-005 | REQ-005; AC-006 | Relaunch | T-08c | Unchanged (persistence untouched) | — |

## Relevant Supplemental Task Artifacts
| Path | Relationship |
| --- | --- |
| `evidence/` (E1–E9, the Electron probe, the temporary probe and diagnostics) | Root-cause basis; the probe shape is reusable for AC-001/002 |

## Task Design Health Assessment (Mandatory)
- Change posture: `Bug Fix`.
- Current design issue found: `Yes`.
- Root cause classification: `Missing Invariant`. The "stop now" owners do not enforce "interrupt before terminate",
  which the root owners already do. The process owners (server runtime, desktop manager) do not enforce "bounded
  exit, no survivors".
- Refactor needed now: `No` (targeted invariants in existing owners). No new subsystem; one small new file for the
  server shutdown policy.
- Evidence: E1–E9, E-A2 to E-A7.
- Design response: D1 to D3.
- Deferrals and residual risk:
  - DEC-003 (Codex Stop gap) and DEC-004 (data-root guard) are follow-up candidates.
  - The non-desktop forced exit relies on the host signalling the group (E-A7).
  - Runtimes not live-tested (AutoByteus native tool commands, AGY, ACP, Grok) rely on the group SIGTERM plus their
    own cleanup.

## Terminology
- **Stop-now entry point:** `terminateAgentRun`, `stopAllAgentRuns`.
- **Fence:** `AgentRun.fenceInputAndInterruptForRootShutdown`.
- **Group escalation:** SIGTERM to the process group, a grace period, then SIGKILL to the group.

## Design Reading Order
Standard.

## Legacy Removal Policy (Mandatory)
- `gracefulShutdownTimeoutMs = 5000` is replaced by `serverShutdownTimeoutMs = 15_000`, with no dual constant.
- The non-deferred `will-quit` → `void stop()` is replaced.
- The unbounded `await app.close()` in `server-runtime.ts` is replaced by D2.
- No compatibility paths.

## Persisted Data / State Transition Decision
- `Not Affected`. No stored shape changes. The forced exit may lose an unfinished interrupted turn's partial work,
  which is an accepted loss (requirements: Data Continuity).

## Data-Flow Spine Inventory
| Spine | Scope | BEH | Start | End | Owner |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary | BEH-001 | Web Terminate (GraphQL `terminateAgentRun`, or `stopRoot` → host) | Run inactive, runtime closed | `AgentRunManager` |
| DS-002 | Primary | BEH-002, BEH-003 | SIGTERM/SIGINT to the server | Process exit ≤ 10 s, no runtime survivors | `server-process-shutdown` → `GeneralProcessRunSupervisor` → managers |
| DS-003 | Primary | BEH-003, BEH-004 | User quit / SIGTERM to Electron main | Electron exits after the server group is gone (≤ ~17 s) | `ElectronApplication` → `BaseServerManager` |

## Primary Execution Spine(s)
- DS-001: `Web Terminate → GraphQL/AgentRunService → StandaloneAgentRunRootManager.stopRoot → root.stop → StandaloneAgentRunLifecycleService.terminateHost → AgentRunManager.terminateAgentRun → AgentRun.fenceInputAndInterruptForRootShutdown → (runtime interrupt → turn ends) → prepareAgentRunTermination → commit().finish() → backend.terminate (runtime CLI closed)`
- DS-002: `SIGTERM → serverProcessShutdown (10 s race) → app.close → closeProcessResources → supervisor.closeInternal → org/team/standalone roots (fence children) → AgentRunManager.stopAllAgentRuns (fence all → finish each) → exit 0 | at 10 s: group SIGTERM → 1.5 s → group SIGKILL → exit 1`
- DS-003: `Cmd+Q → before-quit → will-quit (preventDefault) → ElectronApplication.stop → BaseServerManager.stopServer (SIGTERM; ≤ 15 s) → [server exits via DS-002] | at 15 s: group SIGTERM → 1.5 s → group SIGKILL → app.quit → will-quit passes → exit`

## Spine Narratives (Mandatory)
| Spine | Narrative | Owner |
| --- | --- | --- |
| DS-001 | Terminate now interrupts the busy turn and cancels unstarted queued input via the existing fence, then finishes as before. A failed fence makes Terminate report not-accepted, so the user can retry. | `AgentRunManager` |
| DS-002 | Shutdown runs as today, except that standalone runs are fenced first, so busy turns end in milliseconds. A 10 s bound guarantees exit. When the server leads its own process group, its runtime CLIs get SIGTERM to clean their commands before the group is killed. | `server-process-shutdown` |
| DS-003 | Quit waits for the server's own bounded shutdown (normally under 1 s). If the server outlives 15 s, the desktop kills its group. Electron only finishes quitting afterwards. | `ElectronApplication`, `BaseServerManager` |

## Spine Actors / Main-Line Nodes
`AgentRunManager`, `AgentRun` (fence), `server-process-shutdown`, `GeneralProcessRunSupervisor`, `BaseServerManager`
(plus the platform managers), `ElectronApplication`.

## Ownership Map
- `AgentRunManager` owns the stop-now policy for published standalone runs: fence first.
- `server-process-shutdown` owns the server process's bounded exit and forced group termination.
- `BaseServerManager` and the platform managers own the embedded server's process lifecycle: spawn as group leader,
  bounded stop, group escalation.
- `ElectronApplication` owns the app quit sequencing (deferral until the server is stopped).

## Thin Entry Facades / Public Wrappers
N/A.

## Removal / Decommission Plan (Mandatory)
| Item | Replaced by | Scope |
| --- | --- | --- |
| Unbounded `await app.close()` in `server-runtime.ts` | `server-process-shutdown.ts` | In this change |
| `gracefulShutdownTimeoutMs = 5000` and its SIGKILL of the single PID | `serverShutdownTimeoutMs = 15_000` plus group escalation | In this change |
| Non-deferred `will-quit` → `void this.stop()` | Deferred quit | In this change |

## Return Or Event Spine(s)
- Run status publication on termination is unchanged (the interrupted turn is shown as interrupted; non-goal).

## Bounded Local / Internal Spines
- `stopServer` state: `running → SIGTERM sent → (close) stopped | (15 s) group SIGTERM → (1.5 s) group SIGKILL → stopped`.
- Server forced exit: `pending close → (10 s) → [leader: ignore SIGTERM → group SIGTERM → 1.5 s → group SIGKILL] → exit(1)`.

## Off-Spine Concerns Around The Spine
| Concern | Serves | Responsibility |
| --- | --- | --- |
| Shutdown logging | `server-process-shutdown`, `BaseServerManager` | Record a forced path with the elapsed time (operability) |

## Ownership Boundaries
- Callers of termination keep using `AgentRunManager`; they do not call the fence themselves.
- Only the desktop decides group leadership, and it tells the server through one env flag. The server never signals
  a group it does not lead.

## Boundary Encapsulation Map
| Boundary | Encapsulates | Forbidden bypass |
| --- | --- | --- |
| `AgentRunManager.terminateAgentRun` / `stopAllAgentRuns` | Fence + prepare + finish ordering | Callers fencing separately |
| `serverProcessShutdown` | The bound, forced exit, group signal | Other modules calling `process.exit` for shutdown |
| `BaseServerManager.stopServer` | Signals and escalation | `ElectronApplication` signalling the server directly |

## Dependency Rules
- `server-runtime.ts` → `server-process-shutdown.ts`. `server-process-shutdown.ts` depends only on Node `process`
  and the logger.
- `AgentRunManager` uses `AgentRun`'s public fence method (no internal access).
- Electron: `ElectronApplication` → `BaseServerManager.stopServer` (unchanged API).

## Interface Boundary Mapping
| Interface | Responsibility | Notes |
| --- | --- | --- |
| `AgentRunManager.terminateAgentRun(runId): Promise<boolean>` | Stop now: fence, prepare, finish | Signature unchanged; `false` also when the fence is not accepted |
| `AgentRunManager.stopAllAgentRuns(): Promise<void>` | Shutdown: fence all, then finish each | Unchanged signature |
| `registerServerProcessShutdown(app, { timeoutMs, groupGraceMs, ownsProcessGroup, exit, killGroup })` | Bounded exit | Injectable for tests |
| `BaseServerManager.stopServer(): Promise<void>` | Bounded stop with group escalation | Unchanged signature |

## Interface Boundary Check
All boundaries are singular, with explicit identity. Low ambiguity risk.

## Main Domain Subject Naming Check
| Name | OK? |
| --- | --- |
| `server-process-shutdown.ts`, `SERVER_SHUTDOWN_TIMEOUT_MS`, `RUNTIME_PROCESS_GROUP_GRACE_MS` | Yes |
| `AUTOBYTEUS_SERVER_PROCESS_GROUP_LEADER` | Yes |
| `serverShutdownTimeoutMs` (desktop) | Yes |

## Existing Capability / Subsystem Reuse Check
| Need | Existing | Decision |
| --- | --- | --- |
| Interrupt and cancel queued input on stop | Root-shutdown fence (`AgentRun`) | Reuse |
| Runtime process cleanup | Each CLI's own SIGTERM cleanup (E3, E9) | Reuse via process group |
| Per-runtime close-all registry | None (the Claude CLI is spawned inside the SDK) | Not created (E-A4) |
| Desktop escalation | `stopServer` SIGTERM→SIGKILL | Extend (group, 15 s) |

## Subsystem / Capability-Area Allocation
| Area | Concern | Decision |
| --- | --- | --- |
| `autobyteus-server-ts/src/agent-execution/services` | Stop-now fence | Extend `agent-run-manager.ts` |
| `autobyteus-server-ts/src` (process entry) | Bounded process shutdown | Create `server-process-shutdown.ts` |
| `autobyteus-web/electron/server` | Spawn as group leader, bounded stop | Extend |
| `autobyteus-web/electron/application` | Deferred quit | Extend |

## Draft File Responsibility Mapping / Final File Responsibility Mapping
| File | Change | Responsibility |
| --- | --- | --- |
| `autobyteus-server-ts/src/agent-execution/services/agent-run-manager.ts` | Modify | D1 |
| `autobyteus-server-ts/src/server-process-shutdown.ts` | Add | D2 policy (≈ 60–80 lines) |
| `autobyteus-server-ts/src/server-runtime.ts` | Modify | Use D2 |
| `autobyteus-web/electron/server/baseServerManager.ts` | Modify | D3 stop: 15 s and group escalation |
| `autobyteus-web/electron/server/macOSServerManager.ts`, `linuxServerManager.ts` | Modify | `detached: true`; env flag |
| `autobyteus-web/electron/server/windowsServerManager.ts` | Modify | 15 s bound (tree kill unchanged) |
| `autobyteus-web/electron/application/electronApplication.ts` | Modify | Deferred `will-quit` |
| Tests (see Guidance) | Add/Modify | — |
| Docs (see Intended Change) | Modify | — |

## Reusable Owned Structures Check
N/A.

## Shared Structure / Data Model Tightness Check
N/A.

## Applied Patterns
- A bounded state machine in `stopServer`.
- A timeout race in the server shutdown.

## Target Subsystem / Folder / File Mapping
As in the file table. No new folders.

## Folder Boundary Check
No change.

## Concrete Examples / Shape Guidance
| Topic | Good | Avoided |
| --- | --- | --- |
| Stop-now | `const fenced = await run.fenceInputAndInterruptForRootShutdown(); if (!fenced.accepted) return false; const prepared = await this.prepareAgentRunTermination(run); return (await prepared.commit().finish()).accepted;` | Changing `AgentRunTermination.prepare` to interrupt (breaks the Team, Org and copy drain-and-cancel flows) |
| Shutdown fence | `await Promise.allSettled(activeRuns.map(r => r.fenceInputAndInterruptForRootShutdown()))`, then the existing loop | Fencing inside the sequential loop (N × 5 s worst case) |
| Group signal | Only when `AUTOBYTEUS_SERVER_PROCESS_GROUP_LEADER=1` | `process.kill(-process.pid)` unconditionally (could signal a parent shell's group) |
| Deferred quit | `app.on('will-quit', e => { if (!this.serverStopped) { e.preventDefault(); void this.stop().finally(() => { this.serverStopped = true; app.quit(); }); } })` | `void this.stop()` with no `preventDefault` |
| Grace before kill | Group SIGTERM, then 1.5 s, then group SIGKILL | An immediate group SIGKILL (Codex leaves orphaned commands on its own SIGKILL, E3) |

## Backward-Compatibility Rejection Log (Mandatory)
| Candidate | Decision |
| --- | --- |
| Keep the old 5 s single-PID SIGKILL alongside | Rejected |
| An env flag to restore drain-on-terminate | Rejected |

## Derived Layering
N/A.

## Change / Refactor Sequence
1. D1 plus unit tests (agent-run-manager: busy run → fence then finish; fence not accepted → `false`; stopAll fences
   concurrently).
2. D2 plus unit tests (fake `app.close` that never resolves → forced exit at 10 s; group-kill only with the flag;
   ordering SIGTERM → grace → SIGKILL).
3. D3 plus unit tests (`BaseServerManager.spec`: escalation at 15 s to the group; resolve on close; the spawn options
   include `detached`; quit deferral with a fake `app`).
4. Docs.
5. Validation: live probe-style AC-001/002 on Codex and Claude, the AC-003 deterministic test, and the isolated
   desktop AC-004/005/006 (API/E2E).

## Key Tradeoffs
- **Process-group signalling versus a per-runtime close-all registry.** The group reaches SDK-spawned CLIs that the
  server cannot enumerate, and uses each CLI's proven SIGTERM cleanup. A registry would touch every runtime and still
  miss the Claude SDK's child.
- **The fence at two entry points versus changing `prepareTermination`.** This keeps the intended graceful drain for
  Team, Org and copy flows.
- **Detached spawn.** It makes the server a group leader so the desktop can kill the whole tree. On an app crash the
  server already survives today (non-detached children are not killed on POSIX), so nothing regresses. DEC-004 covers
  that case later.

## Risks
- The fence's accepted-interrupt wait is unbounded if a runtime never ends its turn. D2 (10 s) and D3 (15 s) bound it.
- A detached spawn must keep the stdout/stderr piping and the startup readiness detection; verify that.
- A deferred quit must not hang auto-update installs or other `app.quit()` callers. They all pass through
  `will-quit`, so verify with the update flow.
- Native AutoByteus shell tool commands may run in their own process groups. Graceful terminate handles them; the
  forced path may not, so live validation must check this (ASM-002).

## Guidance For Implementation
- D1: add tests that assert ordering (fence before prepare) and the concurrency of stopAll fencing. Do not edit
  `AgentRunTermination`.
- D2: make the timers, `process.kill` and exit injectable. Keep the `once` signal handlers. The forced path must log
  before exiting.
- D3: `process.kill(-pid, sig)` throws when the group is gone; treat ESRCH as stopped. On Windows keep `taskkill /t`.
- Validation evidence must include process-tree snapshots (PID/PPID/PGID) like E1–E9, showing no runtime CLI or tool
  command left.
- Record any runtime whose CLI survives the group SIGTERM as a Design Impact.
