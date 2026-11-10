# Requirements Document

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-005`
- Package identifier: `run-bash-background`
- Request / ticket: Project Task `autobyteus-338` (Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`), read with autobyteus-448
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), for the user
- Requirements owner: Solution Designer
- Date: 2026-11-09
- Approved by and reference: `User`, 2026-11-09 (SR-001), 2026-11-10 (SR-004 DEC-012: "I will approve your recommendation"), and 2026-11-10 (SR-003: DEC-006 "why not to support both at the same time … we do it in this ticket"), in the Solution Designer conversation: DEC-001 ("we return the pid … they can just use bash to kill it"), DEC-004 ("for this task maybe we focus on simplifying"), and "I'll agree with your decisions, your recommended decisions" for DEC-002, DEC-003, DEC-005
- Exact approved requirements baseline / solution revision: this document at SR-004 (SR-001 approved 2026-11-09; SR-003 DEC-006 and SR-004 DEC-012 approved by the user 2026-11-10)
- Behavior-defining supplements and their approved versions: none (the prototype and the options report are evidence)

## Problem And Desired Outcome

- Problem: a native AutoByteus agent that runs a long command in the background never hears when it ends. It must poll `get_process_output`, which costs tokens and is easily forgotten; an idle agent is never told; no exit code is ever reported. There are two ways to start background work (shell `&` in `run_bash`, and `start_background_process`) and four extra tools. When a run ends its background commands keep running, unseen, until the app quits; a delegated native copy is idle-shut-down while its build still runs. The other runtimes (Claude, Antigravity) already report background work and Claude wakes the agent on completion.
- Affected actors or systems: native agents and their models; the user watching a run; agents waiting for delegated task agents; Background Tasks panel; work journal; idle shutdown; restart resume (448).
- Desired outcome: `run_bash` can run a command in the background; the agent is told, in one batched notice, when its background commands end, with how they ended and their last lines; it can read output and stop a command; the separate background tools that are no longer needed are retired.
- Observable definition of success: an agent starts two builds in the background, keeps working or ends its turn, and receives one notice naming both with exit codes and last lines, without a single poll.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Related Scenario IDs | Evidence-Backed Current Behavior | Desired Behavior | Intentionally Preserved Behavior | Investigation Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | SCN-001, SCN-002, SCN-004 | Shell `&` in run_bash (adopted survivors listed) or `start_background_process` | `run_bash` with a run-in-background option returns at once with the command's id, cwd and output file | run_bash foreground behavior, `cwd` rules, `timeout_seconds` | notes BEH-001; P1, P3 |
| BEH-002 | System | SCN-001, SCN-003 | Agent polls; no exit code ever reported | Completion notice with exit code or signal, duration, last lines, output file | — | P1, P2 |
| BEH-003 | System | SCN-002 | Idle agent never told | Notice wakes the idle agent with one new turn (DEC-002) | — | backend L174-177 |
| BEH-004 | System | SCN-004 | `get_process_output` from an in-memory 1 MB buffer | Output kept in a file the agent reads with ordinary commands | — | manager |
| BEH-005 | System | SCN-004 | `stop_background_process(pid)` | The agent stops a command with `kill <pid>` in run_bash, using the pid the start returned; that stops the command and everything it started (DEC-001 B) | The platform's own stops (run end, app quit) stay verified group stops | P5; kill-pid probe |
| BEH-006 | System | — | `get_background_processes` (unused in local traces) | Retired; the start result, the notice and the panel carry the information | — | data count |
| BEH-007 | Operational | SCN-005 | Run Terminate/delete/Task close/idle shutdown leaves commands running unseen until app quit | Ending a run stops its background commands (DEC-003) | App quit stops all commands | P4; FU-003 (284) |
| BEH-008 | Operational | SCN-006 | Delegated native copy idle-shut-down while its command runs | Not idle-shut-down while a background command runs; an end re-arms the grace period | Grace setting and other quiet checks | team docs |
| BEH-009 | User | SCN-009 | Background Tasks panel: native `unsupported` | Native background commands appear like Claude/AGY tasks (running → completed/failed/stopped) | Panel behavior for other runtimes | backend L106 |
| BEH-010 | System | SCN-007 | App quit/restart stops all native commands; idle runs are not told after restart | Unchanged here; the per-run list this ticket keeps is what 448 needs (DEC-004) | App quit stops commands | restart-resume |
| BEH-011 | User | SCN-010 | Stop stops the foreground command; background commands keep running | Same; their notices still arrive | Yes | executor |
| BEH-012 | Contract | SCN-008 | Unknown stored tool names skipped; run_bash always present | Same: definitions naming retired tools keep starting; no migration | Yes | resolver; 328 |
| BEH-013 | User | SCN-011 | Journal lines for the four tools | Background run_bash renders `Command: <cmd> (background)`; the notice renders `Notice:`; recorded calls of retired tools still render | Historical journals | journal translation |
| BEH-014 | System | SCN-012 | Foreground run_bash lists shell `&` survivors in `backgroundProcesses` (two rows for one command, no exit code; P3) | When the foreground part of a run_bash command ends while `&` jobs it started still run, the call returns; each such job is a background task like a `run_in_background` command: pid listed in the result, end reported with its exit code (in a run_bash result or the notice), panel, `kill <pid>`, stopped at run end (DEC-006, the user) | Jobs that detach themselves (disown, nohup, setsid, daemons) are not tracked: as today they are stopped at run end and app quit when they stay in the command's process group, and escape when they leave it | P3; shell-stays-parent probe |

## Stakeholders, Actors, And Outcomes

| Actor / Stakeholder | Goal Or Responsibility | Required Outcome | Important Constraint |
| --- | --- | --- | --- |
| Native agent (model) | Run long work without blocking | Simple tool, told when work ends | Fewer tools; no polling |
| The user | Trust what agents leave running; see it | Visible notices and panel rows; run end cleans up | No unseen token spend |
| Delegating agent | Its task agent finishes the job | Task agent not shut down mid-build | — |
| Agent package authors | Package tool lists stay valid | Old names harmless; lists updated later | Package repos are separate |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Related Scenario IDs |
| --- | --- | --- |
| UC-001 | Start a command in the background with run_bash | SCN-001, SCN-002, SCN-004 |
| UC-002 | Be told when background commands end (busy, idle, batched) | SCN-001, SCN-002, SCN-003 |
| UC-003 | Read a background command's output; stop it | SCN-004 |
| UC-004 | Background commands follow their run's life (run end, idle shutdown, Stop) | SCN-005, SCN-006, SCN-010 |
| UC-005 | See native background commands in the panel and the journal | SCN-009, SCN-011 |
| UC-006 | Retire the unneeded background tools without breaking stored definitions | SCN-008 |
| UC-007 | Keep the per-run list of background commands (the input 448 needs) | SCN-007 |

### Out Of Scope

- Other runtimes' background behavior (Claude, Codex, Antigravity, Grok, DeepSeek): reported only.
- Telling idle agents after a restart that their commands were killed (autobyteus-448), unless the user decides otherwise (DEC-004).
- Start robustness and the wrong-directory output under heavy load (FU-003/FU-006 of autobyteus-333), unless the user decides otherwise (DEC-005).
- Changing the public/private agent package files (a separate ticket for the Agent Package Creator, DEC-008).
- Interactive terminal sessions (server/web Terminal), stdin to background commands.

### Non-Goals

- Tracking processes that detach themselves from the run_bash shell (disown, nohup, setsid, daemons): not possible to know their end; the user accepted this (2026-11-10).

- Mid-turn delivery into a native turn (the native runtime does not append input to an active turn; a busy agent hears right after its turn).
- A limit on how many background commands an agent may run; output size limits beyond what the design needs for the notice.
- Keeping background commands alive across an app restart.

### Preserved Behavior Boundary

BEH-005 (verified stop), BEH-010 (app quit stops all), BEH-011, BEH-012, BEH-013 (historical journals), and run_bash foreground behavior (BEH-001 preserved column).

### Prerequisites

None. FU-003/FU-006 were tested against the prerequisite test: under normal load a background start takes about 120 ms (P1), and they affect every run_bash call today, so this ticket's goal is reachable without them (DEC-005).

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID that it protects.
- A finding that would introduce new product behavior, policy, threat model, migration obligation, compatibility promise, or operational contract is a `Requirement Gap`; it requires explicit user approval before becoming authoritative.
- An adjacent concern outside the approved boundary may be recorded as a non-blocking risk, recommendation, or follow-up. It is not a required design correction, unless it is a prerequisite.
- A downstream reviewer comment does not amend this requirements basis.

## Requirements

Written for the user's decisions: DEC-001 option B, DEC-002 yes, DEC-003 yes, DEC-006 both ways (2026-11-10).

| Requirement ID | Requirement | Related Behavior IDs | Priority | Rationale | Feasibility Evidence | Source / Decision Reference |
| --- | --- | --- | --- | --- | --- | --- |
| REQ-001 | `run_bash` has a run-in-background option. With it, the call returns as soon as the command has started, with the command's id, its effective cwd and the path of its output file; `timeout_seconds` does not apply to it. Without it, run_bash behaves as today | 001 | Must | The user's direction; one way to start background work | P1 (≈120 ms per start) | Task, user comment |
| REQ-002 | When a background task ends (exits, is killed by a signal, or its control is lost), the agent receives a completion notice naming, per task: pid, command, how it ended (exit code, signal, or lost), how long it ran, its last output lines (bounded; tasks started by the same call share their output) and its output file; the notice also lists the agent's tasks still running | 002 | Must | Replaces polling | P1 | Task lead 1 |
| REQ-003 | Delivery: a busy agent receives the notice right after its current turn ends; an idle agent is woken by it with one new turn | 002, 003 | Must | Native cannot append to an active turn; the user saw waking work well | input admission code | DEC-002 |
| REQ-004 | Batching: all completions not yet delivered when a notice is delivered go into that one notice; while the agent is idle, delivery waits a short settle period (target 2 s) so near-simultaneous ends arrive together | 002 | Must | Task lead 2 | P2 (300 ms split, 1 s batched) | Task lead 2 |
| REQ-005 | Spend and loop guards: each command end is reported once (in a run_bash result, REQ-015, or in one notice); no notice for commands stopped because the run ended or the app quit; every notice is visible in the conversation and journal as a platform notice | 002, 003 | Must | No loops, no unseen spend | — | Task lead 2 |
| REQ-006 | The agent can read a background command's output while it runs and after it ended, with ordinary commands (`tail`, `read_file`) on its output file, while the run is live (the file is removed when the run ends; the notice already carries the last lines) | 004 | Must | Replaces `get_process_output` | — | DEC-001, DEC-007 |
| REQ-007 | For a `run_in_background` command: the start result returns the command's pid; `kill <pid>` run through run_bash stops the command and every process it started (no survivors in its process group); `kill -9 <pid>` remains the agent's choice. There is no separate stop tool | 005 | Must | The user's decision: return the pid, kill with bash | kill-pid probe: plain launch leaves 3 of 4 processes running after `kill <pid>`; with a TERM-forwarding wrapper none remain | DEC-001 (user) |
| REQ-008 | All four tools are retired: `start_background_process`, `get_background_processes`, `get_process_output`, `stop_background_process`. Agent definitions naming them keep starting (names skipped, run_bash always present); no app-data migration; the built-in Daily Assistant lists only current tools | 006, 012 | Must | User's direction; 328 precedent | resolver code | DEC-001, DEC-008 |
| REQ-009 | When a run ends (Terminate, delete, Task DONE/CANCELLED release, root stop, idle shutdown), its background commands are stopped; app quit stops all as today | 007, 010 | Must | Same as Claude/AGY; ends unseen orphans | P4 | DEC-003 |
| REQ-010 | Native runs report their background commands as background tasks: the Background Tasks panel shows them (running, then completed/failed/stopped with exit code), and a delegated copy is not idle-shut-down while one runs; an end re-arms the grace period | 008, 009 | Must | Consistency with Claude/AGY; protects REQ-002 for task agents | — | DEC-009 |
| REQ-011 | A foreground run_bash returns when its foreground part ends, with its exit code and output so far. Each `&` job it started that is still running is then a background task: the result lists it (pid, the call's command text, the call's output file), and it follows REQ-002 to REQ-006, REQ-008 to REQ-010 and REQ-015 like a `run_in_background` command. For REQ-007: `kill <pid>` on such a job stops that process only; processes it started itself stay until the agent kills them, the run ends or the app quits (DEC-012). Jobs that detach themselves are out of scope (not tracked, no notice). Works with bash; with the `sh` fallback foreground calls do not track `&` jobs (and, as everywhere, list no survivors) | 014 | Must | The user: support both ways; parallelism with the bash models already write | shell-stays-parent probe; wrapper skeleton probe (11 cases, bash 3.2) | DEC-006, DEC-012 (user) |
| REQ-012 | Work journal: a background run_bash renders as `Command: <command> (background)` with the started id; the completion notice renders as `Notice:`; recorded calls of retired tools in existing journals keep rendering | 013 | Must | autobyteus-331 vocabulary | — | Task lead 5 |
| REQ-013 | For every live native run the platform knows its background commands: id, command, cwd, start time, status (and end result when ended) | 010 | Must | The list 448 needs | — | User comment |
| REQ-014 | Stop (interrupt a turn) leaves background commands running; their notices still arrive | 011 | Must | Preserved; same as Claude | — | — |
| REQ-015 | A background command that ends while its agent's own run_bash call is running (for example the agent's `kill <pid>`) is reported in that call's result, not in a later notice, so a self-stop does not cost an extra turn. An end not reported this way goes into the notice (REQ-003) | 002, 005 | Should | Option B's cost (an extra turn per self-kill) is avoided in the common case | To verify in architecture: the end event of a killed command usually arrives before the kill call returns; when it does not, the fallback is a short notice | DEC-011 |

## Acceptance Criteria

| Acceptance-Criteria ID | Related Requirement IDs | Related Behavior / Scenario IDs | Preconditions / Trigger | Observable Expected Outcome | Important Alternate Or Failure Outcome | Verification Intent |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001 | SCN-001 | Agent calls run_bash with the background option on `sleep 5; echo done` | Result returns in < 2 s with id, effective cwd, output file; command still running | Start failure returns an error result, nothing left running | Live native agent E2E + integration |
| AC-002 | REQ-002, REQ-003 | SCN-001 | Agent busy when its command ends | Right after its turn, one notice: id, command, exit code, duration, last lines, output file | Exit code ≠ 0 and signal endings are named | E2E |
| AC-003 | REQ-003 | SCN-002 | Agent ended its turn, command ends later | Agent starts a new turn with the notice within 5 s of the end | — | E2E |
| AC-004 | REQ-004 | SCN-003 | Three commands end within 1 s | Exactly one notice naming all three | — | Integration + E2E |
| AC-005 | REQ-005, REQ-007, REQ-015 | SCN-004 | Agent runs `kill <pid>` with run_bash on its dev server (`npm run dev`-like, with child processes) | No process of the command remains; the kill's run_bash result reports the command ended (signal); panel row `stopped`/`failed` with the signal; no later notice when reported in the result | End arrives after the kill returned → one short notice | E2E + process check |
| AC-006 | REQ-005, REQ-009 | SCN-005 | User Terminates a run with a running background command | Command's process group is gone within 10 s; no notice is delivered | — | E2E (process check) |
| AC-007 | REQ-006 | SCN-004 | Command prints lines | `tail -n 5 <output file>` in run_bash shows them while running and after the end | — | E2E |
| AC-008 | REQ-008 | SCN-008 | A stored definition lists the retired tools | Run starts; tools absent; run_bash present; a warning names the skipped tools; definition data unchanged | — | Unit/integration |
| AC-009 | REQ-010 | SCN-006, SCN-009 | Delegated native copy idle with a running background command | Not shut down after the grace period; panel shows the row; after the end the row is completed/failed and the grace period restarts | — | Integration + browser check |
| AC-010 | REQ-011 | SCN-012 | Foreground run_bash `(sleep 2; exit 7) & echo started` | Returns in < 2 s with exit code 0, output `started`, and one background task (pid, command, output file); about 2 s later its end with exit code 7 is reported (notice or a run_bash result); panel shows it; `kill <pid>` before the end stops that process and the end is reported as a signal | `cmd & disown`: returns, nothing tracked, no notice; process still stopped at run Terminate. A job with children: after `kill <pid>` its children remain until run end (DEC-012) | Integration + E2E |
| AC-011 | REQ-012 | SCN-011 | Journal of a run with background run_bash and a notice | `Command: … (background)` and `Notice:` lines; an old journal with `get_process_output` still renders | — | Journal renderer tests |
| AC-012 | REQ-013 | SCN-007 | Live run with two background commands | The platform can list both with id, command, cwd, start, status | — | Unit |
| AC-013 | REQ-014 | SCN-010 | User presses Stop while a background command runs | Command keeps running; its notice still arrives | — | E2E |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor / Initiator | Coherent Goal Or Governing Event | Supported Trigger | Starting Condition | Product-Level Steps | Expected Outcome | Alternate / Error | Validity | Evidence | Related |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | System | Native agent | Run a long build/test and keep working | run_bash background | Run active | start → keep working → command ends → notice after turn | Agent knows the result without polling | Failure ending named | Supported Normal | Task; traces | REQ-001-003, AC-001/002 |
| SCN-002 | System | Native agent | Wait for a command | run_bash background, then end turn | Agent idle | command ends → notice wakes agent | Agent continues | — | Supported Normal | Task lead 2 | REQ-003, AC-003 |
| SCN-003 | System | Native agent | Several commands in parallel | several background starts | — | they end close together | One notice | — | Supported Normal | Task lead 2 | REQ-004, AC-004 |
| SCN-004 | System | Native agent | Dev server for a preview | background start; read output; stop | — | tail output; stop when done | Server stopped, no notice | unknown id | Supported Normal | traces (start/stop used) | REQ-006/007, AC-005/007 |
| SCN-005 | Operational | User / Task owner | End a run | Terminate, delete, Task close, root stop, idle shutdown | Command running | run ends | Command stopped, no notice | — | Supported Normal (behavior change, DEC-003) | FU-003 (284) | REQ-009, AC-006 |
| SCN-006 | Operational | Delegating agent | Task agent waits for its build | idle shutdown grace | Copy idle, command running | grace passes | Copy kept; re-armed after end | — | Supported Normal | team docs | REQ-010, AC-009 |
| SCN-007 | Operational | App update/restart | App restarts | quit | Commands running | all stopped | As today; 448 tells idle agents | — | Supported Normal | 285, 448 | REQ-013, AC-012 |
| SCN-008 | Contract | Stored definition | Definition names retired tools | run start | — | resolve tools | Run starts with run_bash | — | Supported Normal | 328 | REQ-008, AC-008 |
| SCN-009 | User | The user | See what a native run left running | Background Tasks panel | — | open panel | Rows for native commands | — | Supported Normal | Claude/AGY parity | REQ-010, AC-009 |
| SCN-010 | User | The user | Interrupt a turn | Stop | Command running | Stop | Command keeps running; notice still arrives | — | Supported Normal | executor; Claude docs | REQ-014, AC-013 |
| SCN-011 | User | The user | Read the journal | Work journal | — | — | Background lines and notices readable | — | Supported Normal | 331 | REQ-012, AC-011 |
| SCN-012 | System | Native agent | Start parallel work with plain bash `&` | run_bash | — | foreground part ends; jobs keep running; each ends | Agent keeps working; told when each job ends with its exit code | detached jobs not tracked | Supported Normal (models already write `&`: 557 trace files with kill/pkill, P3) | user decision 2026-11-10 | REQ-011, AC-010 |

## UI, Interaction, And Experience Requirements

- Applicable: `Yes`, limited to existing surfaces: the existing Background Tasks panel (no new UI) and the existing system-notice card in the conversation.
- Linked UI/UX supplement, references, Product ticket, revisions, confirmations: `N/A — not applicable` (no Product Design request).
- Product decisions that need the user: DEC-002 (waking an idle agent), DEC-003 (run end stops commands).

## Quality And Non-Functional Requirements

| Quality ID | Related Requirement / AC IDs | Area | Measurable Requirement Or Constraint | Conditions / Scope | Verification Intent |
| --- | --- | --- | --- | --- | --- |
| QR-001 | REQ-001, AC-001 | Performance | Background start returns within the existing start budget (1.5 s); measured ≈120 ms unloaded | Normal load (FU-003 covers heavy load) | Integration timing |
| QR-002 | REQ-003, AC-003 | Operability | Idle notice within 5 s of the end (2 s settle + delivery) | — | E2E |
| QR-003 | REQ-002 | Operability | Notice tail bounded (target last 20 lines and ≤ 2,000 characters per command) | — | Unit |
| QR-004 | REQ-006 | Privacy | Output files stay in the OS temp area of this node (not the synced memory folder) and are removed when the run ends | — | Integration |

## Data Continuity And Acceptable Loss

- Persisted or external data affected: `No` app-data shape change. Stored definitions are read as they are.
- Must be preserved: stored definitions (unchanged), historical journals and traces (render as before).
- Acceptable: leftover retired names in definitions; output files removed with their run; output of commands killed by an app restart is not kept beyond the run's temp area.
- Unknowns: output file location and cleanup moment (architecture).

## External Contracts And Dependencies

| Contract / Dependency | Required Behavior Or Constraint | Evidence / Authority | Uncertainty Or Risk |
| --- | --- | --- | --- |
| Model-facing tool contract | Schema change of run_bash; tools removed (clean cut, DESIGN.md rule 9) | DESIGN.md | — |
| `BACKGROUND_TASK_UPDATED`, `hasRunningBackgroundTasks` | Native implements the existing contract | agent-background-task.ts | — |
| Public/private agent packages | Name the retired tools (35 public, 18 private files) | git grep | Updated in a separate ticket |

## Supplemental Artifacts

| Artifact Path | Purpose | Related Requirement / AC IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- |
| `options-report.md` | The report the Task asks for: options, other runtimes, recommendation | DEC-001-005 | Current | For the user's decisions |
| `prototype/background-completion.prototype.test.ts`, `prototype/prototype-run.log` | Feasibility | REQ-001-007, REQ-009 | Current | Evidence |
| `prototype/kill-pid-probe.mjs`, `prototype/kill-pid-probe.log` | `kill <pid>` stops the whole command only with a TERM-forwarding wrapper | REQ-007 | Current | Evidence |
| `agents-package-files-naming-background-tools.txt` | Package hand-over list | REQ-008 | Current | Evidence |

## Assumptions

| Assumption ID | Assumption | Why It Is Necessary | Validation Plan / Owner | Status |
| --- | --- | --- | --- | --- |
| ASM-001 | 448's scope is as the user's words in 338's comment describe | 448 not readable from this run | PTM confirms when creating build Tasks | Open |
| ASM-002 | Models use a `tail` on an output file as readily as a dedicated output tool | REQ-006 | Claude Code works this way; E2E with a live model | Open (validated in E2E) |

## Decisions

| Decision ID | Question | Why It Matters | Options / Evidence | Reasoning And Recommendation | Decision Owner | Status |
| --- | --- | --- | --- | --- | --- | --- |
| DEC-001 | Tool shape | Number of tools, safety of stopping, extra turns | (A) keep the four tools + notice; (B) run_bash only: read output from the file, stop with `kill -TERM -<group>` in run_bash; (C) run_bash with the background option + one small stop tool; retire the other three | Reading output needs no tool (a file and `tail`); listing is unused (0 uses) and replaced by the notice and the panel. Stopping is the one thing the platform must know about: with (B) the platform cannot tell a requested stop from a crash, so the notice cannot be suppressed and the agent usually gets one extra turn to hear about its own kill; and the agent must target the process group (a plain `kill <pid>` leaves children such as a dev server's node running), with a small chance of hitting a reused group id after the command ended. Claude keeps the same split (Bash + TaskStop). **Recommend (C)**: 2 tools instead of 5. (B) is workable if you prefer the purest shape; the cost is the extra turn per self-stop. (A) keeps two ways to start and five tools | User | **Decided by the user (2026-11-09): option B** — "if it runs in background we return the pid … they can just use bash to kill it as long as we return the pid". All four tools retired; the kill-pid probe shows a wrapper makes `kill <pid>` stop the whole command; REQ-015 avoids the extra turn in the common case |
| DEC-002 | Wake an idle agent with a new turn when its command ends? | Token spend vs usefulness | Claude wakes (CLI starts a turn); AGY does not; existing skill/tool notices never wake | The common case is "start the build, wait for it": without waking, the agent sits idle until someone writes to it. Guards (REQ-004/005) bound the spend to one turn per batch of command ends the agent itself started, and every notice is visible. **Recommend yes** | User | Decided by the user (2026-11-09): as recommended |
| DEC-003 | Stop a run's background commands when the run ends (Terminate, delete, Task close, root stop, idle shutdown)? | Changes documented behavior (dev servers outlive the agent) | Today: kept until app quit, unseen (P4); Claude/AGY: stopped | After this change the run is the only owner that can see or stop them; leaving them running makes unseen orphans (the 284 follow-up called it a product decision). A user who wants a server to outlive the agent can start it outside the agent. **Recommend yes**; idle shutdown no longer happens while a command runs (REQ-010) | User | Decided by the user (2026-11-09): as recommended |
| DEC-004 | 448 inside this Task or after? | Ticket size; all runtimes | 448 needs the per-run list (REQ-013) and a restart notice for idle runs of every runtime (Claude, AGY too), touching restart resume (285) | This ticket builds the native list and the notice path; 448 is a restart-resume change across runtimes. **Recommend: its own Task right after this one**, depending on it | User | Decided by the user (2026-11-09: "I'm not sure whether it belongs to this task or another task, but for this task maybe we focus on simplifying"): 448 is a separate Task; this Task keeps REQ-010/REQ-013 so a run that is idle but has a running background command is known to the platform, the input 448 needs |
| DEC-005 | Fix FU-003/FU-006 first, inside, or after? | Reliability under load | Both hit every run_bash call today (foreground too); this ticket adds no new start path (same scope.start); a background start takes ≈120 ms unloaded; FU-006's cause is unknown | Not a prerequisite (goal reachable); mixing a load investigation into a tool redesign enlarges the ticket. **Recommend: one Task after this one** ("terminal under load": FU-003 + FU-006). If you have seen these failures in real use (not only in test runs), do it first instead | User | Decided by the user (2026-11-09): as recommended |
| DEC-006 | How are shell `&` jobs of a foreground run_bash handled? | Models already write `&`; parallelism | Earlier: stop listing them (no exit code possible). Probe 2026-11-10: a wrapper shell that stays alive after the foreground part is their parent and reports each job's exit code; detached jobs are unknowable | **Decided by the user (2026-11-10): support both ways in this ticket**: `run_in_background` and plain `&` jobs are both background tasks; jobs that detach themselves are outside our control ("not our control") | User | Decided |
| DEC-007 | Where does output go? | REQ-006 | In-memory buffer (lost with context) vs file | A file in the node's temp area per run, removed with the run; path in the start result and the notice | Solution Designer | Decided |
| DEC-008 | Migrate stored tool names? Package files? | Rule 10; 35 + 18 files | 328 precedent: user decided no migration; package files in a separate ticket after a stable release | Same situation (removal absorbed by always-present run_bash): no migration; the built-in Daily Assistant changes in this ticket; package files are handed to the Agent Package Creator after a stable release with this change | Solution Designer (by the user's 328 precedent) | Decided |
| DEC-009 | Report native background commands to the panel and idle shutdown? | Consistency across runtimes | Claude and AGY do; protects SCN-006 | Yes, through the existing contract | Solution Designer | Decided |
| DEC-010 | Command id | Familiarity | PID (today) vs own id | The command's PID is the id (the user's DEC-001: return the pid; usable with `kill` and `ps`) | User / Solution Designer | Decided |
| DEC-011 | Avoid an extra turn after the agent's own kill | Option B: the platform cannot tell a kill from a crash | Report an end inside the run_bash result that was running when it happened; otherwise the notice | Reporting where the agent already is costs nothing and needs no guess about who sent the signal; it also tells the agent at once when an unrelated command ended during a long run_bash. Fallback is one short notice | Solution Designer | Decided |
| DEC-012 | `kill <pid>` on a plain `&` job (ARCH-REV-001 AR-002) | REQ-007 for `&` jobs | No mechanism puts a TERM-forwarding trap inside a job the user's own text starts; giving each job its own process group would take it out of the verified group the platform cleans up (BEH-005/010). Probe case 11: after `kill <pid>` the job's children remain, inside the group | Narrow: for `&` jobs `kill <pid>` is normal bash (that process only); children stay until the agent kills them, run end or app quit; `run_in_background` gives the full stop; the tool description says so | User | Decided by the user (2026-11-10): "I will approve your recommendation" |
| DEC-013 | Should the agent be able to see what is still running? (the user's question 2026-11-10) | After compaction the agent may forget a running task; the list tool is retired | Each notice lists the tasks still running (no new tool) | The user asked for reasonable recommendations: include the still-running list in every notice | Solution Designer | Decided |

## Traceability

| Requirement ID | Use-Case IDs | Behavior IDs | Acceptance-Criteria IDs | Scenario IDs | Supplemental Evidence |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | UC-001 | BEH-001 | AC-001 | SCN-001/002/004 | P1 |
| REQ-002 | UC-002 | BEH-002 | AC-002 | SCN-001 | P1 |
| REQ-003 | UC-002 | BEH-002/003 | AC-002/003 | SCN-001/002 | — |
| REQ-004 | UC-002 | BEH-002 | AC-004 | SCN-003 | P2 |
| REQ-005 | UC-002, UC-004 | BEH-002/003 | AC-005/006 | SCN-004/005 | P5 |
| REQ-006 | UC-003 | BEH-004 | AC-007 | SCN-004 | — |
| REQ-007 | UC-003 | BEH-005 | AC-005 | SCN-004 | P5, kill-pid probe |
| REQ-015 | UC-002, UC-003 | BEH-002/005 | AC-005 | SCN-004 | — |
| REQ-008 | UC-006 | BEH-006/012 | AC-008 | SCN-008 | package list |
| REQ-009 | UC-004 | BEH-007/010 | AC-006 | SCN-005 | P4 |
| REQ-010 | UC-004, UC-005 | BEH-008/009 | AC-009 | SCN-006/009 | — |
| REQ-011 | UC-001, UC-002 | BEH-014 | AC-010 | SCN-012 | P3, shell-stays-parent probe |
| REQ-012 | UC-005 | BEH-013 | AC-011 | SCN-011 | — |
| REQ-013 | UC-007 | BEH-010 | AC-012 | SCN-007 | — |
| REQ-014 | UC-004 | BEH-011 | AC-013 | SCN-010 | — |

## Architecture Phase Input

- Approved scenario IDs to map: SCN-001 to SCN-012 (after approval).
- Constraints: verified group stop (no platform signal to an unrelated process); app quit cleanup; existing notice path and senders; existing `BACKGROUND_TASK_UPDATED` contract; clean cut of the tool contract.
- Deferred to architecture: where completion is observed (autobyteus-ts vs server backend), notice text, output file location/cleanup, per-run lease ownership, Windows/WSL, journal translation of the new call, memory recording of the new sender.
- Technical facts to verify: native memory/journal recording of a SYSTEM notice; restore of a run whose commands were stopped; settle-window timer ownership.
- Known risks: R-1 (spend), R-3 (load).

## Readiness Check

### Content Ready For Approval

- Relevant current behavior is evidence-backed: `Yes`
- Desired and preserved behavior are explicit: `Yes`
- Scope and non-goals are clear: `Yes`
- Requirements and acceptance criteria are testable and traceable: `Yes`
- Applicable scenarios are covered with validity and evidence: `Yes`
- Product design and supplemental evidence is integrated consistently: `N/A`
- Applicable UI/UX approval and final visual-reference basis are recorded: `N/A`
- Material assumptions and decisions are visible, each decision with reasoning and recommendation: `Yes`
- Content ready for approval: `Yes`
- Remaining content blocker: None

### Approved Basis Ready For Design

- Approval recorded: `Yes`
- Exact requirements and supplement approval basis recorded: `Yes`
- Approved requirements package ready for architecture design: `Yes`
- Remaining blocker: None
