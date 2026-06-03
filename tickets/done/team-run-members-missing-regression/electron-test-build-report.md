# Electron Test Build Report

## Scope

- Ticket: `team-run-members-missing-regression`
- Date: `2026-06-03`
- Trigger: User requested a README-guided Electron build, then delivery reran the build after Round 4 Local Fix validation and docs sync.
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-run-members-missing-regression`
- Branch: `codex/team-run-members-missing-regression`
- Candidate checkpoint commit: `3316000918647ce77c0de15666f479bb809bda92`
- Build type: Local macOS arm64 Electron build for verification; not a release.

## README Guidance Used

- `autobyteus-web/README.md` states macOS Electron builds use `pnpm build:electron:mac` and output to `electron-dist`.
- `autobyteus-web/README.md` also gives the local macOS no-notarization/logging form with `NO_TIMESTAMP=1 APPLE_TEAM_ID=`.
- `README.md` release workflow was reviewed; no `pnpm release ...` command was run because this is a local Electron build, not a version/tag release.

## Setup

- Dependencies were available in the ticket worktree from the earlier lockfile install:
  - `pnpm install --frozen-lockfile`
- Generated build outputs remain ignored by git.

## Build Command

Run from `/Users/normy/autobyteus_org/autobyteus-worktrees/team-run-members-missing-regression/autobyteus-web`:

```bash
AUTOBYTEUS_BUILD_FLAVOR=personal NO_TIMESTAMP=1 APPLE_TEAM_ID= pnpm build:electron:mac
```

## Result

- Status: `Pass`
- Completed: `2026-06-03 08:47 CEST`
- Build log: `/tmp/team-run-members-electron-build-round4-rerun-20260603T064358Z.log`
- Signing/notarization: skipped intentionally for local verification build (`APPLE_TEAM_ID=`; electron-builder reported macOS code signing skipped because identity is explicitly null).
- Publishing: not performed; electron-builder created local artifacts only.
- Note: An earlier build attempt was interrupted by the user and produced partial `electron-dist` contents. Delivery removed `electron-dist/` and reran the build cleanly to completion.

## Build Stages Observed

- `guard:web-boundary` — passed.
- `guard:localization-boundary` — passed.
- `audit:localization-literals` — passed with zero unresolved findings.
- `prepare-server` — passed; built backend/shared artifacts, generated Prisma client, built mobile web assets, deployed server into `resources/server`, rebuilt `node-pty` for Electron, and validated critical imports.
- `generate:electron` — passed.
- `transpile-electron` and build TypeScript step — passed.
- Electron builder macOS packaging — passed; produced DMG, ZIP, and blockmaps.

## Output Artifacts

| Artifact | Size | SHA256 |
| --- | ---: | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/team-run-members-missing-regression/autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.3.41.dmg` | `362M` | `610f651696112e9696ef8a078a7bdd5ce7d91961e008895048d6a361741958d8` |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/team-run-members-missing-regression/autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.3.41.zip` | `360M` | `9c87c222e64b6ad74f606048eef7b3e24c2bee09a6b80ee2e562d064928c5097` |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/team-run-members-missing-regression/autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.3.41.dmg.blockmap` | `387K` | `c257f68fb70898c45754f385074aab2f37d91f0aa48bdd7dfb1198c7e9ebd681` |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/team-run-members-missing-regression/autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.3.41.zip.blockmap` | `378K` | `fde1cdc62d4b3e32243f7747f0b8b9e397e91bb841aeb4347483c19c80b5cdae` |

Additional generated files in ignored `electron-dist/`:

- `builder-debug.yml`
- `latest-mac.yml`
- `mac-arm64/AutoByteus.app`

## Warnings / Notes

- Nuxt/Vite emitted existing large chunk warnings; build completed successfully.
- Prisma printed an available major-version update notice; no dependency upgrade was part of this ticket.
- pnpm printed ignored build-script warnings for cached/install dependencies; the build completed successfully.
- This was a local unsigned/unnotarized macOS verification artifact, not a published release.

## Git State Impact

- Source/ticket tracked diff remains on branch `codex/team-run-members-missing-regression`.
- Build outputs and dependency directories are ignored:
  - `node_modules/`
  - `autobyteus-web/.nuxt/`
  - `autobyteus-web/dist/`
  - `autobyteus-web/dist-mobile/`
  - `autobyteus-web/resources/`
  - `autobyteus-web/electron-dist/`
  - `autobyteus-server-ts/node_modules/`
- No push, merge, ticket archival, version bump, tag, release, deployment, or cleanup was performed.
