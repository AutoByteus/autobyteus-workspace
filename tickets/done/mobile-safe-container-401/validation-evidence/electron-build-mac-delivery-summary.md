# Electron Build Evidence — Delivery

- Date: 2026-05-23
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/mobile-safe-container-401`
- README instruction consulted: `autobyteus-web/README.md` documents `pnpm build:electron:mac` and the local macOS no-notarization form.
- Command run: `NO_TIMESTAMP=1 APPLE_TEAM_ID= pnpm -C autobyteus-web build:electron:mac`
- Result: `Pass`
- Build log: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/mobile-safe-container-401/validation-evidence/electron-build-mac-delivery.log`
- Notes: Local macOS ARM64 build completed. The build intentionally skipped macOS code signing/notarization because no signing identity/team was provided for this local verification run.

## Produced Artifacts

- `/Users/normy/autobyteus_org/autobyteus-worktrees/mobile-safe-container-401/autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.3.29.dmg` (361.9 MiB)
- `/Users/normy/autobyteus_org/autobyteus-worktrees/mobile-safe-container-401/autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.3.29.dmg.blockmap` (0.4 MiB)
- `/Users/normy/autobyteus_org/autobyteus-worktrees/mobile-safe-container-401/autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.3.29.zip` (359.6 MiB)
- `/Users/normy/autobyteus_org/autobyteus-worktrees/mobile-safe-container-401/autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.3.29.zip.blockmap` (0.4 MiB)

## Non-blocking Warnings Observed

- Existing Nuxt/Vite chunk-size and mixed static/dynamic import warnings were emitted during generation.
- pnpm emitted existing ignored-build-script/deprecated dependency warnings.
- electron-builder reported code signing skipped because signing identity was explicitly null for the local build.
