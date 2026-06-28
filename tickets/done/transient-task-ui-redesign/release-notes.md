# Release Notes — Transient task Active Tasks UI

## Improvements

- Moved delegated task agents and task teams out of the left workspace tree and center event area into the right-side Team tab under a dedicated `Active Tasks` section.
- Added expandable active task rows with task status, target, task ID, and explicit `Agent run ID` / `Agent team run ID` details so multiple delegated tasks to the same role or team are distinguishable.
- Kept task-team members available as focus/chat targets under active task-team rows without adding a complex phase or timeline dashboard.
- Preserved pending approval controls for task agents in the new Active Tasks surface.

## Cleanup

- Removed the old center `TeamActiveTaskExecutionsBar` path so the center workspace stays focused on the selected conversation, event stream, and composer.
- Filtered transient task-agent/task-team projection rows out of stable left navigation while keeping the underlying projections for routing, focus, and cleanup.

## Documentation and Validation

- Updated frontend architecture docs to describe the Team tab Active Tasks ownership and removed-center-bar boundary.
- Validated with targeted frontend/server checks, server build typecheck, localization guard, real browser validation against a nested classroom team fixture, and a local macOS Electron test build.
