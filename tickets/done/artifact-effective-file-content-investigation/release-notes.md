# Release Notes

## What's New
- The Artifacts tab now uses one unified touched-file and output list for `write_file`, `edit_file`, and generated outputs.

## Improvements
- Artifact previews now load the current file bytes through the run-scoped viewer route, so reopened runs still reflect the latest real file content.
- Artifact history now reopens from lightweight `file_changes.json` metadata instead of storing inline content snapshots.

## Fixes
- Fixed generated outputs depending on a separate artifact store or copied media URL path in the Artifacts tab.
- Fixed legacy `run-file-changes/projection.json` compatibility behavior so only the new canonical storage path is supported.
