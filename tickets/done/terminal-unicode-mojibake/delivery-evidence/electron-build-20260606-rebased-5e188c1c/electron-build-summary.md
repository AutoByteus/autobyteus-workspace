# Electron Build Summary After Rebase

- Ticket: `terminal-unicode-mojibake`
- Build date: `2026-06-06`
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/terminal-unicode-mojibake`
- Ticket branch: `codex/terminal-unicode-mojibake`
- Rebasing base: `origin/personal@5e188c1c9210be3ff82dd8f9282f2802773446d4`
- Ticket HEAD after rebase: `5382e86cf720f972ca269d25890cf176bfe15c7c`
- README guidance consulted: `autobyteus-web/README.md` Desktop Application Build and macOS Build With Logs / No Notarization sections.
- Command: `NO_TIMESTAMP=1 APPLE_TEAM_ID= pnpm build:electron:mac`
- Workdir: `/Users/normy/autobyteus_org/autobyteus-worktrees/terminal-unicode-mojibake/autobyteus-web`
- Result: `Pass`
- Signing/notarization: skipped for local test build (`APPLE_TEAM_ID=` blank; electron-builder logged code signing skipped).
- Pre-build cleanup: removed stale generated `autobyteus-ts/dist` and `autobyteus-web/resources/server` after the first post-rebase build attempt found stale removed CLI TUI output in `dist`.

## Artifacts

- `/Users/normy/autobyteus_org/autobyteus-worktrees/terminal-unicode-mojibake/autobyteus-web/electron-dist/AutoByteus_enterprise_macos-arm64-1.3.43.dmg` (377609649 bytes)
- `/Users/normy/autobyteus_org/autobyteus-worktrees/terminal-unicode-mojibake/autobyteus-web/electron-dist/AutoByteus_enterprise_macos-arm64-1.3.43.zip` (374177375 bytes)
- `/Users/normy/autobyteus_org/autobyteus-worktrees/terminal-unicode-mojibake/autobyteus-web/electron-dist/AutoByteus_enterprise_macos-arm64-1.3.43.dmg.blockmap` (393800 bytes)
- `/Users/normy/autobyteus_org/autobyteus-worktrees/terminal-unicode-mojibake/autobyteus-web/electron-dist/AutoByteus_enterprise_macos-arm64-1.3.43.zip.blockmap` (384703 bytes)

## Checksums

```text
fea2a2d2e9f533a0db6d900bb9823f630bf31e402a5e5a44d3741871e16159fe  /Users/normy/autobyteus_org/autobyteus-worktrees/terminal-unicode-mojibake/autobyteus-web/electron-dist/AutoByteus_enterprise_macos-arm64-1.3.43.dmg
4b9b2816ee2a1c28fd411aa776385ff1dbcb86283674c4b4c5e94c898b15f963  /Users/normy/autobyteus_org/autobyteus-worktrees/terminal-unicode-mojibake/autobyteus-web/electron-dist/AutoByteus_enterprise_macos-arm64-1.3.43.zip
90c192e87ae3fba8ff23b5f4024bf37a89eadfe21ed4087582e14370ddc057b8  /Users/normy/autobyteus_org/autobyteus-worktrees/terminal-unicode-mojibake/autobyteus-web/electron-dist/AutoByteus_enterprise_macos-arm64-1.3.43.dmg.blockmap
bb5274f2ff30b0b036a136d5b5807402d000554dabfb19637bc2fd0328893ec7  /Users/normy/autobyteus_org/autobyteus-worktrees/terminal-unicode-mojibake/autobyteus-web/electron-dist/AutoByteus_enterprise_macos-arm64-1.3.43.zip.blockmap
```

## Build Logs

- Successful rebuild: `/Users/normy/autobyteus_org/autobyteus-worktrees/terminal-unicode-mojibake/tickets/done/terminal-unicode-mojibake/delivery-evidence/electron-build-20260606-rebased-5e188c1c/electron-build.log`
- First post-rebase attempt failure from stale generated dist: `/Users/normy/autobyteus_org/autobyteus-worktrees/terminal-unicode-mojibake/tickets/done/terminal-unicode-mojibake/delivery-evidence/electron-build-20260606-rebased-5e188c1c/electron-build-attempt1-stale-dist-failure.log`
