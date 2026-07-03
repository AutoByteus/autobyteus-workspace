## What's New
- Completed the Token Usage ledger schema contract by adding a guarded startup migration that removes obsolete legacy hierarchy path columns after execution-address backfill succeeds.

## Improvements
- Preserves token rows, token/cost totals, canonical hierarchy columns, and indexes while cleaning up the physical ledger schema.
- Handles already-clean or partially drifted local databases by skipping legacy columns that are already absent.
- Records clear app-data migration status and summary details for prerequisite checks, dropped columns, skipped columns, row-count preservation, and final schema verification.

## Fixes
- Prevents old physical `team_run_path_json` and `member_path_json` columns from lingering as a parallel Token Usage hierarchy representation.

## Release Status

No release was performed for this ticket. The user explicitly requested finalization without a new version.
