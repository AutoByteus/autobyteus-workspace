## What's New
- Memory compaction now runs as a bounded, non-recursive operation for more reliable long conversations.

## Improvements
- Improved compaction handling across provider capacity limits while preserving the active conversation and accepted memory state.
- Improved recovery from invalid compaction responses with one safe corrective attempt and an explicit user-authorized retry path.

## Fixes
- Fixed repeated or recursive Memory Compactor runs under proactive and hard-cap pressure.
- Fixed malformed Unicode in provider-bound compaction prompts without changing authoritative tool results or stored history.
- Fixed the built-in Memory Compactor inheriting shell and file tools intended for ordinary agents.
- Fixed compaction setup failures silently degrading normal agents instead of failing before launch.
