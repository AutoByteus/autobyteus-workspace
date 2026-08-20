# Electron Test Build Report


## Current Build Snapshot — DR-005

- Trigger: After finalization, the user requested a fresh Electron build from
  the updated main `personal` workspace.
- Date: `2026-08-20`
- Source workspace:
  `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo`
- Source branch/head: `personal` at
  `fbb60fe37ba3f7a90f5561a940a87a45c9c90b3b`.
- Remote state at build start: `origin/personal` matched the source head.
- Command: `NO_TIMESTAMP=1 APPLE_TEAM_ID=
  AUTOBYTEUS_BUILD_FLAVOR=personal pnpm build:electron:mac`.
- Result: `Pass`, exit `0`; personal macOS arm64 version `1.4.52`; backend,
  mobile web, Prisma generation, Electron renderer/main/preload, native rebuild,
  DMG, and ZIP completed.
- Recommended DMG:
  `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.4.52.dmg`
  (`463,867,255` bytes; SHA-256
  `daa26af981f7f274f81eacbfbb91b9e1bff8c35faaed8d0164098ef6409355c2`).
- ZIP:
  `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.4.52.zip`
  (`457,732,656` bytes; SHA-256
  `1b80f47805d1e71590c86cf95c591c4a947ad47062c1da74fd509660a28c99ba`).
- Unpacked app:
  `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-web/electron-dist/mac-arm64/AutoByteus.app`;
  bundle `com.autobyteus.app`, arm64, version `1.4.52`; `app.asar` SHA-256
  `f753cc0ea68564e50be7f6172b1f518462998b4e07a984349f0739f07083691f`.
- Integrity result: `Pass`; `hdiutil verify`, `unzip -tqq`, metadata, helper
  execute bits/architecture, and packaged node-pty spawn passed.
- Existing-profile user-test launch: `Pass`; exact app PID `27867`, backend PID
  `28501`, and `http://127.0.0.1:29695/rest/health` returned status `ok`. The app
  is intentionally left running for the user.
- Seeded isolated exact-artifact launch/cleanup: `Pass`.
- Blank-profile limitation: Two default unseeded isolated launches failed during
  initial Prisma 5.22 schema-engine database creation. Diagnostic results were:
  default blank DB `exit 1`; blank DB with `RUST_LOG=info` `exit 0` and all 22
  migrations; default copy of the existing database `exit 0`; seeded exact app
  launch `exit 0`. Therefore the package is ready for this user's existing
  profile, but this report does not certify first launch with a brand-new empty
  profile on this host.
- Signing: local unsigned/unnotarized. No tag, release, publication, or
  deployment was created.
- Evidence: `delivery-evidence/dr-005-main-personal-electron-build-macos-arm64.log`,
  `delivery-evidence/dr-005-main-personal-electron-package-integrity.log`,
  `delivery-evidence/dr-005-prisma-fresh-root-diagnostic.log`,
  `delivery-evidence/dr-005-main-personal-seeded-isolated-electron-smoke.log`,
  `delivery-evidence/dr-005-main-personal-normal-state-launch.log`, and the two
  retained failed fresh-root smoke logs.


## Historical DR-002 Build Meta

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

## Historical DR-002 README / Project Guidance Used

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

## Historical DR-002 Build Command And Result

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

## Historical DR-002 Test Artifacts

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

## Historical DR-002 Integrity And Smoke Verification

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

## Historical DR-002 Hands-On Test Instructions

At DR-002 time, an older AutoByteus build from the main workspace was running
as PID `22115`, with backend PID `22745` on port `29695`. This is historical;
that process was later replaced by the current DR-005 main-personal build.

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

## Current Delivery State

- User verification: received on 2026-08-20.
- Ticket archived and repository finalized under `DR-004`.
- Current main-personal package built and launched under `DR-005`; the existing-
  profile application is intentionally running for user testing.
- No version bump, tag, release, publication, or deployment was performed.


## Post-Finalization Artifact State

- The DR-002 package was an ignored local test artifact scoped to the dedicated
  ticket worktree.
- Repository finalization completed under `DR-004`, after which that worktree
  and its generated package were removed safely.
- The original paths and checksums above remain historical evidence; they are
  not current filesystem locations.
- A fresh build from updated main `personal` completed under `DR-005`; the
  current filesystem paths and hashes are in the snapshot at the top of this
  report.
