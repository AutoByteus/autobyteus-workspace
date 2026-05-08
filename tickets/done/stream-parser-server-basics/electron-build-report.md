# Electron Build Report

- Ticket: `stream-parser-server-basics`
- Date: `2026-05-08`
- Requested action: read README and build Electron locally.
- README command selected for this macOS ARM64 host: `NO_TIMESTAMP=1 APPLE_TEAM_ID= pnpm -C autobyteus-web build:electron:mac`
- Result: `Pass`
- Build log: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/stream-parser-server-basics/electron-build-mac.log`
- Original output directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/stream-parser-server-basics/autobyteus-web/electron-dist`
- Preserved artifact directory: `/Users/normy/autobyteus_org/autobyteus-build-artifacts/stream-parser-server-basics-20260508`

## Artifacts

| Artifact | Size | SHA256 |
| --- | ---: | --- |
| `/Users/normy/autobyteus_org/autobyteus-build-artifacts/stream-parser-server-basics-20260508/AutoByteus_personal_macos-arm64-1.3.0.dmg` | 358M | `c53007b142d028c8cd17b03c9d90a3d92d34070b0b201c7324611355b94fe402` |
| `/Users/normy/autobyteus_org/autobyteus-build-artifacts/stream-parser-server-basics-20260508/AutoByteus_personal_macos-arm64-1.3.0.zip` | 356M | `d1ec5fc6c2c708dea074a32312e07a126f478b2694a3848e3e3b8b8650bbca46` |
| `/Users/normy/autobyteus_org/autobyteus-build-artifacts/stream-parser-server-basics-20260508/AutoByteus_personal_macos-arm64-1.3.0.dmg.blockmap` | 381K | `85424be47afa3233c02132ed0c43b56eeabbc8ed47b90d54ac44a3353a4aa6c6` |
| `/Users/normy/autobyteus_org/autobyteus-build-artifacts/stream-parser-server-basics-20260508/AutoByteus_personal_macos-arm64-1.3.0.zip.blockmap` | 374K | `a9a4c54e05687067afda0359712a2b72fcb433c1066d7cfef531be0a4e9ea881` |

## Notes

- Local README no-notarization mode was used.
- Electron Builder skipped macOS code signing because identity was explicitly null.
- Generated build outputs under `.nuxt/`, `dist/`, `electron-dist/`, and `resources/` were ignored and not added to the source diff. Before the ticket worktree was cleaned up, the DMG/ZIP/blockmaps/latest metadata were copied to the preserved artifact directory listed above.
