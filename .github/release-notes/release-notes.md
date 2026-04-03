## What's New
- The Artifacts tab now works as a live touched-files view, so newly written files, edited files, and generated outputs show up in one place during a run.
- Codex `apply_patch` / `edit_file` activity now completes with the correct lifecycle, so file edits no longer get stuck in `PARSED` when the edit succeeded.

## Improvements
- Text artifacts now open their current file content directly from the workspace instead of relying on stored artifact records.
- The artifact viewer header is cleaner and no longer shows the extra leading slash or misleading folder icon for file paths.

## Fixes
- Fixed artifact discoverability so refresh-only updates do not keep stealing focus in the Artifacts tab.
- Fixed the web packaging boundary so the frontend no longer directly depends on `autobyteus-ts` in active prepare/build scripts.
