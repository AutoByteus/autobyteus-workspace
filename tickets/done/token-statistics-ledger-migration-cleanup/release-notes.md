## What's New
- Added a startup migration that backfills historical Token Usage execution addresses so older task/team usage can use the current nested statistics hierarchy.

## Improvements
- Preserves token and cost totals while repairing deterministic historical direct-member, task-team, and task-agent attribution.
- Reports clear migration summary details for backfilled, already-addressed, skipped, insufficient-data, and failed rows.
- Keeps unreconstructable historical rows visible through the existing safe fallback instead of guessing hierarchy.

## Fixes
- Fixed historical delegated task-team token usage appearing as unrelated top-level team rows when task delegation records can safely map it back under the original root team.
- Fixed stale Token Statistics prototype/docs references to legacy `memberPath`/path-field hierarchy in favor of recursive `children` plus `executionAddress`.
