# Electron Test Build Report

## Scope

- Ticket: `token-statistics-full-width`
- Request: User requested a README-guided Electron build for manual verification.
- Build date: 2026-07-15
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-full-width`
- Branch: `codex/token-statistics-full-width`
- Implementation commit represented: `173848dea69e5095b23f6bdf61f089ff02992325`
- Delivery checkpoint represented: `d22085f9cb581d57ea0f7a3632c92a70d6f71c74`

## README Basis

- Reference: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-full-width/autobyteus-web/README.md`, `Desktop Application Build` and `macOS Build With Logs (No Notarization)`.
- The README specifies `pnpm build:electron:mac` and recommends `NO_TIMESTAMP=1`, empty Apple team credentials, and electron-builder debug logging for a local non-notarized macOS build.
- `AUTOBYTEUS_BUILD_FLAVOR=personal` was set explicitly because the ticket finalization target is `personal` and a ticket branch name cannot infer that flavor automatically.
- Apple signing identity and automatic identity discovery were disabled explicitly so this local verification build could not be mistaken for a distributable signed/notarized release.

## Build Command

Working directory:

`/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-full-width/autobyteus-web`

```bash
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
- Integrated backend: included; `prepare-server` built and packaged the server resources.
- Guard/build stages: web-boundary guard, localization boundary guard, localization literal audit, server/shared builds, Prisma generation, mobile web generation, Electron Nuxt generation, Electron/main/preload TypeScript builds, native module rebuild, app packaging, DMG creation, and ZIP creation all passed.
- Signing/notarization: local test build only. electron-builder intentionally skipped macOS Developer ID signing because identity was explicitly null. The launcher carries only an ad-hoc/linker signature; no TeamIdentifier or sealed-resource signature exists. No notarization or timestamping was performed.
- Tracked-source impact: none. Generated `dist`, `dist-mobile`, `resources`, and `electron-dist` directories remain ignored.

## Test Artifacts

| Artifact | Path | Size | SHA-256 |
| --- | --- | ---: | --- |
| DMG | `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-full-width/autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.4.13.dmg` | 383 MB | `9e24169f8c22569b1cb515e6cec9ec03ee37d3392933af3ac593961d8c45985c` |
| ZIP | `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-full-width/autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.4.13.zip` | 379 MB | `d76d6beaa90b5556c37b42923f48e4a9d373f5892f7044e1c5c2bfb7d5be96b0` |
| App bundle | `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-full-width/autobyteus-web/electron-dist/mac-arm64/AutoByteus.app` | unpacked local app | N/A |

## Artifact Verification

- App executable: Mach-O 64-bit `arm64`.
- Bundle version: `1.4.13`.
- Bundle identifier: `com.autobyteus.app`.
- DMG: `hdiutil verify` passed; checksum valid.
- ZIP: `unzip -tq` passed; no compressed-data errors.
- Packaged `node-pty` spawn helpers: executable bits present for build, Darwin x64, and Darwin arm64 copies.
- Integrity evidence: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-full-width/tickets/in-progress/token-statistics-full-width/delivery-evidence/electron-test-artifact-integrity.log`
- Full build log: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-full-width/tickets/in-progress/token-statistics-full-width/delivery-evidence/electron-test-build.log`

## User Test Notes

- Preferred test artifact: mount the DMG and open `AutoByteus`, or open the unpacked app bundle directly.
- Because this is not Developer ID signed or notarized, macOS Gatekeeper may require right-clicking the app and selecting **Open**, or approving it in Privacy & Security.
- This build was prepared for manual verification only and must not be distributed as a release artifact.
- The application was not launched by delivery; user testing remains the authoritative completion signal.

## Status

`Ready for user testing`. Repository archival/finalization, push, merge, release, and cleanup remain paused until explicit user verification/completion.
