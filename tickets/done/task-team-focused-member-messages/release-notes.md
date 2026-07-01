## What's New
- Team Messages now use the same focused target addressing model as team message sending, so task-team and task-agent conversations can be opened from the exact focused execution row.

## Improvements
- Team Communication now stores sender and receiver identity as `ConversationTargetAddress` values, keeping persistent members, static nested members, delegated task teams, and delegated task agents on one consistent address model.
- Existing flat Team Communication projection files are migrated into the new address-first shape instead of being handled by runtime compatibility branches.

## Fixes
- Fixed focused Team Messages showing empty or stale conversations for members inside delegated task-team executions.
- Fixed cross-run leakage risk for repeated delegated task-team member names by matching exact task-team/task-agent address segments rather than display names or route-key fallbacks.
