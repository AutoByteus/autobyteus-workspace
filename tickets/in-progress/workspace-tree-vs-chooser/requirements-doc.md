# Requirements Document

## Document Status

- Status: `Approved`.
- Current solution revision ID: `SR-004`. Its exact approved baseline is this document. SR-001…SR-003, the withdrawn hide-from-tree design, are in commit `1da49572ab`.
- Package identifier: `workspace-tree-vs-chooser`.
- Request / ticket: Project Task `autobyteus-385`.
- Requested by: the user, through `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`).
- Requirements owner: the Solution Designer.
- Date: 2026-11-05.
- Approved by: **the user**, on 2026-11-05, through the Product Team's design, which governs the visible behavior:
  - first round: "I'll approve this. I think this is the ones we want.";
  - after the correction: "now everything is good now. approved".
  - DEC-008 and DEC-010 are his decisions in the Solution Designer's conversation. DEC-009 is the Solution Designer's, within the direction.
- Behavior-defining supplement, normative: `/Users/normy/autobyteus_org/autobyteus-web-design-worktrees/workspace-tree-vs-chooser/tickets/in-progress/workspace-tree-vs-chooser/ui-ux-spec.md`, with VIS-001…VIS-017 (branch `design/workspace-tree-vs-chooser` at `7712ec14`, base `a0e18abb`). Every visible detail in the screenshots is a requirement unless the spec marks it illustrative. The Runs view's rows follow `tickets/in-progress/left-panel-super-agents/ui-ux-spec.md` on branch `design/left-panel-super-agents` (`c42d1b64`).

## Problem And Desired Outcome

- **Problem.** The left Workspaces tree and the chat's workspace chooser read one folder list (E-04, E-06). The tree lists every registered folder, so the only way to tidy it was its X, which unregistered the folder and took it out of the chooser too.
- **Desired outcome** (the user's approved direction):
  - The left panel shows where runs are; the chat chooser holds every folder.
  - One header menu chooses how the same runs are grouped: Runs, Workspaces or Projects. The user: "It's just a different way of grouping."
  - The Workspaces and Projects views list only folders and Projects that have runs, so archiving a folder's runs tidies the panel without any removal.
  - Removing a folder is a deliberate action in the chooser.
  - Nothing on disk is lost.

## The User's Words (2026-11-05)

- The Task: "can we first allow removing it from the tree area but I can still select it in the chat area?"
- His typical case: "Normally, when I remove it … I have already archived … all those stuff … inside that workspace." "If I want to run agent or agent team on a certain workspace, it appears on the left side."
- On empty folders and Projects: "the left side anyway shows the agent run or agent team run … if … there are no agent run or agent team run … under them … we don't have to show them."
- On add actions (in the Product review): "I have never used it to add workspace or project from there"; "the view will just be view".

## Relevant Current And Desired Behavior

| Behavior ID | Current | Desired | Preserved |
| --- | --- | --- | --- |
| BEH-001 | The tree's X unregisters a folder: it leaves the tree and every chooser | No X in the tree. Removal only in the chat chooser, on purpose | The active-run guard; Temp is not removable |
| BEH-002 | The tree lists every registered folder, and the Projects view lists every Project | Each lists only folders and Projects with a listed run | The chooser lists every folder; the Projects page lists every Project |
| BEH-003 | A Workspaces \| Projects switch; an add-folder form and a "New Project" link in the run section | A `⋯` "View" menu with Runs, Workspaces and Projects; no add actions | The trees' rows and actions |
| BEH-004 | No ungrouped list of runs | The Runs view (the approved left-panel list) | Run storage and history |
| BEH-005 | A delegation into a removed folder re-registers it | Unchanged (DEC-009) | — |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| ID | Use Case |
| --- | --- |
| UC-001 | See runs grouped three ways from one menu |
| UC-002 | A folder or Project leaves its view when it has no runs, and comes back with its first run |
| UC-003 | Remove a folder from the chat chooser on purpose |

### Out Of Scope

- Project folder links.
- Deleting files or run history.
- The phone, which still lists every folder.
- The Projects page.
- Where the history load lives (the board's dependency on the panel is today's behavior).

### Non-Goals

- A settings page for folders.
- Hiding a folder by hand.

### Preserved Behavior Boundary

- No files, memories, runs or history are lost.
- `workspaces.json` and `project_runs.json` are unchanged.
- The active-run guard on removal.
- Temp workspace cannot be removed.
- The trees' rows and actions, apart from the X and the add actions.
- The phone.

### Prerequisites

None.

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID that it protects.
- A finding that would introduce new product behavior, policy, threat model, migration obligation, compatibility promise, or operational contract is a `Requirement Gap`. It requires explicit user approval before becoming authoritative.
- An adjacent concern outside the approved boundary may be recorded as a non-blocking risk, recommendation, or follow-up. It is not a required design correction unless it is a prerequisite.
- A downstream reviewer comment does not amend this requirements basis.

## Requirements

| ID | Requirement | Behavior |
| --- | --- | --- |
| REQ-002 | The chat folder chooser has "Remove" on each user folder: shown on hover or focus, always visible on narrow windows, none on Temp. It has the spec's confirmation and toasts. It unregisters the folder (today's `removeWorkspace`), so the folder leaves the chooser and every view of the left panel. If it was the chosen folder, the chip falls back to Temp | BEH-001 |
| REQ-004 | Remove deletes nothing. It is refused while a run is running in the folder ("Stop active runs before removing this workspace.") | BEH-001 |
| REQ-006 | One header menu above the run section (`⋯`, named "View") chooses the view: Runs, Workspaces (the default) or Projects, and nothing else. The choice is a display setting, kept per node in local storage under the existing key. The header shows the view's name, and the strip's tooltip follows the view | BEH-003 |
| REQ-007 | The Workspaces tree's folder remove button (X) is removed | BEH-001 |
| REQ-008 | The Runs view is the approved `left-panel-super-agents` list, built in this ticket (DEC-008): newest first by last activity, delegated work nested, the newest 5, "Show older (N)", "Archive all older" | BEH-004 |
| REQ-009 | The Workspaces and Projects views show a folder (Temp included) or a Project only while it has at least one listed run (DEC-010). A listed run is a non-archived agent, team or Org run of any status, including a prepared or just-started run. A New chat draft that has not been sent does not count. For a Project, its runs and delegated work count | BEH-002 |
| REQ-010 | The run section has no add or create actions: the inline "Add workspace" form and the "New Project" link are removed | BEH-003 |
| REQ-011 | Empty views show the spec's text-only states: Workspaces with no folder that has a run; Projects with no Projects; Projects where none has a run. The Runs view keeps "No runs yet" | BEH-002 |

## Acceptance Criteria

| AC | Requirements | Expected Outcome |
| --- | --- | --- |
| AC-002 | REQ-002 | Remove a folder in the chooser: it is gone from the chooser and every view of the left panel. Its files and run history are still on disk. The chip falls back to Temp if it was chosen. The button, confirmation and toast match VIS-007…VIS-009 |
| AC-005 | REQ-004 | With a run running there, Remove shows the refusal toast and changes nothing (VIS-010) |
| AC-009 | REQ-006 | Switch between the three views from the menu. The choice survives a reload, and the menu has only the three views. The keyboard behavior and the narrow drawer match VIS-011 and VIS-013 |
| AC-010 | REQ-007 | No folder row in the Workspaces view has a remove button |
| AC-011 | REQ-008 | The Runs view matches the left-panel-super-agents spec and VIS-003. A folder without runs is not listed |
| AC-012 | REQ-009 | Each of these is absent from its view, and present in the chat chooser or on the Projects page: a folder or Project with no listed run, and a folder with only an unsent draft. Starting a run there makes it appear when the first message is sent (VIS-017). Archiving its last run makes it disappear. A folder whose only runs are team runs, or only Org runs, is listed |
| AC-013 | REQ-010 | The run section offers no add form and no New Project link in any view |
| AC-014 | REQ-011 | Each empty state matches VIS-014, VIS-015 and VIS-016 |
| AC-007 | all | Tests; the suites pass from a clean clone; merged to `personal`. Release only on the user's word |

## UI, Interaction, And Experience Requirements

Applicable: `Yes`, governed entirely by the Product spec and its screenshots (above). The Product Team designed it, and the user approved it twice on 2026-11-05.

## Data Continuity And Acceptable Loss

- Persisted data affected: `No`. Nothing new is stored on the server or in the user's data.
- The view choice uses the existing local-storage key, with one new value, `runs`.
- A run's last activity is read from existing memory files and never written.
- No loss and no migration.

## Decisions

| ID | Question | Reasoning And Outcome | Owner | Status |
| --- | --- | --- | --- | --- |
| DEC-008 | Where the Runs view is built | It is the core of `left-panel-super-agents` (autobyteus-378, stopped), whose design removed the trees, while this design keeps them as views. **The user: build it here** ("forget about that ticket … after we have done this ticket … that ticket is also not needed anymore … we will remove that ticket"). FU-002 | User | Decided |
| DEC-009 | A delegation into a folder the user removed (E-03) | It re-registers the folder, as today. It is a Project's folder where work is happening, so showing it is right, and the user can remove it again | Solution Designer | Decided |
| DEC-010 | Folders and Projects without runs in the Workspaces and Projects views | **The user: do not list them** ("what's the point of showing that project … you will anyway go to chat to start a run"). The Product Team's correction round settled the views, empty states and copy, and the user removed the add actions (REQ-010) | User | Decided |

Withdrawn with SR-003 (history in commit `1da49572ab`):
- REQ-001, REQ-003 and REQ-005;
- AC-001, AC-003, AC-004, AC-006 and AC-008;
- DEC-001…DEC-007, the hide design and its storage and wording.

## Readiness Check

- Content ready for approval: `Yes`.
- Approval recorded: `Yes`, the user's.
- Approved requirements package ready for architecture design: `Yes`.
- Remaining blocker: none.
