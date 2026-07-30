## What's New
- Token Usage now preserves the configured provider name at ingestion time, keeping historical custom-provider labels stable after provider renames or deletion.

## Improvements
- Added resilient startup backfills for legacy custom-provider model metadata and provider-name snapshots, including retry, partial-progress, and sibling-continuation handling.
- Exposed aligned raw model values and display labels through Token Statistics Model and Task views without changing accounting or grouping identity.

## Fixes
- Fixed Token Statistics display fallback behavior for legacy rows, built-in providers, direct runtimes, and model-name collisions.
