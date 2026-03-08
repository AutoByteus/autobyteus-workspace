# Right Panel Scroll Decoupling Implementation Progress

- Ticket: `right-panel-scroll-decoupling`
- Last Updated: `2026-03-08`

## Task Tracker

| Task ID | Scope | Status | Verification | Notes |
| --- | --- | --- | --- | --- |
| `T-001` | Remove outer center-shell transcript scrolling | `Completed` | `Passed` | `WorkspaceDesktopLayout` now clips the center shell instead of leaving it as a fallback transcript scroller. |
| `T-002` | Remove shared right-tab outer scrolling | `Completed` | `Passed` | `RightSideTabs` now clips the shared shell so active tabs own their own scrolling. |
| `T-003` | Replace activity highlight `scrollIntoView` with feed-local scrolling | `Completed` | `Passed` | `ActivityFeed` now scrolls its own container directly when revealing highlighted activity items. |
| `T-004` | Add targeted regression tests for layout scroll ownership and activity highlight scrolling | `Completed` | `Passed` | Added layout assertions plus a direct activity highlight scrolling regression test. |

## Verification Summary

- `2026-03-08`: `pnpm exec vitest run components/layout/__tests__/WorkspaceDesktopLayout.spec.ts components/layout/__tests__/RightSideTabs.spec.ts components/progress/__tests__/ActivityFeed.spec.ts components/workspace/agent/__tests__/AgentConversationFeed.spec.ts`
  - Result: `4` files passed, `10` tests passed.
