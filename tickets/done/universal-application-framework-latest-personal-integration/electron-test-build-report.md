# Electron Test Build Report — DR-014

## Result

**Pass — Electron 1.4.58 was rebuilt and verified from finalized main-repository Personal.**

## Source Identity

- Repository: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo`
- Branch: `personal`
- Executable source/merge: `887611bb372bc4d63b0dea496d2eaa3bf639f7e8`
- Merge parents: `9d0fd7c570d58da1af2c7a40279327c8a20a8093`, `025e26d84c05671e9195edade786143bc4f2162f`
- Remote at build start: `origin/personal@887611bb372bc4d63b0dea496d2eaa3bf639f7e8`
- Version: 1.4.58 (unchanged)

## README-Guided Build

```bash
CI=true \
NO_TIMESTAMP=1 \
APPLE_TEAM_ID= \
APPLE_SIGNING_IDENTITY= \
APPLE_ID= \
APPLE_APP_SPECIFIC_PASSWORD= \
CSC_IDENTITY_AUTO_DISCOVERY=false \
AUTOBYTEUS_BUILD_FLAVOR=personal \
pnpm -C autobyteus-web build:electron:mac -- --arm64
```

Result: Pass. Web/localization guards, shared/server/SDK builds, Prisma generation, sanitized bootstrap smoke, renderer/main/preload generation, native rebuild, app packaging, DMG, and ZIP completed.

Evidence: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/universal-application-framework-latest-personal-integration/evidence/delivery/dr-014-main-personal-electron-macos-arm64-build.log`.

## Artifacts

- App: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-web/electron-dist/mac-arm64/AutoByteus.app`
- DMG: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.4.58.dmg`
- DMG size: `465957949` bytes
- DMG SHA-256: `e23959eca0e3a2af4fe76692192bfb862ab81b96a8508ed35e456ada9633920a`
- ZIP: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.4.58.zip`
- ZIP size: `461635307` bytes
- ZIP SHA-256: `bc13485cdf6024623b0f32f0d7400faa4ce22e9c5fa607dc12b1b362843b70a7`
- Bundle identifier: `com.autobyteus.app`
- Minimum macOS: `12.0`
- Signing/notarization: intentionally absent for this local build

## Verification

- Main app executable: ARM64
- Packaged active `node-pty` runtime bundles: ARM64
- ZIP integrity: Pass
- DMG `hdiutil verify`: Pass
- Strict codesign: expected unsigned failure only
- Tracked source status after build: clean

Non-blocking warnings were limited to known dependency/peer, outdated Browserslist data, bundle-size, and intentionally unsigned-package notices.

Evidence: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/universal-application-framework-latest-personal-integration/evidence/delivery/dr-014-main-personal-electron-macos-arm64-verification.log`.

## Disposition

The same-version main-Personal Electron test build is ready. No version bump, release upload, tag, notarization, or deployment was performed.
