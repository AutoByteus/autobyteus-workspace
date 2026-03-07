# Requirements

## Status

- Current Status: `Refined`
- Previous Status: `Design-ready`

## Goal / Problem Statement

In the run-history sidebar, each run row currently labels with team name. When many runs belong to the same team, rows appear identical and users cannot identify a specific run quickly.

Additional issue: team entries reorder dynamically by update time, causing items to jump in the list during usage.

Goals:
- Display team run identifier (`teamRunId`) as primary team row label.
- Keep team row order stable (no dynamic reorder on activity updates).

## Scope Classification

- Classification: `Small`
- Rationale:
  - UI projection/render behavior update in run-history tree.
  - No backend contract changes expected.

## In-Scope Use Cases

- `UC-001`: User opens workspace run history and can visually distinguish runs from the same team by run ID.
- `UC-002`: User selects a run from list entries where multiple rows share the same team name; row labels remain unique.
- `UC-003`: Team rows remain in stable order while run activity changes; no jumping-to-top behavior.

## Out Of Scope / Non-Goals

- No changes to run creation logic.
- No backend schema/API rename.
- No redesign of sidebar layout beyond row text content and ordering behavior.

## Acceptance Criteria

1. Each run entry in left-sidebar run history shows team run ID (not team name) as the row primary label.
2. Runs from the same team display different labels when their run IDs differ.
3. Existing row interaction behavior (selection, status dot, navigation) remains unchanged.
4. Team row order does not dynamically reorder based on live `lastActivityAt` updates.
5. Team order is stable across reactive updates in the current session (preserve source/insertion order rather than recency sort).

## Constraints / Dependencies

- UI must use already-available run-history data fields; avoid extra fetches if possible.

## Assumptions

- Run-history payload includes a stable team run ID field usable by the sidebar component.
- Backend/API order can be treated as base order; frontend should not override with dynamic recency sorting.

## Requirement IDs

- `R-001`: Render `teamRunId` (or equivalent run identifier field) in each run-history row label.
- `R-002`: Preserve current row selection and navigation behavior.
- `R-003`: Preserve stable team row ordering across reactive updates; do not sort by latest activity in tree projection.
