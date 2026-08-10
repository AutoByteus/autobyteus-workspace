# Electron macOS Build Report — DR-007

## Request And Documentation Basis

- User request: read the README and build Electron for hands-on testing.
- Repository guidance read: root README.md; autobyteus-web/README.md Desktop Application, macOS Build With Logs (No Notarization), integrated backend, and embedded runtime sections; autobyteus-web/AGENTS.md; autobyteus-web/docs/electron_packaging.md.
- Selected method: repository-standard local macOS arm64 Electron build with the integrated Node server, verbose documented logging posture, and no Developer ID/notarization.
- Host: Darwin 25.5.0 arm64.
- Node: v22.23.1.
- pnpm: 10.28.2 at preflight; the build reported workspace pnpm 10.28.1 for an internal install step.
- Package version: 1.4.45.
- Electron: 42.4.1.
- Built branch/HEAD: codex/custom-provider-model-context-metadata@7f02e49f6897b3c2715d2c7e2fb712a424514f82.
- Integrated base: origin/personal@3cddeec6b93602da172fec2e7b9a80acc7c05117.

## Pre-Build Integrated State

The mandatory delivery fetch found the branch already ahead 13 / behind 0. Current base 3cddeec6b93602da172fec2e7b9a80acc7c05117 is the second parent of reviewed implementation merge ea8dbfd2d4f78312806bee7a41f38daa6a0e9a06. Delivery protected the API-REV-008-reviewed merge plus IR-012 correction and evidence as local checkpoint 7f02e49f6897b3c2715d2c7e2fb712a424514f82, leaving the branch ahead 14 / behind 0.

API-REV-008 had independently re-established integrated AppConfig/Qwen/readable-ID/metadata/frontend confidence at 96.9%. No repository-resident durable coverage changed after CRR-014, so CRR-017 was Not Applicable.

## Build Command

    NO_TIMESTAMP=1 APPLE_TEAM_ID= DEBUG=electron-builder,electron-builder:* DEBUG=app-builder-lib* DEBUG=builder-util* corepack pnpm -C autobyteus-web build:electron:mac

This is the README's local macOS no-notarization path. The script includes boundary/localization guards, server/shared builds, Prisma generation, sanitized bootstrap, mobile and Electron Nuxt generation, Electron/build TypeScript, integrated-server deployment, native Electron module rebuild, packaging, and blockmap generation.

## Result

- Build: Pass, exit 0.
- Started: 2026-08-09T18:53:58Z.
- Completed: 2026-08-09T18:58:06Z.
- Architecture: macOS arm64.
- Flavor: enterprise.
- App version/build: 1.4.45 / 1.4.45.
- Build log: /Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/electron-build-mac-dr-007.log.
- Non-release signing posture: electron-builder used identity=null and skipped Developer ID signing. The root executable reports only an ad-hoc linker signature, no team identifier, and the package was not notarized.

## Testable Artifacts

| Artifact | Bytes | SHA-256 | Use |
| --- | ---: | --- | --- |
| /Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/autobyteus-web/electron-dist/AutoByteus_enterprise_macos-arm64-1.4.45.dmg | 402361061 | afbe2e992e082a00a79095f7d589c9219ea8c522594df9cb393a50ff78f1e5d6 | Recommended installer image. |
| /Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/autobyteus-web/electron-dist/AutoByteus_enterprise_macos-arm64-1.4.45.zip | 397887527 | 5f53b1e8e0e4cc80f8bb13ca73d2ded5080589005b5c5b470eb31dd730f91eaf | Portable archive alternative. |
| /Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/autobyteus-web/electron-dist/mac-arm64/AutoByteus.app | Directory bundle | N/A | Direct local app bundle. |

The same filenames existed in DR-005, but this DR-007 build overwrote them. Use the DR-007 checksums above; the old DR-005 checksums are no longer current.

## Artifact Verification

- hdiutil DMG checksum: Pass / valid.
- ZIP compressed-data integrity: Pass / no errors.
- App executable: Mach-O 64-bit arm64.
- Packaged target and selected Darwin arm64 node-pty helpers: Pass.
- Real packaged node-pty spawn probe: Pass.
- App version/build plist: 1.4.45 / 1.4.45.
- Packaged built-server byte identity: Pass for environment-assignment-file.js, custom-provider-readable-id-app-data-migration.js, and custom-llm-provider-store.js against the just-built server dist.
- Packaged readable migration/startup gate scan: Pass.
- Verification log: /Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/electron-build-mac-dr-007-verification.log.
- Packaged-source log: /Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/electron-build-mac-dr-007-packaged-source.log.

## Testing Notes

1. Open the DMG and copy AutoByteus.app, or use the direct app bundle.
2. Because this local build has no Developer ID signature/notarization, macOS may require right-click Open or approval in Privacy & Security.
3. The embedded server uses http://127.0.0.1:29695.
4. The packaged app uses ~/.autobyteus/server-data. Back up that directory before testing if existing state matters.
5. On first startup with legacy custom providers, the approved transition resets providers and credentials. Be prepared to recreate desired custom providers with the same name, Base URL, and a newly entered key.
6. A same canonical provider name should produce a readable ID such as provider_alibaba_cloud and reconnect exact migrated selectors only when the same model suffix is advertised.
7. Missing migrated selectors should remain visible as unavailable and block rather than silently falling back.
8. Qwen Settings should retain the current paired Base URL/key flow and exact catalog behavior.

Delivery did not launch the app and did not mutate user application data. Do not send credentials in the verification response.

## Known Non-Blocking Diagnostics

- Browserslist/caniuse age warning and large Vite chunk warnings.
- pnpm peer/deprecated/ignored-build-script diagnostics during deployment.
- electron-builder optional/unresolved dependency and icon path-resolution diagnostics.
- These did not fail guards, shared/server builds, Prisma/bootstrap, packaging, DMG/ZIP integrity, native helper checks, spawn probe, or packaged source identity.

## Delivery State

This is a local verification build, not a release. No ticket archive, branch push, target merge, tag, publication, deployment, or cleanup occurred. Explicit user verification remains required.
