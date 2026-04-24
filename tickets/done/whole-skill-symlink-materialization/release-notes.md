## What's New
- Codex and Claude workspace skills now materialize as direct directory symlinks, so runtime skills stay aligned with their source files instead of stale copied bundles.
- Materialized skill folders now use clean skill names instead of generated hash-suffix names.

## Improvements
- Skill references to shared team files continue to resolve through the original source tree.
- Added stronger Codex runtime validation for symlinked skills and linked shared files.

## Fixes
- Removed copied skill materialization behavior that could leave runtime workspaces using outdated skill content after the source skill changed.
