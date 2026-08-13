# Electron Test Build Report

## Purpose

Produce a local macOS ARM64 Electron package from the current v1.4.50-integrated Universal Application Dual-Host Foundation candidate for explicit user verification before repository finalization.

DR-010 supersedes the historical DR-008 v1.4.35 package. It follows successful SR-018 / ARCH-REV-016 design reconciliation, IR-022/IR-023 implementation, CRR-041 source review, API-REV-015 real dual-host execution, and CRR-042 proportional durable-test review.

## Documentation Followed

- Root `README.md`: pinned Electron runtime, native-module and packaged-runtime validation, and local-versus-release boundary.
- `autobyteus-web/README.md`: Desktop Application Build, personal macOS build, output locations, and integrated-backend packaging.
- `autobyteus-web/docs/electron_packaging.md`: bundled server architecture, ARM64/native `node-pty` preparation, package verification, and signing policy.

## Build Context

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis`
- Branch: `codex/universal-application-framework-proposal-analysis`
- Integrated candidate / delivery checkpoint: `939090de2a17f735b6b3e0844fb8563de6648ca1`
- CRR-042 reviewer anchor: `3dea6b7b800cabaa1f1c0f08e77627d3d621ab2f`
- Latest tracked base included: `origin/personal@54890a07f74e941a7a12b6daaa26364f4c927b72`
- Latest solution/design: `SR-018` / `ARCH-REV-016`
- Latest implementation: `IR-023`, retaining semantic integration `IR-022`
- Source/API/test gates: `CRR-041 Pass / 98`, `API-REV-015 Pass / 98.7%`, `CRR-042 Pass`
- Host: macOS Darwin ARM64
- Node.js: `v22.23.1`
- pnpm invocation: `10.28.2` (the build's workspace install reported pnpm `10.28.1`)
- Electron: `42.4.1`
- Desktop package version: `1.4.50`
- Build flavor: `personal`
- Signing/notarization: disabled for this local test package; the Electron executable retains only its inherited ad-hoc/linker signature.

## Integrated-State Refresh

Delivery fetched `origin/personal` immediately before documentation/build work and confirmed it remains exactly `54890a07f74e941a7a12b6daaa26364f4c927b72`, already integrated by IR-022. Candidate/base divergence is `110/0`; no base commit is missing and no new merge was required.

Evidence:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/done/universal-application-framework-proposal-analysis/evidence/delivery/dr-010-base-refresh-and-integration.log`

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

**Pass.**

The documented pipeline passed web/localization guards, shared/server builds, Prisma generation, built-in-agent bootstrap smoke, mobile/Electron generation, deployed-server preparation, Electron-ABI native rebuild, helper permission normalization, and app/DMG/ZIP packaging.

Non-blocking output included existing browsers-list age, chunk-size, module-type, legacy-deploy, deprecated dependency, peer-dependency, and electron-builder dependency guidance. None failed the build.

Build evidence:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/done/universal-application-framework-proposal-analysis/evidence/delivery/dr-010-electron-macos-arm64-build.log`

## Current Test Artifacts

| Artifact | Exact Size | SHA-256 |
| --- | ---: | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.4.50.dmg` | `405450020` bytes | `6df2b838b424b18776e6f72d99cbfd5ae346173aaaa18a9fa93a4bb191d802cd` |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.4.50.zip` | `401294119` bytes | `43c8f431f13289f0d79d53628d3c8c589d7bff2786c6b3e9bceefc7aaae921d9` |

Unpacked application:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/autobyteus-web/electron-dist/mac-arm64/AutoByteus.app`

Every prior v1.4.31–v1.4.35 verification package is superseded.

## Package Validation

- App metadata: **Pass** — executable `AutoByteus`, identifier `com.autobyteus.app`, version/build `1.4.50`, minimum macOS `12.0`.
- App/native architecture: **Pass** — ARM64 Electron executable, `pty.node`, and spawn helpers.
- Current application framework: **Pass** — Studio/standalone compositions, four-projection runtime, controller/launcher, Codex bootstrapper, and publication owner are packaged; retired broad host, bind-once, removed bootstrap strategy, and obsolete configured-exposure files are absent.
- Latest-base integration: **Pass** — packaged server contains the mandatory readable-provider migration gate and awaited publication-event path.
- IR-023 maintained package: **Pass** — regenerated Brief importable package contains the startup nullable-eligibility skip before strict application projection.
- Terminal runtime: **Pass** — official packaged-runtime verifier and real `node-pty` spawn probe pass.
- DMG/ZIP integrity: **Pass** — `hdiutil verify` and `unzip -tq` pass.
- Process/mount hygiene: **Pass** — the newly built app was not launched and the test DMG is not mounted. The user's separate `/Applications/AutoByteus.app` process was left untouched.
- Signing posture: **Informational** — strict codesign validation fails as expected for this unsigned/unnotarized local package; this is not release-signing evidence.

Validation evidence:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/done/universal-application-framework-proposal-analysis/evidence/delivery/dr-010-electron-macos-arm64-verification.log`

The initial local verification script used an incorrect generated Brief bundle path; the corrected canonical verification used `applications/brief-studio/dist/importable-package/applications/brief-studio/backend/dist/entry.mjs` and passed. This was a delivery-script path correction, not a package or product failure.

## Manual Verification Guidance

1. Quit any currently running installed AutoByteus before opening this build so port `29695` and the normal data directory are not contested.
2. Open the v1.4.50 DMG above. As it is unsigned, macOS may require **Control-click → Open**.
3. Back up `~/.autobyteus/server-data` if testing must not modify current local state.
4. Import/load the maintained Brief package, confirm the inherited/explicit model configuration remains visible and unavailable models block rather than disappear, then run a real researcher/writer Brief.
5. Confirm real `publish_artifacts`, recipient-name `send_message_to`, correct researcher/writer projection, and `in_review` state.
6. Restart Studio against the same data after a completed run, confirm readiness and one iframe remount, and verify an ineligible researcher-owned final path does not break catch-up.
7. Reply with explicit approval/completion or a concrete issue.

## Release Boundary

This is a local verification artifact only. It is unsigned, unnotarized, unpublished, and untagged by this ticket. The v1.4.50 base release is independent history. After the user reported that this package works, DR-011 archived and pushed only the ticket branch for another-machine testing. No merge or push to `personal`, hosted release, deployment, or branch/worktree cleanup was performed. The ignored DMG/ZIP are not part of the Git push and must be rebuilt on the second machine.
