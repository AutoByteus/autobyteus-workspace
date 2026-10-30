# Design Spec — busy-quit-shutdown-orphan

## Solution And Approval Basis
- Current solution revision ID: `SR-006` (2026-10-30, autobyteus-284). It revises SR-004/SR-005 after
  `backend-port-conflict-20261024` (merged to `personal` 2026-10-26) built part of the earlier D2 and D3. The SR-004
  and SR-005 versions of this file are in git history (`git log -- tickets/in-progress/busy-quit-shutdown-orphan/design-spec.md`);
  their decisions that still apply are carried here, and the SR-006 delta is listed below.
- Approved requirements: `requirements-doc.md`, Approved in SR-002 (DEC-001 cancel queued input; DEC-002 10 s / 15 s;
  DEC-003 and DEC-004 not in this ticket). Added within the direction: DEC-006 (BEH-007, AC-009, AC-010) in SR-005;
  AC-011 in SR-006.
- **Pending user decisions:**
  - **DEC-005**: application-initiated terminate also interrupts (proposed AC-008). The D1 shape does not change
    either way; only the application callers' disposition depends on it.
  - **DEC-007**: the desktop's wait before force-stopping the server: 15 s (approved) or 20 s (already shipped).
    Only one constant depends on it.
- Design status: `Ready` (pending DEC-005 and DEC-007).
- Authorities read (SR-006): the solution-designer skill as updated 2026-10-27 (`SKILL.md`,
  `requirements-engineering.md`, `requirements-doc-template.md`) and its gates (`architecture-design.md`,
  `design-principles.md`, `ticket-scope.md`, `finding-the-cause.md`, `handoff.md`); project `DESIGN.md`, `GLOSSARY.md`
  (§ Nodes). The design of `backend-port-conflict-20261024` (D3.1/D4, its requirements R2) was read as the owner of
  the code it added. No conflict found. Persisted data is not affected, so the Data Migration Guideline does not apply.
- Investigation notes: `investigation-notes.md` (E1–E9, RC-1 to RC-5, E-A1 to E-A32, U-A1 to U-A3).
- Workspace: worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/busy-quit-shutdown-orphan`, branch
  `codex/busy-quit-shutdown-orphan`, base `origin/personal` @ `1a4453e553` (rebased 2026-10-30). Target `personal`.

## SR-006 Delta Against SR-004/SR-005
| Part | SR-004/SR-005 | Today's code (E-A25 to E-A28) | SR-006 |
| --- | --- | --- | --- |
| D1 stop-now interrupts | Fence first in `terminateAgentRun` and `stopAllAgentRuns` | Unchanged; RC-1 holds (E-A13, E-A14) | **Unchanged** |
| D2 bounded server shutdown | New `src/server-process-shutdown.ts` with a 10 s race and a sweep | `ServerProcessShutdown` now exists (`src/shutdown/server-process-shutdown.ts`), owning signals, Windows IPC, the startup barrier and exit, but with **no bound** (E-A25) | Bound and sweep go **into the existing owner**; no new shutdown file |
| D2 native commands | Covered by the sweep | Owned and drained at `preClose` by `NativeCommandProcessScope` (E-A26) | Left to their owner; the sweep is the net for runtime CLIs, their tool commands and AGY daemons |
| D3 desktop quit waits | Memoized stop, deferred `will-quit`, 15 s, desktop sweep | Memoized `ApplicationShutdown`, deferred `will-quit`, updater preparation, 20 s window, POSIX force = SIGKILL of the server PID only, Windows IPC + `taskkill /f /t` (E-A27, E-A28) | **Only the POSIX force changes**: it sweeps the server's tree. The window is DEC-007 |

## Current-State Read
- **Stopping a run now (RC-1).** User Terminate, application terminate and server shutdown reach
  `AgentRunManager.terminateAgentRun` (`agent-run-manager.ts:283`) and `stopAllAgentRuns` (`:299`). Both call
  `prepareAgentRunTermination` → `commit().finish()`. That drains without interrupting and waits for the turn to finish
  (`agent-run-termination.ts:144` `prepareTerminationOnce`; E1, E5, E8). Root-hosted children are fenced and
  interrupted by their roots (`fenceForRootShutdown`, `agent-run-termination.ts:92`).
- **Server shutdown (RC-2).** SIGTERM/SIGINT/IPC → `ServerProcessShutdown.request()` → startup barrier →
  `cleanupOnce()` = `app.close()` without a time limit → IPC result → `exit` (E-A25). `app.close()`: `preClose`
  native command drain (≤ 3 s) → `onClose`: application lifecycle stop (application-scope `stopAllAgentRuns`) →
  `closeProcessResources` → supervisor close (Org, Team, standalone roots, `stopAllAgentRuns`) and the rest
  (`build-studio-server.ts:272-294, 409-413`).
- **Desktop (RC-3 partly fixed).** Quit waits for one memoized stop (≤ 30 s). `stopServer`: SIGTERM (POSIX) or the
  IPC request (Windows), wait 20 s, then force: SIGKILL of the server PID (POSIX) or `taskkill /f /t` (Windows), and 2 s
  to confirm exit (E-A27, E-A28).
- **Process ownership (RC-4).** Runtime CLIs (Codex app-server, Claude CLI, ACP, AGY, Grok) are server descendants in
  the server's process group. Their tool commands and AGY daemons lead their own groups. Native commands lead their
  own anchored groups and are owned by the native scope. Codex cleans its commands on SIGTERM and on EOF; the Claude
  CLI cleans its tree on SIGTERM but **not** on EOF (E3, E9).
- **Today's busy quit (Read, to be re-measured as the "before" baseline):** the server waits for the turn → the desktop
  SIGKILLs the server after 20 s → the Codex app-server sees EOF and cleans up; the Claude CLI and its commands survive.

## Task Size And Architectural Risk (Mandatory)
- **Task size: `Medium`** (was `Large`). D3 shrank to the POSIX force step. Remaining: the stop-now methods of
  `AgentRunManager`; the bound and sweep in the existing `ServerProcessShutdown`; the AGY process-table helper moved
  to `src/utils`; the desktop's POSIX force step with a small desktop copy of the selection; tests and docs. Two
  packages (server, desktop), existing owners only.
- **Architectural risk: `High`.** Stop semantics change for every standalone run on every runtime (concurrency with
  input admission and the fence); process-tree signalling at server exit and on the desktop force path.
- **Escalation triggers:** interrupt-first breaks a caller's expectation; the sweep signals something the server did
  not spawn; a runtime's processes survive the sweep; the bound cuts a cleanup that would have finished (U-A1).

## Architecture Investigation Evidence
| Source | Observation | Decision |
| --- | --- | --- |
| E1, E5, E8; E-A13 | No interrupt on prepare | D1: fence first at the stop-now entry points |
| E-A2, E-A14 | Drain-and-cancel flows depend on `prepareTermination`; new `forceTerminate` is Task-scoped | D1 limited to the two entry points |
| E-A3 | The fence interrupts, cancels queued input, bounds rejected interrupts | D1 reuses it |
| E-A8, E-A14 | Application callers enter the same entry points | DS-001b; DEC-005 |
| E-A15 | Only Terminate/delete/archive write `terminatedAt` | BEH-007 holds by construction (D1 writes no history) |
| E-A25 | `ServerProcessShutdown` owns shutdown but is unbounded | D2 inside it |
| E-A26 | Native commands have their own owner at shutdown | Sweep is the net, not the owner, for them |
| E-A10, E-A11, E-A18 | AGY's tested process-table selector; every spawned process is a server descendant until re-parented | D2 sweep reuses it, moved to `src/utils/process-tree.ts` |
| E-A17 | Claude CLI owned by the server; survives EOF (E9) | The forced paths must SIGTERM it, not rely on pipe closure |
| E-A27, E-A28 | Desktop waits; POSIX force kills the server PID only | D3: POSIX force sweeps the server's tree |
| E-A29 | Bound arithmetic | DEC-007 recommendation; FU-004 |

## Intended Change
Make "stop now" interrupt the busy turn, give the server's own shutdown a 10 s bound followed by a final sweep of what
it spawned, and make the desktop's last-resort force stop the server's whole tree instead of the server alone.

## Change Scope (Mandatory)
- In scope: UC-001 to UC-004. Areas:
  - `AgentRunManager` stop-now methods (D1);
  - `ServerProcessShutdown` and a new process-tree sweep next to it; the AGY process-table helper moved to
    `src/utils/process-tree.ts` and AGY re-pointed (D2);
  - `BaseServerManager.forceStop` on macOS/Linux and a desktop copy of the selection; the window constant per DEC-007
    (D3);
  - tests and docs.
- Derived consumers: the moved AGY helper feeds `agy-stream-process.ts` (re-pointed, same behavior) and its tests
  (moved or re-mocked). No stored structure changes.
- Deliberately left alone:
  - `AgentRunTermination.prepare` / `tryPrepareIfQuiescent` / `forceTerminate` and the Team, Org, task-copy and
    Mixed-Team drain-and-cancel flows (E-A2, E-A14); root-hosted child fencing;
  - run history writers (`recordRunTerminated`), so BEH-007 holds;
  - `NativeCommandProcessScope` and its 3 s drain; `ApplicationShutdown`, `ManagedBackendShutdownClient`,
    `stopManagedBackend` and the Windows manager (owned by `backend-port-conflict-20261024`; reused as they are);
  - the Claude process owner's own release sequence (E-A17);
  - composer Stop (DEC-003), a data-root guard (DEC-004), native background processes on run Terminate (FU-003);
  - Docker, supervisord and launcher stop timeouts (FU-004).
- Follow-ups: `follow-ups.md` FU-001 to FU-005.

## Relevant Behavior And Production-Path Map (Mandatory)
| BEH | Kind | REQ / AC | Trigger | Existing behavior (evidence) | Change or preserved outcome | Target path / spine |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | REQ-001; AC-001 | Terminate in the UI; history delete/archive | Waits for the turn (E8) | Interrupt, then finish | DS-001 |
| BEH-001 (app) | Contract | REQ-001 via DEC-005; AC-008 | SDK `terminateAgentRun`; orchestration `terminateRunBinding` | Waits for the turn (E-A8) | Interrupt, then finish (if DEC-005 = yes) | DS-001b |
| BEH-002 | Operational | REQ-001, REQ-002; AC-002, AC-003 | SIGTERM/SIGINT, Windows IPC request (app quit, restart server, updater) | Unbounded (E-A25) | Fence all; ≤ 10 s; then sweep; exit | DS-002 |
| BEH-003 | Operational | REQ-003; AC-002, AC-003, AC-011 | Server shutdown, graceful or forced | Native drained (E-A26); CLIs survive a kill (E-A28) | Sweep at every server exit; tree sweep on desktop force | DS-002, DS-003 |
| BEH-004 | User | REQ-004; AC-004, AC-005, AC-009, AC-011 | Cmd+Q, menu Quit, SIGTERM to the app, updater install | Waits ≤ 20 s, then kills the server PID (E-A27, E-A28) | Same wait (DEC-007); force kills the tree | DS-003 |
| BEH-005, BEH-007 | User / Operational | REQ-005; AC-006, AC-009, AC-010 | Relaunch | Continue; shutdown writes no `terminatedAt` | **Preserved** | — |

## Relevant Supplemental Task Artifacts
| Path | Relationship |
| --- | --- |
| `evidence/` | E1–E9 root-cause basis; probe shape reusable for AC-001/002 |
| `design-review-report.md`, `architecture-review-revision-record.md` (ARCH-REV-001) | Findings answered in SR-004; AR-002 is now satisfied by shipped code |
| `tickets/done/backend-port-conflict-20261024/` (on `personal`) | Owner design of `ServerProcessShutdown`, `NativeCommandProcessScope`, `ApplicationShutdown`, `stopManagedBackend` |

## Task Design Health Assessment (Mandatory)
- Change posture: `Bug Fix`.
- Current design issue found: `Yes`.
- Root cause classification: `Missing Invariant`.
  - The stop-now owner does not enforce "interrupt before terminate".
  - The server's shutdown owner does not enforce "bounded exit, nothing spawned left behind".
  - The desktop's force step does not enforce "nothing the server spawned survives".
- Refactor needed now: `Yes, small`. AGY's process-table selector moves to `src/utils` because a second owner (the
  server sweep) needs it.
- Design response: D1 to D3 below.
- Deferrals and residual risk:
  - FU-001 (DEC-003), FU-002 (DEC-004), FU-003 (native background on run Terminate), FU-004 (Docker grace),
    FU-005 (two process-table readers across packages);
  - the server-side sweep is POSIX only; on Windows the desktop's `taskkill /f /t` remains the net;
  - user Terminate stays unbounded if a runtime accepts an interrupt but never ends its turn (N-3). AC-001 is the gate.

## Terminology
- **Stop-now entry point:** `AgentRunManager.terminateAgentRun`, `stopAllAgentRuns`.
- **Fence:** `AgentRun.fenceInputAndInterruptForRootShutdown`.
- **Process-tree sweep:** signal the recorded descendant targets of a root pid (descendant pids in the root's own
  group, plus groups led by a descendant): SIGTERM, a grace, then SIGKILL of recorded survivors.
- No new domain word. "Server" means the server process of a node; "embedded server" the desktop's own
  (`GLOSSARY.md` § Nodes). No glossary change.

## Legacy Removal Policy (Mandatory)
- Removed: the unbounded `cleanupOnce()` wait in `ServerProcessShutdown.request()`; the POSIX single-PID SIGKILL in
  `BaseServerManager.forceStop`; `agy-background-process-groups.ts` (moved to `src/utils/process-tree.ts`, no re-export
  shim).

## Persisted Data / State Transition Decision
- `Not Affected`. No stored structure, schema or file changes. Run history writes are unchanged (BEH-007).

## Data-Flow Spine Inventory
| Spine | Scope | BEH | Start | End | Owner |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary | BEH-001 | Web Terminate / history delete or archive | Run inactive, `terminatedAt` recorded by the caller | `AgentRunManager` |
| DS-001b | Primary | BEH-001 (app) | Application SDK `terminateAgentRun` / orchestration `terminateRunBinding` | Run inactive | `AgentRunManager` (via `AgentRunService`) |
| DS-002 | Primary | BEH-002, BEH-003 | SIGTERM/SIGINT or Windows IPC request to the server | Exit ≤ 10 s + sweep; no descendants | `ServerProcessShutdown` |
| DS-003 | Primary | BEH-004, BEH-003 | User quit / SIGTERM to Electron / updater install | Electron exits after the server and its tree are gone | `ApplicationShutdown`, `BaseServerManager` |

## Primary Execution Spine(s)
- DS-001: `Web Terminate → GraphQL agent-run → AgentRunService / StandaloneAgentRunLifecycleService → AgentRunManager.terminateAgentRun → AgentRun fence (interrupt; cancel queued input) → prepare → commit().finish() → backend.terminate → caller records terminatedAt`
- DS-001b: `Application engine capability / SDK scope → AgentRunService.terminateAgentRun → AgentRunManager.terminateAgentRun → (as DS-001)`
- DS-002: `SIGTERM | IPC request → ServerProcessShutdown.request → startup barrier → race(cleanupOnce = app.close, 10 s) → [preClose: native scope drain ≤ 3 s] → [onClose: application lifecycle stop (application-scope stopAllAgentRuns: fence all → finish) → closeProcessResources → supervisor close (roots fence children; stopAllAgentRuns: fence all → finish)] → process-tree sweep (snapshot → targets → SIGTERM → ≤ 1.5 s → SIGKILL survivors) → IPC complete/failed → exit 0/1`
- DS-003: `Cmd+Q → will-quit (prevented) → ApplicationShutdown.stop [memoized, ≤ 30 s] → BaseServerManager.stopServer → SIGTERM | IPC request → [server runs DS-002] → wait window (DEC-007) → (expired, POSIX) forceStop: snapshot server tree → SIGTERM descendant targets → SIGKILL server → ≤ 1.5 s → SIGKILL survivors | (Windows) taskkill /f /t → confirm exit → app.quit`

## Spine Narratives (Mandatory)
| Spine | Narrative | Owner |
| --- | --- | --- |
| DS-001 / DS-001b | Terminate interrupts the busy turn and cancels unstarted queued input through the existing fence, then finishes as before. A fence that is not accepted makes Terminate return `false`, so the caller can retry (F-3). | `AgentRunManager` |
| DS-002 | Shutdown fences every standalone and application run first, so busy turns end in milliseconds to seconds. A 10 s bound guarantees progress. A final sweep removes anything the server spawned that is still running: runtime CLIs, their tool commands, AGY daemons, and native groups the native scope could not confirm. | `ServerProcessShutdown` |
| DS-003 | Quit waits for the server (already shipped). If the server is wedged and does not exit within the window, the force step removes the server's whole tree, so no runtime CLI is orphaned. | `ApplicationShutdown`, `BaseServerManager` |

## Spine Actors / Main-Line Nodes
`AgentRunManager`, `AgentRun` (fence), `ServerProcessShutdown`, the server process-tree sweep, `src/utils/process-tree`,
`GeneralProcessRunSupervisor`, the application lifecycle, `ApplicationShutdown`, `BaseServerManager`.

## Ownership Map
- `AgentRunManager` owns the stop-now policy (fence first).
- `ServerProcessShutdown` owns the server's bounded exit, the order "cleanup → sweep → result → exit", and the exit
  code.
- `server-process-tree-sweep.ts` owns one sweep of the current process's descendants. It holds no shutdown policy.
- `utils/process-tree` owns process-table reading, target selection and signalling primitives (shared by AGY and the
  sweep). It holds no policy.
- `BaseServerManager` owns the embedded server's stop, including its POSIX force step.
- `ApplicationShutdown` owns quit sequencing (unchanged).

## Thin Entry Facades / Public Wrappers
N/A.

## Removal / Decommission Plan (Mandatory)
| Item | Replaced by | Scope |
| --- | --- | --- |
| Unbounded `await this.cleanupOnce()` in `ServerProcessShutdown.request` | 10 s race, then the sweep | In this change |
| `agy-background-process-groups.ts` and its test location | `src/utils/process-tree.ts` (AGY re-pointed); test moved | In this change |
| POSIX `forceStop` = `proc.kill('SIGKILL')` only | Tree sweep of the server | In this change |

## Return Or Event Spine(s)
- Run status publication on termination is unchanged. The Windows IPC `complete`/`failed` result is unchanged in
  shape; `failed` is now also sent when the bound expired or the sweep could not confirm absence.

## Bounded Local / Internal Spines
- Server sweep: `snapshot (ps) → select targets → none? return clean : SIGTERM pids and groups → poll ≤ 1.5 s → SIGKILL recorded survivors → report (confirmed | unconfirmed)`.
- `ServerProcessShutdown.request`: `requested → startup settled → cleanup (≤ 10 s) → sweep → result → exit`.
- Desktop POSIX force: `snapshot server tree → SIGTERM descendant targets → SIGKILL server → poll ≤ 1.5 s → SIGKILL recorded survivors`.

## Off-Spine Concerns Around The Spine
| Concern | Serves | Responsibility |
| --- | --- | --- |
| Shutdown logging | `ServerProcessShutdown`, `BaseServerManager` | Log the forced path ("Server shutdown exceeded 10s; forcing exit") and the sweep's target counts when non-zero |

## Ownership Boundaries
- Callers keep using `AgentRunManager`; nobody fences separately.
- The sweep targets only descendants of its root pid, recorded before signalling, and never the root's own group.
  Groups count only when led by a recorded descendant. It never signals by port.
- Native command groups keep their owner (`NativeCommandProcessScope`); the sweep only meets what that owner left
  `unconfirmed` or what re-joined the tree.

## Boundary Encapsulation Map
| Boundary | Encapsulates | Forbidden bypass |
| --- | --- | --- |
| `AgentRunManager` stop-now methods | Fence, prepare, finish ordering | Callers fencing separately |
| `ServerProcessShutdown` | Bound, sweep, result, exit | Other modules calling `process.exit` for shutdown |
| `utils/process-tree` | Process-table parsing and selection | Ad hoc `ps` parsing in the server |
| `BaseServerManager.stopServer` | Signals, window, force | `ElectronApplication` signalling the server |

## Dependency Rules
- `server-runtime.ts` → `shutdown/server-process-shutdown.ts` → `shutdown/server-process-tree-sweep.ts` →
  `utils/process-tree.ts`.
- `agy-stream-process.ts` → `utils/process-tree.ts`.
- `utils/process-tree.ts` depends only on Node (`child_process`, `process`); it does not import agent-execution.
- The desktop copy `electron/server/serverProcessTree.ts` is used only by `BaseServerManager`.

## Interface Boundary Mapping
| Interface | Responsibility |
| --- | --- |
| `AgentRunManager.terminateAgentRun(runId): Promise<boolean>` | Stop now (`false` also when the fence is not accepted) |
| `AgentRunManager.stopAllAgentRuns(): Promise<void>` | Fence all concurrently, then finish one by one |
| `new ServerProcessShutdown(runtime, { cleanupTimeoutMs, sweep, now/timers })` | Existing owner; gains the bound and an injectable sweep (default: the real one) |
| `terminateServerProcessTree(deps): Promise<{ targets: number; confirmed: boolean }>` | One sweep of `process.pid`'s descendants; injectable table, kill, clock |
| `selectDescendantProcessGroups(rows, rootPid, excludedPgids)`, `selectDescendantPidsInGroup(rows, rootPid, pgid)` | Pure selection |
| `BaseServerManager.forceStop(proc)` (POSIX) | Tree sweep of the server |

## Interface Boundary Check
All boundaries are singular, with explicit identity. Low risk.

## Main Domain Subject Naming Check
`terminateServerProcessTree`, `server-process-tree-sweep.ts`, `utils/process-tree.ts`, `SERVER_SHUTDOWN_TIMEOUT_MS`,
`PROCESS_TREE_GRACE_MS`, `serverProcessTree.ts`: OK. No version numbers in names (DESIGN rule 8).

## Existing Capability / Subsystem Reuse Check
| Need | Existing | Decision |
| --- | --- | --- |
| Interrupt and cancel queued input | Fence | Reuse |
| Shutdown signals, IPC, exit | `ServerProcessShutdown` | **Extend** (bound + sweep) |
| Native command cleanup | `NativeCommandProcessScope` | Reuse as is |
| Quit sequencing | `ApplicationShutdown` | Reuse as is |
| Process-table descendant selection | AGY `agy-background-process-groups.ts` | **Move and generalize** to `utils/process-tree.ts` |
| Process-table reading with deadline and birth identity | `autobyteus-ts` `ProcessGroupObserver` | Not used here: it is shaped for one anchored group; merging the readers is FU-005 |
| Desktop escalation | `stopManagedBackend` / `forceStop` | Extend `forceStop` only |

## Subsystem / Capability-Area Allocation
| Area | Concern | Decision |
| --- | --- | --- |
| `agent-execution/services` | Stop-now fence | Extend |
| `src/shutdown` | Bounded exit and sweep | Extend owner; add the sweep file |
| `src/utils` | Process tree primitives | Add (moved) |
| `autobyteus-web/electron/server` | POSIX force step | Extend; small copy of the selection |

## Final File Responsibility Mapping
| File | Change | Responsibility |
| --- | --- | --- |
| `autobyteus-server-ts/src/agent-execution/services/agent-run-manager.ts` | Modify | D1 |
| `autobyteus-server-ts/src/shutdown/server-process-shutdown.ts` | Modify | D2: bound, call the sweep, exit code |
| `autobyteus-server-ts/src/shutdown/server-process-tree-sweep.ts` | Add | D2: one sweep of the server's descendants |
| `autobyteus-server-ts/src/utils/process-tree.ts` | Add (moved) | Table reading, selection, signalling |
| `autobyteus-server-ts/src/agent-execution/backends/antigravity/stream/agy-background-process-groups.ts` | Remove | Moved |
| `autobyteus-server-ts/src/agent-execution/backends/antigravity/stream/agy-stream-process.ts` | Modify | Use the utility (`selectDescendantProcessGroups(rows, agyPid, [agyPgid, serverPgid])`) |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/antigravity/agy-background-process-groups.test.ts` | Move | To `tests/unit/utils/process-tree.test.ts`, generalized |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/antigravity/agy-stream-process.test.ts` | Modify | Mock the moved utility |
| `autobyteus-server-ts/tests/unit/shutdown/server-process-shutdown.test.ts` | Modify | Bound, sweep order, exit codes, IPC `failed` on expiry |
| `autobyteus-web/electron/server/baseServerManager.ts` | Modify | POSIX `forceStop` sweep; window constant per DEC-007 |
| `autobyteus-web/electron/server/serverProcessTree.ts` | Add | Desktop copy of the selection |
| `autobyteus-server-ts/docs/modules/agent_execution.md` | Modify | Replace the "Known limit (server shutdown with a busy run)" paragraph (`:307-314`) with the stop-now and bounded-shutdown behavior |
| `autobyteus-server-ts/docs/modules/antigravity_cli_runtime.md` | Modify | Name the moved helper (`:317`) |
| `autobyteus-web/docs/electron_packaging.md` | Modify | § Confirmed backend and application shutdown (`:139-173`): the POSIX force sweeps the tree; the server's own 10 s bound |

## Applied Patterns
A timeout race; snapshot-then-signal process-tree teardown.

## Target Subsystem / Folder / File Mapping
As above. `src/shutdown` and `src/utils` already exist.

## Folder Boundary Check
No new folders. `utils/process-tree.ts` is concern-agnostic (shared by AGY and the sweep).

## Concrete Examples / Shape Guidance
| Topic | Good | Avoided |
| --- | --- | --- |
| Stop-now | `const fenced = await run.fenceInputAndInterruptForRootShutdown(); if (!fenced.accepted) return false; …prepare → finish` | Changing `AgentRunTermination.prepare` |
| Shutdown fence | `await Promise.allSettled(active.map(r => r.fenceInputAndInterruptForRootShutdown()))`, then the existing loop; a rejected or not-accepted fence goes to `errors` and that run is skipped | Fencing inside the sequential loop |
| Bound | `const expired = await raceWithTimeout(this.cleanupOnce(), cleanupTimeoutMs); if (expired) { log; code = 1 }` then **always** `const sweep = await this.sweep(); if (!sweep.confirmed) code = 1;` then the existing IPC result and exit | Sweeping only on expiry (native groups the scope left unconfirmed and late CLIs would survive a clean close) |
| Bound start | The 10 s starts after the startup barrier settles (existing semantics: a cancelled stage stops at its next checkpoint) | Cutting a migration stage mid-write; the desktop window covers a hung startup |
| Sweep targets | Record pids (root's group) and descendant-led pgids **before** signalling; SIGKILL only recorded survivors; skip ESRCH; log EPERM and continue; report `confirmed: false` when a recorded target is still alive | Re-listing after SIGTERM (re-parented processes escape); signalling the root's own group; signalling by port |
| Desktop force | SIGTERM the descendant targets first (the Claude CLI and Codex app-server end their tool commands on SIGTERM, E3/E9), SIGKILL the server, then ≤ 1.5 s and SIGKILL survivors, all inside the force confirmation budget (raise it from 2 s to 3 s if needed) | SIGKILL of the server alone (Claude orphaned, E9); an immediate SIGKILL of the CLIs (Codex orphans its commands on its own SIGKILL, E3) |

## Backward-Compatibility Rejection Log (Mandatory)
| Candidate | Decision |
| --- | --- |
| Keep `agy-background-process-groups.ts` re-exporting the utility | Rejected |
| An env flag or setting to restore drain-on-terminate | Rejected |
| A second shutdown owner beside `ServerProcessShutdown` | Rejected (the SR-004 `src/server-process-shutdown.ts` is not created) |

## Change / Refactor Sequence
1. Move the process-tree utility; re-point AGY; move its test and keep it green.
2. D1 plus tests: fence before prepare; fence not accepted → `false`; concurrent stopAll fence; application-scope
   manager covered by the same code; `stopAllAgentRuns` writes no `terminatedAt` (AC-010).
3. D2 plus tests: hung cleanup → 10 s → sweep → exit 1 and IPC `failed`; clean close → sweep with no targets → fast
   exit 0; sweep with an unconfirmed survivor → exit 1; target selection including re-parenting and never the root
   group; ESRCH/EPERM handling.
4. D3 plus tests: POSIX force removes the server and its recorded descendants (AC-011, deterministic double); the
   window constant per DEC-007; Windows path unchanged (existing tests stay green).
5. Docs.
6. Validation (API/E2E): live AC-001/002 on Codex and Claude plus a native run with a background process; AC-003
   deterministic; isolated desktop AC-004/005/006/009/011 with process-tree snapshots; the updater install path; U-A1 to
   U-A3; the "before" baseline of today's busy quit on the same build without the change where cheap.

## Key Tradeoffs
- **Bound inside the existing owner** instead of a new file: one owner for signals, IPC, exit and now the bound.
- **Sweep at every server exit, not only on expiry:** native groups the scope could not confirm and runtime CLIs whose
  graceful release did not finish have no other stopper. With no targets the sweep costs one `ps` call.
- **Desktop copy of the selection** (about 40 lines): Electron main cannot import server code; both sides are tested.
- **Keep the sequential finish loop** in `stopAllAgentRuns`: it is the existing order; U-A1 measures whether several
  busy Claude runs reach the bound.

## Risks
- `ps` missing in minimal Linux images: the sweep logs and reports unconfirmed; the container stop still kills the tree
  (E-A7).
- PID reuse within 1.5 s is negligible; only recorded targets are signalled.
- A 15 s desktop window (if chosen in DEC-007) leaves about 1 s over the server's worst case (E-A29).
- Native background processes still outlive a run **Terminate** (FU-003, unchanged).

## Guidance For Implementation
- D1: do not edit `AgentRunTermination`.
- D2: keep `ServerProcessShutdown`'s memoized request, startup barrier and IPC contract; inject timers, table, kill and
  exit; keep the sweep's `ps` timeout at 2 s.
- D3: change only POSIX `forceStop` and the window constant; keep `stopManagedBackend` and the Windows manager.
- Validation must include process-tree snapshots (PID/PPID/PGID) for Codex, Claude and native, showing zero survivors,
  and record the CLI versions (U-A2). Prove from a clean clone of the final branch with isolated app data (the desktop
  `e2e` profile or a temporary data root); never the user's installed app or data.
- Record any surviving process class as a Design Impact.
