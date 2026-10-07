# Requirements Document

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-002`
- Package identifier: `reactivate-done-task-runs`
- Request / ticket: Let the run that handed out a Task wake the Task's agent or team again after the Task was DONE and the agent reopened it, by messaging the run ID `delegate_task` returned (user conversation, 2026-10-07)
- Requirements owner: Solution Designer
- Date: 2026-10-07
- Approval state and reference:
  - SR-001 was approved 2026-10-07 ("Go ahead. You don't need my approval…").
  - SR-002 changes it at the user's direction (2026-10-07):
    - "the agent which… marks the task as done, it should continue to open the task. It's the agent who should do that. It's not our software. Otherwise, our software turns it to do and then the agent is not aware of it."
    - "the task status is the agent responsibility. They will first mark as to do, or move it in progress, and then start to send a message again."
    - "Yes, the flow is as you understand."
    - "no automatic status change because if you silently change the status, the agent is not aware of it and this stays intransparent for the user. I think it's clear now."
  - The confirmed flow is the Solution Designer's restatement (DONE → the agent sets TODO/IN_PROGRESS → the agent messages the worker's run ID → the worker comes back and its rows reappear; messaging while DONE is refused with a hint). The worker comes back on the message (DEC-004 option A, the confirmed flow's step 4).
  - Live row reappearance (REQ-008) is unchanged from SR-001 and keeps its approval; the user did not choose the reduced-scope option.
- Exact approved requirements baseline / solution revision: SR-002 (BEH-001..008, REQ-001..011, AC-001..015, SCN-001..005, DEC-001..004)
- Behavior-defining supplements and their approved versions: None

## Problem And Desired Outcome

- Problem: Marking a Task DONE closes its delegated copies for good. A closed run "can never receive new input, be woken or be restored" (`autobyteus-server-ts/docs/modules/projects.md`, DONE §3). Reopening the Task's status starts nothing and does not reopen old runs. Real work is iterative: a design comes back for another round, a reviewer finds a gap. The delegator must then start a new copy that has lost the whole conversation. Evidence: on 2026-10-07 the Solution Designer could not continue with the Product Team after setting its ad hoc Task DONE.
- Affected actors or systems: Delegating agents (Project Task Manager, Solution Designer, Team coordinators, any agent using `delegate_task`); delegated agent/team copies; the user watching the run tree and the Projects pages.
- Desired outcome: Task status stays entirely the agent's responsibility. After DONE:
  1. The agent itself moves the Task back to TODO or IN_PROGRESS.
  2. It then messages the worker's run ID (`delegate_task`'s result; for a team, the coordinator).
  3. The software restores that worker with its conversation, delivers the message and shows its rows again.

  The software never changes the Task status on its own. A later DONE closes the worker again exactly as today.
- Observable definition of success: The sequence `create_or_update_task(DONE)` → `create_or_update_task(IN_PROGRESS)` → `send_message_to(target_agent_run_id=<returned run ID>)` from the assigning run is accepted, and the worker answers with its earlier conversation. The Task status is exactly what the agent set. The worker's rows are visible again, live and after reload or restart.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Related Scenario IDs | Evidence-Backed Current Behavior | Desired Behavior | Intentionally Preserved Behavior | Investigation Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | Contract | SCN-001, SCN-002 | `send_message_to` by run ID to a run whose Task entry is closed is refused `TASK_AGENT_RESOURCE_CLOSED`, whatever the Task status | When the Task is not DONE, the sender is the run that assigned the work, and the target is that assignment's run ID, the assignment is reactivated and the message is delivered | Messages to open or offline workers wake them exactly as today | investigation-notes Source Log |
| BEH-002 | Contract | SCN-001, SCN-004 | Task status changes only by explicit `create_or_update_task`; setting TODO/IN_PROGRESS reopens no runs | **Unchanged:** only the agent changes status; a status change alone still reopens and starts nothing. A reactivation never changes status. While the Task is DONE, a message to its closed worker is refused, with a hint to move the Task to TODO or IN_PROGRESS first. | Status rules | User 2026-10-07 |
| BEH-003 | User | SCN-003 | Closed workers leave the run tree live (`TASK_EXECUTIONS_CLOSED`) and stay hidden after reload/restart (`closed_task_executions`) | A reactivated worker reappears live and stays visible after reload/restart, in standalone, Team and Org roots | Other closed workers stay hidden | agent_teams.md; run-history services |
| BEH-004 | Contract | SCN-002 | A team copy is closed as one assigned entry; its members are owned through it | Reactivating a team assignment restores the whole team; the message goes to its coordinator | Team member restore follows the existing wake/restore path | task-agent-resources.ts |
| BEH-005 | Contract | SCN-004 | Helpers a worker started (`delegated` / `broughtIn`) close with the Task | They stay closed; the reactivated worker may start new helpers | — | DEC-001 |
| BEH-006 | Contract | SCN-004 | Any sender to a closed run is refused | Senders other than the assigning run, and targets other than an assignment's run ID, are still refused, with a message that says who can reactivate and which run ID to use | Cross-Task messaging rules unchanged | DEC-002 |
| BEH-007 | Contract | SCN-001 | `delegate_task` returns `target_agent_run_id` (+ `task_id`) | It also returns whether the target is an `agent` or a `team` | No team run ID; the run ID stays the only messaging handle | DEC-003 |
| BEH-008 | Contract | SCN-005 | Tool descriptions say DONE is final ("closes the Task's delegated copies for good", "unless its Task is DONE") | Descriptions explain: DONE stops the workers. To continue, the agent that assigned the work moves the Task back to TODO/IN_PROGRESS and then messages the worker's run ID. | DONE still stops and hides workers | project-task-tool-contract.ts; collaboration LLM contract |

## Stakeholders, Actors, And Outcomes

| Actor / Stakeholder | Goal Or Responsibility | Required Outcome | Important Constraint |
| --- | --- | --- | --- |
| Delegating agent (assigner) | Owns Task status; follows up with the same worker after DONE | Explicit reopen, then message accepted; worker continues with its context | Only the run that assigned it; status changes only by the agent |
| Delegated copy (agent or team) | Continue the work | Restored with its conversation | No duplicate copies created |
| User | Understand what is happening | Status changes are visible agent actions; reactivated workers visible again | No silent status changes |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Related Scenario IDs |
| --- | --- | --- |
| UC-001 | Assigner reopens the Task, then reactivates its agent worker by messaging its run ID | SCN-001 |
| UC-002 | Assigner reopens the Task, then reactivates its team worker by messaging the coordinator run ID | SCN-002 |
| UC-003 | User sees reactivated workers return in the run tree | SCN-003 |
| UC-004 | Messages while the Task is DONE, from other senders, or to other closed runs are refused with guidance | SCN-004 |
| UC-005 | Agents learn the contract from the tool descriptions and results | SCN-005 |

### Out Of Scope

- Any automatic Task status change.
- Reactivating from the UI (user composer, Task-page button).
- Reopening helper runs.
- Reactivating workers when the Task's status changes (the worker returns only when messaged).
- Returning or messaging by team run ID.
- `project-manager-ux` (on hold).
- Changing what DONE stops or hides.

### Non-Goals

- No guarantee that a worker whose saved conversation is missing can be restored; such cases fail clearly.

### Preserved Behavior Boundary

- The preserved columns of BEH-001..BEH-008.
- Invariants:
  - only agents change Task status;
  - a run never receives input while its entry is closed;
  - nothing is deleted by reactivation.

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID that it protects.
- A finding that would introduce new product behavior, policy, threat model, migration obligation, compatibility promise, or operational contract is a `Requirement Gap`; it requires explicit user approval before becoming authoritative.
- An adjacent concern outside the approved boundary may be recorded as a non-blocking risk, recommendation, or separate-ticket candidate. It is not a required design correction.
- A downstream reviewer comment does not amend this requirements basis. The Solution Designer must update the canonical requirements and obtain renewed user approval before a scope-changing proposal can govern design or implementation.

## Requirements

| Requirement ID | Requirement | Related Behavior IDs | Priority | Rationale | Source / Decision Reference |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | A `send_message_to` by `target_agent_run_id` reactivates a closed `assigned` entry and delivers the message when all hold: (a) the target is that entry's run ID (an agent copy's run, or a team copy's coordinator); (b) the sender is the entry's recorded assigner; (c) the Task exists and its status is TODO or IN_PROGRESS | BEH-001 | High | Core request | User 2026-10-07 |
| REQ-002 | Reactivation restores the copy with its existing conversation (same run ID; for a team, the same team instance with its members). The message reaches the agent, or the team's coordinator. | BEH-001, BEH-004 | High | "reactivate the team" | User 2026-10-07 |
| REQ-003 | Reactivation never changes the Task status. While the Task is DONE, such a message is refused (`TASK_AGENT_RESOURCE_CLOSED`) with a message telling the sender to move the Task to TODO or IN_PROGRESS first and then message the run ID again. Nothing changes. | BEH-002 | High | Agent owns status; transparency | User 2026-10-07 (SR-002) |
| REQ-004 | Only the targeted assignment is reactivated. Helper entries and other closed assignments of the same Task stay closed. | BEH-005 | High | DEC-001 | SR-001 approval |
| REQ-005 | A message to a closed run is still refused when the sender is not the assigner, or the target is not an assignment's run ID (team member, helper). The refusal says that only the assigning run can reactivate, after reopening the Task, by messaging the run ID `delegate_task` returned. | BEH-006 | High | DEC-002 | SR-001 approval |
| REQ-006 | Reactivation is refused with a clear reason, leaving everything unchanged, when: the Task was deleted; the assignment never started (`start: failed`); or the worker's saved conversation is unavailable | BEH-001 | High | Truthful failure | Investigation |
| REQ-007 | The accepted `send_message_to` result's message states that the worker was reactivated. No new result field is added. | BEH-001 | Low | Transparency for the agent | SR-002 |
| REQ-008 | Reactivated workers reappear in the run tree live and stay visible after reload and server restart, for standalone, Team and Org roots. The Task's other closed workers stay hidden. | BEH-003 | High | Visibility | SR-001 approval (unchanged) |
| REQ-009 | A later DONE closes, stops and hides the reactivated worker exactly as the first DONE did; the cycle can repeat | BEH-008 | High | Preserved DONE | SR-001 approval |
| REQ-010 | `delegate_task` success results include the target kind (`agent` or `team`). No team run ID is added. | BEH-007 | Medium | DEC-003 | SR-001 approval |
| REQ-011 | The agent-facing descriptions of `create_or_update_task`, `delegate_task` and `send_message_to` (and their prompt/contract texts) describe the reopen-then-message path and no longer call DONE final | BEH-008 | High | Agents follow descriptions | Investigation |

## Acceptance Criteria

| AC ID | Related REQ | Related BEH / SCN | Preconditions / Trigger | Observable Expected Outcome | Important Alternate Or Failure Outcome | Verification Intent |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001, 002, 003, 007 | BEH-001 / SCN-001 | Agent A delegated a Project Task to agent copy B; A set DONE; A set IN_PROGRESS; A messages B's run ID | Accepted, and the message says B was reactivated; B replies with knowledge of its earlier conversation; the Task stays IN_PROGRESS (unchanged by the software) | — | API/E2E with real runtime |
| AC-002 | REQ-001, 002 | BEH-004 / SCN-002 | Same with a team copy; A messages the coordinator run ID | The team instance (same team run, same members) is restored; the coordinator receives the message | — | API/E2E |
| AC-003 | REQ-001 | SCN-001 | Description-only `delegate_task` (Task with no Project), DONE, A sets TODO, then messages | Same as AC-001; the Task stays TODO | — | API/E2E |
| AC-004 | REQ-008 | BEH-003 / SCN-003 | Worker hidden after DONE; reactivation | The row reappears without reload in standalone, Team and Org roots; it is still visible after reload and after server restart | — | Web E2E + restart test |
| AC-005 | REQ-004 | BEH-005 / SCN-004 | B had started helper H before DONE; A reactivates B | H stays closed and hidden; a message to H is refused | — | API |
| AC-006 | REQ-005 | BEH-006 / SCN-004 | Task reopened; agent C (not the assigner) messages B | Refused `TASK_AGENT_RESOURCE_CLOSED` with the assigner-only guidance; nothing changes | — | API |
| AC-007 | REQ-005 | BEH-006 / SCN-004 | Task reopened; A messages a member of a closed team copy | Refused with guidance to message the coordinator run ID | — | API |
| AC-008 | REQ-006 | SCN-004 | Project Task deleted after DONE; A messages B | Refused with a clear reason; nothing changes | — | API |
| AC-009 | REQ-006 | SCN-004 | Task reopened; assignment whose start failed; A messages its run ID | Refused with a clear reason | — | API |
| AC-010 | REQ-009 | BEH-008 / SCN-005 | Reactivated worker; A sets DONE again | The worker closes, stops and hides again; reopen + message reactivates it again | — | API/E2E |
| AC-011 | REQ-001 | SCN-001 | Server restarted after DONE; A reopens the Task and messages B | Same outcome as AC-001 | — | API/E2E with restart |
| AC-012 | REQ-010 | BEH-007 | `delegate_task` to an agent and to a team | Result carries `agent` / `team` respectively | Failure results unchanged | API |
| AC-013 | REQ-011 | BEH-008 | Tool definitions as exposed to agents | No "for good"/final wording; reopen-then-message described | — | Contract test |
| AC-014 | Preserved | BEH-001, 002 | Open/offline worker messaged; explicit status changes; DONE; new delegation | All behave as before. A status change to TODO/IN_PROGRESS alone reopens and shows nothing. | — | Existing suites + API |
| AC-015 | REQ-003 | BEH-002 / SCN-004 | Task still DONE; A messages B's run ID | Refused `TASK_AGENT_RESOURCE_CLOSED` with the hint to move the Task to TODO or IN_PROGRESS first; status, entry and rows unchanged | — | API |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor | Goal | Trigger | Starting Condition | Steps | Expected Outcome | Alternate / Error | Validity | Evidence | Related REQ / AC |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | Contract | Assigning agent | Continue with the same agent worker after DONE | Agent reopens the Task, then calls `send_message_to(target_agent_run_id)` | Task DONE; worker closed | Reopen (agent) → message → reactivate → restore → deliver | Worker continues; status as the agent set it | See SCN-004 | Supported Normal Scenario | User 2026-10-07 | REQ-001..003, 007; AC-001, 003, 011 |
| SCN-002 | Contract | Assigning agent | Continue with the same team | Same, to the coordinator run ID | Team Task DONE | Same | Team continues | — | Supported Normal Scenario | User 2026-10-07 | REQ-001, 002; AC-002 |
| SCN-003 | User | User | See the reactivated worker | Reactivation | Rows hidden | Rows reappear | Visible, persistent | — | Supported Normal Scenario | User 2026-10-07 | REQ-008; AC-004 |
| SCN-004 | Contract | Assigner too early, other sender, wrong target | — | Message to a closed run | — | Refused | Clear guidance; nothing changes | — | Supported Explicit Edge Scenario (Task ownership boundary and status ownership) | DEC-001/002, SR-002 | REQ-003..006; AC-005..009, 015 |
| SCN-005 | Contract | Assigning agent | Close again | DONE after reactivation | — | Close/stop/hide | Same as the first DONE | — | Supported Normal Scenario | — | REQ-009, 011; AC-010, 013 |

## UI, Interaction, And Experience Requirements

- Applicable: `Yes` (run-tree visibility only)
- Product design fields: `N/A — not applicable`. Reappearing rows use the existing row look; no new UI.

## Quality And Non-Functional Requirements

| Quality ID | Related REQ / AC | Area | Measurable Requirement Or Constraint | Conditions / Scope | Verification Intent |
| --- | --- | --- | --- | --- | --- |
| QR-001 | REQ-001, 003, 009 | Reliability | DONE and reactivation are never interleaved. After both settle, a DONE Task has no open entry, and a run receives input only while its entry is open. | Concurrent DONE + message | Integration race test |
| QR-002 | REQ-005 | Security | No sender other than the recorded assigner can reactivate | — | API |

## Data Continuity And Acceptable Loss

- Persisted or external data affected: `Yes`. An entry's `closedAt` in `agent_run_resources.json` returns to `null` on reactivation. Task status is untouched by the software.
- Data that must be preserved: all existing files; conversations; closed entries that are not reactivated.
- Acceptable loss: none.

## External Contracts And Dependencies

| Contract / Dependency | Required Behavior Or Constraint | Evidence / Authority | Uncertainty Or Risk |
| --- | --- | --- | --- |
| Agent tool contracts | Additive `target_kind`; changed descriptions | server docs | The agent repository's skill text (follow-up note) |
| Stream contracts (team, collaboration) | Reactivation reflected live | contract packages; web consumers | Contract package change |

## Supplemental Artifacts

None.

## Assumptions

| ID | Assumption | Why | Validation / Owner | Status |
| --- | --- | --- | --- | --- |
| ASM-001 | A released copy can be restored by the idle-wake restore path once its released authority is discarded | REQ-002 | Architecture (investigation finding 2) | Design-addressed |

## Open Decisions And Questions

| ID | Question | Options / Evidence | Decision Owner | Status |
| --- | --- | --- | --- | --- |
| DEC-001 | Do helpers come back too? | No; only the assignment | User | Resolved (SR-001) |
| DEC-002 | Who may reactivate? | Only the assigning run | User | Resolved (SR-001) |
| DEC-003 | Return the team run ID? | No; add `agent`/`team` kind | User | Resolved (SR-001) |
| DEC-004 | Who reopens the Task, and when does the worker come back? | The agent reopens the Task explicitly (no automatic status change). The worker comes back when the assigner messages it (option A), not when the status changes. | User | Resolved 2026-10-07 (SR-002) |

## Traceability

| REQ | UC | BEH | AC | SCN |
| --- | --- | --- | --- | --- |
| REQ-001 | UC-001, 002 | BEH-001 | AC-001..003, 011 | SCN-001, 002 |
| REQ-002 | UC-001, 002 | BEH-001, 004 | AC-001, 002 | SCN-001, 002 |
| REQ-003 | UC-004 | BEH-002 | AC-001, 003, 015 | SCN-004 |
| REQ-004 | UC-004 | BEH-005 | AC-005 | SCN-004 |
| REQ-005 | UC-004 | BEH-006 | AC-006, 007 | SCN-004 |
| REQ-006 | UC-004 | BEH-001 | AC-008, 009 | SCN-004 |
| REQ-007 | UC-005 | BEH-001 | AC-001 | SCN-001 |
| REQ-008 | UC-003 | BEH-003 | AC-004 | SCN-003 |
| REQ-009 | UC-005 | BEH-008 | AC-010 | SCN-005 |
| REQ-010 | UC-005 | BEH-007 | AC-012 | SCN-005 |
| REQ-011 | UC-005 | BEH-008 | AC-013 | SCN-005 |

## Architecture Phase Input

- Approved scenarios: SCN-001..SCN-005.
- Constraints:
  - status is written only by `create_or_update_task`;
  - DONE semantics;
  - Task ownership and message-scope rules;
  - one host root per assignment.
- Deferred to architecture:
  - where the reactivation decision lives;
  - its ordering;
  - the live event;
  - concurrency with DONE.

## Readiness Check

### Content Ready For Approval

- All items: `Yes`

### Approved Basis Ready For Design

- User approval received: `Yes` (SR-002, 2026-10-07)
- Exact requirements and supplement approval basis recorded: `Yes`
- Approved requirements package ready for architecture design: `Yes`
