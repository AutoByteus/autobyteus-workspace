# Requirements Document

## Document Status

- Status: `Draft` (SR-003 in progress: the user's goal is adoption; see solution-revision-record SR-003)
- Current solution revision ID: `SR-001`
- Package identifier: `link-existing-run-to-task`
- Request / ticket: Project Task `autobyteus-11`
- Requested by: `/project_task_manager` (relaying the user, 2026-10-18)
- Requirements owner: Solution Designer
- Date: 2026-10-18
- Approved by and reference: `User` — after the six recommendations (DEC-001, 004, 005, 010, 011, 012) were presented, the user answered "continue" (2026-10-18), taken as approval of all six as recommended (stated back to the user)
- Exact approved requirements baseline: SR-001 (this document, 2026-10-18)
- Behavior-defining supplements: None

## Problem And Desired Outcome

- Problem: a Task can get an assignee only through `delegate_task`, which starts a new copy. Work the user started by
  hand (a standalone agent run or a team run) cannot be recorded on the Task created for it later; the board shows the
  Task as unassigned (real case: `autobyteus-10` Work Journal, worked by a hand-started Solution Designer run).
- Desired outcome: link a Task to an existing run, without starting a copy and without sending it work. The link shows
  like an assignment (board card with the worker and its live status, Task page, and from the run back to its Task),
  and the run stays the user's own: closing the Task does not stop it.
- Success: the Work Journal Task shows its Solution Designer run as its worker; closing the Task leaves the run running.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Scenario | Current | Desired | Preserved | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | SCN-001 | No way to name an existing run as a Task's worker | Link it from the Task page; the board, Task page and run show the link | Task fields, keys, depends-on | Task text |
| BEH-002 | System | SCN-002 | — | The Project Task Manager links by tool, by Task key and run id | `delegate_task` modes unchanged | Task text |
| BEH-003 | System | SCN-003 | DONE / CANCELLED stops and fences owned copies | A linked run is not owned: closing the Task ends the link only; the run keeps running and messaging as before | Copies: unchanged | projects.md §DONE |
| BEH-004 | User | SCN-004 | — | Unlink; run deleted; Task reopened behave as DEC-005..007 | — | — |

## Stakeholders, Actors, And Outcomes

| Actor | Goal | Required Outcome | Constraint |
| --- | --- | --- | --- |
| User | Record who works on a Task | Link from the app; see it everywhere; run untouched | No copy, no work sent |
| Project Task Manager | Keep the board true | Link by tool | Only when the tool is selected |
| Delegated copies | — | Unchanged | — |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Scenarios |
| --- | --- | --- |
| UC-001 | Link an existing user-started agent run or team run to a Project Task (app and tool) | SCN-001, SCN-002 |
| UC-002 | Show the link on the board card (worker + live status), the Task page, and from the run to its Task | SCN-001 |
| UC-003 | Close, reopen and unlink a link; a linked run that was deleted | SCN-003, SCN-004 |

### Out Of Scope

- Changing `delegate_task`, copies' ownership, closure, reactivation or messaging scope.
- Linking organization runs, individual team members, or task agents (delegated copies).
- Moving or changing a run's workspace (Task 6fb6e21b owns workspaces of delegated copies).
- Tasks with no Project (ad-hoc Tasks).

### Non-Goals

- Sending work to the linked run, or any automatic status change of the Task.

### Preserved Behavior Boundary

All current assignment, closure, reactivation, messaging and locator behavior of delegated copies (projects.md,
agent_communication.md, Collaboration Model CM-6, CM-7) is unchanged.

### Review Authority

- Blocking findings must cite an approved requirement, AC or preserved behavior.
- New product behavior, policy or migration obligation is a `Requirement Gap` needing the user's approval.

## Requirements

| Requirement ID | Requirement | Behavior | Priority | Rationale | Source |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | The user can link an open Project Task to an existing run they started (a standalone agent run, or a team run, represented by its coordinator) from the app, without starting a copy or sending it anything. | BEH-001 | Must | Task text | the user |
| REQ-002 | An agent with the link tool selected (e.g. the Project Task Manager) can link by Task key or id and run id; Task-owned runs cannot link. | BEH-002 | Must | Task text | DEC-002 |
| REQ-003 | A linked run shows as the Task's worker on the board card (with its live status), on the Task page, and the run shows its Task (the same locator delegated copies use). | BEH-001 | Must | Task text | — |
| REQ-004 | A linked run is not owned by the Task: DONE / CANCELLED close the link only and never stop, fence or hide the run; its messaging and its own delegations are unchanged. | BEH-003 | Must | the user's expectation | DEC-001 |
| REQ-005 | Unlink, reopen and a deleted run behave as decided (DEC-005..007); nothing is stopped or deleted by a link change. | BEH-004 | Must | — | DEC-005..007 |
| REQ-006 | A run has at most one open link at a time; linking a run already linked to another open Task is refused with guidance. | BEH-001 | Must | one current Task per run | DEC-004 |
| REQ-007 | Linking only creates a link (the user's design principle, 2026-10-18): it never moves the run, changes its workspace, or changes where it is shown. A run started by hand stays in its own workspace group in the sidebar; delegated runs stay under the run that delegated them (they inherited its workspace). The link shows on the Task side (board card, Task page) and on the run side the way the Task locator shows it for delegated copies, without moving the row. | — | Must | The user's principle via the Project Task Manager | the user |

## Acceptance Criteria

| AC | Requirements | Scenario | Trigger | Expected | Alternate | Verification |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001, REQ-003 | SCN-001 | User links a hand-started agent run to an open Task from the Task page | Board card and Task page show the run as worker with live status; the run shows the Task; no new run exists; the run received nothing | Task DONE/CANCELLED: refused | Real-app check (isolated instance), then the user's check on Work Journal |
| AC-002 | REQ-001, REQ-003 | SCN-001 | Same with a hand-started team run | Shown with the team's status (the coordinator represents the team) | — | Real-app check |
| AC-003 | REQ-002 | SCN-002 | PTM calls the link tool with Task key and run id | Same result as AC-001; a Task-owned caller is refused | unknown run / Task: clear refusal, nothing changes | Server tests |
| AC-004 | REQ-004 | SCN-003 | Linked Task set DONE, then CANCELLED | Link closed; the run keeps running, receives messages, wakes, delegates as before; board shows the closed link as history | — | Server tests + real-app check |
| AC-005 | REQ-005, REQ-006 | SCN-004 | Unlink; reopen; delete the run; link a run already linked elsewhere | As DEC-005..007; second link refused with guidance | — | Server tests |
| AC-006 | REQ-004 | — | Existing suites for delegated copies | Unchanged results | — | Suites |

## Relevant Scenarios And Journeys

| Scenario | Kind | Actor | Goal | Trigger | Start | Steps | Outcome | Alternate | Validity | Evidence | IDs |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | User | User | Record the worker of a Task | Task page "Link a run" | Hand-started run exists; open Task | pick run → link | Worker shown everywhere | closed Task refused | Supported Normal Scenario | Task text, real case | REQ-001, 003 |
| SCN-002 | System | Project Task Manager | Keep the board true | link tool | same | tool call | same | owned caller refused | Supported Normal Scenario | Task text | REQ-002 |
| SCN-003 | User | User / agent | Close the Task | `update_task` DONE | linked | close | link closed, run untouched | — | Supported Normal Scenario | the user's expectation | REQ-004 |
| SCN-004 | User | User | Correct or end a link | unlink; delete run; reopen | linked | — | as decided | — | Supported Normal Scenario | — | REQ-005, 006 |

## UI, Interaction, And Experience Requirements

- Applicable: `Yes` — Task page link / unlink action and run picker; board card worker; run's Task indicator.
- Product Design: not requested. Entry point decided in DEC-010 (Task page first, the user).

## Data Continuity And Acceptable Loss

- Persisted data affected: `Yes` — new link records in each Task's `agent_run_resources.json`.
- Preserve: every existing entry, unchanged; no migration of existing data.
- Constraint: an older build after links exist may treat that Task's file as unreadable (downgrade not supported, as for earlier record changes).

## External Contracts And Dependencies

| Contract | Constraint | Evidence |
| --- | --- | --- |
| projects.md, collaboration_model.md, agent_communication.md | copies unchanged; links documented | repo docs |
| DESIGN.md rules 1–8 | e.g. rule 7 for a deleted run | repo |

## Assumptions

| ID | Assumption | Status |
| --- | --- | --- |
| ASM-001 | The run that worked on Work Journal still exists in history | to verify at the user's check |

## Decisions

| Decision | Question | Why It Matters | Options / Evidence | Reasoning And Recommendation | Owner | Status |
| --- | --- | --- | --- | --- | --- | --- |
| DEC-001 | What does a link mean? | Today a Task **owns** its copies: closing stops and fences them, limits their messaging, owns their sub-work | (a) linked, not owned; (b) linked = owned like a copy | (b) would let a Task close stop and lock your own run. **(a)**: a link is a record that this run works on this Task — visibility only | the user | Decided as recommended (the user, 2026-10-18) |
| DEC-002 | Who may link? | Authority | user; agents with a link tool; any agent | The user in the app, and agents whose definition selects a new link tool (the Project Task Manager). Task-owned workers cannot link, as they cannot assign today. | Solution Designer | Decided |
| DEC-003 | Which runs can be linked? | Scope | standalone agent runs; team runs (by coordinator); org runs; team members; task agents | Runs the user started: standalone agent runs and team runs (the team shown as one worker, like a delegated team). Not task agents (they use `delegate_task` follow-ups), not individual team members, not org runs (could be a follow-up). | Solution Designer | Decided |
| DEC-004 | Can a run be linked to several Tasks? | One current Task per run, like copies | one open link at a time; many | **One open link at a time**; linking it elsewhere is refused until it is unlinked or its Task closes. A Task may have its link and copies' assignments side by side; its board worker is the latest one. | the user | Decided as recommended (the user, 2026-10-18) |
| DEC-005 | DONE / CANCELLED and reopen | — | — | Closing the Task closes the link and touches nothing else. Reopening does not re-link automatically; link again if wanted (a new period, history kept). | the user | Decided as recommended (the user, 2026-10-18) |
| DEC-006 | Unlink | Mistakes and hand-overs | remove; close | The user or the linking agent can unlink: the link closes, nothing is stopped, the closed link stays in the Task's history. | Solution Designer | Decided |
| DEC-007 | The linked run is deleted | Rule 7 | — | The Task keeps the record and shows the worker as no longer available; the Task is never blocked. | Solution Designer | Decided |
| DEC-008 | `delegate_task` to a linked run | Assignment model | allow; refuse | Refused: `delegate_task` gives work to copies; a linked run gets its work from the user. Messaging it works as before. | Solution Designer | Decided |
| DEC-009 | Workspace | 6fb6e21b | — | Unchanged by linking. | Solution Designer | Decided |
| DEC-010 | Where does the user link in the app? | Visible UX | Task page "Link a run" (pick from recent runs); from the run ("Link to Task"); both | **Task page first** (the Task is where you notice it is unassigned); the run shows its linked Task. A run-side action can follow later. | the user | Decided as recommended (the user, 2026-10-18) |
| DEC-011 | Does a linked run's sidebar row carry the Task summary line? | Visible UX; the run side of REQ-003 | Delegated copies' rows show a clickable Task summary line under the name (`TaskWorkerTaskSummary.vue`, delegated-copy-task-locator): click shows the Task in Projects, never opens or moves the row | **Yes, the same line** under a linked run's row (agent or team), in its own workspace group; nothing else about the row changes. Without it, the run side would show the link nowhere in the sidebar. | the user | Decided as recommended (the user, 2026-10-18) |
| DEC-012 | Where does a linked run started in the **same** workspace as the Project Task Manager show? | Visible UX; the user's first instinct was "under the PM" | Today (web `runHistoryNavigationProjection.ts`, `AgentRunTaskRows.vue`): workspace → agent definition group → run; workspace → team definition group → team run. Rows nest under a run only when they are that run's delegated runs (its collaboration tree), and nested rows use that run as their stop root. A run the user started stays in its definition group, whatever workspace. (a) stay in its own group + Task summary line; (b) nest under the PM run; (c) both (a reference row under the PM) | **(a)**: nesting means "started and coordinated by that run" (its Stop, idle and wake would look like the PM's); a link has no parent run when the user links from the Task page; one rule for every workspace; the link already shows on the board, the Task page and the run's Task line. | the user | Decided as recommended (the user, 2026-10-18) |

## Traceability

| Requirement | Use Cases | Behaviors | ACs | Scenarios |
| --- | --- | --- | --- | --- |
| REQ-001 | UC-001 | BEH-001 | AC-001, AC-002 | SCN-001 |
| REQ-002 | UC-001 | BEH-002 | AC-003 | SCN-002 |
| REQ-003 | UC-002 | BEH-001 | AC-001, AC-002 | SCN-001 |
| REQ-004 | UC-003 | BEH-003 | AC-004, AC-006 | SCN-003 |
| REQ-005 | UC-003 | BEH-004 | AC-005 | SCN-004 |
| REQ-006 | UC-001 | BEH-001 | AC-005 | SCN-004 |
| REQ-007 | UC-001 | — | — | — |

## Architecture Phase Input

- Verify: live status source for a user-started run (U-001); run picker source (U-002); record shape in
  `agent_run_resources.json` and the Task root / locator rules with links; the link tool's contract.
- Constraints: copies unchanged; no migration; DESIGN.md rules 7 and 8.

## Readiness Check

- Content ready for approval: `Yes`.
- Approved basis ready for design: `Yes`.
