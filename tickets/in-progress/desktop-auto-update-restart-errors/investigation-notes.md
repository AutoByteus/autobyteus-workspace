# Investigation Notes

- Ticket: `desktop-auto-update-restart-errors`
- Last Updated: `2026-03-04`

## Sources Consulted

- `autobyteus-web/electron/updater/appUpdater.ts`
- `.github/workflows/release-desktop.yml`
- `autobyteus-web/build/scripts/build.ts`
- `autobyteus-web/node_modules/electron-updater/out/MacUpdater.js`
- `autobyteus-web/docs/electron_packaging.md`
- GitHub release inspection (`gh`) for `AutoByteus/autobyteus-workspace` tags `v1.2.10`, `v1.2.9`, `v1.2.8`, `v1.2.6`, `v1.2.5`, `v1.2.4`
- Local packaging run: `AUTOBYTEUS_BUILD_FLAVOR=personal NO_TIMESTAMP=1 pnpm -C autobyteus-web build:electron:mac -- --x64`

## Key Findings

1. macOS release metadata currently points to ARM64-only files in published releases.
- Verified from GitHub releases: `latest-mac.yml` in recent tags points to `AutoByteus_personal_macos-arm64-<version>.zip`.
- This is true even when x64 `.dmg/.zip` artifacts are present in the same release.

2. Current release workflow uploads only one mac metadata file (`latest-mac.yml`) and it comes from ARM64 lane.
- `build-macos-arm64` uploads `latest-mac.yml`.
- `build-macos-x64` uploads `dmg/zip` assets but does not upload `latest-mac.yml`.
- Publish job uploads release artifacts with wildcard `latest-*.yml`, resulting in only ARM64 mac metadata being published.

3. Local x64 build proves per-arch metadata generation behavior.
- Running local `--x64` build regenerates `electron-dist/latest-mac.yml` with x64 URLs (`...macos-x64-...zip/dmg`).
- This confirms each arch build emits a different `latest-mac.yml`; there is no automatic merged dual-arch mac metadata file.

4. `electron-updater` Mac updater explicitly filters files by architecture.
- `MacUpdater` filters resolved files by whether URL contains `arm64`.
- If only arm64 entries are present and client is x64, filtered file set can become empty, causing updater failure (`ERR_UPDATER_ZIP_FILE_NOT_FOUND` path).

5. Current app-side updater code has limited install-step diagnostics.
- `installUpdateAndRestart()` calls `autoUpdater.quitAndInstall(false, true)` from a `setTimeout` with no local try/catch around the callback body.
- This makes root-cause attribution harder when restart/install fails.

## Constraints

- User did not provide exact runtime error text or platform split, so failure mode correlation must be inferred from code and release artifacts.
- Full end-user restart/install failure reproduction requires packaged app + real updater feed behavior per OS.

## Open Unknowns

- Whether user failures are exclusively macOS Intel, or mixed across macOS/Windows/Linux.
- Exact error string shown to user at restart/install time.
- Whether some failures happen at download phase but are perceived as restart failures.

## Scope Triage

- Classification: `Small`
- Rationale:
  - Primary likely defect is workflow/feed metadata assembly mismatch for dual mac architectures.
  - Fix surface is mainly release workflow + optional updater diagnostics hardening.
  - No deep runtime architecture redesign required.

## Implications for Requirements/Design

- Requirements must explicitly cover architecture-correct mac metadata in release feed, not just artifact presence.
- Verification should include both:
  - Release asset audit (`latest-mac.yml` references both arch variants or merged-compatible file list),
  - Local non-release packaging checks for per-arch metadata emission.
