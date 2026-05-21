# Release Notes

## What's New

- Added V2 run-history catalogs for both standalone agent runs and team runs.
- Kept `run_history_index.json` and `team_run_history_index.json` as fast history-list sources, but changed both to strict plain row arrays owned by catalog services.
- Added required startup app-data migrations for legacy/partial index repair:
  - `RunHistoryIndexV2AppDataMigration` for standalone history.
  - `TeamRunHistoryIndexV2AppDataMigration` for team history, after the existing member-tree metadata migration.

## Improvements

- Reduced history-index write frequency by removing routine activity/status updates from persisted catalogs.
- Standalone and team history rows now use stable catalog fields such as `createdAt`, `archivedAt`, and `terminatedAt` plus derived live status.
- Team history no longer persists catalog `lastActivityAt`, `lastKnownStatus`, `deleteLifecycle`, or file-level `version`; team metadata no longer writes `updatedAt`.
- Archive/delete/terminate/cancel paths use catalog-owned identity and mutation rules for safer file-backed updates.
- Frontend run-history and team tree state derives UI status/activity view-model fields from V2 catalog rows and live runtime status instead of requiring removed backend fields.
- Operator docs now explain startup migration boundaries and the standalone manual migration/repair fallback.

## Fixes

- Prevented stale read/modify/write races within a server process by serializing catalog mutations at the semantic-operation level.
- Repaired the same partial-index failure class for team history that existed for standalone history.
- Removed normal list-time full-directory rebuild/repair behavior from team and standalone history paths; full scans are confined to migrations or explicit standalone repair tooling.

## Verification Build

A local macOS ARM64 Electron verification build was produced from the Round-11 reviewed state:

- `autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.3.23.dmg`
- `autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.3.23.zip`
- `autobyteus-web/electron-dist/mac-arm64/AutoByteus.app`

This local build is unsigned/not notarized and is for user testing, not a published release.
