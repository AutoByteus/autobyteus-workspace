# Electron Test Build Report

## Build Meta

- Ticket: `team-task-conversation-ui`
- Delivery revision: `DR-002`
- Trigger: User requested that delivery read the README and build Electron for
  hands-on testing.
- Date: `2026-08-20`
- Host: macOS `26.5.2`, Darwin arm64.
- Source worktree:
  `/Users/normy/autobyteus_org/autobyteus-worktrees/team-task-conversation-ui-design`
- Source branch: `codex/team-task-conversation-ui-design`
- Integrated source head:
  `002c83c418dec05c428b2e53ed4161c8d2192621`
- Latest checked base: `origin/personal` at
  `3b81b5ebdc4c5eae64e221aff9c578adc7e7fb74`; unchanged after the DR-002
  `git fetch origin --prune`; branch remained 6 ahead / 0 behind.

## README / Project Guidance Used

- `/Users/normy/autobyteus_org/autobyteus-worktrees/team-task-conversation-ui-design/README.md`
  - `Packaged Electron API/E2E testing` documents exact-artifact reuse,
    isolated non-production launch, and owned cleanup.
- `/Users/normy/autobyteus_org/autobyteus-worktrees/team-task-conversation-ui-design/autobyteus-web/README.md`
  - `Desktop Application Build` specifies `pnpm build:electron:mac`.
  - `macOS Build With Logs (No Notarization)` permits a local build with
    `NO_TIMESTAMP=1` and an empty `APPLE_TEAM_ID`.
  - `Desktop Application with Integrated Backend` confirms the standard build
    automatically prepares and packages the backend.
- `/Users/normy/autobyteus_org/autobyteus-worktrees/team-task-conversation-ui-design/autobyteus-web/AGENTS.md`
  - Release/tag/version rules were reviewed; this is a local test package, not a
    release, so no version bump, tag, push, or release workflow is applicable.
- Documentation assessment: `No impact for DR-002`; the commands and safety
  guidance were accurate and required no correction.

## Build Command And Result

Working directory:
`/Users/normy/autobyteus_org/autobyteus-worktrees/team-task-conversation-ui-design/autobyteus-web`

```bash
NO_TIMESTAMP=1 APPLE_TEAM_ID= AUTOBYTEUS_BUILD_FLAVOR=personal \
  pnpm build:electron:mac
```

- Result: `Pass`, exit `0`.
- Package version: `1.4.52`.
- Build flavor / artifact base: `personal` / `AutoByteus_personal`.
- Target: `darwin-arm64`.
- Included backend: `Yes`; server preparation/build, mobile web build, Prisma
  generation, deployment pruning, Electron-native rebuild, and node-pty helper
  normalization all completed.
- Frontend gates: web boundary, localization boundary, and localization literal
  audit all passed.
- Nuxt/Electron generation: passed; 3,681 frontend modules transformed and the
  Electron main/preload build completed.
- Signing/notarization: local unsigned/unnotarized test build; macOS code signing
  was intentionally skipped because `APPLE_TEAM_ID` was empty. This is not a
  distributable release artifact.
- Build log:
  `/Users/normy/autobyteus_org/autobyteus-worktrees/team-task-conversation-ui-design/tickets/done/team-task-conversation-ui/delivery-evidence/dr-002-electron-build-macos-arm64.log`

## Test Artifacts

### Recommended DMG

- Path:
  `/Users/normy/autobyteus_org/autobyteus-worktrees/team-task-conversation-ui-design/autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.4.52.dmg`
- Size: `463,962,090` bytes.
- SHA-256:
  `77b277a8086ab6dd47154452446b8e55f7835ce254b55b04af891cb9b307eb7a`
- `hdiutil verify`: `Pass`.

### ZIP

- Path:
  `/Users/normy/autobyteus_org/autobyteus-worktrees/team-task-conversation-ui-design/autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.4.52.zip`
- Size: `457,728,524` bytes.
- SHA-256:
  `1c0217d2ba928940dd7ddbacca8415b9b25e9a6dfe3637ad5287aa4e134b1363`
- `unzip -t`: `Pass`; no compressed-data errors.

### Unpacked Application

- Path:
  `/Users/normy/autobyteus_org/autobyteus-worktrees/team-task-conversation-ui-design/autobyteus-web/electron-dist/mac-arm64/AutoByteus.app`
- Executable architecture: `Mach-O 64-bit executable arm64`.
- Bundle identifier: `com.autobyteus.app`.
- Bundle version: `1.4.52`.
- Packaged `app.asar` SHA-256:
  `67a8bed9dd9344e7efe9ceff639ba67f4a144fd584abb0825f215682d0e4c981`.

## Integrity And Smoke Verification

- DMG checksum verification: `Pass`.
- ZIP integrity: `Pass`.
- Packaged backend and application resources: present.
- Packaged node-pty target helper: present, executable, and arm64.
- Packaged selected node-pty helper: present, executable, and arm64.
- Real packaged node-pty spawn probe: `Pass`.
- Exact-artifact isolated Electron launch:

```bash
env -u ELECTRON_RUN_AS_NODE pnpm test:e2e:electron \
  --skip-build \
  --adapter direct \
  --executable /Users/normy/autobyteus_org/autobyteus-worktrees/team-task-conversation-ui-design/autobyteus-web/electron-dist/mac-arm64/AutoByteus.app/Contents/MacOS/AutoByteus
```

- Launch result: `Pass`; packaged backend became healthy at the owned isolated
  URL `http://127.0.0.1:50665`.
- Cleanup result: `Pass`; the owned temporary root was removed, port `50665`
  had no remaining listener, and no process from the built executable remained.
- Integrity evidence:
  `/Users/normy/autobyteus_org/autobyteus-worktrees/team-task-conversation-ui-design/tickets/done/team-task-conversation-ui/delivery-evidence/dr-002-electron-package-integrity.log`
- Smoke evidence:
  `/Users/normy/autobyteus_org/autobyteus-worktrees/team-task-conversation-ui-design/tickets/done/team-task-conversation-ui/delivery-evidence/dr-002-isolated-electron-launch-smoke.log`
- Cleanup evidence:
  `/Users/normy/autobyteus_org/autobyteus-worktrees/team-task-conversation-ui-design/tickets/done/team-task-conversation-ui/delivery-evidence/dr-002-isolated-electron-cleanup-audit.log`

## Hands-On Test Instructions

An older AutoByteus build from the main workspace is currently running as PID
`22115`, with its backend PID `22745` listening on production port `29695`. It
was observed read-only and was not stopped or modified.

### Test with normal persisted application state

1. Quit the currently running AutoByteus application normally.
2. Open the recommended DMG.
3. Open/copy `AutoByteus.app` as desired.
4. Because this is an unsigned local test build, macOS may require right-click
   **Open** and explicit confirmation.
5. Exercise the Team tab Tasks journey described in `handoff-summary.md`.

Do not run two ordinary instances against port `29695` or the same production
state directory simultaneously.

### Test alongside the existing application with isolated temporary state

From `autobyteus-web`, use the README-supported launcher with a hold window:

```bash
env -u ELECTRON_RUN_AS_NODE pnpm test:e2e:electron \
  --skip-build \
  --adapter direct \
  --executable /Users/normy/autobyteus_org/autobyteus-worktrees/team-task-conversation-ui-design/autobyteus-web/electron-dist/mac-arm64/AutoByteus.app/Contents/MacOS/AutoByteus \
  --hold-ms 600000
```

This path uses an isolated non-`29695` port and preparation-owned temporary data
root. The temporary profile does not reuse the ordinary application's persisted
runs or provider configuration.

## Delivery State

- User verification: received on 2026-08-20; the user confirmed the task is done.
- Ticket archived at `tickets/done/team-task-conversation-ui`.
- Repository finalization is authorized without a release.
- No version bump, tag, release, publication, or deployment is required.
