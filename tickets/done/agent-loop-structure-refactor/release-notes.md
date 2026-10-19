# Release Notes — agent-loop-structure-refactor

## Internal

- The AutoByteus agent loop was restructured for maintainability. Each step now has one owner: the turn runner's outcome handlers, a stream collector, and per-call compaction. Agents behave exactly as before. No user-visible change.
