# Electron macOS Build Report

## Current Scope

- Delivery revision: `DR-003` (supersedes the package result recorded by `DR-002`).
- Trigger: rebuild the README-guided Electron package after the reviewed `IR-005` selected-tab correction and the superseding `SR-002` / `ARCH-REV-002` / `CRR-010` / `API-REV-006` / `CRR-012` package.
- Source state: ticket branch `codex/token-statistics-analytics`; reviewed feature source at `7a21d59238e89d70747be49214503240da0560c4`; `CRR-012` assertion checkpointed; latest source-bearing base `201eddc452a7b9b5b3220e8238373b04c1423c0f` integrated before this build. The later base `14c08eeb458ff440123ca53d11192c2cb1a0216c` changed only unrelated archived delivery docs and was followed by a focused post-integration test.
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
- DMG SHA-256: `60893fa5e646b1116569e67da456834a7c80d409775b5705215bb7bbba585e26`
- ZIP SHA-256: `f65c9950b62bfbcf29097c159c4bf5acd7cb9e6ff2af119be9ec4afa617b5116`

## Integrity Evidence

- `hdiutil verify`: passed; DMG checksum valid.
- `unzip -tq`: passed; no compressed-data errors.
- Packaged executable: Mach-O 64-bit `arm64`.
- Bundled server directory and `Resources/server/prisma/schema.prisma`: present.
- Build log: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-analytics/tickets/done/token-statistics-analytics/evidence/delivery/electron-build-mac-current.log`
- Integrity log: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-analytics/tickets/done/token-statistics-analytics/evidence/delivery/electron-build-integrity-current.log`

## Supersession And Limits

- After user acceptance and repository finalization, the dedicated ticket worktree was removed. The generated DMG/ZIP paths above are therefore historical local-build locations rather than retained release assets; hashes and build/integrity logs remain authoritative evidence.

- The prior `DR-002` package at these same generated paths was built before `IR-005`. It was overwritten by this current build. Its old hashes and the pre-F-005 packaged-tab screenshot are historical evidence only and must not be used to identify or verify the current package.
- `API-REV-004` was a prior failure and is superseded by `API-REV-005` / `API-REV-006` Pass.
- The current package is unsigned and not notarized; electron-builder skipped signing because the signing identity is null.
- Non-blocking warnings include stale Browserslist data, large frontend chunks, deprecated transitive dependencies, and existing Nuxt peer-version warnings.
- Delivery built and integrity-checked the current package but did not launch its Electron shell. `API-REV-005` provides current-frontend live Chrome evidence against the user's production Electron backend, not packaged-shell execution. Renewed user verification of this rebuilt package is therefore required before finalization.
