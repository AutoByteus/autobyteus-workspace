# Requirements — A delegated copy runs in its Task's Project folder (autobyteus-97)

## Document Status

- Status: `Approved`
- Current solution revision ID: SR-002
- Package: `delegated-copy-project-workspace`; Project Task `autobyteus-97` (Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`)
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`)
- Requirements owner: Solution Designer; date 2026-11-02
- Approved by and reference: **User** for the folder rule (Task description and comments, 2026-11-02) and the tree placement (quoted below); **Solution Designer within the direction** for DEC-002, DEC-003, DEC-004, DEC-006 (user informed in the conversation).
- Exact approved baseline: this document at SR-002.
- Behavior-defining supplements: none.

## User Decision On The Tree (2026-11-02)

> "I think it's better not to change on the UI because the project task manager is … dedicating a task … it's actually managing a different project even though it's running under a certain project, but somehow it crosses the project … it's still showing under the project task manager because … it is actually a resource dedicated. However … when user click that specific agent, for example, on the file explorer, of course, we'll show the correct file explorer … because the file explorer is always showing the file explorer of the active agent or the focused agents."

## Problem And Desired Outcome

- Problem: a new delegated copy always gets the top-level run's folder (E-001). An Agent Package Creator doing AutoByteus Agents work runs in the superrepo; its Files and Terminal open there.
- Desired outcome: a new copy of a Task whose Project has a linked folder runs in the Project's first linked folder. Focusing the copy shows that folder in Files and Terminal. The tree does not change.
- Success: real delegation of a saved Task of Project P (linked folder F), from a manager running in another folder G: the copy's working directory is F; focusing it shows F; it is nested under the manager, whose folder stays G.

## Behavior

| ID | Current | Desired | Preserved |
| --- | --- | --- | --- |
| BEH-001 | A new copy takes the top-level run's folder (E-001) | Task's Project has a link: its first link, for Agent and Team copies, saved Tasks and sub-work, from Agent, Team and Org roots | Temp-task work and Projects with no link inherit as today; model, runtime, auto-approve choices unchanged |
| BEH-002 | Links are never checked | A first link that is not an existing folder on this node refuses the delegation with a clear error before anything starts | Saving a link stays unchecked |
| BEH-003 | Copies nested under the coordinating run; Files and Terminal follow the focused agent's folder (E-008) | Same, now showing the copy's real folder | No UI change |
| BEH-004 | Existing copies restore from their snapshot | Same: existing runs and follow-up Tasks to an existing copy keep their folder | History, restore |

## Scope Guardrail

### In-Scope Use Cases

| ID | Use case | Scenarios |
| --- | --- | --- |
| UC-001 | Delegate a Project's Task to a new copy | SCN-001, SCN-002, SCN-003 |
| UC-002 | A Project without a usable folder | SCN-004, SCN-005 |
| UC-003 | Inspect the copy | SCN-006 |

### Out Of Scope

- A `workspace` parameter on `delegate_task` (the user's decision); a Task-level folder (autobyteus-351); a "primary workspace" field.
- Any UI change (the tree, a folder chip).
- Remote delegated runs (they run in the peer's temp workspace, CM-12, E-007).
- Moving existing runs; teams' own git worktree handling inside the folder.

### Non-Goals

None.

### Preserved Behavior Boundary

BEH-004 and the Preserved column; CM-1…CM-12 (only where a local copy runs changes).

### Prerequisites

None.

### Review Authority

Blocking findings cite these IDs; new behavior is a Requirement Gap.

## Requirements

| ID | Requirement | BEH | Priority | Source |
| --- | --- | --- | --- | --- |
| REQ-001 | A new local copy whose Task belongs to a Project with a linked folder runs in that Project's first linked folder. | 001 | Must | User |
| REQ-002 | When the Project has no linked folder, or the Task has no Project, the copy takes the top-level run's folder, as today. | 001 | Must | User |
| REQ-003 | The rule covers saved-Task delegation and sub-work (a worker's delegation without `task_id`, which joins its Task), from Agent, Team and Org roots, for catalog copies and configured placements. | 001 | Must | DEC-002 |
| REQ-004 | A Team copy has one folder: its default and every member. | 001 | Must | Task, DEC-003 |
| REQ-005 | If the first linked folder is not an existing folder on this node, the delegation fails with a coded error naming the Project and the folder; no Task link, no copy, no fallback. | 002 | Must | Task, DEC-004 |
| REQ-006 | `delegate_task` gains no parameter. Model, runtime and auto-approve resolution stay as they are, checked against the copy's folder. | 001 | Must | User |
| REQ-007 | Existing copies keep their folder, including a follow-up Task from another Project and a restart. | 004 | Must | Task, DEC-006 |
| REQ-008 | No UI change; focusing the copy shows its folder in Files and Terminal; the copy stays nested under the run that delegated it, in both modes. | 003 | Must | User |

## Acceptance Criteria

| ID | REQ | Trigger | Outcome | Verification |
| --- | --- | --- | --- | --- |
| AC-001 | 001, 003 | Manager in folder G delegates a saved Task of P (link F) to an Agent | The copy's recorded launch and its actual working directory are F; the manager stays in G | Real delegation (scripted runtime allowed, labeled); server tests on Agent, Team and Org roots |
| AC-002 | 004 | The same, to a Team | The Team's default and every member are F | Same |
| AC-003 | 003 | A worker of that Task delegates without `task_id` | The sub-work is in F, also when the manager is in G | Server test + real delegation |
| AC-004 | 002 | Project with no link; description-only delegation (Temp task) | The copy is in the top-level run's folder | Server tests |
| AC-005 | 001 | P has links F1, F2 | The copy is in F1 | Server test |
| AC-006 | 005 | P's first link does not exist, or is a file | Coded error naming the Project and the folder; no Task entry, no copy | Server test on the real tool path |
| AC-007 | 007 | Existing copy in G given a Task of P; restart | It stays in G | Server test |
| AC-008 | 006 | A copy whose model is checked per folder | The launch check reads the catalog for F; the tool schema is unchanged | Server test |
| AC-009 | 008 | Focus the copy in the app | Files and Terminal show F; the row is under the manager in Workspaces mode and, for a manager started under a Project, in Projects mode | Browser, packaged desktop journey |

## Scenarios

| ID | Kind | Goal | Steps | Outcome | Validity |
| --- | --- | --- | --- | --- | --- |
| SCN-001 | System | Saved Task to a new copy | PM in superrepo delegates an AutoByteus Agents Task | Copy in `autobyteus-agents` | Supported Normal (the user's case) |
| SCN-002 | System | Team copy | PM delegates an Opportunities Task to the scouting team | Team in the Opportunities folder | Supported Normal (the user's example) |
| SCN-003 | System | Sub-work | A worker delegates onward | Same folder as its Task's Project | Supported Normal |
| SCN-004 | System | No usable link | Project with no link or Temp task | Inherit | Supported Normal |
| SCN-005 | System | Missing folder | Folder moved or deleted on this node | Clear refusal | Supported Explicit Edge (Task; links are unchecked, E-006) |
| SCN-006 | User | Inspect | Focus the copy | Files and Terminal on its folder | Supported Normal |

## Decisions

| ID | Question | Reasoning and recommendation | Owner | Status |
| --- | --- | --- | --- | --- |
| DEC-001 | The folder rule | Task's Project link, first one; else inherit; no parameter. | User | Decided by the user |
| DEC-002 | Sub-work | Same rule: it belongs to the same Task. Otherwise it would land in the top-level run's folder (E-001) and split a Task across folders. | Solution Designer | Decided |
| DEC-003 | Team copy | One folder for the whole copy. | Solution Designer | Decided |
| DEC-004 | Missing folder | Coded error, nothing started, no silent fallback: inheriting would run the work in an unrelated folder. | Solution Designer | Decided |
| DEC-005 | Tree placement | Stay nested under the delegating run; no UI change, no chip. | User | Decided by the user |
| DEC-006 | Existing copies | Keep their folder; a different folder means a new copy. | Solution Designer | Decided |

## Data Continuity

Persisted data affected: new copies' recorded folder only, in the existing field; no shape change; no migration. Existing runs unchanged.

## Readiness

Content ready: Yes. Approval recorded: Yes. Ready for design: Yes.
