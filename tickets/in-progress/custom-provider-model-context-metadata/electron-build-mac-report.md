# Electron macOS Build Report — DR-008

## Request And Documentation Basis

- User request: read the README and build Electron again for hands-on testing.
- Repository guidance read: root `README.md`; `autobyteus-web/README.md` Desktop Application, macOS Build With Logs (No Notarization), integrated backend, and embedded runtime sections; `autobyteus-web/AGENTS.md`; `autobyteus-web/docs/electron_packaging.md`.
- Selected method: repository-standard local macOS arm64 Electron build with the integrated Node server, verbose documented logging posture, and no Developer ID/notarization.
- Host: Darwin 25.5.0 arm64.
- Node: v22.23.1.
- pnpm: 10.28.2 at preflight; the build may use the workspace-pinned pnpm during internal install steps.
- Package version: 1.4.45.
- Electron: 42.4.1.
- Built branch/HEAD: `codex/custom-provider-model-context-metadata@eae34fd70ce7ae7d393dcc70ef3eb8d60328eb6e`.
- Integrated base: `origin/personal@3cddeec6b93602da172fec2e7b9a80acc7c05117`.

## Pre-Build Integrated State

The mandatory fresh delivery fetch found the tracked base unchanged and already an ancestor of the protected candidate: ahead 15 / behind 0 after checkpoint `eae34fd70ce7ae7d393dcc70ef3eb8d60328eb6e`. That checkpoint protects the DR-007 verified handoff state; it is a local safety checkpoint, not repository finalization. No base commit or production source changed, so no merge or additional source/API reroute was required before rebuilding.

Current authorization remains CRR-016 Pass at 9.40/10, API-REV-008 Pass at 96.9%, and CRR-017 Not Applicable. A post-build fetch again retained the same base and ancestor relationship.

## Build Command

    NO_TIMESTAMP=1 APPLE_TEAM_ID= DEBUG=electron-builder,electron-builder:* DEBUG=app-builder-lib* DEBUG=builder-util* corepack pnpm -C autobyteus-web build:electron:mac

This is the README's local macOS no-notarization path. The script includes boundary/localization guards, server/shared builds, Prisma generation, sanitized bootstrap, mobile and Electron Nuxt generation, Electron/build TypeScript, integrated-server deployment, native Electron module rebuild, packaging, and blockmap generation.

## Result

- Build: Pass, exit 0.
- Started: 2026-08-10T08:38:02Z.
- Completed: 2026-08-10T08:41:52Z.
- Architecture: macOS arm64.
- Flavor: enterprise.
- App version/build: 1.4.45 / 1.4.45.
- Build log: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/electron-build-mac-dr-008.log`.
- Non-release signing posture: electron-builder used `identity=null` and skipped Developer ID signing. The root executable reports an ad-hoc linker signature, no team identifier, and the package was not notarized.

## Testable Artifacts

| Artifact | Bytes | SHA-256 | Use |
| --- | ---: | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/autobyteus-web/electron-dist/AutoByteus_enterprise_macos-arm64-1.4.45.dmg` | 402321702 | `6046edba3d4f8e88cd68c9c82f2a4d6e77413f95a6c23fd3e158c95e8bf5edb9` | Recommended installer image. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/autobyteus-web/electron-dist/AutoByteus_enterprise_macos-arm64-1.4.45.zip` | 397887508 | `36a28d8d17d7d573f663d320a501b82fdcac7f7f609388cde773cee952847a34` | Portable archive alternative. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/autobyteus-web/electron-dist/mac-arm64/AutoByteus.app` | Directory bundle | N/A | Direct local app bundle. |

The rebuild overwrote the same 1.4.45 filenames. DR-007 checksums are superseded; use only the DR-008 values above.

## Artifact Verification

- `hdiutil verify`: Pass / valid DMG checksum.
- `unzip -t`: Pass / no compressed-data errors.
- App executable: Mach-O 64-bit arm64.
- Packaged target and selected Darwin arm64 node-pty helpers: Pass.
- Real packaged node-pty spawn probe: Pass.
- App version/build plist: 1.4.45 / 1.4.45.
- Packaged built-server byte identity: Pass for `environment-assignment-file.js`, `custom-provider-readable-id-app-data-migration.js`, and `custom-llm-provider-store.js` against the just-built server dist.
- Packaged readable migration/startup gate scan: Pass.
- Verification log: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/electron-build-mac-dr-008-verification.log`.
- Packaged-source log: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/electron-build-mac-dr-008-packaged-source.log`.

## Testing Notes

1. Open the DMG and copy `AutoByteus.app`, or use the direct app bundle.
2. Because this local build has no Developer ID signature/notarization, macOS may require right-click **Open** or approval in Privacy & Security.
3. The embedded server uses `http://127.0.0.1:29695`.
4. The packaged app uses `~/.autobyteus/server-data`. Back up that directory before testing if existing state matters.
5. On first startup with legacy custom providers, the approved transition resets providers and credentials. Recreate desired custom providers with the same name, Base URL, and a newly entered key.
6. A same canonical provider name should produce a readable ID such as `provider_alibaba_cloud` and reconnect exact migrated selectors only when the same model suffix is advertised.
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
