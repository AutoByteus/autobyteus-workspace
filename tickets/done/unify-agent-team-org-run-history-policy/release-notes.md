## What's New
- Team and AgentOrg stored-run history now follow the same index-backed, read-only listing policy.

## Improvements
- Imported Team Memory listing reuses each inspected execution tree for member memory details instead of rereading all roots.
- Local operators can preview and explicitly repair missing Team or AgentOrg history-index rows with an offline, backup-protected command.

## Fixes
- Team archive now checks inactive state in the same root transition lane as restore, preventing a stale archive decision during concurrent restore.
- Corrupt Team and AgentOrg history indexes fail visibly without an automatic overwrite; missing indexes remain empty until lifecycle events or explicit local repair.

The separate Org imported-memory adapter is not part of this branch and must be integrated and validated when its branch merges.
