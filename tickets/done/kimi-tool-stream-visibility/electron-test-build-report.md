# Electron Test Build Report

## Scope

- Ticket: `kimi-tool-stream-visibility`
- Revision: `canonical-invocation-identity-refactor`
- Purpose: Local macOS Apple Silicon Electron build for user manual verification before repository finalization.
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/kimi-tool-stream-visibility`
- Build timestamp: `2026-05-14T05:00:28Z` to `2026-05-14T05:03:54Z`

## README / Docs Consulted

- `README.md` build/release sections.
- `autobyteus-web/README.md` desktop build section:
  - macOS command: `pnpm build:electron:mac`
  - local no-notarization pattern: `NO_TIMESTAMP=1 APPLE_TEAM_ID= ... pnpm build:electron:mac`
  - output directory: `autobyteus-web/electron-dist`
- `autobyteus-web/docs/github-actions-tag-build.md` local build commands, including `pnpm build:electron:mac -- --arm64`.
- `autobyteus-web/docs/electron_packaging.md` packaging output and artifact naming details.

## Command Run

```bash
AUTOBYTEUS_BUILD_FLAVOR=personal NO_TIMESTAMP=1 APPLE_TEAM_ID= \
  pnpm -C autobyteus-web build:electron:mac -- --arm64
```

## Environment

- OS: `Darwin MacBookPro 25.2.0 ... RELEASE_ARM64_T6000 arm64`
- Node: `v22.21.1`
- pnpm: `10.28.2`
- Architecture: `arm64`
- Build flavor: `personal`
- Notarization/signing: Disabled for local test build (`APPLE_TEAM_ID=`; no signing identity).
- Timestamping: Disabled (`NO_TIMESTAMP=1`).

## Result

- Build result: `Pass`
- Electron-builder target: macOS ARM64 DMG + ZIP.
- Build log: `/Users/normy/autobyteus_org/autobyteus-worktrees/kimi-tool-stream-visibility/tickets/done/kimi-tool-stream-visibility/logs/delivery/electron-build-mac-arm64-20260514T050028Z.log`
- Latest build log symlink: `/Users/normy/autobyteus_org/autobyteus-worktrees/kimi-tool-stream-visibility/tickets/done/kimi-tool-stream-visibility/logs/delivery/electron-build-mac-arm64-latest.log`

## Built Artifacts For Testing

| Artifact | Size | SHA-256 |
| --- | ---: | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/kimi-tool-stream-visibility/autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.3.7.dmg` | `358M` | `11d1e2a9ebf15c37ea7929afa1dd0a3c7e0b2dac6327e41a105b3349b9f0beb0` |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/kimi-tool-stream-visibility/autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.3.7.zip` | `356M` | `69a78a74bcd12fc06457e9f438522edb68aebc542bc19fcbea00541f38d1ebbc` |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/kimi-tool-stream-visibility/autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.3.7.dmg.blockmap` | `382K` | `0a877e9e7553008aa2f1fa8d03827dc062cfbbb0b0983b0aebb534bfadd4529d` |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/kimi-tool-stream-visibility/autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.3.7.zip.blockmap` | `374K` | `ec13fb64cec9d15cc45d90fbf8d7f6e80d92a05c57d352a3c494905078523b41` |

Additional generated metadata:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/kimi-tool-stream-visibility/autobyteus-web/electron-dist/latest-mac.yml`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/kimi-tool-stream-visibility/autobyteus-web/electron-dist/builder-debug.yml`

## Build Notes / Warnings

- Build produced expected unsigned local macOS artifacts; electron-builder logged `skipped macOS code signing` because signing identity was explicitly null.
- Nuxt emitted a large-chunk warning and one dynamic/static import chunking warning; these are build warnings, not failures.
- pnpm emitted ignored-build-script/deprecated dependency warnings during server deploy; packaging completed successfully.
- `node-pty` native rebuild for Electron completed successfully.
- Server files were prepared into `autobyteus-web/resources/server` and bundled into the Electron build.

## Repository State Notes

- The build generated ignored output under `autobyteus-web/electron-dist`, `autobyteus-web/dist`, `autobyteus-web/.nuxt`, and `autobyteus-web/resources/server` as part of packaging.
- No repository finalization, ticket archival, commit, push, merge, release, deployment, or cleanup was performed.
