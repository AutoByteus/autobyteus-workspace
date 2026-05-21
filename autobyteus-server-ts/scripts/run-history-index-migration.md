# Standalone Run History Index V2 Migration / Repair

`run_history_index.json` is the normal fast standalone history catalog. In steady state it is a plain JSON array of strict V2 catalog rows, not a `{ version, rows }` wrapper.

The primary legacy/partial repair path is the required-on-startup `RunHistoryIndexV2AppDataMigration`, which records success, warnings, failures, and retry state in `app_data_migration_records`. Normal history listing and catalog initialization still read only the index/in-memory catalog and do not scan all metadata directories.

Use this script only as a manual fallback or diagnostic when legacy or partial history data needs explicit repair outside the app-data migration runner:

```bash
node autobyteus-server-ts/scripts/migrate-agent-run-history-index-v2.mjs --memory-dir /path/to/memory
node autobyteus-server-ts/scripts/migrate-agent-run-history-index-v2.mjs --memory-dir /path/to/memory --apply
```

Behavior:

- Dry-run is the default.
- `--apply` writes a plain V2 row-array `run_history_index.json` and backs up the existing index first.
- `--prune-stale` removes existing index rows that no longer have metadata directories.
- Full metadata scans for standalone index repair are allowed only in the startup app-data migration and this manual fallback script.
- Cleanup utilities expect an already-valid V2 `run_history_index.json`. If cleanup rejects a legacy/minimal index with migration guidance, run this migration/repair script with `--apply` first, then rerun cleanup.

`createdAt` is derived deterministically in this order: existing V2 index `createdAt`, legacy metadata `createdAt`, legacy metadata `preparedAt`, legacy index `lastActivityAt`, metadata file birthtime, metadata file mtime, run directory birthtime, run directory mtime, then migration time with a warning.
