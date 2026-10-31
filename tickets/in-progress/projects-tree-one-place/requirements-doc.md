# Requirements — One place per run in the Projects tree

## Document Status

- Status: `Approved`
- Current solution revision ID: SR-002
- Package: `projects-tree-one-place`; Project Task `autobyteus-353` (Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`); follow-up to autobyteus-347 (`tickets/done/projects-left-navigation/` on `origin/personal`)
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`)
- Requirements owner: Solution Designer; date 2026-10-31
- Approved by and reference: **User**, 2026-10-31, in the Solution Designer's conversation (quoted under User Decision); details within that direction by the Solution Designer (DEC-002…DEC-004), user informed in the same conversation.
- Exact approved baseline: this document at SR-002.
- Behavior-defining supplements: the 347 Product spec stays normative for look and states, except the parts DEC-001 removes (listed under Scope Guardrail).

## User Decision (2026-10-31)

After the explanation that "hello" is one run listed under every Project whose Tasks it handed out:

> "this is incorrect because earlier the project task manager is created under the super repo workspace … even though currently … I haven't started any agent run … by selecting a certain project. So I would expect that to be empty at least … if I don't have any agent run which are directly created under any project, then we don't show it. But instead of showing the same run under every project … I would expect that the UI shows the data. You know, UI is reflecting the data."

## Problem And Desired Outcome

- Problem: 347 lists a run under every Project whose Tasks it handed out (347 REQ-003, DEC-005). The user's Project Task Manager "hello", started in the superrepo workspace, is shown under 6 Projects and reads as duplicates (investigation E-001…E-003).
- Desired outcome: the Projects tree reflects the stored data: a Project lists exactly the runs started under it. A run appears in one place. A run not started under a Project is not in the Projects tree; it stays in Workspaces.
- Success: with the user's real kind of case (one Project Task Manager run started in a workspace that handed out Tasks of several Projects), every Project shows no runs; starting a run under a Project lists it only there, with its delegated work beneath it.

## Behavior

| ID | Current (347, at `f7f331d96b`) | Desired | Preserved |
| --- | --- | --- | --- |
| BEH-001 | A Project lists runs started under it plus every run hosting an assignment of its Tasks (E-001) | A Project lists only runs started under it (`project_runs.json`) | Recording of runs started under a Project (347 REQ-004/005/006); Task records unchanged |
| BEH-002 | Under a run in Project P, delegated rows are limited to P's Task work (+ Temp-task work when started under P) | Under a run, its delegated rows are shown exactly as in Workspaces (all of them, live; closed ones leave as today) | Delegated row components, Task lines, Stop, open, closure hiding |
| BEH-003 | Agent groups keep 6 newest plus every run hosting open work of P | Agent groups keep the 6 newest runs, as in Workspaces | Opening by run id |
| BEH-004 | Projects mode re-reads on Task events of P, on Temp-task events naming a listed host, on unknown copy keys, on `connected`, on web create/archive/delete/Stop | Re-reads on `connected` and on web create/archive/delete/Stop only (the listing changes only when runs are started, archived, deleted or stopped) | Live status overlay from contexts |

## Scope Guardrail

### In-Scope Use Cases

| ID | Use case | Scenarios |
| --- | --- | --- |
| UC-001 | See a Project's runs: only those started under it | SCN-001, SCN-002 |
| UC-002 | Follow a run's delegated work under it in Projects mode | SCN-002 |

### Out Of Scope

- Moving or attaching an existing run (such as "hello") to a Project (not requested; the 347 out-of-scope item stays).
- Workspaces mode, the right Projects board, Task records, delegation and closure.
- A separate list of a Project's delegated work from runs outside the Project (the tree reflects the data; the board already lists Tasks and their workers).

### Non-Goals

- No change to starting runs under a Project, the chip, the folder rule, the Project instruction section, the briefcase icon, or the switch.

### Removed From 347 (by this decision)

347 REQ-003 (b) "or host any assignment of one of this Project's Tasks"; REQ-008's per-Project scoping of delegated rows and its multi-Project rule (DEC-013, SR-008 AR-002); REQ-010's "plus hosts of open work"; REQ-011's Task-event re-reads; 347 AC-002, AC-007, AC-009 as written; the Product spec parts that show a run shared by several Projects (VIS-002/VIS-003 shared run, UXJ-006) and Org rows under a Project (Orgs cannot be started under a Project, 347 DEC-006).

### Preserved Behavior Boundary

All other 347 requirements and ACs; Workspaces mode exactly as today; existing data unchanged.

### Prerequisites

None.

### Review Authority

As in 347: blocking findings cite these IDs; new behavior is a Requirement Gap.

## Requirements

| ID | Requirement | BEH | Priority | Source |
| --- | --- | --- | --- | --- |
| REQ-001 | A Project in the Projects tree lists exactly the top-level Agent and Team runs started under it (its `project_runs.json`), not archived, grouped as in a workspace (6 newest per agent group, Teams uncapped). A run is listed under at most one Project. Runs not started under a Project are not listed in Projects mode. | 001, 003 | Must | User decision |
| REQ-002 | Under a listed run, its delegated runs (assigned workers, team members, sub-work, remote runs) are shown exactly as in Workspaces mode, whichever Project their Tasks belong to. | 002 | Must | DEC-002 |
| REQ-003 | Projects mode stays current: after `connected`, and after a run is started, archived, deleted or stopped from this window, the affected Projects are read again; status changes come from the live contexts as today. | 004 | Must | 347 REQ-011 kept for what can change |
| REQ-004 | A Project with no runs shows the existing hint "No runs yet. Use + to run an agent or team for this Project." | 001 | Must | 347 Product spec (VIS-004) |
| REQ-005 | Nothing in stored data changes: Task records, run records and `project_runs.json` are read as they are; no migration. | — | Must | Data continuity |

## Acceptance Criteria

| ID | REQ | Trigger | Observable outcome | Verification |
| --- | --- | --- | --- | --- |
| AC-001 | 001, 004, 005 | A node like the user's: one Project Task Manager run started in a workspace that handed out Tasks of 3 Projects; no run started under a Project | Every Project shows "No runs yet"; the run is shown only in Workspaces, with its delegated work as today | Server read test + browser on that fixture |
| AC-002 | 001, 002 | Start an Agent under P; it delegates a Task of P and a Task of Q | The run is listed once, under P; both delegated runs are nested under it; Q shows "No runs yet" | Real delegation (scripted runtime allowed) + browser |
| AC-003 | 001 | Start a Team under P | Listed once under P's TEAMS group | Server read test |
| AC-004 | 003 | Start, archive, delete, Stop a run under P; reconnect | The tree shows the change without a reload | Store tests + browser |
| AC-005 | 005 | Existing data from before the change | Read as is; nothing written by the change | Server tests |

## Scenarios

| ID | Kind | Goal | Steps | Outcome | Validity |
| --- | --- | --- | --- | --- | --- |
| SCN-001 | User | Open Projects mode on existing data | Switch to Projects | Projects without runs started under them show "No runs yet" | Supported Normal (the user's case) |
| SCN-002 | User | Work under a Project | "+" or chip → send → the run delegates | Run under P with its delegated work nested | Supported Normal |

## Decisions

| ID | Question | Reasoning and recommendation | Owner | Status |
| --- | --- | --- | --- | --- |
| DEC-001 | Which runs does a Project list? | Only runs started under it; the tree reflects the stored data. | User | Decided by the user |
| DEC-002 | What is nested under a run in Projects mode? | All its delegated work, as in Workspaces: the run lives in one place, so per-Project filtering has no purpose, and showing less than the run did would again not reflect the data. | Solution Designer | Decided (user informed) |
| DEC-003 | Cap | Same as Workspaces (6 newest per agent group); the "plus open-work hosts" rule existed only for derived hosts. | Solution Designer | Decided |
| DEC-004 | Orgs under a Project | None (Orgs are not started under a Project); the ORGS group no longer appears in Projects mode. | Solution Designer | Decided |

## Data Continuity

Persisted data affected: No. Nothing is written or migrated; existing Projects without `project_runs.json` simply list no runs.

## Readiness

- Content ready: Yes. Approval recorded: Yes (user, DEC-001). Ready for design: Yes.
