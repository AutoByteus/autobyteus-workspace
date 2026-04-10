Status: Baseline Ready
Scope: Small

# Solution Sketch

1. Remove runtime-driven Activity tab switching from `RightSideTabs.vue` for:
   - `hasAwaitingApproval`
   - `highlightedActivityId`
2. Remove runtime-driven `setHighlightedActivity(...)` calls from `toolLifecycleHandler.ts`.
3. Keep `ToolCallIndicator.vue` click navigation as the only in-scope source of Activity focus/highlight.
4. Make the Activity feed scroll container visibly controllable by:
   - using a dedicated vertical scrollbar lane,
   - styling the track/thumb with contrast appropriate for the white panel,
   - keeping scrolling owned by the feed instead of the outer right-tab shell.
5. Add regression tests to prove:
   - runtime lifecycle handlers do not request highlighted activity,
   - the right tab shell does not auto-switch when runtime activity state changes,
   - click-to-focus behavior still works through the existing `ToolCallIndicator` path,
   - the Activity feed retains a dedicated scroll container.

# Why This Owner

- The bug is primarily a behavior ownership problem, with one adjacent feed affordance problem.
- `toolLifecycleHandler.ts` owns runtime activity updates.
- `ToolCallIndicator.vue` already owns explicit user navigation into Activity.
- `RightSideTabs.vue` owns tab auto-switch policy.
- `ActivityFeed.vue` owns the feed scroll container and scrollbar presentation.

# Risk

The only meaningful risks are accidentally hiding approval actions users still need or regressing Activity feed scrolling.

# Mitigation

- Inline approval controls already remain in the center monitor for awaiting-approval tool calls.
- Tests will verify the explicit click path remains intact.
- Feed regression coverage will pin the dedicated scroll container contract.
