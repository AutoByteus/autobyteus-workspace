# Requirements Document

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-008`
- Package identifier: `link-existing-run-to-task`
- Request / ticket: Project Task `autobyteus-11`
- Requested by: `/project_task_manager` (relaying the user, 2026-10-18)
- Requirements owner: Solution Designer
- Date: 2026-10-18
- Approved by and reference: `User`, 2026-10-18 — adoption confirmed ("after adopting … the lifecycle will be bounded to the task itself. Of course, that's actually what we want"); DEC-101, 102, 105 in the user's words; DEC-103 taken as confirmed with that answer (stated back to the user). DEC-107 by the Solution Designer within the direction, user informed.
- Exact approved requirements baseline: SR-003 (this document, 2026-10-18)
- Behavior-defining supplements: None
- History: SR-001 (approved 2026-10-18) defined a visibility-only link; kept for reference in
  `superseded-requirements-link-only.md` / `superseded-design-link-only.md`. The user then explained the real goal
  (SR-003): the PM should be able to give a Task to a run the user started by hand, so that run joins the Task's
  lifecycle as if the PM had delegated it — shown under the PM, closed and gone when the Task is done.

## Problem And Desired Outcome

- Problem: before Tasks existed the user started agent and team runs by hand (e.g. 411 Software Engineering Team runs in
  the superrepo workspace, the PM's workspace; read-only data check 2026-10-18). Work on a Task can only be given to a new
  copy (`delegate_task`) or to the delegator's own earlier delegated runs. A hand-started run that is already doing the
  work cannot be given the Task; it stays outside the Task's lifecycle and the user cleans it up by hand.
- Desired outcome: the PM (any agent allowed to delegate a Task) gives a Task to an existing hand-started run in its own
  workspace with `delegate_task`, by run id. From then on that run is the PM's delegated run for that Task, exactly like
  one the PM started: shown under the PM with its Task line, slept / woken by the PM, stopped and removed from the
  sidebar when the Task is DONE or CANCELLED, reactivated by the PM after reopening.
- Success: the user asks the PM to give `autobyteus-10` (Work Journal) to the existing run working on it; it appears
  under the PM with the Task line; closing the Task stops it and it leaves the sidebar.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Scenario | Current | Desired | Preserved | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | SCN-001 | `delegate_task {target_*_run_id, task_id}` works only for the delegator's own earlier delegated runs whose current Task is DONE / CANCELLED | Also accepts a hand-started run in the delegator's workspace that belongs to no Task and is idle; it becomes the delegator's delegated run for that Task and receives the Task as its next work, continuing its conversation | All current `delegate_task` modes and checks | projects.md §Follow-up Task to an existing copy |
| BEH-002 | User | SCN-002 | the run shows in its own group (e.g. TEAMS) | it shows under the PM with its Task line, like any delegated run; its own-group row is gone | the run's files and conversation | sidebar tree (`AgentRunTaskRows.vue`); the user's screenshot |
| BEH-003 | System | SCN-003 | — | lifecycle as any delegated run: idle shutdown and wake by the PM; DONE / CANCELLED stops it and it leaves the sidebar; reactivation by the PM after reopening; Task rules (sub-work, messaging scope) apply | copies unchanged | projects.md §DONE, §Reactivation; CM-6, CM-7 |
| BEH-004 | — | — | Withdrawn (SR-005) | — | — | — |

## Stakeholders, Actors, And Outcomes

| Actor | Goal | Outcome | Constraint |
| --- | --- | --- | --- |
| User | Bring a hand-started run into a Task's lifecycle | Ask the PM; the run moves under the PM and closes with the Task | Only the runs the PM is asked to take |
| PM | Manage the Task's worker | Delegate the Task to the existing run | Same workspace; run idle; run belongs to no Task |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Scenarios |
| --- | --- | --- |
| UC-001 | Delegate a Project Task to an existing hand-started agent run or team run in the delegator's workspace (adoption) | SCN-001 |
| UC-002 | The adopted run is shown, coordinated and closed exactly like a delegated run | SCN-002, SCN-003 |
| UC-003 | Withdrawn (SR-005) | — |

### Out Of Scope

- Runs in another workspace (follow-up after Task 6fb6e21b, delegated runs with their own workspace).
- A visibility-only link (SR-001's model) and any Task-page or run-side UI action for it.
- Organization runs, individual team members, runs owned by a Task, runs that are part of another run.
- Adopting in the middle of a running turn.
- Changes to new-copy delegation or to copies' lifecycle.

### Non-Goals

- Bulk adoption of old runs (the PM decides one run at a time).

### Preserved Behavior Boundary

Every current `delegate_task` mode, copy lifecycle, closure, reactivation and messaging rule, and the sidebar for runs
that are not adopted, stay unchanged.

### Review Authority

Standard: blocking findings cite an approved requirement or AC; new behavior is a Requirement Gap.

## Requirements

| Requirement ID | Requirement | Behavior | Priority | Rationale | Source |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | `delegate_task {target_agent_run_id \| target_team_run_id, task_id}` accepts a run the user started by hand when: it is in the delegator's workspace, belongs to no Task, is not part of another run, and is idle; the delegator may delegate a Task (not Task-owned); the Task is an open Project Task. | BEH-001 | Must | the user, 2026-10-18: "the PM … call the delegate task to … one existing agent team run" | the user |
| REQ-002 | On success the run becomes the delegator's delegated run for that Task: recorded as the Task's assignment by the delegator, and the run receives the Task as its next work, continuing its own conversation (as a follow-up Task to an existing copy does). | BEH-001 | Must | same | the user |
| REQ-003 | From then on the run is shown, coordinated and closed exactly like a run the delegator started: under the delegator in the sidebar with its Task line (no longer in its own group), idle shutdown / wake by the delegator, stopped and removed from the sidebar on DONE / CANCELLED, reactivated by the delegator after reopening; Task rules apply. | BEH-002, BEH-003 | Must | the user's purpose: lifecycle bound to the Task | the user |
| REQ-004 | Adoption keeps every file and the whole conversation of the run; nothing is copied or deleted. | BEH-002 | Must | data continuity | — |
| REQ-005 | Refusals change nothing and tell the delegator why: another workspace; already owned by a Task or part of another run; running a turn (try again when idle); an organization run or a team member; a closed or ad-hoc Task; a Task-owned delegator; a run bound to an application; an archived run; a run whose definition is no longer in the catalog. | BEH-001 | Must | — | — |
| REQ-007 | A run that has delegated runs of its own is refused with a clear reason (DEC-107). | BEH-001 | Must | keep this ticket to the common case | DEC-107 |
| DEC-108 | Which delegators can adopt? | The user's flow is the PM, a standalone agent run. Team members and organization agents as delegators would add hosting cases; later. | Solution Designer | Decided (user informed) |
| DEC-109 | A partial adoption (stopped halfway) | Every step is recognized from the files; the same delegator repeating `delegate_task` finishes it; nothing is lost meanwhile. | Solution Designer | Decided (user informed) |
| REQ-006 | Withdrawn (SR-005): no list tool; the user gives the PM the run id, or the PM finds it itself (the user, 2026-10-18). | — | — | — | the user |

## Acceptance Criteria

| AC | Requirements | Scenario | Trigger | Expected | Alternate | Verification |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001..004 | SCN-001..003 | PM delegates an open Task to an idle hand-started team run in its workspace | The team receives the Task in its conversation; sidebar shows it under the PM with the Task line, not under TEAMS; board shows it as the worker with live status; all its files and messages kept | — | Server tests + real-app check (isolated instance, test data) |
| AC-002 | REQ-001..004 | same | Same with a hand-started agent run | Same | — | same |
| AC-003 | REQ-003 | SCN-003 | Task set DONE, then reopened and the PM messages the run | Stopped and removed from the sidebar on DONE; reactivated by the PM's message after reopening | — | Server tests + real-app check |
| AC-004 | REQ-005 | SCN-001 | Each refusal case | Clear refusal; nothing changes | — | Server tests |
| AC-005 | REQ-006 | — | Withdrawn (SR-005) | — | — | — |
| AC-006 | — | — | Existing suites | Copies' behavior unchanged | — | Suites |
| AC-007 | all | — | The user's check | The user asks the PM to give `autobyteus-10` to the run working on it | — | Beta + the user's check |

## Relevant Scenarios And Journeys

| Scenario | Kind | Actor | Goal | Trigger | Start | Steps | Outcome | Validity |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | System | PM | Give a Task to an existing run | `delegate_task` by run id | idle hand-started run in the PM's workspace | refusal checks → record → deliver Task | run is the PM's delegated run | Supported Normal Scenario (the user, 2026-10-18) |
| SCN-002 | User | User | See it under the PM | sidebar | adopted | — | under the PM with Task line | Supported Normal Scenario |
| SCN-003 | System | PM / user | Task lifecycle | DONE / reopen | adopted | — | stopped and gone / reactivated | Supported Normal Scenario |
| SCN-004 | Withdrawn (SR-005) | | | | | | | |

## UI, Interaction, And Experience Requirements

- Applicable: `Yes` — no new UI control; the existing delegated-run display (under the PM, Task line, board worker)
  applies to adopted runs. Product Design: N/A.

## Data Continuity And Acceptable Loss

- Persisted data affected: `Yes` — the adopted run's own file gains the task-agent section (as for any delegated run),
  the delegator's tree gains a link, the Task's `agent_run_resources.json` an `assigned` entry.
- Preserve: every file of the run (no move, no copy), its conversation and messages.
- Acceptable: the run leaves its own group in the sidebar (shown under the PM instead) — intended.
- Downgrade after adoption: an older build no longer lists the run in its own group (like any task agent); nothing lost.

## External Contracts And Dependencies

| Contract | Constraint |
| --- | --- |
| `delegate_task` tool contract | new eligibility for existing runs; refusal messages |
| Collaboration Model CM-5..CM-8, projects.md, memory layout contract (task agent own files) | adopted run = ordinary delegated run |
| Task 6fb6e21b | other workspaces later |

## Decisions

| Decision | Question | Reasoning And Recommendation | Owner | Status |
| --- | --- | --- | --- | --- |
| DEC-101 | Link or adopt? | The user's purpose is lifecycle and cleanup: adopt (the run becomes the PM's delegated run). | the user | Decided (the user, 2026-10-18) |
| DEC-102 | Who adopts, and how? | The delegator, with `delegate_task` by run id (no new tool); the PM decides. | the user | Decided (the user: "the PM decided … call the delegate task to … one existing agent team run") |
| DEC-103 | Does the run receive the Task? | Yes, as with any `delegate_task`: it continues its conversation with the Task as its next work. | the user | Decided (the user, 2026-10-18) |
| DEC-107 | A run that has delegated runs of its own? | Read-only data: 10 of 411 hand-started team runs and 3 of 25 agent runs in the PM's workspace have their own delegated runs. Adopting them would also re-parent those runs to the PM (CM-7). Refuse them in this ticket with a clear reason; follow-up. | Solution Designer | Decided (user informed) |
| DEC-104 | Only when idle? | Handing a live run from its own session to the PM's run mid-turn risks losing the turn; refuse while running, retry when idle. | Solution Designer | Decided |
| DEC-105 | Other workspaces? | A run in another workspace stays in its own group and cannot be adopted now (`delegate_task` refuses: another workspace); only runs sharing the PM's workspace ever appear under it, which keeps the sidebar consistent. Adopting across workspaces belongs with Task 6fb6e21b (follow-up). | the user | Decided (the user, 2026-10-18: "for the ones which has a different workspace … we still leave it there … if we bring it back, it will be a little bit inconsistent on the UI") |
| DEC-106 | How does the PM find the run? | The user: no new tool — "the user will just tell it" or the PM finds the team run id itself, then calls `delegate_task` directly. | the user | Decided (the user, 2026-10-18) |

## Traceability

| Requirement | Use Cases | Behaviors | ACs |
| --- | --- | --- | --- |
| REQ-001, REQ-002 | UC-001 | BEH-001 | AC-001, AC-002 |
| REQ-003 | UC-002 | BEH-002, BEH-003 | AC-001..AC-003 |
| REQ-004 | UC-002 | BEH-002 | AC-001 |
| REQ-005 | UC-001 | BEH-001 | AC-004 |
| REQ-006 | — | — | — (withdrawn) |

## Architecture Phase Input

- Verify: handing an idle standalone root (agent run / team run) over to the delegator's root; writing the task-agent
  section and link with the memory-refactor stores; the "idle" check; the list tool's data source (history index rows).

## Readiness Check

- Content ready for approval: `Yes`. Approved basis ready for design: `Yes`.
