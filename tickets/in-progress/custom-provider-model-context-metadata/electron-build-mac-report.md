# Electron macOS Build Report — DR-009

## Request And Documentation Basis

- User request: refresh from the updated `origin/personal` and rebuild Electron.
- Repository guidance reread: root `README.md`; `autobyteus-web/README.md` Desktop Application, macOS Build With Logs (No Notarization), integrated backend, and embedded runtime sections; `autobyteus-web/AGENTS.md`; `autobyteus-web/docs/electron_packaging.md`.
- Selected method: repository-standard local macOS arm64 Electron build with the integrated Node server, verbose documented logging posture, and no Developer ID/notarization.
- Host: Darwin 25.5.0 arm64.
- Node: v22.23.1.
- pnpm: 10.28.2 at preflight; the build used workspace pnpm 10.28.1 for an internal install step.
- Package version: 1.4.46.
- Electron: 42.4.1.
- Built branch/HEAD: `codex/custom-provider-model-context-metadata@331ff94da3c2c9a2a07e11efff68f5307a4cfabb`.
- Integrated base: `origin/personal@37660dd61347b630889a698769af5641566357bb` (`v1.4.46`).

## Pre-Build Integrated State

The mandatory refresh found the ticket branch ahead 15 / behind 18 from the former merge base. Delivery protected the DR-008 handoff as local checkpoint `761442929910a91bb7a9d3a3baa7644eef1b994a`, then merged the latest tracked base without conflict as `331ff94da3c2c9a2a07e11efff68f5307a4cfabb`. The integrated branch was ahead 17 / behind 0.

The incoming base contains the finalized background-agent renderer/contention, streaming cadence, history/navigation, UI, test, documentation, and v1.4.46 release changes. `autobyteus-web/docs/settings.md` and `autobyteus-web/docs/agent_execution_architecture.md` auto-merged without conflict and retained this ticket's provider and Token Meter truth.

## Build Command

    NO_TIMESTAMP=1 APPLE_TEAM_ID= DEBUG=electron-builder,electron-builder:* DEBUG=app-builder-lib* DEBUG=builder-util* corepack pnpm -C autobyteus-web build:electron:mac

This is the README's local macOS no-notarization path. The script includes boundary/localization guards, server/shared builds, Prisma generation, sanitized bootstrap, mobile and Electron Nuxt generation, Electron/build TypeScript, integrated-server deployment, native Electron module rebuild, packaging, and blockmap generation.

## Result

- Build: Pass, exit 0.
- Started: 2026-08-10T10:15:01Z.
- Completed: 2026-08-10T10:19:18Z.
- Architecture: macOS arm64.
- Flavor: enterprise.
- App version/build: 1.4.46 / 1.4.46.
- Build log: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/electron-build-mac-dr-009.log`.
- Non-release signing posture: electron-builder used `identity=null` and skipped Developer ID signing. The root executable reports an ad-hoc linker signature, no team identifier, and the package was not notarized.
- Log note: a delivery-only preamble version probe was malformed and printed an empty metadata value; the actual package script, package manifest, build output, artifact names, and app plist independently confirm 1.4.46. It did not affect the build command or result.

## Testable Artifacts

| Artifact | Bytes | SHA-256 | Use |
| --- | ---: | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/autobyteus-web/electron-dist/AutoByteus_enterprise_macos-arm64-1.4.46.dmg` | 402168863 | `d01a4fc54a665a65cf0ea6c0c6d863bb3ba322ea9f674b84ac06e6fb34a92d0a` | Recommended installer image. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/autobyteus-web/electron-dist/AutoByteus_enterprise_macos-arm64-1.4.46.zip` | 397901174 | `ff954fa0dfb1fb981ef23edfda92765989cb01f25c95a8379bfa484a5c280d78` | Portable archive alternative. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/autobyteus-web/electron-dist/mac-arm64/AutoByteus.app` | Directory bundle | N/A | Direct local app bundle. |

The current artifact is version 1.4.46. DR-008's 1.4.45 package is historical and is not the latest-base test package.

## Artifact Verification

- `hdiutil verify`: Pass / valid DMG checksum.
- `unzip -t`: Pass / no compressed-data errors.
- App executable: Mach-O 64-bit arm64.
- Packaged target and selected Darwin arm64 node-pty helpers: Pass.
- Real packaged node-pty spawn probe: Pass.
- App version/build plist: 1.4.46 / 1.4.46.
- Packaged built-server byte identity: Pass for AppConfig environment assignment, readable custom-provider migration, custom-provider V3 store, and the incoming base's agent-stream egress control.
- Packaged readable migration/startup gate scan: Pass.
- Verification log: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/electron-build-mac-dr-009-verification.log`.
- Packaged-source log: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/electron-build-mac-dr-009-packaged-source.log`.

## Testing Notes

1. Open the DMG and copy `AutoByteus.app`, or use the direct app bundle.
2. Because this local build has no Developer ID signature/notarization, macOS may require right-click **Open** or approval in Privacy & Security.
3. The embedded server uses `http://127.0.0.1:29695`.
4. The packaged app uses `~/.autobyteus/server-data`. Back up that directory before testing if existing state matters.
5. On first startup with legacy custom providers, the approved transition resets providers and credentials. Recreate desired custom providers with the same name, Base URL, and a newly entered key.
6. Missing migrated selectors should remain visible as unavailable and block rather than silently falling back.
7. Qwen Settings should retain the paired Base URL/key flow and exact catalog behavior.
8. This build also contains the v1.4.46 background-agent renderer/contention and navigation improvements from the refreshed base.

Delivery did not launch the app and did not mutate user application data. Do not send credentials in the verification response.

## Known Non-Blocking Diagnostics

- Browserslist/caniuse age and large Vite chunk warnings.
- pnpm peer/deprecated/ignored-build-script diagnostics during deployment.
- electron-builder optional/unresolved dependency and icon path-resolution diagnostics.
- These did not fail guards, shared/server builds, Prisma/bootstrap, packaging, DMG/ZIP integrity, native helper checks, spawn probe, or packaged source identity.

## Delivery State

This is a local verification build, not a release action by this ticket. No ticket archive, branch push, target merge, tag, publication, deployment, or cleanup occurred. Explicit user verification remains required.
