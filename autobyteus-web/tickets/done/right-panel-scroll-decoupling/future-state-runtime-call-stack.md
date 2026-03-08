# Future-State Runtime Call Stack

- Ticket: `right-panel-scroll-decoupling`
- Last Updated: `2026-03-08`

## UC-001 Click Older Tool Card Without Pulling Middle Pane

1. The user scrolls upward inside the center transcript viewport owned by [`AgentConversationFeed.vue`](/Users/normy/autobyteus_org/autobyteus-worktrees/right-panel-scroll-decoupling/autobyteus-web/components/workspace/agent/AgentConversationFeed.vue).
2. The user clicks a tool-call indicator rendered inside the center conversation.
3. [`ToolCallIndicator.vue`](/Users/normy/autobyteus_org/autobyteus-worktrees/right-panel-scroll-decoupling/autobyteus-web/components/conversation/ToolCallIndicator.vue) calls `goToActivity()` and updates the active right tab plus highlighted activity id.
4. [`RightSideTabs.vue`](/Users/normy/autobyteus_org/autobyteus-worktrees/right-panel-scroll-decoupling/autobyteus-web/components/layout/RightSideTabs.vue) renders the `Progress` tab inside a bounded non-scrolling shell wrapper.
5. [`ActivityFeed.vue`](/Users/normy/autobyteus_org/autobyteus-worktrees/right-panel-scroll-decoupling/autobyteus-web/components/progress/ActivityFeed.vue) receives the highlighted activity id and computes the target item position relative to its own feed container.
6. [`ActivityFeed.vue`](/Users/normy/autobyteus_org/autobyteus-worktrees/right-panel-scroll-decoupling/autobyteus-web/components/progress/ActivityFeed.vue) scrolls only the feed container to reveal the highlighted item.
7. The center transcript scroll position remains unchanged because no outer center shell scroll owner exists.

## UC-002 Streaming Transcript While User Is Near Bottom

1. The user is near the bottom of the conversation viewport.
2. A transcript update re-renders [`AgentConversationFeed.vue`](/Users/normy/autobyteus_org/autobyteus-worktrees/right-panel-scroll-decoupling/autobyteus-web/components/workspace/agent/AgentConversationFeed.vue).
3. The feed determines it is still pinned near the bottom from its own viewport state.
4. The feed scrolls its own container to bottom.
5. No outer center shell scrolls because transcript scrolling is isolated to the feed viewport.

## UC-003 Streaming Transcript While User Has Scrolled Away

1. The user scrolls upward in the transcript viewport.
2. [`AgentConversationFeed.vue`](/Users/normy/autobyteus_org/autobyteus-worktrees/right-panel-scroll-decoupling/autobyteus-web/components/workspace/agent/AgentConversationFeed.vue) records `shouldStickToBottom = false`.
3. A later transcript update re-renders the feed.
4. The feed skips its auto-scroll path because the user intentionally moved away from bottom.
5. The center transcript remains where the user left it.
