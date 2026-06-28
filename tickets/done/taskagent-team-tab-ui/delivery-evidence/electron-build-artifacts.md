# Local Electron Build Artifacts

## Summary

- Ticket: `taskagent-team-tab-ui`
- Build purpose: Local macOS desktop build for user testing before final repository finalization.
- Build result: `Pass` (command exited with code 0).
- Build completed: 2026-06-28 19:04 CEST (17:04 UTC in electron-builder log).
- Source worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/taskagent-team-tab-ui`
- Ticket branch: `codex/taskagent-team-tab-ui`
- Current HEAD at build time: `9921d4bf036521a0e23b87ebd046dbbcfd4bebd7` (`Merge remote-tracking branch 'origin/personal' into codex/taskagent-team-tab-ui`) plus current uncommitted ticket/delivery working-tree changes.
- README consulted: `/Users/normy/autobyteus_org/autobyteus-worktrees/taskagent-team-tab-ui/autobyteus-web/README.md` (`Desktop Application Build` / `macOS Build With Logs (No Notarization)` sections).
- Distribution directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/taskagent-team-tab-ui/autobyteus-web/electron-dist`

## Command Run

Run from `/Users/normy/autobyteus_org/autobyteus-worktrees/taskagent-team-tab-ui/autobyteus-web`:

```bash
NO_TIMESTAMP=1 \
APPLE_TEAM_ID= \
APPLE_ID= \
APPLE_APP_SPECIFIC_PASSWORD= \
APPLE_SIGNING_IDENTITY= \
CSC_IDENTITY_AUTO_DISCOVERY=false \
DEBUG=electron-builder,electron-builder:*,app-builder-lib*,builder-util* \
pnpm build:electron:mac
```

The README documents `pnpm build:electron:mac` for macOS desktop builds and a verbose no-notarization variant for local macOS builds. The command above follows that README path and explicitly disables automatic code-signing identity discovery for a local test artifact.

## Testable Artifacts

| Artifact | Path | Size |
| --- | --- | ---: |
| macOS ARM64 DMG | `/Users/normy/autobyteus_org/autobyteus-worktrees/taskagent-team-tab-ui/autobyteus-web/electron-dist/AutoByteus_enterprise_macos-arm64-1.3.84.dmg` | 401,068,815 bytes (384M on disk) |
| macOS ARM64 ZIP | `/Users/normy/autobyteus_org/autobyteus-worktrees/taskagent-team-tab-ui/autobyteus-web/electron-dist/AutoByteus_enterprise_macos-arm64-1.3.84.zip` | 396,902,402 bytes (385M on disk) |
| App bundle | `/Users/normy/autobyteus_org/autobyteus-worktrees/taskagent-team-tab-ui/autobyteus-web/electron-dist/mac-arm64/AutoByteus.app` | directory (1.2G on disk) |
| DMG blockmap | `/Users/normy/autobyteus_org/autobyteus-worktrees/taskagent-team-tab-ui/autobyteus-web/electron-dist/AutoByteus_enterprise_macos-arm64-1.3.84.dmg.blockmap` | 420,114 bytes |
| ZIP blockmap | `/Users/normy/autobyteus_org/autobyteus-worktrees/taskagent-team-tab-ui/autobyteus-web/electron-dist/AutoByteus_enterprise_macos-arm64-1.3.84.zip.blockmap` | 407,157 bytes |
| Update metadata | `/Users/normy/autobyteus_org/autobyteus-worktrees/taskagent-team-tab-ui/autobyteus-web/electron-dist/latest-mac.yml` | 561 bytes |
| Builder debug metadata | `/Users/normy/autobyteus_org/autobyteus-worktrees/taskagent-team-tab-ui/autobyteus-web/electron-dist/builder-debug.yml` | 813 bytes |

## SHA-256 Checksums

```text
1ce277196a2ad8ab21ed1e7a999c10db41d51eb6731f0c871ec181afe4b4fbc9  /Users/normy/autobyteus_org/autobyteus-worktrees/taskagent-team-tab-ui/autobyteus-web/electron-dist/AutoByteus_enterprise_macos-arm64-1.3.84.dmg
4e448a5c63c14c1749ce3206ff9d57633258d01d34557ea0eb8adedee27a0936  /Users/normy/autobyteus_org/autobyteus-worktrees/taskagent-team-tab-ui/autobyteus-web/electron-dist/AutoByteus_enterprise_macos-arm64-1.3.84.zip
cd333ee615d5cc6a8d8ea954ebcd82714f8d9edb84bdfdc24dd5eade0d984951  /Users/normy/autobyteus_org/autobyteus-worktrees/taskagent-team-tab-ui/autobyteus-web/electron-dist/AutoByteus_enterprise_macos-arm64-1.3.84.dmg.blockmap
78bbea105e09bed59b2f74b2157764b685d797a08b8291aa85d50a447d799e27  /Users/normy/autobyteus_org/autobyteus-worktrees/taskagent-team-tab-ui/autobyteus-web/electron-dist/AutoByteus_enterprise_macos-arm64-1.3.84.zip.blockmap
```

## Evidence

- Full build log: `/Users/normy/autobyteus_org/autobyteus-worktrees/taskagent-team-tab-ui/tickets/done/taskagent-team-tab-ui/delivery-evidence/electron-build-mac.log`
- Build log tail records `Build completed` with the DMG, ZIP, and blockmap paths.
- The build log records `skipped macOS code signing  reason=identity explicitly is set to null`.

## Signing / Notarization Status

- This is a local testing build, not an official signed/notarized release artifact.
- macOS code signing was skipped because the signing identity was explicitly null and automatic identity discovery was disabled.
- Notarization/timestamping was not performed (`NO_TIMESTAMP=1`, empty Apple notarization environment).
- If macOS Gatekeeper blocks launch during local testing, use the normal local unsigned-app workflow (for example, right-click **Open** on the app/DMG-mounted app, or remove quarantine from a trusted local build).
