Status: Design-ready
Scope: Small

# Problem

When a new tool activity occurs during an agent run, the UI automatically switches focus back to the Activity area. This interrupts users who are intentionally viewing another tab or another part of the monitor.

# Refined Requirements

1. Stop automatic focus/switching into the Activity area when tool calls start or update.
2. Preserve explicit user intent:
   - if the user clicks a tool call or otherwise explicitly selects an activity, focusing/highlighting that activity should still work.
3. Runtime tool lifecycle updates must continue to update activity status and content, but they must not trigger Activity tab navigation or Activity feed focus.
4. Approval-related runtime updates must not auto-switch the user into Activity; inline approval behavior in the center monitor must remain intact.
5. The Activity feed must expose a visible, directly draggable vertical scrollbar so users can control long activity histories without relying on wheel/trackpad-only scrolling.
6. Add targeted regression coverage for both:
   - no runtime-driven auto-focus
   - explicit click-driven focus still works
   - the Activity feed keeps its own dedicated scroll container
