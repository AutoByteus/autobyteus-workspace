# Release Notes — Frontend File Explorer Context Menu

- Restores the desktop Files tab right-click context menu for file and folder rows.
- Adds root/background context-menu creation for new files or folders at the workspace root.
- Keeps create/delete actions scoped to the visible workspace and updates the file tree immediately after successful mutations.
- Cleans up open file tabs and preview state when a deleted file or folder contains the active file.
- Preserves left-click open/expand behavior, lazy loading, search, drag/drop moves, and inactive Files-panel cleanup.
