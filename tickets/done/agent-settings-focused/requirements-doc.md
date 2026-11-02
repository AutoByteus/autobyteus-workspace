# Requirements Document

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-002`
- Package identifier: `agent-settings-focused`
- Request / ticket: Project Task `autobyteus-366`
- Requested by: the user, through `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`)
- Requirements owner: Solution Designer
- Date: 2026-11-02
- Approved by and reference: `User` for DEC-001 and the direction, 2026-11-02, in the Task: storage stays in the team's tree, "let the team work on this task", the Settings show one agent. DEC-002 and DEC-003 were not answered in his own words; `Solution Designer within the direction (user informed)` took the recommendations
- Exact approved requirements baseline: SR-002
- Behavior-defining supplements: `storage-analysis.md`

## Problem And Desired Outcome

- Problem: Settings of a focused agent show the whole group: the run's card, then "Members", then every delegated copy (the user's screenshot, E-10). Changing one agent means finding it in a long list.
- Desired outcome: a focused agent's Settings show that agent's configuration. Changing the model or runtime of a copy or member stays possible.
- Second question: whether each member should keep its settings in its own run metadata. Answered in `storage-analysis.md`.

## Relevant Current And Desired Behavior

| Behavior ID | Current | Desired (proposed) | Preserved |
| --- | --- | --- | --- |
| BEH-001 | A hub's Settings list all its delegated copies | The hub's Settings show the hub. A copy's settings show when the copy is focused | Stop one copy to change its model (autobyteus-80), and its next message resumes on the new model |
| BEH-002 | A team's or org's Settings show the team's card and all members | A focused member's Settings show that member; team-wide settings stay one step away (DEC-002) | Team-wide change of model; per-member override; Org workspaces |
| BEH-003 | Saved per run, in one save | The same one save; the save bar names every agent with unsaved edits, since they may no longer be on screen | Atomic save; stopped-run rule for edits |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| ID | Use Case |
| --- | --- |
| UC-001 | Open Settings of a focused standalone run, copy, team member or org member |
| UC-002 | Change a copy's or member's model or runtime from its own Settings |
| UC-003 | Change team-wide or org-wide settings |

### Out Of Scope

- Moving stored settings (DEC-001: decided, stays in the tree). Unifying the four shapes: the Task's bookmark, the user decides later.
- Editing a member while its team runs (DEC-003).

### Non-Goals

- Unifying the four record shapes.

### Preserved Behavior Boundary

No loss of function: every setting reachable today stays reachable and changeable. No stored data changes without the user's approval and a backup.

### Prerequisites

None. Sequencing (DEC-005): the build is on autobyteus-348's branch; merging waits for 348 to reach `personal`.

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID that it protects.
- A finding that would introduce new product behavior, policy, threat model, migration obligation, compatibility promise, or operational contract is a `Requirement Gap`; it requires explicit user approval before becoming authoritative.
- An adjacent concern outside the approved boundary may be recorded as a non-blocking risk, recommendation, or follow-up. It is not a required design correction, unless it is a prerequisite.
- A downstream reviewer comment does not amend this requirements basis. The Solution Designer must update the canonical requirements and obtain renewed user approval before a scope-changing proposal can govern design or implementation.

## Requirements

| ID | Requirement | Behavior |
| --- | --- | --- |
| REQ-001 | Settings show the focused agent's own configuration: standalone run, copy, team member or org member | BEH-001, BEH-002 |
| REQ-002 | No list of delegated copies or members in a focused agent's Settings | BEH-001, BEH-002 |
| REQ-003 | A copy's or member's model and runtime can be changed from its own Settings, under today's stop rules | BEH-001, BEH-002 |
| REQ-004 | Team-wide and org-wide settings stay reachable and changeable (DEC-002) | BEH-002 |
| REQ-005 | Nothing is saved without being named: edits made on several agents stay pending across focus changes, the save bar names them, and Save commits exactly those | BEH-003 |

## Acceptance Criteria

| AC | Requirements | Expected Outcome |
| --- | --- | --- |
| AC-001 | REQ-001, REQ-002 | Focusing the hub: Settings show the hub's card and no copy list. Focusing a copy: that copy's card |
| AC-002 | REQ-001, REQ-002 | Focusing a team or org member: that member's card and no member list |
| AC-003 | REQ-003 | A stopped copy's and a stopped member's model and runtime can be changed there, and the next message uses them; a running one shows today's stop rule |
| AC-004 | REQ-004 | A team-wide change reaches its followers as today |
| AC-005 | REQ-005 | Editing one member and saving leaves the others unchanged. Editing A, focusing B: A's edit stays pending and the save bar names A; Save commits it, Cancel discards it |
| AC-006 | all | Suites pass from a clean clone; merged to `personal`. Release only on the user's word |

## UI, Interaction, And Experience Requirements

- Applicable: `Yes`. The existing settings card and member list are reused; the additions are a two-way switch (DEC-002), a one-line hint (DEC-004) and the save bar's names. No Product Design round (DEC-006). The user's screenshot is the current state.

## Data Continuity And Acceptable Loss

- Persisted data affected: `No` under the recommendation.

## Decisions

| ID | Question | Reasoning And Recommendation | Owner | Status |
| --- | --- | --- | --- | --- |
| DEC-001 | Keep members' settings in the team's tree (a), or give each member its own run metadata (b)? | `storage-analysis.md`. (b) is a sound model but means a migration, 3.6× file reads on listing and a non-atomic team save, with nothing visible gained; the reasons copies got own files do not apply to fixed members. Recommend (a), and revisit if members become independent | User | Decided by the user, 2026-11-02: (a), the tree stays |
| DEC-002 | Where do team-wide settings go once a member's Settings show only that member? | (a) A "Team settings" switch at the top of a member's Settings, and the same for an Org. (b) Only when the team's own row is selected: a team row focuses its coordinator today, so it needs a new selection state. Recommend (a): always one click away, no new selection. He approved the work without answering separately, so (a) is taken within the direction; he can change it | Solution Designer | Decided |
| DEC-003 | Should a member be editable while its team runs? | Today the whole team must be stopped. It is a separate feature, not a storage matter. Not in this ticket; not recorded as a follow-up unless he asks | Solution Designer | Decided |
| DEC-005 | Build now or after autobyteus-348? | 348's branch contains all of `personal` (merge-base = `c952758a81`) and shares six web files. Building on it needs no waiting and no second conflict resolution; the PM left this to the team. Build on it, and merge after 348 lands | Solution Designer | Decided |
| DEC-006 | Product Design round? | The Task says "where needed". The change removes lists and reuses the existing card; the only new elements are a two-way switch, a hint and names in the save bar. Not needed | Solution Designer | Decided |
| DEC-004 | Hub with copies: anything left in its Settings about copies? | Copies are already in the left tree and are reached by focusing them. A short line ("Select a copy on the left to change its settings") keeps it discoverable. Decided | Solution Designer | Decided |

## Readiness Check

- Content ready for approval: `Yes`
- Approval recorded: `Yes`
- Approved requirements package ready for architecture design: `Yes`
- Remaining blocker: none
