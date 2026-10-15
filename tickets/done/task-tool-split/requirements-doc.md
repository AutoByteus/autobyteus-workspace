# Requirements Document

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-003`
- Package identifier: `task-tool-split`
- Request / ticket: Project Task `project_task_ee74d72b-3733-4383-9e5d-20372867e06a` "Split create_or_update_task into create_task and update_task; no automatic exposure"
- Requested by: `/project_task_manager` (AgentRun `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), on the user's direction of 2026-10-15
- Requirements owner: `/software_engineering_team/solution_designer`
- Date: 2026-10-15
- Approved by and reference: `Solution Designer within the direction (user informed)`; the user's direction (2026-10-15, the split proposal) and the user's instruction on DEC-004 ("You don't have to care about the agent config for the project task manager. It belongs to another task … focus on your task."); the user is informed of this approval in the Solution Designer's reply.
- Exact approved requirements baseline: this document at `SR-003` (SR-001 plus the SR-003 reconciliation of BEH-004/BEH-005/AC-004/AC-005 and new AC-008, approved by the Solution Designer within the direction, user informed)
- Behavior-defining supplements: `temp-task-tool-split-proposal.md` (direction; agreed with the user 2026-10-15)

## Problem And Desired Outcome

- Problem: `create_or_update_task` mixes "create a work item" and "update a Task" and is given automatically to every agent that has `delegate_task`, whose texts tell it to close the temp Task its delegation created. That reads as strange to an agent that only wanted help, and is often skipped.
- Desired outcome: two tools with one meaning each, given only to agents the user configures; every text an agent sees matches the tools it actually has. Temp Tasks stay.
- Observable definition of success: an agent without `update_task` is never told to close anything; an agent with `update_task` can close its temp Task; the Project Task Manager keeps working with `create_task` and `update_task`.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Scenario IDs | Current | Desired | Preserved | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | SCN-001 | every collaborating agent gets `create_or_update_task` | no task tool is added automatically | `send_message_to`, `delegate_task`, `get_handoff_rules` stay automatic | inv. BEH-001 |
| BEH-002 | System | SCN-001, SCN-002 | delegation text always says to close the returned `task_id` | said only to agents that have `update_task` | temp Task creation and `task_id` in the result | inv. BEH-002 |
| BEH-003 | System | SCN-003 | PTM creates and patches with one tool | PTM uses `create_task` and `update_task` | every PTM capability | inv. BEH-003 |
| BEH-004 | System | SCN-004 | reactivation guidance names the old tool | states that the Task is closed and that the run that assigned it can reopen it; names no tool (the error goes to any sender) | reactivation rules | inv. BEH-004 |
| BEH-005 | User | SCN-005 | `@` note says to close a returned `task_id` | the note no longer mentions closing for any agent; agents with `update_task` learn closing from that tool's description | delegate guidance, in-run and run-agent sentences unchanged; saved notes of earlier releases still parse | inv. BEH-005 |

## Stakeholders, Actors, And Outcomes

| Actor | Goal | Outcome | Constraint |
| --- | --- | --- | --- |
| User | decide which agents manage Tasks | configures `create_task` / `update_task` per agent | — |
| Delegating agents | get help | no closing duty unless configured | — |
| Project Task Manager | manage Tasks | same capabilities, clearer tools | its package must keep working |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Scenario IDs |
| --- | --- | --- |
| UC-001 | An agent without task tools delegates and is never asked to close | SCN-001 |
| UC-002 | An agent configured with `update_task` closes its temp Task | SCN-002 |
| UC-003 | The Project Task Manager creates and updates Project Tasks | SCN-003 |
| UC-004 | Reactivation guidance and `@` note match the agent's tools | SCN-004, SCN-005 |

### Out Of Scope

- Temp Task creation, Project Task semantics, DONE/CANCELLED closure, reactivation rules, idle shutdown.
- `list_projects`, `list_project_tasks`, `create_or_update_project` (a similar split of the Project tool is a possible follow-up, not requested).
- The collaboration model changes of Task 259ddae7.

### Follow-Ups

- FU-1: update the Project Task Manager package (`autobyteus-agents/agents/project-task-manager`: `toolNames` → `create_task`, `update_task`; skill wording) — another agent's Task; must land with this release.

### Non-Goals

- A UI for closing temp Tasks; cleaning up accumulated temp Tasks.

### Preserved Behavior Boundary

- All Task service behavior behind both modes, including `context_files`, error codes, results, closure and reactivation.
- Native and Agent Tools MCP exposure share one contract; first-party names stay protected against MCP collisions.

### Review Authority

- Every blocking finding must cite an approved requirement, AC or preserved-behavior ID; new behavior or compatibility promises are a `Requirement Gap` needing the user's approval.

## Requirements

| Requirement ID | Requirement | Related Behavior IDs | Priority | Rationale | Source |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | `create_task` creates a Project Task: `{project_id, description, context_files?}`, same rules and result as today's create mode. | BEH-003 | Must | one meaning per tool | User |
| REQ-002 | `update_task` updates a Task by ID (Project Task or temp Task): `{task_id, description?, status?, context_files?}`, same rules and result as today's patch mode, including closure and reactivation. | BEH-002, BEH-003 | Must | one meaning per tool | User |
| REQ-003 | `create_or_update_task` no longer exists as a tool. | BEH-001, BEH-003 | Must | clean cut | User; DEC-002 |
| REQ-004 | No task tool is added automatically to any agent; an agent has `create_task` and/or `update_task` only when its configuration selects them. Native and Agent Tools MCP exposure behave the same. | BEH-001 | Must | user configures | User |
| REQ-005 | Every agent-facing text (delegation tool description and result guidance, collaboration prompt sections, `@` mention note, reactivation guidance in errors) mentions closing or reopening a Task with `update_task` only for an agent that has `update_task`; otherwise it says nothing about closing. | BEH-002, BEH-004, BEH-005 | Must | texts must match tools | User |
| REQ-006 | The server change is self-contained: configurations are not edited by this ticket. A configuration that still lists `create_or_update_task` gets no task tool from that name (unknown tool names are ignored, as today); the release notes state that agents needing task tools must list `create_task` and/or `update_task`. | BEH-003 | Must | user: other configurations are another Task's scope | User; DEC-004 |

## Acceptance Criteria

| AC ID | REQ IDs | Scenario | Trigger | Expected Outcome | Alternate | Verification |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-004, REQ-005 | SCN-001 | Team member without task tools delegates by description | gets a `task_id` in the result; tool list has no task tool; no text mentions closing | — | unit (exposure, rendered texts) + integration |
| AC-002 | REQ-002, REQ-004 | SCN-002 | Agent configured with `update_task` delegates, then sets the returned `task_id` to DONE | copy stops and is hidden, as today | — | integration |
| AC-003 | REQ-001..REQ-003 | SCN-003 | PTM with `create_task`/`update_task` creates, updates, closes and reopens Tasks | same results as today; `create_or_update_task` absent | old name rejected as unknown tool | integration |
| AC-004 | REQ-005 | SCN-004 | A sender messages a copy whose Task is closed | error says the Task is closed and the run that assigned it can reopen it; it names no tool | — | unit |
| AC-005 | REQ-005 | SCN-005 | `@X` with a focused agent with / without `update_task` | the note has no closing sentence in either case; the delegate guidance is otherwise unchanged | — | unit |
| AC-008 | REQ-005 | SCN-005 | Saved messages whose note was composed by the previous release (delegate guidance alone, with the in-run sentence, with run-agent sentences, and all combinations), and by earlier releases | every such note is recognized as a note | — | unit (parse tests) |
| AC-006 | REQ-004 | SCN-001 | Codex, Claude and AutoByteus runtimes | identical exposure and texts | — | unit |
| AC-007 | REQ-006 | SCN-003 | A configuration lists `create_or_update_task`, another lists `create_task`/`update_task` | the first gets no task tool and no error at launch; the second gets exactly the listed tools | — | integration |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor | Goal | Trigger | Steps | Expected Outcome | Validity | Evidence | REQ / AC |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | System | agent | get help | description-only `delegate_task` | copy starts; nothing to close | copy sleeps when quiet | Supported Normal Scenario | user | REQ-004/005; AC-001, AC-006 |
| SCN-002 | System | configured agent | end delegated work | `update_task(task_id, DONE)` | closure | copy stopped and hidden | Supported Normal Scenario | user | REQ-002; AC-002 |
| SCN-003 | System | Project Task Manager | manage Tasks | `create_task` / `update_task` | — | as today | Supported Normal Scenario | PTM skill | REQ-001..003, 006; AC-003, AC-007 |
| SCN-004 | System | any sender | continue closed work | message to closed copy | guidance | says the Task is closed and its assigner can reopen it; names no tool | Supported Normal Scenario | projects docs | REQ-005; AC-004 |
| SCN-005 | User | user | involve X | `@X` | note | matches tools | Supported Normal Scenario | docs | REQ-005; AC-005 |

## UI, Interaction, And Experience Requirements

- Applicable: `No` (tool lists in agent configuration UI come from the server registry). Product Design fields: `N/A — not applicable`.

## Quality And Non-Functional Requirements

| Quality ID | REQ / AC | Area | Requirement | Verification |
| --- | --- | --- | --- | --- |
| QR-001 | REQ-004; AC-006 | Compatibility | identical tool exposure and texts across runtimes | unit |

## Data Continuity And Acceptable Loss

- Persisted data affected: agent configurations naming `create_or_update_task` (locally only the Project Task Manager package in `autobyteus-agents`). No Task, run or memory data changes. Historical raw traces are not rewritten.

## External Contracts And Dependencies

| Contract | Required Behavior | Authority | Risk |
| --- | --- | --- | --- |
| Agent tool names (native + MCP) | `create_task`, `update_task` replace `create_or_update_task` | agent tools | external configs naming the old tool (DEC-004) |
| `autobyteus-agents` repo (PTM package) | not changed here; follow-up for another agent (FU-1) | user | the PTM loses task tools after the release until FU-1 lands — release must be coordinated |
| Task 259ddae7 | same texts | PM | rebase order |

## Supplemental Artifacts

| Artifact Path | Purpose | Status |
| --- | --- | --- |
| `temp-task-tool-split-proposal.md` | direction | Agreed with the user |

## Assumptions

| ID | Assumption | Status |
| --- | --- | --- |
| ASM-001 | The `task_id` stays in the `delegate_task` result for all agents (harmless without `update_task`; usable with it) | Decided (DEC-003) |

## Decisions

| Decision ID | Question | Why It Matters | Options / Evidence | Reasoning And Recommendation | Owner | Status |
| --- | --- | --- | --- | --- | --- | --- |
| DEC-001 | Direction | all | user 2026-10-15 | split, no automatic exposure, temp Tasks stay | User | Decided |
| DEC-002 | Keep `create_or_update_task` as an alias? | clean cut vs. compatibility | repo rule: no compatibility aliases | No alias; the old name is removed | Solution Designer | Decided |
| DEC-003 | Does `delegate_task` still return `task_id` to agents without `update_task`? | result shape | removing it would make the result depend on tools | Keep it; it identifies the Task and costs nothing | Solution Designer | Decided |
| DEC-005 | How do texts that every agent sees (`@` note, reactivation errors) satisfy REQ-005? (ARCH-F-002, ARCH-F-003) | an `@` note or error can reach agents without `update_task` | (a) tool-aware texts per focused agent / sender; (b) tool-neutral texts, guidance only in `update_task`'s description | (b): it meets the agreed rule ("mention closing only when the agent has `update_task`") without making shared texts depend on each agent's tools; an agent with `update_task` reads the guidance in that tool's description. | Solution Designer (user informed) | Decided (SR-003) |
| DEC-004 | How do existing configurations that list `create_or_update_task` keep working? Locally only the Project Task Manager package (`autobyteus-agents/agents/project-task-manager`) | the PTM must not lose its tools | user, 2026-10-15: agent configurations are not this ticket's scope; updating the PTM package is a follow-up Task for another agent (FU-1). This ticket neither rewrites configurations nor keeps an alias. | User | Decided |

## Traceability

| REQ | UC | BEH | AC | SCN |
| --- | --- | --- | --- | --- |
| REQ-001 | UC-003 | BEH-003 | AC-003 | SCN-003 |
| REQ-002 | UC-002, UC-003 | BEH-002, BEH-003 | AC-002, AC-003 | SCN-002, SCN-003 |
| REQ-003 | UC-003 | BEH-001, BEH-003 | AC-003 | SCN-003 |
| REQ-004 | UC-001 | BEH-001 | AC-001, AC-002, AC-006 | SCN-001 |
| REQ-005 | UC-001, UC-004 | BEH-002, BEH-004, BEH-005 | AC-001, AC-004, AC-005, AC-008 | SCN-001, SCN-004, SCN-005 |
| REQ-006 | UC-003 | BEH-003 | AC-007 | SCN-003 |

## Architecture Phase Input

- Map SCN-001..SCN-005. Facts to verify: where each text is built and whether it can see the agent's exposure; MCP manifest; agent configuration UI tool picker.

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
