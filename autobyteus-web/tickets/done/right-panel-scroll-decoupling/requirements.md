# Right Panel Scroll Decoupling Requirements

- Status: `Design-ready`
- Ticket: `right-panel-scroll-decoupling`
- Last Updated: `2026-03-08`

## Goal / Problem Statement

The desktop workspace currently allows scroll ownership to leak into outer shell containers. When the user scrolls up in the center transcript to find an older tool call and then clicks that tool card, the application can pull the entire middle pane back down instead of keeping the monitor stable and only scrolling the right-side activity feed to the matching item. The fix must decouple scroll ownership so the center transcript remains stable and the activity highlight navigation stays confined to the intended feed viewport.

## In-Scope Requirements

- `REQ-001` The center transcript must have a single intended vertical scroll owner during normal agent-run viewing.
- `REQ-002` The outer center-pane shell must not remain a fallback transcript scroller when the transcript feed already owns scrolling.
- `REQ-003` The right-sidebar shell must remain height-bounded but must not be the default vertical scroll owner for all tabs.
- `REQ-004` The `Progress` tab must keep nested scrolling (`To-Do`, `Activity`) inside its bounded internal regions instead of falling back to the outer sidebar shell.
- `REQ-005` Clicking a tool-call card in the center monitor must navigate to and reveal the matching right-side activity item without pulling the whole middle monitor.
- `REQ-006` Highlight navigation inside `Activity` must scroll only the intended activity feed viewport, not outer scrollable ancestors.
- `REQ-007` Fixing scroll ownership must not break right-panel resizing, collapse/expand behavior, or tab switching.
- `REQ-008` Existing tabs that legitimately own their own scrolling, including config, files, artifacts, team overview, terminal, and activity, must continue to fill the available height after the shell scroll changes.

## Design Decisions Locked By Requirements

- `DEC-001` The center transcript feed, not the desktop shell wrapper, is the canonical scroll owner for conversation content.
- `DEC-002` The active right-tab content, not the shared `RightSideTabs` wrapper, owns tab-specific scrolling.
- `DEC-003` Activity highlight navigation must use feed-local scrolling rather than ancestor-agnostic `scrollIntoView` behavior.

## Acceptance Criteria

- `AC-001` After the user scrolls upward in the center transcript and clicks an older tool card, the center monitor stays at the user’s chosen scroll position instead of snapping back downward.
- `AC-002` Clicking a center tool card still switches the right panel to `Activity` and reveals the matching invocation.
- `AC-003` Revealing the highlighted activity item scrolls only the right activity feed viewport.
- `AC-004` The shared right-tab shell does not expose a redundant outer vertical scrollbar when the active tab already owns scrolling.
- `AC-005` The `Progress` tab keeps its internal scroll regions usable after the fix.
- `AC-006` Right-panel drag resizing and collapse/expand behavior continue to work.
- `AC-007` The center transcript’s existing auto-scroll behavior still works when the user is actually near the bottom, and still stays disabled when the user has intentionally scrolled away.

## Constraints / Dependencies

- The current branch `codex/right-panel-scroll-decoupling` started with no source changes relative to `personal`.
- Current test coverage proves only inner feed auto-scroll behavior; it does not cover the outer-pane mis-scroll path or activity-highlight navigation.
- The implementation surface spans the desktop layout shell, right-tab shell, and activity highlight scrolling logic.

## Investigation Evidence

- Clicking a tool card in the center monitor calls `goToActivity()` in `ToolCallIndicator`, which switches the right tab and highlights an activity item.
- `ActivityFeed` currently responds to that highlight with `scrollIntoView({ block: 'center' })`.
- The desktop center shell and the shared right-tab shell are both currently scrollable outer ancestors, so highlight navigation is not confined to the intended inner viewport.
- The transcript auto-scroll logic only tracks scroll state from the inner transcript viewport, so if the user scrolls the wrong ancestor the pinned-to-bottom state becomes stale.
