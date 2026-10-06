# Requirements Document

## Document Status

- Status: `Draft`
- Current solution revision ID: `SR-001`
- Package identifier: `project-manager-ux`
- Request / ticket: Make managing a Project through the Project Task Manager feel native in the UI (user conversation, 2026-10-06)
- Requirements owner: Solution Designer
- Date: 2026-10-06
- Approval state and reference: Not approved. The user asked to work out the UI with the Product Team first, then return (2026-10-06).
- Exact approved requirements baseline / solution revision: None
- Behavior-defining supplements and their approved versions: Pending the Product Team result

## Problem And Desired Outcome

- Problem: The Project Task Manager organizes the work: it plans, creates Tasks and delegates them to agents and teams. But the UI presents it exactly like a worker: an ordinary chat run under a workspace. Tasks it creates are invisible until the user leaves the chat, opens Projects and clicks Refresh. Tasks do not show which agent or team is working on them, and worker rows do not show which Task they serve.
- Affected actors or systems: Desktop user; the Project Task Manager agent; delegated worker agents/teams.
- Desired outcome: The user has an obvious place to talk to the manager about a Project and sees, as it happens, the Project's Tasks being created, assigned, worked on and finished, with a direct way to reach the worker on each Task. The user's own image: sitting next to a project lead with a whiteboard.
- Observable definition of success: Without Refresh or leaving the conversation, the user sees a Task appear when the manager creates it, sees it move to In Progress with its worker shown when delegated, and can open that worker from the Task.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Related Scenario IDs | Evidence-Backed Current Behavior | Desired Behavior | Intentionally Preserved Behavior | Investigation Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | SCN-001 | Manager is an ordinary run; not tied to a Project | A recognizable place to talk to a Project's manager, tied to that Project | Ordinary Chat/`@` use of any agent | investigation-notes BEH-001 |
| BEH-002 | User | SCN-002 | New/changed Tasks appear only after manual Refresh on the Projects page | Task changes appear live where the user is looking | Manual create/edit/delete of Tasks | investigation-notes BEH-002 |
| BEH-003 | User | SCN-003 | Task pages do not show workers; worker rows do not show Tasks | Task shows its worker(s) with status and opens them | Delegation semantics and DONE closure | investigation-notes BEH-003 |
| BEH-004 | User | SCN-004 | Manager run looks like any worker in the left tree | Manager run is recognizable as the Project's organizer | Workspace-based run tree organization | investigation-notes BEH-001 |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Related Scenario IDs |
| --- | --- | --- |
| UC-001 | Start or resume talking to a Project's manager from an obvious entry point | SCN-001 |
| UC-002 | Watch the Project's Tasks change live while talking to the manager | SCN-002 |
| UC-003 | See who is working on each Task and open that worker | SCN-003 |
| UC-004 | Tell the manager's conversation apart from workers' runs | SCN-004 |

### Out Of Scope

- Changing Task semantics, statuses, delegation or DONE closure behavior.
- Changing the Project Task Manager's planning procedure (agent repository), except minimal changes later required to use a Project binding.
- Mobile/phone support for Projects.
- Changing the `ENABLE_PROJECTS` default.

### Non-Goals

- No automatic scheduling, auto-dispatch or auto-DONE by the UI.

### Preserved Behavior Boundary

- Existing Projects pages, manual Task authoring, Chat and `@` behavior, and the workspace-based run tree remain usable as today.

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID that it protects.
- A finding that would introduce new product behavior, policy, threat model, migration obligation, compatibility promise, or operational contract is a `Requirement Gap`; it requires explicit user approval before becoming authoritative.
- An adjacent concern outside the approved boundary may be recorded as a non-blocking risk, recommendation, or separate-ticket candidate. It is not a required design correction.
- A downstream reviewer comment does not amend this requirements basis. The Solution Designer must update the canonical requirements and obtain renewed user approval before a scope-changing proposal can govern design or implementation.

## Requirements (draft, to be refined with the Product result)

| Requirement ID | Requirement | Related Behavior IDs | Priority / Criticality | Rationale | Source / Decision Reference |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | The user can start or resume a conversation with a Project's manager from a clear entry point, and that conversation is tied to the Project | BEH-001 | High | Core of the request | User, 2026-10-06 |
| REQ-002 | While talking to the manager, the user can see the Project's Tasks without leaving the conversation | BEH-002 | High | "they can really see the new task is being created" | User, 2026-10-06 |
| REQ-003 | Task creation, edits and status changes made by agents appear in the visible Task views without a manual Refresh | BEH-002 | High | Same | User, 2026-10-06 |
| REQ-004 | Each Task shows the agent(s)/team(s) working on it with their status and lets the user open them | BEH-003 | High | Manager delegates to workers | User, 2026-10-06 |
| REQ-005 | The manager's conversation is visually distinguishable from worker runs | BEH-004 | Medium | "the agent are the workers, but the manager is the person organizing" | User, 2026-10-06 |
| REQ-006 | When no manager agent is available or Projects is disabled, the UI says so clearly instead of failing silently | BEH-001 | Medium | Manager comes from a separate repository; Projects is default-off | Investigation RSK-001 |

## Acceptance Criteria

To be written after the Product result and the DEC-* answers.

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor | Goal | Trigger / Entry Surface | Starting Condition | Steps | Expected Outcome | Alternate / Error | Validity | Evidence | Related REQ |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | User | Desktop user | Ask the manager to plan and run work for a Project | Entry point TBD (DEC-001) | Projects enabled; a manager agent is available | Open entry → manager conversation for that Project → describe request | Manager plans in the context of that Project | No manager agent / Projects disabled → clear message | Supported Normal Scenario (new behavior) | User, 2026-10-06 | REQ-001, REQ-006 |
| SCN-002 | User | Desktop user | Watch the plan become Tasks | Manager creates/updates Tasks | SCN-001 underway | Manager creates Tasks → they appear in view | Tasks visible live | Update failure → visible, recoverable | Supported Normal Scenario | User, 2026-10-06 | REQ-002, REQ-003 |
| SCN-003 | User | Desktop user | See and check on who does each Task | Manager delegates a Task | Task exists | Delegation → Task shows worker + status → user opens worker | Worker run opens | Delegation failed → Task shows it | Supported Normal Scenario | User, 2026-10-06 | REQ-004 |
| SCN-004 | User | Desktop user | Find the manager among many runs | Left panel | Several runs exist | Scan run tree | Manager run recognizable as the Project organizer | — | Supported Normal Scenario | User, 2026-10-06 | REQ-005 |

## UI, Interaction, And Experience Requirements

- Applicable: `Yes`
- Linked UI/UX or interaction supplement: Pending the Product Team (request: `product-design-request.md`)
- Linked runnable UI reference, separate design repository/root, UI/UX specification, and applicable support artifacts: Pending
- Product ticket record and folder (externally owned): Pending
- Design repository revision or commit: Pending
- UI/UX user-confirmation reference: Pending
- Approved visual-reference baseline: Pending
- Normative visual and interaction details: Pending
- Explicitly illustrative fixture content or permitted implementation variation: Pending
- Required screens, states, transitions, feedback, responsive behavior, or accessibility outcomes: Pending
- Explicitly unresolved product decisions: DEC-001..DEC-005

## Data Continuity And Acceptable Loss

- Persisted or external data affected: `Unknown` (a Project ↔ manager-conversation binding may need to be stored)
- Data or state that must be preserved: Existing Projects, Tasks, Task context, run history, Task run resources.
- Loss, reset, rebuild, or regeneration that is acceptable: None identified.
- Unknowns requiring downstream investigation: Whether existing manager runs need to be associated retroactively (assumed not).

## Open Decisions And Questions

| Decision / Question ID | Question | Why It Matters | Options / Evidence | Decision Owner | Status |
| --- | --- | --- | --- | --- | --- |
| DEC-001 | Where does the user start: from the Project, or from the conversation? | Shapes the whole layout | (a) Project page with manager beside the board; (b) chat with a live Tasks panel; (c) both, linked | User, with Product | Open |
| DEC-002 | Which agent is a Project's manager? | No built-in manager exists | Per-Project setting (default: agent-repository Project Task Manager); any agent with Project tools; always the Project Task Manager | User | Open |
| DEC-003 | One manager conversation per Project, or several? | Binding and navigation | Single; several with latest by default | User | Open |
| DEC-004 | Phasing: entry + live Tasks + Task↔worker first; chat task cards and left-tree marking later? | Size of the first delivery | — | User | Open |
| DEC-005 | Stay behind `ENABLE_PROJECTS`? | Visibility | Proposed: yes | User | Open |

## Readiness Check

### Content Ready For Approval

- Content ready for user approval: `No`
- Remaining content blocker: Product Team UI/UX result and DEC-001..DEC-005.

### Approved Basis Ready For Design

- User approval received: `No`
