## What's New
- Added a row-level **Remove from Workspaces** action so users can hide an unneeded filesystem workspace from the Workspaces sidebar without deleting files.
- Added backend `removeWorkspace` and `workspaceRunHistory(workspaceId)` GraphQL semantics for registry-backed workspace removal and scoped history loading.

## Improvements
- Workspaces sidebar rows now come from the registered workspace list instead of being recreated from every historical run root.
- Workspace history now loads under a workspace when that row is expanded, keeping global/recent history separate from desktop workspace visibility.
- Removing a workspace clears stale sidebar, selection, expansion, and file-explorer state while preserving files, memories, artifacts, and run/team history for later re-add.

## Fixes
- Prevented removed or unregistered historical workspace roots from reappearing as top-level desktop Workspaces rows after refresh or restart.
- Blocked workspace removal while active standalone or team runs still use that workspace, leaving the row visible with an actionable error.
