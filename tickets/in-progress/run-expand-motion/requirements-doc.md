# Requirements Document

## Document Status

- Status: `Approved`.
- Current solution revision ID: `SR-002` (after CRR-001 CR-001).
- Package identifier: `run-expand-motion`.
- Request / ticket: Project Task `autobyteus-390`.
- Requested by: the user, through `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`).
- Requirements owner: the Solution Designer.
- Date: 2026-11-06.
- Approved by: the Solution Designer, within the request's direction (the user informed). The Task states the outcome ("make the expand and collapse feel calm") and its constraints. On 2026-11-06 the user added: "something is like dropping fast … that will make user feel very uncomfortable … it's better to be normal". No motion was designed for expanding (E-07). SR-002 extends the same rule to rows pushed by other rows in the Runs view (REQ-004), which the Solution Designer recommended to the user. The user reports that expand and collapse are fine in the Workspaces and Projects views (through the API/E2E round, `98dc9d47a4`), so those views stay as they are. The designed fade of a finished Task's row stays.

## Problem And Desired Outcome

- **Problem:** expanding an Agent run in the Runs view slides all its delegated rows down from the top of the window over 0.2 s (E-05).
- **Desired outcome:** expand shows the rows at once in their place, with their Task lines, and collapse hides them at once. No row in the Runs view slides because rows above it appeared, grew or expanded. Only a finished Task's row still fades and closes gently (E-11).

## Scope Guardrail

### In-Scope Use Cases

| ID | Use Case |
| --- | --- |
| UC-001 | Expand or collapse an Agent run's delegated work in the Runs view |
| UC-002 | Rows shift in the Runs view: a delegated Team row expands, a Task line arrives, a row is added (REQ-004) |

### Out Of Scope

- The designed 200 ms fade and close of a row whose Task is DONE (the rows below follow it by layout, E-11).
- The Workspaces and Projects views: the user reports they are fine, and they keep their current motion.

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
| REQ-004 | In the Runs view, a row never slides from another position because rows above it were added, grew (for example a late Task line) or expanded. It is shown at its new place at once. A finished Task's row keeps its fade and close |

## Acceptance Criteria

| AC | Requirements | Expected Outcome |
| --- | --- | --- |
| AC-001 | REQ-001 | In a real browser, collapse then expand a run with many delegated rows **that have Task lines**. In the first frame and after, every delegated row is at its final position, with its Task line and no transform. A regression check fails on the base code (E-05) and on SR-001's code (E-08) |
| AC-002 | REQ-002 | After collapse, the delegated rows are not shown and nothing below them animates in from elsewhere |
| AC-003 | REQ-003 | The disclosure, the rows and a stopped run's stored rows are the same after fold and unfold. Selecting a delegated row and the DONE-row leave motion while expanded are unchanged. The existing suites pass |
| AC-006 | REQ-003 | The Workspaces and Projects views keep their current motion; their existing tests and probes pass unchanged |
| AC-005 | REQ-004 | In a real browser, in the Runs view: expanding a delegated Team row, and a Task line arriving late, move no row with a transform. A row of a DONE Task still fades, and the row below glides up as it closes (E-11) |
| AC-004 | all | Tests; the suites pass; finalized on `personal`. Release only on the user's word |

## UI, Interaction, And Experience Requirements

Applicable: rows appear, disappear and shift without motion, apart from the finished-Task fade. This removes an accidental effect, and the user asked for "normal". No new look, so no Product Design round is needed (E-07).

## Data Continuity

Persisted data affected: `No`.
