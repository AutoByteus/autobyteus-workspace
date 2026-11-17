# Requirements Document

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-001`
- Package identifier: `background-task-restart-notice`
- Request / ticket: Project Task `autobyteus-448` (merged with autobyteus-481), Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), for the user
- Requirements owner: Solution Designer
- Date: 2026-11-17
- Approved by and reference: `User`, 2026-11-17, in the Solution Designer conversation: DEC-003 (the reminder wording), then "Agreed, as recommended" for DEC-001 (B), DEC-004 (B, with the styling explained) and DEC-005 (at once)
- Exact approved requirements baseline: this document at SR-001 (2026-11-17)
- Behavior-defining supplements: none

## Problem And Desired Outcome

- Problem: an agent whose turn has ended but that waits for a background task it started looks idle, and after a restart nothing tells it the task was killed, so it waits forever. Restart-resume (285) records only agents that are mid-turn, and resumes them only after an update. After a plain restart or a crash, no agent is told anything.
- Desired outcome: (part 1) after a restart, every agent that was mid-turn or waiting for a background task gets one clear, friendly message: the application restarted (and why, when known), any background tasks it started were stopped, check what it still needs, restart it, or continue (a short reminder, DEC-003). (part 2) An agent with a running background task is not shown as plain "Idle".
- Observable definition of success: on an isolated node, an agent idle with a running background command is restarted with the node; before the change it gets nothing, after it gets the reminder naming the cause, and acts on it.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Scenario | Current | Desired | Preserved | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | Operational | SCN-001 | Update restart, mid-turn: woken, told the turn was interrupted | Same, and the message also names its background tasks that were stopped | Resume order (bottom-up), closed-Task fence, first-input rule, at most 3 at a time | notes |
| BEH-002 | Operational | SCN-002 | Update restart, idle with a background task: nothing | Woken with the message | — | recorder L41 |
| BEH-003 | Operational | SCN-003 | Plain quit/relaunch, Restart server, node stop/start: nothing for anyone | Per DEC-001 | — | 285 AC-004 |
| BEH-004 | Operational | SCN-004 | Crash, forced kill, power loss: nothing | Per DEC-001 | — | shutdown code |
| BEH-005 | User | SCN-005 | Idle with a running background task shown "Idle" | Shown per DEC-004 on desktop and phone lists and headers | Turn status semantics (Stop, input) | 473 |
| BEH-006 | System | SCN-006 | A message to such an agent is delivered at once | Per DEC-005 | — | input admission |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Scenarios |
| --- | --- | --- |
| UC-001 | Tell agents after a restart that it happened, why, and which background tasks were stopped (part 1) | SCN-001 to SCN-004 |
| UC-002 | Show an agent with a running background task as such (part 2) | SCN-005, SCN-006 |

### Out Of Scope

- Keeping background tasks alive across a restart.
- Application-owned and system-owned runs (285 DEC-005 stays).
- Shell time limits and why a task stopped in the Activity tab (autobyteus-483, the sister Task).
- Delegated runs that are themselves waiting for their delegate (a delegated run is a run of its own since 461; it is covered as its own run, not as a "background task" of its delegator).

### Non-Goals

- Restarting the stopped tasks automatically: the agent decides.
- Telling quit from Restart server from `docker stop` apart (the node is not told why it stops; DEC-002).

### Preserved Behavior Boundary

285's resume order, closed-Task fence, first-input rule and concurrency bound; idle shutdown's quiet check; the 338 rule that tasks stopped by a shutdown never produce a completion notice.

### Prerequisites

None.

### Review Authority

Standard (as the team's template).

## Requirements

| Requirement ID | Requirement | Behavior IDs | Priority | Rationale | Feasibility Evidence | Source |
| --- | --- | --- | --- | --- | --- | --- |
| REQ-001 | At a shutdown, the node keeps which runs were mid-turn or had a background task running (a yes/no per run; no task list is needed, DEC-003) | 001, 002 | Must | Who to tell | runtime coverage table (notes) | Task, DEC-003 |
| REQ-002 | After a restart, each such run gets one short restart reminder (DEC-003 text): the application restarted and why (DEC-002); if it was mid-turn, that the turn was interrupted; that any background tasks it started were stopped by the restart; check what it still needs, restart it, or continue | 001-004 | Must | The user's words 2026-11-12 and 2026-11-17 | — | DEC-003 |
| REQ-003 | After an update restart, each recorded run is woken with the reminder (285's resume path). After any other graceful restart, or an unexpected stop, the reminder is given with the run's next input (from the user or another agent); nothing is woken | 002-004 | Must | Keeps the cost rule of 285 DEC-001; no agent is left without knowing | — | DEC-001 |
| REQ-004 | Runtimes: a run counts as having a background task when its runtime says so (AutoByteus, Claude, Antigravity; Codex through its background-terminal read); Grok Build and DeepSeek (ACP) report none, so their runs get the reminder only when mid-turn | 001 | Must | Per-runtime facts | notes | DEC-006 |
| REQ-005 | Each run gets the reminder exactly once per restart, whichever comes first: the wake after an update, or its next input (the reminder rides that input; it starts no extra turn, so 285's first-input rule, which prevents a second turn, is kept). A run whose Task is closed, or whose root is archived, terminated or gone, gets none | 001-004 | Must | Preserved 285 rules; told once | — | 285; ARCH-REV-001 AR-001 |
| REQ-006 | (part 2) The node publishes, with each run's status, how many background tasks it has running (runtimes that can say so). Desktop and phone lists and headers show an idle run with running tasks as "Background task running" ("N background tasks running"), styled like an active agent, without a Stop button for it; a run in a turn shows "Running" | 005 | Must | The user's words 2026-11-12; DEC-004 | 473 `current()` | DEC-004 |
| REQ-007 | (part 2) Messages to an agent with a running background task are delivered at once, as today | 006 | Must | Parallelism | — | DEC-005 |

## Acceptance Criteria

| AC ID | REQ | Scenario | Trigger | Expected | Alternate | Verification |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001, 002, 003 | SCN-002 | Isolated node: native agent idle with `run_bash(run_in_background)` running; node restarted (update, plain restart, killed) | Before the change: no message. After: the reminder names the cause; woken after the update; given with the next input after a plain restart or a kill | — | Live E2E on an isolated node (before/after) |
| AC-002 | 001, 002 | SCN-001 | Update restart with a mid-turn agent that also has a background task | One message: turn interrupted + task stopped | — | E2E |
| AC-003 | REQ-004 | SCN-002 | An idle run with a running background task on AutoByteus, Claude and Antigravity (and Codex at a graceful stop) is restarted | Each is recorded as having a background task and gets the reminder; a Grok Build or DeepSeek (ACP) run gets it only when it was mid-turn | — | Integration per runtime (backend `hasRunningBackgroundTasks()` or the Codex inspection), one live E2E |
| AC-004 | REQ-005 | — | After an update: a run that gets input before the wake; a closed Task; an archived root | Input first: the reminder rides that input and no wake follows; closed Task / archived: no reminder | — | Integration |
| AC-005 | 006 | SCN-005 | Agent idle with a running background task | Desktop and phone lists and headers show DEC-004's wording; it returns to normal when the task ends | ACP: unchanged | Browser + phone probe |
| AC-006 | 007 | SCN-006 | Message sent to such an agent | Per DEC-005 | — | Integration |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor | Event | Trigger | Starting Condition | Steps | Outcome | Validity | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | Operational | Automatic update | update restart | install-and-restart | agent mid-turn | stop → record → start → resume | woken with the message | Supported Normal | 285 |
| SCN-002 | Operational | Automatic update / restart | restart | as SCN-001/003/004 | agent idle, background task running | stop kills the task → start | told per DEC-001 | Supported Normal | Task 2026-11-09/12 |
| SCN-003 | Operational | The user | plain quit and relaunch, Restart server, `docker stop`/start | user action | agents mid-turn or waiting | — | per DEC-001 | Supported Normal | Task 2026-11-12 |
| SCN-004 | Operational | — | crash, forced kill, power loss | none | same | — | per DEC-001 | Supported Normal (the user named crashes) | Task 2026-11-12 |
| SCN-005 | User | The user | looks at agents | lists, headers | agent idle with a task running | — | DEC-004 wording | Supported Normal | screenshots, Task |
| SCN-006 | User/System | The user or another agent | sends a message | composer, send_message_to | same | — | DEC-005 | Supported Normal | Task |

## UI, Interaction, And Experience Requirements

- Applicable: `Yes` (part 2: the status shown in existing lists and headers; no new screen). Product Design: `N/A — not requested`.
- Decisions that need the user: DEC-004 (wording), DEC-005 (delivery of messages).

## Data Continuity And Acceptable Loss

- Persisted data affected: `No` user data. The shutdown record stays transient (consumed at the next start). A crash-proof record (if DEC-001 covers crashes) is also transient runtime state.

## Decisions

| Decision ID | Question | Why It Matters | Options / Evidence | Reasoning And Recommendation | Owner | Status |
| --- | --- | --- | --- | --- | --- | --- |
| DEC-001 | After which restarts is a run told, and is it woken? | Your 285 decision (2026-11-01): update restarts only, because a plain quit is a choice to stop and an unasked resume the next morning costs money. On 2026-11-12 you asked for any shutdown and restart, crashes included | (A) update restarts only, now also for agents waiting on background tasks. (B) every restart is told: after an **update**, agents are woken (as today); after a **plain restart or a crash**, the message is given with the agent's next input, so it costs nothing until you or another agent talk to it. (C) agents are woken after every restart, crashes included (reverses 285 DEC-001) | B keeps your money rule and still means no agent is ever left without knowing; the unattended case (an automatic update overnight) wakes them so work continues. C makes work continue by itself after every restart, at the cost of a turn per agent each time you start the app. **Recommend B.** Crashes need the record kept up to date while the node runs, not only at shutdown (small, transient) | User | Decided by the user (2026-11-17, "as recommended"): **B**: after an update, recorded runs are woken; after a plain restart or an unexpected stop, the reminder is given with the run's next input |
| DEC-002 | How is the cause named? | The node is not told why it stops | update (the version changed: named), a restart (any other graceful stop), an unexpected stop (no shutdown record: crash, forced quit, power loss) | Names what the node can know without new plumbing in the desktop and Docker starter | Solution Designer | Decided |
| DEC-003 | The message wording | Your words: friendly, in context | **Decided by the user (2026-11-17):** a short reminder, not a detailed task list: "the agent is very smart, it just needs a reminder": if you started background tasks, the restart stopped them; check, restart what you need, or continue | — | User | Decided |
| DEC-004 | What lists and headers show for an agent idle with a running background task (part 2) | Today "Idle" | (A) "Idle · 1 background task"; (B) "Background task running" (count when several), shown like a working agent; (C) "Busy" | B says exactly what is happening and is not "Idle"; the Stop button stays for turns only. **Recommend B** | User | Decided by the user (2026-11-17, "Agreed, as recommended"): **"Background task running"** ("2 background tasks running"), styled like an active agent, no Stop button for it; a run in a turn shows "Running" (the turn wins) |
| DEC-005 | A message to such an agent: delivered at once or queued until its tasks end? | Today at once | At once lets it work in parallel while the task runs (the point of 338); queuing could hold a message for an hour behind a long build | **Recommend at once** (no change) | User | Decided by the user (2026-11-17, as recommended): **delivered at once** (no change) |
| DEC-006 | Codex and ACP runtimes | Coverage | Codex: a yes/no from its background-terminal read at shutdown; ACP: nothing to read | As stated in REQ-004 | Solution Designer | Decided |
| DEC-007 | Order | Task says part 1 first | Part 1 designed, built and merged first; part 2 follows in this ticket as a second round | — | Solution Designer | Decided |

### DEC-003 message (the user's direction, 2026-11-17)

```
[Platform notice — application restarted]

The application restarted at 22:20 (reason: an update to v1.5.14).
Your previous turn was interrupted; check the results of any tool calls that were running before you repeat them.   ← only if it was mid-turn
If you started any background tasks, the restart stopped them. Check what you still need: restart it, or continue your work.
```

Cause variants: "an update to <version>", "a restart", "an unexpected stop (a crash, a forced quit or a power loss)".

## Traceability

| REQ | UC | BEH | AC | SCN |
| --- | --- | --- | --- | --- |
| REQ-001 | UC-001 | 001, 002 | AC-001, AC-002 | SCN-001, SCN-002 |
| REQ-002 | UC-001 | 001-004 | AC-001, AC-002 | SCN-001-004 |
| REQ-003 | UC-001 | 002-004 | AC-001 | SCN-002-004 |
| REQ-004 | UC-001 | 001 | AC-003 | SCN-002 |
| REQ-005 | UC-001 | 001-004 | AC-004 | — |
| REQ-006 | UC-002 | 005 | AC-005 | SCN-005 |
| REQ-007 | UC-002 | 006 | AC-006 | SCN-006 |

## Readiness Check

- Content ready for approval: `Yes`; remaining blocker: None
- Approval recorded: `Yes` (the user, 2026-11-17)
