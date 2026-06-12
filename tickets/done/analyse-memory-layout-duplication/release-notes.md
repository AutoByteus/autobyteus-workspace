## Improvements
- Consolidated server memory path ownership so standalone runs, team members, task agents, context files, and run-history metadata all use the same canonical memory layout boundary.

## Fixes
- Removed the obsolete standalone memory-layout path and versioned layout wiring that could let future run-memory changes drift across duplicate owners.
