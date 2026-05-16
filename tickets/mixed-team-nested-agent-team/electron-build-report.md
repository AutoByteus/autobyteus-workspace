# Local Electron Build Report

## Delivery Round 12 Latest-Base Supersession Notice

- Current build status: `Superseded for final delivery / available for ad hoc inspection only`
- Reason: after this app was built at `bc2cb3c3`, delivery refreshed `origin/personal` and found it advanced to `29c872bbae3f20a492701443b62a0e13a8924966` with source/docs/test merge conflicts and a workspace version bump to `1.3.14`.
- The artifacts below remain on disk, but a fresh Electron build is required after implementation resolves the latest-base integration conflicts, code review passes, and API/E2E validation reruns.
- Blocker artifact: `/Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-nested-agent-team/tickets/mixed-team-nested-agent-team/delivery-round12-integration-blocker.md`

## Scope

- Ticket: `mixed-team-nested-agent-team`
- Date: `2026-05-16`
- Purpose: Build a local macOS Electron artifact for user testing before repository finalization.
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-nested-agent-team`
- Branch: `codex/mixed-team-nested-agent-team`
- Integrated base checked before build: `origin/personal @ a51d3abd8bb620bb984c9c9f24209e4d32eb167b`
- Ticket branch HEAD for this build: `bc2cb3c3fdff7eb89157d43fa0018bf0caf89ea4 fix(team): enforce structured live command identity`
- Branch state against tracked base: `ahead 13`, `behind 0`
- App/package version: `1.3.13`

## Supersession Status

- Prior Round 9 Electron artifacts were superseded by code review/API-E2E pause in Round 19.
- API/E2E Round 11 and code review Round 22 lift that pause for current commit `bc2cb3c3`.
- This Round 11 build is the current user-verification candidate.

## README Instructions Read

- Root `README.md` was reviewed for workspace setup/build context.
- `autobyteus-web/README.md` was reviewed for desktop/Electron build instructions.
- README-selected host command: `pnpm build:electron:mac` from `autobyteus-web/`.
- The web README documents local macOS no-timestamp/no-notarization style builds; this build used no-signing/no-notarization variables and `AUTOBYTEUS_BUILD_FLAVOR=personal`.

## Command Run

From `/Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-nested-agent-team/autobyteus-web`:

```bash
NO_TIMESTAMP=1 \
APPLE_TEAM_ID= \
APPLE_ID= \
APPLE_APP_SPECIFIC_PASSWORD= \
APPLE_SIGNING_IDENTITY= \
AUTOBYTEUS_BUILD_FLAVOR=personal \
pnpm build:electron:mac
```

Full log:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-nested-agent-team/tickets/mixed-team-nested-agent-team/electron-build.log`

## Result

- Overall package command result: `Pass`
- Pre-build guards passed:
  - `guard:web-boundary`
  - `guard:localization-boundary`
  - `audit:localization-literals` with zero unresolved findings.
- Backend server preparation completed and rebuilt native Electron dependencies.
- Nuxt/Electron renderer and main/preload production build completed.
- Electron app bundle was produced.
- macOS DMG, ZIP, and both blockmaps were produced.
- Expected local unsigned-build note: `APPLE_SIGNING_IDENTITY` was unset, so macOS code signing was skipped.

## Testable Artifacts

- Direct app path: `/Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-nested-agent-team/autobyteus-web/electron-dist/mac-arm64/AutoByteus.app`
- DMG: `/Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-nested-agent-team/autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.3.13.dmg`
- DMG blockmap: `/Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-nested-agent-team/autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.3.13.dmg.blockmap`
- ZIP: `/Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-nested-agent-team/autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.3.13.zip`
- ZIP blockmap: `/Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-nested-agent-team/autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.3.13.zip.blockmap`

## Artifact Verification

Commands run from repository root:

```bash
/usr/libexec/PlistBuddy -c 'Print :CFBundleShortVersionString' autobyteus-web/electron-dist/mac-arm64/AutoByteus.app/Contents/Info.plist
/usr/libexec/PlistBuddy -c 'Print :CFBundleVersion' autobyteus-web/electron-dist/mac-arm64/AutoByteus.app/Contents/Info.plist
/usr/libexec/PlistBuddy -c 'Print :CFBundleIdentifier' autobyteus-web/electron-dist/mac-arm64/AutoByteus.app/Contents/Info.plist
zip -T autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.3.13.zip
hdiutil verify autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.3.13.dmg
du -sh autobyteus-web/electron-dist/mac-arm64/AutoByteus.app autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.3.13.dmg autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.3.13.zip
```

Results:

- `AutoByteus.app`: `1.2G`
- DMG: `368M`
- ZIP: `369M`
- App version: `1.3.13`
- Bundle id: `com.autobyteus.app`
- ZIP integrity: `OK`
- DMG checksum verification: `VALID`
- Verification log: `/Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-nested-agent-team/tickets/mixed-team-nested-agent-team/delivery-round11-post-refresh-checks.log`

## User Testing Notes

- This local build is unsigned because signing/notarization credentials were intentionally not provided; macOS may require right-click / Control-click -> Open.
- To avoid embedded backend port conflicts, quit any currently running AutoByteus app before opening this app bundle.
- This Round 11 build includes the current code-review/API-E2E-passed structured live command identity fixes, route/path-only team command selectors, invalid-target scalar alias rejection, canonical live external-message identity, runtime status no-legacy behavior, and prior nested mixed-team roster/communication/restore work.
