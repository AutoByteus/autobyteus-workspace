## What's New
- Added allocator-backed runtime IDs for new standalone, team-member, and task-agent runs so every new run has a unique opaque storage identity before execution starts.
- Added root-hierarchical team memory ownership so nested teams, direct members, and task agents resolve their memory, context files, and produced artifacts through the correct team path.

## Improvements
- Improved team route resolution to prefer exact member routes and allow suffix matching only when the suffix is unique.
- Improved run-history, Memory Explorer, context-file, artifact, and frontend memory documentation to describe the new opaque ID and nested memory model.

## Fixes
- Fixed ambiguous nested team-member route suffixes so context-file finalization fails safely instead of choosing the first matching member.
- Fixed legacy deterministic route-derived ID helpers and backend fallback run-ID behavior being used for new runtime storage identities.
- Fixed nested team member and task-agent memory/artifact lookups that could rely on flattened or top-level-only directory assumptions.
