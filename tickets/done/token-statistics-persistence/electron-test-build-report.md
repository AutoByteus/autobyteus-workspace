# Electron Test Build Report

## Current Finalized-Main Build Snapshot — DR-006

- Ticket: `token-statistics-persistence`
- Source repository/branch: Main workspace `personal` after the accepted ticket
  was merged and pushed.
- Product source revision:
  `c57bf44b01a4f322f3241de86954e237cad58911`.
- Result: `Pass — finalized-main personal macOS arm64 package built,
  integrity-verified, and exact-artifact isolated-smoke tested.`
- This is the user-requested local build from finalized main. It is not a
  release, publication, version bump, tag, Apple-signed/notarized distribution,
  or deployment.

### README And Command

Delivery reread the root and frontend README Electron guidance and ran from
`/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-web`:

```sh
AUTOBYTEUS_BUILD_FLAVOR=personal \
NO_TIMESTAMP=1 APPLE_TEAM_ID= \
DEBUG='electron-builder,electron-builder:*' \
DEBUG='app-builder-lib*' DEBUG='builder-util*' \
pnpm build:electron:mac
```

Result: `Pass`, exit 0. The pipeline passed web/localization guards,
localization audit, shared and corrected server builds, sanitized built-in-agent
bootstrap smoke, mobile/static and Electron renderer generation, Electron
TypeScript transpilation, native-module rebuild, and personal DMG/ZIP packaging.

Evidence:
`/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/token-statistics-persistence/delivery-evidence/dr-006-main-personal-electron-build.log`.

### Current Main-Workspace Artifacts

- DMG:
  `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.4.52.dmg`
  - Size: `461190182` bytes
  - SHA-256:
    `8d0f1125ea4f22576bc86cabd8d83042d8836b9cc986f5cdd2917ebd9e8a640b`
- ZIP:
  `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.4.52.zip`
  - Size: `457753752` bytes
  - SHA-256:
    `80a1cf2f52571268cb3f21475b4d8468bda70723b7bb367181f13cca31801a69`
- Unpacked app:
  `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-web/electron-dist/mac-arm64/AutoByteus.app`
- Main executable:
  `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-web/electron-dist/mac-arm64/AutoByteus.app/Contents/MacOS/AutoByteus`
  - SHA-256:
    `c0bf182389ea930585e3b0bf5c4f16529461e02bf3be751cb364d0e25f2257e0`
  - Architecture: Mach-O arm64
  - Bundle ID: `com.autobyteus.app`
  - Version/build: `1.4.52` / `1.4.52`

### Verification

- `hdiutil verify` on the current DMG: `Pass`.
- `unzip -tq` on the current ZIP: `Pass`.
- Bundle metadata, executable presence/permissions, arm64 architecture, and
  local ad-hoc signature metadata: `Pass`.
- Exact executable isolated launch with README direct adapter and the existing
  host workaround `RUST_LOG=info`: `Pass`, exit 0. The packaged backend became
  healthy on isolated port `58285`, used an owned temporary data root, and was
  cleaned by the launcher.
- Integrity evidence:
  `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/token-statistics-persistence/delivery-evidence/dr-006-main-personal-artifact-verification.log`.
- Runtime evidence:
  `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/token-statistics-persistence/delivery-evidence/dr-006-main-personal-isolated-launch-smoke.log`.

### Status And Limitations

- Repository finalization and this main-personal build completed successfully.
- The package is linker/ad-hoc signed, has no Apple Team ID, is not timestamped,
  and is not notarized.
- The inherited Prisma 5.22 blank-profile limitation remains bounded: default
  initialization of a truly blank profile is not certified on this host, while
  the `RUST_LOG=info` isolated path and the user's existing profile pass.
- No release, publication, tag, version bump, notarization, or deployment was
  requested or performed.

## Historical Corrected Ticket-Worktree Build Snapshot — DR-004

- Ticket: `token-statistics-persistence`
- Trigger: Corrected implementation commit
  `0ce9d17b75195b0142abadc4593f6fea47893be0` passed renewed source review
  `CRR-004`, API/E2E `API-REV-003` at `98.3%`, and proportional durable-test
  review `CRR-005`. The prior DR-003 package did not contain this correction and
  was therefore superseded.
- Result: `Pass — corrected personal macOS arm64 package built,
  integrity-verified, and exact-artifact isolated-smoke tested.`
- This is a local test package only. It is not a release, publication, version
  bump, tag, notarized distribution, or user acceptance signal.

## README And Packaging Guidance Used

- Root build/test/release guidance:
  `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/README.md`
  (`Build examples`, `Packaged Electron API/E2E testing`, and `Release workflow`).
- Frontend build guidance:
  `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-web/README.md`
  (`Desktop Application Build`, `macOS Build With Logs`, and integrated backend).
- Canonical flavor/runtime guidance:
  `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-web/docs/electron_packaging.md`.
- The documented `AUTOBYTEUS_BUILD_FLAVOR=personal` override was used because
  the ticket's recorded finalization target is `personal`.

## Corrected Source And Integrated State

- Host: macOS `26.5.2` (`25F84`), Apple Silicon `arm64`.
- Frontend/package version: `1.4.52`.
- Ticket branch: `codex/token-statistics-persistence`.
- Corrected source HEAD:
  `0ce9d17b75195b0142abadc4593f6fea47893be0`.
- Latest tracked target at the DR-004 refresh:
  `origin/personal` at `fc5ce18bc202012280dcbf5b4bcd6c5c52948ad6`.
- Integrated-state result: Target unchanged from DR-003, merge base exactly
  matched the target, and ticket divergence was 6 ahead / 0 behind. No merge or
  post-merge executable rerun was required because API-REV-003 validated this
  exact HEAD after the last integration and no new target commits existed.
- Refresh evidence:
  `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/token-statistics-persistence/delivery-evidence/dr-004-corrected-state-initial-refresh.log`.

## Corrected Behavior Authority

- Source review: `CRR-004 — Pass`, `96.2/100`; finding `CR-001` resolved.
- API/E2E: `API-REV-003 — Pass`, `98.3%` final confidence.
- Durable-test review: `CRR-005 — Pass`, no findings.
- The public current-run summary builder now explicitly projects only canonical
  `TokenUsageRunSummaryPayload` fields. Statistics-only `observed_*` arrays no
  longer leak into strict standalone/Team event DTOs.
- Real mixed-runtime Classroom Simulation Team, standalone Daily Assistant,
  fresh built-backend/browser restart, strict contract 2/2, affected server
  suites 14/14, production server build/bootstrap, boundary inspection, error
  scan, and owned cleanup all passed under API-REV-003.

## Build Execution

From `autobyteus-web`, delivery ran:

```sh
AUTOBYTEUS_BUILD_FLAVOR=personal \
NO_TIMESTAMP=1 APPLE_TEAM_ID= \
DEBUG='electron-builder,electron-builder:*' \
DEBUG='app-builder-lib*' DEBUG='builder-util*' \
pnpm build:electron:mac
```

Result: `Pass`, exit 0. The pipeline passed web/localization guards,
localization audit, shared and corrected server builds, sanitized built-in-agent
bootstrap smoke, mobile/static and Electron renderer generation, Electron
TypeScript transpilation, native module rebuild, and personal DMG/ZIP generation.

Evidence:
`/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/token-statistics-persistence/delivery-evidence/dr-004-corrected-electron-mac-personal-build.log`.

## Historical DR-004 User-Test Artifacts

- Former DMG path (removed with the ticket worktree):
  `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-persistence/autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.4.52.dmg`
  - Size: `464013763` bytes (about 443 MiB)
  - SHA-256:
    `1ac54ff957fb3b6114a6adff02c38de610f787c7477f5fd86ac27d76f7f1705b`
- Former ZIP path (removed with the ticket worktree):
  `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-persistence/autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.4.52.zip`
  - Size: `457754576` bytes (about 437 MiB)
  - SHA-256:
    `fed8c3ea43e87e6b7903f7e92a36b32a766de26d71aea777e0e96e45660c0dca`
- Former unpacked app (removed with the ticket worktree):
  `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-persistence/autobyteus-web/electron-dist/mac-arm64/AutoByteus.app`
- Former main executable (removed with the ticket worktree):
  `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-persistence/autobyteus-web/electron-dist/mac-arm64/AutoByteus.app/Contents/MacOS/AutoByteus`
  - SHA-256:
    `c0bf182389ea930585e3b0bf5c4f16529461e02bf3be751cb364d0e25f2257e0`
  - Architecture: Mach-O arm64
  - Bundle ID: `com.autobyteus.app`
  - Version/build: `1.4.52` / `1.4.52`

## Artifact And Runtime Verification

- `hdiutil verify` on the corrected DMG: `Pass`.
- `unzip -tq` on the corrected ZIP: `Pass`.
- Bundle metadata, executable presence/permissions, version, arm64, and ad-hoc
  signature metadata: `Pass`.
- Integrity evidence:
  `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/token-statistics-persistence/delivery-evidence/dr-004-corrected-personal-artifact-verification.log`.
- Exact unpacked executable isolated launch using the README `direct` adapter
  with the existing host workaround `RUST_LOG=info`: `Pass`, exit 0. The
  corrected packaged backend became healthy at isolated port `57579`, used an
  owned temporary data root, and was cleaned by the launcher.
- Runtime evidence:
  `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/token-statistics-persistence/delivery-evidence/dr-004-corrected-personal-isolated-launch-smoke.log`.
- Final target-currentness, review-authority, working-tree scope, documentation,
  hash, command-outcome, and cleanup audit: `Pass`. Evidence:
  `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/token-statistics-persistence/delivery-evidence/dr-004-final-handoff-checks.log`.

## Signing And User Guidance

- This local build is linker/ad-hoc signed, has no Apple Team ID, is not
  timestamped, and is not notarized.
- Open the DMG, copy `AutoByteus.app` to Applications or another test location,
  and launch it. macOS may require right-click **Open** confirmation.
- Quit any ordinary AutoByteus instance before launching this build. A normal
  launch uses port `29695` and the normal application data root; two ordinary
  instances must not share that port/profile.
- Test against the existing AutoByteus profile so persisted Team/standalone runs
  are available for restart/reopen verification.

## Bounded Host Limitation

DR-003 reproduced the target branch's already-recorded Prisma 5.22 limitation:
default initialization of a brand-new blank isolated profile can fail on this
host, while `RUST_LOG=info` fresh migration and existing-database startup pass.
DR-004 used that established workaround for its isolated smoke and did not
reclassify the upstream issue. The corrected package is ready for the requested
existing-profile test, but default first launch with a brand-new empty profile
is not certified.

## Historical Package Status

- DR-002 package: Superseded when `origin/personal` advanced.
- DR-003 package: Superseded by corrected implementation commit `0ce9d17b7`.
- DR-004 ticket-worktree package: Accepted by the user, then superseded by the
  DR-006 finalized-main package. Its worktree was removed during cleanup.
- Only the DR-006 paths and hashes at the top of this report identify the
  current main-workspace files.

## Final Status

`Pass — repository finalized and the requested main-personal macOS arm64
Electron package built, integrity-verified, and isolated-smoke tested; no
release performed.`
