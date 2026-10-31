# Requirements — Projects view in the left panel

## Document Status

- Status: `Approved`
- Current solution revision ID: SR-005
- Package identifier: `projects-left-navigation`
- Request / ticket: Project Task `autobyteus-347` (Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`); replaces autobyteus-72
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), on the user's request of 2026-10-31
- Requirements owner: Solution Designer
- Date: 2026-10-31
- Approved by and reference: **User** for the journey and the folder rules (conversation 2026-10-31, quoted in [User Decisions](#user-decisions-2026-10-31)); **Solution Designer within the direction (user informed)** for the remaining decisions (DEC-004…DEC-011, my message of 2026-10-31 that confirmed the folder rule and announced this revision).
- Exact approved requirements baseline: this document at SR-005 (R4): R3 plus the user-confirmed Product UI/UX package integrated below. R3 was: SR-002 plus the Project choice on the New chat start surface, which the user asked for in the Product design review (quoted below).
- Behavior-defining supplements: the Product UI/UX specification `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/projects-left-navigation/ui-ux-spec.md` and its final references VIS-001…VIS-025, design revision `0675adcaf73642b513dcdbc7d6e98474d260a057` (integration record `1988a5031b144c7f7ec9def7187d79dcd1562d42`, design repository default branch `personal`), confirmed by the user on 2026-10-31 ("cool. i am satisfied. lets go", then "approved").

## User Decisions (2026-10-31)

- On the SR-001 draft: "Does it have to be like a project manager? I guess it can be any agent, right? … the project task manager is also just another agent … it happens to take the responsibility of managing the tasks belonging to a project … how do I run one agent under a certain project?" and "the task management tree was already super nice to appear on each project." → Any agent or team can run under a Project; a Project's tree looks like today's workspace tree (DEC-012).
- On the folder: "if the project doesn't have workspace, then we use the temp workspace … If the project has a workspace, then we will use the project first workspace." Also: "we also don't want to make it mandatory." → DEC-001, DEC-002.
- In the Product design review (2026-10-31, relayed by the Product UI/UX Designer with the user's own words), about the plain Chat start surface: "does this mean in the chat area, i could also select project view? as well?", then "I guess it's better to add it right?" → a Project can be chosen on the New chat start surface before the first message (REQ-004, DEC-014).
- SR-001's DEC-003 (which Tasks the left list shows) is superseded: the left tree shows runs, and the Project's Tasks are on the right board (REQ-007).

## Problem And Desired Outcome

- **Problem.** The left panel organizes runs only by workspace folder. Someone who works Project by Project starts agents (often the Project Task Manager, which dispatches Tasks) in some folder. Those agents and the work they dispatch are mixed with standalone runs across many workspaces. The right-side Projects board lists Tasks but is not where runs are started, opened and followed.
- **Affected actors.** The user; any agent or team the user runs for a Project; delegated workers.
- **Desired outcome.** The left panel offers two ways to organize runs. **Workspaces** stays as it is: pick a folder and run agents and teams. **Projects** is new: pick a Project and run any agent or team under it, in a tree that looks like a workspace's (agent and team groups, runs, delegated runs nested below with their Task line). A run started under a Project works in the Project's first linked folder, or the temp workspace when the Project has none, and is told its Project. Runs that already dispatched a Project's Tasks also appear under that Project. Delegated work leaves the tree when its Task is closed, as today.
- **Observable definition of success.** In Projects mode the user starts an agent under a Project, sees it there, sees the work it dispatches nested below it while it works, opens any of it, sees the work leave when the Task is closed, and switches back to Workspaces with everything there as before.

### Sketch (superseded by the Product references VIS-001…VIS-025; kept as the original structure sketch)

```text
[ Workspaces | Projects ]
▾ AutoByteus                                   +     ← run an agent or team under this Project
    ▾ Project Task Manager (2)                 +     ← another run of this agent
        ● "hello"                          now
            ● marketing team  · Add a Pre-Draft review…     ← Task line, as today
                ● marketing content creator
                ● deep researcher
            ● agent package creator · Add a mandatory…
        ○ "Now I need you to creat…"       22h
    ▸ Daily Assistant (1)                      +
    ▸ software engineering team (1)            +
▸ AutoByteus Agents                            +
▸ AutoByteus Website                           +
```

Selecting a Project row in the left panel also makes it the Project shown on the right panel's Projects board.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Scenarios | Current behavior (evidence) | Desired behavior | Preserved behavior | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | SCN-001, SCN-002 | The run section is always the Workspaces tree | A Workspaces / Projects switch; Projects mode groups runs by Project in the same tree shape | Workspaces mode as it is | E-001, E-014 |
| BEH-002 | User/System | SCN-002, SCN-005 | A run gets a folder; no run records a Project | A run can be started under a Project (from the Project's "+" or by choosing the Project in New chat): it is recorded there and told its Project; runs that dispatched a Project's Tasks also appear under it | Runs stay ordinary runs; existing runs are not rewritten | E-002, E-005, E-017 |
| BEH-003 | System | SCN-003, SCN-009, SCN-010 | Delegated work is nested under the run that started it, with a Task line | The same nesting under the Project, scoped to the Project's work | Same runs, ids, nesting, Task lines, actions | E-004, E-010, E-014 |
| BEH-004 | System | SCN-004 | Closing a Task stops its runs (unless they hold another open Task) and hides them; conversations kept | Projects mode follows the same rule | Closure, stop, reopen and reactivation unchanged; no extra archive | E-006, E-009 |
| BEH-005 | System | SCN-002, SCN-006 | A run's folder is chosen at start; delegated runs take it | A run started under a Project defaults to the Project's first linked folder, else the temp workspace (unless the user already picked a folder); changeable before sending | Delegated runs take their delegator's folder; links are never required, created or changed by a start | E-007, E-008, E-016, E-021 |
| BEH-006 | User | SCN-003, SCN-005 | A delegated run opens from the board only when its host is among the 6 latest runs per agent per workspace | Every run listed in Projects mode opens | Workspaces listing cap unchanged | E-012 |
| BEH-007 | User | SCN-001, SCN-008 | Archive/delete; Projects pages and right board | Archive and Delete on runs in Projects mode, as in Workspaces | All existing behavior | E-011, E-013 |
| BEH-008 | System | SCN-007 | Live feed, reconnect, node-local, desktop only | Projects mode stays live and correct after reconnect | Node-local; no mobile | web projects.md |

## Stakeholders, Actors, And Outcomes

| Actor | Goal | Required outcome | Constraint |
| --- | --- | --- | --- |
| User | Work on a Project and follow its runs in one place | Projects mode; run any agent or team under a Project | Workspaces work and history unchanged; no mandatory folder |
| Any agent or team run under a Project | Work for the Project | Runs in the Project's folder (or temp) and knows its Project | Still an ordinary run; not restricted to the Project |
| Delegated workers | Do a Task | Unchanged lifecycle; visible under the Project | No change to delegation, closure or ownership |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use case | Use case | Scenarios |
| --- | --- | --- |
| UC-001 | Choose Workspaces or Projects in the left panel | SCN-001, SCN-002, SCN-007 |
| UC-002 | Run an agent or team under a Project, and reopen it | SCN-002, SCN-006, SCN-011 |
| UC-003 | Find, follow and open the runs working for a Project, including work they dispatched | SCN-003, SCN-005, SCN-009, SCN-010 |
| UC-004 | Task closure removes its work from the Projects tree | SCN-004 |
| UC-005 | Deleted Projects/Tasks and errors handled without losing runs | SCN-007, SCN-008 |

### Out Of Scope

- Changing delegation, Task ownership, closure, reactivation, idle shutdown or the collaboration model (CM-1…CM-12), including the rule that delegated runs take their delegator's folder.
- The related Tasks: delegated-run working/idle/waiting/stopped visibility; linking an existing run to a Project Task without a new copy; Task key work. This ticket consumes today's statuses and keys.
- Starting an Agent Org under a Project (Org runs still appear when they host a Project's Task work).
- Moving an existing run to another Project, or attaching a run started in Workspaces to a Project.
- Viewing a closed Task's worker conversations (not openable today either; FU-002).
- A Task-level folder (FU-003); marking a primary folder explicitly (the first link is the primary one).
- Changes to the Project Task Manager agent or skill (agents repository; FU-001).
- Changing the Workspaces listing cap, the right Projects board and the Projects pages (except the Project icon, REQ-016), mobile, cross-node Projects.
- A Project's own icon and colour chosen by the user (FU-004).

### Non-Goals

- No Task list in the left panel: Tasks stay on the right board.
- No restriction of what a run under a Project may do (not a security boundary).
- No new performance promise beyond: Projects mode does not read conversations to build its tree.

### Preserved Behavior Boundary

BEH-001…BEH-008 "Preserved" column. Cross-cutting: a run shown in Projects mode is the same run as in Workspaces mode (same id, conversation, status, actions); switching modes or expanding Projects never starts, stops, archives or reassigns a run.

### Prerequisites

None.

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved REQ, AC or BEH ID it protects.
- A finding that needs new product behavior, policy, migration obligation or compatibility promise is a `Requirement Gap` and needs the user's approval.
- Adjacent concerns are follow-ups (`follow-ups.md`) unless they are prerequisites.
- A reviewer comment does not amend these requirements.

## Requirements

| ID | Requirement | Behavior | Priority | Rationale | Feasibility | Source / decision |
| --- | --- | --- | --- | --- | --- | --- |
| REQ-001 | The left panel's run section has a **Workspaces / Projects** switch. Workspaces mode is today's tree. The choice is remembered per node. Switching modes changes only the tree: it never opens, starts, stops or changes the open conversation. | BEH-001 | Must | The user's request | N/A | Task; DEC-009 |
| REQ-002 | Projects mode lists the node's Projects by name (as the Projects pages order them), each with a "+" to run an agent or team under it, and an empty state that leads to creating a Project. A Project expands to its runs, grouped by agent and by team as in a workspace (group name, run count, "+" for another run of that agent or team). Selecting a Project row makes it the right panel's Projects board choice. A Project row's chevron only opens or closes it; its name selects the Project and opens it when closed; a selected Project has no visual mark. The run-section header's "+" adds a workspace in Workspaces mode and opens New Project in Projects mode. Opening a run does not change the board's Project. | BEH-001 | Must | User: "the task management tree … appear on each project"; Product UXJ-001, UXJ-002 | N/A | DEC-012 |
| REQ-003 | **Runs under a Project** are the top-level runs (Agent, Team or Org runs) that (a) were started under this Project, or (b) host any assignment of one of this Project's Tasks. Each is listed once per Project. Runs are ordered and summarized as in Workspaces; archived ones are not listed, as in Workspaces. A run that hosts work for several Projects is listed under each, as the same run. | BEH-002, BEH-007 | Must | E-017: existing runs serve several Projects; no data change | N/A | DEC-005 |
| REQ-004 | **Run an agent or team under a Project**: "+" on the Project lets the user choose any agent or team (the same choice as a workspace offers); "+" on a group starts another run of that agent or team. Starting opens the same start surface as a workspace's "+" does for that kind, with the Project shown and the folder preselected (REQ-005). **The New chat start surface also has a Project choice**, in the one footer chip that shows where the run works: by default the chip shows the folder, as today; its menu has "Workspaces | Projects" tabs, and the Projects tab (shown only when the node has at least one Project) lists "No project" and the Projects, each with the folder it brings. Choosing a Project makes the chip show the Project (and "Project · folder" when the folder differs from the Project's). The choice is preset to the Project when started from a Project's "+", and stays changeable until the first message is sent ("No project" makes it a plain start). The Project of a run cannot be changed once the run exists. The run, once created, is recorded as started under this Project; it appears under the Project at once and stays there after restart. It also appears in Workspaces mode under its folder. | BEH-002 | Must | User: "how do I run one agent under a certain project"; Project choice in New chat (user, design review) | N/A | DEC-006, DEC-012, DEC-014 |
| REQ-005 | **Folder of a run started under a Project**: the Project's first linked folder; when the Project has no linked folder, the temp workspace. Choosing a Project in New chat preselects that folder, except when the user already picked a folder on this start, which is kept. The user can choose another folder before the run is created, as on any start. Starting never requires, creates, registers or links a folder. Delegated runs keep taking their delegator's folder. A run keeps its folder when the Project's links change later. | BEH-005 | Must | User decision | N/A | DEC-001, DEC-002, DEC-014 |
| REQ-006 | A run started under a Project is told its Project (name and Project ID) as context it can rely on, so an agent with the Project tools works on that Project without guessing or asking. It remains an ordinary run and can still work with other Projects. | BEH-002 | Must | A Project-scoped run | To be shown per runtime in design (U-003) | DEC-011 |
| REQ-007 | The Project's Tasks are on the right Projects board: selecting a Project in the left panel shows its board there (REQ-002), and a delegated run's Task line shows its Task there (existing Task locator). | BEH-003 | Must | One board, no duplicate | N/A | DEC-012 |
| REQ-008 | **Delegated work under a run**, in Projects mode under Project P: the run's delegated runs that belong to P's Tasks (assigned workers with their members, their sub-work, remote delegated runs), nested and shown exactly as in Workspaces (rows, Task line, status, Stop, open). Delegated runs that belong to another Project's Tasks are listed under that Project instead. Delegated runs that belong to no Project Task (Temp tasks, older unowned runs) are listed under the run only when the run was started under P. A delegated run holding several open Tasks of P is listed once. | BEH-003 | Must | No hidden or duplicated work | N/A | DEC-013 |
| REQ-009 | When a Task is closed (DONE or CANCELLED), its runs leave Projects mode as they leave Workspaces today (stopped unless they hold another open Task, conversations kept). Reopen plus reactivation brings them back. No manual archive is needed for delegated work. Top-level runs are not archived automatically. | BEH-004 | Must | User's "manually archive" pain; E-006 | N/A | DEC-004 |
| REQ-010 | Every run listed in Projects mode opens, also when it is beyond the Workspaces listing cap. | BEH-006 | Must | E-012 | Design | — |
| REQ-011 | Projects mode stays current without a manual refresh: new runs under a Project, new dispatches, status changes, closures, reactivations, new, renamed and deleted Projects appear; after a reconnect or restart it shows the current state. Loading, empty and error states with Retry; a failed read keeps the last good tree. | BEH-008 | Must | Follow dynamically dispatched work | Design (U-004) | — |
| REQ-012 | The open run is marked in whichever mode lists it; switching modes reveals it there when listed. Opening a run from Projects mode is the same open as from Workspaces. | BEH-001, BEH-006 | Must | Coherent navigation | N/A | — |
| REQ-013 | Preserve: Workspaces mode and its starts, history, archive/delete, Task lines; the right Projects tab and Projects pages; Temp tasks; delegation, closure and reactivation; existing data (no rewrite of runs, Tasks or run-resource files). Deleting a Project removes it from Projects mode; its runs stay in Workspaces. | BEH-007, BEH-004 | Must | Explicit preservation | N/A | DEC-010 |
| REQ-014 | Archive and Delete work on runs in Projects mode as in Workspaces (running runs: Stop, not Archive). A group's "Archive all runs" in Projects mode archives only that group's runs listed under that Project. | BEH-007 | Must | Parity; manual archive stays available | N/A | DEC-004 |
| REQ-015 | Keyboard and pointer can switch modes, expand Projects and groups, start runs and open runs; labels in English and Chinese; works in the narrow desktop layouts; the collapsed strip's run-tree entry keeps its tree icon in both modes, its name and tooltip say the mode, and it reveals the run section in the current mode. | BEH-001 | Must | Existing shell conventions; Product UXJ-009 | N/A | DEC-009 |
| REQ-016 | **One icon for a Project**: the briefcase marks a Project everywhere one is shown: Project rows, the chip and its menu, the Projects entry in the left list and the strips, the right strip's Projects tab, the Project cards and the Projects empty states. The folder icon stays for workspaces. | BEH-001 | Must | The user's decision in the design review (Product DC-004) | N/A | DEC-016 |

## Acceptance Criteria

| ID | REQs | Behavior / scenario | Precondition / trigger | Observable outcome | Alternate / failure | Verification |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | 001, 012, 013 | BEH-001; SCN-001, SCN-002 | A run is open; switch to Projects and back | The open conversation and run id stay; nothing starts or stops; the run is marked in the mode that lists it; the mode is remembered after reload | — | Web tests + browser |
| AC-002 | 002, 003 | BEH-002; SCN-005 | Existing runs that dispatched Tasks of 3 Projects | Each of the 3 Projects lists the run once, in its agent group, with the same run id; archived runs absent | Project with no runs: only "+" | Server read tests + browser on fixture data |
| AC-003 | 004, 005, 006 | BEH-002, BEH-005; SCN-002 | Project with one linked folder; "+" on the Project, choose an agent, send | The start surface shows the Project and the Project's folder; the created run is listed under the Project at once and after restart, and under its folder in Workspaces; the run's context names the Project (name, ID); its working folder is the Project's folder | Agent unusable: the existing start error, nothing listed | Server + runtime check of folder and context; desktop journey |
| AC-004 | 005 | BEH-005; SCN-006 | Project with no linked folder; Project with two | No link: the start uses the temp workspace and nothing is required. Two: the first is preselected. In both, choosing another folder before sending is used | No folder is created, registered or linked | Web tests + server check |
| AC-016 | 016 | BEH-001 | Open the left list, strips, Projects pages, the Projects tree and the chip menu | A Project is shown with the briefcase in each place; workspaces keep the folder | — | Web tests + browser against VIS-002, VIS-012, VIS-021 |
| AC-017 | 001–016 | UI | The built app beside the Product references | The surfaces match VIS-001…VIS-025, except content the spec marks illustrative | — | Browser screenshots compared with the references |
| AC-015 | 004, 005 | BEH-002, BEH-005; SCN-011 | Plain New chat (Chat ✎); the node has Projects; choose Project P, send | The run is listed under P at once (and after restart) and under its folder in Workspaces; P's first folder was preselected unless a folder had already been picked; choosing "No project" before sending makes a plain run; after sending, the Project choice is no longer offered for this run | No Projects on the node: no Project choice shown | Web tests + browser + server check of the record |
| AC-005 | 004 | SCN-002 | Start a Team under a Project; "+" on an existing agent group | The Team run and the second agent run appear under the Project in their groups, with the Project's folder | — | Web tests + browser |
| AC-006 | 008, 011 | BEH-003; SCN-003 | A run under P dispatches a saved Task of P to a Team | Without refresh the Team appears nested under the run with its Task line, members and later sub-work, with live status; clicking a member opens that exact conversation | Start fails: "Couldn't start" as today | Real delegation (scripted runtime allowed, labeled) + browser |
| AC-007 | 008 | BEH-003; SCN-005, SCN-009 | One run dispatched Tasks of P and Q and made a description-only delegation; it was started under P | Under P: its P work and its Temp-task work; under Q: its Q work only; each delegated run once | Same run started from Workspaces: Temp-task work not under P or Q | Server read tests |
| AC-008 | 009 | BEH-004; SCN-004 | Agent sets the Task DONE (or CANCELLED) | Its runs leave Projects mode live; stopped unless they hold another open Task; conversations remain; nothing archived | Reopen + assigner's message: they return | Real closure + browser |
| AC-009 | 010 | BEH-006; SCN-005 | A run beyond the 6 latest of its agent and folder hosts P's Task work | It and its delegated runs open from Projects mode | — | Web/server tests with > 6 runs |
| AC-010 | 002, 007 | SCN-002 | Select a Project row; click a Task line | The right Projects board shows that Project / that Task | — | Web tests |
| AC-011 | 011 | BEH-008; SCN-007 | Reconnect or restart; a read fails | Current state after reconnect; on failure the last good tree stays with an error and Retry | — | Store tests + browser |
| AC-012 | 013, 014 | BEH-007; SCN-001, SCN-008 | Existing standalone and team work; archive a run and a group in Projects mode; delete a Project with runs | Workspaces mode unchanged; archive hides the run in both modes; group archive touches only that Project's listed runs; deleted Project leaves Projects mode; its runs stay in Workspaces | Running runs: no archive, as today | Existing regressions + new tests |
| AC-013 | 015 | SCN-002 | Keyboard only; zh-CN; narrow window; collapsed strip | All actions reachable; labels translated; strip icon opens the current mode | — | Browser + localization audit |
| AC-014 | 001–015 | SCN-001…SCN-010 | Integrated desktop journey in the worktree build | Start an agent under a Project → it dispatches a saved Task with real `delegate_task` → follow and open the worker → close the Task → see it leave → back to Workspaces | Scripted runtime is not paid-provider proof | API/E2E + Delivery |

## Relevant Scenarios And Journeys

| Scenario | Kind | Actor | Goal | Trigger | Start | Steps | Outcome | Alternate / error | Validity | Evidence | REQ / AC |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | User | User | Standalone work | Workspaces mode | Any | Pick folder, start/open agent or team, converse | As today | — | Supported Normal | E-001, E-015 | 001, 013 / 001, 012 |
| SCN-002 | User | User | Run an agent or team for a Project | Projects mode, "+" | Project exists | "+" → choose agent/team → start surface with Project and folder → first message | Run in the Project's folder, told its Project, listed under it | Agent unusable | Supported Normal (new; user-approved) | User 2026-10-31; E-015 | 002, 004–006 / 003, 005 |
| SCN-003 | System | Run under P | Follow dispatched work | `delegate_task(task_id)` of a P Task | Run under P | Copy starts → nested under the run with Task line → user opens one | Exact conversation opens | Start failed | Supported Normal | E-004, E-010 | 008, 011 / 006 |
| SCN-004 | System | Agent | Close a Task | `update_task` DONE/CANCELLED | Task with runs | Closure stops and hides runs | Runs leave; conversations kept | Reopen + reactivation returns them | Supported Normal | E-006 | 009 / 008 |
| SCN-005 | User | User | Existing work, no data change | Projects mode after upgrade | Runs started in Workspaces dispatched Tasks of several Projects | Expand each Project | Each lists those runs with that Project's work | Run beyond the listing cap still opens | Supported Normal | E-012, E-017 | 003, 008, 010 / 002, 007, 009 |
| SCN-006 | User | User | Folder for a run | Start under a Project with 0 or several links | — | Temp workspace / first link preselected; optionally choose another | Concrete folder; nothing required | — | Supported Normal (user-approved) | E-016, E-021 | 005 / 004 |
| SCN-007 | System | App | Stay current | Reconnect, restart, read failure | Projects mode shown | Re-read | Current state; last good tree on failure | Retry | Supported Normal | web projects.md | 011 / 011 |
| SCN-008 | User | User | Delete metadata | Delete a Project with runs | — | Delete | Leaves Projects mode; runs remain in Workspaces | — | Supported Explicit Edge (deletion contract E-013) | E-013 | 013 / 012 |
| SCN-009 | System | Run under P | Temp-task work | Description-only `delegate_task` | — | Copy starts | Nested under the run in P | — | Supported Normal | E-010 | 008 / 007 |
| SCN-011 | User | User | Start work for a Project from Chat | New chat (Chat ✎), Project choice | Node has Projects | Choose agent/team, choose Project P (folder follows), type, send | Run under P, in P's folder, told P | "No project": plain run; earlier picked folder kept | Supported Normal (new; user-approved in the design review) | User 2026-10-31 via Product review | 004, 005 / 015 |
| SCN-010 | System | Worker | Remote delegated run | Worker delegates to a peer node | Remote collaboration on | Remote run starts | Nested as in Workspaces | Existing remote states | Supported Normal | CM-10, CM-11 | 008 / 006 |

## UI, Interaction, And Experience Requirements

- Applicable: Yes.
- Linked UI/UX specification (normative): `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/projects-left-navigation/ui-ux-spec.md`.
- Final references (normative): `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/projects-left-navigation/visual-references/VIS-001…VIS-025` (1440×900 desktop; VIS-022/023 zh-CN; VIS-024/025 600×800 narrow).
- Runnable UI reference: the design repository root, `corepack pnpm install --ignore-workspace --frozen-lockfile && corepack pnpm dev --port 3210`, `http://127.0.0.1:3210/workspace` → Projects; runbook `ui-reference-runbook.md` § projects-left-navigation.
- Product ticket record: `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/projects-left-navigation/product-ticket.md`; change log `design-change-log.md` (DC-001…DC-011).
- Design repository revision: design result `0675adcaf73642b513dcdbc7d6e98474d260a057`, integration record `1988a5031b144c7f7ec9def7187d79dcd1562d42` on `personal`; source pin `d74f75a51ab7dc47d42a13f33e0f943c3a230ad7` (checked against this ticket's base `8faae96899` by Product: no in-scope UI change).
- UI/UX user-confirmation reference: the user, 2026-10-31, in the Product UI/UX Designer's review: "cool. i am satisfied. lets go", then "approved".
- Normative: every visible detail in VIS-001…VIS-025 and the spec's labels, states, keyboard, motion and Implementation Fidelity Boundary.
- Explicitly illustrative: Project, agent, team, run and Task names; counts; relative times; which runs exist; the reference's example run links, in-memory "started under" record, local-storage state seeds and read delays (spec § Data, Contract, And Mock Boundaries).
- Not demonstrable in the reference: Task closure removing delegated rows live (existing mechanism; AC-008 in the build).
- Normative: the switch in the run-section header; Projects with "+"; agent and team groups with count and "+"; runs and delegated runs as in the Workspaces tree; selecting a Project sets the right board's Project; the start surface shows a changeable Project choice (preset from a Project's "+") and the folder; states: loading, empty, no Projects, error with Retry.
- Permitted variation: icons, spacing, wording of empty states and of the Project shown on the start surface.

## Quality And Non-Functional Requirements

| ID | REQ / AC | Area | Requirement | Scope | Verification |
| --- | --- | --- | --- | --- | --- |
| QR-001 | 003, 008 / 002, 007 | Performance | Building Projects mode reads Projects, Task run records and run history, not conversations; it does not slow Workspaces mode | Up to 350 Tasks in a Project (E-016) | Server read tests on a fixture of that size |
| QR-002 | 001, 012 / 001 | Reliability | One run identity regardless of where it is listed; switching or expanding starts/stops nothing | All modes | Store and server tests |
| QR-003 | 015 / 013 | Accessibility | Keyboard operable, names and focus, en/zh-CN | Desktop, narrow layouts | Browser + audit |

## Data Continuity And Acceptable Loss

- Persisted data affected: Yes — a new record that a run was started under a Project (REQ-004).
- Must be preserved: every Project, Task, run-resource file, run, conversation, folder and setting. Existing runs are not rewritten; their Project association is read from the Task records (DEC-005).
- Acceptable loss: none of user data. The mode choice and expansion are client view state and may be rebuilt.
- Constraints: older builds keep reading data written by this build (they may ignore the new record).
- Unknown for architecture: where the record is stored; the migration-convention check.

## External Contracts And Dependencies

| Dependency | Required behavior | Evidence | Risk |
| --- | --- | --- | --- |
| Agents with Project tools (agents repo) | Use the given Project | E-008 | The manager skill reads the Project from its board (FU-001) |
| Task run records / collaboration model | Source of Task ↔ run links; unchanged | E-004, E-010 | — |
| Run history and archive | Same identities and archive rule | E-011 | — |

## Supplemental Artifacts

| Path | Purpose | IDs | Status | Approval |
| --- | --- | --- | --- | --- |
| `evidence/intake/user-screenshot-sidebar-pm-under-workspace-2026-10-31.png` | Problem evidence | BEH-001…003 | Evidence | Not behavior-defining |
| `follow-ups.md` | FU-001…FU-003 | — | Recorded | N/A |

## Assumptions

| ID | Assumption | Why | Validation / owner | Status |
| --- | --- | --- | --- | --- |
| ASM-001 | Telling a run its Project is possible on every runtime | REQ-006 | Architecture (U-003) | To verify |

## Decisions

| ID | Question | Reasoning and recommendation | Owner | Status |
| --- | --- | --- | --- | --- |
| DEC-001 | Folder of a run started under a Project | The Project's first linked folder; it keeps the agent's files (e.g. the manager's board) in the Project's folder and delegated work follows the agent's folder. A coordination folder was rejected (new folder lifecycle, new dispatch folder rule, board moves). | User | Decided by the user, 2026-10-31 |
| DEC-002 | No link / several links | No link: the temp workspace, nothing required (folders stay optional). Several: the first is the primary one. The user may pick another folder before sending. Task-level folder: FU-003. | User | Decided by the user, 2026-10-31 |
| DEC-003 | (SR-001) Which Tasks the left list shows | Superseded by DEC-012: the left tree shows runs; Tasks stay on the right board. | User | Superseded |
| DEC-004 | Archive delegated runs automatically when their Task closes? | Closing a Task already stops and hides its delegated runs (E-006); they are not separate archivable rows. Projects mode follows it. Top-level runs are the user's own and keep the existing Archive actions. | Solution Designer | Decided |
| DEC-005 | Which existing runs belong to a Project? | Runs started under it, plus every top-level run that hosts an assignment of its Tasks, read from the Task records; existing runs appear with no data change; a run serving several Projects appears under each as the same run (E-017). | Solution Designer | Decided |
| DEC-006 | What can be started under a Project? | Agents and Agent Teams, as a workspace offers them. Orgs start from their own launch page and are left out; Org runs hosting a Project's Task work still appear. | Solution Designer | Decided |
| DEC-007 | Closed Tasks' runs | Parity: they leave the tree; read-only viewing is FU-002. | Solution Designer | Decided |
| DEC-008 | Product Design round first? | The user asked for it (2026-10-31: "first work on the UI … task @Product Team"); request in `product-design-request.md`. The returned package, once confirmed by the user, is linked in the UI section. | User | Decided by the user (SR-003) |
| DEC-009 | Where is the switch? | "Workspaces / Projects" in the run-section header; the collapsed strip's icon reveals the current mode; the primary "Projects" page stays for authoring. | Solution Designer | Decided |
| DEC-010 | Deleted Project | Only current Projects are listed; their runs stay in Workspaces. A run started under a deleted Project shows nowhere in Projects mode. | Solution Designer | Decided |
| DEC-011 | Is a run under a Project restricted to it? | No; it is told its Project and stays an ordinary run. | Solution Designer | Decided |
| DEC-012 | Shape of a Project in the tree | Like a workspace: agent and team groups, runs, delegated runs nested with Task lines; any agent or team; Tasks on the right board, which follows the selected Project. | User | Decided by the user, 2026-10-31 |
| DEC-013 | Which delegated runs are nested under a run in Project P? | P's Task work; other Projects' work goes under those Projects; work of no Project Task only under runs started under P, so a run started elsewhere does not bring unrelated work into P. | Solution Designer | Decided |
| DEC-015 | Which Project does a remote delegated run belong to? | Remote delegated runs are linked to their Task through the same Task link step as local copies (`root-task-dispatch.ts` 59–61, E-024), so the same rule as REQ-008 applies: the Project of its Task, or none for Temp-task work. | Solution Designer | Decided (SR-005) |
| DEC-016 | Briefcase icon for Projects everywhere | The user's decision in the design review (Product DC-004); changes the preserved icon of the Projects entry, cards and empty states. | User | Decided by the user (SR-005) |
| DEC-017 | Defaults accepted by the user in the design review | Opening a run does not change the board's Project; the team group's "+" exists in Projects mode only; Task closure is verified in the build, not the reference. | User | Decided by the user (SR-005) |
| DEC-014 | Can a Project be chosen on the New chat start surface? | Yes, the user asked for it in the design review; one chip with Workspaces | Projects tabs (Product UXJ-004). Same record as the "+" path; folder follows the Project unless already picked; fixed once the run exists (moving runs stays out of scope); Agents and Teams only (DEC-006). | User (details: Solution Designer) | Decided (SR-004) |

## Traceability

| REQ | UC | BEH | AC | SCN |
| --- | --- | --- | --- | --- |
| 001 | 001 | 001 | 001 | 001, 002 |
| 002 | 001, 002 | 001 | 002, 010 | 002 |
| 003 | 003 | 002, 007 | 002 | 005 |
| 004 | 002 | 002 | 003, 005, 015 | 002, 011 |
| 005 | 002 | 005 | 003, 004, 015 | 002, 006, 011 |
| 006 | 002 | 002 | 003 | 002 |
| 007 | 003 | 003 | 010 | 003 |
| 008 | 003 | 003 | 006, 007 | 003, 005, 009, 010 |
| 009 | 004 | 004 | 008 | 004 |
| 010 | 003 | 006 | 009 | 005 |
| 011 | 003, 005 | 008 | 006, 011 | 003, 007 |
| 012 | 001 | 001, 006 | 001 | 001, 002 |
| 013 | 005 | 007, 004 | 012 | 001, 008 |
| 014 | 005 | 007 | 012 | 008 |
| 015 | 001 | 001 | 013 | 002 |
| 016 | 001 | 001 | 016, 017 | 002 |

## Architecture Phase Input

- Scenarios to map: SCN-001…SCN-010.
- Constraints: the Task side owns Task ↔ run links; trees carry no Task data; delegation, closure and reactivation unchanged; same run identities in both modes.
- Deferred to design: the Project-runs read and its live updates; where "started under a Project" is stored (migration-convention check); how the Project reaches the run on each runtime; opening runs beyond the listing cap; reuse of the workspace tree rows and start surfaces.

## Readiness Check

### Content Ready For Approval

- Relevant current behavior is evidence-backed: Yes
- Desired and preserved behavior are explicit: Yes
- Scope and non-goals are clear: Yes
- Requirements and acceptance criteria are testable and traceable: Yes
- Applicable scenarios are covered with validity and evidence: Yes
- Product design and supplemental evidence is integrated consistently: N/A (DEC-008)
- Applicable UI/UX approval and final visual-reference basis are recorded: N/A
- Material assumptions and decisions are visible, each with reasoning and recommendation: Yes
- Content ready for approval: Yes
- Remaining content blocker: none

### Approved Basis Ready For Design

- Approval recorded: Yes (User Decisions; DEC table owners)
- Exact requirements and supplement approval basis recorded: Yes (SR-002)
- Ready for architecture design: Yes
- Remaining blocker: none. The user approves the design before the build (Task process).
