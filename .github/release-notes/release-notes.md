## What's New
- Added a more reliable two-lane tool activity model so tool transcript entries and executable Activity rows stay synchronized without duplicating each other.

## Improvements
- Claude tool runs now keep their input arguments visible across live progress, approval, completion, and run-history views.
- Restored runs can now preserve Activity details even when the runtime history only contains conversation transcript rows.

## Fixes
- Fixed Claude tool Activity cards that could show empty or missing arguments after approval or successful completion.
- Fixed edge cases where tool execution status ordering could cause Activity rows to appear late, duplicate, or lose argument details.
- Preserved existing Codex command, dynamic-tool, and file-change Activity behavior while applying the Claude fix.
