# Release Notes

## What's New

- Added a V2 standalone run-history catalog that keeps `run_history_index.json` as the fast history-list source while routing normal mutations through one catalog boundary.
- Added an explicit standalone run-history migration/repair script for legacy or partial indexes.

## Improvements

- Reduced standalone index writes by removing routine activity/status updates from the persisted catalog.
- Standalone history rows now expose `createdAt`, `archivedAt`, `terminatedAt`, and derived live status instead of persisted live/status fields.
- Archive/delete/terminate/cancel paths use safer catalog identity and mutation rules.
- Operator docs now explain when to run migration/repair before Codex E2E cleanup.

## Fixes

- Prevented stale read/modify/write races within a server process by serializing standalone catalog mutations at the semantic operation level.
- Stopped persisting standalone `lastKnownStatus`, `lastActivityAt`, and `activationState` as durable history truth.
- Preserved team-run history fields separately so the standalone refactor does not break deferred team-history behavior.
