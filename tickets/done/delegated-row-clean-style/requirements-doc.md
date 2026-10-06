# Requirements Document — delegated-row-clean-style

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-001`
- Package identifier: `delegated-row-clean-style`
- Request: User, 2026-10-06. Split the approved delegated-row restyle (REQ-010 of `task-run-resources-workspace-cleanup`) into its own ticket and ship it first. User's words: "can we bootstrap another ticket for this because I feel this one is a little bit independent", and "this one is a complete UI improvement … work on … this first, and after this is done, then we can come back".
- Requirements owner: Solution Designer
- Date: 2026-10-06
- Approval state and reference:
  - The intended behavior is unchanged from REQ-010 / AC-011 / BEH-007 of `task-run-resources-workspace-cleanup`, approved by the user as SD-AP-001 on 2026-10-06 ("yess", basis SR-003).
  - The Product UI that defines it was confirmed by the user on 2026-10-06: "perfect. i like the UI. now i confirm".
  - The split into this ticket is the user's explicit instruction above (SD-AP-002).
- Exact approved baseline: REQ-001 / AC-001 / AC-002 below = source REQ-010 / AC-011 text.
- Behavior-defining supplement: the Product UI/UX spec `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/task-run-resources-workspace-cleanup/ui-ux-spec.md` @ design repo `a38bd6e`. Only its "Visual Language" row style, "Hover, focus, selected" and VIS-001/VIS-008 delegated-row appearance apply here. Removal, motion and selection fallback stay in the paused source ticket.

## Problem And Desired Outcome

- Problem: delegated rows in the Workspaces tree look unclean. These are rows for delegated Agents, delegated Teams and their members under a root run. They sit in a dashed indigo box with a tint, and a delegated Team's bolt is inside another dashed box. Under Agent Org roots, a delegated Team uses an indigo user-group icon.
- Desired outcome: delegated rows read like every other tree row, as approved in the Product design.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Current | Desired | Preserved |
| --- | --- | --- | --- | --- |
| BEH-001 (source BEH-007) | User | Agent/Team-root delegated rows (`WorkspaceTransientExecutionRow.vue`): dashed `indigo-200` border, `bg-indigo-50/40`, `hover:bg-indigo-50`, `ring-1 indigo-300` focus, bolt in a dashed white box (12 px, indigo-600). Org-root delegated rows (`WorkspaceAgentOrgHistoryCollection.vue`): already plain; delegated Team icon `user-group` indigo-600 at 14 px, regular weight; no focus-visible ring. | No border and no tint at rest; `gray-600` text; `gray-50` hover; `2px indigo-500` focus ring; selected style identical to member rows. A delegated Team shows only `heroicons:bolt-20-solid` at 16 px in `slate-500`, with its name `font-semibold`. A delegated Agent keeps its status dot and initials avatar. The same applies under Agent, Agent Team and Agent Org roots. No new Task-linked marker. | Tree structure, order, indentation, branch lines, status dots, avatars, disclosure, accessible names, selection behavior, loading/error inspection line. |

## Scope Guardrail

### In-Scope Use Cases

| ID | Use Case |
| --- | --- |
| UC-001 | Delegated rows (Agent, Team, Team members) under Agent, Agent Team and Agent Org roots use the clean row style. |

### Out Of Scope

Hiding rows when a Task is DONE, leave motion, selection/focus fallback, and any server or contract change. These all remain in the paused ticket `task-run-resources-workspace-cleanup`.

### Non-Goals

Consolidating the Org rows onto the shared row component.

### Preserved Behavior Boundary

All row behavior except the visual values listed in BEH-001.

## Requirements

| ID | Requirement | BEH | Priority | Source |
| --- | --- | --- | --- | --- |
| REQ-001 | Delegated rows (delegated Agents, delegated Teams and their members) under Agent, Agent Team and Agent Org roots read like other tree rows: no dashed indigo border or tint; `gray-600` text; `gray-50` hover; `2px indigo-500` focus ring; selected style identical to member rows; a delegated Team shows only its bolt icon in `slate-500`; a delegated Agent keeps its status dot and initials avatar. No new Task-linked marker. Applies to all delegated rows, Task-linked or not. | BEH-001 | Must | Source REQ-010 (SD-AP-001); UI/UX spec Visual Language |

## Acceptance Criteria

| ID | REQ | Trigger | Expected | Verification |
| --- | --- | --- | --- | --- |
| AC-001 | REQ-001 | Render delegated Agent, Team and member rows under Agent, Team and Org roots. | Matches the UI/UX spec Visual Language and the delegated-row appearance in VIS-001/VIS-008. Specifically: no dashed box or tint; `gray-600` text; `gray-50` hover; `2px indigo-500` focus; bolt in `slate-500` at 16 px; Team name semibold; selected as member rows. | Component tests + browser visual check |
| AC-002 | REQ-001 | Interact with rows (select, expand, keyboard Enter/Space, tooltip). | Behavior unchanged. Existing tests pass. | Existing and updated component tests |

## UI, Interaction, And Experience Requirements

- Applicable: `Yes`. Linked UI/UX spec as above (Product-owned, approved, user-confirmed 2026-10-06).
- Normative: the Visual Language values and the delegated-row appearance in VIS-001/VIS-008. Fixture content is illustrative.

## Data Continuity

Not affected.

## Readiness Check

- Content ready, approved: `Yes` (SD-AP-001 behavior; SD-AP-002 split instruction).
- Approved package ready for design: `Yes`.
