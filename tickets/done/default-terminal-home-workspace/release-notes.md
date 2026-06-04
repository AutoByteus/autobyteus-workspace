## Improvements
- The workspace Terminal now opens even when no active workspace is selected, starting in the backend server user's home directory.

## Fixes
- Fixed the empty-workspace Terminal state that previously showed a missing-workspace message instead of connecting to a usable shell.
- Kept explicit invalid Terminal paths rejected before a shell is created, preserving the existing path-safety behavior.
