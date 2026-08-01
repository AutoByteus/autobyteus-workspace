## What's New
- Added evidence-linked memory lineage for native AutoByteus compaction so current context and its source history remain inspectable across repeated compactions.

## Improvements
- Existing native AutoByteus runs now upgrade their historical WorkingContext snapshots to the current format during startup instead of discarding their resumable context.
- Memory Compactor summaries now use natural episode and fact selection while preserving exact tool history, current-context projection, and continuation behavior.

## Fixes
- Fixed older native runs failing to reopen because their stored WorkingContext snapshot used a pre-v5 schema.
- Fixed provider or request failures after compaction restoring stale pre-compaction context while durable memory changes remained committed.
