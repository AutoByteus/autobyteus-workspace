# Electron Test Build Report

> DR-004 status (2026-08-23): **Blocked before rebuild.** The newest fetched `origin/personal` (`1629441a30dfce91d75b9bf7dcdd508b0f371bc5`) produces 11 merge-tree conflicts with the current ticket architecture. The package and hashes below are the superseded DR-003 candidate based on `d7d4eace46dc6534d50e9150c3e84d4bd41fedfb`; do not use them as proof of the newest-base request. See `latest-base-refresh-conflict-report.md`.

## Current Result

DR-003 Pass. The ticket branch now includes the newest tracked origin/personal and a fresh local macOS ARM64 Electron package. This report supersedes DR-001/DR-002 package identities.

## Documentation Followed

- Root README.md: desktop runtime/release boundary.
- autobyteus-web/README.md: build:electron:mac, integrated backend preparation, electron-dist output, and local no-notarization guidance.
- autobyteus-web/docs/electron_packaging.md: Electron baseline, bundled server ownership, native node-pty validation, packaged isolation, naming, and signing policy.

## Integrated Source

- Worktree: /Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-latest-personal-integration
- Branch: codex/universal-application-framework-latest-personal-integration
- DR-002 safety checkpoint: 0b607a5844f66e19ffb55162e91150a7383c030a
- Latest tracked base: origin/personal at d7d4eace46dc6534d50e9150c3e84d4bd41fedfb
- Integration method: merge, no textual conflicts
- Integrated merge: f8d0bf67a9cdb89da8e3cb24b8331744d9f61865
- Merge parents: 0b607a5844f66e19ffb55162e91150a7383c030a and d7d4eace46dc6534d50e9150c3e84d4bd41fedfb
- Post-merge divergence: 139 ahead / 0 behind
- Post-build refetch: origin/personal remained d7d4eace46dc6534d50e9150c3e84d4bd41fedfb

The new base is 18 commits beyond the prior 8ef282ba7 base. It brings finalized token-usage analytics and finalized absolute external terminal cwd support, including their tests, docs, GraphQL output, and additive Prisma migration.

Evidence:

- /Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-latest-personal-integration/tickets/in-progress/universal-application-framework-latest-personal-integration/evidence/delivery/dr-003-base-refresh-and-integration.log

## Build Context

- Host: macOS Darwin ARM64
- Node.js: v22.23.1
- pnpm: 10.28.2
- Electron: 42.4.1
- Desktop version: 1.4.54
- Flavor: personal
- Signing/notarization: disabled; unsigned local package

The version and filenames remain 1.4.54 even though the integrated source and hashes changed. Use the DR-003 hashes below to distinguish this package.

## Build Command

    CI=true     NO_TIMESTAMP=1     APPLE_TEAM_ID=     APPLE_SIGNING_IDENTITY=     APPLE_ID=     APPLE_APP_SPECIFIC_PASSWORD=     CSC_IDENTITY_AUTO_DISCOVERY=false     AUTOBYTEUS_BUILD_FLAVOR=personal     pnpm -C autobyteus-web build:electron:mac -- --arm64

## Build Result

Pass.

The complete pipeline passed web/localization guards, shared/server builds, Prisma generation, built-in-agent bootstrap smoke, mobile/Electron generation, deployed-server preparation, Electron-ABI native rebuild, terminal helper normalization, and app/DMG/ZIP packaging.

Non-blocking warnings remained limited to module-type guidance, browserslist age, chunk sizes, legacy pnpm deploy behavior, deprecated/peer dependencies, and electron-builder dependency guidance.

Evidence:

- /Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-latest-personal-integration/tickets/in-progress/universal-application-framework-latest-personal-integration/evidence/delivery/dr-003-electron-macos-arm64-build.log

## Current Test Artifacts

| Artifact | Size | SHA-256 |
| --- | ---: | --- |
| /Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-latest-personal-integration/autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.4.54.dmg | 466805857 bytes | 09ecfbe4b8fb45afdb1cb231fdc81d11d2cb17d145f6aba9be6f657542da7414 |
| /Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-latest-personal-integration/autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.4.54.zip | 461479841 bytes | 12f3a5e82d9071e47671c33f3360f1e3b969be42330added102c34f1ce88224c |

Unpacked application:

- /Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-latest-personal-integration/autobyteus-web/electron-dist/mac-arm64/AutoByteus.app

Prior DR-001/DR-002 hashes 2894013e... and 0744be00... are superseded. Electron output is ignored by Git; another machine must rebuild from source.

## Package Verification

- Metadata: Pass — AutoByteus, com.autobyteus.app, version/build 1.4.54, minimum macOS 12.0.
- Architecture: Pass — ARM64 app and ARM64 node-pty.
- Terminal runtime: Pass — official verifier and real node-pty spawn probe.
- Application framework: Pass — both assembly roots, standalone host, four projections, engine controller/launcher, target authorization, binding launch, publish_artifacts, and scoped Agent Tools session owner are packaged.
- Retired broad engine host: absent.
- Latest token analytics base: Pass — GraphQL type, provider, repository, and migration 20260822090000 are packaged.
- Latest absolute-cwd base: Pass — packaged autobyteus-ts contains the absolute cwd owner.
- DMG and ZIP integrity: Pass.
- Process/mount hygiene: Pass — rebuilt app not left running and DMG not mounted.
- Signing: expected local unsigned posture; not release-signing proof.

Evidence:

- /Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-latest-personal-integration/tickets/in-progress/universal-application-framework-latest-personal-integration/evidence/delivery/dr-003-electron-macos-arm64-verification.log

## Packaged Electron Isolation

The five-scenario packaged isolation probe passed against the rebuilt f8d0bf67 package:

1. same-artifact coexistence, isolated paths, and caller-root retention;
2. renderer GraphQL/WebSocket/provider-settings journey on the selected endpoint;
3. two simultaneous instances with distinct ports, roots, and renderer state;
4. fail-closed invalid/partial profiles; and
5. allocation-race cleanup preserving a foreign listener.

The ordinary installed AutoByteus process retained the same identity and health. Owned process groups, ports, and roots were cleaned.

Evidence:

- /Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-latest-personal-integration/tickets/in-progress/universal-application-framework-latest-personal-integration/evidence/delivery/dr-003-electron-isolation.log
- /Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-latest-personal-integration/tickets/in-progress/universal-application-framework-latest-personal-integration/evidence/delivery/dr-003-electron-isolation/electron-launch-profile-evidence.json

## Prior Credentialed Classroom Evidence

API-REV-006 remains valid evidence for the pre-refresh package at source checkpoint 42496b808. It proved the real Codex/Luna Professor and DeepSeek Flash Student journey, file-backed recipient messaging, correct 42 verdict, secret-value exclusion, and cleanup.

It is not direct proof of the newly rebuilt f8d0bf67 binary because origin/personal changed afterward. The new package has fresh full-build, package-integrity, and packaged-isolation proof and now requires user verification.

## Persisted Data

The application-framework ticket itself remains Directly Usable — No Migration. However, the newly integrated Personal base separately contains additive migration:

- autobyteus-server-ts/prisma/migrations/20260822090000_add_token_usage_analytics/migration.sql

It creates token_usage_analytics_coverage and token_usage_analytics_daily_facets plus indexes. The finalized base contract preserves existing lifetime token run records and does not backfill them into guessed historical periods.

A normal launch uses ~/.autobyteus/server-data and can apply this base-owned migration. Quit the installed app first and back up the data directory if the test must be independently reversible.

## Manual Verification

1. Quit the ordinary AutoByteus instance.
2. Open the DR-003 DMG. Since it is unsigned, macOS may require Control-click → Open.
3. Confirm existing data opens and the Token Statistics Runs/Analytics surfaces behave correctly.
4. Exercise Brief Studio and Socratic Math Teacher, including a real run, handoff/publication, projection, and restart/remount.
5. Optionally verify run_bash with an explicit existing absolute cwd outside the workspace.
6. Reply with explicit approval/completion or a concrete issue.

## Release Boundary

This is an unsigned, unnotarized, unpublished, untagged local test artifact. No final push, ticket archive, Personal merge/push, release, deployment, or cleanup occurred.
