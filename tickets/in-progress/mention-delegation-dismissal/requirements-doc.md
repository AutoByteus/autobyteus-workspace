# Requirements Document

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-003`
- Package identifier: `mention-delegation-dismissal`
- Request / ticket: `@` should lead to `delegate_task` instead of adding a permanent collaborator, so delegated work can be marked done and disappear
- Requirements owner: Solution Designer
- Date: 2026-10-06
- Approval state and reference: Approved by the user on 2026-10-06 ("Okay, understand. I think the requirement is clear now, right? Now I go ahead with the designing."), given after SR-003 was presented and after the follow-up explanation of current delegate_task persistence. Covers SR-003 as written, including REQ-013, the strict two-mode `create_or_update_task` (update rejects `project_id`), and the Task-linked messaging consequence (copies owned by different Tasks cannot message each other by run ID).
- Exact approved requirements baseline / solution revision: SR-003 (REQ-001..013, AC-001..015, SCN-001..007, BEH-001..009)
- Behavior-defining supplements and their approved versions: None

## Problem And Desired Outcome

- Problem: Each `@X` permanently adds X to the run as a collaborator (an Offline row with one reused instance), and
  nothing can remove it (investigation-notes E-01..E-04). Delegated copies only disappear when the Project Task
  they were started for is set to DONE (E-05, E-06); description-only delegated copies stay forever too. A
  collaborator and a delegated copy are fundamentally the same kind of helper; the only real difference is that one
  is permanent and the other can be closed (user, round 5).
- Affected actors or systems: users of `@` in live runs (standalone, Team, Org, task children); agents that
  delegate; Projects/Task services; the run tree in the Workspaces panel.
- Desired outcome: `@X` asks the focused agent to delegate to X. Every description-only delegation from an agent
  that is not itself working on a Task creates a Task with no Project and returns its `task_id`. The delegating agent
  (on its own or when the user asks it) marks that Task DONE with `create_or_update_task`, without a `project_id`.
  DONE closes the copy for good and its row disappears; history is kept.
- Observable definition of success: after "@X …", a delegated X row appears (no collaborator row). After the user
  tells the agent "mark that done", the row disappears and stays gone after reopen or restart, and the copy can no
  longer be messaged or woken.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Related Scenario IDs | Evidence-Backed Current Behavior | Desired Behavior | Intentionally Preserved Behavior | Investigation Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | SCN-001 | Sending with `@X` adds X as a permanent collaborator at send time | Sending with `@X` adds nothing to the run; X appears only when the agent delegates | `@` menu, candidates, inline `@Name` editing and chip display unchanged | E-01, E-02 |
| BEH-002 | Contract | SCN-001 | The note on the message tells the agent to `send_message_to` X's address | The note tells the agent to `delegate_task` to X's address and follow up by the returned run ID | Note still lists each mentioned name, kind and address; saved older notes still display correctly | E-04 |
| BEH-003 | Contract | SCN-001, SCN-002 | Description-only `delegate_task` returns only `target_agent_run_id`; no Task | From a sender that is not working on a Task, it creates a Task with no Project, links the copy to it and also returns `task_id` | Run ID result, placement, catalog copies and parallel copies unchanged | E-11, E-13 |
| BEH-004 | Contract | SCN-002 | `create_or_update_task` always requires `project_id`; a Task must belong to a Project | Two strict modes: update takes `task_id` only (no `project_id`) and patches status/description of any Task, with or without a Project; create takes `project_id` + description | Creating a Task still requires `project_id`; Project Tasks behave as today | E-14, E-17, E-18 |
| BEH-005 | System | SCN-002, SCN-003 | DONE on a Project Task closes its runs forever, stops them and hides their rows | Same DONE behavior for a Task with no Project | DONE semantics unchanged (permanent, history kept, repeat = retry) | E-05, E-07 |
| BEH-006 | Operational | SCN-002 | `create_or_update_task` is available only when selected in an agent's definition | Every agent that has `delegate_task` can also use `create_or_update_task` | Agents without `delegate_task` unchanged; other Project tools still opt-in | E-08, E-09 |
| BEH-007 | System | SCN-006 | Sub-work delegated by an agent working on a Task belongs to that Task | Unchanged: no extra Task is created for it; DONE on the parent Task closes it | — | E-07 |
| BEH-008 | Operational | SCN-005 | Tasks exist only under Projects; Project delete keeps the run-resource record | Tasks with no Project are not listed on the Projects page; they are deleted when the run hosting them is permanently deleted | Project and Project Task storage, listing and deletion unchanged | E-19 |
| BEH-009 | Compatibility | SCN-007 | Stored runs have collaborator entries | They keep loading and working as before; no migration | Collaborator restore and messaging unchanged for stored entries | E-02 |

## Stakeholders, Actors, And Outcomes

| Actor / Stakeholder | Goal Or Responsibility | Required Outcome | Important Constraint |
| --- | --- | --- | --- |
| User | Bring in help with `@` and get rid of it when finished | Helper rows can be removed by telling the agent to mark the work done | No loss of conversation history |
| Delegating agent | Delegate and finish work | Gets a `task_id` and can mark it DONE | Works on every runtime that exposes `delegate_task` |
| Projects / Task services | Own Task records and DONE | Support Tasks with no Project | Project Tasks unchanged |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Related Scenario IDs |
| --- | --- | --- |
| UC-001 | `@X` in a live run leads the focused agent to delegate to X instead of adding a collaborator | SCN-001, SCN-004 |
| UC-002 | Description-only delegation creates a Task with no Project and returns its `task_id` | SCN-001, SCN-006 |
| UC-003 | The delegating agent marks a Task with no Project DONE by `task_id` alone, closing and hiding the copy | SCN-002, SCN-003 |
| UC-004 | Tasks with no Project are cleaned up when their run is permanently deleted | SCN-005 |

### Out Of Scope

- A user Dismiss button on delegated rows (user decision, round 5: the user asks the agent instead).
- An agent's first `send_message_to` to a catalog Agent/Team that is not in the run still adds a collaborator
  (later round).
- Removing collaborators from stored runs, or converting them to Tasks.
- The temporary/default Project idea (deferred, round 2).
- Showing Tasks with no Project anywhere in the Projects UI; listing them with `list_project_tasks`.
- Creating a Task with no Project directly through `create_or_update_task` (only `delegate_task` creates them).
- Automatic DONE, completion reports or scheduling.
- Removal of the built-in Project Task Manager (separate package `remove-built-in-project-task-manager`).

### Non-Goals

- Sender ownership checks on Task updates (consistent with today's Project tools: anyone with the tool and the ID can patch).

### Preserved Behavior Boundary

BEH-001..009 preserved columns; REQ-010, REQ-011, REQ-012; AC-011..014. Cross-cutting invariant: linked
`delegate_task(task_id)` and Project Task DONE behave exactly as today.

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID that it protects.
- A finding that would introduce new product behavior, policy, threat model, migration obligation, compatibility promise, or operational contract is a `Requirement Gap`; it requires explicit user approval before becoming authoritative.
- An adjacent concern outside the approved boundary may be recorded as a non-blocking risk, recommendation, or separate-ticket candidate. It is not a required design correction.
- A downstream reviewer comment does not amend this requirements basis. The Solution Designer must update the canonical requirements and obtain renewed user approval before a scope-changing proposal can govern design or implementation.

## Requirements

| Requirement ID | Requirement | Related Behavior IDs | Priority | Rationale | Source / Decision Reference |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | A user message with `@` mentions adds no collaborator entry and creates no row at send time. | BEH-001 | Must | Root cause of undismissable rows | User rounds 2, 5 |
| REQ-002 | The note appended to a message with mentions lists each mentioned name, kind and address and tells the focused agent to use `delegate_task` to that address for the work and to follow up by the returned run ID. | BEH-002 | Must | Agent needs the address and the right tool | User round 2 |
| REQ-003 | A description-only `delegate_task` from a sender that is not working on a Task creates one Task with no Project, holding the delegated description, and links the started copy to it before any resource is acquired (same assignment rules as linked delegation). | BEH-003 | Must | Makes every such copy closable | User rounds 3, 4 |
| REQ-004 | The accepted `delegate_task` result includes `task_id` together with the existing `target_agent_run_id`. A rejected call creates no Task. | BEH-003 | Must | Delegator needs the handle | User round 3 |
| REQ-005 | `create_or_update_task` has two strict modes. Update: `{task_id, status?, description?}`; `project_id` is not accepted; it patches that Task whether or not it belongs to a Project. Create: `{project_id, description}` with no `task_id`, as today. | BEH-004 | Must | Task IDs are unique; a Task may have no Project | User round 4; E-17, E-18 |
| REQ-006 | Setting a Task with no Project to DONE has the same effect as Project Task DONE: its copies (and their sub-work) are closed forever, stopped, hidden from the run tree, and cannot receive input, be woken or be restored, including after restart. History is kept. | BEH-005 | Must | The user-visible goal | User rounds 3, 5 |
| REQ-007 | Every agent that has `delegate_task` available also has `create_or_update_task` available, on every runtime. | BEH-006 | Must | Otherwise most agents cannot close | Recommended default accepted round 5 |
| REQ-008 | Tasks with no Project are not shown on the Projects page or in `list_project_tasks`. | BEH-008 | Must | They are execution helpers, not Project work | Round 4 analysis |
| REQ-009 | When a run is permanently deleted from history, the Tasks with no Project created for copies hosted in that run are deleted too. | BEH-008 | Should | Avoid invisible accumulation | Recommended default accepted round 5 |
| REQ-010 | Sub-work delegated by an agent that is working on a Task stays owned by that Task: no extra Task is created and the result carries no new `task_id`. | BEH-007 | Must (preserve) | Keeps one owner; parent DONE closes all | Recommended default accepted round 5 |
| REQ-011 | Stored runs with collaborator entries keep loading, messaging and restoring their collaborators as before; no migration. | BEH-009 | Must (preserve) | Compatibility | Recommended default accepted round 5 |
| REQ-013 | A Task with no Project stores only text: the delegated description and the given `reference_files` paths as plain text. It never copies file contents. Project Task uploaded context files are unchanged. | BEH-003 | Must | User round 8: ad-hoc Tasks must not copy files | User round 8 |
| REQ-012 | Description-only delegation and DONE on Tasks with no Project keep working while the one-time Projects data migration is pending. | BEH-003, BEH-005 | Must | Delegation must not inherit the Projects lockout | E-20 |

## Acceptance Criteria

| AC ID | Related REQ | Related BEH / SCN | Preconditions / Trigger | Observable Expected Outcome | Alternate Or Failure Outcome | Verification Intent |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001 | BEH-001, SCN-001 | Live run; user sends "review this @X" | No collaborator entry in the stored tree; no X row appears from the send itself | — | Server API + web |
| AC-002 | REQ-002 | BEH-002, SCN-001 | Same send | Stored message ends with a note naming X, its kind and address and instructing `delegate_task`; UI still shows the `@X` chip, not the note | Older saved notes still render as chips | Unit + web |
| AC-003 | REQ-003, REQ-004 | BEH-003, SCN-001 | Focused agent calls `delegate_task({recipient_address: X, description})` | X copy row appears; result has `target_agent_run_id` and `task_id`; a Task with that ID and no Project exists, with the copy linked as assigned | Rejected call (e.g. unknown address) returns no `task_id` and leaves no Task | Server integration |
| AC-004 | REQ-005 | BEH-004 | `create_or_update_task({task_id, status: "DONE"})` without `project_id` | Task status becomes DONE | Unknown `task_id` fails `TASK_NOT_FOUND`; supplying `project_id` together with `task_id` is rejected as an unsupported argument | Server integration |
| AC-005 | REQ-005 | BEH-004 | `create_or_update_task({task_id, description})` for a Project Task without `project_id` | That Project Task's description is patched | — | Server integration |
| AC-006 | REQ-005 | BEH-004 | `create_or_update_task({description})` without `project_id` | Fails as today (create needs a Project) | — | Server unit |
| AC-007 | REQ-006 | BEH-005, SCN-002 | Copy from AC-003 is idle or running; user asks the agent "mark it done"; agent sets DONE | Copy is stopped; its row and sub-rows disappear live; messaging it by run ID fails as closed | Repeating DONE re-requests the stop and changes nothing else | Server integration + web/E2E |
| AC-008 | REQ-006 | BEH-005, SCN-003 | After AC-007, reopen the run / restart the server | Row stays hidden; copy cannot be woken or restored; its conversation is still readable | — | Server integration |
| AC-009 | REQ-007 | BEH-006, SCN-002 | Team member and standalone host with `delegate_task`, on AutoByteus, Codex and Claude runtimes | `create_or_update_task` is available to each | Agent without `delegate_task`: unchanged tool set | Server unit/integration per runtime |
| AC-010 | REQ-008, REQ-009 | BEH-008, SCN-005 | Tasks with no Project exist; then the hosting run is permanently deleted | Projects page and `list_project_tasks` never show them; after delete, those Tasks are gone | Project Tasks and other runs' Tasks untouched | Server integration |
| AC-011 | REQ-010 | BEH-007, SCN-006 | Agent working on a Task delegates sub-work by description | No new Task; no `task_id` in result; parent Task DONE closes the sub-work | — | Server integration |
| AC-012 | REQ-011 | BEH-009, SCN-007 | Stored run with collaborator entries is reopened | Collaborator rows load; messaging a collaborator by address still works | — | Server integration |
| AC-013 | REQ-012 | SCN-001 | Projects migration pending | Description-only delegation succeeds with `task_id`; DONE on that Task works | Project operations still report `PROJECTS_MIGRATION_PENDING` | Server integration |
| AC-015 | REQ-013 | BEH-003 | Described delegation with `reference_files` | The Task with no Project holds the description and the paths as text; no file is copied into its folder | — | Server integration |
| AC-014 | REQ-003, REQ-006 | Preserved | Linked `delegate_task({recipient_address, task_id})` with a Project Task, then DONE | Behaves exactly as today | Workers still cannot assign with `task_id` | Existing tests stay green |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor / Initiator | Goal | Trigger | Starting Condition | Steps | Expected Outcome | Alternate / Error | Validity | Evidence | REQ / AC |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | User | User | Get help from X | `@X` in a live-run composer | Any live run with `@` | User sends "@X …" → agent delegates to X → X row appears | One delegated X copy with a Task | Agent decides not to delegate: nothing added | Supported Normal | User rounds 2–5 | REQ-001..004, AC-001..003 |
| SCN-002 | User | User via agent | Remove finished helper | User tells agent "mark X done", or agent decides itself | Open copy from SCN-001 | Agent calls `create_or_update_task(task_id, DONE)` | Copy stopped, row gone, history kept | — | Supported Normal | User round 5 | REQ-005..007, AC-004, AC-007, AC-009 |
| SCN-003 | System | Server | Closed stays closed | Reopen / restart | DONE copy | Load run | Row hidden; copy fenced | — | Supported Normal | E-05, E-07 | REQ-006, AC-008 |
| SCN-004 | User | User | Ask X again | Second `@X` | Earlier copy open or closed | Agent follows up by run ID or delegates a new copy | Closed copy never reused | — | Supported Explicit Edge | Round 2 | REQ-002, REQ-006 |
| SCN-005 | Operational | User | Delete old run | Permanent delete in history | Run hosted copies with Project-less Tasks | Delete run | Those Tasks deleted | — | Supported Normal | Round 5 default | REQ-009, AC-010 |
| SCN-006 | System | Agent working on a Task | Delegate sub-work | `delegate_task` by description | Task-owned sender | Delegate | Sub-work owned by parent Task | — | Supported Normal | E-07 | REQ-010, AC-011 |
| SCN-007 | Compatibility | User | Reopen old run | Open stored run | Has collaborator entries | Load | Works as before | — | Supported Normal | E-02 | REQ-011, AC-012 |

## UI, Interaction, And Experience Requirements

- Applicable: `No` new UI. The existing run tree hides closed copies; the `@` composer is unchanged.
- Product UI/UX fields: `N/A — not applicable`.

## Quality And Non-Functional Requirements

| Quality ID | Related REQ / AC | Area | Requirement | Conditions | Verification |
| --- | --- | --- | --- | --- | --- |
| QR-001 | REQ-003, AC-003 | Reliability | Task creation and linking happen before resources are acquired; a crash never leaves an unlinked copy | All runtimes | Server integration |
| QR-002 | REQ-007, AC-009 | Compatibility | Same tool availability on AutoByteus, Codex and Claude runtimes | — | Per-runtime tests |

## Data Continuity And Acceptable Loss

- Persisted data affected: `Yes` — new storage for Tasks with no Project (additive); `delegate_task` writes a Task record.
- Must be preserved: all existing Projects, Tasks, run-resource records, stored runs and collaborator entries.
- Acceptable loss: Tasks with no Project are deleted with their run's permanent delete.
- Unknowns for design: storage location and its relation to the Projects migration gate (REQ-012).

## External Contracts And Dependencies

| Contract / Dependency | Required Behavior Or Constraint | Evidence / Authority | Uncertainty Or Risk |
| --- | --- | --- | --- |
| `delegate_task` / `create_or_update_task` tool contracts (native + Agent Tools MCP) | `delegate_task` result gains `task_id`; `create_or_update_task` update mode drops `project_id` (breaking for callers that send it; prompts/descriptions updated) | agent_tools.md, projects.md | Prompts/tool descriptions must be updated consistently |
| `@autobyteus/agent-presentation-contracts` mention note | New guidance line; old guidance lines still parsed | collaborator-mention-note.ts | — |
