# Team Grid View Modes Requirements

- Status: `Design-ready`
- Ticket: `team-grid-view-modes`
- Last Updated: `2026-03-07`

## Goal / Problem Statement

The current team workspace supports only a single-member center-pane view for an active team run. Users can switch focused members from the left tree, but they cannot observe multiple team members' live activity at the same time. The goal is to add center-pane team viewing modes that preserve the existing focused-member semantics while enabling broader multi-member visibility.

Live validation and follow-up UX review clarified that the summarized compact-tile approach is not acceptable. `Grid` and `Spotlight` should preserve the real event-monitor conversation flow and alignment in a smaller read-only viewport so users can watch messages continue to flow naturally without losing information.
The next live-validation round clarified one more requirement: each multi-member tile must own its own bounded viewport and internal scrolling. Long conversations should flow upward inside each tile instead of stretching the outer center pane into one giant scroll surface.
A later live-validation round clarified one more layout requirement: when a team has only a small number of members, `Grid` should allocate the available row width to those members instead of reserving empty desktop columns that leave large unused gaps.

## In-Scope Use Cases

- `REQ-001` When a team run is selected, the user can switch the center pane between team layout modes without changing the selected team run.
- `REQ-002` In `Focus` mode, the center pane shows one focused member in the existing detailed event-monitor style.
- `REQ-003` In `Grid` mode, the center pane shows smaller live read-only event-monitor tiles for all active members of the selected team run at the same time.
- `REQ-004` In `Spotlight` mode, the center pane shows one focused member in a large primary panel plus smaller live read-only event-monitor tiles for the other team members.
- `REQ-005` The team run must always keep exactly one focused member while any team view mode is active.
- `REQ-006` Clicking a member in the left run tree or clicking a member tile in the center pane updates the focused member consistently across the workspace.
- `REQ-007` The bottom input box continues to target only the focused member, even when `Grid` or `Spotlight` mode is active.
- `REQ-008` Right-side member-scoped tabs such as activity and artifacts continue to show data for the focused member only.
- `REQ-009` Team-scoped information such as task plan remains team-scoped and does not depend on the focused member.
- `REQ-010` The focused member must be visibly indicated in each center-pane team view mode.
- `REQ-011` `Grid` and `Spotlight` tiles must reuse the same message/segment rendering model as the canonical event monitor for visible conversation content, rather than replacing messages with custom summary cards.
- `REQ-012` Tool-call-related segments (`tool_call`, `write_file`, `edit_file`, `terminal_command`) must remain visually unchanged inside smaller tiles.
- `REQ-013` Message alignment and flow inside smaller tiles must stay consistent with `Focus` mode so AI and user messages continue to read as the same conversation system.
- `REQ-014` Smaller tiles may rely on a reduced viewport height and internal scrolling instead of truncating or summarizing message content.
- `REQ-015` The smaller tile version must be read-only and must not introduce per-tile composers.
- `REQ-016` In `Grid` and secondary `Spotlight` tiles, each member panel must have a bounded height so the panel itself stays small while the conversation feed scrolls internally.
- `REQ-017` Outer center-pane scrolling should be used for navigating among many tiles, not for absorbing the full vertical growth of one member's conversation feed.
- `REQ-018` In `Grid`, the desktop column count should adapt to the number of team members so small teams fill the available width instead of reserving empty columns.

## Out Of Scope For Initial Version

- `REQ-OOS-001` Aggregated cross-member right-panel activity or artifact feeds.
- `REQ-OOS-002` Per-tile message composers inside `Grid` or secondary `Spotlight` tiles.
- `REQ-OOS-003` Backend or streaming protocol changes for team member updates.
- `REQ-OOS-004` Replacing the left tree as the canonical team/member navigation surface.

## Design Decisions Locked By Requirements

- `DEC-001` A selected team run always has exactly one focused member, regardless of team center-pane view mode.
- `DEC-002` `Focus`, `Grid`, and `Spotlight` are presentation modes for the center pane, not separate active-context types.
- `DEC-003` The bottom composer sends only to the focused member in all team modes.
- `DEC-004` Right-side member-scoped tabs continue to resolve through the focused member; `Task Plan` remains team-scoped.
- `DEC-005` `Grid` and secondary `Spotlight` panels use read-only smaller event-monitor panels rather than summarized preview cards.
- `DEC-006` The multi-member tile body should reuse the same conversation-feed rendering path as `Focus` mode, with information density coming primarily from viewport size and removal of the composer, not from message summarization.
- `DEC-007` Each multi-member tile owns its own scrollable conversation viewport; the outer grid container should not become the primary conversation scroll surface for a single tile.
- `DEC-008` `Grid` column allocation is responsive to team size; the layout should not force a three-column desktop grid when only two members exist.

## Acceptance Criteria

- `AC-001` Selecting an active team run exposes a visible center-pane team view mode control with at least `Focus`, `Grid`, and `Spotlight`.
- `AC-002` Switching view modes does not clear the currently focused member, selected team run, draft input text, or right-panel active tab.
- `AC-003` In `Grid` mode, all active members of the selected team run render simultaneously as compact live tiles in the center pane.
- `AC-004` In `Grid` mode, exactly one tile is styled as focused, and changing focus updates that highlight immediately.
- `AC-005` In `Grid` mode, clicking a non-focused member tile changes the focused member and updates the bottom input target label plus right-side member-scoped tabs.
- `AC-006` In `Focus` mode, the center pane behavior remains equivalent to the current single-member detailed team monitor for the focused member.
- `AC-007` In `Spotlight` mode, the focused member is rendered in a primary panel and all non-focused members remain visible in compact secondary tiles.
- `AC-007` In `Spotlight` mode, the focused member is rendered in a primary panel and all non-focused members remain visible in smaller read-only secondary monitor tiles.
- `AC-008` The bottom composer clearly indicates which member will receive the next message in every team view mode.
- `AC-009` Sending a message from any team view mode routes the message to the focused member only.
- `AC-010` Task Plan continues to render team-level data independent of focused member changes.
- `AC-011` If the user changes focus while unsent draft text exists, the interface preserves the draft and updates the visible input target indicator to the new focused member.
- `AC-012` When a team has many members, the center-pane multi-member layout remains navigable through scrolling without breaking the right panel or bottom composer layout.
- `AC-013` In `Grid` and `Spotlight`, smaller member panels render streaming AI messages from the real `message.segments` conversation path, not a custom summary representation.
- `AC-014` In smaller team tiles, tool-call-related segments (`tool_call`, `write_file`, `edit_file`, `terminal_command`) remain visually identical to `Focus` mode.
- `AC-015` In smaller team tiles, user and AI messages preserve the same alignment and ordering model as `Focus` mode.
- `AC-016` Smaller team tiles are read-only but support internal scrolling/autoscroll so new messages continue to flow naturally in view.
- `AC-017` In `Grid` and secondary `Spotlight` tiles, long conversations remain contained inside the tile and show an internal scrollbar rather than forcing a very tall tile.
- `AC-018` The outer center pane only needs to scroll when the number of tiles exceeds the available layout space, not because one tile's conversation feed grew vertically without bounds.
- `AC-019` In `Grid`, two-member teams use the available desktop row width without reserving an empty third column.

## Constraints / Dependencies

- The current team workspace architecture already depends on a single `focusedMemberName` in `AgentTeamContext`.
- Right-side member-scoped tabs currently resolve through the focused member context and should remain compatible.
- Existing left-tree team/member navigation should remain the primary team/member selector surface.
- The current full `AgentEventMonitor` includes the composer and some layout chrome that should not be duplicated verbatim for every tile, but its conversation-feed rendering path should be reused for smaller read-only tiles.
- The workspace must continue to support the existing task-plan panel on the right side.
- The initial version should avoid expanding the selection model beyond the existing team-selected plus focused-member pattern.

## Assumptions

- `Focus` mode remains the detailed single-member view and should reuse as much of the current team monitor path as practical.
- `Grid` and `Spotlight` are presentation/layout changes, not a replacement for focused-member state.
- The file explorer tab remains workspace-oriented enough to tolerate focused-member changes without redesign in this ticket.
- No backend or streaming protocol changes are required for the initial version; the feature can be built from existing per-member team context state.
- Existing full conversation rendering already aligns avatars, messages, and tool rows correctly and should remain the canonical visual model.
- Tile layout must cooperate with the shared conversation-feed component so `overflow-y-auto` lives on the feed viewport inside a bounded tile height.

## Open Questions / Risks

- Whether the right-side `Files` tab should be labeled or treated more explicitly as workspace-scoped when a team is selected.
- Whether `Grid` tiles should show a fixed number of recent events or support internal per-tile scrolling.
- Whether a double-click or explicit maximize button should move from `Grid` to `Focus` or `Spotlight`.
- Whether the default mode for a newly opened team run should remain `Focus` for compatibility or move to `Spotlight`.
- Whether heavy non-tool, non-text segments such as media and system notifications should keep full visuals or compact summaries in tile mode.

## Requirement To Acceptance Coverage

| Requirement ID | Covered By Acceptance Criteria |
| --- | --- |
| `REQ-001` | `AC-001`, `AC-002` |
| `REQ-002` | `AC-006` |
| `REQ-003` | `AC-003`, `AC-004`, `AC-012` |
| `REQ-004` | `AC-007` |
| `REQ-005` | `AC-002`, `AC-004`, `AC-009` |
| `REQ-006` | `AC-004`, `AC-005` |
| `REQ-007` | `AC-008`, `AC-009`, `AC-011` |
| `REQ-008` | `AC-005` |
| `REQ-009` | `AC-010` |
| `REQ-010` | `AC-004`, `AC-007` |
| `REQ-011` | `AC-013` |
| `REQ-012` | `AC-014` |
| `REQ-013` | `AC-015` |
| `REQ-014` | `AC-016` |
| `REQ-015` | `AC-016` |
| `REQ-016` | `AC-017` |
| `REQ-017` | `AC-018` |
| `REQ-018` | `AC-019` |
