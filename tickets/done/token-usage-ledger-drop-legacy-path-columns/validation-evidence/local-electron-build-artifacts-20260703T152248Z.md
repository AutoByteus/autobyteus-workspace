# Local Electron macOS Build Artifacts

- Build completed: `2026-07-03T15:22:49Z`
- Ticket: `token-usage-ledger-drop-legacy-path-columns`
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-ledger-drop-legacy-path-columns`
- Branch: `codex/token-usage-ledger-drop-legacy-path-columns`
- Branch HEAD at build time: `44f001e9757092a5f641ba225fd7cb325e281fac`
- README command followed: `pnpm build:electron:mac` from `autobyteus-web`
- Local macOS build environment override: `CI=true NO_TIMESTAMP=1 APPLE_TEAM_ID= APPLE_ID= APPLE_APP_SPECIFIC_PASSWORD= APPLE_SIGNING_IDENTITY= CSC_IDENTITY_AUTO_DISCOVERY=false`
- Signing/notarization: unsigned local test build; macOS code signing was skipped because identity was explicitly null.
- Build log: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-ledger-drop-legacy-path-columns/tickets/in-progress/token-usage-ledger-drop-legacy-path-columns/validation-evidence/local-electron-build-mac-20260703T151759Z.log`
- SHA-256 manifest: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-ledger-drop-legacy-path-columns/tickets/in-progress/token-usage-ledger-drop-legacy-path-columns/validation-evidence/local-electron-build-artifacts-20260703T152248Z.sha256`

## Artifacts

| Artifact | Size | Notes |
|---|---:|---|
| `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-ledger-drop-legacy-path-columns/autobyteus-web/electron-dist/mac-arm64/AutoByteus.app` | 1.2G | Runnable app bundle for local testing |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-ledger-drop-legacy-path-columns/autobyteus-web/electron-dist/AutoByteus_enterprise_macos-arm64-1.3.97.dmg` | 384M | Installer image |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-ledger-drop-legacy-path-columns/autobyteus-web/electron-dist/AutoByteus_enterprise_macos-arm64-1.3.97.zip` | 385M | Auto-update/archive package |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-ledger-drop-legacy-path-columns/autobyteus-web/electron-dist/AutoByteus_enterprise_macos-arm64-1.3.97.dmg.blockmap` | 408K | Electron updater block map |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-ledger-drop-legacy-path-columns/autobyteus-web/electron-dist/AutoByteus_enterprise_macos-arm64-1.3.97.zip.blockmap` | 400K | Electron updater block map |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-ledger-drop-legacy-path-columns/autobyteus-web/electron-dist/latest-mac.yml` | 4.0K | Electron updater metadata |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-ledger-drop-legacy-path-columns/autobyteus-web/electron-dist/builder-debug.yml` | 4.0K | electron-builder debug metadata |

## Build Result

`Passed` — `pnpm build:electron:mac` completed successfully and produced the macOS arm64 Enterprise artifacts under `autobyteus-web/electron-dist`.
