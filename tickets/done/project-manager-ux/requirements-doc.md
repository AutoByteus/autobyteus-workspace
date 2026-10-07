# Requirements Document

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-003`
- Package identifier: `project-manager-ux`
- Request / ticket: Make managing a Project through the Project Task Manager feel native in the UI (user conversation, 2026-10-06). Narrowed by the user in Product round 1; extended with Temp tasks (Tasks with no Project) in Product round 2 (2026-10-07).
- Requirements owner: Solution Designer
- Date: 2026-10-07
- Approval state and reference: Approved by the user on 2026-10-07: "But I think other requirements are already clear, clarified. Yes, now you can go ahead now." This followed "Is it all clarified now…?", the Solution Designer's answer that no decisions remain, and the event-approach discussion; the user left event design to the Solution Designer ("it's up to you how you design this for events"). The user also confirmed that Temp tasks get no automatic IN_PROGRESS for now (DEC-009). Product UI/UX confirmations:
  - round 1, 2026-10-07: "Perfect, I'm satisfied. I'm satisfied now. It's confirmed.";
  - round 2, 2026-10-07: "Perfect, I think this is what I want ... it seems good now" / "Good job. Yes. Yes".
- Exact approved requirements baseline / solution revision: SR-003 (BEH-001..006, REQ-002..004, REQ-007..016, AC-001..023, SCN-002..006, DEC-001..010 incl. the DEC-006 deviation from VIS-004/008/016)
- Behavior-defining supplements and their approved versions: Product UI/UX spec `project-manager-ux` (design repo `autobyteus-web-design`). Round 1: design `1fcf8f8`, close `eb60aba`. Round 2: design `492d37a`, close `8cd41f8` (round-1 surfaces unchanged). User-confirmed as above. Approval of these requirements must cover it.

## Problem And Desired Outcome

- Problem: The Project Task Manager (or any agent with the Project tools) creates Projects and Tasks and delegates Tasks to agents and teams. The Projects pages show those changes only after a manual Refresh. A Task does not show who it was handed to. From a Projects page, clicking a worker row in the left panel sometimes only highlights it instead of opening it (F-006).
- Affected actors or systems: Desktop user with Projects enabled; agents using the Project tools; delegated agent/team runs.
- Desired outcome: The Projects pages act as the whiteboard. The user keeps the Manager as an ordinary run in the left panel, opens Projects while chatting, and sees Projects and Tasks appear and move as the agent works. Each delegated Task shows the one agent or team it was handed to, with its status, and one click opens it.
- Observable definition of success: With no Refresh, a Task created by an agent appears on its board. It moves when an agent changes its status. Once delegated, it shows its agent/team with a status. Clicking that opens the run's conversation. Every left-panel row opens its conversation from any page.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Related Scenario IDs | Evidence-Backed Current Behavior | Desired Behavior | Intentionally Preserved Behavior | Investigation Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | — | Manager is an ordinary run; not tied to a Project | **Unchanged (user decision 2026-10-07)**: no Manager entry, binding or marking | Chat/`@`/"+" start of any agent | investigation-notes BEH-001; ui-ux-spec "Alternatives rejected" |
| BEH-002 | User | SCN-002 | Agent-made Project/Task changes appear only after manual Refresh | They appear live on the Projects list, board and Task page, with a 2.4 s highlight on arrived/moved board rows | Refresh button, search, ordering, manual authoring | investigation-notes BEH-002; ui-ux-spec TR-001..004 |
| BEH-003 | User | SCN-003, SCN-005 | Task pages do not show who the Task was handed to | Each delegated Task shows its root (the agent/team it was handed to) with a status; Running/Idle roots open | Delegation semantics; DONE closure | investigation-notes BEH-003; ui-ux-spec UXJ-002/003 |
| BEH-004 | User | SCN-005 | DONE stops the Task's runs; their rows leave the left panel | Additionally, the Task's root shows **Offline** (the worker's real state) and cannot be opened until it is reactivated | DONE closure behavior unchanged | docs/agent_teams.md; DEC-006 |
| BEH-006 | User | SCN-006 | Tasks with no Project (created by description-only `delegate_task`, start TODO, agents usually set only DONE, deleted with their chat) are not shown anywhere in the UI | A "Temp tasks" button on the Projects page opens a read-only board (Open / Done) and Task page, live, with the root line | Projects board and Project cards unchanged | ui-ux-spec Round 2; investigation notes |
| BEH-005 | User | SCN-004 | Left panel stays mounted across pages (`layouts/default.vue`); a row click on a run that is already selected does nothing from a Projects page (`AgentRunTaskRows.vue` `if (!props.runSelected) emit('select-run')`) | Left panel keeps its state across pages (preserved); every row click opens its conversation from any page | Selection and expansion behavior within Chat/Workspace | ui-ux-spec F-005, F-006; product-ticket.md |

## Stakeholders, Actors, And Outcomes

| Actor / Stakeholder | Goal Or Responsibility | Required Outcome | Important Constraint |
| --- | --- | --- | --- |
| Desktop user | Watch a Project's work and reach its workers | Live Projects pages; Task → root link; left-panel clicks always open | Projects behind `ENABLE_PROJECTS`; desktop only |
| Agent using the Project tools (e.g. Project Task Manager) | Create/update Projects and Tasks; delegate Tasks | Its changes become visible without the user refreshing | No change to tool contracts or agent behavior |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Related Scenario IDs |
| --- | --- | --- |
| UC-002 | Watch the Projects list, board and Task page change live while an agent works | SCN-002 |
| UC-003 | See the agent/team a Task was handed to, with its status, and open it | SCN-003, SCN-005 |
| UC-005 | Use the left panel from any page: state kept, every row click opens | SCN-004 |
| UC-006 | See and open Temp tasks (Tasks with no Project) separately from Projects, live | SCN-006 |

(UC-001 and UC-004 are dropped; IDs are not reused.)

### Out Of Scope

- Any Manager-specific entry, bar, Project binding, marking, header chips or New chat "For <Project>" binding (rejected by the user).
- A Tasks tab beside the chat; Project grouping or Task labels in the left panel (rejected).
- Listing helper runs started by a worker on a Task (rejected for this delivery; see DEC-007).
- Task cards in the conversation (DEC-004, not built, not requested).
- Changing Task semantics, statuses, delegation, DONE closure, agent tool contracts, or the Project Task Manager agent.
- Mobile; the `ENABLE_PROJECTS` default; the Task editor.
- For Temp tasks: a "From <conversation>" line (rejected in round 2); a card among the Projects (rejected); three columns (DEC-009); any UI editing, deleting, uploading or moving a Temp task into a Project; any server-side automatic status change.

### Non-Goals

- No status control, auto-dispatch or auto-DONE in the UI.
- No guarantee that the live update replaces Refresh in every failure case. Refresh stays the fallback.

### Preserved Behavior Boundary

- BEH-001 (unchanged), the preserved columns of BEH-002..BEH-005, and REQ-007.
- Invariant: no Project, Task, Task context, run history or Task run resource is changed or deleted by this work.

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID that it protects.
- A finding that would introduce new product behavior, policy, threat model, migration obligation, compatibility promise, or operational contract is a `Requirement Gap`; it requires explicit user approval before becoming authoritative.
- An adjacent concern outside the approved boundary may be recorded as a non-blocking risk, recommendation, or separate-ticket candidate. It is not a required design correction.
- A downstream reviewer comment does not amend this requirements basis. The Solution Designer must update the canonical requirements and obtain renewed user approval before a scope-changing proposal can govern design or implementation.

## Requirements

| Requirement ID | Requirement | Related Behavior IDs | Priority | Rationale | Source / Decision Reference |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | Dropped (no Manager entry point). | BEH-001 | — | User decision | Product review 2026-10-06/07 |
| REQ-002 | The user sees the Project's Tasks on the Projects pages, next to the left panel, while talking to the Manager. No Tasks surface is added to the conversation. | BEH-002 | High | Changed by user | ui-ux-spec "Open Decisions" |
| REQ-003 | Project creations and edits, and Task creations, edits and status changes, made by agents, appear on the open Projects list, Project board and Task page without a manual Refresh. Board rows that arrive or move get the approved 2.4 s highlight. Counts follow. | BEH-002 | High | Core request | ui-ux-spec TR-001..004 |
| REQ-004 | Each Task that has been handed to an agent or team shows exactly one root: the latest agent or team that a run assigned it to with `delegate_task`. The root shows its name, kind (agent/team) and **the worker's own status, with the same dot and word as its left-panel row**: Running, Initializing, Idle, Error or Offline (a team shows its team status). A worker closed by DONE is Offline. The one Task-specific state is **Couldn't start** (red, with the start error), for a worker that never started. Task status and worker status are independent. Helper runs are not shown. A Task never delegated shows no root (board) or "Not assigned to an agent or team yet." (Task page). | BEH-003, BEH-004 | High | Narrowed to root by user; status mirrors the worker (user, 2026-10-07) | ui-ux-spec UXJ-002/003; DEC-006 |
| REQ-005 | Dropped (no Manager marking). | BEH-001 | — | User decision | Product review |
| REQ-006 | Dropped (no Manager entry, so no "no manager" state). | BEH-001 | — | User decision | Product review |
| REQ-007 | The left panel keeps its runs, expansion and selection while the user moves between Chat, Workspace and the Projects pages (preserved product behavior). | BEH-005 | High | F-005 | product-ticket.md |
| REQ-008 | A click on any left-panel run row (agent run, team, team member, delegated or collaborator row) opens that conversation from any page, including when that run is already selected. | BEH-005 | High | F-006 defect | product-ticket.md; `AgentRunTaskRows.vue` |
| REQ-009 | A root can be opened when its worker is listed in the left panel (started and not closed by DONE), whatever its status, including Offline after an idle pause. Opening it opens its conversation inside the run that hosts it, with the root selected in the left panel; a team root opens its coordinator, with the team expanded. A worker closed by DONE (Offline, muted, no ›) and a Couldn't start root cannot be opened. | BEH-003 | High | User-confirmed design; DEC-006 | ui-ux-spec TR-005, VIS-009 |
| REQ-010 | The visual, copy (en/zh-CN), motion, responsive and accessibility details follow the approved UI/UX spec (rounds 1 and 2), within its stated permitted variations. | BEH-002..006 | High | Normative design | ui-ux-spec |
| REQ-011 | The Projects page header shows a "Temp tasks" button (left of "New project") with an "N open" pill that counts Temp tasks not DONE, hidden at 0, and follows live. Temp tasks never appear as a card among the Projects. | BEH-006 | High | Round 2 decision 2 | ui-ux-spec UIS-005, VIS-011 |
| REQ-012 | The Temp tasks board lists every Task with no Project in two lanes, Open (TODO + IN_PROGRESS) and Done, in the Project board style, with search and Refresh and no New task. Done shows the 10 most recent, then "Show all (N)" / "Show fewer". Search filters both lanes and shows every match. | BEH-006 | High | Round 2 decisions 3, 6 | UIS-006, VIS-012/013/018, TR-013/014 |
| REQ-013 | Temp task rows and the Temp task page use the round-1 root line and its rules (REQ-004, REQ-009). | BEH-006 | High | Round 2 decision 4 | VIS-012, VIS-014..016 |
| REQ-014 | The Temp task page is read-only. It shows a badge (Open/Done), the Description, "Reference files (N)" as paths, "Assigned to", and "Only agents change this Task." There is no Edit, Delete or upload. | BEH-006 | High | Round 2 decisions 4, 7 | UIS-007, VIS-014..016 |
| REQ-015 | Temp tasks follow live, with the round-1 highlight: creation (arrives in Open); DONE (moves to Done); the agent's reopen (moves back to Open); and deletion with their chat (leaves the board, DEC-010). The open count follows. | BEH-006 | High | Round 2 decision 7; REQ-003 parity | TR-010..012, VIS-017 |
| REQ-016 | After the assigning agent reopens a DONE Task, the root stays Offline and not openable until the agent messages that worker. The worker is then reactivated, and the root shows its live status and can be opened again (DEC-008). Applies to Project Tasks and Temp tasks. | BEH-003, BEH-004 | High | Consistency with `reactivate-done-task-runs` | DEC-008 |

## Acceptance Criteria

| AC ID | Related REQ | Related BEH / SCN | Preconditions / Trigger | Observable Expected Outcome | Alternate Or Failure Outcome | Verification Intent |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-003 | BEH-002 / SCN-002 | Projects list open; an agent creates or edits a Project | The card appears or updates without Refresh; open Task counts follow its Tasks | Live update unavailable → last state kept; Refresh works as today | E2E with a real agent tool call |
| AC-002 | REQ-003, REQ-010 | BEH-002 / SCN-002 | Board open; an agent creates a Task | The row appears at the top of To Do with the arrived highlight (2.4 s; static under reduced motion); count +1 | Same fallback | E2E + component test |
| AC-003 | REQ-003, REQ-010 | BEH-002 / SCN-002 | Board open; an agent changes a Task's status or text | The row shows in its new column/text with the moved highlight; counts update; search filter still applies | Same fallback | E2E |
| AC-004 | REQ-003 | BEH-002 / SCN-002 | Task page open; an agent changes this Task or delegates it | Status badge and "Assigned to" update in place | — | E2E |
| AC-005 | REQ-004 | BEH-003 / SCN-003 | Task delegated by a run's `delegate_task(task_id)` and running | Board row shows the root line (avatar/bolt, name, Running or Idle, ›); Task page shows "Assigned to" with the root and the help line | — | E2E + component |
| AC-006 | REQ-004 | BEH-003 / SCN-003 | The worker the Task was handed to starts its own helpers | Only the root is shown on the Task | — | E2E / API |
| AC-007 | REQ-004 | BEH-003 / SCN-005 | Delegation failed to start | Root shows red "Couldn't start"; reason as tooltip on the board and under the row on the Task page; not openable; Task stays in its column | Re-delegation → the root shows only the new delegation | API + component |
| AC-008 | REQ-004, REQ-009 | BEH-004 / SCN-005 | Agent sets the Task DONE | Root shows Offline (grey dot), muted, no ›, not openable, no help line; runs leave the left panel as today | Task reopened by the agent → root stays Offline until the assigner messages the worker (AC-023) | E2E |
| AC-009 | REQ-004 | BEH-003 | Task never delegated | No root line on the board; Task page shows "Not assigned to an agent or team yet." | — | Component |
| AC-010 | REQ-009 | BEH-003 / SCN-003 | Root Running/Idle (agent) | Click (or Enter/Space) opens the hosting run's conversation with the root selected in the left panel | — | E2E |
| AC-011 | REQ-009 | BEH-003 / SCN-003 | Root Running/Idle (team) | Click opens the coordinator's conversation; the team is expanded in the left panel | — | E2E |
| AC-012 | REQ-007 | BEH-005 / SCN-004 | Left panel expanded with a run selected | Navigating Chat ↔ Projects list ↔ board ↔ Task page keeps runs, expansion and selection | — | E2E (preservation) |
| AC-013 | REQ-008 | BEH-005 / SCN-004 | User on a Projects page; the run is already selected | Clicking that run, or any of its member/delegated rows, opens its conversation | — | E2E + component |
| AC-014 | REQ-010 | — | Board container < 752 px | Columns stack; root line spans the row with status on the right | — | Browser screenshot vs VIS-010 |
| AC-016 | REQ-011 | BEH-006 / SCN-006 | Projects page; Temp tasks exist | "Temp tasks" button with "N open" left of "New project"; no pill at 0; no Temp tasks card in the grid; the count follows live | — | E2E + screenshot vs VIS-011 |
| AC-017 | REQ-012 | BEH-006 / SCN-006 | Open the Temp tasks board | Open and Done lanes; Done shows 10 + "Show all (N)" when more; "Show fewer" returns; search filters both lanes and shows every Done match; no New task | Load/refresh failure as the Project board | E2E + component |
| AC-018 | REQ-013, REQ-014 | BEH-006 / SCN-006 | Open a Temp task page | Badge, Description, "Reference files (N)" paths, "Assigned to" with round-1 states, "Only agents change this Task."; no Edit/Delete/upload | Missing Task → "Task not found" + "Back to tasks" | Component + screenshot vs VIS-014..016 |
| AC-019 | REQ-015 | BEH-006 / SCN-006 | Board open; an agent delegates with a plain description | The row arrives at the top of Open with the highlight; count +1 | Live update unavailable → Refresh | E2E with a real `delegate_task` |
| AC-020 | REQ-015 | BEH-006 / SCN-006 | Board open; the agent sets that Task DONE | The row moves to Done with the highlight; root Offline, not openable; count −1 | — | E2E |
| AC-021 | REQ-015 | BEH-006 / SCN-006 | Board open; the chat that hosts Temp tasks is permanently deleted | Its Temp tasks leave the board live; count follows | — | E2E |
| AC-022 | REQ-012 | — | Board container < 752 px | The lanes stack | — | Screenshot vs VIS-018 |
| AC-023 | REQ-016, REQ-015 | BEH-003, BEH-006 / SCN-005, SCN-006 | DONE Task (Project or Temp) whose assigning agent sets TODO/IN_PROGRESS, then messages the worker | After the status change: the Task moves to its open column/lane with the moved highlight; the root stays Offline, not openable. After the message: the root shows Running/Idle and is openable again; the run is back in the left panel (VIS-017). | Message refused → root stays Offline | E2E with real reactivation |
| AC-015 | Preserved | BEH-002 | Any | Manual Task create/edit/delete, search, Refresh, ordering and read-only status behave as before; Projects hidden when `ENABLE_PROJECTS` is off | — | Existing Projects E2E |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor | Goal | Trigger / Entry Surface | Starting Condition | Steps | Expected Outcome | Alternate / Error | Validity | Evidence | Related REQ / AC |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | — | — | Dropped (Manager entry point) | — | — | — | — | — | Rejected by user | ui-ux-spec | — |
| SCN-002 | User | Desktop user | Watch the agent's work appear | Agent calls Project/Task tools while the user has a Projects page open | Projects enabled | User starts the Manager like any agent → opens Projects → Project and Tasks appear and move | Pages follow without Refresh | Live update lost → Refresh | Supported Normal Scenario | ui-ux-spec UXJ-001 | REQ-002, REQ-003; AC-001..004 |
| SCN-003 | User | Desktop user | Reach the worker on a Task | Click the root on the board or Task page | Task delegated, root running | Click → conversation opens with the root selected | Worker conversation | Team → coordinator | Supported Normal Scenario | ui-ux-spec UXJ-002 | REQ-004, REQ-009; AC-005, 006, 010, 011 |
| SCN-004 | User | Desktop user | Move between Chat and Projects without losing context | Navigation / left-panel row click | Left panel in use | Navigate; click rows | State kept; every click opens | — | Supported Normal Scenario | ui-ux-spec UXJ-004 | REQ-007, REQ-008; AC-012, 013 |
| SCN-006 | User | Desktop user | See the work agents handed out in chats | "Temp tasks" button on the Projects page | Projects enabled; agents delegated with plain descriptions | Open board → read rows/roots → open a Task or its root | Live Open/Done view; root reachable | Chat deleted → its Temp tasks leave | Supported Normal Scenario | User 2026-10-07; ui-ux-spec Round 2 | REQ-011..016; AC-016..023 |
| SCN-005 | User | Desktop user | See a Task's outcome | Agent sets DONE, or delegation fails | Task delegated | Status/root updates | Offline (closed) / Couldn't start | Re-delegation replaces the root | Supported Normal Scenario | ui-ux-spec UXJ-003 | REQ-004; AC-007, 008 |

## UI, Interaction, And Experience Requirements

- Applicable: `Yes`
- Linked UI/UX or interaction supplement: `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/project-manager-ux/ui-ux-spec.md`
- Linked runnable UI reference, design repository/root, and support artifacts: design repository `/Users/normy/autobyteus_org/autobyteus-web-design` (run instructions in the spec); capture steps `tickets/done/project-manager-ux/review-evidence/`
- Product ticket record and folder (externally owned): `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/project-manager-ux/product-ticket.md`
- Design repository revision or commit: branch `design/project-manager-ux`. Round 1: from `a38bd6e`, design `1fcf8f8`, close `eb60aba`. Round 2: fast-forwarded to `5e93a70`, design `492d37a`, close `8cd41f8` (= `origin/personal` of the design repo).
- UI/UX user-confirmation reference: round 1, 2026-10-07: "Perfect, I'm satisfied. I'm satisfied now. It's confirmed."; round 2, 2026-10-07: "Perfect, I think this is what I want ... it seems good now" / "Good job. Yes. Yes".
- Approved visual-reference baseline: `visual-references/VIS-001` … `VIS-018` (1440×900; VIS-010 and VIS-018 at 1024×768)
- Normative visual and interaction details: everything visible in VIS-001..018 (round-2 route `/projects/no-project` and list id illustrative) and specified in the spec's Visual Language, State Behavior, Content, Motion, Accessibility and Implementation Fidelity sections
- Explicitly illustrative content / permitted variation: names, Task texts, Project descriptions, counts, failure reason text; how many rows are highlighted at once (per spec)
- Required states: board row not delegated / Running / Initializing / Idle / Error / Offline (open: openable; closed by DONE: muted, not openable) / Couldn't start / arrived / moved; Task page not assigned / live statuses / Offline (closed) / Couldn't start; Temp tasks button, board lanes, Show all/fewer, read-only Task page
- User-decided deviation from the approved visuals (2026-10-07, DEC-006): the root's "Stopped" label in VIS-004, VIS-008 and VIS-016 (and its use in VIS-012/013) is replaced by the worker's real status, Offline (grey dot, muted name, no ›). Initializing (amber), Error (red) and Offline (grey) reuse the left panel's `StatusDot` colors and words (`utils/workspaceStatusDotPresentation.ts`; `workspace.history.hierarchy.status.*`). No other visual change.
- Explicitly unresolved product decisions: None (DEC-009 is a recommendation, out of scope)

## Quality And Non-Functional Requirements

| Quality ID | Related REQ / AC | Area | Measurable Requirement Or Constraint | Conditions / Scope | Verification Intent |
| --- | --- | --- | --- | --- | --- |
| QR-001 | REQ-003; AC-001..004 | Performance | An agent's change appears on an open Projects page within about 2 s on a local node | Desktop, local server | E2E timing assertion |
| QR-002 | REQ-003 | Reliability | A missed or failed live update never corrupts the shown state; after reconnection or Refresh the page matches the server | — | E2E with interrupted stream |
| QR-003 | REQ-009, REQ-010 | Accessibility | Root is a native button (Enter/Space), named "Open <name>"; non-openable roots not focusable; status is text, not color alone | — | Component test |

## Data Continuity And Acceptable Loss

- Persisted or external data affected: `No` new persisted data is required by these requirements. The root comes from the existing per-Task run resources. Architecture confirms this.
- Data or state that must be preserved: All Projects, Tasks, context, run history and Task run resource files.
- Loss, reset, rebuild, or regeneration that is acceptable: None.
- Unknowns: Older Tasks whose run resource file is missing or damaged. Expected outcome: no root, or the existing `assignmentsUnavailable` handling, without breaking the page.

## External Contracts And Dependencies

| Contract / Dependency | Required Behavior Or Constraint | Evidence / Authority | Uncertainty Or Risk |
| --- | --- | --- | --- |
| Project/Task agent tools (`create_or_update_project`, `create_or_update_task`, `delegate_task`) | Unchanged; their effects must trigger live updates | docs/projects.md; server projects.md | Every write path must publish (ui-ux-spec risk) |
| Task run resources (`agent_run_resources.json`) | Source of the root, its start state, its error and its closed state | `task-agent-resources.ts` | Live run status comes from the runtime, not the file |

## Supplemental Artifacts

| Artifact Path | Purpose | Related REQ / AC | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/project-manager-ux/ui-ux-spec.md` (rounds 1 and 2) + `visual-references/` VIS-001..018 | Normative UI/UX | REQ-002..016 | Both rounds user-confirmed 2026-10-07 | Behavior-defining; part of this approval |
| `product-design-request-r2.md` (this folder) | Round-2 handoff context | — | Completed | Not behavior-defining |
| `product-design-request.md` (this folder) | Product handoff context | — | Completed | Not behavior-defining |

## Assumptions

| Assumption ID | Assumption | Why It Is Necessary | Validation Plan / Owner | Status |
| --- | --- | --- | --- | --- |
| ASM-001 | The root is the latest `assigned` entry in the Task's run resources, whichever run assigned it | Defines "root" without a Manager concept (DEC-002 moot) | Architecture | Open |

## Open Decisions And Questions

| ID | Question | Why It Matters | Options / Evidence | Decision Owner | Status |
| --- | --- | --- | --- | --- | --- |
| DEC-001 | Entry point | — | No new entry point | User | Resolved 2026-10-07 |
| DEC-002 | Which agent is the manager | — | Moot: any agent with the Project tools updates the board | User | Resolved |
| DEC-003 | Manager conversations per Project | — | Moot (no binding) | User | Resolved |
| DEC-004 | Phasing | — | This delivery: live pages + Task → root + left-panel fixes; chat Task cards not requested | User | Resolved |
| DEC-005 | Behind `ENABLE_PROJECTS` | — | Yes | User | Resolved |
| DEC-006 | Root states the design did not cover (paused after going quiet; starting) | — | **User decision (2026-10-07):** the worker line reflects the worker itself, with the same status as its left-panel row (Running, Initializing, Idle, Error, Offline; teams show team status). "Task is task, worker is worker." Closed by DONE = Offline (user: "if you move the task to done… they are just offline"). Couldn't start stays as the one Task-specific state. | User | Resolved 2026-10-07 |
| DEC-008 | What does a reopened Task's root show before the worker is messaged? | A status change alone reopens no run | The root stays Offline, not openable, until the assigning agent messages the worker; then live status (REQ-016, AC-023) | User | Resolved 2026-10-07 (agreed with DEC-006) |
| DEC-009 | Option B from round 2 (user 2026-10-07: "currently let's not automatic in progress"): the server sets IN_PROGRESS when a Temp task is handed to its worker, so the three columns can be used | Conflicts with the rule the user set on 2026-10-07: "no automatic status change… the agent is not aware of it and this stays intransparent for the user" | **Recommend not doing it.** Keep Open/Done (the user's round-2 choice A). | User | Recommendation; not in scope |
| DEC-010 | Temp tasks of a permanently deleted chat | The server deletes them with the chat (`deleteAdHocTasksHostedBy`) | They leave the board live and the count follows (AC-021). User: "I think that works." | User | Resolved 2026-10-07 |
| DEC-007 | Can a Task later list every run linked to it, including helpers a worker started? | User asked | **Feasible.** The server already records each helper with its role (`delegated` / `broughtIn`) and the run that created it. Not in this delivery (user: "let's start simple"). Recommend a follow-up ticket. | User | Answered; follow-up candidate |

## Traceability

| REQ | UC | BEH | AC | SCN | Product Design Evidence |
| --- | --- | --- | --- | --- | --- |
| REQ-002 | UC-002 | BEH-002 | AC-001..004 | SCN-002 | UXJ-001 |
| REQ-003 | UC-002 | BEH-002 | AC-001..004 | SCN-002 | TR-001..004, VIS-001/002 |
| REQ-004 | UC-003 | BEH-003, 004 | AC-005..009 | SCN-003, 005 | VIS-003..008 |
| REQ-007 | UC-005 | BEH-005 | AC-012 | SCN-004 | F-005, VIS-003 |
| REQ-008 | UC-005 | BEH-005 | AC-013 | SCN-004 | F-006 |
| REQ-009 | UC-003 | BEH-003 | AC-010, 011 | SCN-003 | TR-005, VIS-009 |
| REQ-010 | UC-002, 003, 006 | BEH-002..006 | AC-002, 014, 022; QR-003 | — | Whole spec, VIS-010, VIS-018 |
| REQ-011 | UC-006 | BEH-006 | AC-016 | SCN-006 | VIS-011 |
| REQ-012 | UC-006 | BEH-006 | AC-017, 022 | SCN-006 | VIS-012, 013, 018 |
| REQ-013 | UC-006 | BEH-006 | AC-018 | SCN-006 | VIS-012, 014..016 |
| REQ-014 | UC-006 | BEH-006 | AC-018 | SCN-006 | VIS-014..016 |
| REQ-015 | UC-006 | BEH-006 | AC-019..021, 023 | SCN-006 | TR-010..012, VIS-017 |
| REQ-016 | UC-003, 006 | BEH-003, 004 | AC-008, 023 | SCN-005, 006 | DEC-008 |

## Architecture Phase Input

- Approved scenario IDs to map: SCN-002..SCN-006.
- Constraints to preserve: tool contracts; DONE closure; the left panel mounted in `layouts/default.vue`; Projects gating; per-node windows.
- Decisions deferred to architecture: a read of Tasks with no Project with roots (route/list id not prescribed); the push mechanism for Project/Task changes, covering Tasks with no Project (create, status, reopen/reactivation, deletion with the chat); how the root and its live status are exposed (GraphQL `ProjectTask`); where `AgentRunTaskRows` click navigation is fixed; how to resolve a root's host run for navigation.
- Technical facts to verify: every Task write path (tool, UI mutation, delegation start result, DONE closure) can publish; root status sources (run-resource `start`/`closedAt` plus runtime status); coordinator run for team roots.
- Known risks: missing a write path; consistency between push and Refresh snapshots; read cost of run resources on large boards.

## Readiness Check

### Content Ready For Approval

- Relevant current behavior is evidence-backed: `Yes`
- Desired and preserved behavior are explicit: `Yes`
- Scope and non-goals are clear: `Yes`
- Requirements and acceptance criteria are testable and traceable: `Yes`
- Applicable scenarios are covered with validity and evidence: `Yes`
- Product design and supplemental evidence is integrated consistently: `Yes`
- Applicable UI/UX approval and final visual-reference basis are recorded: `Yes`
- Material assumptions and open decisions are visible: `Yes` (DEC-006, DEC-008 and DEC-010 resolved by the user; DEC-009 recommendation)
- Content ready for user approval: `Yes`
- Remaining content blocker: None

### Approved Basis Ready For Design

- User approval received: `Yes` (2026-10-07)
- Exact requirements and supplement approval basis recorded: `Yes`
- Approved requirements package ready for architecture design: `Yes`
- Remaining blocker: None
