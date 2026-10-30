# Requirements Document — busy-quit-shutdown-orphan

## Document Status
- Status: **Approved** (SR-007, 2026-10-30). REQ-001 to REQ-005 approved in SR-002; DEC-005 and DEC-007 approved in SR-007; DEC-006 and AC-011 decided by the Solution Designer within the direction (SR-005, SR-006).
- Current solution revision ID: `SR-007` (approval of DEC-005 and DEC-007).
- Package: `busy-quit-shutdown-orphan`.
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), Task
  `autobyteus-284` in Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`, 2026-10-26: "finish and ship the existing
  branch busy-quit-shutdown-orphan (bounded, awaited shutdown)". It is step 0 (prerequisite) of restart-and-resume
  (autobyteus-283).
- Original request: `/api_e2e_engineer`, 2026-10-05, at the user's direction. The user asked to "first do enough experiments to
  find out exactly why it happens and how it should be fixed, before designing." Experiments E1–E9 are in
  `investigation-notes.md`.
- Requirements owner: Solution Designer.
- Approval state: **Approved**, 2026-10-05 (SR-002) and 2026-10-30 (SR-007).
  - SR-007: asked for DEC-005 and DEC-007 with recommendations (DEC-005 yes; DEC-007 keep 20 s), after explaining DEC-005 with a custom-application example, the user answered: "What is your suggestion? Yeah, I think you understand our code base much more than I do now. I guess you can make reasonable suggestions." He gave both decisions to the Solution Designer's recommendations, so DEC-005 = yes and DEC-007 = keep 20 s are recorded as approved by the user on that basis.
  - After clarifying DEC-004 ("defer" means it is not done here and is recorded as a follow-up), the user said: "Okay, I'll agree with your suggestions. Basically, we do for number one and number two, right? … number one and number two are what we will be done in this ticket."
  - So DEC-001 to DEC-004 are resolved as recommended: DEC-001 and DEC-002 are applied in this ticket; DEC-003 and DEC-004 are not done here and are recorded as follow-up candidates.
  - REQ-001 to REQ-005 are the approved scope.
- Behavior-defining supplements: none.
- Workspace:
  - Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/busy-quit-shutdown-orphan`.
  - Branch `codex/busy-quit-shutdown-orphan`.
  - Base `origin/personal` @ `1a4453e553` (rebased 2026-10-30; before that `d74f75a51a` on 2026-10-26 and originally `02d6ddf05`). Target `personal`.

## Problem And Desired Outcome
- **Problem.** Stopping a run that is in the middle of a turn waits for that turn to finish on its own, without a time
  limit (RC-1). This affects:
  - quitting the desktop app;
  - server shutdown;
  - the user's **Terminate** of a busy chat (E8).

  On 2026-10-05 the desktop app did not wait for or force-stop the server (RC-3). The app looked closed while the
  server, its runtime CLIs and the agent's tool commands kept running, for about 10 minutes in testing and without
  limit for a hung tool, and a relaunch could start a second server on the same data (RC-5).

  **Since 2026-10-26** (ticket `backend-port-conflict-20261024`, E-A25 to E-A28) the desktop waits for its server up to
  20 s, then kills the server process, and native AutoByteus commands are stopped at server shutdown. What remains
  (Read, not yet re-measured): with a busy run the server still waits for the turn (RC-1) and has no bound of its own
  (RC-2), so a busy quit takes about 20 s, ends with the server killed, and the Claude CLI and its tool commands survive
  the kill (E9). Terminate of a busy run still waits without limit (E8).
- **Affected:** desktop users who quit or terminate while an agent is working, on Codex and Claude (both confirmed),
  and likely every runtime, since the waiting code is runtime-agnostic.
- **Desired outcome:**
  - stopping a busy run interrupts its turn and finishes promptly;
  - server shutdown always finishes within a bound and leaves no runtime or tool processes behind;
  - quitting the app never leaves a server running.
- **Success:** quit, shutdown and Terminate on a busy agent finish within the bounds, and no process from that session
  remains. Conversations still resume after relaunch, as today.

## Relevant Current And Desired Behavior
| ID | Kind | Scenarios | Current (evidence) | Desired | Preserved |
| --- | --- | --- | --- | --- | --- |
| BEH-001 | User | SCN-001 | User **Terminate** of a busy standalone run waits for the turn to complete; the mutation was pending > 60 s (E8, RC-1) | The active turn is interrupted; Terminate completes within the bound (REQ-001) | Terminate of an idle run; the run's history; restore and continue later |
| BEH-002 | Operational | SCN-002 | Server shutdown (SIGTERM, app quit) with a busy run waits without limit (E1, E5, E7; RC-1, RC-2) | Busy runs are interrupted; shutdown completes within the bound; remaining runtime processes are force-terminated (REQ-001, REQ-002) | Idle shutdown speed (0.3–0.4 s); clean persistence of conversations |
| BEH-003 | Operational | SCN-002 | Runtime processes and tool commands outlive the server: Codex app-server and commands until the server exits; Claude CLI and commands even after the server dies (E3, E9; RC-4). Since 2026-10-26 native commands are stopped at server shutdown (E-A26); runtime CLIs are not covered when the server is killed (E-A28) | No runtime CLI or tool command started by the server outlives server shutdown (REQ-003) | — |
| BEH-004 | User | SCN-003 | Was: desktop quit sends SIGTERM and exits at once; a hung server is orphaned (E6; RC-3). Since 2026-10-26: quit waits up to 20 s, then SIGKILLs the server process only (macOS/Linux) or `taskkill /f /t` (Windows); the server's own children survive the POSIX kill (E-A27, E-A28) | Quit waits for the server's shutdown up to a bound, then force-stops it; no server outlives the app (REQ-004) | Normal quit with an idle app stays quick |
| BEH-005 | User | SCN-004 | After a busy quit, relaunch continues every conversation (predecessor T-08c) | Same | **Preserved** |
| BEH-006 | User | SCN-005 | Composer **Stop** (interrupt): Codex ends the turn but its tool command keeps running until the run ends (E2); Claude kills it (E5) | Unchanged in this ticket (DEC-003) | As today |
| BEH-007 | Operational | SCN-002, SCN-004 | Server shutdown does not mark runs as terminated: only an explicit Terminate, delete or archive records `terminatedAt` (E-A15). Restart-and-resume (autobyteus-283 step 1) relies on this to tell "stopped on purpose" from "stopped by the restart" | Same (DEC-006) | **Preserved** |

## Stakeholders, Actors, And Outcomes
| Actor | Goal | Required outcome | Constraint |
| --- | --- | --- | --- |
| Desktop user | Quit or terminate while an agent works | It stops promptly; nothing keeps running | Conversations kept |
| Server operator (Docker/CLI, SIGTERM) | Stop the server | Bounded exit, no leftovers | — |
| Agents' runtimes (Codex, Claude, …) | Stopped cleanly | Interrupted or terminated | Runtime CLIs differ (RC-4) |

## Scope Guardrail (Mandatory)
### In-Scope Use Cases
| ID | Use case | Scenarios |
| --- | --- | --- |
| UC-001 | User terminates a busy standalone run | SCN-001 |
| UC-002 | Server shutdown (desktop quit, SIGTERM) with busy runs of any root type | SCN-002 |
| UC-003 | Desktop app quit with a busy agent | SCN-003 |
| UC-004 | Relaunch after such a quit | SCN-004 (preserved) |

### Out Of Scope
- Composer Stop on Codex leaving its tool command running until the run ends (BEH-006). It is a runtime-specific
  interrupt gap and a separate follow-up candidate (DEC-003).
- A data-root single-owner guard against a second server, unless DEC-004 decides otherwise. Once REQ-001 to REQ-004
  hold, a normal quit leaves no orphan. The remaining cause would be a forced kill of the app itself.
- Windows-specific process handling beyond honoring the same bounds (`windowsServerManager.ts` has its own path),
  unless design finds a gap.
- Changing how root-hosted children (Team, Org, collaborators) are fenced and interrupted; they already interrupt
  (predecessor LE-O1).

### Non-Goals
- No change to what an interrupted turn shows in history.
- No new user setting for the timeouts.

### Preserved Behavior Boundary
- BEH-005; BEH-007; idle shutdown and quit speed; conversation and history persistence and restore; the Stop and Terminate
  results seen by the UI (only their timing changes).

### Review Authority
- A blocking finding must cite a REQ, AC or BEH ID here.
- Anything beyond these (for example a data-root lock) is a `Requirement Gap` that needs user approval.

## Requirements
| ID | Requirement | BEH | Priority | Feasibility evidence | Source |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | **Terminate interrupts.** Terminating a run that is in the middle of a turn interrupts that turn instead of waiting for it to finish, for user Terminate, for an application's terminate (DEC-005) and for server shutdown, on every runtime. Queued input that has not started is handled per DEC-001. | BEH-001, BEH-002 | Must | Measured: an interrupt ends a busy turn on Codex in 12 ms (E2) and on Claude in < 5 s (E5); the fence that sends it already works for Team/Org members (predecessor LE-O1, 11/11). Other runtimes: interrupt exists, not measured (ASM-001) | RC-1; E1, E5, E8 |
| REQ-002 | **Bounded server shutdown.** Server shutdown completes within **10 s** (DEC-002), whatever the runtimes do: runs are interrupted and stopped; whatever has not stopped by the bound is force-terminated, and the server exits. | BEH-002 | Must | N/A for the bound itself (our own timer and exit); the forced path relies on REQ-003's evidence | RC-2; E1, E5, E7 |
| REQ-003 | **No leftover runtime processes.** When the server shuts down (graceful or forced), every runtime CLI it started and those CLIs' tool commands are gone, on Codex and Claude at least, and on every runtime that spawns processes. | BEH-003 | Must | Measured: Codex app-server and the Claude CLI end their tool commands on SIGTERM (E3; E9 follow-up); native commands are stopped by their own scope (backend-port-conflict P-003..P-008, AC-004). AGY daemons: stopped by AGY's owner (E-A10), not re-measured. CLI versions may have changed (U-A2) | RC-4; E3, E9 |
| REQ-004 | **Desktop quit never leaves a server.** Quitting the app (user quit or SIGTERM to the app) waits for the embedded server to exit, up to **20 s** (DEC-007, replacing DEC-002's 15 s), then force-stops it and everything the server started. The app does not finish quitting while its server is still alive. | BEH-004 | Must | Reproduced: Electron 42 quits early unless `will-quit` is prevented (E6); the shipped `ApplicationShutdown` now prevents it (E-A27) | RC-3; E6 |
| REQ-005 | **Continuity preserved.** After a busy quit or Terminate, relaunch shows the conversations, and each run can continue (BEH-005). | BEH-005, BEH-007 | Must | Reproduced in the predecessor (T-08c) | T-08c |

## Acceptance Criteria
| ID | REQ | Trigger | Expected | Failure | Verification |
| --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001 | Terminate a standalone run busy in a long foreground command (Codex; Claude) | Terminate returns success within 10 s; the run is stopped; its tool command is gone | Pending or > 10 s; command left | Live E2E (probe-style) |
| AC-002 | REQ-001, REQ-002, REQ-003 | Server shutdown with busy runs: standalone (Codex, Claude), a Team member, an Org agent | Close completes ≤ 10 s; no runtime CLI or tool command remains | > 10 s or leftovers | Live E2E with a process-tree check |
| AC-003 | REQ-002, REQ-003 | Shutdown where a runtime does not end its turn on interrupt (deterministic test double) | Shutdown still exits ≤ 10 s via force-termination; the runtime process is killed | Hang | Unit/integration |
| AC-004 | REQ-004 | Desktop app: busy agents, then (a) user quit, (b) SIGTERM to main | App exits; no server, runtime CLI or tool command remains after at most 20 s plus the force confirmation (DEC-007); expected in a few seconds when turns are interrupted | Orphan (PPID 1) | Isolated desktop app journey |
| AC-011 | REQ-003, REQ-004 | Desktop quit while the server does not exit (deterministic wedged-server test double with a runtime-CLI-like child and a tool-command-like child in its own group) | The desktop force path removes the server and both children; the app still exits | A child survives the force (PPID 1) | Main-process integration test (SR-006) |
| AC-005 | REQ-004 | Desktop app idle quit | Quits as quickly as today | Slower | Isolated app |
| AC-006 | REQ-005 | Relaunch after AC-004 | Every conversation is present and continues (agent, Team, Org) | Missing or broken | Isolated app |
| AC-007 | all | Existing suites | No new failures against the base (by test name and message) | — | Unit/integration |
| AC-009 | REQ-004, REQ-005 | Relaunch right after AC-004 (a) and (b), and after an app-update restart where it can be exercised | Exactly one server process serves the data folder; no process of the earlier session remains | Two servers on one data folder, or a start error because the old server is still alive | Isolated desktop app journey with a process check (DEC-006) |
| AC-010 | BEH-007 | Server shutdown with busy runs (AC-002), then relaunch | Runs that were stopped by the shutdown are not recorded as terminated (`terminatedAt` stays empty); a run the user terminated keeps its `terminatedAt` | Shutdown records `terminatedAt` | Unit/integration (DEC-006) |
| AC-008 (DEC-005) | REQ-001 | An application terminates a run busy in a long command | Returns within 10 s; turn interrupted; queued input cancelled | Waits for the turn | Unit (fence-first at the shared entry point) plus a live probe if feasible |

## Relevant Scenarios And Journeys
| ID | Kind | Actor | Goal | Trigger | Steps | Outcome | Validity | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | User | User | Stop a working chat for good | Terminate (history or close) on a busy run | Terminate → interrupt → finish | Stopped promptly | Supported Normal | E8 |
| SCN-002 | Operational | App/OS | Stop the server | App quit (SIGTERM to the server) or `kill`/Docker stop | Interrupt all → stop → force at the bound → exit | Exits ≤ 10 s, no leftovers | Supported Normal | E1–E9 |
| SCN-003 | User | User | Quit the app while an agent works | Cmd+Q, menu Quit, or OS SIGTERM | Quit → server shutdown → wait ≤ 20 s → force | Nothing left running | Supported Normal | E6; T-08d |
| SCN-004 | User | User | Resume after quitting | Relaunch | Open history → continue | Conversations continue | Supported Normal (preserved) | T-08c |
| SCN-005 | User | User | Stop generating | Composer Stop | Interrupt | Out of scope (DEC-003) | Supported Normal | E2, E5 |

## UI, Interaction, And Experience Requirements
- Applicable: `No` (no new UI; only timing). Product design fields: `N/A — not applicable`.

## Quality And Non-Functional Requirements
| ID | REQ/AC | Area | Requirement |
| --- | --- | --- | --- |
| QR-001 | REQ-002; AC-002, AC-003 | Reliability | Server shutdown ≤ 10 s with busy runs |
| QR-002 | REQ-004; AC-004 | Reliability | App quit leaves no process after ≤ 20 s plus the force confirmation (DEC-007) |
| QR-003 | AC-005 | Performance | Idle shutdown and quit no slower than today (0.3–0.4 s server close) |

## Data Continuity And Acceptable Loss
- Persisted data affected: `No` schema change.
- Must preserve: conversations, run history and restorability (REQ-005).
- Acceptable loss: the interrupted turn's unfinished work; for queued input see DEC-001.

## External Contracts And Dependencies
| Contract | Constraint | Evidence | Risk |
| --- | --- | --- | --- |
| Codex app-server | Kills its commands on SIGTERM or EOF, not on SIGKILL; interrupt leaves commands running | E2, E3, E9 | Version drift |
| Claude Code CLI | Kills its tree on SIGTERM and interrupt, not on EOF | E5, E9 | Version drift |
| Electron 42 quit lifecycle | `will-quit` must be deferred to wait for async work | E6 | — |

## Supplemental Artifacts
| Path | Purpose | Status |
| --- | --- | --- |
| `evidence/` (E1–E9 logs, Electron probe, temporary diagnostics) | Root-cause evidence | Evidence |

## Assumptions
| ID | Assumption | Validation |
| --- | --- | --- |
| ASM-001 | Interrupting the active turn ends it promptly on Codex and Claude (E2: 12 ms; E5: < 5 s) | Live E2E (AC-001/002) |
| ASM-002 | Other process-spawning runtimes (AutoByteus native shell tools, AGY, ACP, Grok) can be made to meet REQ-003 | Architecture investigation |

## Open Decisions And Questions
| ID | Question | Recommendation | Status |
| --- | --- | --- | --- |
| DEC-001 | On Terminate or shutdown, what happens to **queued messages that have not started yet**? | Cancel them, as root-hosted children already do on shutdown. Do not run them first. | **Resolved: cancel** (SR-002) |
| DEC-002 | Bounds | Server shutdown ≤ 10 s; desktop waits ≤ 15 s before force-stopping the server. | **Resolved as recommended** (SR-002); the desktop value is replaced by DEC-007 (20 s) |
| DEC-003 | Codex composer Stop leaves the tool command running until the run ends (E2) | Out of scope; follow-up candidate | **Resolved: not in this ticket** (SR-002) |
| DEC-004 | Guard against a second server on the same data root (for example after a force-killed app) | Defer; follow-up candidate | **Resolved: not in this ticket** (SR-002) |
| DEC-006 | (SR-005) The Task's "Done when" says "relaunch never gives two servers on one data folder", and autobyteus-283 relies on shutdown not marking runs as terminated. Should this ticket prove both? | **Decided (Solution Designer, within the direction):** add AC-009 (relaunch after quit gives one server) and preserve BEH-007 with AC-010. Both are outcomes of REQ-004/REQ-005 and of today's behavior; neither adds product behavior. A force-killed or crashed app stays DEC-004 (follow-up), as the user decided on 2026-10-05: with this ticket an old server still listening blocks a second one (E-A22), and a closing server exits by itself within about 12 s. | **Resolved** (SR-005) |
| DEC-007 | (SR-006) REQ-004 says the desktop waits **15 s** (DEC-002). `backend-port-conflict-20261024` shipped a **20 s** wait plus 2 s force confirmation on 2026-10-26 (E-A28), sized so its own server cleanup fits. With this ticket the server ends itself within about 11.6 s, worst case about 13.75 s (E-A29). Keep 20 s or go to 15 s? | **Recommended: keep 20 s.** A busy quit normally ends in a few seconds once turns are interrupted, so the window only matters when the server is wedged. 15 s would leave about 1 s of margin over the server's own worst case, so a slow but working shutdown could be cut and its sweep skipped. 20 s is already shipped and tested. If you prefer 15 s, it is a one-constant change. | **Approved: keep 20 s** (SR-007, the user left it to the recommendation) |
| DEC-005 | (SR-004, from ARCH-REV-001 AR-001) When an **application** (SDK `terminateAgentRun`, or orchestration ending a run binding) terminates a busy run, should it also interrupt the turn and cancel unstarted queued input, like user Terminate? Today it waits for the turn to finish (the same code path, E-A8) | **Recommended: yes.** "Terminate" means stop now everywhere. Otherwise the application path keeps the unbounded wait this ticket removes. | **Approved: yes** (SR-007, the user left it to the recommendation). AC-008 is in scope |

## Traceability
| REQ | UC | BEH | AC | SCN |
| --- | --- | --- | --- | --- |
| REQ-001 | UC-001, UC-002 | BEH-001, BEH-002 | AC-001, AC-002 | SCN-001, SCN-002 |
| REQ-002 | UC-002 | BEH-002 | AC-002, AC-003 | SCN-002 |
| REQ-003 | UC-002 | BEH-003 | AC-002, AC-003 | SCN-002 |
| REQ-004 | UC-003 | BEH-004 | AC-004, AC-005, AC-009, AC-011 | SCN-003 |
| REQ-005 | UC-004 | BEH-005, BEH-007 | AC-006, AC-009, AC-010 | SCN-004 |
| (all) | — | — | AC-007 | — |

## Architecture Phase Input
- Constraints:
  - REQ-001 changes the documented `PreparedAgentRunTermination` contract ("drain without terminating") for these
    callers. Design must decide whether all callers get interrupt semantics or only Terminate and shutdown (Mixed-Team
    member stop and history delete/archive use the same path).
  - Keep the predecessor's root-shutdown fence semantics (F-1–F-4).
- To verify:
  - the process cleanup of other runtimes (ASM-002);
  - Windows parity;
  - force-termination order and persistence flush at the 10 s bound;
  - Electron `will-quit` deferral without hanging an idle quit.
- Expected classification: Large/High (shared termination contract; server, desktop and runtime layers; concurrency).

## Readiness Check
### Content Ready For Approval
- All items Yes. Open decisions DEC-001 to DEC-004 have recommendations. Content ready for user approval: **Yes**.
### Approved Basis Ready For Design
- User approval received: **Yes** for SR-002 and SR-007 (DEC-005, DEC-007). Approved basis ready for design: **Yes**.
- Feasibility: every requirement has measured or reproduced evidence, or `N/A` (REQ-002's own timer). Open measurements for validation: U-A1, U-A2, U-A3.

## User Decision For The Next Steps (Not This Ticket)
- 2026-10-30, the user on restart-and-resume (autobyteus-285 and after): "Of course, automatic without me, without
  asking me … the active previously … running agents … need to continue to work. So no human will be involved, that's
  the whole purpose." After an app update restart, the agents that were busy continue **automatically**, with no
  confirmation.
- Effect on this ticket: none beyond what is designed. The update shutdown interrupts busy turns within the bound,
  leaves no process behind, starts one server after the restart (AC-009) and never marks those runs as terminated
  (BEH-007, AC-010), so they stay resumable without a human. Passed to `/project_task_manager` for the planning of
  autobyteus-285 and after.

## Prerequisites
- None found in the SR-005 and SR-006 re-checks. `backend-port-conflict-20261024` is already merged, so it is not a prerequisite.
