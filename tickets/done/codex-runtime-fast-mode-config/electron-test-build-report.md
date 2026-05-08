# Electron Test Build Report

## Scope

- Ticket: `codex-runtime-fast-mode-config`
- Build purpose: Local macOS Electron artifact for user verification/testing before repository finalization.
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-fast-mode-config`
- Branch: `codex/codex-runtime-fast-mode-config`
- Build flavor: `personal`
- Platform/arch: macOS arm64
- Version embedded by package metadata: `1.2.97`

## README / Build Guidance Read

- Root README: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-fast-mode-config/README.md`
- Electron packaging docs: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-fast-mode-config/autobyteus-web/docs/electron_packaging.md`
- Electron build script/package scripts inspected:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-fast-mode-config/autobyteus-web/package.json`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-fast-mode-config/scripts/desktop-release.sh`

## Command Run

```bash
cd /Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-fast-mode-config
rm -rf autobyteus-web/electron-dist
AUTOBYTEUS_BUILD_FLAVOR=personal pnpm -C autobyteus-web build:electron:mac -- --arm64
```

## Result

- Result: `Passed`
- Build completed successfully and produced macOS arm64 DMG/ZIP artifacts.
- This was a local unsigned test build only. No ticket archival, commit, push, merge, tag, GitHub Release, Docker publish, or deployment was performed.

## Artifacts

| Artifact | Size | SHA-256 |
| --- | ---: | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-fast-mode-config/autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.2.97.dmg` | 358M | `d4e9eb49713a1cb13f8aad122b415d1df53785a77f9b45a5b7259a0f4fac2186` |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-fast-mode-config/autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.2.97.zip` | 356M | `c6cac8baba7d37ddb678524e5de7ddcd9ab0b0474339d62f786b26a8c1a3f068` |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-fast-mode-config/autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.2.97.dmg.blockmap` | 382K | Not recorded |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-fast-mode-config/autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.2.97.zip.blockmap` | 374K | Not recorded |

## Build Evidence

- Web guards passed:
  - `guard:web-boundary`
  - `guard:localization-boundary`
  - `audit:localization-literals`
- Server packaging completed:
  - Prisma client generation passed.
  - Server workspace dependencies built.
  - `autobyteus-server-ts build:full` passed.
  - Server package deployed into `autobyteus-web/resources/server`.
  - `node-pty` rebuilt for Electron successfully.
- Nuxt/Electron renderer/main/preload generation passed.
- Electron builder produced macOS arm64 DMG and ZIP.

## Packaged Fix Sanity Check

Verified the packaged server output contains the Codex Fast-mode implementation:

```text
autobyteus-web/electron-dist/mac-arm64/AutoByteus.app/Contents/Resources/server/dist/agent-execution/backends/codex/codex-app-server-model-normalizer.js
  VALID_CODEX_SERVICE_TIERS = new Set(["fast"])
  llmConfig?.service_tier
  label: "Fast mode"
  additionalSpeedTiers / additional_speed_tiers

autobyteus-web/electron-dist/mac-arm64/AutoByteus.app/Contents/Resources/server/dist/agent-execution/backends/codex/thread/codex-thread-manager.js
  serviceTier: config.serviceTier

autobyteus-web/electron-dist/mac-arm64/AutoByteus.app/Contents/Resources/server/dist/agent-execution/backends/codex/thread/codex-thread.js
  serviceTier: this.serviceTier
```

## Notes / Warnings

- `APPLE_SIGNING_IDENTITY` was not set, so extra resource signing and macOS code signing were skipped intentionally for this local test build.
- Electron builder reported: `skipped macOS code signing reason=identity explicitly is set to null`.
- On Apple Silicon, the DMG was created with APFS because HFS+ is unavailable for the arm64 process; this is expected for local macOS arm64 builds.
- Nuxt reported existing large chunk warnings; build still completed successfully.
- Because the app is unsigned, macOS Gatekeeper may require right-click/Open or removing local quarantine before testing.
