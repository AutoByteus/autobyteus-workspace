# Release Notes — Token Meter accuracy

## Fixed

- **Claude Agent SDK: the latest prompt is correct.**
  - The Token Meter now shows the SDK's own count of tokens in context for the latest model call, against the SDK's window. Before, it summed every call of a turn and could show several hundred percent.
  - Readings stored before this release cannot be recomputed, so they are cleared once. Totals and costs are unchanged.
- **Claude Agent SDK: the meter updates during the turn.** Every model call appears as it happens, including for team members and delegated copies. It no longer waits for the turn to end.
- **Claude Agent SDK: the SDK's own compaction calls are counted.** The turn-end result adds them, and no call is counted twice.
- **Antigravity (AGY): usage per model call.** It now arrives during the turn. Cache reads count toward gross input, and the latest prompt is shown, with "context limit unavailable" because AGY reports no window.
- **Codex: the reading after a compaction.** The meter shows the post-compaction context size instead of 0.
- **Grok Build:** the latest prompt is now shown.

## Improved

- **Auto-compaction marker.** When a runtime reports its auto-compaction threshold (the Claude Agent SDK, and the native runtime with automatic compaction), the context bar shows a marker and "Auto-compacts at …".
- **Over-window state.** When a runtime's own reading exceeds its window, the meter shows the true percentage and marks it "Over the runtime's window".
- **Usage reports.** The count now means model calls.
- **After a compaction.** On the native runtime and the Claude Agent SDK, the new context size arrives with the next model call. Until then the meter keeps the previous value, greyed, with "Compacted — updates on the next model call". A native compaction's own summary call is counted, with its tokens and cost.

## Upgrade notes

- A database migration clears the stale Claude Agent SDK latest-prompt readings once. A direct upgrade from a ledger-era release drops them the same way.
- AGY run rows recorded before this release keep their stored totals.
