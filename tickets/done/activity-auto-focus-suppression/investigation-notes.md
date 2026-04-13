Status: Complete
Scope: Small

# Summary

The reported jump is caused by a chained focus path in the web UI:

1. runtime tool lifecycle events set `highlightedActivityId`,
2. the right-side tab shell watches that highlight and auto-switches to `progress`,
3. the activity feed watches the same highlight and scrolls the item into view.

That means users get pulled into Activity even when they did not ask for it.

# Concrete Findings

1. [`autobyteus-web/components/layout/RightSideTabs.vue`](../../../../autobyteus-web/components/layout/RightSideTabs.vue) auto-switches to `progress` in two runtime-driven cases:
   - when any activity enters `awaiting-approval`,
   - when any activity becomes highlighted.
2. [`autobyteus-web/services/agentStreaming/handlers/toolLifecycleHandler.ts`](../../../../autobyteus-web/services/agentStreaming/handlers/toolLifecycleHandler.ts) sets `highlightedActivityId` during runtime lifecycle transitions such as:
   - `TOOL_APPROVAL_REQUESTED`
   - `TOOL_APPROVED`
   - `TOOL_EXECUTION_STARTED` (except `write_file`)
3. [`autobyteus-web/components/progress/ActivityFeed.vue`](../../../../autobyteus-web/components/progress/ActivityFeed.vue) scrolls to the highlighted activity whenever `highlightedActivityId` changes.
4. Explicit user clicks are already handled separately in [`autobyteus-web/components/conversation/ToolCallIndicator.vue`](../../../../autobyteus-web/components/conversation/ToolCallIndicator.vue):
   - click -> `setActiveTab('progress')`
   - click -> `setHighlightedActivity(runId, invocationId)`
5. The Activity feed already owns a dedicated scroll container in [`autobyteus-web/components/progress/ActivityFeed.vue`](../../../../autobyteus-web/components/progress/ActivityFeed.vue), but its custom scrollbar is styled with near-white thumb colors against a white panel, making it effectively invisible in normal use.

# Root Cause

The product currently conflates two different concepts into one shared highlight path:

- runtime status updates
- explicit user navigation/focus requests

Because those concerns are mixed, passive runtime updates are treated as if the user explicitly asked to navigate to Activity.

The feed also has an affordance problem: the scrollbar exists structurally, but the chosen colors make it hard to perceive and drag.

# Direction

Make Activity focus explicit-only:

1. runtime lifecycle handlers should stop setting highlighted activity,
2. right-side tabs should stop auto-switching to `progress` for runtime activity highlight/approval signals,
3. explicit click navigation from `ToolCallIndicator` should remain unchanged,
4. `ActivityFeed` should keep its inner scroll ownership but expose a visible scrollbar track/thumb.
