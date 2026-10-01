# Requirements Document — task-team-row-collapse-chevron

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-003`
- Package identifier: `task-team-row-collapse-chevron`
- Request: user request 2026-09-29 — delegated ("task") Agent Team row in the Agent Org tree has no chevron, so it cannot be collapsed like the normal Team row.
- Requirements owner: Solution Designer
- Date: 2026-09-29
- Approval state and reference: Approved by user in conversation 2026-09-29 (row-click decision: "When I click the row, it will collapse ... same for the task team"; default: "Okay, then start open.")
- Exact approved requirements baseline: SR-003 (this document)
- Behavior-defining supplements: none

## Problem And Desired Outcome

- Problem: In the Agent Org history tree, a delegated Team row (e.g. `StudentStudyGroup — Started by Teacher`) always shows its members and cannot be collapsed. The mounted (configured) Team row has a chevron and collapses (E-001, E-002, E-003).
- Desired outcome: A delegated Team row has a chevron and collapses/expands its subtree, consistent with the mounted Team row.

## Relevant Current And Desired Behavior

| Behavior ID | Current | Desired | Preserved |
| --- | --- | --- | --- |
| BEH-001 | Delegated Team row: blank chevron slot, no `aria-expanded`, children always visible (E-001, E-003). | Chevron shown; toggling hides/shows every descendant row (members, nested Teams, nested delegated executions). | Row name, team icon, "Started by …" line, title, aria-label content. |
| BEH-002 | Clicking the delegated Team row opens (inspects) its coordinator; it does not toggle. | Clicking the row toggles collapse/expand **and** opens the coordinator — the same as the mounted Team row (toggle + select). | Row-click inspection target (coordinator). |
| BEH-003 | Mounted Team rows, agent rows, delegated Agent rows. | Unchanged. | All of them. |

## Scope

- In scope: UC-001 — user collapses/expands a delegated Team row (including a nested Team inside a delegated Team) in the Agent Org tree.
- Out of scope: the standalone Team run tree (already supports this, E-006); persisting collapse state across reloads; restyling rows; server/API changes.

## Requirements

| ID | Requirement | Behavior |
| --- | --- | --- |
| REQ-001 | Every delegated Team row in the Org tree that has child rows shows a chevron in the same position and style as the mounted Team row (pointing down when expanded, right when collapsed). | BEH-001 |
| REQ-002 | Activating the chevron toggles visibility of all of that row's descendant rows; tree connector lines stay correct in both states. | BEH-001 |
| REQ-003 | Collapse state is per delegated Team execution: collapsing one delegated Team does not affect the mounted Team with the same name, or another delegation of the same Team (E-005). | BEH-001, BEH-003 |
| REQ-004 | The row exposes its expanded/collapsed state to assistive tech (`aria-expanded`), and the chevron is keyboard-operable. | BEH-001 |
| REQ-005 | Default state: **expanded** (members visible as today). Approved OQ-001. | BEH-001 |
| REQ-006 | Clicking anywhere on the delegated Team row toggles its collapse state and opens its coordinator, the same as the mounted Team row (user decision 2026-09-29, OQ-002). | BEH-002 |

## Acceptance Criteria

| ID | Req | Trigger | Expected |
| --- | --- | --- | --- |
| AC-001 | REQ-001, REQ-005 | Org run with a delegated Team is shown | Chevron visible (pointing down); members visible. |
| AC-002 | REQ-002, REQ-004 | Click chevron | Members/nested rows hidden; chevron points right; `aria-expanded="false"`; connector lines correct. Click again restores. |
| AC-003 | REQ-003 | Mounted `StudentStudyGroup` and delegated `StudentStudyGroup` both present | Toggling one leaves the other's state unchanged. |
| AC-004 | REQ-006 | Click delegated Team row | Expansion state flips (chevron rotates, children hide/show) and the coordinator is inspected. |
| AC-005 | BEH-003 | Existing Org tree interactions | Mounted Team / Agent / delegated Agent rows behave as before; existing specs pass. |

## Resolved Questions

- OQ-001 Default state — **Resolved by user 2026-09-29**: start open (expanded).
- OQ-002 Row click — **Resolved by user 2026-09-29**: row click toggles (and opens the coordinator), exactly like the mounted Team row.
