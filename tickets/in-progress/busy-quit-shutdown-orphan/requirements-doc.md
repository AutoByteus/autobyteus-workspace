# Requirements Document — busy-quit-shutdown-orphan

## Document Status
- Status: **Approved** (SR-002, 2026-10-05).
- Current solution revision ID: `SR-002` (approval of SR-001).
- Package: `busy-quit-shutdown-orphan`.
- Request: `/api_e2e_engineer`, 2026-10-05, at the user's direction. The user asked to "first do enough experiments to
  find out exactly why it happens and how it should be fixed, before designing." Experiments E1–E9 are in
  `investigation-notes.md`.
- Requirements owner: Solution Designer.
- Approval state: **Approved**, 2026-10-05.
  - After clarifying DEC-004 ("defer" means it is not done here and is recorded as a follow-up), the user said: "Okay, I'll agree with your suggestions. Basically, we do for number one and number two, right? … number one and number two are what we will be done in this ticket."
  - So DEC-001 to DEC-004 are resolved as recommended: DEC-001 and DEC-002 are applied in this ticket; DEC-003 and DEC-004 are not done here and are recorded as follow-up candidates.
  - REQ-001 to REQ-005 are the approved scope.
- Behavior-defining supplements: none.
- Workspace:
  - Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/busy-quit-shutdown-orphan`.
  - Branch `codex/busy-quit-shutdown-orphan`.
  - Base `origin/personal` @ `02d6ddf05`. Target `personal`.

## Problem And Desired Outcome
- **Problem.** Stopping a run that is in the middle of a turn waits for that turn to finish on its own, without a time
  limit (RC-1). This affects:
  - quitting the desktop app;
  - server shutdown;
  - the user's **Terminate** of a busy chat (E8).

  The desktop app does not wait for or force-stop the server (RC-3). The result is that the app looks closed while the
  server, its runtime CLIs and the agent's tool commands keep running, for about 10 minutes in testing and without
  limit for a hung tool. A relaunch can then start a second server on the same data (RC-5).
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
| BEH-003 | Operational | SCN-002 | Runtime processes and tool commands outlive the server: Codex app-server and commands until the server exits; Claude CLI and commands even after the server dies (E3, E9; RC-4) | No runtime CLI or tool command started by the server outlives server shutdown (REQ-003) | — |
| BEH-004 | User | SCN-003 | Desktop quit sends SIGTERM and exits at once; the SIGKILL escalation never runs; a hung server is orphaned (E6; RC-3) | Quit waits for the server's shutdown up to a bound, then force-stops it; no server outlives the app (REQ-004) | Normal quit with an idle app stays quick |
| BEH-005 | User | SCN-004 | After a busy quit, relaunch continues every conversation (predecessor T-08c) | Same | **Preserved** |
| BEH-006 | User | SCN-005 | Composer **Stop** (interrupt): Codex ends the turn but its tool command keeps running until the run ends (E2); Claude kills it (E5) | Unchanged in this ticket (DEC-003) | As today |

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
- BEH-005; idle shutdown and quit speed; conversation and history persistence and restore; the Stop and Terminate
  results seen by the UI (only their timing changes).

### Review Authority
- A blocking finding must cite a REQ, AC or BEH ID here.
- Anything beyond these (for example a data-root lock) is a `Requirement Gap` that needs user approval.

## Requirements
| ID | Requirement | BEH | Priority | Source |
| --- | --- | --- | --- | --- |
| REQ-001 | **Terminate interrupts.** Terminating a run that is in the middle of a turn interrupts that turn instead of waiting for it to finish, for user Terminate and for server shutdown, on every runtime. Queued input that has not started is handled per DEC-001. | BEH-001, BEH-002 | Must | RC-1; E1, E5, E8 |
| REQ-002 | **Bounded server shutdown.** Server shutdown completes within **10 s** (DEC-002), whatever the runtimes do: runs are interrupted and stopped; whatever has not stopped by the bound is force-terminated, and the server exits. | BEH-002 | Must | RC-2; E1, E5, E7 |
| REQ-003 | **No leftover runtime processes.** When the server shuts down (graceful or forced), every runtime CLI it started and those CLIs' tool commands are gone, on Codex and Claude at least, and on every runtime that spawns processes. | BEH-003 | Must | RC-4; E3, E9 |
| REQ-004 | **Desktop quit never leaves a server.** Quitting the app (user quit or SIGTERM to the app) waits for the embedded server to exit, up to **15 s** (DEC-002), then force-stops it. The app does not finish quitting while its server is still alive. | BEH-004 | Must | RC-3; E6 |
| REQ-005 | **Continuity preserved.** After a busy quit or Terminate, relaunch shows the conversations, and each run can continue (BEH-005). | BEH-005 | Must | T-08c |

## Acceptance Criteria
| ID | REQ | Trigger | Expected | Failure | Verification |
| --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001 | Terminate a standalone run busy in a long foreground command (Codex; Claude) | Terminate returns success within 10 s; the run is stopped; its tool command is gone | Pending or > 10 s; command left | Live E2E (probe-style) |
| AC-002 | REQ-001, REQ-002, REQ-003 | Server shutdown with busy runs: standalone (Codex, Claude), a Team member, an Org agent | Close completes ≤ 10 s; no runtime CLI or tool command remains | > 10 s or leftovers | Live E2E with a process-tree check |
| AC-003 | REQ-002, REQ-003 | Shutdown where a runtime does not end its turn on interrupt (deterministic test double) | Shutdown still exits ≤ 10 s via force-termination; the runtime process is killed | Hang | Unit/integration |
| AC-004 | REQ-004 | Desktop app: busy agents, then (a) user quit, (b) SIGTERM to main | App exits; no server, runtime CLI or tool command remains after at most 15 s | Orphan (PPID 1) | Isolated desktop app journey |
| AC-005 | REQ-004 | Desktop app idle quit | Quits as quickly as today | Slower | Isolated app |
| AC-006 | REQ-005 | Relaunch after AC-004 | Every conversation is present and continues (agent, Team, Org) | Missing or broken | Isolated app |
| AC-007 | all | Existing suites | No new failures against the base (by test name and message) | — | Unit/integration |

## Relevant Scenarios And Journeys
| ID | Kind | Actor | Goal | Trigger | Steps | Outcome | Validity | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | User | User | Stop a working chat for good | Terminate (history or close) on a busy run | Terminate → interrupt → finish | Stopped promptly | Supported Normal | E8 |
| SCN-002 | Operational | App/OS | Stop the server | App quit (SIGTERM to the server) or `kill`/Docker stop | Interrupt all → stop → force at the bound → exit | Exits ≤ 10 s, no leftovers | Supported Normal | E1–E9 |
| SCN-003 | User | User | Quit the app while an agent works | Cmd+Q, menu Quit, or OS SIGTERM | Quit → server shutdown → wait ≤ 15 s → force | Nothing left running | Supported Normal | E6; T-08d |
| SCN-004 | User | User | Resume after quitting | Relaunch | Open history → continue | Conversations continue | Supported Normal (preserved) | T-08c |
| SCN-005 | User | User | Stop generating | Composer Stop | Interrupt | Out of scope (DEC-003) | Supported Normal | E2, E5 |

## UI, Interaction, And Experience Requirements
- Applicable: `No` (no new UI; only timing). Product design fields: `N/A — not applicable`.

## Quality And Non-Functional Requirements
| ID | REQ/AC | Area | Requirement |
| --- | --- | --- | --- |
| QR-001 | REQ-002; AC-002, AC-003 | Reliability | Server shutdown ≤ 10 s with busy runs |
| QR-002 | REQ-004; AC-004 | Reliability | App quit leaves no process after ≤ 15 s |
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
| DEC-002 | Bounds | Server shutdown ≤ 10 s; desktop waits ≤ 15 s before force-stopping the server. | **Resolved as recommended** (SR-002) |
| DEC-003 | Codex composer Stop leaves the tool command running until the run ends (E2) | Out of scope; follow-up candidate | **Resolved: not in this ticket** (SR-002) |
| DEC-004 | Guard against a second server on the same data root (for example after a force-killed app) | Defer; follow-up candidate | **Resolved: not in this ticket** (SR-002) |

## Traceability
| REQ | UC | BEH | AC | SCN |
| --- | --- | --- | --- | --- |
| REQ-001 | UC-001, UC-002 | BEH-001, BEH-002 | AC-001, AC-002 | SCN-001, SCN-002 |
| REQ-002 | UC-002 | BEH-002 | AC-002, AC-003 | SCN-002 |
| REQ-003 | UC-002 | BEH-003 | AC-002, AC-003 | SCN-002 |
| REQ-004 | UC-003 | BEH-004 | AC-004, AC-005 | SCN-003 |
| REQ-005 | UC-004 | BEH-005 | AC-006 | SCN-004 |
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
- User approval received: **Yes** (SR-002). Ready for design: **Yes**.
