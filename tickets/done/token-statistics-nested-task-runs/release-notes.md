## What's New
- Settings > Token Statistics now nests member, delegated task-team, and delegated task-agent usage under the original root team using server-owned execution addresses.

## Improvements
- Repeated delegated task-team or task-agent executions for the same logical target now remain separate rows by concrete run identity.
- Legacy token usage rows without an execution address remain visible as safe fallback rows instead of being guessed into task hierarchy.
- Token Statistics documentation now records the recursive `children` / `executionAddress` contract for future work.

## Fixes
- Fixed delegated task-team usage appearing as unrelated top-level or unknown team rows in Task-grouped Token Statistics.
