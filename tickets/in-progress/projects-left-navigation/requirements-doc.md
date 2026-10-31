# Requirements — Projects view in the left panel

## Document Status

- Status: `Ready for Approval`
- Current solution revision ID: SR-001
- Package identifier: `projects-left-navigation`
- Request / ticket: Project Task `autobyteus-347` (Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`); replaces autobyteus-72
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), on the user's request of 2026-10-31
- Requirements owner: Solution Designer
- Date: 2026-10-31
- Approved by and reference: not yet. DEC-001, DEC-002 and DEC-003 need the user.
- Exact approved requirements baseline: N/A
- Behavior-defining supplements: none (the sketch below is part of this document)

## Problem And Desired Outcome

- **Problem.** A user who works Project by Project runs a Project Task Manager, which dispatches Tasks to agents and teams. Today the left panel organizes all runs only by workspace folder. The manager shows up under whichever folder it was started in, its dispatched work is nested under it, and both are mixed with standalone runs across many workspaces. The right-side Projects board lists Tasks but is not where runs are opened and followed.
- **Affected actors.** The user; the manager agent; delegated workers.
- **Desired outcome.** The left panel offers two ways to organize runs: **Workspaces** (unchanged: pick a folder, use an agent or team on its own) and **Projects** (pick a Project: its manager conversations, its Tasks that have work, and the agents and teams working on each Task). Starting a manager from a Project gives it the Project's folder and tells it its Project. Work tied to Tasks leaves the list when its Task is closed, so it needs no manual archiving.
- **Observable definition of success.** In Projects mode the user can start or reopen a Project's manager, see each dispatched Task's workers appear under that Task while they work, open any of them, see them leave when the Task is closed, and switch back to Workspaces with everything there as before.

### Sketch (illustrative; names and counts are fixture content)

```text
 Chat ✎                                  ┌───────────────────────────────┐
 Agents                                  │                               │
 Agent Teams                             │   conversation (unchanged)    │
 …                                       │                               │
 ─────────────────────────────           │                               │
 [ Workspaces | Projects ]  +            │                               │
 ▾ AutoByteus                 9 open     │                               │
     Managers                      +     │                               │
       ● Project Task Manager  "Plan…"   │                               │
       ○ Project Task Manager  "Now I…"  │                               │
     Tasks with work          All Tasks ↗│                               │
     ▾ Projects view in the left panel   │                               │
         ● software engineering team     │                               │
             ● solution designer         │                               │
             ○ architecture reviewer     │                               │
     ▸ Fix model routing launch …        │                               │
 ▸ AutoByteus Agents          7 open     │                               │
 ▸ AutoByteus Website         1 open     │                               │
```

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Scenarios | Current behavior (evidence) | Desired behavior | Preserved behavior | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | SCN-001, SCN-002 | The run section is always the Workspaces tree | A Workspaces / Projects switch; Projects mode organizes runs by Project and Task | Workspaces mode as it is | E-001, E-014 |
| BEH-002 | User/System | SCN-002, SCN-005 | A manager is an ordinary run in some folder; no run records a Project | A Project lists its manager conversations: those started from it and those that dispatched its Tasks; starting one from the Project records it there and tells it its Project | Managers stay ordinary runs; existing runs are not rewritten | E-002, E-005, E-017 |
| BEH-003 | System | SCN-003, SCN-009, SCN-010 | Dispatched work is nested under the manager in Workspaces; Task link only in the Task's run file | Each Task with work lists its workers, their team members and sub-work in Projects mode | Same runs, ids, nesting, actions | E-004, E-010 |
| BEH-004 | System | SCN-004 | Closing a Task stops its runs (unless they hold another open Task) and hides them; conversations kept | Projects mode follows the same rule; the closed Task leaves "Tasks with work" | Closure, stop, reopen and reactivation rules unchanged; no extra archive | E-006, E-009 |
| BEH-005 | System | SCN-002, SCN-006 | Delegated runs take the manager's folder; Project links play no part | Projects-mode managers run in the Project's folder (DEC-001/002), so its work runs there too | Workspaces-started managers keep their own folder | E-007, E-008, E-016 |
| BEH-006 | User | SCN-003, SCN-005 | A worker opens only when its host is among the 6 latest runs per agent per workspace | Every run listed in Projects mode opens | Workspaces listing cap unchanged | E-012 |
| BEH-007 | User | SCN-001, SCN-008 | Archive/delete roots; Projects pages and right board | Same actions available on manager conversations in Projects mode | All existing behavior | E-011, E-013 |
| BEH-008 | System | SCN-007 | Live feed, reconnect, node-local, desktop only | Projects mode stays live and correct after reconnect | Node-local; no mobile | web projects.md |

## Stakeholders, Actors, And Outcomes

| Actor | Goal | Required outcome | Constraint |
| --- | --- | --- | --- |
| User | Work on a Project and follow its dispatched work in one place | Projects mode with managers and Task work | Workspaces work and history unchanged |
| Manager agent | Plan and dispatch a Project's Tasks | Runs in the Project's folder and knows its Project | Still an ordinary run; not restricted to the Project |
| Worker agents/teams | Do a Task | Unchanged lifecycle; visible under the Task | No change to delegation, closure or ownership |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use case | Use case | Scenarios |
| --- | --- | --- |
| UC-001 | Choose Workspaces or Projects in the left panel | SCN-001, SCN-002, SCN-007 |
| UC-002 | Start or reopen a Project's manager conversation | SCN-002, SCN-005, SCN-006 |
| UC-003 | Find, follow and open the agents and teams working on a Project's Tasks | SCN-003, SCN-005, SCN-009, SCN-010 |
| UC-004 | Task closure removes its work from the Projects list | SCN-004 |
| UC-005 | Deleted Projects/Tasks and errors handled without losing runs | SCN-008, SCN-007 |

### Out Of Scope

- Changing delegation, Task ownership, closure, reactivation, idle shutdown or the collaboration model (CM-1…CM-12).
- The related Tasks: delegated-run working/idle/waiting/stopped visibility; linking an existing run to a Project Task without a new copy; Task key work. This ticket consumes today's statuses and keys.
- Starting a Team or Org as a Project's manager from the Projects mode (they still appear when they dispatched the Project's Tasks).
- Starting a worker on a Task directly from the left panel (dispatch stays with the manager).
- Viewing a closed Task's worker conversations (not openable today either; FU-002).
- A Task-level folder override (FU-003), and a Project-owned coordination folder unless the user chooses DEC-001 option B.
- Changes to the Project Task Manager agent or skill (agents repository; FU-001).
- Changing the Workspaces listing cap, the right Projects board, the Projects pages, mobile, cross-node Projects.

### Non-Goals

- The left list is not a second Task board: it shows Tasks with work, and links to the board for all Tasks.
- No restriction of what a Project-bound manager may do (not a security boundary).
- No new performance promise beyond: Projects mode does not read conversations to build its list.

### Preserved Behavior Boundary

BEH-001…BEH-008 "Preserved" column. Cross-cutting: a run shown in Projects mode is the same run as in Workspaces mode (same id, conversation, status, actions); Projects mode never starts, stops, archives or reassigns a run by being opened, switched or browsed.

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
| REQ-001 | The left panel's run section has a **Workspaces / Projects** switch. Workspaces mode is today's tree. The choice is remembered per node. Switching modes changes only the list: it never opens, starts, stops or changes the open conversation. | BEH-001 | Must | The user's request | N/A | Task; DEC-009 |
| REQ-002 | Projects mode lists the node's Projects by name with their open Task count, and an empty state that leads to creating a Project. A Project expands to its **Managers** and its **Tasks with work**. | BEH-001 | Must | Request | N/A | DEC-003 |
| REQ-003 | A Project's **Managers** are the manager conversations (top-level runs) that (a) were started from this Project in Projects mode, or (b) host any assignment of one of this Project's Tasks. Each is listed once per Project, with its status and summary, most recently active first; archived ones are not listed, as in Workspaces. A conversation that serves several Projects is listed under each of them, as the same run. Opening one opens its conversation. Archive and Delete work as in Workspaces. | BEH-002, BEH-007 | Must | E-017: existing managers serve several Projects; no migration | N/A | DEC-005, DEC-006 |
| REQ-004 | **Start a manager for a Project**: "+" on Managers lets the user choose an installed agent (the one last used for this Project is preselected; none is hard-coded) and opens a New chat for it in the Project's folder (REQ-012). When the run is created, it is recorded as started for this Project; it appears under the Project at once and stays there after restart. | BEH-002, BEH-005 | Must | "run the project task manager under a certain project" | N/A | DEC-001, DEC-002, DEC-006 |
| REQ-005 | A manager started for a Project is told its Project (name and Project ID) as context it can rely on, so it does not have to guess it from its folder or ask. It remains an ordinary run and can still work with other Projects. | BEH-002 | Must | A Project-scoped manager | To be shown per runtime in design (U-003) | DEC-011 |
| REQ-006 | **Tasks with work**: under a Project, every Task that is open (TODO or IN_PROGRESS) and has a current assignment (starting, started or failed to start). Each Task row shows its title and status; expanding it lists the Task's runs: each assigned Agent or Team (with its members), the sub-work they delegated for this Task, and remote delegated runs, with the same rows, status dots, Stop and open behavior as in Workspaces. A failed start shows "Couldn't start" with its error. | BEH-003 | Must | Request | N/A | DEC-003 |
| REQ-007 | Each Project has an **All Tasks** entry that shows the Project's board in the right Projects tab; activating a Task row's title shows that Task there (the existing Task locator). | BEH-003 | Must | One board, no duplicate | N/A | DEC-003 |
| REQ-008 | Placement rules: a run that holds several open Tasks is listed under each of them; sub-work is listed under the Task it belongs to; no run is listed twice under one Task; delegated runs that belong to no Project Task (Temp tasks, older unowned runs) are listed under their manager conversation. Nothing that the Workspaces tree shows for a manager's dispatched work disappears from Projects mode. | BEH-003 | Must | No hidden or duplicated work | N/A | E-009, E-010 |
| REQ-009 | When a Task is closed (DONE or CANCELLED), its runs leave Projects mode as they leave Workspaces today (stopped unless they hold another open Task, conversations kept), and the Task leaves Tasks with work. If the Task is reopened and its work reactivated, it returns. No manual archive is needed for Task work. Manager conversations are not archived automatically. | BEH-004 | Must | User's "manually archive" pain; E-006 | N/A | DEC-004 |
| REQ-010 | Every run listed in Projects mode opens, also when its manager conversation is beyond the Workspaces listing cap. | BEH-006 | Must | E-012 | Design | — |
| REQ-011 | Projects mode stays current without a manual refresh: new dispatches, status changes, closures, reactivations, new or renamed Projects and Tasks, deletions and new manager conversations appear; after a reconnect or restart it shows the current state. It shows loading, empty and error states with Retry; a failed read keeps the last good list. | BEH-008 | Must | Follow dynamically dispatched work | Design (U-004) | — |
| REQ-012 | **Folder for a Project's manager** (conditional on DEC-001/DEC-002, recommended options shown): the manager runs in the Project's linked folder: used automatically when the Project has one; chosen by the user at Start when it has several (the last choice preselected); a Project with none asks the user to link a folder before Start. The folder is shown before the first send. Its workers keep taking the manager's folder (today's rule), so the Project's work runs in the Project's folder. An existing run keeps its folder when Project links change later. | BEH-005 | Must | E-007, E-008, E-016 | N/A | DEC-001, DEC-002 |
| REQ-013 | The open run is marked in whichever mode lists it; switching modes reveals it there when listed. Opening a run from Projects mode is the same open as from Workspaces. | BEH-001, BEH-006 | Must | Coherent navigation | N/A | — |
| REQ-014 | Preserve: Workspaces mode and its starts, history, archive/delete, Task summary lines; the right Projects tab and Projects pages; Temp tasks; delegation, closure and reactivation; existing data (no rewrite of runs, Tasks or run files). Deleting a Project or Task removes it from Projects mode; its runs stay in Workspaces. | BEH-007, BEH-004 | Must | Explicit preservation | N/A | DEC-010 |
| REQ-015 | Keyboard and pointer can switch modes, expand Projects and Tasks, start a manager and open runs; labels in English and Chinese; works in the narrow desktop layouts and the collapsed strip (its icon reveals the run section in the current mode). | BEH-001 | Must | Existing shell conventions | N/A | DEC-009 |

## Acceptance Criteria

| ID | REQs | Behavior / scenario | Precondition / trigger | Observable outcome | Alternate / failure | Verification |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | 001, 013, 014 | BEH-001; SCN-001, SCN-002 | A run is open; switch to Projects and back | The open conversation and run id stay; no run starts or stops; the run is marked in the mode that lists it; the mode is remembered after reload | — | Web tests + browser |
| AC-002 | 002, 003 | BEH-002; SCN-002, SCN-005 | Projects with existing manager conversations that dispatched their Tasks | Each Project lists those conversations once, newest first; a conversation that dispatched for 3 Projects appears under all 3 with the same run id; archived ones absent | Project with none: empty Managers with "+" | Server read tests + browser on fixture data |
| AC-003 | 004, 005, 012 | BEH-002, BEH-005; SCN-002 | Project with one linked folder; "+" on Managers, choose agent, send first message | New chat opens with the agent and the Project's folder shown; the created run is listed under the Project at once and after restart; its context names the Project (name, ID); its working folder is the Project's folder | Agent missing/unusable: the start shows the existing error, no run is listed | Server + runtime check of the run's folder and context; desktop journey |
| AC-004 | 012 | BEH-005; SCN-006 | Project with no link / several links | No link: Start asks to link a folder and starts nothing until one is linked. Several: the user chooses one; the last choice is preselected next time | Cancel starts nothing | Web tests + browser |
| AC-005 | 006, 008, 011 | BEH-003; SCN-003 | Manager dispatches a saved Task to a Team | Without refresh, the Task appears under Tasks with work with the Team, its members and later sub-work, with live status; clicking a member opens that exact conversation | Start fails: "Couldn't start" with error | Real delegation (scripted runtime allowed, labeled) + browser |
| AC-006 | 008 | BEH-003; SCN-003, SCN-009 | A worker holds two open Tasks; a manager made a description-only delegation | The worker appears under both Tasks, once each; the Temp-task run appears under its manager conversation | — | Server read tests |
| AC-007 | 009 | BEH-004; SCN-004 | Agent sets the Task DONE (or CANCELLED) | The Task and its runs leave Projects mode live; runs are stopped unless they hold another open Task; conversations remain (Memory); nothing is archived | Reopen + assigner's message: Task and run return | Real closure + browser |
| AC-008 | 010 | BEH-006; SCN-005 | A Task hosted by a manager conversation older than the 6 latest of its agent and folder | Its worker opens from Projects mode | — | Web/server tests with > 6 runs |
| AC-009 | 007 | SCN-003 | Click All Tasks; click a Task title | The right Projects tab shows the Project's board / that Task | — | Web tests |
| AC-010 | 011 | BEH-008; SCN-007 | Reconnect or restart; a read fails | Current state shown after reconnect; on failure the last good list stays with an error and Retry | — | Store tests + browser |
| AC-011 | 014 | BEH-007; SCN-001, SCN-008 | Existing standalone and team work; delete a Project or Task with open work | Workspaces mode unchanged (starts, history, archive, delete, Task lines); deleted Project/Task leaves Projects mode; its runs remain in Workspaces | — | Existing regressions + new tests |
| AC-012 | 015 | SCN-002 | Keyboard only; zh-CN; narrow window; collapsed strip | All actions reachable; labels translated; strip icon opens the current mode | — | Browser + localization audit |
| AC-013 | 001–015 | SCN-001…SCN-010 | Integrated desktop journey in the worktree build | Start a manager for a Project → dispatch a saved Task with real `delegate_task` → follow and open the worker → close the Task → see it leave → back to Workspaces | Scripted runtime is not paid-provider proof | API/E2E + Delivery |

## Relevant Scenarios And Journeys

| Scenario | Kind | Actor | Goal | Trigger | Start | Steps | Outcome | Alternate / error | Validity | Evidence | REQ / AC |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | User | User | Standalone work | Workspaces mode | Any | Pick folder, start/open agent or team, converse | As today | — | Supported Normal | E-001, E-015 | 001, 014 / 001, 011 |
| SCN-002 | User | User | Run a Project's manager | Projects mode | Project exists | Expand Project → "+" Managers → choose agent → first message | Manager runs in the Project's folder, knows its Project, listed under it | No folder / several folders (SCN-006); agent unusable | Supported Normal (new) | Request; E-008, E-015 | 002–005, 012 / 002–004 |
| SCN-003 | System | Manager | Follow dispatched work | `delegate_task(task_id)` | Manager under the Project | Copy starts → Task with work appears → members, sub-work → user opens one | Exact conversation opens | Start failed | Supported Normal | E-004, E-010 | 006–008, 011 / 005, 006, 009 |
| SCN-004 | System | Agent | Close a Task | `update_task` DONE/CANCELLED | Task with work | Closure stops and hides runs | Task leaves the list; conversations kept | Reopen + reactivation returns it | Supported Normal | E-006 | 009 / 007 |
| SCN-005 | User | User | Existing work, no migration | Projects mode after upgrade | Managers started from Workspaces dispatched Tasks of several Projects | Expand each Project | Each lists those managers and their open Task work | Host beyond the listing cap still opens | Supported Normal | E-012, E-017 | 003, 010 / 002, 008 |
| SCN-006 | User | User | Folder choice | Start for a Project with 0 or several links | — | Link a folder first / choose one | Concrete folder before first send | Cancel | Supported Normal (new) | E-016 | 012 / 004 |
| SCN-007 | System | App | Stay current | Reconnect, restart, read failure | Projects mode shown | Re-read | Current state; last good list on failure | Retry | Supported Normal | web projects.md | 011 / 010 |
| SCN-008 | User | User | Delete metadata | Delete Project or Task with open work | — | Delete | Leaves Projects mode; runs remain in Workspaces | — | Supported Explicit Edge (deletion contract E-013) | E-013 | 014 / 011 |
| SCN-009 | System | Manager | Temp-task work | Description-only `delegate_task` from the manager | — | Copy starts | Listed under the manager conversation | — | Supported Normal | E-010 | 008 / 006 |
| SCN-010 | System | Worker | Remote delegated run | Worker delegates to a peer node | Remote collaboration on | Remote run starts | Listed under the Task like a local run | Peer unreachable: existing remote states | Supported Normal | CM-10, CM-11 | 006, 008 / 005 |

## UI, Interaction, And Experience Requirements

- Applicable: Yes.
- Product Design package: none (DEC-008). The sketch above shows structure; names, counts and summaries are illustrative.
- Normative: the switch in the run-section header; Projects → Managers (with "+") and Tasks with work (with All Tasks); Task rows expand to the same run rows as Workspaces; states: loading, empty, no Projects, no linked folder, starting, couldn't start, error with Retry.
- Permitted variation: exact icons, spacing, ordering of Projects (by name, as the Projects pages order them), wording of empty states.
- Product decisions that need the user: DEC-003 (which Tasks), the sketch as a whole.

## Quality And Non-Functional Requirements

| ID | REQ / AC | Area | Requirement | Scope | Verification |
| --- | --- | --- | --- | --- | --- |
| QR-001 | 003, 006 / 002, 005 | Performance | Building Projects mode reads Projects, Tasks and run records, not conversations; it does not slow Workspaces mode | Up to 350 Tasks in a Project (E-016) | Server read tests on a fixture of that size |
| QR-002 | 001, 013 / 001 | Reliability | One run identity regardless of where it is listed; switching or browsing starts/stops nothing | All modes | Store and server tests |
| QR-003 | 015 / 012 | Accessibility | Keyboard operable, names and focus, en/zh-CN | Desktop, narrow layouts | Browser + audit |

## Data Continuity And Acceptable Loss

- Persisted data affected: Yes — a new record that a run was started for a Project (REQ-004).
- Must be preserved: every Project, Task, run-resource file, run, conversation, folder and setting. Existing runs are not rewritten; their Project association is read from the Task records (DEC-005).
- Acceptable loss: none of user data. The mode choice, expansion and preselected agent/folder are client view state and may be rebuilt.
- Constraints: older builds must keep reading data written by this build without failing (the new association may be ignored by them).
- Unknown for architecture: where the association is stored; the migration convention check.

## External Contracts And Dependencies

| Dependency | Required behavior | Evidence | Risk |
| --- | --- | --- | --- |
| Installed manager agent (agents repo) | Has the Project tools; uses the given Project | E-008 | Its skill reads the Project from its board (FU-001) |
| Task run records / collaboration model | Source of Task ↔ run links; unchanged | E-004, E-010 | — |
| Run history and archive | Same identities and archive rule | E-011 | — |

## Supplemental Artifacts

| Path | Purpose | IDs | Status | Approval |
| --- | --- | --- | --- | --- |
| `evidence/intake/user-screenshot-sidebar-pm-under-workspace-2026-10-31.png` | Problem evidence | BEH-001…003 | Evidence | Not behavior-defining |
| `follow-ups.md` | Follow-ups FU-001…FU-003 | — | Recorded | N/A |

## Assumptions

| ID | Assumption | Why | Validation / owner | Status |
| --- | --- | --- | --- | --- |
| ASM-001 | A suitable manager agent is installed on the node | No server-shipped manager | Start offers installed agents | Accepted |
| ASM-002 | Telling a run its Project is possible on every runtime | REQ-005 | Architecture (U-003) | To verify |

## Decisions

| ID | Question | Why it matters | Options / evidence | Reasoning and recommendation | Owner | Status |
| --- | --- | --- | --- | --- | --- | --- |
| DEC-001 | Where does a manager started for a Project run? | Every run needs a real folder; workers take the manager's folder (E-007) | **A. The Project's linked folder.** B. A Project-owned coordination folder in app data, with workers sent to the Project's linked folder by a new dispatch rule. | The earlier ticket recommended B. The evidence now favors **A**: all 11 of your Projects have exactly one linked folder (E-016); workers already run in the manager's folder, so with A the whole Project's work runs in the Project's folder with no change to delegation; the manager keeps finding its board in `<folder>/task-plans/` (E-008), which already supports several Projects per folder. B needs a new folder lifecycle, a change to how every saved-Task dispatch chooses its folder, and moves the manager's board away from where it is today. Recommend **A**. | User | Needs user |
| DEC-002 | How is the folder chosen with 0, 1 or several links? | Visible behavior; no silent guess | 0: link one first; 1: automatic; several: choose at Start (last choice preselected) / a Project default with a Task-level override | One link is automatic. No link: ask to link one (the Project's edit page) before Start; starting in an unrelated folder would hide the problem. Several: let the user choose at Start, preselecting the last choice. A Task-level override would need a new dispatch rule (as in DEC-001 B) and no Project of yours has several links; recommend leaving it for later (FU-003). | User | Needs user |
| DEC-003 | Which Tasks does the left list show? | 161 TODO Tasks in one Project, ~9 with work (E-016, E-018) | **Tasks with work** + All Tasks link to the board / every open Task | The left side is for following work; the board already lists every Task. Listing 170 open Tasks would recreate the crowding you want to leave. Recommend Tasks with work (open Tasks with a current assignment) plus All Tasks. | User | Needs user |
| DEC-004 | Archive a Task's runs automatically when it is closed? | Your manual-archive pain | E-006: closing a Task already stops its runs and hides them; they are not separate archivable rows | Already the behavior for delegated work; Projects mode follows it (REQ-009). No new archive action. Manager conversations are your own long-lived runs and are not archived automatically; Archive stays available on them. | Solution Designer | Decided |
| DEC-005 | Which existing managers belong to a Project? | Continuity, no migration | Derived from the Tasks' run records (host of each assignment) / only new starts | Derive: every conversation that hosts an assignment of the Project's Tasks, plus those started from the Project. Existing managers appear with no data change; one serving several Projects appears under each as the same run (E-017). | Solution Designer | Decided |
| DEC-006 | What can be started as a Project's manager? | Scope | Agent / Agent, Team, Org | Agents (your managers are all Agent runs, E-017). Team/Org hosts still appear when they dispatch. | Solution Designer | Decided |
| DEC-007 | Show closed Tasks' runs in the left list? | History | Not openable anywhere today (E-012) | Keep parity: closed Tasks leave the list; their conversations stay in Memory. Read-only viewing is FU-002. | Solution Designer | Decided |
| DEC-008 | Product Design round first? | Process | Team has no Product route; earlier ticket stalled waiting on Product | Not needed: Projects mode reuses the existing tree rows; the sketch is for your review. Ask if you want mockups before the build. | Solution Designer | Decided |
| DEC-009 | Where is the switch? | Discoverability | Header of the run section / separate section | A "Workspaces / Projects" switch in the run-section header; the collapsed strip's icon reveals the current mode. The primary "Projects" page stays for authoring. | Solution Designer | Decided (in the sketch) |
| DEC-010 | Deleted Project or Task with open work? | Deletion contract keeps runs | — | Only current Projects and Tasks are listed; their runs stay reachable in Workspaces. | Solution Designer | Decided |
| DEC-011 | Is a Project-bound manager restricted to its Project? | Not a security boundary | — | No; it is told its Project and stays an ordinary run. | Solution Designer | Decided |

## Traceability

| REQ | UC | BEH | AC | SCN |
| --- | --- | --- | --- | --- |
| 001 | 001 | 001 | 001 | 001, 002 |
| 002 | 001 | 001 | 002 | 002 |
| 003 | 002 | 002, 007 | 002 | 002, 005 |
| 004 | 002 | 002, 005 | 003 | 002 |
| 005 | 002 | 002 | 003 | 002 |
| 006 | 003 | 003 | 005 | 003, 010 |
| 007 | 003 | 003 | 009 | 003 |
| 008 | 003 | 003 | 005, 006 | 003, 009, 010 |
| 009 | 004 | 004 | 007 | 004 |
| 010 | 003 | 006 | 008 | 005 |
| 011 | 003, 005 | 008 | 005, 010 | 003, 007 |
| 012 | 002 | 005 | 003, 004 | 002, 006 |
| 013 | 001 | 001, 006 | 001 | 001, 002 |
| 014 | 005 | 007, 004 | 011 | 001, 008 |
| 015 | 001 | 001 | 012 | 002 |

## Architecture Phase Input

- Scenarios to map: SCN-001…SCN-010.
- Constraints: Task side owns Task ↔ run links; trees carry no Task data; delegation, closure and reactivation unchanged; same run identities in both modes.
- Deferred to design: the Project-execution read and its live updates; where "started for Project" is stored (with the migration-convention check); how the Project reaches the manager on each runtime; opening hosts beyond the listing cap; reuse of tree rows.
- Facts to verify: Project context on every runtime; status sources for listed runs; remote runs under Tasks.
- Risks: live update cost; duplicate row implementations.

## Readiness Check

### Content Ready For Approval

- Relevant current behavior is evidence-backed: Yes
- Desired and preserved behavior are explicit: Yes
- Scope and non-goals are clear: Yes
- Requirements and acceptance criteria are testable and traceable: Yes
- Applicable scenarios are covered with validity and evidence: Yes
- Product design and supplemental evidence is integrated consistently: N/A (no Product package; DEC-008)
- Applicable UI/UX approval and final visual-reference basis are recorded: N/A
- Material assumptions and decisions are visible, each with reasoning and recommendation: Yes
- Content ready for approval: Yes
- Remaining content blocker: none; DEC-001, DEC-002, DEC-003 need the user's answer.

### Approved Basis Ready For Design

- Approval recorded: No
- Exact requirements and supplement approval basis recorded: No
- Ready for architecture design: No
- Remaining blocker: the user's approval and answers to DEC-001…DEC-003.
