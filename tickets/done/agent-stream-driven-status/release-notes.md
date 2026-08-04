## What's New
- Active Codex conversations now accept follow-up input in the current turn instead of starting a competing turn.
- Agent and team Stop requests now return visible, target-aware failure feedback when an interrupt cannot be completed.
- Team run history and running-workspace groups now show clear binary active/inactive indicators for exact runs and grouped runs.

## Improvements
- Agent status now follows authoritative turn lifecycle events across normal completion, interruption, errors, and reconnects, reducing stale Running states.
- Streaming presentation remains responsive during continuous output while preserving exact content and event ordering.
- Nested team and delegated-task activity routes to the exact member execution, including reconnect and deep subteam paths.
- Stop acceptance no longer changes the UI optimistically; the composer becomes ready only after the runtime confirms the turn has settled.

## Fixes
- Fixed active Codex follow-up input creating a phantom second turn and leaving the original run incorrectly marked Running.
- Fixed missing or duplicate interrupt feedback during provider rejection, send failure, and WebSocket disconnect cases.
- Fixed team lifecycle being inferred from member status, socket subscription, or Stop state instead of the concrete team run.
- Fixed interrupted or delayed events reopening retired turns or settling a newer turn incorrectly.
