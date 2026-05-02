# Electron Test Build Report

## Scope

- Ticket: `restart-tool-trace-sync`
- Purpose: Local user-verification Electron build from the ticket worktree.
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/restart-tool-trace-sync`
- Branch: `codex/restart-tool-trace-sync`
- Source HEAD: `b16a5f879c5b2efbd1a111f4adf4b069a2ca4ccb` plus uncommitted reviewed/validated ticket changes in the worktree.
- Package version: `1.2.90`
- Platform: macOS arm64
- Build flavor: `personal`
- Signing/notarization: disabled for local testing (`APPLE_TEAM_ID=`; macOS signing skipped)

## README / Build Docs Consulted

- `/Users/normy/autobyteus_org/autobyteus-worktrees/restart-tool-trace-sync/README.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/restart-tool-trace-sync/autobyteus-web/README.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/restart-tool-trace-sync/autobyteus-web/docs/electron_packaging.md`

## Command

From `/Users/normy/autobyteus_org/autobyteus-worktrees/restart-tool-trace-sync/autobyteus-web`:

```bash
AUTOBYTEUS_BUILD_FLAVOR=personal NO_TIMESTAMP=1 APPLE_TEAM_ID= pnpm build:electron:mac -- --arm64
```

## Result

- Status: `Pass`
- Started: `2026-05-02T14:12:42Z`
- Finished: `2026-05-02T14:39:47Z`
- Build log: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/restart-tool-trace-sync/logs/delivery/electron-build-personal-mac-arm64-20260502T141242Z.log`
- Latest log alias: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/restart-tool-trace-sync/logs/delivery/electron-build-personal-mac-arm64-latest.log`

## Artifacts

- DMG: `/Users/normy/autobyteus_org/autobyteus-worktrees/restart-tool-trace-sync/autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.2.90.dmg`
- ZIP: `/Users/normy/autobyteus_org/autobyteus-worktrees/restart-tool-trace-sync/autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.2.90.zip`
- DMG blockmap: `/Users/normy/autobyteus_org/autobyteus-worktrees/restart-tool-trace-sync/autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.2.90.dmg.blockmap`
- ZIP blockmap: `/Users/normy/autobyteus_org/autobyteus-worktrees/restart-tool-trace-sync/autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.2.90.zip.blockmap`

## Sizes

- DMG: 358M
- ZIP: 356M
- DMG blockmap: 383K
- ZIP blockmap: 374K

## SHA256

```text
092a9d92d086d31f1df4b90eb2e88c0fd772c16f295c91d81c42f586f5e3aa3d  AutoByteus_personal_macos-arm64-1.2.90.dmg
aaa050eb8a083ca4fe9117b9270d302191447a6c18fb09c897d7ef422b9128cf  AutoByteus_personal_macos-arm64-1.2.90.zip
```

## Notes

- This is a local test build only; no release, version bump, tag, publication, or deployment was performed.
- macOS code signing was intentionally skipped because no signing identity/team id was provided for this local verification build.
- Build warnings were non-blocking and consistent with prior local builds: ignored optional dependency build scripts, dependency deprecation/peer warnings, Nuxt chunk-size warnings, and APFS DMG creation on arm64.
