# API-02/API-03 mutation checks (do the new startup tests fail when the migration is broken?)

Date 2026-10-30. Each change was made to the compiled migration in this worktree's `dist/` (untracked build output; originals saved to /tmp and restored with `cmp` afterwards), then the startup E2E was run.
Command: `env -i PATH HOME=<temp> TMPDIR pnpm exec vitest run tests/e2e/app-data-migrations/raw-trace-manifest-runtime-names-startup.e2e.test.ts --no-watch`

| Mutation | Result | Failed case |
| --- | --- | --- |
| M1: `OLD_RUNTIME_LABELS.CODEX` → `"codex"` (wrong target value) | 2 failed | both journeys |
| M2: the cleanup of a leftover `raw_traces_manifest.json.tmp` removed | first run: passed (equivalent mutation, because the rename consumes the leftover next to a convertible manifest). Test strengthened with a leftover next to an already-current manifest; second run: 1 failed | journey 1: `no temporary file left: expected [ Array(1) ] to deeply equal []` |
| M3: warnings never reported (`SUCCEEDED_WITH_WARNINGS` branch disabled) | 1 failed / 1 passed | journey 2 |
Unmutated: 2 passed (API-02-03-startup-e2e.log).

## API-06 (Memory Sync) mutations, same method (compiled migration in dist, restored with `cmp`)

| Mutation | Result | Failed case |
| --- | --- | --- |
| S1: `OLD_RUNTIME_LABELS.CODEX` → `"CODEX"` (nothing converted) | 1 failed | sync case: source manifest not converted |
| S2: the walk also visits `imports` (depth 3) | sync case 1 failed (the hub's older import was rewritten); startup journey 1 failed (`Scanned 12; migrated 10` instead of `Scanned 11; migrated 9`) | both |
