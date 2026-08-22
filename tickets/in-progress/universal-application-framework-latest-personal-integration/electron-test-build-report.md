# Electron Test Build Report

## Purpose

Build and validate a local macOS ARM64 Electron package from the review-passed latest-Personal integration for explicit user testing, then record the API-REV-006 actual credentialed Classroom Simulation Team journey against that exact artifact.

## Documentation Followed

- Root README.md: desktop runtime/release boundary.
- autobyteus-web/README.md: build:electron:mac, integrated backend preparation, electron-dist output, and no-notarization guidance.
- autobyteus-web/docs/electron_packaging.md: Electron 42 baseline, bundled server ownership, ARM64/node-pty validation, packaged E2E profile isolation, artifact naming, and signing policy.

## Build Context

- Worktree: /Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-latest-personal-integration
- Branch: codex/universal-application-framework-latest-personal-integration
- Built checkpoint: 42496b808df16f4ed24ca66bac03372c578f1f89
- Latest base included: origin/personal at 8ef282ba77705180d985e7000d801f0e0068cdc1
- Implementation: IR-006; production source b3ddefe1a079e1bc52eb36688595462861b7415a
- Gates: CRR-009 Pass / 93, API-REV-004 Pass / 98, CRR-010 Pass, API-REV-006 Pass / 99, CRR-011 Not Applicable
- Host: macOS Darwin ARM64
- Node.js: v22.23.1
- pnpm: 10.28.2
- Electron: 42.4.1
- Desktop version: 1.4.54
- Flavor: personal
- Signing/notarization: disabled; unsigned local package

## Integrated-State Refresh

Delivery fetched origin/personal before docs or packaging work. It remains exactly 8ef282ba77705180d985e7000d801f0e0068cdc1, the already-integrated bootstrap base. Checkpoint/base divergence is 135/0 and the base is an ancestor, so no merge was required.

The base did not advance, so a redundant server/API matrix rerun was unnecessary. API-REV-004 executed the integrated source, CRR-010 approved the durable delta, and delivery ran the complete Electron build, package validation, and isolation gates.

DR-002 fetched origin/personal again after API-REV-006/CRR-011 and confirmed it remains unchanged. API-REV-006 used the same built source and package; no source or durable test path changed.

Evidence:

- /Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-latest-personal-integration/tickets/in-progress/universal-application-framework-latest-personal-integration/evidence/delivery/dr-001-base-refresh-and-integration.log
- /Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-latest-personal-integration/tickets/in-progress/universal-application-framework-latest-personal-integration/evidence/delivery/dr-002-base-refresh-and-integration.log

## Build Command

    CI=true     NO_TIMESTAMP=1     APPLE_TEAM_ID=     APPLE_SIGNING_IDENTITY=     APPLE_ID=     APPLE_APP_SPECIFIC_PASSWORD=     CSC_IDENTITY_AUTO_DISCOVERY=false     AUTOBYTEUS_BUILD_FLAVOR=personal     pnpm -C autobyteus-web build:electron:mac -- --arm64

## Build Result

Pass.

The pipeline passed web/localization guards, shared/server builds, Prisma generation, built-in-agent bootstrap smoke, Electron generation/transpilation, deployed-server preparation, Electron-ABI native dependency rebuild, helper permission normalization, and app/DMG/ZIP packaging.

Non-blocking output concerned module-type guidance, browserslist age, chunk sizes, legacy pnpm deploy behavior, deprecated/peer dependencies, and electron-builder dependency guidance.

Build evidence:

- /Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-latest-personal-integration/tickets/in-progress/universal-application-framework-latest-personal-integration/evidence/delivery/dr-001-electron-macos-arm64-build.log

## Test Artifacts

| Artifact | Size | SHA-256 |
| --- | ---: | --- |
| /Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-latest-personal-integration/autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.4.54.dmg | 466693593 bytes | 2894013e642ac6bd0b3249fa7bc3c73fb9ded5a29012c5d4bbea0f81174513dd |
| /Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-latest-personal-integration/autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.4.54.zip | 461339684 bytes | 0744be0070fa2c10b07eeb39f2c471b6d75ef3e3a0f58d0ff1b073d6952a94b3 |

Unpacked app:

- /Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-latest-personal-integration/autobyteus-web/electron-dist/mac-arm64/AutoByteus.app

These ignored artifacts are local and will not be transferred by Git; another machine must rebuild from source.

## Package Validation

- Metadata: Pass — AutoByteus, com.autobyteus.app, version/build 1.4.54, minimum macOS 12.0.
- Architecture: Pass — ARM64 app and ARM64 node-pty native module.
- Terminal runtime: Pass — official verifier and real node-pty spawn probe.
- Current application framework: Pass — both assembly roots, standalone host, four projections, engine controller/launcher, target authorization, binding launch, publish_artifacts, and scoped Agent Tools session manager are packaged.
- Retired broad engine host: absent.
- DMG and ZIP integrity: Pass.
- Process/mount hygiene: Pass — built app not left running; test DMG not mounted.
- Signing: informational — strict codesign fails as expected for an unsigned local package; this is not release-signing proof.

Evidence:

- /Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-latest-personal-integration/tickets/in-progress/universal-application-framework-latest-personal-integration/evidence/delivery/dr-001-electron-macos-arm64-verification.log

## Packaged Electron Isolation Probe

Command:

    env -u ELECTRON_RUN_AS_NODE     pnpm -C autobyteus-web test:e2e:electron:isolation       --skip-build       --executable /Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-latest-personal-integration/autobyteus-web/electron-dist/mac-arm64/AutoByteus.app/Contents/MacOS/AutoByteus       --output-dir /Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-latest-personal-integration/tickets/in-progress/universal-application-framework-latest-personal-integration/evidence/delivery/dr-001-electron-isolation

Pass. All five scenarios passed:

1. same-artifact coexistence, isolated paths, and caller-root retention;
2. real renderer GraphQL/WebSocket/provider-settings journey on the selected endpoint;
3. two simultaneous instances with distinct ports, roots, and renderer state;
4. fail-closed invalid/partial profiles; and
5. allocation-race cleanup that preserves a foreign listener.

The ordinary installed AutoByteus process remained healthy with the same identity before, during, and after. Owned test process groups, ports, and roots were cleaned; controlled sentinels were unchanged.

Evidence:

- /Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-latest-personal-integration/tickets/in-progress/universal-application-framework-latest-personal-integration/evidence/delivery/dr-001-electron-isolation.log
- /Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-latest-personal-integration/tickets/in-progress/universal-application-framework-latest-personal-integration/evidence/delivery/dr-001-electron-isolation/electron-launch-profile-evidence.json

## Actual Credentialed Classroom Journey — API-REV-006

Pass / 99% for the added live-provider journey.

API-REV-006 reused the exact packaged app recorded above at source checkpoint 42496b808df16f4ed24ca66bac03372c578f1f89. A fresh isolated packaged Electron instance imported the external agent package through Settings and imported nine credential assignments through the supported secrets:import workflow without printing secret values.

Classroom Simulation Team ran with:

- Professor: Codex App Server, gpt-5.6-luna;
- Student: AutoByteus runtime, deepseek-v4-flash.

The Professor created and delivered an assignment file to /student. The Student read it, wrote student-answer.md with the correct result 42, and delivered it to /professor. The Professor read and verified the answer, wrote file-backed feedback, and sent it to the Student; the Student read it, wrote an acknowledgement, and replied. Evidence correlates four recipient-name messages, sixteen tool calls, four workspace artifacts, provider traces, GraphQL/WebSocket traffic, a quiescent execution checkpoint, renderer state, and the final screenshot.

Isolation and security results:

- the prior DeepSeek balance blocker returned HTTP 200 and is resolved;
- no production source or durable test changed;
- API-REV-006 text evidence contains zero values from the owner credential source;
- the credential-bearing isolated root and temporary harnesses were removed;
- both owned ports were released;
- the ordinary AutoByteus process remained healthy and unchanged.

Primary evidence:

- /Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-latest-personal-integration/tickets/in-progress/universal-application-framework-latest-personal-integration/evidence/api-e2e/api-rev-006-electron-classroom.json
- /Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-latest-personal-integration/tickets/in-progress/universal-application-framework-latest-personal-integration/evidence/api-e2e/api-rev-006-electron-classroom-correlation.json
- /Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-latest-personal-integration/tickets/in-progress/universal-application-framework-latest-personal-integration/evidence/api-e2e/api-rev-006-electron-classroom-result.png
- /Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-latest-personal-integration/tickets/in-progress/universal-application-framework-latest-personal-integration/evidence/api-e2e/api-rev-006-cleanup-isolation.log
- /Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-latest-personal-integration/tickets/in-progress/universal-application-framework-latest-personal-integration/evidence/api-e2e/api-rev-006-secret-leak-scan.log

## Persisted Data

Approved outcome: Directly Usable — No Migration. IR-006 adds no persistence or binding schema change. The isolated package probe did not touch the ordinary data root.

A normal launch uses ~/.autobyteus/server-data. Quit the installed app first to avoid port/data contention, and back up that directory if the manual test must be independently reversible.

## Manual Verification

1. Quit any ordinary AutoByteus instance before a normal-data test.
2. Open the DMG. Since it is unsigned, macOS may require Control-click → Open.
3. Confirm existing Personal settings/data open normally.
4. Exercise Brief Studio and Socratic Math Teacher, including setup, a real run, named handoff/publication, projection, and restart/remount.
5. Reply with explicit approval/completion or a concrete issue.

## Release Boundary

This is an unsigned, unnotarized, unpublished, untagged local test artifact. API-REV-006 proves the exact local artifact through a real credentialed journey but does not convert it into a release. Ticket remains in progress; no final push, archive, Personal merge, release, deployment, or cleanup occurred.
