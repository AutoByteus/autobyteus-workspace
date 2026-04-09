# Requirements

- Ticket: `event-monitor-tool-text-ux`
- Status: `Design-ready`
- Scope Classification: `Small`
- Last Updated: `2026-04-09`

## Goal / Problem Statement

The event monitor currently shows tool-call context in a way that feels fixed-width even when the layout changes. In the center conversation feed, long tool summaries stay clipped to the same short length after the right-side Activity panel is collapsed, so the wider layout does not reveal more of the command or tool context. The user later confirmed that the right-side Activity panel should keep its original interaction model, with deeper tool details continuing to live under `Arguments` and `Result` rather than being duplicated in the header.

## User Evidence

- The user reported that tool command text appears to use a fixed size and does not expand when the right-side panel is collapsed.
- The provided screenshots show `run_bash` rows in the center feed with the same clipped summary before and after the Activity sidebar width changes.
- During verification, the user explicitly confirmed that the Activity card should keep its original style because users can click `Arguments` to see details.

## In-Scope Use Cases

- `UC-001`: A user views a long command-oriented tool call in the center event monitor while the Activity sidebar is open.
- `UC-002`: The same user collapses or narrows the Activity sidebar and expects the center tool row to reveal more summary text automatically.
- `UC-003`: A user keeps using the right-side Activity list as a drill-down surface, opening `Arguments` or `Result` when detailed context is needed.

## Requirements

- `R-001`: Center-feed tool-call summaries must respond to available width instead of being hard-limited by a fixed JavaScript character cutoff.
- `R-002`: Center-feed tool-row flex layout must preserve visible context text under narrow and wide widths so the available width is actually used.
- `R-003`: The right-side Activity panel must keep its original header/detail interaction model; tool details remain available through expandable sections rather than a duplicated header preview.
- `R-004`: Regression coverage must protect the summary extraction logic and the updated component rendering behavior.

## Acceptance Criteria

- `AC-001`: Long command summaries in the center feed are no longer hard-truncated in JavaScript; the DOM retains the full redacted command so CSS/layout width determines how much is visible.
- `AC-002`: Center-feed tool rows use responsive flex sizing so tool context remains visible and grows when more horizontal space becomes available after the Activity sidebar width changes.
- `AC-003`: The Activity panel keeps its original card header style, with tool details still accessed through `Arguments` / `Result` instead of a duplicate preview line.
- `AC-004`: Automated tests verify summary extraction and both affected component-level rendering paths.

## Constraints / Dependencies

- Changes should stay within the existing `autobyteus-web` UI architecture and visual language.
- Existing tool-approval and activity-navigation behavior must remain intact.
- The fix should avoid introducing larger structural changes outside the event monitor components unless a small shared utility clearly reduces duplication.

## Assumptions

- This is a small-scope UI refinement rather than a broader redesign of the workspace layout system.
- Existing stores already provide enough tool argument/context data to build better summaries.

## Open Questions / Risks

- The layout issue may include both fixed-width truncation and flexbox `min-width` behavior; investigation should confirm both before implementation.
- The final implementation should avoid adding redundant detail to the Activity card header.

## Requirement Coverage Mapping

| Requirement ID | Use Case ID(s) |
| --- | --- |
| `R-001` | `UC-001`, `UC-002` |
| `R-002` | `UC-001`, `UC-002`, `UC-003` |
| `R-003` | `UC-003` |
| `R-004` | `UC-001`, `UC-002`, `UC-003` |

## Acceptance Criteria Scenario Intent

| Acceptance Criteria ID | Planned Scenario Intent |
| --- | --- |
| `AC-001` | Validate the summary helper / tool indicator keeps the full command available in the DOM |
| `AC-002` | Validate tool indicator markup exposes responsive summary content without the old fixed truncation behavior |
| `AC-003` | Validate the Activity item continues using its original header/detail interaction model |
| `AC-004` | Run targeted automated tests covering the helper and both affected components |

## Stage 2 Exit Notes

- Investigation confirms the issue is local to the event monitor summary pipeline and header layout.
- No broader workspace layout rewrite is required for this ticket.
- The intended implementation shape remains a `Small` scope change with a shared summary helper, one center-feed component update, and focused regression tests.
