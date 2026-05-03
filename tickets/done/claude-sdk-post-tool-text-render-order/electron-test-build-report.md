# Electron Test Build Report

## Scope

- Ticket: `claude-sdk-post-tool-text-render-order`
- Branch: `codex/claude-sdk-post-tool-text-render-order`
- Build commit: `cf03b4101cbce0b013e91a6320b82eed86b5cfea`
- Integrated local `personal`: `a72bebd79b6157a390bef92a604f216d627fa585`
- Date: 2026-05-03
- Purpose: Local macOS ARM64 Electron build for user verification of the Claude SDK post-tool text render-order fix.

## README Instructions Consulted

- `autobyteus-web/README.md` Desktop Application Build: macOS command is `pnpm build:electron:mac`; outputs are written to `electron-dist`.
- `autobyteus-web/README.md` macOS local/no-notarization note: use `NO_TIMESTAMP=1 APPLE_TEAM_ID=` for local macOS builds without notarization/timestamping.
- `autobyteus-web/README.md` integrated backend note: standard Electron build commands automatically run the server preparation path.

## Command

```bash
AUTOBYTEUS_BUILD_FLAVOR=personal \
NO_TIMESTAMP=1 \
APPLE_TEAM_ID= \
DEBUG=electron-builder,electron-builder:* \
DEBUG=app-builder-lib* \
DEBUG=builder-util* \
pnpm -C autobyteus-web build:electron:mac -- --arm64
```

## Result

- Status: `Passed`
- Build flavor: `personal`
- Architecture: `macOS ARM64`
- Version: `1.2.92`
- Signing/notarization: local unsigned build; log records `skipped macOS code signing` because signing identity is explicitly null.
- Log: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/claude-sdk-post-tool-text-render-order/logs/delivery/electron-build-mac-arm64-personal-20260503T081717Z.log`
- Latest log alias: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/claude-sdk-post-tool-text-render-order/logs/delivery/electron-build-mac-arm64-personal-latest.log`

## Test Artifacts

| Artifact | Path | Size | SHA-256 |
| --- | --- | ---: | --- |
| DMG | `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-post-tool-text-render-order/autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.2.92.dmg` | 368M | `35d239982464d898adde35313b5ff8f092fd447cbaf09a907d28445e95673117` |
| ZIP | `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-post-tool-text-render-order/autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.2.92.zip` | 369M | `e659cc36568c50d932b78c2c00ab9c39a6364b695da36b0fb95b570e71eb9806` |
| DMG blockmap | `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-post-tool-text-render-order/autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.2.92.dmg.blockmap` | 384K | `044050416043d0073960b044315435c91191b787a95145bbdd87e96afc028529` |
| ZIP blockmap | `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-post-tool-text-render-order/autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.2.92.zip.blockmap` | 376K | `eb9381b06ce5c6fd6dcb04d17186e9d64c124218313f02bb0bad5fb4e0f84025` |
| latest-mac.yml | `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-post-tool-text-render-order/autobyteus-web/electron-dist/latest-mac.yml` | 4.0K | `49d849a8275bad00e49d7b51350a91878cd763d488864b2a774f81ddeb1ab0e7` |
| App bundle | `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-post-tool-text-render-order/autobyteus-web/electron-dist/mac-arm64/AutoByteus.app` | 1.2G | N/A directory |

## Notes For User Testing

- User verification already used the local unsigned/not-notarized build. macOS may require explicit approval to open equivalent local builds.
- The listed DMG/ZIP/app-bundle paths are retained as build-time evidence; they were removed with the dedicated worktree during cleanup.

## Cleanup Note

The DMG/ZIP/app-bundle paths above are build-time paths from the dedicated ticket worktree. After user verification and release completion, that dedicated worktree was removed during post-finalization cleanup; checksums and build logs are retained in this ticket artifact.
