# Electron Test Build Report

## Purpose

Produce a local macOS ARM64 Electron package from the current integrated, reviewed Universal Application Dual-Host Foundation candidate so the user can manually verify the final narrow/acyclic application runtime before ticket archival and repository finalization.

This DR-005 package supersedes the prior DR-004 v1.4.31 package, which was built before SR-013 / IR-018 / API-REV-012 and before the latest tracked base advanced to v1.4.32.

## Documentation Followed

- Repository root `README.md`: workspace installation and package-manager guidance.
- `autobyteus-web/README.md`: **Desktop Application Build**, macOS `pnpm build:electron:mac`, local no-notarization settings, output location, and integrated-backend packaging.
- `autobyteus-web/docs/electron_packaging.md`: personal build flavor, ARM64 artifact naming, pinned Electron version, server preparation, native `node-pty` rebuild, and packaged terminal-runtime validation.

## Build Context

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis`
- Branch: `codex/universal-application-framework-proposal-analysis`
- Integrated candidate: `f25a9646ebb153714bc486cf14519f3530e1f83d`
- Reviewed handoff anchor: `792e4ba9941fadf9f349734a71f8eff3d73b0dec` (`CRR-034`)
- Reviewed implementation: `IR-018` on `SR-013` / `ARCH-REV-011`
- Latest tracked base included: `origin/personal@80d6693c1b0df5abdfd2c3dc0ec01ff885425847`
- Host: macOS Darwin ARM64
- Node.js: `v22.23.1`
- pnpm: `10.28.2`
- Electron: `42.4.1`
- Desktop package version: `1.4.32`
- Build flavor: `personal`
- Signing/notarization: disabled for this local test package. The app bundle has no complete verifiable application signature or Team ID; the inherited Electron main executable remains linker-signed/ad hoc.

## Build Command

Run from the worktree root:

```bash
CI=true \
NO_TIMESTAMP=1 \
APPLE_TEAM_ID= \
APPLE_SIGNING_IDENTITY= \
APPLE_ID= \
APPLE_APP_SPECIFIC_PASSWORD= \
CSC_IDENTITY_AUTO_DISCOVERY=false \
AUTOBYTEUS_BUILD_FLAVOR=personal \
pnpm -C autobyteus-web build:electron:mac -- --arm64
```

## Build Result

**Pass.**

The documented pipeline completed the web/localization guards, shared/server builds, Prisma generation, bootstrap smoke, mobile-web generation, Electron resource deployment, Electron-ABI `node-pty` rebuild, helper permission normalization, Nuxt/Electron builds, and ARM64 app/DMG/ZIP packaging.

Non-blocking output included existing large Nuxt chunk, deprecated dependency, peer dependency, and pnpm legacy-deploy warnings. No warning failed the package build.

Build evidence:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/evidence/delivery/dr-005-electron-macos-arm64-build.log`

## Current Test Artifacts

| Artifact | Exact Size | SHA-256 |
| --- | ---: | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.4.32.dmg` | `403540850` bytes | `c160ffc07bd5a03aedab0cd42a6a7512ab70ec0858f8169f5fd962952418f831` |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.4.32.zip` | `399557547` bytes | `250623ca45f82e94a1b44fbec5a8ecf3d1a45a939922c58296ab3e9edbbc56fa` |

Unpacked current application:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/autobyteus-web/electron-dist/mac-arm64/AutoByteus.app`

The output directory also contains both current updater blockmaps and `latest-mac.yml`. Any retained v1.4.31 DMG/ZIP is historical DR-004 output and must not be used to verify the current candidate.

## Package Validation

- App metadata: **Pass** — executable `AutoByteus`, identifier `com.autobyteus.app`, version/build `1.4.32`, minimum macOS `12.0`.
- App executable: **Pass** — Mach-O 64-bit ARM64.
- Embedded current framework: **Pass** — Studio and standalone builders, four-projection application runtime contract, engine controller, and engine launcher are present; retired broad engine host and bind-once implementations are absent.
- Packaged terminal runtime: **Pass** — ARM64 `pty.node` and spawn helpers verified; the real packaged `node-pty` spawn probe passed.
- DMG integrity: **Pass** — `hdiutil verify` reports a valid checksum.
- ZIP integrity: **Pass** — `unzip -tq` reports no compressed-data errors.
- Repository hygiene: **Pass** — Electron output and staged server resources are ignored; packaging introduced no tracked source change.
- Process/mount hygiene: **Pass** — the build did not launch AutoByteus and left no test DMG mounted.

Validation evidence:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/evidence/delivery/dr-005-electron-macos-arm64-verification.log`

## Manual Verification Guidance

1. Quit any existing AutoByteus desktop instance so the embedded server port and local data directory are not contested.
2. Open the **v1.4.32 DMG** above, then open `AutoByteus`. For this unsigned local package, macOS may require **Control-click → Open** on first launch.
3. The app uses the normal `~/.autobyteus/server-data` location. Back it up first if testing must not modify current local state.
4. In Studio, load a maintained package and confirm package defaults, selection preview/save/reset, application launch, real artifact publication, recipient-name writer handoff, and explicit **Reload application** after a rebuild.
5. Exercise worker recovery if practical: run an application, stop/reload its worker or application, then confirm subsequent publication and projection continue.
6. Quit while more than one application-owned run is active, reopen with the same data, and confirm clean shutdown plus expected recovery.
7. Reply with explicit approval/completion or a concrete issue so delivery can either finalize or route rework.

## Release Boundary

This package is for local user verification only. It is unsigned, not notarized, not published, not tagged, and not release-policy evidence. The ticket remains in progress, and no final repository, release, deployment, archival, or cleanup action was performed.
