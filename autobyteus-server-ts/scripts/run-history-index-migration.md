# Standalone Run History Index V2 Migration / Repair

`run_history_index.json` is the normal fast standalone history catalog. The app does not scan every `memory/agents/*/run_metadata.json` during startup or history listing to repair it.

Use this script only when legacy or partial history data needs explicit repair:

```bash
node autobyteus-server-ts/scripts/migrate-agent-run-history-index-v2.mjs --memory-dir /path/to/memory
node autobyteus-server-ts/scripts/migrate-agent-run-history-index-v2.mjs --memory-dir /path/to/memory --apply
```

Behavior:

- Dry-run is the default.
- `--apply` writes a V2 `run_history_index.json` and backs up the existing index first.
- `--prune-stale` removes existing index rows that no longer have metadata directories.
- The script is the only place that performs a full metadata scan for standalone index repair.
- Cleanup utilities expect an already-valid V2 `run_history_index.json`. If cleanup rejects a legacy/minimal index with migration guidance, run this migration/repair script with `--apply` first, then rerun cleanup.

`createdAt` is derived deterministically in this order: existing V2 index `createdAt`, legacy metadata `createdAt`, legacy metadata `preparedAt`, legacy index `lastActivityAt`, metadata file birthtime, metadata file mtime, run directory birthtime, run directory mtime, then migration time with a warning.
