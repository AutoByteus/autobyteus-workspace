# Requirements Document — restart-resume (autobyteus-285)

## Document Status
- Status: **Approved** (SR-002, 2026-11-01). Current solution revision ID: `SR-002`.
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), Task
  `autobyteus-285`, 2026-11-01, at the user's word. Requirements owner: Solution Designer.
- Approved by: **the user**, 2026-11-01. After seeing REQ-001..006 and DEC-001's options with recommendation A, he
  described the purpose: "if I toggle this enable automatic upgrade to the latest beta … there might be some agents …
  in the middle term. Some others, which are in idle, we don't care … only the agent runs, which are busy, will
  receive a notification … in the midnight … some new beta was released … the system will automatically upgrade …
  and then the agent can continue on working". That is option A (update restarts only, busy runs only); he was told it
  is recorded as A and that he can ask for plain quits too. Basis carried: autobyteus-283 requirements (REQ-001..004, REQ-006 as candidates); the user's
  decision of 2026-10-30 (automatic after an update, no human).
- Workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/restart-resume`, branch `codex/restart-resume`, base
  `origin/personal` @ `efd28d5c4a`, target `personal`.

## Problem And Desired Outcome
- **Problem:** when a node restarts for an update (desktop "Install update and restart", automatic updates later,
  a Docker node's in-place update), every agent that was mid-turn is stopped, and the user has to message each one
  to continue.
- **Desired outcome:** after an update restart, the runs that were mid-turn continue by themselves, each told once
  that the application restarted. A run stopped on purpose never resumes.
- **Success:** after an update restart with busy standalone, Team, Org and delegated runs, all of them are working
  again within a bounded time, each has received exactly one notice, and no stopped-on-purpose, archived, deleted,
  Task-closed or idle run was touched.

## Relevant Current And Desired Behavior
| ID | Kind | Current (evidence) | Desired | Preserved |
| --- | --- | --- | --- | --- |
| BEH-001 | Operational | Shutdown records nothing about which runs were mid-turn (283 F-03, F-04) | At the start of every graceful shutdown, before anything is interrupted, the node records the runs that are `initializing` or `running` | 284's shutdown order and bounds; shutdown writes no `terminatedAt` |
| BEH-002 | System | After a restart nothing is restored; the user messages each agent | After an **update** restart (DEC-001 for other restarts) the recorded, eligible runs are restored through their root and continued with one notice | Restore by message (283 F-01) |
| BEH-003 | System | Stopped on purpose (`terminatedAt`), archived, deleted, Task-closed runs are fenced (283 F-03, F-09) | Never resumed | The fences |
| BEH-004 | User | — | The user sees in each resumed run a notice that the application restarted, from the system, not in his name | Run history |

## Scope Guardrail
- In scope:
  - UC-001: record the mid-turn runs at a graceful shutdown;
  - UC-002: resume them automatically after an update restart (desktop and Docker node);
  - UC-003: tell each resumed run once.
- Out of scope:
  - a per-node setting (autobyteus-286);
  - the update click carrying a choice (287);
  - surviving a hard kill or power loss (a later step: the record is written only by a graceful shutdown);
  - the agent-requested restart;
  - cross-node orchestration (each node resumes its own runs, 283 F-13);
  - the delegating node's observation stream reconnect (283 FU-003);
  - Application platform runs (283 F-11);
  - re-running tool calls.
- Preserved: BEH-003; idle runs untouched; restore paths; one broken run never blocks startup (DESIGN rule 7).
- Prerequisites: none (284, 339 and 349 are merged).

## Requirements
| ID | Requirement | BEH | Priority | Feasibility | Source |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | **Record.** At the start of a graceful shutdown, before any run is interrupted, the node saves one record (atomic, in its own app data) of every run that is `initializing` or `running`, of every root kind (standalone, Team member, Org member, delegated copy), with what is needed to restore it through its root | BEH-001 | Must | Read: 284 keeps the point before cleanup free; one registry holds every live run (283 F-06) | 283 REQ-001; G-02 |
| REQ-002 | **Resume after an update restart.** At the next start, if the restart was an update restart (the node now runs a different version), each eligible recorded run is restored through its root (root first, then the run) and continued, automatically, with no confirmation. Restarts that are not updates follow DEC-001 | BEH-002 | Must | **Measured:** after a busy quit, 4/4 root kinds were restored and continued on relaunch (284 API-11; 339 API-04 R2, 41/41) | User 2026-10-30; DEC-001 |
| REQ-003 | **Eligibility.** A recorded run is skipped when, at the next start, it was stopped on purpose (`terminatedAt`), archived, deleted, or fenced by a closed Task, or it already received new input or is already live | BEH-003 | Must | Read: 283 F-03, F-09 | 283 REQ-002, REQ-006 |
| REQ-004 | **Notice.** Each resumed run receives exactly one notice from a system sender: the application restarted at <time> after an update, the previous turn was interrupted, and tool calls that were running have unknown results and must be checked before repeating. A root host whose delegated copies were resumed with it is told which ones | BEH-004 | Must | Read: the skill-update notice precedent (283 F-08) | 283 REQ-003; Task |
| REQ-005 | **Once and bounded.** Each record is handled once: it is marked handled before any resume, so a resume that fails or crashes the server is not retried at the next start. Resumes run at most 3 at a time | BEH-002 | Must | N/A | 283 REQ-004; DEC-002 |
| REQ-006 | **Robust.** An unreadable or partly invalid record is logged and ignored, never blocks startup, and never deletes run data (DESIGN rule 7). A run that fails to resume is logged and left stopped | BEH-002 | Must | N/A | DESIGN rule 7 |

## Acceptance Criteria
| ID | REQ | Trigger | Expected | Verification |
| --- | --- | --- | --- | --- |
| AC-001 | REQ-001 | Graceful shutdown with busy and idle runs of every kind | The record lists exactly the busy ones, written before any interrupt | Unit/integration |
| AC-002 | REQ-002, REQ-004 | An update restart (a different version starts on the same data) with busy standalone, Team, Org and delegated runs | All of them continue by themselves within a bounded time; each received exactly one notice | Real app on isolated data (design picks the version-change method), and a Docker in-place update on a test container |
| AC-003 | REQ-003 | The same, with a run stopped on purpose while busy, an archived run, a Task-closed copy, an idle run, and a run that got a user message first | None of them is resumed or notified | Integration |
| AC-004 | REQ-002 | A restart that is not an update (plain quit and relaunch, Restart server, `docker stop`/start) | Nothing is resumed or notified; the record is discarded (DEC-001 = A) | Integration |
| AC-005 | REQ-005, REQ-006 | A record that is unreadable; a resume that throws; a crash during resume, then a start | Startup continues; nothing is resumed twice | Unit/integration |
| AC-006 | all | Existing suites; 284's and 339's checks | No regression | Unit/integration |

## Decisions
| ID | Question | Options / reasoning | Recommendation | Owner | Status |
| --- | --- | --- | --- | --- | --- |
| DEC-001 | Besides an update restart, which restarts resume automatically? | (A) **only update restarts**; (B) every graceful stop and later start: a plain quit and relaunch, Restart server, `docker stop`/start; (C) updates plus "Restart server" | **A.** It is the user's stated purpose and needs no human. A plain quit is a choice to stop, and an unasked resume the next morning spends money (283's DEC-1 reasoning). "Restart server" is a troubleshooting action. A hard kill or power loss leaves no record in this step anyway. A later per-node setting (286) can widen it | User | **Decided: A** (the user, 2026-11-01) |
| DEC-005 | Application-owned and system-owned runs (Application platform, the Model Router agent) busy at the stop? | Their owners recover them (the Application platform's own recovery, 283 F-11; Model Routing restarts its router run on use) | **Not recorded, not resumed** by this feature | Solution Designer | Decided |
| DEC-002 | Bound when many runs resume | 283 had "ask above 5", which contradicts "no human" | **No asking; at most 3 resumes at a time**, the rest queued | Solution Designer | Decided |
| DEC-003 | Idle runs at the stop | Nothing to continue; a message costs a turn | Not recorded, not resumed (283 DEC-2) | Solution Designer | Decided |
| DEC-004 | Notice wording | Facts from a system sender, not the user's words (283 DEC-7) | As REQ-004 | Solution Designer | Decided |

## Data Continuity
- New data: one small record file per node, consumed at the next start. No change to existing run data; no migration
  (absence means nothing to resume).
