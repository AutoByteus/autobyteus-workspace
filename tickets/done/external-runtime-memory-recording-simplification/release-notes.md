## What's New
- Codex and Claude runs now use provider-owned continuation with canonical AutoByteus raw-trace history instead of duplicate WorkingContext snapshots.

## Improvements
- Reduced local memory usage by removing only exact metadata-classified external-runtime snapshot copies during startup while preserving native, imported, and unclassified history.
- Preserved raw-trace activity, tool evidence, provider compaction history, and same-thread or same-session continuation across reloads.

## Fixes
- Stopped new Codex and Claude WorkingContext snapshot files from being written while retaining native AutoByteus snapshot behavior.
