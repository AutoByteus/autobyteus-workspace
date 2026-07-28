# Electron Test Build Report

## Scope

- Ticket: `token-statistics-int-overflow`
- Purpose: User-requested post-finalization Electron build from the latest local `personal` branch.
- Build date: 2026-07-28
- Repository: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo`
- Branch: `personal`
- Source revision represented: `5d979a5d5208157a25927b256932a25a5bed385b`
- Ref alignment before build: local `personal` and `origin/personal` matched exactly; divergence `0 / 0`.
- Token-statistics finalization audit contained: `Yes` — `153f3409cd90207f9219cbe20242606271b36104` is an ancestor of the build revision.
- Release/publication scope: `None`; this is a local verification package only.

## README Basis

- Reference: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-web/README.md`, `Desktop Application Build` and `macOS Build With Logs (No Notarization)`.
- The documented macOS command is `pnpm build:electron:mac`.
- `AUTOBYTEUS_BUILD_FLAVOR=personal` was explicit so artifact names and updater metadata represent the `personal` target.
- Apple team/signing identity discovery and timestamping were disabled. The resulting app has only ad-hoc/linker signing metadata and is not a Developer ID signed or notarized release.

## Build Command

Working directory:

`/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-web`

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
- Version: `1.4.26`
- Flavor: `personal`
- Platform / architecture: `macOS arm64`
- Build duration: approximately 4 minutes 31 seconds.
- Integrated backend: included; `prepare-server` rebuilt and packaged current server resources.
- Passed stages: web/localization guards, server/shared builds, Prisma generation, Electron renderer generation, Electron main/preload TypeScript builds, native module rebuild, app packaging, DMG creation, ZIP creation, and blockmap/updater metadata generation.
- Signing/notarization: no Developer ID signing, notarization, or timestamping. `codesign -dv` reports ad-hoc/linker signing with no Team ID.
- Tracked product-source impact: none. Generated `dist`, `resources`, and `electron-dist` paths remain ignored.
- Unrelated worktree preservation: the pre-existing `application-agent-streaming` and `.article-work` changes remained unstaged and untouched.

## Local Test Artifacts

| Artifact | Absolute Path | Size | SHA-256 |
| --- | --- | ---: | --- |
| App bundle | `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-web/electron-dist/mac-arm64/AutoByteus.app` | 1.2 GB unpacked | N/A |
| DMG | `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.4.26.dmg` | 402,314,552 bytes | `caf16e961825e45d5f45f05142ab59f2f384d0014963f7d3d5715c8fb91f8c0d` |
| ZIP | `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.4.26.zip` | 397,877,386 bytes | `4a38a3b30ea01f097d5a951468d84acaaa1d53d5a37a48e8f5f28c9dc590e983` |
| DMG blockmap | `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.4.26.dmg.blockmap` | 420,082 bytes | `8e71e2df683434933e4e9eca4ed399e57822cff426861c5378d67e1a698e947a` |
| ZIP blockmap | `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.4.26.zip.blockmap` | 409,473 bytes | `694a1a01f5cff060fecd5958e82ce66f9efaa729c313df6e91f4eda924545b84` |

## Artifact Verification

- App bundle version: `1.4.26`.
- App executable: Mach-O 64-bit `arm64`.
- Packaged backend contains the current `GraphQLSafeInt` token-usage schema in `Contents/Resources/server/dist/api/graphql/types/token-usage-stats.js`.
- Exactly three packaged `node-pty` `spawn-helper` files were found and all have execute permission.
- DMG: `hdiutil verify` passed; checksum valid.
- ZIP: `unzip -tq` passed with no compressed-data errors.
- Updater manifest: references the current personal macOS ARM64 ZIP and DMG at version `1.4.26`.
- Local-personal refresh evidence: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/token-statistics-int-overflow/delivery-evidence/local-main-electron-build/local-personal-refresh.log`
- Full build log: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/token-statistics-int-overflow/delivery-evidence/local-main-electron-build/electron-build.log`
- Integrity evidence: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/token-statistics-int-overflow/delivery-evidence/local-main-electron-build/electron-artifact-validation.log`

## User Test Notes

- Direct app path: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-web/electron-dist/mac-arm64/AutoByteus.app`
- Because this is not Developer ID signed/notarized, macOS may require right-clicking the app and selecting **Open**, or approving it in Privacy & Security.
- This local package contains the finalized token-statistics fix but must not be distributed as a release.
- No installation, launch, release, tag, publication, or deployment was performed.

## Status

`Pass — latest local personal built successfully as an unsigned macOS ARM64 Electron verification package; no release performed.`
