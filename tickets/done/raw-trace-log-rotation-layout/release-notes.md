# Release Notes: Raw Trace Rotation Layout

## Summary

- Changes raw-trace rotation storage from the old archive subdirectory layout to direct run-directory rotated log files.
- Adds required startup migration `20260617_raw_trace_rotation_layout` to convert existing old-layout raw-trace archives safely.
- Preserves active raw-trace behavior, complete-corpus reads, provider/native compaction rotation, and run-history/memory-view projections.

## Behavior Changes

- New raw-trace rotations now write:
  - `raw_traces_manifest.json`
  - direct segment files such as `raw_traces_000001.jsonl`
- New writes no longer create `raw_traces_archive_manifest.json` or `raw_traces_archive/`.
- `raw_traces.jsonl` remains the active append target.
- Manifest `boundary_key` remains the authority for idempotency and boundary identity.
- Readers prefer the new manifest and direct rotated files; old-layout archive artifacts are used only as read/migration fallback when no new manifest exists.

## Migration Notes

- Startup migration `20260617_raw_trace_rotation_layout` scans agent and team/member memory roots for raw-trace layout evidence.
- Complete old-layout entries are converted to direct `raw_traces_<index>.jsonl` files and indexed by `raw_traces_manifest.json`.
- Pending old-layout entries are excluded from the new manifest and handled according to the migration pending policy.
- After validation, old authoritative manifest/archive files are backed up or decommissioned so the new layout is the durable source of truth.
- Valid partial states, including runtime writes that occur before migration cleanup, are reconciled by the migration.

## Compatibility Notes

- No public GraphQL, REST, UI, or provider-runtime API contract changed.
- Historical monolithic `raw_traces_archive.jsonl` remains intentionally unsupported.
- Broad internal `Archive` class/API naming is intentionally unchanged for now; this release corrects filesystem layout and migration behavior without public API churn.

## Verification Summary

- `autobyteus-ts` raw trace archive manager and run memory file store tests passed: 2 files / 9 tests.
- Server app-data migration, memory service, runtime accumulator, cross-runtime memory persistence, and run-history projection tests passed: 9 files / 58 tests.
- Temporary startup orchestration probe for `AppDataMigrationRunner.runPending()` plus `RawTraceRotationLayoutMigration` passed: 1 file / 1 test; probe removed afterward.
- `autobyteus-ts` build passed with `[verify:runtime-deps] OK`.
- `autobyteus-server-ts` build passed, including built-in agents bootstrap smoke check.
- Local macOS arm64 Electron build passed for user testing.
