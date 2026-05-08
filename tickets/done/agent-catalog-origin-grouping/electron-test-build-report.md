# Electron Test Build Report

## Scope

- Ticket: `agent-catalog-origin-grouping`
- Purpose: Local macOS Electron build for user verification after Round 5 API/E2E validation of the final Daily Assistant private-agent direction.
- Build date: `2026-05-07`
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-catalog-origin-grouping`
- Build directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-catalog-origin-grouping/autobyteus-web`

## README / Build Docs Read

- `autobyteus-web/README.md`
  - Desktop build command for macOS: `pnpm build:electron:mac`
  - Local macOS no-notarization/timestamping form: `NO_TIMESTAMP=1 APPLE_TEAM_ID= ... pnpm build:electron:mac`
  - Output directory: `autobyteus-web/electron-dist`
- `autobyteus-web/docs/electron_packaging.md`
  - macOS artifacts are DMG + ZIP named `AutoByteus_<flavor>_macos-{arch}-{version}`.
  - Flavor can be forced with `AUTOBYTEUS_BUILD_FLAVOR=personal`.
- `README.md`
  - Release/package notes reviewed; this was a local build-only verification artifact, not a release/tag/publish step.

## Build Command

```bash
cd /Users/normy/autobyteus_org/autobyteus-worktrees/agent-catalog-origin-grouping/autobyteus-web
AUTOBYTEUS_BUILD_FLAVOR=personal NO_TIMESTAMP=1 APPLE_TEAM_ID= pnpm build:electron:mac
```

## Result

- Status: `Pass`
- Package version: `1.2.98`
- Resolved build flavor: `personal`
- Resolved architecture: `arm64`
- Signing/notarization: unsigned and not notarized for local testing (`APPLE_SIGNING_IDENTITY` was not set; `APPLE_TEAM_ID` was blank; `NO_TIMESTAMP=1`).
- Build start: `2026-05-07T17:48:33+0200`
- Build finish: `2026-05-07T17:52:17+0200`

## Artifacts

| Artifact | Size | SHA256 |
| --- | ---: | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-catalog-origin-grouping/autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.2.98.dmg` | `358M` | `2d4486843ba73e5a677253a3bf14e31a63bafb4333415f76ef5abfcdfb59c9c8` |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-catalog-origin-grouping/autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.2.98.zip` | `356M` | `1be44ec635c7b872f091352fded9546d7a1bd5f15b2efd2b605c4c298580fb45` |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-catalog-origin-grouping/autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.2.98.dmg.blockmap` | `383K` | `N/A` |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-catalog-origin-grouping/autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.2.98.zip.blockmap` | `374K` | `N/A` |

## Notable Build Output

- `guard:web-boundary` passed.
- `guard:localization-boundary` passed.
- `audit:localization-literals` passed with zero unresolved findings.
- `prepare-server` passed and bundled server resources.
- Backend build ran `clean-build-output.mjs`, copied unified built-in-agent templates, and reported `Built-in agents bootstrap smoke check passed.`
- `generate:electron` completed; Vite reported known dynamic-import/large-chunk warnings.
- Electron builder produced macOS arm64 DMG and ZIP artifacts.

## User Verification Notes

- This artifact is intended for local manual verification only; it is not a signed/notarized release artifact.
- If macOS Gatekeeper blocks first launch, use the standard local unsigned-app flow (`right-click -> Open`) or remove quarantine only if you trust this local build.
- Daily Assistant is not bundled/seeded by the server. To test Daily Assistant, configure the agent package root to `/Users/normy/autobyteus_org/autobyteus-private-agents` so `agents/daily-assistant/` is discoverable, then feature it from Settings if desired.
- Suggested verification focus:
  - Fresh server startup creates Memory Compactor only; no app-data `daily-assistant`, `super-ai-assistant`, or `autobyteus-super-assistant` should be seeded.
  - `/agents` empty-search order remains Featured, Team-local, Application, Shared.
  - Without a featured setting, Daily Assistant appears as a normal Shared/private agent when the private root is configured.
  - After using Settings -> Featured catalog items, Daily Assistant appears in Featured and is omitted from origin sections.
