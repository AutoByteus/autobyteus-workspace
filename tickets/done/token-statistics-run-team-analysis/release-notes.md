# Release Notes: Token Statistics Task And Team Reporting

## Added

- Added a By Task view to Settings > Token Statistics so historical token and cost usage is organized by standalone agent runs and root team runs.
- Added expandable team rows that show only members with usage during the selected period, avoiding duplicated top-level member costs.
- Added persisted display fields for historical token-statistics rows so team names, agent names, run summaries, run-created timestamps, and member names remain meaningful in the report.

## Improved

- Kept By Model as a diagnostics tab and grouped it by runtime/model pair, making mixed runtime usage easier to understand.
- Clarified the Settings date-range behavior as Usage during period, based on observed ledger usage rather than a task-created-time filter.
- Improved cost/status presentation coverage for estimated, missing-price, local/no-bill, mixed, cache, and reasoning-token cases.

## Operational Notes

- Includes a database migration for the new token-usage display fields.
- Frontend GraphQL generated types were refreshed with the updated token-statistics schema and query shape.
