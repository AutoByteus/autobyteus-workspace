# Right Panel Scroll Decoupling Implementation Plan

- Ticket: `right-panel-scroll-decoupling`
- Scope: `Small`
- Last Updated: `2026-03-08`

## Objective

Eliminate outer-shell scroll ownership in the desktop workspace and make activity highlight navigation scroll only the feed-local viewport, then add direct regression coverage for the click-to-highlight jump.

## Planned Changes

1. Update [`components/layout/WorkspaceDesktopLayout.vue`](/Users/normy/autobyteus_org/autobyteus-worktrees/right-panel-scroll-decoupling/autobyteus-web/components/layout/WorkspaceDesktopLayout.vue) so the center shell bounds height without remaining a generic transcript scroller.
2. Update [`components/layout/RightSideTabs.vue`](/Users/normy/autobyteus_org/autobyteus-worktrees/right-panel-scroll-decoupling/autobyteus-web/components/layout/RightSideTabs.vue) so the shared tab-content wrapper clips rather than scrolling.
3. Update [`components/progress/ActivityFeed.vue`](/Users/normy/autobyteus_org/autobyteus-worktrees/right-panel-scroll-decoupling/autobyteus-web/components/progress/ActivityFeed.vue) to replace ancestor-agnostic `scrollIntoView` behavior with feed-container-local scrolling.
4. Add a regression test for right-panel scroll ownership and a regression test for feed-local activity highlight scrolling.

## Verification Plan

- Run targeted Vitest coverage for:
  - desktop layout shell behavior,
  - activity feed highlight scrolling,
  - transcript auto-scroll behavior,
  - existing workspace layout selection tests.
- Confirm the new tests cover the previously missing click-to-highlight path.

## Risks

- Some tab content may have relied implicitly on the shared right-tab wrapper being scrollable.
- Removing outer center scrolling must not strand configuration views or other center-pane content that legitimately need their own scroll container.
