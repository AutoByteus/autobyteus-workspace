## What's New
- Codex provider context compaction is now detected from the current `contextCompaction` and `context_compaction` event shapes.
- Completed Codex provider compactions now create durable compaction boundary records so long runs can preserve the right memory boundary when context is compacted.

## Improvements
- Provider compaction progress now flows through the existing activity/status stream for live team and single-agent runs.
- Reopened run history can show recorded provider compaction boundaries without replaying them as normal conversation content.

## Fixes
- Fixed missing raw trace rotation for current Codex provider compaction completion events.
- Prevented duplicate boundary records when Codex reports the same compaction through multiple provider surfaces.
- Kept trigger-only compaction signals from rotating raw traces prematurely.
