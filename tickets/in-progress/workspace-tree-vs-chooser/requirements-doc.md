# Requirements Document

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-003`
- Package identifier: `workspace-tree-vs-chooser`
- Request / ticket: Project Task `autobyteus-385`
- Requested by: the user, through `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`)
- Requirements owner: Solution Designer
- Date: 2026-11-05
- Approved by and reference: `Solution Designer within the direction (user informed)`, 2026-11-05. The user, in this conversation: "you'll do your own work … your design and the implement based on the current ticket itself … then you think about how you would do it". He left DEC-001 to the Solution Designer, which took its recommendation (a)
- Exact approved requirements baseline: SR-003 (SR-002 plus DEC-006 and AC-008, within the direction)

## Problem And Desired Outcome

- Problem: the left Workspaces tree and the chat's workspace chooser read one list (E-04, E-06). Removing a folder from the tree also takes it out of the chooser. And a delegation into a Project's folder can bring a removed folder back into the tree (E-03).
- Desired outcome: being **shown in the tree** and being **choosable for a new run** are separate. Removing from the tree only hides the folder there. Removing from the chooser is a deliberate, separate action. No files, runs, memories or history are lost.

## The User's Typical Scenario (2026-11-05, his words)

"Normally, when I remove it … I have already archived … all those stuff … inside that workspace." "If I want to run agent or agent team on a certain workspace, it appears on the left side." "Of course, the user will not delete it when there are still runs."

So the normal path is: archive or delete a folder's runs; hide the folder from the tree; it stays in the chat chooser; starting a run there later brings it back with that run. The tree shows where work is; the chooser holds every folder the user wants to use.

## Relevant Current And Desired Behavior

| Behavior ID | Current | Desired | Preserved |
| --- | --- | --- | --- |
| BEH-001 | Tree "Remove" unregisters the folder: gone from the tree and from every chooser | Tree "Remove" hides it from the tree (and the phone's work list) only; it stays choosable everywhere a folder is chosen | Blocked while a run is active in it; Temp workspace not removable |
| BEH-002 | No way to remove a folder from the chooser | The chooser offers "Remove" on each user folder, with a confirmation: it unregisters the folder (today's removal), so it leaves the chooser and the tree | Files, memories, history untouched; blocked while a run is active |
| BEH-003 | A delegation or a new run re-registers a removed folder, and it reappears in the tree | Re-registering never un-hides; a hidden folder returns to the tree only as DEC-001 says | — |
| BEH-004 | A removed folder's runs are not in the tree | The same for a hidden folder; they return when it is shown again | Run history on disk |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| ID | Use Case |
| --- | --- |
| UC-001 | Hide a folder from the left tree (and the phone's work list) and still choose it for a new run |
| UC-002 | Remove a folder from the chooser on purpose |
| UC-003 | A hidden folder returns to the tree when the user starts a run in it or adds it again (DEC-001) |

### Out Of Scope

- Project folder links (a separate list, untouched).
- Deleting files or run history.

### Non-Goals

- A separate settings page for managing folders.

### Preserved Behavior Boundary

No files, memories, runs or history lost; `workspaces.json` keeps its shape (no migration); the active-run guard; Temp workspace behavior.

### Prerequisites

None.

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID that it protects.
- A finding that would introduce new product behavior, policy, threat model, migration obligation, compatibility promise, or operational contract is a `Requirement Gap`; it requires explicit user approval before becoming authoritative.
- An adjacent concern outside the approved boundary may be recorded as a non-blocking risk, recommendation, or follow-up. It is not a required design correction, unless it is a prerequisite.
- A downstream reviewer comment does not amend this requirements basis. The Solution Designer must update the canonical requirements and obtain renewed user approval before a scope-changing proposal can govern design or implementation.

## Requirements

| ID | Requirement | Behavior |
| --- | --- | --- |
| REQ-001 | The tree's "Remove from Workspaces" hides the folder from the desktop tree and the phone's work list only; every folder chooser still offers it | BEH-001 |
| REQ-002 | Each user folder in the chat chooser has a "Remove" action with a confirmation that unregisters it (today's removal): it leaves every list | BEH-002 |
| REQ-003 | A hidden folder returns to the tree for good when the user creates a run in it (an agent, team or org run, from any launch surface) or adds it as a workspace again. While any of its runs is active (restored, resumed by a message, or started), the tree shows it anyway, with that run; when no run is active and it was not brought back, it is hidden again. Anything else that uses the folder, such as a delegation or an application, does not bring it back | BEH-003 |
| REQ-004 | Hiding and removing never delete files, memories, runs or history, and are blocked while a run is active in the folder | BEH-001, BEH-002 |
| REQ-005 | The hidden state is kept by the server (every window and the phone agree) without changing `workspaces.json` | BEH-001 |

## Acceptance Criteria

| AC | Requirements | Expected Outcome |
| --- | --- | --- |
| AC-001 | REQ-001 | Hide a folder from the tree: it disappears from the tree and the phone's work list, and is still in the chat chooser, which can start a run in it |
| AC-002 | REQ-002 | Remove a folder from the chooser: it is gone from the chooser and the tree; its files and run history are still on disk |
| AC-003 | REQ-003 | After a delegation into a hidden folder, it is still hidden |
| AC-004 | REQ-003 | Hide a folder, then start an agent run there from the chat (prepared, then the first message): the folder and the new run are in the tree, and stay after the run stops. The same for a team run, an org run, and "Add workspace" with that folder |
| AC-008 | REQ-003 | Hide a folder with a finished run; restore that run (Restore, or a message from the Projects tree): the tree shows the folder with the active run; after the run stops, the folder is hidden again |
| AC-005 | REQ-004 | With a run active in the folder, both actions are refused with today's message |
| AC-006 | REQ-005 | After a reload, a second window and the phone show the same hidden state; `workspaces.json` is unchanged in shape |
| AC-007 | all | Tests; suites pass from a clean clone; merged to `personal`. Release only on the user's word |

## UI, Interaction, And Experience Requirements

- Applicable: `Yes`. Tree row action renamed "Hide from Workspaces" (DEC-003). Its confirmation says the folder stays available in chat and comes back with the next run started there; when the folder still has runs in the tree, it adds that they are hidden with it until then (DEC-005). The chooser gets a small remove button on hover for each user folder, with today's confirmation text. No Product Design round needed (DEC-004).

## Data Continuity And Acceptable Loss

- Persisted data affected: `Yes`, additively. A new small file of hidden folder IDs; `workspaces.json` untouched. No loss; no migration.

## Decisions

| ID | Question | Reasoning And Recommendation | Owner | Status |
| --- | --- | --- | --- | --- |
| DEC-001 | When does a hidden folder come back to the tree? | The tree shows where runs are. If you start a new run in a hidden folder and it stays hidden, that run is nowhere in the tree. Automatic use, such as a delegation into a Project's folder, should not undo your cleanup. (a) It comes back when **you** start a run there from the chat (or any launch page). (b) It never comes back by itself; an explicit "Show in Workspaces" in the chooser brings it back. Recommend (a). The user left it to the Solution Designer (2026-11-05): (a), and adding the folder again ("Add workspace") brings it back too, as an explicit user action | Solution Designer | Decided |
| DEC-005 | Hiding a folder that still has finished (non-archived) runs | The user's normal case is an empty folder (runs archived or deleted first). A running run already blocks (REQ-004). Blocking finished runs too would force archiving first; allowing it silently would surprise. Allow it, and say in the confirmation that those runs are hidden with it until the folder comes back. Nothing is deleted | Solution Designer | Decided |
| DEC-006 | Restoring or resuming a run in a hidden folder (ARCH-REV-001 AR-002) | DEC-001's reason is that the tree must never hide a run the user is working on. A restore is not a new choice of folder, though: it is the user continuing old work, often from the Projects tree. Rule: an active run always shows its folder while it is active; only creating a run or adding the folder brings it back for good. This covers every restore and resume path, which go through many activation points, without wiring each one | Solution Designer | Decided |
| DEC-002 | How to store "hidden from the tree" | A per-entry flag would change `workspaces.json`'s shape and break older builds (E-02). A separate list of hidden IDs needs no migration, and an older build simply ignores it. Separate list | Solution Designer | Decided |
| DEC-003 | Wording | The tree's action becomes "Hide from Workspaces", with a confirmation saying it stays available when choosing a workspace in chat; the chooser's action is "Remove", with today's removal text | Solution Designer | Decided |
| DEC-004 | Product Design round? | One renamed action and one small button; not needed | Solution Designer | Decided |

## Readiness Check

- Content ready for approval: `Yes`
- Approval recorded: `Yes`
- Approved requirements package ready for architecture design: `Yes`
- Remaining blocker: none
