# Requirements Document — A task agent with several Tasks

## Document Status

- Status: `Approved` (SR-003)
- Current solution revision ID: `SR-003`
- Package identifier: `task-agent-several-tasks`
- Request / ticket: Project Task `autobyteus-275`, 2026-10-23, with the user's decision in its comment (option B, general).
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), for the user.
- Requirements owner: Solution Designer
- Date: 2026-10-23
- Approved by and reference: `User`, 2026-10-23, in the Solution Designer's conversation. Direction: option B (Task comment). DEC-001 and DEC-002 come from the user's answer: "we don't add the task ID to send message. They are two different things … the dedicator want to delegate a new task to the same agent team … just supply this agent team ID … we want to let the agent do their work … the reference is decreased … when there are no more tasks on the active team … then the team resources are just cleaned". DEC-003 and DEC-004 (no new UI; this smallest version first) are decided by the Solution Designer within that direction, the user informed in the same conversation.
- Exact approved requirements baseline: this document at `SR-003`.
- Behavior-defining supplements: none.
- Done when (the Task, verbatim): "A part can be delegated to its parent's copy (or the chosen model works) with the full description as the first message and a visible link in the app; closing a part does not stop a copy that has other open work; tests; docs; the user's check; finalized on personal. No release unless he asks."

## Problem And Desired Outcome

- Problem: a task agent (Agent or Team copy) can hold only one open Task. `delegate_task` refuses to give it another while one is open, even TODO: "This task agent still works on Task autobyteus-204 (TODO). Set it to DONE or CANCELLED first …". So:
  - parts and follow-ups reach a copy by message, without their description as a first message and without the Task showing the team;
  - closing such a Task stops nothing;
  - a new copy loses the context the user wants kept.
- Desired outcome (the user's option B): a copy may work on several Tasks at once, given to it by `delegate_task` like its first Task. This covers both a task agent (Agent copy) and a task agent team (Team copy). The delegator alone decides when to give another Task and when to close one; nothing requires closing the earlier Task first (the user, 2026-10-23: "not just a team … it's completely managed by the dedicator itself … currently the dedicated has to close the original task first … it's not so convenient"). Each Task shows the copy; the copy is freed only when its last Task is DONE or CANCELLED.
- Observable success: `autobyteus-280` can be given to the copy that still holds `autobyteus-204`; it arrives with its description as a message and shows the team in the app; closing either Task leaves the copy running while the other is open; closing the last stops it.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Scenarios | Current | Desired | Preserved | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | Contract | SCN-001, SCN-002 | `delegate_task task_id` + `target_*_run_id` is refused while the copy has an open Task | Allowed while the copy has other open Tasks | Every other refusal (not its latest assigner; already has this Task open; never started; sub-work copy; peer-node copy) | INV source log |
| BEH-002 | System | SCN-003 | Closing a Task stops the copies whose current Task it is | Closing a Task ends that Task's assignment of the copy; the copy is stopped only when it has no open Task left | Sub-work joined to the closed Task stops with it | INV |
| BEH-003 | User | SCN-001 | A Task given by message shows no team | Each Task given by `delegate_task` shows the copy (as today for a first Task) | — | INV |
| BEH-004 | Contract | SCN-001 | The given-Task message says "Your previous Task is closed; this is the work to do now." | It names the copy's other open Tasks and asks to name the Task key in reports | Description, comments and reference files as today | INV |
| BEH-005 | System | SCN-004 | Closing a parent closes its open parts | Unchanged; a copy holding the parent and its parts stops when the last of them closes | — | INV |

## Stakeholders, Actors, And Outcomes

| Actor | Goal | Outcome |
| --- | --- | --- |
| User | Same team continues related and follow-up work; see who works on what | Every Task shows its team; no "team looks stopped" |
| Project Task Manager | Give the next Task to a busy team without message hops | `delegate_task` works; it tells reports apart by Task key |
| Task agents | Receive each Task's full brief | The Task's description as a message, noting the other open Tasks |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Scenarios |
| --- | --- | --- |
| UC-001 | Give an existing task agent another Project Task while it has open ones | SCN-001, SCN-002 |
| UC-002 | Closing one of a task agent's Tasks keeps it running while others are open; the last stops it | SCN-003, SCN-004 |
| UC-003 | Reports name the Task they are about (DEC-001) | SCN-005 |

### Out Of Scope

- A per-Task "working / waiting" state in the app, and showing several Tasks on one worker row in the Workspaces tree (follow-ups, DEC-003).
- A system queue of Tasks per worker (DEC-002).
- Any change to `send_message_to` (DEC-001, the user).
- Description-only delegation (it still creates a new task agent and a Temp task).
- Peer-node task agents (a saved Task is never given to a peer node's run, unchanged).
- Removing empty fields from tool results (`autobyteus-260`).

### Non-Goals

- No limit on how many Tasks one task agent holds.

### Preserved Behavior Boundary

- All other `delegate_task` refusals and texts; closure, reopen and idle-shutdown rules for a task agent with one Task; the parent → open parts cascade; `part_of` one level; Temp tasks.

### Prerequisites

None.

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID that it protects.
- A finding that would introduce new product behavior, policy, threat model, migration obligation, compatibility promise, or operational contract is a `Requirement Gap`; it requires explicit user approval before becoming authoritative.
- An adjacent concern outside the approved boundary may be recorded as a non-blocking risk, recommendation, or follow-up. It is not a required design correction, unless it is a prerequisite (Prerequisites above).
- A downstream reviewer comment does not amend this requirements basis. The Solution Designer must update the canonical requirements and obtain renewed user approval before a scope-changing proposal can govern design or implementation.

## Requirements

| REQ | Requirement | BEH | Priority | Decision |
| --- | --- | --- | --- | --- |
| REQ-001 | `delegate_task` with `task_id` and a task agent's run id gives that Project Task to the existing task agent also while the task agent has other open Tasks, when the caller made the task agent's most recent assignment. All other refusals stay. | BEH-001 | Must | User (option B); DEC-005 |
| REQ-002 | The task agent receives the given Task's description (and comments, and reference files) as a message, as today. The message says it is in addition to its open Tasks, by key, and asks it to name the Task key in each report. When it has no other open Task, the text is as today. | BEH-004 | Must | DEC-001 |
| REQ-003 | Each Task given this way records the task agent as its assignment, so the app and `list_project_tasks` show the team for that Task. | BEH-003 | Must | — |
| REQ-004 | Closing a Task (DONE or CANCELLED) ends that Task's assignment of the task agent. The task agent is stopped only when no assignment of it is still open. Sub-work started under the closed Task stops with it. | BEH-002 | Must | User (option B) |
| REQ-005 | Closing a parent still closes its open parts (one call); a task agent holding the parent and parts stops when the last of its open Tasks closes. | BEH-005 | Must | — |
| REQ-006 | When a task agent holding several open Tasks starts sub-work (a description-only `delegate_task`), the sub-work belongs to its most recently given open Task. | — | Must | DEC-007 |
| REQ-007 | A closed Task can be given back to a task agent that is still running with `delegate_task task_id` (same rules as REQ-001). | — | Should | DEC-008 |
| REQ-008 | Tool texts (`update_task`, `delegate_task`) and the collaboration model (CM-6) describe the new rule. | — | Must | DEC-009 |
| REQ-009 | No data change or conversion; no version-compatibility code. | — | Must | DEC-011 |

## Acceptance Criteria

| AC | REQ | Trigger | Expected | Alternate / Failure | Verification |
| --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001–003 | Copy holds open `autobyteus-204` (TODO); its assigner calls `delegate_task task_id="autobyteus-280" target_team_run_id=<copy>` | Accepted; the coordinator receives 280's description in a message naming 204 as still open and asking for Task keys in reports; 280 shows the team; 204 still shows it | Another agent than the latest assigner → refused as today; 280 already open on this copy → refused as today | Server unit + E2E (scripted runtime) |
| AC-002 | REQ-001, REQ-005 | Parent `autobyteus-25` assigned to the copy; then part `autobyteus-261` to the same copy | Accepted (the reported case) | — | Server unit + E2E |
| AC-003 | REQ-004 | Copy holds 204 and 280; set 280 DONE | The copy keeps running (not stopped, not fenced) and still accepts 204's messages; 280's assignment closed | — | Server unit + E2E |
| AC-004 | REQ-004 | Then set 204 DONE | The copy is stopped as today | — | Server unit + E2E |
| AC-005 | REQ-005 | Parent and two parts on the copy; set the parent CANCELLED | All three close; the copy is stopped once, after the last | — | Server unit |
| AC-006 | REQ-006 | Copy with 204 then 280 open starts sub-work | The sub-work belongs to 280; closing 280 stops it while the copy runs on | — | Server unit |
| AC-007 | REQ-007 | 204 DONE while 280 open; `delegate_task task_id="autobyteus-204"` to the copy | Accepted; 204 open again on the copy | — | Server unit |
| AC-008 | REQ-002 | A copy with no other open Task is given a Task | The message text is as today | — | Server unit |
| AC-009 | REQ-009 | Existing data | Unchanged behavior for copies with one Task | — | Server unit; isolated instance |
| AC-010 | All | Isolated Electron instance with test data | The journeys work in the real app, with evidence | — | Isolated desktop instance |

## Relevant Scenarios And Journeys

| Scenario | Actor | Goal | Trigger | Outcome | Validity | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | Project Task Manager | Give a follow-up to the busy team | `delegate_task task_id` | Accepted, visible, brief delivered | Supported Normal | 280 / 204 (Task comment) |
| SCN-002 | Project Task Manager | Give a part to the parent's team | same | same | Supported Normal | 25 / 261 (Task text) |
| SCN-003 | Project Task Manager | Close one finished Task | `update_task status` | The team keeps working on the rest | Supported Normal | User: "Only when the LAST Task is closed is the team freed" |
| SCN-004 | Project Task Manager | Close a parent | `update_task status` | Parts close; the team stops after the last | Supported Normal | REQ-016 of task-part-of |
| SCN-005 | Task agent | Report on one of its Tasks | `send_message_to` | The report names the Task key | Supported Normal (per DEC-001) | Task comment |

## UI, Interaction, And Experience Requirements

- Applicable: `Yes`, no new UI (DEC-003). Each Task's existing "Assigned to" shows the team.
- Product decisions that need the user: DEC-003.

## Quality And Non-Functional Requirements

| ID | Area | Requirement |
| --- | --- | --- |
| QR-001 | Reliability | No task agent is stopped while one of its Tasks is open; none is left running after its last Task closes (except by later messages, which wake it as today) |
| QR-002 | Integrity | Concurrent closure of two of a copy's Tasks never stops it while a third is open, and stops it once when the last closes |

## Data Continuity And Acceptable Loss

- Persisted data affected: `No` format change (per-Task `agent_run_resources.json` already holds one entry per assignment period).
- Acceptable: after a rollback, an older build sees a copy with two open entries as damaged data for that copy (it logs a conflict and uses the newest); nothing is engineered for rollback.

## External Contracts And Dependencies

| Contract | Change |
| --- | --- |
| `delegate_task` (saved-Task mode to an existing copy) | Accepted while the copy has open Tasks; message text |
| `update_task` description | "stops a task agent when this was its last open Task" |
| Collaboration model CM-6 | One or more open Tasks per delegated run |

## Assumptions

| ID | Assumption | Status |
| --- | --- | --- |
| ASM-001 | The worker conversation can carry several Tasks; the agent decides order with its assigner | Accepted per DEC-002 |

## Decisions

| ID | Question | Why It Matters | Options | Reasoning And Recommendation | Owner | Status |
| --- | --- | --- | --- | --- | --- | --- |
| DEC-001 | How is a report tied to its Task? | With several Tasks, the sender run id no longer names one Task | (a) the given Task's message names the other open Task keys, so the worker can say which Task it reports on; (b) `send_message_to` gets a `task_id` | The user: "we don't add the task ID to send message. They are two different things." Decided: (a); `send_message_to` unchanged. | User | Decided |
| DEC-002 | One current Task with the others queued? | Mixed work in one conversation | No system queue; a queue | The user: "we want to let the agent do their work"; the delegator decides when a Task is done. Decided: no queue. | User | Decided |
| DEC-003 | What the app shows | "The team looked stopped" | No new UI; later displays | Each Task given by `delegate_task` shows its team in the existing "Assigned to"; nothing else now. Follow-up possible (several Tasks on one tree row; working / waiting). | Solution Designer (user informed 2026-10-23) | Decided |
| DEC-004 | Staging | Smallest safe version first | Stage 1 now | Stage 1 = this document (a part to its parent's team is included). Nothing else is planned unless the user asks. | Solution Designer (user informed 2026-10-23) | Decided |
| DEC-005 | Who may give an extra Task | Control | The copy's most recent assigner (today's rule) | Keep. | Solution Designer | Decided |
| DEC-006 | Limit on the number of open Tasks | — | — | None. | Solution Designer | Decided |
| DEC-007 | Which Task sub-work joins | Helpers need one owning Task | The newest open Task (today's "current" rule) | Keep; documented. | Solution Designer | Decided |
| DEC-008 | Giving a closed Task back to a running copy | Reopen today works only for a closed copy | `delegate_task task_id` | Allowed by REQ-001; documented in the tool text. | Solution Designer | Decided |
| DEC-009 | Docs and texts | — | — | CM-6, `update_task`, `delegate_task`, the given-Task message. | Solution Designer | Decided |
| DEC-010 | Temp tasks and description-only delegation | — | — | Unchanged. | Solution Designer | Decided |
| DEC-011 | Data and versions | — | — | No change; no compatibility code (DESIGN.md rule 9). | Solution Designer | Decided |
| DEC-012 | `autobyteus-260` | One contract change | — | No new result fields here. | Solution Designer | Decided |

## Traceability

| REQ | UC | AC | SCN |
| --- | --- | --- | --- |
| REQ-001 | UC-001 | AC-001, AC-002, AC-007 | SCN-001, SCN-002 |
| REQ-002 | UC-001, UC-003 | AC-001, AC-008 | SCN-001, SCN-005 |
| REQ-003 | UC-001 | AC-001 | SCN-001 |
| REQ-004 | UC-002 | AC-003, AC-004 | SCN-003 |
| REQ-005 | UC-002 | AC-005 | SCN-004 |
| REQ-006 | UC-001 | AC-006 | — |
| REQ-007 | UC-001 | AC-007 | — |
| REQ-008 | — | — | — |
| REQ-009 | — | AC-009 | — |

## Architecture Phase Input

- Verify by running the existing task-execution tests and a probe: two open entries per copy through `deriveCurrent`, `releasableByHostRoot`, `ownerOf`, idle shutdown and wake.
- Check every other place that assumes one open entry per copy, beyond the resource service (the lifecycle, the run-history tree, reactivation texts).

## Readiness Check

- Content ready for approval: `Yes`; remaining: none.
- Approved basis ready for design: `Yes` (SR-003).
