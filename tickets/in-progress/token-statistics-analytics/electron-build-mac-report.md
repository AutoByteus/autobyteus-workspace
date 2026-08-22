# Electron macOS Build Report

## Scope

- Trigger: User requested that delivery read the README and build Electron.
- Host: macOS Darwin 25.5.0, Apple Silicon `arm64`.
- Repository guidance reviewed: root `README.md` → `Build examples` / `Packaged Electron API/E2E testing`; `autobyteus-web/README.md` → `Desktop Application Build` / `Desktop Application with Integrated Backend`.
- Build command: `pnpm -C autobyteus-web build:electron:mac`
- Package version: `1.4.54`
- Build flavor: `enterprise` — the build script's deterministic fallback for the ticket branch; this affects artifact naming. The packaged product remains `AutoByteus`.

## Result

`Pass` — the integrated backend, mobile web assets, Electron renderer/main/preload, native dependencies, and macOS ARM64 DMG/ZIP were built successfully.

The build also passed:

- web-boundary guard;
- localization-boundary guard;
- localization literal audit with zero unresolved findings;
- Prisma client generation;
- server TypeScript/full build and built-in bootstrap smokes;
- Electron native-module rebuild; and
- Electron packaging for Darwin ARM64.

## Artifacts

- DMG: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-analytics/autobyteus-web/electron-dist/AutoByteus_enterprise_macos-arm64-1.4.54.dmg` — 442 MiB
- ZIP: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-analytics/autobyteus-web/electron-dist/AutoByteus_enterprise_macos-arm64-1.4.54.zip` — 437 MiB
- Unpacked app: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-analytics/autobyteus-web/electron-dist/mac-arm64/AutoByteus.app`
- DMG blockmap: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-analytics/autobyteus-web/electron-dist/AutoByteus_enterprise_macos-arm64-1.4.54.dmg.blockmap`
- ZIP blockmap: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-analytics/autobyteus-web/electron-dist/AutoByteus_enterprise_macos-arm64-1.4.54.zip.blockmap`

## Integrity Evidence

- `hdiutil verify <dmg>`: passed; checksum valid.
- `unzip -tq <zip>`: passed; no compressed-data errors.
- App executable: Mach-O 64-bit `arm64`.
- Bundled server directory and Prisma schema: present.
- DMG SHA-256: `b18f59252f9e9ad7def9568b8820c6ce1255fa389eb6809d994baaa4288f8631`
- ZIP SHA-256: `9601d6acd2c23edf075600c2d2803c744d13af6b5c047e1ad5b401e4ea131207`

## Evidence Logs

- Build log: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-analytics/tickets/in-progress/token-statistics-analytics/evidence/delivery/electron-build-mac.log`
- Integrity log: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-analytics/tickets/in-progress/token-statistics-analytics/evidence/delivery/electron-build-integrity.log`

## Warnings / Limits

- The local package is unsigned and not notarized; electron-builder explicitly skipped macOS signing because signing identity was null.
- Non-blocking build warnings included stale Browserslist data, large frontend chunks, deprecated transitive dependencies, and existing Nuxt peer-version warnings.
- Delivery did not launch the application or claim behavioral Electron verification. The user-verification hold remains authoritative.
- Build outputs under `autobyteus-web/electron-dist` are local generated artifacts and are not repository finalization.
