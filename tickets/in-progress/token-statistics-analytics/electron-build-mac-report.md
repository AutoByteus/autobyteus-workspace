# Electron macOS Build Report

## Current Scope

- Delivery revision: `DR-003` (supersedes the package result recorded by `DR-002`).
- Trigger: rebuild the README-guided Electron package after the reviewed `IR-005` selected-tab correction and the superseding `SR-002` / `ARCH-REV-002` / `CRR-010` / `API-REV-006` / `CRR-012` package.
- Source state: ticket branch `codex/token-statistics-analytics`, implementation `HEAD` `7a21d59238e89d70747be49214503240da0560c4`, plus the reviewed uncommitted `CRR-012` durable assertion correction.
- Host: macOS Darwin 25.5.0, Apple Silicon `arm64`.
- Guidance reviewed: root `README.md` (`Build examples`, packaged Electron testing) and `autobyteus-web/README.md` (`Desktop Application Build`, integrated backend).
- Command: `pnpm -C autobyteus-web build:electron:mac`
- Package version: `1.4.54`
- Build flavor: `enterprise`, the build script's deterministic ticket-branch fallback. This affects filenames; the product remains `AutoByteus`.

## Result

`Pass` — guards/localization checks, server/shared builds, Prisma generation, built-server bootstrap smokes, mobile-web assets, Electron renderer/main/preload, native dependency rebuild, and Darwin ARM64 packaging completed successfully.

This current package contains the reviewed transparent selected-tab treatment for Analytics and Run details: blue text, visible 2px blue bottom border, semantic selection/focus behavior, and no former dark selected fill. It preserves the approved observation-time/no-backfill lifecycle clarified by `SR-002`.

## Current Artifacts

- DMG (442 MiB): `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-analytics/autobyteus-web/electron-dist/AutoByteus_enterprise_macos-arm64-1.4.54.dmg`
- ZIP (437 MiB): `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-analytics/autobyteus-web/electron-dist/AutoByteus_enterprise_macos-arm64-1.4.54.zip`
- Unpacked app: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-analytics/autobyteus-web/electron-dist/mac-arm64/AutoByteus.app`
- DMG SHA-256: `d51940cfdfb665e10f6e172507a59bd1f73f0b40d7afa0e2af6571457cb03d6f`
- ZIP SHA-256: `2de61a03a3572c20ebf88f9b003f833c8797325217fde96fc9e226aba25a7437`

## Integrity Evidence

- `hdiutil verify`: passed; DMG checksum valid.
- `unzip -tq`: passed; no compressed-data errors.
- Packaged executable: Mach-O 64-bit `arm64`.
- Bundled server directory and `Resources/server/prisma/schema.prisma`: present.
- Build log: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-analytics/tickets/in-progress/token-statistics-analytics/evidence/delivery/electron-build-mac-current.log`
- Integrity log: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-analytics/tickets/in-progress/token-statistics-analytics/evidence/delivery/electron-build-integrity-current.log`

## Supersession And Limits

- The prior `DR-002` package at these same generated paths was built before `IR-005`. It was overwritten by this current build. Its old hashes and the pre-F-005 packaged-tab screenshot are historical evidence only and must not be used to identify or verify the current package.
- `API-REV-004` was a prior failure and is superseded by `API-REV-005` / `API-REV-006` Pass.
- The current package is unsigned and not notarized; electron-builder skipped signing because the signing identity is null.
- Non-blocking warnings include stale Browserslist data, large frontend chunks, deprecated transitive dependencies, and existing Nuxt peer-version warnings.
- Delivery built and integrity-checked the current package but did not launch its Electron shell. `API-REV-005` provides current-frontend live Chrome evidence against the user's production Electron backend, not packaged-shell execution. Renewed user verification of this rebuilt package is therefore required before finalization.
