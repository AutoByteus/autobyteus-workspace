# Requirements Document

## Document Status

- Status: `Approved`.
- Current solution revision ID: `SR-001`.
- Package identifier: `run-expand-motion`.
- Request / ticket: Project Task `autobyteus-390`.
- Requested by: the user, through `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`).
- Requirements owner: the Solution Designer.
- Date: 2026-11-06.
- Approved by: the Solution Designer, within the request's direction (the user informed). The Task states the outcome ("make the expand and collapse feel calm") and its constraints. No product decision is open: no motion was designed (E-07), so the rows appear at once, as everywhere else in the panel.

## Problem And Desired Outcome

- **Problem:** expanding an Agent run in the Runs view slides all its delegated rows down from the top of the window over 0.2 s (E-05).
- **Desired outcome:** expand shows the rows at once in their place, and collapse hides them at once. That matches the Workspaces and Projects trees and the designed "new rows appear at once" (E-02, E-06).

## Scope Guardrail

### In-Scope Use Cases

| ID | Use Case |
| --- | --- |
| UC-001 | Expand or collapse an Agent run's delegated work in the Runs view |

### Out Of Scope

- The designed 200 ms motion of rows that leave when their Task is DONE, and of the rows below them.
- The Workspaces and Projects views, which do not have the problem.

### Preserved Behavior Boundary

- The Runs view's content and behavior: the rows shown, their order, selection, the per-session fold state (runs start expanded), the disclosure, the delegated Team rows' own expand, and the leave motion of rows of DONE Tasks while expanded.
- A stopped run's stored delegated view still loads and shows.
- No stored data changes.

### Review Authority

As the team's standard. A finding that adds behavior is a `Requirement Gap`.

## Requirements

| ID | Requirement |
| --- | --- |
| REQ-001 | Expanding an Agent run in the Runs view shows its delegated rows in their final place at once. No row moves from elsewhere on screen |
| REQ-002 | Collapsing hides them at once |
| REQ-003 | Everything else about the Runs view stays as it is (Preserved Behavior Boundary) |

## Acceptance Criteria

| AC | Requirements | Expected Outcome |
| --- | --- | --- |
| AC-001 | REQ-001 | In a real browser, collapse then expand a run with many delegated rows. In the first frame and after, every delegated row is at its final position with no transform. A regression check fails on today's code (E-05) |
| AC-002 | REQ-002 | After collapse, the delegated rows are not shown and nothing below them animates in from elsewhere |
| AC-003 | REQ-003 | The disclosure, the rows and a stopped run's stored rows are the same after fold and unfold. Selecting a delegated row and the DONE-row leave motion while expanded are unchanged. The existing suites pass |
| AC-004 | all | Tests; the suites pass; finalized on `personal`. Release only on the user's word |

## UI, Interaction, And Experience Requirements

Applicable: the rows appear and disappear without motion, which removes an accidental effect. No new look, so no Product Design round is needed (E-07).

## Data Continuity

Persisted data affected: `No`.
