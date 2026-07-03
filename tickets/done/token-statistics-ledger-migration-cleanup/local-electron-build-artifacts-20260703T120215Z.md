# Local Electron Build Artifacts — token-statistics-ledger-migration-cleanup

- Build purpose: local user testing before ticket finalization.
- README guidance read: root `README.md` plus `autobyteus-web/README.md` Desktop Application Build / macOS build sections.
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-ledger-migration-cleanup`
- Branch: `codex/token-statistics-ledger-migration-cleanup`
- HEAD: `5401104af6372e36c11eeda399d638b259754388`
- Integrated base: `origin/personal` at `98db9e8bdbf05358147e68a62c0bcdd183d54bd8`
- Build command directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-ledger-migration-cleanup/autobyteus-web`
- Command: `CI=true NO_TIMESTAMP=1 APPLE_TEAM_ID= APPLE_ID= APPLE_APP_SPECIFIC_PASSWORD= APPLE_SIGNING_IDENTITY= CSC_IDENTITY_AUTO_DISCOVERY=false pnpm build:electron:mac`
- Started: `2026-07-03T11:57:52Z`
- Finished: `2026-07-03T12:02:15Z`
- Result: `Passed`
- Build flavor: `enterprise`
- Signing/notarization: skipped for local testing (`identity explicitly is set to null`).
- Build log: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-ledger-migration-cleanup/tickets/done/token-statistics-ledger-migration-cleanup/local-electron-build-mac-20260703T115752Z.log`
- SHA-256 manifest: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-ledger-migration-cleanup/tickets/done/token-statistics-ledger-migration-cleanup/local-electron-build-artifacts-20260703T120215Z.sha256`

## Testable Artifacts

| Artifact | Path | Size |
| --- | --- | --- |
| App bundle | `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-ledger-migration-cleanup/autobyteus-web/electron-dist/mac-arm64/AutoByteus.app` | `1.2G` |
| DMG | `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-ledger-migration-cleanup/autobyteus-web/electron-dist/AutoByteus_enterprise_macos-arm64-1.3.96.dmg` | `384M` |
| ZIP | `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-ledger-migration-cleanup/autobyteus-web/electron-dist/AutoByteus_enterprise_macos-arm64-1.3.96.zip` | `385M` |
| DMG blockmap | `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-ledger-migration-cleanup/autobyteus-web/electron-dist/AutoByteus_enterprise_macos-arm64-1.3.96.dmg.blockmap` | `412K` |
| ZIP blockmap | `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-ledger-migration-cleanup/autobyteus-web/electron-dist/AutoByteus_enterprise_macos-arm64-1.3.96.zip.blockmap` | `400K` |
| latest-mac.yml | `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-ledger-migration-cleanup/autobyteus-web/electron-dist/latest-mac.yml` | `4.0K` |

## Notes

This is an unsigned local macOS ARM64 build for testing. It is not a signed/notarized release build and does not imply repository finalization.
