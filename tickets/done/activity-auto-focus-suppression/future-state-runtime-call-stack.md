Status: Current

# Future-State Flow

## Runtime lifecycle path

1. Streaming event arrives in `toolLifecycleHandler.ts`.
2. Activity status/arguments/result are updated in `agentActivityStore`.
3. No Activity focus or tab switch is requested.
4. If the user is already viewing Activity, they can still see the updated state in place.

## Explicit user navigation path

1. User clicks a tool card in `ToolCallIndicator.vue`.
2. `ToolCallIndicator` sets the right tab to `progress`.
3. `ToolCallIndicator` sets highlighted activity for the clicked invocation.
4. `ActivityFeed.vue` scrolls the selected activity into view and applies the highlight styling.

# Key Contract

Only explicit user actions may request Activity focus/navigation. Runtime events may update Activity content, but they may not steal focus.
