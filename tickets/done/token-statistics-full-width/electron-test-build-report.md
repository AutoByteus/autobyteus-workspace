# Electron Test Build Report

## Scope

- Ticket: `token-statistics-full-width`
- Purpose: Fresh user-verification build for the approved round-5 workspace-gray Settings separator candidate.
- Build date: 2026-07-15
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-full-width`
- Branch: `codex/token-statistics-full-width`
- Current candidate represented: `c448824203a9fd4ffc97e7884a992a7c03863b6f`
- Delivery validation checkpoint represented: `440eada0ba098d05bc20deb149e829c72b7116d5`
- Supersedes: the prior package/build report for pre-impact manual-separator commit `173848dea`; those prior artifact bytes/checksums are historical only.

## README Basis

- Reference: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-full-width/autobyteus-web/README.md`, `Desktop Application Build` and `macOS Build With Logs (No Notarization)`.
- The README specifies `pnpm build:electron:mac` and recommends disabled notarization/timestamping plus electron-builder debug logging for a local macOS build.
- `AUTOBYTEUS_BUILD_FLAVOR=personal` was explicit because the finalization target is `personal` and a ticket branch cannot infer that flavor.
- Apple signing identity and automatic identity discovery were disabled so this local verification package cannot be mistaken for a distributable signed/notarized release.

## Build Command

Working directory:

`/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-full-width/autobyteus-web`

```bash
rm -rf electron-dist
NO_TIMESTAMP=1 \
APPLE_TEAM_ID= \
APPLE_SIGNING_IDENTITY= \
CSC_IDENTITY_AUTO_DISCOVERY=false \
AUTOBYTEUS_BUILD_FLAVOR=personal \
DEBUG='electron-builder,electron-builder:*' \
DEBUG='app-builder-lib*' \
DEBUG='builder-util*' \
pnpm build:electron:mac
```

## Result

- Result: `Pass`
- Version: `1.4.13`
- Flavor: `personal`
- Platform / architecture: `macOS arm64`
- Integrated backend: included; `prepare-server` rebuilt and packaged server resources.
- Passed stages: web/localization guards, server/shared builds, Prisma generation, mobile generation, Electron Nuxt generation, Electron main/preload TypeScript builds, native module rebuild, app packaging, DMG creation, and ZIP creation.
- Signing/notarization: local test build only. electron-builder intentionally skipped Developer ID signing because identity was null. No notarization or timestamping was performed.
- Tracked-source impact: none. Generated `dist`, `dist-mobile`, `resources`, and `electron-dist` remain ignored.

## Current Test Artifacts

| Artifact | Absolute Path | Size | SHA-256 |
| --- | --- | ---: | --- |
| App bundle | `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-full-width/autobyteus-web/electron-dist/mac-arm64/AutoByteus.app` | unpacked local app | N/A |
| DMG | `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-full-width/autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.4.13.dmg` | 383 MB | `6ce6bac4bfa8cbf1f4e26f8943e87863a84052ff47393bd568712e0d7c7967e9` |
| ZIP | `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-full-width/autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.4.13.zip` | 379 MB | `3becdcac35ca0a8a0facc827c778b574d733254742467888a0702c27c33837ac` |

## Artifact Verification

- App executable: Mach-O 64-bit `arm64`.
- Bundle version: `1.4.13`.
- DMG: `hdiutil verify` passed; checksum valid.
- ZIP: `unzip -tq` passed; no compressed-data errors.
- Packaged `node-pty` spawn helpers: execute bits present for build, Darwin x64, and Darwin arm64 copies.
- Full build log: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-full-width/tickets/done/token-statistics-full-width/delivery-evidence/workspace-visual-electron-build/electron-test-build.log`
- Integrity evidence: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-full-width/tickets/done/token-statistics-full-width/delivery-evidence/workspace-visual-electron-build/electron-test-artifact-integrity.log`

## User Test Notes

- Preferred direct app path: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-full-width/autobyteus-web/electron-dist/mac-arm64/AutoByteus.app`
- Because this package is not Developer ID signed/notarized, macOS Gatekeeper may require right-clicking the app and selecting **Open**, or approving it in Privacy & Security.
- This package is only for manual verification and must not be distributed as a release.
- The user tested this exact current-candidate app bundle and explicitly confirmed it was good on 2026-07-15.

## Status

`User verified — current workspace-gray candidate`. Repository finalization and release `v1.4.14` are authorized and in progress; this unsigned local package remains verification-only and is not the release artifact.
