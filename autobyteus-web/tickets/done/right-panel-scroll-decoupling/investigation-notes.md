# Right Panel Scroll Decoupling Investigation Notes

- Ticket: `right-panel-scroll-decoupling`
- Last Updated: `2026-03-08`
- Scope Triage: `Small`

## Summary

The screenshots refine the defect further: the jump is triggered by clicking a tool-call card in the center monitor, not by the web-search tool implementation itself. The click path in [`ToolCallIndicator.vue`](/Users/normy/autobyteus_org/autobyteus-worktrees/right-panel-scroll-decoupling/autobyteus-web/components/conversation/ToolCallIndicator.vue) switches the right tab to `progress` and sets the matching activity as highlighted. [`ActivityFeed.vue`](/Users/normy/autobyteus_org/autobyteus-worktrees/right-panel-scroll-decoupling/autobyteus-web/components/progress/ActivityFeed.vue) then calls `scrollIntoView({ behavior: 'smooth', block: 'center' })` on that highlighted activity item. Because the right-sidebar shell in [`RightSideTabs.vue`](/Users/normy/autobyteus_org/autobyteus-worktrees/right-panel-scroll-decoupling/autobyteus-web/components/layout/RightSideTabs.vue) is also scrollable, the highlight navigation can scroll outer ancestors instead of staying confined to the intended feed viewport.

## Concrete Evidence

1. [`WorkspaceDesktopLayout.vue`](/Users/normy/autobyteus_org/autobyteus-worktrees/right-panel-scroll-decoupling/autobyteus-web/components/layout/WorkspaceDesktopLayout.vue) already isolates the desktop shell into a center pane and a right pane, each with `min-h-0` and fixed-width/flex sizing.
2. The center pane uses an outer `overflow-auto`, but the primary conversation path still keeps transcript scrolling inside [`AgentConversationFeed.vue`](/Users/normy/autobyteus_org/autobyteus-worktrees/right-panel-scroll-decoupling/autobyteus-web/components/workspace/agent/AgentConversationFeed.vue), where `overflow-y-auto` is attached directly to the conversation viewport.
3. Clicking a tool card in the center monitor does not expand the card locally. [`ToolCallIndicator.vue`](/Users/normy/autobyteus_org/autobyteus-worktrees/right-panel-scroll-decoupling/autobyteus-web/components/conversation/ToolCallIndicator.vue) instead calls `setActiveTab('progress')` and `activityStore.setHighlightedActivity(...)`, creating a cross-pane navigation jump.
4. [`RightSideTabs.vue`](/Users/normy/autobyteus_org/autobyteus-worktrees/right-panel-scroll-decoupling/autobyteus-web/components/layout/RightSideTabs.vue) wraps every tab body in a single `div` with `class="flex-grow overflow-auto relative"`.
5. Multiple right-panel tabs already own their own scrolling:
   - [`ProgressPanel.vue`](/Users/normy/autobyteus_org/autobyteus-worktrees/right-panel-scroll-decoupling/autobyteus-web/components/progress/ProgressPanel.vue) is `overflow-hidden` and delegates scrolling into child panels.
   - [`ActivityFeed.vue`](/Users/normy/autobyteus_org/autobyteus-worktrees/right-panel-scroll-decoupling/autobyteus-web/components/progress/ActivityFeed.vue) uses `overflow-y-auto` on the feed viewport.
   - [`TodoListPanel.vue`](/Users/normy/autobyteus_org/autobyteus-worktrees/right-panel-scroll-decoupling/autobyteus-web/components/workspace/agent/TodoListPanel.vue) uses `overflow-y-auto` on the task list.
   - [`TeamOverviewPanel.vue`](/Users/normy/autobyteus_org/autobyteus-worktrees/right-panel-scroll-decoupling/autobyteus-web/components/workspace/team/TeamOverviewPanel.vue) uses `overflow-auto` on the task-plan viewport.
   - [`ArtifactsTab.vue`](/Users/normy/autobyteus_org/autobyteus-worktrees/right-panel-scroll-decoupling/autobyteus-web/components/workspace/agent/ArtifactsTab.vue) and [`FileExplorerLayout.vue`](/Users/normy/autobyteus_org/autobyteus-worktrees/right-panel-scroll-decoupling/autobyteus-web/components/fileExplorer/FileExplorerLayout.vue) are already built as bounded split panes with internal overflow handling.
6. [`ActivityFeed.vue`](/Users/normy/autobyteus_org/autobyteus-worktrees/right-panel-scroll-decoupling/autobyteus-web/components/progress/ActivityFeed.vue) watches the highlighted activity and calls `el.scrollIntoView({ behavior: 'smooth', block: 'center' })`. `scrollIntoView` is ancestor-aware; if outer ancestors are scrollable, it can move more than the feed itself.
7. Because the shared right-tab shell also scrolls, the scroll-owner contract is ambiguous: the browser can fall back to the outer wrapper instead of the intended tab-local viewport, especially when nested flex items compute height from `h-full` plus internal borders/padding.

## Root Cause Hypothesis

The bug is caused by a two-step interaction:

1. A center-pane tool card click triggers right-panel activity navigation through [`ToolCallIndicator.vue`](/Users/normy/autobyteus_org/autobyteus-worktrees/right-panel-scroll-decoupling/autobyteus-web/components/conversation/ToolCallIndicator.vue), not through any web-search-specific tool logic.
2. The right activity panel tries to reveal the highlighted item with `scrollIntoView`, but the right-sidebar shell itself is also scrollable in [`RightSideTabs.vue`](/Users/normy/autobyteus_org/autobyteus-worktrees/right-panel-scroll-decoupling/autobyteus-web/components/layout/RightSideTabs.vue). That gives `scrollIntoView` extra ancestors to move, which can produce the visible whole-pane jump the screenshot shows.

So the likely root cause is still scroll ownership at the wrong layer, but the precise trigger is the center-to-right activity navigation path.

The new screenshot sequence suggests a second, more important center-pane issue is also present:

3. The center pane itself has two competing vertical scroll owners:
   - the outer desktop content wrapper in [`WorkspaceDesktopLayout.vue`](/Users/normy/autobyteus_org/autobyteus-worktrees/right-panel-scroll-decoupling/autobyteus-web/components/layout/WorkspaceDesktopLayout.vue) uses `overflow-auto`,
   - the actual conversation viewport in [`AgentConversationFeed.vue`](/Users/normy/autobyteus_org/autobyteus-worktrees/right-panel-scroll-decoupling/autobyteus-web/components/workspace/agent/AgentConversationFeed.vue) also uses `overflow-y-auto`.
4. [`AgentConversationFeed.vue`](/Users/normy/autobyteus_org/autobyteus-worktrees/right-panel-scroll-decoupling/autobyteus-web/components/workspace/agent/AgentConversationFeed.vue) only updates its pinned-to-bottom state when its own scroll container emits a scroll event.
5. If the user scrolls the outer center wrapper instead of the inner conversation viewport, the feed still believes it is pinned to bottom. A later reactive update can then run the feed's auto-scroll path and snap the center monitor back downward.

This matches the observed behavior more closely than a web-tool-specific defect: the middle area jumps because the wrong center ancestor is allowed to scroll, so the conversation auto-scroll logic never realizes the user intentionally moved away from the bottom.

## Why This Happens

- `overflow-auto` on the shared tab-content wrapper makes the shell eligible to consume wheel/trackpad scrolling before the intended inner viewport.
- `scrollIntoView` does not restrict itself to the closest scroll container; it can scroll every scrollable ancestor necessary to satisfy the request.
- The center pane has the same class of defect: the desktop shell allows an outer center wrapper to scroll even though the conversation feed already owns its own viewport.
- Because `AgentConversationFeed` tracks "am I pinned to bottom?" from its own scroll events only, scrolling the wrong ancestor leaves that state stale.
- The `Progress` tab is especially vulnerable because it has a shell-level content wrapper, then a split panel, then inner scrolling sections. That creates a three-layer scroll hierarchy instead of one clear owner.
- Clicking a tool card in the center monitor immediately exercises this path because the click highlights the corresponding right-panel activity item.
- The tab components were authored as if they owned their own height and scrolling, but the layout shell imposes a second scrollable layer around all of them.
- This is the same class of defect as earlier center-pane grid-scroll bugs in the repo: the wrong ancestor becomes the scroll owner, so a container that should only bound layout starts absorbing transcript or panel scrolling.

## Expected Direction For Fix

- Move right-sidebar scroll ownership down to the active tab content instead of keeping `overflow-auto` on the shared wrapper in [`RightSideTabs.vue`](/Users/normy/autobyteus_org/autobyteus-worktrees/right-panel-scroll-decoupling/autobyteus-web/components/layout/RightSideTabs.vue).
- The shared wrapper should likely become a bounded flex container (`min-h-0`, `overflow-hidden`) that lets each tab decide whether it needs `overflow-auto`, split-pane scrolling, or fully clipped content.
- Remove outer center-pane scrolling from [`WorkspaceDesktopLayout.vue`](/Users/normy/autobyteus_org/autobyteus-worktrees/right-panel-scroll-decoupling/autobyteus-web/components/layout/WorkspaceDesktopLayout.vue) so the conversation feed remains the only transcript scroll owner.
- Replace or constrain the current `scrollIntoView` highlight behavior in [`ActivityFeed.vue`](/Users/normy/autobyteus_org/autobyteus-worktrees/right-panel-scroll-decoupling/autobyteus-web/components/progress/ActivityFeed.vue) so the scroll is applied only to the intended feed container.
- Add a direct layout test for the right-sidebar scroll-owner contract; current coverage checks component selection in [`WorkspaceDesktopLayout.spec.ts`](/Users/normy/autobyteus_org/autobyteus-worktrees/right-panel-scroll-decoupling/autobyteus-web/components/layout/__tests__/WorkspaceDesktopLayout.spec.ts) but does not assert scroll ownership.

## Open Risks

- Some tabs may currently rely on the outer wrapper's `overflow-auto` implicitly, so removing it may require a small tab-by-tab audit.
- No existing automated test currently proves which element owns right-panel scrolling, so a source fix without a focused layout assertion would be regression-prone.
