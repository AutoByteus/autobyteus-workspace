# Electron Test Build Report

## Build Meta

- Ticket: `agent-tools-mcp-session-lifetime`
- Build date: 2026-06-16
- Purpose: Local macOS Electron artifact for user verification before repository finalization.
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-tools-mcp-session-lifetime`
- Build project: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-tools-mcp-session-lifetime/autobyteus-web`
- Build flavor: `personal`
- Version: `1.3.54`
- Target: macOS arm64
- Signing/notarization: unsigned / not notarized (`APPLE_TEAM_ID=` and no signing identity); local verification artifact only.

## README Basis

Read before building:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-tools-mcp-session-lifetime/README.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-tools-mcp-session-lifetime/autobyteus-web/README.md`

Relevant README instructions:

- Desktop builds use `pnpm build:electron:mac` on macOS.
- Electron builds include the integrated backend server through `pnpm prepare-server`.
- Built applications are emitted under `autobyteus-web/electron-dist`.
- Local macOS no-notarization builds can set `NO_TIMESTAMP=1 APPLE_TEAM_ID=`.

## Command

```bash
cd /Users/normy/autobyteus_org/autobyteus-worktrees/agent-tools-mcp-session-lifetime/autobyteus-web
AUTOBYTEUS_BUILD_FLAVOR=personal NO_TIMESTAMP=1 APPLE_TEAM_ID= pnpm build:electron:mac
```

## Result

- Status: `Pass`
- The command completed successfully and produced macOS arm64 DMG/ZIP artifacts plus updater blockmaps.
- Guard/build steps observed in output:
  - `guard:web-boundary` passed.
  - `guard:localization-boundary` passed.
  - `audit:localization-literals` passed with zero unresolved findings.
  - `prepare-server` completed and bundled the backend server.
  - Server build and built-in agent bootstrap smoke check passed.
  - Mobile web assets built.
  - Electron renderer/main/preload builds completed.
  - electron-builder produced DMG and ZIP artifacts.

## Artifacts

| Artifact | Size | SHA256 |
| --- | ---: | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-tools-mcp-session-lifetime/autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.3.54.dmg` | 360M | `c07cbc9f273c25407340060747dea0c95626d502d90ecd1045d06046bbab912f` |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-tools-mcp-session-lifetime/autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.3.54.zip` | 357M | `549924f07fe6fb4f5aba8c8c07ab29e0b30d581f4e6f4991f09656b64ee69c8e` |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-tools-mcp-session-lifetime/autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.3.54.dmg.blockmap` | 383K | `0e87bae91cf822c8eac50069ae6fce0e800bb4d0330bcd0b1be6714f49b39706` |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-tools-mcp-session-lifetime/autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.3.54.zip.blockmap` | 376K | `070681659d8aacf1e2d12fd9f544f5e593ced28b1e13a8a75009ae8232d00016` |

Additional local app bundle:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-tools-mcp-session-lifetime/autobyteus-web/electron-dist/mac-arm64/AutoByteus.app`

## Warnings / Notes

- The build is unsigned and not notarized. macOS Gatekeeper may require right-click **Open** or local security approval for testing.
- Vite reported existing large chunk warnings. These are packaging warnings and did not fail the build.
- pnpm reported dependency/script warnings during deployment (`lzma-native`, `autobyteus-ts` build scripts ignored in approve-builds context; peer/deprecated dependency warnings). The packaging command still completed successfully.
- `electron-builder` noted code signing was skipped because the signing identity was null.

## Final Status

- `Pass - local Electron verification artifact is ready for user testing.`
