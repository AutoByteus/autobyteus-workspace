# Electron Test Build Report

## Build Meta

- Delivery revision: `DR-002`
- Trigger: User requested a README-grounded Electron build for hands-on testing.
- Date: `2026-08-20`
- Worktree:
  `/Users/normy/autobyteus_org/autobyteus-worktrees/electron-e2e-runtime-isolation`
- Source head: `edb123b47f86d69ea7ceb1aaefa799321760cde4` plus the
  reviewed durable API/E2E coverage changes and delivery documentation in the
  working tree.
- Target: macOS arm64, `personal` flavor, package version `1.4.52`.
- Publication status: Local verification build only; not published.

## Instructions Read

- `/Users/normy/autobyteus_org/autobyteus-worktrees/electron-e2e-runtime-isolation/autobyteus-web/README.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/electron-e2e-runtime-isolation/autobyteus-web/AGENTS.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/electron-e2e-runtime-isolation/autobyteus-web/docs/electron_packaging.md`

The README prescribes `pnpm build:electron:mac` for the host-native macOS
package and documents `NO_TIMESTAMP=1 APPLE_TEAM_ID=` for a verbose local build
without notarization/timestamping. `AUTOBYTEUS_BUILD_FLAVOR=personal` was added
to align the ticket-branch artifact name and updater metadata with the recorded
`personal` finalization target.

## Integrated-State Recheck

- Command: `git fetch origin personal`
- Latest base: `origin/personal` at
  `1b2e9b94d1de3b7f38aa2803082e0166a469a978`
- Ticket/base divergence: `3 ahead / 0 behind`
- Result: Base remains identical to the DR-001/bootstrap base; no integration or
  renewed review was required before packaging.

## Build Command And Result

```bash
AUTOBYTEUS_BUILD_FLAVOR=personal \
NO_TIMESTAMP=1 \
APPLE_TEAM_ID= \
DEBUG='electron-builder,electron-builder:*,app-builder-lib*,builder-util*' \
pnpm build:electron:mac
```

- Working directory:
  `/Users/normy/autobyteus_org/autobyteus-worktrees/electron-e2e-runtime-isolation/autobyteus-web`
- Started: `2026-08-20T13:43:10Z`
- Finished: `2026-08-20T13:48:11Z`
- Exit code: `0`
- Result: `Pass`
- Evidence:
  `/Users/normy/autobyteus_org/autobyteus-worktrees/electron-e2e-runtime-isolation/tickets/done/electron-e2e-runtime-isolation/delivery-evidence/dr-002-electron-build.log`

Successful stages included web/localization guards, Prisma generation, shared
and server TypeScript builds, sanitized server bootstrap smoke, mobile web and
Electron renderer generation, server deployment, Electron-native module
rebuild, Electron/build TypeScript compilation, and electron-builder app/DMG/
ZIP packaging.

## Test Artifacts

| Artifact | Size | SHA-256 | Use |
| --- | ---: | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/electron-e2e-runtime-isolation/autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.4.52.dmg` | 463,804,032 bytes | `f682d4599913b1242aed599a9ad300fc189e2725fcc79467732fee46ec290f87` | Recommended installer image for hands-on testing |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/electron-e2e-runtime-isolation/autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.4.52.zip` | 457,736,798 bytes | `4fc6633ae23fd0b92197be7a520cac9264399d756b3527c493669d1517a79a74` | Portable application archive |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/electron-e2e-runtime-isolation/autobyteus-web/electron-dist/mac-arm64/AutoByteus.app` | Unpacked bundle | Main executable `c0bf182389ea930585e3b0bf5c4f16529461e02bf3be751cb364d0e25f2257e0` | Exact executable used for isolated launch smoke |

Metadata: bundle ID `com.autobyteus.app`, version/build `1.4.52`, arm64
Mach-O executable.

## Artifact Verification

- `hdiutil verify`: `Pass`; DMG checksum is valid.
- App metadata and architecture: `Pass`.
- Signing: Local unsigned/ad-hoc test artifact as expected with an empty signing
  identity; it is not notarized and may require macOS **Open** confirmation.
- Evidence:
  `/Users/normy/autobyteus_org/autobyteus-worktrees/electron-e2e-runtime-isolation/tickets/done/electron-e2e-runtime-isolation/delivery-evidence/dr-002-artifact-verification.log`

## Newly Built Exact-Artifact Smoke

- Command:
  `env -u ELECTRON_RUN_AS_NODE pnpm test:e2e:electron --skip-build --adapter direct --executable <newly-built-executable>`
- Result: `Pass`
- Selected isolated port: `60984`
- Readiness: HTTP health reached through the new package.
- Cleanup: Owned process tree completed, preparation-owned root removed, and no
  ticket-worktree package process remained.
- Ordinary application: Backend PID `98429` remained listening on `*:29695`
  before and after the smoke; it was not stopped or reused.
- Evidence:
  `/Users/normy/autobyteus_org/autobyteus-worktrees/electron-e2e-runtime-isolation/tickets/done/electron-e2e-runtime-isolation/delivery-evidence/dr-002-isolated-launch-smoke.log`

The first smoke invocation used a conventional extra `--` separator that the
thin CLI treats as a literal argument. It failed before launching Electron with
`Unknown argument: --`. Delivery corrected the README and packaging-doc command
examples to the actual pnpm invocation, then the second invocation passed. This
was documentation/command syntax, not a packaged-product failure.

## Hands-On Test Guidance

For a normal production-profile test, close the currently running ordinary
AutoByteus instance first, open the DMG, and launch the contained app. This uses
the production port/data paths and is not a concurrency test.

To keep the ordinary instance running and open this build as an isolated E2E
instance for 15 minutes, run from `autobyteus-web`:

```bash
env -u ELECTRON_RUN_AS_NODE pnpm test:e2e:electron \
  --skip-build \
  --adapter direct \
  --executable "$PWD/electron-dist/mac-arm64/AutoByteus.app/Contents/MacOS/AutoByteus" \
  --hold-ms 900000
```

Let the command finish so its owned process tree and temporary data root are
cleaned through the supported session. The printed `electron-e2e-ready` JSON
shows the selected port/root. No credential setup policy is added: the package
continues to receive the caller environment and uses existing application/server
provisioning.

## Residuals And Warnings

- This local package is unsigned/unnotarized and is not a release artifact.
- The isolated E2E renderer may show the already-recorded non-blocking updater-
  initialization notice; updater side effects remain absent.
- Real Windows CIM/`taskkill` remains not tested.
- No repository commit, push, merge, version bump, tag, publication, deployment,
  archival, or cleanup was performed.

## Status

`Pass — personal-flavor macOS arm64 Electron artifacts are ready for user
testing; explicit user verification and repository finalization remain pending.`

## DR-006 — Current Main-Personal Replacement Build

After repository finalization, the user asked for the main personal worktree to
be synchronized, rebuilt, and retained as the runnable source before deleting
the ticket worktree.

- Source worktree:
  `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo`
- Source branch/commit: `personal` at
  `42e38d42f11350aaaea52995dee3c704a8439297`, equal to `origin/personal` at
  build start.
- Command:
  `AUTOBYTEUS_BUILD_FLAVOR=personal NO_TIMESTAMP=1 APPLE_TEAM_ID= pnpm build:electron:mac`
- Result: `Pass`, exit 0.
- Current DMG:
  `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.4.52.dmg`
  — SHA-256
  `e1757b3b2331d146e13245bf00d4007915c20f29906141fb9290f157770bc1e6`.
- Current ZIP:
  `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.4.52.zip`
  — SHA-256
  `87de1775ef27c9686017b510c8b8f90fb808665e36ae4024275f8d77889ad4bd`.
- Current app:
  `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-web/electron-dist/mac-arm64/AutoByteus.app`.
- Main executable SHA-256:
  `c0bf182389ea930585e3b0bf5c4f16529461e02bf3be751cb364d0e25f2257e0`,
  identical to the reviewed/API-E2E candidate.
- Verification: `hdiutil verify` Pass; bundle ID `com.autobyteus.app`, version
  `1.4.52`, and architecture `arm64`.
- Launch decision: Delivery did not launch a second production instance. The
  old app was closed only after this replacement passed; the user can now run
  the app from the current main-worktree path above.
- Cleanup: The old ticket worktree, its registration, and its local and remote
  branches were removed.
- Evidence: `delivery-evidence/dr-006-personal-build.log`,
  `delivery-evidence/dr-006-personal-artifact-verification.log`, and
  `delivery-evidence/dr-006-old-app-shutdown-and-cleanup.log`.

Current status: `Pass — replacement package ready in the main personal
worktree; ticket worktree/branch cleanup completed; no release performed.`
