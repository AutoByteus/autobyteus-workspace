# Electron Test Build Report

## Scope

- Ticket: `browser-mobile-view-support`
- Date: `2026-05-18`
- Purpose: Build a local macOS Electron app artifact for user verification/testing of the round-3-passed Browser mobile-view support.
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/browser-mobile-view-support`
- Branch: `codex/browser-mobile-view-support`
- Base at build time: `origin/personal` / `HEAD` at `bea1185cde5b77dde7a565983f103085cba8178a`
- Source state: includes the round-3 Local Fix for the shell-presentation overwrite and the docs sync update.

## Supersession Note

The earlier local Electron build from this ticket was superseded by the round-2/round-3 presentation rework. This report records the fresh build created after the round-3 API/E2E pass.

## README Instructions Used

- Repo root `README.md` was read for release/build workflow context.
- `autobyteus-web/README.md` was read for local Electron build instructions. It documents `pnpm build:electron:mac` for macOS and says built applications are written to `autobyteus-web/electron-dist`.
- For local macOS build behavior, the README's no-notarization/no-timestamp guidance was applied via environment variables.

## Dependency Preparation

Command:

```bash
pnpm install --frozen-lockfile
```

Result: `Passed`

Notes:

- Installed workspace dependencies from the existing lockfile.
- `autobyteus-ts` postinstall repaired the local `node-pty` `spawn-helper` permissions.
- pnpm warned that `lzma-native@8.0.6` build scripts are ignored by current pnpm approval policy; this did not block the build.

## Build Command

Command:

```bash
NO_TIMESTAMP=1 APPLE_TEAM_ID= APPLE_SIGNING_IDENTITY= pnpm -C autobyteus-web build:electron:mac
```

Result: `Passed`

## Build Steps Completed

- `guard:web-boundary` passed.
- `guard:localization-boundary` passed.
- `audit:localization-literals` passed with zero unresolved findings.
- `prepare-server` passed:
  - server dependencies installed from lockfile
  - Prisma client generated
  - server build completed
  - server deployed into `autobyteus-web/resources/server`
  - native `node-pty` modules rebuilt for Electron
  - external symlinks removed from the bundled server resources
- `generate:electron` passed.
- `transpile-electron` passed.
- build TypeScript transpilation passed.
- `electron-builder` packaged macOS arm64 artifacts.
- `git diff --check` passed after the build/report updates.

## Build Warnings / Notes

- Nuxt emitted the existing large-chunk warnings and one dynamic/static import chunking warning for `file_explorer_queries.ts`.
- Node emitted the known `MODULE_TYPELESS_PACKAGE_JSON` warning during localization audit.
- Prisma printed an available major-version update notice; no dependency update was performed.
- Electron builder skipped macOS code signing because `APPLE_SIGNING_IDENTITY` was intentionally unset for this local test build.
- This local build is not notarized and is intended for user verification only, not public distribution.
- Generated local build/dependency folders are intentionally retained for user testing and are ignored by git: `node_modules/`, `autobyteus-web/dist/`, `autobyteus-web/electron-dist/`, `autobyteus-web/resources/`, `autobyteus-server-ts/dist/`, and `autobyteus-ts/dist/`.

## Artifacts Produced

| Artifact | Size | Notes |
| --- | ---: | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/browser-mobile-view-support/autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.3.18.dmg` | `368M` | Main local macOS installer image for testing. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/browser-mobile-view-support/autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.3.18.zip` | `369M` | Zipped macOS app artifact. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/browser-mobile-view-support/autobyteus-web/electron-dist/mac-arm64/AutoByteus.app` | inside `1.2G` app output dir | Unpacked app output produced by electron-builder. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/browser-mobile-view-support/autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.3.18.dmg.blockmap` | `384K` | Build metadata. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/browser-mobile-view-support/autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.3.18.zip.blockmap` | `376K` | Build metadata. |

## Verification Status

- Local Electron test build: `Passed`
- Ready for user manual testing: `Yes`
- Repository finalization status: user verification received; finalization requested with no release/version bump.
