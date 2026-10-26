# Design Spec — busy-quit-shutdown-orphan

## Solution And Approval Basis
- Current solution revision ID: `SR-005` (2026-10-26, autobyteus-284): the SR-004 design re-checked against
  `origin/personal` @ `d74f75a51a` after a clean rebase. SR-004 revised SR-003 for ARCH-REV-001 (Fail: AR-001 to AR-003).
- Authorities read (SR-005): the solution-designer skill gates (`requirements-engineering.md`, `architecture-design.md`,
  `design-principles.md`, `ticket-scope.md`, `finding-the-cause.md`, `handoff.md`); project `DESIGN.md` and
  `GLOSSARY.md` (§ Nodes). No conflict found. Persisted data is not affected, so the Data Migration Guideline does not
  apply.
- Approved requirements: `requirements-doc.md`, Approved in SR-002. DEC-001 is "cancel queued input", DEC-002 is
  "10 s / 15 s", and DEC-003 and DEC-004 are not in this ticket.
- **Pending requirement delta: DEC-005** (application-initiated terminate also interrupts; AR-001). Proposed and
  awaiting user approval. The D1 shape does not change either way; only the disposition of the application callers
  depends on it.
- Added in SR-005 within the direction (DEC-006): BEH-007 preserved (shutdown never records `terminatedAt`), AC-009
  (relaunch gives one server), AC-010.
- Design status: `Ready` (pending DEC-005 approval).
- Investigation notes: `investigation-notes.md` (E1–E9, RC-1 to RC-5, E-A1 to E-A12).
- Workspace:
  - Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/busy-quit-shutdown-orphan`.
  - Branch `codex/busy-quit-shutdown-orphan`.
  - Base `origin/personal` @ `d74f75a51a` (rebased 2026-10-26 from `02d6ddf05`). Target `personal`.

## SR-005 Re-check Against Today's Code (2026-10-26)
Evidence: investigation notes E-A13 to E-A24 (all `Read`). Result: **D1, D2 and D3 stand unchanged in shape.** The
deltas are factual and small:
- **D1:** same owners, same callers (E-A13, E-A14; line numbers refreshed below). The new `forceTerminate` (Task-scoped
  force release) and the idle-shutdown background-task check are not stop-now entry points and are left alone.
  `stopAllAgentRuns` and the supervisor must keep **not** calling `recordRunTerminated` (BEH-007, E-A15): the fence is
  added inside `AgentRunManager`, which never writes history, so this holds by construction; AC-010 tests it.
- **D2:** `server-runtime.ts` shutdown is unchanged in shape (E-A16). The move to `src/utils/process-tree.ts` takes
  today's AGY functions (E-A18): `parseProcessTable`, the selection (generalized from
  `selectAgyBackgroundProcessGroups(rows, agyPid, serverPid)` to
  `selectDescendantProcessGroups(rows, rootPid, excludedPgids)`), `signalProcessGroups`, `processGroupsInactive`, plus
  the new `selectDescendantPidsInGroup` and `signalPids`. `signalProcessGroups` keeps its current error contract
  (ESRCH skipped; other errors thrown together); the server sweep catches, logs and continues, so step 5 below reads
  "skip ESRCH; log EPERM and other errors and continue". AGY's `listAgyBackgroundProcessGroups(agyPid)` becomes a call
  of `readProcessTable()` + `selectDescendantProcessGroups(rows, agyPid, [agyPgid, serverPgid])` inside
  `agy-stream-process.ts`. Doc `docs/modules/antigravity_cli_runtime.md:317` is updated.
- **Claude (E-A17):** the server now owns the Claude CLI process (`ClaudeSdkProcessOwner`: EOF → 2 s → SIGTERM → 5 s →
  SIGKILL). The graceful path therefore ends Claude itself; the sweep remains the net for a forced or wedged exit and
  for tool commands in other groups. No change to the Claude owner. Because the finish loop is sequential, U-A1 is
  measured in validation (several busy Claude runs); the bound holds either way.
- **Application workers and runtime probes (E-A19):** server descendants in the server's group, covered by sweep target
  (a). No change.
- **D3:** the desktop code is unchanged in shape (E-A21). Every quit entry goes through the one memoized `stop()`:
  Cmd+Q / menu Quit, OS SIGTERM, the 8 s `before-quit` timer, the renderer's `start-shutdown` IPC (`app.quit()`), the
  updater's `quitAndInstall`, and `main.ts`'s startup-failure cleanup (which calls `stop()` and then `app.exit(1)`;
  awaiting the memoized stop keeps it correct). `restart-server` and `reset-server-data` call `stopServer` directly and
  get the 15 s bound and sweep with no quit involved.
- **Relaunch (E-A22, AC-009):** the desktop already refuses to start while the old server still listens. After D2/D3 no
  closing server outlives a quit, so a relaunch starts one server. A force-killed or crashed app stays DEC-004 (FU-2).
- **Bound for operators (E-A23):** the server's own worst-case exit is about 11.5 s (10 s + one `ps` + 1.5 s grace).
  The Docker and supervisord stop grace (10 s today) is the autobyteus-283 follow-up FU-002; this ticket records the
  value (about 15 s) in `follow-ups.md` and does not change Docker files (Change Scope).

## Change Scope (Mandatory)
- In scope: UC-001 to UC-004. Areas: the stop-now methods of `AgentRunManager` (D1); the server process's shutdown
  handler and a new process-tree utility moved out of AGY (D2); the desktop's server stop and quit sequencing,
  macOS/Linux and Windows managers (D3); their tests and docs.
- Derived consumers: the moved AGY process-table helper feeds `agy-stream-process.ts` (re-pointed, same behavior) and
  its tests (moved or re-mocked). No stored structure changes; `N/A` otherwise.
- Deliberately left alone:
  - `AgentRunTermination.prepare` / `tryPrepareIfQuiescent` / `forceTerminate` and the Team, Org, task-copy and
    Mixed-Team drain-and-cancel flows (E-A2, E-A14);
  - root-hosted child fencing (already interrupts);
  - the run history writers (`recordRunTerminated`), so BEH-007 holds;
  - the Claude process owner's own release sequence (E-A17);
  - composer Stop (DEC-003), a data-root guard (DEC-004), native background processes on run Terminate (FU-003);
  - Docker, supervisord and launcher stop timeouts (autobyteus-283 FU-002) and Windows graceful stop verification
    (autobyteus-283 FU-001).
- Follow-ups: `follow-ups.md` FU-001 (DEC-003), FU-002 (DEC-004), FU-003 (native background processes on Terminate),
  FU-004 (the stop grace value for autobyteus-283 FU-002).

## SR-004 Changes Against SR-003 (ARCH-REV-001)
- **AR-001:** the application callers are mapped (DS-001b, DS-002). The application-scope `stopAllAgentRuns` is part
  of SCN-002. Application-initiated `terminateAgentRun` is DEC-005.
- **AR-002:** the quit deferral is keyed to **one memoized stop promise**. The example is corrected, the 8 s timer
  wording is fixed, a re-entry test is added, and the updater is verified (N-2).
- **AR-003:** the process-group/env-flag forced path is **replaced by a process-tree sweep**. It reuses and
  generalizes AGY's existing process-table selector. The sweep:
  - runs at the end of every server shutdown, graceful or forced, so native background processes, native foreground
    shells, AGY daemons and runtime CLIs are covered;
  - covers the non-leader case;
  - lets the desktop use the same algorithm when the server itself is wedged.

  The env flag, detached spawn and leader-only group kill are dropped (N-1 becomes moot).
- **ASM-002 dispositions:**
  - (a) Native foreground commands are aborted by the interrupt (E-A9).
  - (b) Native background processes are stopped at server shutdown by the sweep. Their lifetime on a run **Terminate**
    is unchanged: they outlive Terminate as today, which is not in the approved scope. Recorded as follow-up FU-3.
  - (c) Detached groups on the forced path are covered by the sweep (E-A11).
  - (d) Non-leader forced exit is covered by the sweep (it never signals the server's own group).
  - Residual: Windows server-side sweep. `ps` is POSIX; on Windows the desktop's existing `taskkill /t` tree kill
    remains the net.

## Current-State Read
- **Stopping a run now (RC-1).**
  - User Terminate, application terminate and server shutdown reach `AgentRunManager.terminateAgentRun` and
    `stopAllAgentRuns`. Both use `prepareAgentRunTermination`, a graceful drain that never interrupts and waits for the
    turn to finish (E1, E5, E8, E-A8).
  - Root-hosted children are fenced and interrupted first by their roots.
  - The graceful drain is intended for the Team, Org and copy flows that may cancel (E-A2).
- **Server shutdown (RC-2):** `server-runtime.ts` awaits `app.close()` without a bound (E-A6).
- **Desktop (RC-3):** `will-quit` does not wait, so main exits right after SIGTERM, and the escalation never runs (E6,
  E-A5). `stop()` is re-entrant-unsafe for deferral (E-A12).
- **Process ownership (RC-4):** spawned processes are all descendants of the server.
  - Runtime CLIs share its group.
  - Native shells, CLI tool commands and AGY daemons lead their own groups.
  - Native background processes have no stop caller (E-A9 to E-A11).

## Task Size And Architectural Risk (Mandatory)
- **Task size: `Large`.** Server run termination; server process shutdown with a process-tree sweep (one shared
  utility moved out of AGY); the desktop server stop and quit lifecycle. Live and desktop validation on two runtimes.
- **Architectural risk: `High`.** Changed stop semantics for every standalone run on every runtime; process-tree
  signalling at shutdown; Electron quit sequencing. All are concurrency- and process-ownership-sensitive.
- **Escalation triggers:**
  - interrupt-first breaks a caller's expectation;
  - the sweep signals something the server did not spawn;
  - a runtime's processes survive the sweep;
  - deferral blocks an idle quit or the updater.

## Architecture Investigation Evidence
- Project design guideline: `DESIGN.md`. Applied: reuse the fence and AGY's process-table selector; no registry; the
  smallest owners. No conflicts.

| Source | Observation | Decision |
| --- | --- | --- |
| E1, E5, E8; `agent-run-termination.ts:133-151` | No interrupt on prepare | D1: fence first at the stop-now entry points |
| E-A2 | Drain and cancel flows depend on `prepareTermination` | D1 limited to the two entry points |
| E-A3 | The fence interrupts, cancels queued input, and bounds rejected interrupts | D1 reuses it |
| E-A8 | Application callers enter the same entry points | DS-001b; DEC-005 |
| E-A9 | Native foreground is aborted by interrupt; background `stopAll` is uncalled | The sweep at shutdown; FU-3 for Terminate |
| E-A10, E-A11 | The AGY process-table selector exists; every spawned process is a descendant | D2 sweep, reusing it (moved to `utils`) |
| E6, E-A5, E-A12 | `will-quit` is not deferred; `stop()` re-entry returns early | D3 memoized stop and deferral |

## Intended Change
- **D1 — Stop-now interrupts (REQ-001).** Unchanged from SR-003.
  - `AgentRunManager.terminateAgentRun` awaits `run.fenceInputAndInterruptForRootShutdown()` first.
    - If it is not accepted, return `false` (Terminate rejected; retryable, F-3).
    - Otherwise prepare → `commit().finish()`, unchanged.
  - `stopAllAgentRuns` fences all active runs concurrently (`Promise.allSettled`) before the existing loop. A run whose
    fence failed is recorded in `errors` and skipped. Prepared-but-unpublished runs are unchanged.
  - `prepareTermination` and the Team, Org, copy and Mixed-Team callers are unchanged.
  - Callers that now get interrupt-first:
    - user Terminate (DS-001);
    - history delete/archive and root stop through `stopRoot` → host (DS-001);
    - the process-level and application-scope `stopAllAgentRuns` during server close (DS-002);
    - application-initiated terminate (DS-001b, **DEC-005**).
- **D2 — Bounded server shutdown with a process-tree sweep (REQ-002, REQ-003).** New
  `src/server-process-shutdown.ts`, called from `registerShutdownHandlers` (`once` handlers kept).
  1. Race `app.close()` against `SERVER_SHUTDOWN_TIMEOUT_MS = 10_000`. On expiry, log
     `Server shutdown exceeded 10s; forcing exit` and stop waiting.
  2. **Always**, on clean close, close error or expiry, run `terminateServerProcessTree()`:
     1. snapshot the process table once (`ps -A -o pid=,ppid=,pgid=`; POSIX only, Windows → no-op);
     2. select **targets**:
        - (a) the pids of the server's live descendants that are in the server's own group (runtime CLIs);
        - (b) the process groups led by a live descendant of the server, excluding the server's own group and
          pgid ≤ 1 (native shells and background processes, CLI tool commands, AGY daemons);
     3. if there are no targets, return immediately (an idle shutdown stays at ~0.3–0.4 s);
     4. otherwise send SIGTERM to the (a) pids and (b) groups, poll up to `PROCESS_TREE_GRACE_MS = 1500` until the
        recorded targets are gone, then SIGKILL the survivors among the **recorded** targets;
     5. skip ESRCH per target; log EPERM and any other signal error and continue with the rest (SR-005).
  3. `process.exit(0)` after a clean close, otherwise `process.exit(1)`.
  - Owner: the process-table parsing and selection move from
    `agent-execution/backends/antigravity/stream/agy-background-process-groups.ts` to
    `src/utils/process-tree.ts`. Functions: `parseProcessTable`, `readProcessTable`,
    `selectDescendantProcessGroups(rows, rootPid, excludedPgids)`, `selectDescendantPidsInGroup(rows, rootPid, pgid)`,
    `signalProcessGroups`, `signalPids`.
  - AGY keeps its behavior through `selectDescendantProcessGroups(rows, agyPid, [agyPgid, serverPgid])`.
  - `agy-background-process-groups.ts` is removed (its test moves with the utility).
- **D3 — The desktop quit waits and escalates (REQ-004).**
  - `BaseServerManager.stopServer`:
    1. SIGTERM the server **once**;
    2. wait for `close` up to `serverShutdownTimeoutMs = 15_000` (replaces `gracefulShutdownTimeoutMs = 5000`);
    3. on expiry (the server is wedged and its own D2 did not run), sweep the server's process tree with the same
       algorithm as D2 (targets for root = server pid, plus the server pid itself): SIGTERM, 1.5 s, SIGKILL;
    4. resolve on `close`, or after the sweep.
  - macOS and Linux spawn options are **unchanged** (no detached spawn, no env flag).
  - `WindowsServerManager`: the same 15 s for its existing `taskkill /t` → `/f` tree kill.
  - The desktop helper `electron/server/serverProcessTree.ts` (process-table parse and select) is a small copy of the
    server utility. Electron main cannot import server code; the duplication is documented and kept test-equivalent.
  - **`ElectronApplication` (AR-002):**
    - `stop()` returns one memoized promise: `this.stopping ??= this.stopOnce()`. `hasShutdownRun` is replaced by
      `stopping`.
    - `will-quit`: if `!this.stopped`, call `event.preventDefault()`, then
      `this.stop().finally(() => { this.stopped = true; app.quit(); })`. Every re-entry (second Cmd+Q, OS SIGTERM,
      the 8 s `before-quit` timer, the updater) awaits the **same** promise and is prevented again until it settles.
    - When `stopped` is true, `will-quit` passes through.
    - The `before-quit` 8 s timer only re-enters `will-quit`, which is prevented while the single stop is in flight.
      It cannot shorten the stop.
- **Docs:**
  - `autobyteus-server-ts/docs/modules/agent_execution.md` (stop-now entry points fence first; the application
    callers);
  - server shutdown (the 10 s bound and process-tree sweep);
  - AGY docs if they name the moved helper;
  - the `autobyteus-web` Electron docs (quit waits for the server up to 15 s, then a tree sweep).

## Relevant Behavior And Production-Path Map (Mandatory)
| BEH | REQ / AC | Trigger | Target path | Spine |
| --- | --- | --- | --- | --- |
| BEH-001 | REQ-001; AC-001 | User Terminate, history delete/archive | `terminateAgentRun` → fence → prepare → finish | DS-001 |
| BEH-001 (app) | REQ-001 via **DEC-005**; AC-008 (proposed) | An application's `terminateAgentRun` (SDK scope; orchestration `terminateRunBinding`) | `AgentRunService.terminateAgentRun` → `AgentRunManager.terminateAgentRun` → fence → … | DS-001b |
| BEH-002 | REQ-001, REQ-002; AC-002, AC-003 | SIGTERM/quit | `server-process-shutdown` → bounded `app.close` → process and application-scope `stopAll…` (fence all) → sweep → exit | DS-002 |
| BEH-003 | REQ-003; AC-002, AC-003 | Shutdown | Graceful per-run close, then **always** the process-tree sweep | DS-002 |
| BEH-004 | REQ-004; AC-004, AC-005 | Cmd+Q / SIGTERM to the app | Deferred `will-quit` (one stop promise) → `stopServer` ≤ 15 s → (wedged) tree sweep | DS-003 |
| BEH-005 | REQ-005; AC-006 | Relaunch | Unchanged | — |

## Relevant Supplemental Task Artifacts
| Path | Relationship |
| --- | --- |
| `evidence/` | Root-cause basis; probe shape reusable for AC-001/002 |
| `design-review-report.md`, `architecture-review-revision-record.md` (ARCH-REV-001) | Findings answered here |

## Task Design Health Assessment (Mandatory)
- Change posture: `Bug Fix`.
- Current design issue found: `Yes`.
- Root cause classification: `Missing Invariant`.
  - "Stop now" does not interrupt.
  - The process owners do not enforce a bounded exit with no survivors.
  - Native background processes have no stopper at shutdown.
- Refactor needed now: `Yes, small`. The AGY process-table selector moves to `utils` because two owners now need it.
- Design response: D1 to D3.
- Deferrals and residual risk:
  - FU-1 (DEC-003), FU-2 (DEC-004) and FU-3 (native background processes outliving a run **Terminate**; unchanged,
    not in scope);
  - the Windows server-side sweep (the desktop tree kill covers the desktop);
  - user Terminate stays unbounded if a runtime accepts an interrupt but never ends its turn (N-3). AC-001 is the gate.

## Terminology
- **Stop-now entry point:** `terminateAgentRun`, `stopAllAgentRuns`.
- **Fence:** `fenceInputAndInterruptForRootShutdown`.
- **Process-tree sweep:** signal recorded descendant targets of a root pid (the root group's descendant pids, plus
  descendant-led groups): SIGTERM, grace, then SIGKILL.

## Design Reading Order
Standard.

## Legacy Removal Policy (Mandatory)
- Removed:
  - the unbounded `await app.close()`;
  - `gracefulShutdownTimeoutMs = 5000` and the single-PID SIGKILL;
  - the non-deferred `void this.stop()`;
  - `hasShutdownRun`;
  - `agy-background-process-groups.ts` (moved to `utils/process-tree.ts`; no re-export shim).

## Persisted Data / State Transition Decision
- `Not Affected`.

## Data-Flow Spine Inventory
| Spine | Scope | BEH | Start | End | Owner |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary | BEH-001 | Web Terminate / history delete | Run inactive | `AgentRunManager` |
| DS-001b | Primary | BEH-001 (app) | Application SDK `terminateAgentRun` / orchestration `terminateRunBinding` | Run inactive | `AgentRunManager` (via `AgentRunService`) |
| DS-002 | Primary | BEH-002, BEH-003 | SIGTERM/SIGINT to the server | Exit ≤ 10 s plus grace; no descendants | `server-process-shutdown` |
| DS-003 | Primary | BEH-004 | User quit / SIGTERM to Electron | Electron exits after the server is gone | `ElectronApplication`, `BaseServerManager` |

## Primary Execution Spine(s)
- DS-001: `Web Terminate → GraphQL → StandaloneAgentRunRootManager.stopRoot → root.stop → terminateHost → AgentRunManager.terminateAgentRun → fence (interrupt; cancel queued) → prepare → commit().finish() → backend.terminate`
- DS-001b: `Application engine capability / SDK scope → AgentRunService.terminateAgentRun → AgentRunManager.terminateAgentRun → (as DS-001)`
- DS-002: `SIGTERM → serverProcessShutdown (10 s race) → app.close → application lifecycle stop (application-scope stopAllAgentRuns: fence all → finish) → closeProcessResources → supervisor (roots fence children; stopAllAgentRuns: fence all → finish) → terminateServerProcessTree (snapshot → targets → SIGTERM → ≤ 1.5 s → SIGKILL survivors) → exit`
- DS-003: `Cmd+Q → before-quit → will-quit (preventDefault) → stop() [memoized] → stopServer (SIGTERM once; ≤ 15 s) → [server exits via DS-002] | 15 s: tree sweep of the server → settle → stopped = true → app.quit → will-quit passes`

## Spine Narratives (Mandatory)
| Spine | Narrative | Owner |
| --- | --- | --- |
| DS-001 / DS-001b | Terminate interrupts the busy turn and cancels unstarted queued input via the fence, then finishes as before. A failed fence reports not-accepted, so the caller can retry. | `AgentRunManager` |
| DS-002 | Shutdown fences every standalone and application run first, so busy turns end in milliseconds. A 10 s bound guarantees progress. A final process-tree sweep removes anything still spawned by the server: runtime CLIs, tool commands, native background shells, AGY daemons. | `server-process-shutdown` |
| DS-003 | Quit holds Electron until the single server-stop promise settles, normally in under a second. A wedged server is tree-swept at 15 s. | `ElectronApplication`, `BaseServerManager` |

## Spine Actors / Main-Line Nodes
`AgentRunManager`, `AgentRun` (fence), `server-process-shutdown`, `utils/process-tree`, `GeneralProcessRunSupervisor`,
the application lifecycle, `BaseServerManager`, `ElectronApplication`.

## Ownership Map
- `AgentRunManager` owns the stop-now policy (fence first).
- `server-process-shutdown` owns the server's bounded exit and its final tree sweep.
- `utils/process-tree` owns process-table reading and target selection (shared by AGY and server shutdown). It holds
  no policy.
- `BaseServerManager` owns the embedded server's bounded stop and its desktop-side sweep.
- `ElectronApplication` owns the quit sequencing through one memoized stop.

## Thin Entry Facades / Public Wrappers
N/A.

## Removal / Decommission Plan (Mandatory)
| Item | Replaced by | Scope |
| --- | --- | --- |
| Unbounded `await app.close()` | `server-process-shutdown.ts` | In this change |
| `agy-background-process-groups.ts` | `utils/process-tree.ts` (AGY re-pointed) | In this change |
| `gracefulShutdownTimeoutMs` 5 s and the single-PID SIGKILL | 15 s plus tree sweep | In this change |
| `hasShutdownRun` and the non-deferred `will-quit` | Memoized `stopping` plus deferred `will-quit` | In this change |

## Return Or Event Spine(s)
- Run status publication on termination is unchanged.

## Bounded Local / Internal Spines
- Sweep: `snapshot → select targets → none? return : SIGTERM targets → poll ≤ 1.5 s → SIGKILL recorded survivors`.
- `stopServer`: `SIGTERM → (close) done | (15 s) sweep → done`.
- Quit: `idle → stopping (one promise; will-quit prevented) → stopped → quit`.

## Off-Spine Concerns Around The Spine
| Concern | Serves | Responsibility |
| --- | --- | --- |
| Shutdown logging | Server shutdown, `BaseServerManager` | Log the forced path, and the sweep target counts when non-zero |

## Ownership Boundaries
- Callers keep using `AgentRunManager`; nobody fences separately.
- The sweep only ever targets descendants of its root pid and never the root's own group. Groups count only when led
  by a recorded descendant.

## Boundary Encapsulation Map
| Boundary | Encapsulates | Forbidden bypass |
| --- | --- | --- |
| `AgentRunManager` stop-now methods | Fence, prepare, finish ordering | Callers fencing separately |
| `serverProcessShutdown` | The bound, sweep, exit | Other modules calling `process.exit` for shutdown |
| `utils/process-tree` | Process-table parsing and selection | Ad hoc `ps` parsing elsewhere |
| `BaseServerManager.stopServer` | Signals, timeout, sweep | `ElectronApplication` signalling the server |

## Dependency Rules
- `server-runtime.ts` → `server-process-shutdown.ts` → `utils/process-tree.ts`.
- `agy-stream-process.ts` → `utils/process-tree.ts`.
- `utils/process-tree.ts` depends only on Node (`child_process`, `process`). It does not import agent-execution.
- The Electron copy lives in `electron/server/` and is used only by `BaseServerManager`.

## Interface Boundary Mapping
| Interface | Responsibility |
| --- | --- |
| `AgentRunManager.terminateAgentRun(runId): Promise<boolean>` | Stop now (`false` also when the fence is not accepted) |
| `AgentRunManager.stopAllAgentRuns(): Promise<void>` | Fence all, then finish |
| `registerServerProcessShutdown(app, deps)` | Bound plus sweep plus exit; timers, `process.kill`, the process table and exit are injectable |
| `selectDescendantProcessGroups(rows, rootPid, excludedPgids)` / `selectDescendantPidsInGroup(rows, rootPid, pgid)` | Pure selection |
| `BaseServerManager.stopServer(): Promise<void>` | Bounded stop plus sweep |
| `ElectronApplication.stop(): Promise<void>` | Memoized single stop |

## Interface Boundary Check
All boundaries are singular, with explicit identity. Low risk.

## Main Domain Subject Naming Check
`server-process-shutdown.ts`, `utils/process-tree.ts`, `terminateServerProcessTree`, `SERVER_SHUTDOWN_TIMEOUT_MS`,
`PROCESS_TREE_GRACE_MS`, `serverShutdownTimeoutMs`, `serverProcessTree.ts`: all OK.

## Existing Capability / Subsystem Reuse Check
| Need | Existing | Decision |
| --- | --- | --- |
| Interrupt and cancel queued input | Fence | Reuse |
| Process-table descendant selection | AGY `agy-background-process-groups.ts` | **Extend and move** to `utils/process-tree.ts` |
| Per-runtime registry | — | Not created |
| Desktop escalation | `stopServer` | Extend |

## Subsystem / Capability-Area Allocation
| Area | Concern | Decision |
| --- | --- | --- |
| `agent-execution/services` | Stop-now fence | Extend |
| `src/` process entry | Bounded shutdown plus sweep | Create `server-process-shutdown.ts` |
| `src/utils` | Process tree | Create (moved from AGY) |
| `autobyteus-web/electron/server` | Bounded stop plus sweep | Extend; small copy of the selection |
| `autobyteus-web/electron/application` | Memoized stop, deferred quit | Extend |

## Final File Responsibility Mapping
| File | Change | Responsibility |
| --- | --- | --- |
| `autobyteus-server-ts/src/agent-execution/services/agent-run-manager.ts` | Modify | D1 |
| `autobyteus-server-ts/src/server-process-shutdown.ts` | Add | D2 |
| `autobyteus-server-ts/src/server-runtime.ts` | Modify | Use D2 |
| `autobyteus-server-ts/src/utils/process-tree.ts` | Add (moved) | Process table and selection |
| `autobyteus-server-ts/src/agent-execution/backends/antigravity/stream/agy-background-process-groups.ts` | Remove | Moved |
| `autobyteus-server-ts/src/agent-execution/backends/antigravity/stream/agy-stream-process.ts` | Modify | Import the utility (replaces `listAgyBackgroundProcessGroups`) |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/antigravity/agy-background-process-groups.test.ts` | Move | To `tests/unit/utils/process-tree.test.ts`, generalized |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/antigravity/agy-stream-process.test.ts` | Modify | Mock the moved utility |
| `autobyteus-server-ts/docs/modules/antigravity_cli_runtime.md` | Modify | Name the moved helper (line 317) |
| `autobyteus-web/electron/server/baseServerManager.ts` | Modify | 15 s plus sweep |
| `autobyteus-web/electron/server/serverProcessTree.ts` | Add | Desktop copy of the selection |
| `autobyteus-web/electron/server/windowsServerManager.ts` | Modify | 15 s |
| `autobyteus-web/electron/application/electronApplication.ts` | Modify | Memoized stop, deferred `will-quit` |
| Tests and docs | Add/Modify | See Guidance |

## Applied Patterns
- A bounded state machine.
- A timeout race.
- Snapshot-then-signal process-tree teardown.

## Target Subsystem / Folder / File Mapping
As above. `src/utils` already exists.

## Folder Boundary Check
No new folders. `utils/process-tree.ts` is concern-agnostic (shared by two owners).

## Concrete Examples / Shape Guidance
| Topic | Good | Avoided |
| --- | --- | --- |
| Stop-now | `const fenced = await run.fenceInputAndInterruptForRootShutdown(); if (!fenced.accepted) return false; …prepare → finish` | Changing `AgentRunTermination.prepare` |
| Shutdown fence | `await Promise.allSettled(active.map(r => r.fenceInputAndInterruptForRootShutdown()))`, then the existing loop | Fencing inside the sequential loop |
| Sweep targets | Record pids (root's group) and descendant-led pgids **before** signalling; SIGKILL only recorded survivors | Re-listing after SIGTERM (re-parented processes escape); signalling the root's own group |
| Quit deferral | `stop() { return this.stopping ??= this.stopOnce(); }`; `will-quit: if (!this.stopped) { e.preventDefault(); this.stop().finally(() => { this.stopped = true; app.quit(); }); }` | `if (hasShutdownRun) return` with `.finally(app.quit)` (early quit on re-entry) |
| Grace | SIGTERM, then ≤ 1.5 s, then SIGKILL | An immediate SIGKILL (Codex orphans its commands on its own SIGKILL, E3) |

## Backward-Compatibility Rejection Log (Mandatory)
| Candidate | Decision |
| --- | --- |
| Keep `agy-background-process-groups.ts` re-exporting the utility | Rejected |
| An env flag or switch to restore drain-on-terminate | Rejected |
| Keep the 5 s single-PID SIGKILL | Rejected |

## Change / Refactor Sequence
1. Move the process-tree utility; re-point AGY; move its test and keep it green.
2. D1 plus tests (fence before prepare; fence-not-accepted → `false`; concurrent stopAll fence; application-scope
   manager covered by the same code).
3. D2 plus tests:
   - hung `app.close` → 10 s → sweep → exit(1);
   - clean close → sweep with no targets → fast exit(0);
   - target selection, including re-parenting and never the root group;
   - ESRCH/EPERM skips.
4. D3 plus tests:
   - `BaseServerManager.spec`: 15 s → sweep; close resolves early;
   - quit re-entry test: second `will-quit`, the 8 s timer, an updater-style `app.quit()` while stopping → no
     early exit; one stop.
5. Docs.
6. Validation:
   - live AC-001/002 on Codex and Claude plus a native AutoByteus run with a background process;
   - AC-003 deterministic;
   - isolated desktop AC-004/005/006;
   - the updater install path under deferral (N-2).

## Key Tradeoffs
- **Process-tree sweep versus a per-runtime registry or env-flag group kill.** One mechanism covers SDK-spawned CLIs,
  detached native shells, AGY daemons and the non-leader case. It reuses an existing tested selector. It only targets
  descendants recorded at snapshot time.
- **The sweep at every shutdown, not only the forced one.** Native background processes have no other stopper at
  shutdown. With no targets the sweep costs one `ps` call.
- **Desktop copy of the selection logic** (about 40 lines) versus a shared package. Electron main cannot import server
  code; the duplication is tested on both sides.

## Risks
- `ps` missing in minimal Linux images: the sweep logs and skips. The container stop still kills the tree (E-A7).
- PID reuse within 1.5 s is negligible; only recorded targets are signalled.
- Updater `quitAndInstall` under deferral (N-2): verify on macOS and Windows.
- Native background processes still outlive a run **Terminate** (FU-3, unchanged behavior).

## Guidance For Implementation
- D1: do not edit `AgentRunTermination`.
- D2: make everything injectable (timers, process table, kill, exit). Keep the `once` handlers. The desktop sends
  SIGTERM only once (D3), so N-4 holds.
- D3: re-entry tests are mandatory (AR-002). `stopServer` signals SIGTERM once.
- Validation must include process-tree snapshots (PID/PPID/PGID) for Codex, Claude and native, showing zero survivors.
- SR-005 additions for validation: AC-009 (relaunch after quit: one server process for the data folder, by process
  check), AC-010 (shutdown leaves `terminatedAt` empty), U-A1 (shutdown time with two or more busy Claude runs), U-A2
  (record Codex and Claude CLI versions; re-check that the Claude CLI still survives EOF). Prove from a clean clone of
  the final branch, with isolated app data (the desktop `e2e` profile or a temporary data root); never the user's
  installed app or data.
- Record any surviving process class as a Design Impact.
