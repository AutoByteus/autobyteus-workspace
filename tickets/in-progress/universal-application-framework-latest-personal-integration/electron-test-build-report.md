# Electron Test Build Report — DR-007


> **DR-008 newest-base rebuild blocked (2026-08-24).** The non-mutating merge preview against `origin/personal@389748b0b9f0dea051aaed18641de131cf0adbbb` reports two semantic form-test conflicts. No 1.4.57 package was built. The DR-007 1.4.56 package below is historical and is not proof of the newest-base request.
## Current Result

**Pass — Personal macOS ARM64 Electron 1.4.56 is rebuilt and verified from the latest integrated base.**

This package supersedes all DR-001–DR-005 Electron artifacts. DR-006 produced no package.

## Documentation Followed

- Root `README.md`: packaged Electron API/E2E and isolated launch-profile behavior.
- `autobyteus-web/README.md`: macOS Electron build, integrated backend, output paths, and unsigned local build guidance.
- `autobyteus-web/docs/electron_packaging.md`: bundled-server ownership, terminal native verification, artifact naming, signing posture, and packaged isolation.

## Integrated Source

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-latest-personal-integration`
- Branch: `codex/universal-application-framework-latest-personal-integration`
- Latest fetched base: `origin/personal@52b4be02ea793f2071fe5a63a94664ab25196433`
- Delivery safety checkpoint: `b7fc12940e0e0b7d39e50a5d81199ecf4c32f8b1`
- Final base merge: `737c03cb2f554cd65dabfc7bbfb3ab40a147baf4`
- Merge parents: `b7fc12940e0e0b7d39e50a5d81199ecf4c32f8b1` and `52b4be02ea793f2071fe5a63a94664ab25196433`
- Post-build fetch: unchanged; base is an ancestor
- Final divergence: 152 ahead / 0 behind
- Source/API gates: `CRR-014` Pass / 95; `API-REV-008` Pass / 98; `CRR-015` Not Applicable

## Build Context

- Host: macOS Darwin ARM64
- Node.js: v22.23.1
- pnpm: 10.28.2
- Electron: 42.4.1
- Desktop version: 1.4.56
- Flavor: personal
- Signing/notarization: disabled; unsigned local verification package

## Build Command

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

Pass. The documented pipeline passed the repository guards, shared/server builds, Prisma generation, built-in-agent bootstrap smoke, mobile and Electron Nuxt generation, main/preload compilation, server deployment, Electron-ABI native rebuild, node-pty helper normalization, and app/DMG/ZIP packaging.

Evidence: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-latest-personal-integration/tickets/in-progress/universal-application-framework-latest-personal-integration/evidence/delivery/dr-007-electron-macos-arm64-build.log`.

## Current Artifacts

| Artifact | Size | SHA-256 |
| --- | ---: | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-latest-personal-integration/autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.4.56.dmg` | 466807449 bytes | `2e238280f6fd088328f2cd716e3b10e7a4a6aba0b7f4b587b20824dc7e7fbbb0` |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-latest-personal-integration/autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.4.56.zip` | 461539735 bytes | `cb373d261d4fd9819e69da175d5fbe9631cf727c9bff50796224630a857ef30e` |

Unpacked app: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-latest-personal-integration/autobyteus-web/electron-dist/mac-arm64/AutoByteus.app`.

Electron output is ignored by Git. To test on another machine, transfer the DMG/ZIP separately or rebuild from the ticket branch.

## Package Verification

- Bundle metadata: Pass — `com.autobyteus.app`, version/build 1.4.56, minimum macOS 12.0.
- Architecture: Pass — ARM64 application and ARM64 node-pty.
- Terminal runtime: Pass — official packaged verifier and real node-pty spawn probe.
- Current framework owners: Pass — Studio/standalone roots, runtime/launch owners, engine controller/launcher, exact target authorization/binding launch, stream projector, `publish_artifacts`, scoped Agent Tools, immutable physical scope, execution-tree locator, and memory migration are packaged.
- Retired owners: Pass — broad engine host and legacy execution-resource configuration owners remain absent.
- Latest Personal dependencies: Pass — current-model, provider-error, pricing, and terminal-cwd owners are packaged.
- Token analytics: Pass — current owners and additive Prisma migration are packaged.
- DMG/ZIP integrity: Pass.
- Process/mount hygiene: Pass — test app not left running and test DMG not mounted.
- Signing: expected unsigned local posture; not release-signing evidence.

Evidence: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-latest-personal-integration/tickets/in-progress/universal-application-framework-latest-personal-integration/evidence/delivery/dr-007-electron-macos-arm64-verification.log`.

## Packaged Electron Isolation

The documented five-scenario probe passed:

1. same-artifact coexistence, isolated paths, and caller-root retention;
2. renderer GraphQL/WebSocket/provider settings/updater behavior against the selected endpoint;
3. two simultaneous instances with distinct ports, roots, user data, and renderer state;
4. fail-closed invalid/partial launch profiles; and
5. allocation-race cleanup that preserves the foreign listener.

All nine cleanup observations passed. The ordinary installed AutoByteus process retained PID `80716`, the same fingerprint, and HTTP 200 health before and after the probe.

Evidence:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-latest-personal-integration/tickets/in-progress/universal-application-framework-latest-personal-integration/evidence/delivery/dr-007-electron-isolation.log`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-latest-personal-integration/tickets/in-progress/universal-application-framework-latest-personal-integration/evidence/delivery/dr-007-electron-isolation/electron-launch-profile-evidence.json`

## Broader Runtime Evidence

`API-REV-008` is direct evidence for the reviewed semantic merge. It passed the nested historical migration/restart and memory-sync boundary, provider-granular readiness, authenticated Socratic/Brief standalone and Studio journeys, publication/named handoff/projection, remount/recovery, route separation, exact 73/73 package parity, and cleanup. DR-007 adds the newest prototype-placement base commits plus a fresh full package and isolation boundary.

Historical `APIE2E-REPO-005` remains separate unattributed repository-suite debt and is not used as Pass evidence.

## Persisted Data / Manual Test Caution

This package includes the registered Team Agent memory-layout app-data migration for old flat nested memory and the earlier additive token analytics Prisma migration. The newest two Personal prototype commits add no migration. The automated Electron probe used isolated roots and did not touch the ordinary app data root. A normal manual Electron launch uses `~/.autobyteus/server-data` and can execute pending migrations through the standard startup runner.

## Manual Verification

1. Quit the ordinary AutoByteus app before testing the normal data root.
2. Open the exact DR-007 DMG. Because it is unsigned, macOS may require Control-click → Open.
3. Confirm existing data/provider settings and nested team history/memory load correctly.
4. Exercise Brief Studio and Socratic Math Teacher, including run, handoff/publication, projection, restart, and remount.
5. Reply with explicit approval/completion or a concrete issue.

## Release Boundary

This is an unsigned, unnotarized, unpublished local test artifact. No final ticket-branch push, Personal merge/push, tag, hosted release, deployment, archive, or worktree cleanup occurred.
