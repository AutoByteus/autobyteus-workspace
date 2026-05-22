# Electron Test Build Report

## Scope

- Ticket: `mobile-ux-cleanup-followup`
- Purpose: Local macOS Electron rebuild requested by user for manual testing before ticket finalization.
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/mobile-ux-cleanup-followup`
- Branch: `codex/mobile-ux-cleanup-followup`
- Build date: 2026-05-22

## README Guidance Used

- Root `README.md` points release/build ownership to the desktop release workflow and frontend package.
- `autobyteus-web/README.md` documents macOS Electron build command `pnpm build:electron:mac` and the local no-notarization/timestamping variant:
  - `NO_TIMESTAMP=1 APPLE_TEAM_ID= DEBUG=electron-builder,electron-builder:* DEBUG=app-builder-lib* DEBUG=builder-util* pnpm build:electron:mac`
- This worktree is a personal-branch ticket, so the build explicitly set `AUTOBYTEUS_BUILD_FLAVOR=personal` to produce `AutoByteus_personal_*` artifacts.

## Command

Run from `/Users/normy/autobyteus_org/autobyteus-worktrees/mobile-ux-cleanup-followup/autobyteus-web` after clearing the prior `electron-dist` directory:

```bash
AUTOBYTEUS_BUILD_FLAVOR=personal \
NO_TIMESTAMP=1 \
APPLE_TEAM_ID= \
DEBUG=electron-builder,electron-builder:* \
DEBUG=app-builder-lib* \
DEBUG=builder-util* \
pnpm build:electron:mac
```

## Result

- Result: `Pass`
- Build flavor: `personal`
- Version: `1.3.25`
- Architecture: `macos-arm64`
- Signing/notarization: local unsigned / not notarized, per README local macOS build guidance (`APPLE_TEAM_ID=` and no Apple credentials).
- Build log: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/mobile-ux-cleanup-followup/logs/delivery/electron-build-mac-arm64-user-test-20260522115220.log`

## Output Artifacts

| Artifact | Size | SHA-256 |
| --- | ---: | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/mobile-ux-cleanup-followup/autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.3.25.dmg` | 362 MiB | `0d157734ccaf736248b38ab5284ee34404a34f9e7bedcbca0957073845a1a9fc` |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/mobile-ux-cleanup-followup/autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.3.25.zip` | 360 MiB | `af5f1fe0be08b2d54f5403251f3fdd15088725c4501a29470b59f132bb9e4da5` |

Auxiliary files were also generated in `autobyteus-web/electron-dist/`:

- `AutoByteus_personal_macos-arm64-1.3.25.dmg.blockmap`
- `AutoByteus_personal_macos-arm64-1.3.25.zip.blockmap`
- `latest-mac.yml`
- `mac-arm64/`

## Mobile Bundle Freshness Check

The Electron prepare-server flow rebuilt and copied the `/mobile` bundle. The generated mobile web index and packaged server mobile-web index match:

- `autobyteus-web/dist-mobile/public/index.html`: `e0194d2eaaec57693e76c635e3202b2cffa3bb2672e0692c9ccea241d98c57fa`
- `autobyteus-web/resources/server/mobile-web/index.html`: `e0194d2eaaec57693e76c635e3202b2cffa3bb2672e0692c9ccea241d98c57fa`
- Result: `Pass`

## Notes / Warnings

- The build emitted expected dependency/build warnings such as large Nuxt chunks, optional/unresolved dependency diagnostics from electron-builder, and unsigned macOS signing/notarization messages for a local test build.
- `prepare-server` rebuilt mobile web assets and bundled them into `resources/server/mobile-web` before Electron packaging.
- No release tag or deployment was performed. After user verification, repository finalization completed and the dedicated ticket worktree was removed, so the local DMG/ZIP paths above are historical test-build evidence rather than retained release artifacts.
