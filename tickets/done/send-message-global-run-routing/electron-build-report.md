# Electron Build Report

## Scope

- Ticket: `send-message-global-run-routing`
- User request: Read the README and build the Electron application.
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/send-message-global-run-routing`
- Package: `autobyteus-web`
- Platform built: macOS Apple Silicon / ARM64
- Build flavor: `personal`
- Version: `1.3.53`
- Build output directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/send-message-global-run-routing/autobyteus-web/electron-dist`

## README Guidance Used

Read:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/send-message-global-run-routing/README.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/send-message-global-run-routing/autobyteus-web/README.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/send-message-global-run-routing/autobyteus-web/docs/github-actions-tag-build.md`

Relevant README command for macOS desktop build:

```bash
pnpm build:electron:mac
```

For local macOS builds without notarization/timestamping, the README documents using `NO_TIMESTAMP=1 APPLE_TEAM_ID=`. This local build also pinned `AUTOBYTEUS_BUILD_FLAVOR=personal` and `--arm64` for the current Apple Silicon host.

## Commands Run

Initial full build command:

```bash
cd /Users/normy/autobyteus_org/autobyteus-worktrees/send-message-global-run-routing/autobyteus-web
AUTOBYTEUS_BUILD_FLAVOR=personal NO_TIMESTAMP=1 APPLE_TEAM_ID= pnpm build:electron:mac -- --arm64
```

Result: build pipeline prepared the server, generated web/electron assets, created the `.app` bundle and `.zip`, but failed while creating the `.dmg` because `hdiutil resize` returned exit code `35` (`Die Ressource ist zeitweilig nicht verfügbar`).

Retry packaging command, using the already prepared build resources and a local temporary directory:

```bash
cd /Users/normy/autobyteus_org/autobyteus-worktrees/send-message-global-run-routing/autobyteus-web
mkdir -p .tmp-electron-builder
TMPDIR="$PWD/.tmp-electron-builder" AUTOBYTEUS_BUILD_FLAVOR=personal NO_TIMESTAMP=1 APPLE_TEAM_ID= node build/dist/build.js --mac --arm64
```

Result: passed. `electron-builder` produced `.dmg`, `.zip`, and blockmaps.

## Build Result

- Result: `Pass`
- Code signing: skipped (`APPLE_SIGNING_IDENTITY` not set; electron-builder reported `identity explicitly is set to null`).
- Notarization: disabled for local build (`APPLE_TEAM_ID=` and no full Apple notarization credentials).
- Notable warnings: existing build warnings only — Nuxt chunk-size warnings, pnpm ignored-script warnings for approved-builds, and native `node-pty` compile warnings. None stopped the build.

## Artifacts

| Artifact | Size | SHA-256 |
| --- | ---: | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/send-message-global-run-routing/autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.3.53.dmg` | 360M | `536392962531396328809f374d1500df6a5990752dc0b64c01b78e7576df2347` |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/send-message-global-run-routing/autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.3.53.zip` | 357M | `3fff921dffbefdedaa75b3c5a1a956e79661a80ebb7c5d21cfe9519d5bb48c4e` |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/send-message-global-run-routing/autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.3.53.dmg.blockmap` | 383K | `a6267cbb059d9314a0f1571f78632afdd68fbcefa26c0385bca79c47cb214eab` |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/send-message-global-run-routing/autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.3.53.zip.blockmap` | 375K | `bdc41965b5bbb1de210f6bb7bcf52cc1afd8b13ec63584193b0632f0789e6b95` |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/send-message-global-run-routing/autobyteus-web/electron-dist/mac-arm64/AutoByteus.app` | 1.2G | Directory bundle |

## Repository State Notes

- The build artifacts are generated under `autobyteus-web/electron-dist` and are not shown in normal `git status`, consistent with generated build output.
- Repository finalization is still not performed: no commit, push, merge, ticket archival, release publication, deployment, or cleanup was done by this build step.
