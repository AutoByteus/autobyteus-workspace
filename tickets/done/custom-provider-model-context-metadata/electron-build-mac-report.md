# Electron macOS Build Report — DR-010

## Request And Documentation Basis

- Trigger: IR-013 corrected live Qwen presentation after the user's DR-009 feedback; CRR-019, API-REV-010, and CRR-020 authorized a new Electron package.
- Repository guidance reread: root `README.md`; `autobyteus-web/README.md` Desktop Application, macOS Build With Logs (No Notarization), integrated backend, and embedded runtime sections; `autobyteus-web/AGENTS.md`; `autobyteus-web/docs/electron_packaging.md`.
- Selected method: repository-standard local macOS arm64 Electron build with the integrated Node server, verbose documented logging posture, and no Developer ID/notarization.
- Host: Darwin 25.5.0 arm64.
- Node: v22.23.1.
- pnpm: 10.28.2 at preflight; the build used workspace pnpm 10.28.1 for an internal install step.
- Package version: 1.4.46.
- Electron: 42.4.1.
- Built branch/HEAD: `codex/custom-provider-model-context-metadata@1d5340d37332df794bf82f97b61e05421527c76b`.
- Integrated base: `origin/personal@37660dd61347b630889a698769af5641566357bb` (`v1.4.46`).

## Pre-Build Integrated State

The mandatory fetch found the exact tracked base unchanged and already an ancestor: ahead 17 / behind 0 before checkpointing. No base merge was required. Delivery protected the reviewed IR-013 source/tests and the current CRR/API evidence as local checkpoint `1d5340d37332df794bf82f97b61e05421527c76b`, leaving the branch ahead 18 / behind 0.

Current authorization is CRR-019 Pass at 9.44/10, API-REV-010 Pass at 97.3% with every applicable confidence category at least 96%, and CRR-020 Not Applicable because API/E2E changed no durable repository coverage.

## Build Command

    NO_TIMESTAMP=1 APPLE_TEAM_ID= DEBUG=electron-builder,electron-builder:* DEBUG=app-builder-lib* DEBUG=builder-util* corepack pnpm -C autobyteus-web build:electron:mac

This is the README's local macOS no-notarization path. The script includes boundary/localization guards, server/shared builds, Prisma generation, sanitized bootstrap, mobile and Electron Nuxt generation, Electron/build TypeScript, integrated-server deployment, native Electron module rebuild, packaging, and blockmap generation.

## Result

- Build: Pass, exit 0.
- Started: 2026-08-10T11:54:54Z.
- Completed: 2026-08-10T11:58:56Z.
- Architecture: macOS arm64.
- Flavor: enterprise.
- App version/build: 1.4.46 / 1.4.46.
- Build log: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/done/custom-provider-model-context-metadata/electron-build-mac-dr-010.log`.
- Non-release signing posture: electron-builder used `identity=null` and skipped Developer ID signing. The root executable reports an ad-hoc linker signature, no team identifier, and the package was not notarized.

## Testable Artifacts

| Artifact | Bytes | SHA-256 | Use |
| --- | ---: | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/autobyteus-web/electron-dist/AutoByteus_enterprise_macos-arm64-1.4.46.dmg` | 402346443 | `b85c6a308ffe5f41ab5955b160358953232ff0ec54bdfa62e356c5d0c8c20aca` | Recommended installer image. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/autobyteus-web/electron-dist/AutoByteus_enterprise_macos-arm64-1.4.46.zip` | 397900102 | `834566db8dabdf9f00c9a766b639f6b2610c408579acb80e96df0ba6291362ca` | Portable archive alternative. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/autobyteus-web/electron-dist/mac-arm64/AutoByteus.app` | Directory bundle | N/A | Direct local app bundle. |

DR-010 overwrote DR-009's same v1.4.46 filenames. The DR-009 checksums are superseded; use only the DR-010 values above.

## Artifact Verification

- `hdiutil verify`: Pass / valid DMG checksum.
- `unzip -t`: Pass / no compressed-data errors.
- App executable: Mach-O 64-bit arm64.
- Packaged target and selected Darwin arm64 node-pty helpers: Pass.
- Real packaged node-pty spawn probe: Pass.
- App version/build plist: 1.4.46 / 1.4.46.
- Packaged built-server byte identity: Pass for AppConfig environment assignment, readable custom-provider migration, custom-provider V3 store, and agent-stream egress control.
- Packaged renderer identity: Pass. Current `settings` and `agentTeamContextsStore` bundles are byte-identical between the just-built renderer and `app.asar`.
- Packaged IR-013 check: Pass. The `app.asar` shared label-owner bundle contains the Qwen-specific friendly-name branch before the generic AutoByteus identifier fallback.
- Verification log: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/done/custom-provider-model-context-metadata/electron-build-mac-dr-010-verification.log`.
- Packaged-source log: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/done/custom-provider-model-context-metadata/electron-build-mac-dr-010-packaged-source.log`.

## Friendly Qwen Behavior In This Package

- Live Settings and shared model selectors show `DeepSeek V4 Pro (Qwen)`, `DeepSeek V4 Flash 0731 (Qwen)`, and `GLM-5.2 (Qwen)`.
- Selected and persisted identities remain exact `qwen:...` selectors.
- Provider requests retain exact unprefixed values such as `deepseek-v4-pro`, `deepseek-v4-flash-0731`, and `glm-5.2`.
- A stored selector missing from the live catalog remains raw-visible for repair instead of receiving a guessed label.

## Testing Notes

1. Open the DMG and copy `AutoByteus.app`, or use the direct app bundle.
2. Because this local build has no Developer ID signature/notarization, macOS may require right-click **Open** or approval in Privacy & Security.
3. The embedded server uses `http://127.0.0.1:29695`.
4. The packaged app uses `~/.autobyteus/server-data`. Back up that directory before testing if existing state matters.
5. On first startup with legacy custom providers, the approved transition resets providers and credentials. Recreate desired custom providers with the same name, Base URL, and a newly entered key.
6. Missing migrated selectors should remain visible as unavailable and block rather than silently falling back.

Delivery did not launch the new package and did not mutate user application data. Do not send credentials in the verification response.

## Known Non-Blocking Diagnostics

- Browserslist/caniuse age and large Vite chunk warnings.
- pnpm peer/deprecated/ignored-build-script diagnostics during deployment.
- electron-builder optional/unresolved dependency and icon path-resolution diagnostics.
- These did not fail guards, shared/server builds, Prisma/bootstrap, packaging, DMG/ZIP integrity, native helper checks, spawn probe, or packaged source/renderer identity.

## Delivery State

This is a local verification build, not a new release. No ticket archive, branch push, target merge, tag, publication, deployment, or cleanup occurred. Explicit user verification remains required.
