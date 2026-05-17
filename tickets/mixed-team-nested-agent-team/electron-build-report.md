# Local Electron Build Report

## Scope

- Ticket: `mixed-team-nested-agent-team`
- Date: `2026-05-16`
- Purpose: Build a local macOS Electron artifact for user testing before repository finalization.
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-nested-agent-team`
- Branch: `codex/mixed-team-nested-agent-team`
- Integrated base checked before build: `origin/personal @ 29c872bbae3f20a492701443b62a0e13a8924966`
- Ticket branch HEAD for this build: `3fa327bb71a21cf63e32afadc7981c141e66e2a8 fix(team): finalize latest-base command integration`
- Branch state against tracked base: `ahead 15`, `behind 0`
- App/package version: `1.3.14`

## Supersession Status

- Prior `1.3.13` Electron artifacts are superseded for final delivery.
- Delivery Round 12 latest-base blocker is resolved by merge commit `6aa36cd6` and final integration commit `3fa327bb`.
- API/E2E Round 13 and code review Round 24 passed at the current integrated state.
- This Round 13 `1.3.14` build is the current user-verification candidate.

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
- DMG: `/Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-nested-agent-team/autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.3.14.dmg`
- DMG blockmap: `/Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-nested-agent-team/autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.3.14.dmg.blockmap`
- ZIP: `/Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-nested-agent-team/autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.3.14.zip`
- ZIP blockmap: `/Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-nested-agent-team/autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.3.14.zip.blockmap`

## Artifact Verification

Commands run from repository root:

```bash
/usr/libexec/PlistBuddy -c 'Print :CFBundleShortVersionString' autobyteus-web/electron-dist/mac-arm64/AutoByteus.app/Contents/Info.plist
/usr/libexec/PlistBuddy -c 'Print :CFBundleVersion' autobyteus-web/electron-dist/mac-arm64/AutoByteus.app/Contents/Info.plist
/usr/libexec/PlistBuddy -c 'Print :CFBundleIdentifier' autobyteus-web/electron-dist/mac-arm64/AutoByteus.app/Contents/Info.plist
zip -T autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.3.14.zip
hdiutil verify autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.3.14.dmg
du -sh autobyteus-web/electron-dist/mac-arm64/AutoByteus.app autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.3.14.dmg autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.3.14.zip
```

Results:

- `AutoByteus.app`: `1.2G`
- DMG: `368M`
- ZIP: `369M`
- App version: `1.3.14`
- Bundle id: `com.autobyteus.app`
- ZIP integrity: `OK`
- DMG checksum verification: `VALID`
- Verification log: `/Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-nested-agent-team/tickets/mixed-team-nested-agent-team/delivery-round13-post-refresh-checks.log`

## User Testing Notes

- This local build is unsigned because signing/notarization credentials were intentionally not provided; macOS may require right-click / Control-click -> Open.
- To avoid embedded backend port conflicts, quit any currently running AutoByteus app before opening this app bundle.
- This Round 13 build includes the latest-base command integration, focused member interrupt routing from `origin/personal`, structured route/path team command identity, invalid-target scalar alias rejection, canonical live external-message identity, runtime status no-legacy behavior, and prior nested mixed-team roster/communication/restore work.
