# Requirements Document

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-003`
- Package identifier: `PROJ-TASKS-20260926-001`
- Request / ticket: `project-tasks` — description-only Project Tasks with an agent-owned status; no assignment or task admission
- Requirements owner: Solution Designer
- Date: 2026-09-26
- Approval state and reference: **Approved** by the user on 2026-09-26 with the reply "B + list, rest as recommended". The reply came after round-1 feedback (no title; no human status changes; the scope is create, view, edit, delete and search Tasks, delete Project, and not-done counts) and the user's question "which UI is user-friendly and clean". Reference: `APPROVAL-PROJ-TASKS-20260926-001`.
- Exact approved requirements baseline / solution revision: `SR-003`:
  - `REQ-001`–`REQ-016` (`REQ-004` withdrawn), `AC-001`–`AC-012`, `SCN-001`–`SCN-008` (`SCN-X01` rejected);
  - `DEC-012` = B (two-pane Projects page), `DEC-013` = list with status label and status filter;
  - `DEC-005`, `DEC-009` and `DEC-010` as recommended; all other decisions as resolved in round 1.
- Behavior-defining supplements and their approved versions: None
- Relationship to prior package: builds on released `PROJ-CONCEPT-20260926-001` (v1.4.86). It supersedes that package's `REQ-014`/`AC-012` and extends its `REQ-009`.

## Problem And Desired Outcome

- Problem: A Project can hold workspaces but not the work itself. There is nowhere to write down the work that belongs to a Project, which agents will later pick up and progress.
- Affected actors or systems: desktop users of Projects; Projects server subsystem and UI.
- Desired outcome: Inside a Project, a user writes Tasks as plain descriptions, sees them with their status, finds them by search, and can edit or delete them. Status belongs to agents: in this ticket no human changes it, and every new Task is To Do. Moving between Projects and their Tasks is quick (`DEC-012`).
- Observable definition of success: With Projects enabled, the user opens "AutoByteus", adds three Tasks by typing descriptions only, and finds one by search. They edit one and delete another, switch to a different Project and back, and everything is still there after restart. With Projects disabled, nothing is reachable. Agent and team runs, and their delegated tasks, are unchanged.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Related Scenario IDs | Evidence-Backed Current Behavior | Desired Behavior | Intentionally Preserved Behavior | Investigation Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | `SCN-001`–`SCN-004` | Project detail shows the Project and its workspaces; no Tasks (released `AC-012` forbids Task wording) | The selected Project also shows its Tasks with status, and supports create, view, edit, delete and search | Project name and description editing and workspace links are unchanged in behavior | `ProjectDetail.vue`; `ProjectDetail.spec.ts:81` |
| BEH-002 | User | `SCN-005` | Deleting a Project removes only its record and links | Deleting a Project also deletes its Tasks; the confirmation states the Task count | Workspaces, files and run history are never touched | `project-service.ts` `deleteProject` |
| BEH-003 | User/Operational | `SCN-006` | `ENABLE_PROJECTS` hides Projects | The same flag hides Tasks; there is no new flag | Flag semantics are unchanged | `docs/projects.md` |
| BEH-004 | User | `SCN-001`, `SCN-007` | Projects index is a card grid; card → `/projects/<id>` → Back link. Switching Projects takes 2 clicks, and other Projects are not visible from a Project | Navigation per `DEC-012`. Each Project entry shows its count of Tasks that are not Done | Deep link `/projects/<id>` keeps working | `ProjectsList.vue`, `ProjectCard.vue`, `ProjectDetail.vue` |
| BEH-005 | Contract | `SCN-008` | Execution-internal delegated tasks are shown in run and team surfaces | Unchanged, and never mixed with Project Tasks | All delegated-task behavior | locales; `task-delegation.ts` |
| BEH-006 | User | `SCN-001`–`SCN-004` | `No current supported behavior` | Proposed trigger: selected Project › Tasks | — | — |

## Stakeholders, Actors, And Outcomes

| Actor | Goal | Required Outcome | Constraint |
| --- | --- | --- | --- |
| Desktop user | Capture work for a Project quickly | Type a description; see, find, edit or delete Tasks; switch Projects easily | No title to invent; no manual status management |
| Agents (future Task-admission ticket) | Progress Tasks | Status field exists with the three states | Not implemented in this ticket |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

- `UC-001`: Create a Task in a Project by writing a description; it starts in To Do.
- `UC-002`: View a Project's Tasks with their status (layout per `DEC-013`).
- `UC-003`: Open a Task to read its full description; edit the description; delete it with confirmation.
- `UC-004`: Search the Project's Tasks by description.
- `UC-005`: Delete a Project together with its Tasks.
- `UC-006`: See each Project's count of Tasks that are not Done.
- `UC-007`: Move between Projects and their Tasks (per `DEC-012`).

### Out Of Scope

- Any human way to change a Task's status: drag, move menu, or a status field in edit. Status will be changed by agents in a later ticket.
- Task admission: assigning or delegating to an agent, team or org, the assignment UI, executions and runs from Tasks.
- Task title; priority, due dates, labels, comments, attachments, sub-tasks, extra columns, manual ordering.
- Moving Tasks between Projects; Tasks without a Project.
- Changes to execution-internal delegated tasks; mobile; cross-node sync.

### Non-Goals

- A human-operated issue tracker.

### Preserved Behavior Boundary

- `BEH-003` flag semantics and `BEH-005` delegated tasks are unchanged.
- The released Projects capabilities stay the same, except:
  - released `REQ-009` (deletion scope) is extended to include Tasks;
  - released `REQ-014`/`AC-012` are superseded;
  - released `REQ-008` (Projects index presentation) is revised by `REQ-016`: the card grid and separate Project page are replaced by the two-pane page.
- Existing Project records and workspace links remain intact (`REQ-012`).

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID that it protects.
- A finding that would introduce new product behavior, policy, threat model, migration obligation, compatibility promise, or operational contract is a `Requirement Gap`; it requires explicit user approval before becoming authoritative.
- An adjacent concern outside the approved boundary may be recorded as a non-blocking risk, recommendation, or separate-ticket candidate. It is not a required design correction.
- A downstream reviewer comment does not amend this requirements basis. The Solution Designer must update the canonical requirements and obtain renewed user approval before a scope-changing proposal can govern design or implementation.

## Requirements

| Requirement ID | Requirement | Related Behavior IDs | Priority | Rationale | Source / Decision |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | A Task shall belong to exactly one existing Project. It shall have a durable identity, a required multi-line plain-text description (trimmed, non-empty), a status, and creation and last-updated timestamps. A Task has **no title**. | `BEH-006` | Must | Users find titles hard to write | User round 1; `DEC-004` |
| REQ-002 | Wherever a Task is listed, its summary shall be the first non-empty line of its description, truncated to fit. The full description is shown when the Task is opened. | `BEH-001` | Must | Replaces the title for scanning | User round 1 |
| REQ-003 | Status shall be exactly one of `To Do`, `In Progress`, `Done`. New Tasks start in `To Do`. This ticket provides no user-facing way to change status; the edit dialog changes only the description. | `BEH-001` | Must | Status is managed by agents, not humans | User round 1; `DEC-001` |
| REQ-004 | *Withdrawn in `SR-002`* (drag and "Move to" status changes). | — | — | User: "tasks will not be moved by humans" | User round 1 |
| REQ-005 | The user shall be able to create a Task by entering a description, open a Task, edit its description, and delete it after confirmation. | `BEH-001` | Must | Basic management | User round 1 |
| REQ-006 | The Project's Tasks shall be shown as a single list. Each row shows a status label (text, not colour alone), the description summary (`REQ-002`) and a relative "updated" time, with most recently updated first. A status filter offers All / To Do / In Progress / Done (default All). There is no board in this ticket. | `BEH-001` | Must | See the Project's work | `DEC-013`, `DEC-005` |
| REQ-007 | A search shall filter the Project's Tasks by description. It shows a recoverable no-match state and does not change any Task. | `BEH-001` | Must | User: "we really need search" | User round 1 |
| REQ-008 | Deleting a Project shall also delete all its Tasks. The confirmation states how many Tasks will be deleted. Workspaces, files and run history remain untouched. | `BEH-002` | Must | Tasks cannot outlive their Project | `DEC-006` |
| REQ-009 | Each Project entry in the Projects list pane shall show its number of Tasks that are not Done. | `BEH-004` | Must | At-a-glance workload | User round 1; `DEC-007` |
| REQ-010 | Tasks shall be visible only where Projects are visible. There is no separate flag; data is kept when hidden. | `BEH-003` | Must | User | `ASM-002` |
| REQ-011 | This package supersedes released `REQ-014`/`AC-012`: Task vocabulary and counts are allowed on Project surfaces. | `BEH-001`, `BEH-004` | Must | Tasks are now a Project concept | This package |
| REQ-012 | Project Tasks shall stay distinct from execution-internal delegated tasks in the UI and in contracts. No delegated task is shown as, or converted into, a Project Task, and delegated-task surfaces are unchanged. | `BEH-005` | Must | Two meanings of "Task" | `RISK-002` |
| REQ-013 | Tasks shall persist per node across restarts. Existing Project records and workspace links shall remain intact and readable. | `BEH-002`, `BEH-003` | Must | Continuity | Released data |
| REQ-014 | Viewing and searching shall remain responsive with at least 100 Tasks in a Project. | `BEH-001` | Should | Scale | Draft `REQ-ATPTN-001` |
| REQ-015 | New strings shall be provided in `en` and `zh-CN`. All controls shall be keyboard operable with accessible names. | `BEH-001` | Must | Conventions | Released Projects |
| REQ-016 | The Projects module shall be one two-pane page, in the same style as Settings. The **left pane** shows search, "New Project", and the Project names with their not-done counts; the selected Project is highlighted. The **right pane** shows the selected Project: name, description, Edit, Delete, and tabs **Tasks** (default) and **Workspaces**. Selecting another Project is one click and keeps the left pane in place. `/projects/<id>` selects that Project. With no Project selected, the right pane invites the user to select or create one. At narrow widths the panes stack, as Settings does. This replaces the released Projects card grid and the separate Project page with its Back link. | `BEH-004` | Must | User asked how to move between Projects and Tasks | User round 1; `DEC-012` |

## Acceptance Criteria

| Acceptance-Criteria ID | Related Requirement IDs | Related Behavior / Scenario IDs | Preconditions / Trigger | Observable Expected Outcome | Alternate Or Failure Outcome | Verification Intent |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | `REQ-001`, `REQ-002`, `REQ-003`, `REQ-005` | `SCN-001` | Projects on; in a Project, New Task; type "Write release notes for 1.4.87\nInclude Projects and Tasks" | Task appears as To Do with summary "Write release notes for 1.4.87"; it survives reopen and restart | Empty or whitespace description is rejected with a field message and nothing is created | Unit + browser E2E |
| AC-002 | `REQ-003`, `REQ-006` | `SCN-002` | Project has Tasks | Each Task shows its status as text; newest updated first; there is no control to change status anywhere | Empty Project shows a calm empty state with New Task | Browser E2E + UI review |
| AC-003 | `REQ-005` | `SCN-003` | Open a Task; edit the description; save | The full new description is shown and the summary updates | Cancel discards changes; empty description rejected | Unit + browser E2E |
| AC-004 | `REQ-005` | `SCN-003` | Delete a Task | Confirmation, then the Task is removed | Cancel keeps it | Browser E2E |
| AC-005 | `REQ-007`, `REQ-014` | `SCN-002` | Project with 100+ Tasks; search "release" | Only Tasks whose description matches remain; clearing restores all | No match → no-match state; nothing changed | Browser E2E + perf check |
| AC-006 | `REQ-008` | `SCN-004` | Delete a Project with 5 Tasks | Confirmation mentions 5 Tasks; afterwards the Project and its Tasks are gone | Workspaces and run history unchanged; cancel keeps everything | Unit + integration |
| AC-007 | `REQ-009` | `SCN-007` | Project has 4 Tasks (all To Do in this ticket) | Its Project entry shows 4 not-done Tasks | Project without Tasks shows 0 without error | Browser E2E |
| AC-008 | `REQ-010` | `SCN-005` | Turn Projects off, then on | Hidden, then shown with the same Tasks | — | Browser E2E |
| AC-009 | `REQ-012` | `SCN-008` | Run a team that delegates tasks | Delegated tasks behave and display as before; no crossover with Projects | — | Existing suites + regression |
| AC-010 | `REQ-013` | `SCN-006` | Node with v1.4.86 Projects | After upgrade, all Projects and links are intact with no Tasks | — | Released-data fixture |
| AC-011 | `REQ-016` | `SCN-007` | Two Projects exist; user is viewing Project A's Tasks | One click on Project B in the left pane shows B's Tasks while the left pane stays in place; `/projects/<B id>` opens B with Tasks shown; `/projects` with no selection shows the select-or-create prompt | Unknown id → not-found state in the right pane; left pane still usable | Browser E2E |
| AC-012 | `REQ-011`, `REQ-015` | `SCN-001`–`SCN-003` | zh-CN; keyboard only | All Task strings are localised; every action is reachable by keyboard | — | Localisation guard + a11y |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor | Goal | Entry Surface | Starting Condition | Steps | Expected Outcome | Alternate / Error | Validity | Evidence | Related IDs |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | User | Work owner | Capture work | Selected Project › New Task | Projects on | Type description → create | Task in To Do; count updates | Empty rejected | Supported Normal (proposed) | User round 1 | `REQ-001`–`REQ-005`, `REQ-009` |
| SCN-002 | User | Work owner | See and find work | Selected Project › Tasks | Tasks exist | Scan; search | Correct list and filter | No match | Supported Normal (proposed) | User round 1 | `REQ-006`, `REQ-007` |
| SCN-003 | User | Work owner | Correct or remove work | Task dialog | Task exists | Edit description / delete | Persisted / removed | Cancel | Supported Normal (proposed) | User round 1 | `REQ-005` |
| SCN-004 | User | Work owner | Remove a Project | Project › Delete | Has Tasks | Confirm with count | Project + Tasks gone | Cancel | Supported Normal (proposed) | Released delete | `REQ-008` |
| SCN-005 | User/Operational | Operator | Hide the module | Settings toggle | Tasks exist | Off / on | Hidden / shown | — | Supported Normal | Released flag | `REQ-010` |
| SCN-006 | Operational | Upgrade | Keep released Projects | Upgrade from v1.4.86 | `projects.json` exists | Start | Intact | — | Supported Explicit Edge | Released data | `REQ-013` |
| SCN-007 | User | Work owner | Switch between Projects and their Tasks | Projects module | 2+ Projects | Open A's Tasks → switch to B's Tasks → back | Per `DEC-012` | Unknown id → not found | Supported Normal (proposed) | User round 1 | `REQ-016`, `REQ-009` |
| SCN-008 | Contract | Team execution | Delegate internally | Existing runs | Team run | As today | Unchanged | — | Supported Normal | Existing | `REQ-012` |
| SCN-X01 | User | — | Human changes Task status | — | — | Drag / move / edit status | — | — | `Technically Possible but Unsupported/Contrived` in this ticket: rejected by the user (agents own status) | User round 1 | `REQ-003`, `REQ-004` (withdrawn) |

## UI, Interaction, And Experience Requirements

- Applicable: `Yes`
- Linked supplement: None. Exploratory `REQ-ATPTN-001` `VIS-024`/`VIS-025` (board/list) and `VIS-124` (sidebar Active projects) are non-normative references for `DEC-012`/`DEC-013`.
- UI/UX confirmation: `N/A`
- Normative details (approved with `DEC-012`/`DEC-013`):
  - Released Projects visual conventions apply.
  - Left pane: search, "New Project", Project names with not-done counts. No cards or descriptions there.
  - Right-pane header: name, description, and Edit and Delete as small buttons. Tabs: Tasks (default) and Workspaces.
  - Task rows: status label, first line of the description, relative updated time. Clicking a row opens a dialog with the full description, Edit and Delete.
  - "New Task" opens the same dialog with one large multi-line text box.
  - An empty Project shows one friendly line and the New Task button.
  - The Task dialog follows `ProjectDialogFrame`.
- Required states: loading, error, empty Project, no-match, dialog validation, Task delete confirmation, Project delete confirmation with Task count, not-found Project.
- Unresolved: none.

## Quality And Non-Functional Requirements

| Quality ID | Related IDs | Area | Constraint | Scope | Verification |
| --- | --- | --- | --- | --- | --- |
| QR-001 | `REQ-013`, `REQ-008` | Reliability | Writes are atomic; deleting a Project never leaves orphaned Tasks or a half-deleted Project | Server | Injected-failure tests |
| QR-002 | `REQ-014` | Performance | Search over 100+ Tasks < 100 ms client-side | UI | Perf check |
| QR-003 | `REQ-015` | Accessibility | Keyboard-only operation; accessible names; status not colour-only | UI | a11y assertions |

## Data Continuity And Acceptable Loss

- Persisted data affected: `Yes` — new Task records; released Project records must stay intact.
- Acceptable loss: none, except Tasks deleted along with their Project by design.
- Unknowns: storage mechanism (architecture). The user prefers files.

## External Contracts And Dependencies

| Contract | Constraint | Evidence | Risk |
| --- | --- | --- | --- |
| Released Projects GraphQL API | Existing operations keep working; Task operations are additive | `projects.ts` | Naming collision with `TaskDelegation*` |
| Delegated-task contracts | Unchanged | `task-delegation.ts` | — |

## Supplemental Artifacts

| Artifact Path | Purpose | Related IDs | Status | Approval Applicability |
| --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/project-tasks/tickets/in-progress/project-tasks/investigation-notes.md` | Evidence | All | Current | Evidence |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/project-tasks/tickets/done/projects-concept-introduction/requirements-doc.md` | Released Projects requirements | `REQ-011`, `REQ-016` | Done | Context |
| container `…/REQ-ATPTN-001/…/VIS-024`, `VIS-025`, `VIS-124` | Exploratory board, list, sidebar | `DEC-012`, `DEC-013` | External | Non-normative |

## Assumptions

| Assumption ID | Assumption | Status |
| --- | --- | --- |
| ASM-001 | No assignment, admission, executions, title, priority, due dates, labels, extra columns, or human status changes | Accepted (approval) |
| ASM-002 | No new flag; `ENABLE_PROJECTS` governs Tasks | Accepted (approval) |

## Open Decisions And Questions

| Decision ID | Question | Why It Matters | Options / Recommendation | Owner | Status |
| --- | --- | --- | --- | --- | --- |
| DEC-001 | Status states | Model | To Do / In Progress / Done, fixed; changed only by agents in future | User | Resolved in round 1 (pending formal approval) |
| DEC-002 | Board/List toggle | — | Superseded by `DEC-013` | — | Superseded |
| DEC-003 | Human status moves | — | None | User | Resolved in round 1: withdrawn |
| DEC-004 | Fields | Simplicity | Description only (required); no title | User | Resolved in round 1 |
| DEC-005 | Order | — | Most recently updated first; no manual ordering | User | Resolved (approved as recommended) |
| DEC-006 | Project delete with Tasks | — | Cascade; confirmation shows count | User | Resolved in round 1 ("delete a project") (pending formal approval) |
| DEC-007 | Not-done count on Projects | — | Yes | User | Resolved in round 1 |
| DEC-008 | Board placement | — | Superseded by `DEC-012` | — | Superseded |
| DEC-009 | Task opens in dialog vs page | Scope | Dialog | User | Resolved (approved as recommended) |
| DEC-010 | Prototype first | Speed | No | User | Resolved (approved as recommended) |
| DEC-011 | Task admission excluded | Scope | Confirmed by the user's round-1 description | User | Resolved in round 1 |
| DEC-012 | How to navigate between Projects and their Tasks | User question | A) keep card grid → Project page with Tasks/Workspaces tabs → Back (2 clicks to switch). **B) Recommended: two-pane Projects page** — left project list (search, New Project, not-done count), right the selected Project with Tasks (default) and Workspaces tabs; `/projects/<id>` selects it (1 click to switch). C) Projects expand as a tree under the app sidebar's Projects item (1 click from anywhere; changes global shell) | User | Resolved: **B** (`APPROVAL-PROJ-TASKS-20260926-001`) |
| DEC-013 | Layout of a Project's Tasks when only agents change status (every Task is To Do for now) | Two of three board columns would be empty until admission ships | **Recommended: a single list with a status badge and a status filter (All / To Do / In Progress / Done)**; a board can come with admission. Alternative: three-column board now (two columns empty for now) | User | Resolved: **list** (`APPROVAL-PROJ-TASKS-20260926-001`) |

## Traceability

| Requirement ID | Use-Case IDs | Behavior IDs | AC IDs | Scenario IDs |
| --- | --- | --- | --- | --- |
| REQ-001 | `UC-001` | `BEH-006` | `AC-001` | `SCN-001` |
| REQ-002 | `UC-001`, `UC-002` | `BEH-001` | `AC-001`, `AC-003` | `SCN-001`, `SCN-003` |
| REQ-003 | `UC-002` | `BEH-001` | `AC-001`, `AC-002` | `SCN-001`, `SCN-002` |
| REQ-005 | `UC-001`, `UC-003` | `BEH-001` | `AC-001`, `AC-003`, `AC-004` | `SCN-001`, `SCN-003` |
| REQ-006 | `UC-002` | `BEH-001` | `AC-002` | `SCN-002` |
| REQ-007 | `UC-004` | `BEH-001` | `AC-005` | `SCN-002` |
| REQ-008 | `UC-005` | `BEH-002` | `AC-006` | `SCN-004` |
| REQ-009 | `UC-006` | `BEH-004` | `AC-007` | `SCN-007` |
| REQ-010 | — | `BEH-003` | `AC-008` | `SCN-005` |
| REQ-011 | `UC-002`, `UC-006` | `BEH-001`, `BEH-004` | `AC-012` | `SCN-001` |
| REQ-012 | — | `BEH-005` | `AC-009` | `SCN-008` |
| REQ-013 | — | `BEH-002`, `BEH-003` | `AC-010` | `SCN-006` |
| REQ-014 | `UC-004` | `BEH-001` | `AC-005` | `SCN-002` |
| REQ-015 | all | `BEH-001` | `AC-012` | `SCN-001`–`SCN-003` |
| REQ-016 | `UC-007` | `BEH-004` | `AC-011` | `SCN-007` |

## Architecture Phase Input

- Constraints:
  - file-based storage is preferred;
  - released `projects.json` must stay readable;
  - Project deletion and its Tasks must be atomic;
  - no `TaskDelegation*` naming collision;
  - no status mutation API is needed for users in this ticket (agent-driven status arrives later).
- Deferred: storage shape; GraphQL shape; component structure for the chosen `DEC-012`/`DEC-013`.

## Readiness Check

### Content Ready For Approval

- Content ready for user approval: `Yes`

### Approved Basis Ready For Design

- User approval received: `Yes` — `APPROVAL-PROJ-TASKS-20260926-001`
- Exact basis recorded: `Yes` — `SR-003`
- Ready for architecture design: `Yes`
