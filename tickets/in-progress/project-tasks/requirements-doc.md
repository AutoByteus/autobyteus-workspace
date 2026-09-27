# Requirements Document

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-008`
- Package identifier: `PROJ-TASKS-20260926-001`
- Request / ticket: `project-tasks` — description-only Project Tasks with an agent-owned status; no assignment or task admission
- Requirements owner: Solution Designer
- Date: 2026-09-26
- Approval state and reference: **Approved — `APPROVAL-PROJ-TASKS-20260927-002` (2026-09-27).**
  - Direction fixed by the user after rejecting the delivered two-pane build in verification ("terrible… super squeezed"): the released Projects grid; a separate full-width Project page with Back at top-left; a three-column Task board.
  - Detailed UX explicitly delegated by the user ("do a deep thinking about the user experience… pick the best user experience… then continue the work"), then constrained by "Don't make the UI complicated. The UI should stay clean enough."
  - The Solution Designer's choices (`DEC-014`–`DEC-016`; UX analysis and simplification in `investigation-notes.md`) are recorded under that authorization.
  - Superseded: `APPROVAL-PROJ-TASKS-20260926-001` (2026-09-26, "B + list, rest as recommended"; basis `SR-003`) for `REQ-006`, `REQ-007`, `REQ-009`, `REQ-016` and `AC-002`, `AC-005`, `AC-007`, `AC-011`. It remains the approval of record for all other requirements, which are unchanged.
- Exact approved requirements baseline / solution revision: `SR-008` requirements (content approved at `SR-006`/`SR-007`; `SR-008` is an editorial coherence correction plus the clarification of "narrow" in `REQ-006`, with no behavior change):
  - `REQ-001`–`REQ-016` (`REQ-004` withdrawn), `AC-001`–`AC-012`, `SCN-001`–`SCN-008` (`SCN-X01` rejected);
  - `DEC-012` = A (released grid → full-width Project page → Back); `DEC-013` = three-column board (the user accepted that only To Do is populated until admission);
  - `DEC-014` = plain Tasks/Workspaces tabs; `DEC-015` = count merged into the card's bottom line; `DEC-016` = simplified board choices;
  - `DEC-005`, `DEC-009`, `DEC-010` as recommended; all other decisions as resolved in round 1.
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
| BEH-004 | User | `SCN-001`, `SCN-007` | Projects index is a card grid; card → `/projects/<id>` → Back link. Switching Projects takes 2 clicks, and other Projects are not visible from a Project | Released navigation is kept: card grid → full-width Project page → Back (`DEC-012` = A, revised `SR-005`). Each Project card also shows its count of Tasks that are not Done | Deep link `/projects/<id>` keeps working | `ProjectsList.vue`, `ProjectCard.vue`, `ProjectDetail.vue` |
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
  - released `REQ-008` (Projects index presentation) is kept, with one addition by `REQ-009`/`REQ-016`: each card's bottom line also shows the open-task count. The released grid and separate Project page with Back remain the navigation.
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
| REQ-006 | The Project page shall show the Project's Tasks as a **three-column board** — To Do, In Progress, Done, in that order — using the full content width. Each column heading shows the column name and its Task count as text. Each card shows only the description text, up to 3 lines; its first line is the summary (`REQ-002`). Within a column, most recently updated comes first. The page scrolls normally. When the width available to the board cannot fit three columns of at least 240 px each (for example a widened app side panel or a small window), the columns stack vertically instead of shrinking. Cards cannot be dragged or moved (`REQ-003`). Until agents change status, all Tasks appear in To Do, and the other two columns show a muted "No tasks". The user explicitly accepted this on 2026-09-27. | `BEH-001` | Must | See the Project's work | `DEC-013`, `DEC-005` |
| REQ-007 | A search shall filter the Project's Tasks by description across all three columns. Column counts reflect the filtered result. It shows a recoverable no-match state and does not change any Task. There is no separate status filter. | `BEH-001` | Must | User: "we really need search" | User round 1 |
| REQ-008 | Deleting a Project shall also delete all its Tasks. The confirmation states how many Tasks will be deleted. Workspaces, files and run history remain untouched. | `BEH-002` | Must | Tasks cannot outlive their Project | `DEC-006` |
| REQ-009 | Each Project card on the Projects page shall show its number of Tasks that are not Done, as text. | `BEH-004` | Must | At-a-glance workload | User round 1; `DEC-007` |
| REQ-010 | Tasks shall be visible only where Projects are visible. There is no separate flag; data is kept when hidden. | `BEH-003` | Must | User | `ASM-002` |
| REQ-011 | This package supersedes released `REQ-014`/`AC-012`: Task vocabulary and counts are allowed on Project surfaces. | `BEH-001`, `BEH-004` | Must | Tasks are now a Project concept | This package |
| REQ-012 | Project Tasks shall stay distinct from execution-internal delegated tasks in the UI and in contracts. No delegated task is shown as, or converted into, a Project Task, and delegated-task surfaces are unchanged. | `BEH-005` | Must | Two meanings of "Task" | `RISK-002` |
| REQ-013 | Tasks shall persist per node across restarts. Existing Project records and workspace links shall remain intact and readable. | `BEH-002`, `BEH-003` | Must | Continuity | Released data |
| REQ-014 | Viewing and searching shall remain responsive with at least 100 Tasks in a Project. | `BEH-001` | Should | Scale | Draft `REQ-ATPTN-001` |
| REQ-015 | New strings shall be provided in `en` and `zh-CN`. All controls shall be keyboard operable with accessible names. | `BEH-001` | Must | Conventions | Released Projects |
| REQ-016 | The Projects page shall present the **released v1.4.86 experience**: a full-width card grid with search and "New Project", with each card adding its not-done count (`REQ-009`). Selecting a card opens a **separate full-width Project page** (`/projects/<id>`) with a **Back** control at the top-left that returns to the Projects page. The Project page header shows name, description, Edit and Delete. Below the header, the Tasks board (`REQ-006`) is the main content. The Project's workspaces stay reachable on the Project page as decided in `DEC-014`. There is no two-pane layout. | `BEH-004` | Must | User rejected the squeezed two-pane layout (2026-09-27) | User feedback; `DEC-012` revised to A; `DEC-014` |

## Acceptance Criteria

| Acceptance-Criteria ID | Related Requirement IDs | Related Behavior / Scenario IDs | Preconditions / Trigger | Observable Expected Outcome | Alternate Or Failure Outcome | Verification Intent |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | `REQ-001`, `REQ-002`, `REQ-003`, `REQ-005` | `SCN-001` | Projects on; in a Project, New Task; type "Write release notes for 1.4.87\nInclude Projects and Tasks" | Task appears as To Do with summary "Write release notes for 1.4.87"; it survives reopen and restart | Empty or whitespace description is rejected with a field message and nothing is created | Unit + browser E2E |
| AC-002 | `REQ-003`, `REQ-006` | `SCN-002` | Project has 3 Tasks (all To Do) | Full-width board with To Do (3), In Progress (0), Done (0); cards newest updated first; no drag and no move control anywhere; empty columns show a calm empty state | Empty Project shows an empty board with New Task | Browser E2E + UI review: at 1200×800 with the default side panel three columns are each ≥ 240 px; with the side panel widened to its maximum, or a 1000 px window, columns are either ≥ 240 px or stacked |
| AC-003 | `REQ-005` | `SCN-003` | Open a Task; edit the description; save | The full new description is shown and the summary updates | Cancel discards changes; empty description rejected | Unit + browser E2E |
| AC-004 | `REQ-005` | `SCN-003` | Delete a Task | Confirmation, then the Task is removed | Cancel keeps it | Browser E2E |
| AC-005 | `REQ-007`, `REQ-014` | `SCN-002` | Project with 100+ Tasks; search "release" | Only matching cards remain in each column, with column counts updated; clearing restores all | No match → no-match state; nothing changed | Browser E2E + perf check |
| AC-006 | `REQ-008` | `SCN-004` | Delete a Project with 5 Tasks | Confirmation mentions 5 Tasks; afterwards the Project and its Tasks are gone | Workspaces and run history unchanged; cancel keeps everything | Unit + integration |
| AC-007 | `REQ-009` | `SCN-007` | Project has 4 Tasks (all To Do in this ticket) | Its Project card shows 4 not-done Tasks | Project without Tasks shows 0 without error | Browser E2E |
| AC-008 | `REQ-010` | `SCN-005` | Turn Projects off, then on | Hidden, then shown with the same Tasks | — | Browser E2E |
| AC-009 | `REQ-012` | `SCN-008` | Run a team that delegates tasks | Delegated tasks behave and display as before; no crossover with Projects | — | Existing suites + regression |
| AC-010 | `REQ-013` | `SCN-006` | Node with v1.4.86 Projects | After upgrade, all Projects and links are intact with no Tasks | — | Released-data fixture |
| AC-011 | `REQ-016` | `SCN-007` | Two Projects exist | The Projects page matches the v1.4.86 grid (plus counts); clicking a card opens that Project's full-width page with the board; Back at top-left returns to the grid; `/projects/<id>` opens the Project page directly | Unknown id → not-found state with a Back control | Browser E2E + visual comparison to v1.4.86 |
| AC-012 | `REQ-011`, `REQ-015` | `SCN-001`–`SCN-003` | zh-CN; keyboard only | All Task strings are localised; every action is reachable by keyboard | — | Localisation guard + a11y |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor | Goal | Entry Surface | Starting Condition | Steps | Expected Outcome | Alternate / Error | Validity | Evidence | Related IDs |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | User | Work owner | Capture work | Selected Project › New Task | Projects on | Type description → create | Task in To Do; count updates | Empty rejected | Supported Normal (proposed) | User round 1 | `REQ-001`–`REQ-005`, `REQ-009` |
| SCN-002 | User | Work owner | See and find work | Selected Project › Tasks | Tasks exist | Scan the board; search | Tasks grouped in three columns with counts; search filters across columns | No match → message with clear search | Supported Normal (proposed) | User round 1 | `REQ-006`, `REQ-007` |
| SCN-003 | User | Work owner | Correct or remove work | Task dialog | Task exists | Edit description / delete | Persisted / removed | Cancel | Supported Normal (proposed) | User round 1 | `REQ-005` |
| SCN-004 | User | Work owner | Remove a Project | Project › Delete | Has Tasks | Confirm with count | Project + Tasks gone | Cancel | Supported Normal (proposed) | Released delete | `REQ-008` |
| SCN-005 | User/Operational | Operator | Hide the module | Settings toggle | Tasks exist | Off / on | Hidden / shown | — | Supported Normal | Released flag | `REQ-010` |
| SCN-006 | Operational | Upgrade | Keep released Projects | Upgrade from v1.4.86 | `projects.json` exists | Start | Intact | — | Supported Explicit Edge | Released data | `REQ-013` |
| SCN-007 | User | Work owner | Switch between Projects and their Tasks | Projects page | 2+ Projects | Open A → Back → open B | Grid → full-width Project page → Back (`DEC-012` = A) | Unknown id → not found | Supported Normal (proposed) | User round 1 | `REQ-016`, `REQ-009` |
| SCN-008 | Contract | Team execution | Delegate internally | Existing runs | Team run | As today | Unchanged | — | Supported Normal | Existing | `REQ-012` |
| SCN-X01 | User | — | Human changes Task status | — | — | Drag / move / edit status | — | — | `Technically Possible but Unsupported/Contrived` in this ticket: rejected by the user (agents own status) | User round 1 | `REQ-003`, `REQ-004` (withdrawn) |

## UI, Interaction, And Experience Requirements

- Applicable: `Yes`
- Linked supplement: None. Exploratory `REQ-ATPTN-001` `VIS-024`/`VIS-025` (board/list) and `VIS-124` (sidebar Active projects) are non-normative references for `DEC-012`/`DEC-013`.
- UI/UX confirmation: `N/A`
- Normative details (`SR-007`, approved `APPROVAL-PROJ-TASKS-20260927-002`, simplified per the user's instruction "Don't make the UI complicated. The UI should stay clean enough." on 2026-09-27):
  - **Projects page:** the released v1.4.86 card grid, unchanged in layout and behavior. The card's single bottom line reads "N open tasks · N workspaces".
  - **Project page:**
    - full content width;
    - "← Projects" at the top-left;
    - name and description (clamped to 2 lines) with Edit and Delete;
    - two plain tabs, **Tasks** (default) and **Workspaces**.
  - **Tasks tab:**
    - one row with search and **+ New task**;
    - three equal columns, To Do, In Progress and Done, each headed "Name  count";
    - the page scrolls normally, with no per-column scrolling;
    - columns stack whenever the board's own width cannot fit three columns of at least 240 px (narrow window or widened side panel).
  - **Cards:** the description text only, up to 3 lines. No timestamp, status label or icon. Clicking a card opens the Task dialog (full description, Edit, Delete). No drag or move.
  - **Empty column:** muted "No tasks".
  - **No match:** one message with a clear-search action.
  - **Workspaces tab:** the released workspace list, unchanged.
  - **Task dialog:** follows `ProjectDialogFrame`.
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
| DEC-012 | How to navigate between Projects and their Tasks | User question | A) keep card grid → Project page with Tasks/Workspaces tabs → Back (2 clicks to switch). **B) Recommended: two-pane Projects page** — left project list (search, New Project, not-done count), right the selected Project with Tasks (default) and Workspaces tabs; `/projects/<id>` selects it (1 click to switch). C) Projects expand as a tree under the app sidebar's Projects item (1 click from anywhere; changes global shell) | User | Resolved 2026-09-26 as **B**; **revised 2026-09-27 to A** (released grid → full-width Project page with Back), after the user rejected B in testing (`SR-005`) |
| DEC-013 | Layout of a Project's Tasks when only agents change status (every Task is To Do for now) | Two of three board columns would be empty until admission ships | **Recommended: a single list with a status badge and a status filter (All / To Do / In Progress / Done)**; a board can come with admission. Alternative: three-column board now (two columns empty for now) | User | Resolved 2026-09-26 as list; **revised 2026-09-27 to three-column board**, with the consequence (only To Do populated until admission) explicitly accepted by the user (`SR-005`) |

| DEC-014 | Where do a Project's workspaces go on the full-width Project page? | The board is the main content, but workspace links must stay reachable | Two plain tabs, **Tasks** (default) and **Workspaces** | User → delegated to Solution Designer | Resolved `APPROVAL-PROJ-TASKS-20260927-002` |
| DEC-015 | Keep the not-done count on each Project card? | Was approved on 2026-09-26; the user asked for the grid "like earlier" | Keep it, merged into the released bottom line: "4 open tasks · 2 workspaces" | User → delegated | Resolved `APPROVAL-PROJ-TASKS-20260927-002` |
| DEC-016 | Board detail choices | Clean, not squeezed | Simplified per the user ("don't make the UI complicated"): full-width page; plain tabs; a search + New task row; three equal columns with name and count; page scroll only; columns stack whenever the board's own width cannot fit three columns of at least 240 px; description-only cards clamped to 3 lines; muted "No tasks". Removed from the SR-006 proposal: per-column scrolling, card timestamps, explanatory empty copy, counts on tab labels. | User → delegated; simplified by user instruction | Resolved `APPROVAL-PROJ-TASKS-20260927-002` |

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

- User approval received: `Yes` — `APPROVAL-PROJ-TASKS-20260927-002` (direction fixed by the user; detailed UX delegated and recorded)
- Exact basis recorded: `Yes` — `SR-008` requirements
- Ready for architecture design: `Yes`
