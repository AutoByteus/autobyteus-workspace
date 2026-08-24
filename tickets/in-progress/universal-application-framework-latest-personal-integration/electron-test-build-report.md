# Electron Test Build Report

## Current Result

**DR-005 Pass.** The conflict-resolved Universal Application Framework branch is based on the newest tracked `origin/personal`, and a fresh Personal macOS ARM64 Electron 1.4.55 package has been built and verified for user testing.

This package supersedes every DR-001–DR-003 Electron artifact. DR-004 produced no package.

## Documentation Followed

- Root `README.md`: packaged Electron API/E2E and desktop release/runtime boundaries.
- `autobyteus-web/README.md`: `build:electron:mac`, integrated server preparation, `electron-dist` output, and no-notarization local build guidance.
- `autobyteus-web/docs/electron_packaging.md`: bundled-server ownership, native terminal verification, packaged isolation, artifact naming, and signing policy.

## Integrated Source

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-latest-personal-integration`
- Branch: `codex/universal-application-framework-latest-personal-integration`
- Conflict-resolution merge: `5cf9b8eb22a3b83c114dbb4199341a65aaee8cea`
- Merge parents: protected ticket checkpoint `663f44d31deb05bf47f0eda780de4d754187a51b` and Personal `7edfb162559ec5a6eb4c00c23a929920eabe3dc1`
- Source review: `CRR-012` Pass / 94
- API/E2E: `API-REV-007` Pass / 98; every applicable category at least 95%
- Durable-test review: `CRR-013` Pass
- Delivery safety checkpoint: `a2756b28d7e72ec49acca0753194eeb1775c11de`
- Latest fetched base before build: `origin/personal@7edfb162559ec5a6eb4c00c23a929920eabe3dc1`
- Divergence: 144 ahead / 0 behind
- Post-build re-fetch: base unchanged and remains an ancestor of the ticket branch

Evidence:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-latest-personal-integration/tickets/in-progress/universal-application-framework-latest-personal-integration/evidence/delivery/dr-005-base-refresh-and-integration.log`

## Build Context

- Host: macOS Darwin ARM64
- Node.js: v22.23.1
- pnpm: 10.28.1 during delivery build
- Electron: 42.4.1
- Desktop version: 1.4.55
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

Pass.

The complete documented pipeline passed web/localization guards, shared/server builds, Prisma generation, built-in-agent bootstrap smoke, mobile/Electron generation, deployed-server preparation, Electron-ABI native rebuild, terminal-helper normalization, and app/DMG/ZIP packaging.

Non-blocking warnings were limited to existing module-type, browserslist-age, chunk-size, legacy pnpm deploy, deprecated/peer-dependency, and electron-builder dependency guidance.

Evidence:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-latest-personal-integration/tickets/in-progress/universal-application-framework-latest-personal-integration/evidence/delivery/dr-005-electron-macos-arm64-build.log`

## Current Test Artifacts

| Artifact | Size | SHA-256 |
| --- | ---: | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-latest-personal-integration/autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.4.55.dmg` | 466868232 bytes | `3dff6c644b46ce7603f5e64ca32a9283dc1328f4912d93a16f9674e4ea411562` |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-latest-personal-integration/autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.4.55.zip` | 461512085 bytes | `f2d9c3bfe6f8b53f59a7fbf7e82bc81394c07cbd8ab192202e97d6d4b771c0b0` |

Unpacked application:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-latest-personal-integration/autobyteus-web/electron-dist/mac-arm64/AutoByteus.app`

Electron output is ignored by Git. Another machine must build locally unless the DMG or ZIP is transferred separately.

## Package Verification

- Metadata: Pass — `com.autobyteus.app`, version/build 1.4.55, minimum macOS 12.0.
- Architecture: Pass — ARM64 app and ARM64 node-pty.
- Terminal runtime: Pass — official verifier plus real packaged node-pty spawn probe.
- Current application framework: Pass — Studio/standalone composition roots, standalone host, runtime/launch owners, engine controller/launcher, target authorization, binding launch, stream projection, `publish_artifacts`, and scoped Agent Tools are packaged.
- Retired owners: absent — broad engine host and both deleted execution-resource configuration owners were not resurrected.
- Latest Personal provider/model behavior: packaged — current-model selection error, provider error, pricing schedule, and external terminal cwd owners are present.
- Token analytics: packaged — provider, repository, GraphQL type, and additive `20260822090000_add_token_usage_analytics` migration are present.
- DMG and ZIP integrity: Pass.
- Process/mount hygiene: Pass — rebuilt app not left running and DMG not mounted.
- Signing: expected local unsigned posture; this is not release-signing evidence.

Evidence:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-latest-personal-integration/tickets/in-progress/universal-application-framework-latest-personal-integration/evidence/delivery/dr-005-electron-macos-arm64-verification.log`

## Packaged Electron Isolation

All five documented scenarios passed against the rebuilt 1.4.55 application:

1. same-artifact coexistence, isolated paths, and caller-root retention;
2. renderer GraphQL/WebSocket/provider-settings/updater journey on the selected endpoint;
3. two simultaneous instances with distinct ports, roots, user data, and renderer state;
4. fail-closed invalid and partial launch profiles; and
5. allocation-race cleanup that preserves the foreign listener.

The ordinary installed AutoByteus process retained the same PID/fingerprint and health before and after the probe. All owned process groups, ports, and roots were cleaned.

Evidence:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-latest-personal-integration/tickets/in-progress/universal-application-framework-latest-personal-integration/evidence/delivery/dr-005-electron-isolation.log`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-latest-personal-integration/tickets/in-progress/universal-application-framework-latest-personal-integration/evidence/delivery/dr-005-electron-isolation/electron-launch-profile-evidence.json`

## Broader Runtime Evidence

`API-REV-007` is direct evidence for the current conflict-resolved source. It passed current-model reconciliation, provider error projection, real Brief and Socratic runs in standalone and Studio, named handoff and publication, projection/remount/recovery, route separation, 73/73 package-source parity, and cleanup. The Electron build and isolation probe above add the delivery-owned packaged desktop boundary.

Historical `APIE2E-REPO-005` remains separate, unattributed repository-suite debt and is not used as Pass evidence.

## Persisted Data

The newest conflict-resolution delta is **Directly Usable — No Migration**. It adds no physical schema migration, compatibility read/write path, rewrite, or package migration.

The integrated Personal history still contains the previously recorded additive migration:

- `autobyteus-server-ts/prisma/migrations/20260822090000_add_token_usage_analytics/migration.sql`

That base-owned migration creates analytics coverage/daily-facet tables and indexes without rewriting existing lifetime run records. It may already be applied on an existing 1.4.55-compatible data root.

## Manual Verification

1. Quit any ordinary AutoByteus window if testing against the normal data root.
2. Open the DR-005 1.4.55 DMG. Because it is unsigned, macOS may require Control-click → Open.
3. Confirm existing data and provider settings load.
4. Exercise Brief Studio and Socratic Math Teacher, including a real run, handoff/publication, projection, and restart/remount.
5. Confirm a removed AutoByteus model is rejected while current AutoByteus and external Codex/Claude selections remain usable.
6. Reply with explicit approval/completion or a concrete issue.

## Release Boundary

This is an unsigned, unnotarized, unpublished local test artifact. No final push, Personal merge/push, tag, hosted release, deployment, archive, or worktree cleanup occurred.
