# Offline collaboration history-index repair

Stop the local server and take a full backup of the selected app-data profile first. Build the server, then run:

```sh
node scripts/repair-collaboration-run-history-index.mjs --app-data-dir /absolute/path/to/owned-profile
```

Dry-run is the default. Inspect the selected resolved memory root and the per-family missing IDs. To add only admitted missing rows, rerun with `--apply`. When an entire index file is missing, add `--acknowledge-missing-index-facts`; summary and termination facts that existed only in that index cannot be reconstructed. Existing indexes are copied to timestamped backup files before write, and each family is verified separately. Corrupt indexes are never overwritten. Do not point this command at imported memory or run it while the server is active.
