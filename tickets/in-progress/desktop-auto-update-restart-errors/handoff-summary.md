# Handoff Summary

- Ticket: `desktop-auto-update-restart-errors`
- Date: `2026-03-04`
- Stage: `10` (handoff prepared)

## What Was Diagnosed

Primary confirmed defect:

- Published mac updater metadata (`latest-mac.yml`) in recent releases was ARM64-only, while x64 artifacts were also published.
- Local x64 packaging run proved each architecture build emits a different `latest-mac.yml`; without merge, one arch metadata overwrites/excludes the other at publish time.
- `electron-updater` mac selection logic is architecture-aware, so metadata completeness across both architectures is required for deterministic behavior.

Secondary hardening:

- Install/restart invocation had no synchronous error capture around `quitAndInstall` callback execution, reducing diagnosis quality when restart/install invocation fails.

## Implemented Fix

1. Release workflow now supports canonical dual-arch mac metadata assembly.
- x64 job uploads `latest-mac.yml` as publish input.
- Publish job checks out repo, merges arm64+x64 metadata via script, validates both zip architectures, and uploads one canonical `latest-mac.yml`.
- Publish upload globs now avoid wildcard mac metadata ambiguity.

2. Added deterministic metadata merge utility + tests.
- Added `scripts/merge_latest_mac_metadata.py`.
- Added `scripts/tests/test_merge_latest_mac_metadata.py`.

3. Updater install path error visibility improved.
- `AppUpdater.installUpdateAndRestart()` now catches synchronous `quitAndInstall` failures and maps them to updater `error` state.
- Added regression test in updater test suite.

## Files Changed

- `.github/workflows/release-desktop.yml`
- `scripts/merge_latest_mac_metadata.py`
- `scripts/tests/test_merge_latest_mac_metadata.py`
- `autobyteus-web/electron/updater/appUpdater.ts`
- `autobyteus-web/electron/updater/__tests__/appUpdater.spec.ts`
- Ticket artifacts under `tickets/in-progress/desktop-auto-update-restart-errors/`

## Verification Executed

- Release artifact audit via `gh` for recent tags (`v1.2.10` through `v1.2.4`) confirming arm64-only published `latest-mac.yml` path before fix.
- Local x64 packaging run confirming x64-only `latest-mac.yml` emission in per-arch build.
- Merge utility unit tests: `python3 -m unittest scripts/tests/test_merge_latest_mac_metadata.py` (pass).
- Local merged metadata dry-run with real arm64+x64 sources (pass, dual zip entries present).
- Negative merge validation (missing x64 metadata) fails as expected.
- Updater test suite: `pnpm -C autobyteus-web test:electron --run electron/updater/__tests__/appUpdater.spec.ts` (pass, including new error-path test).

## Ticket State Decision

- Technical workflow gates through Stage 10 are satisfied.
- Ticket remains in `tickets/in-progress/desktop-auto-update-restart-errors/` pending explicit user confirmation before any move to `tickets/done/`.
