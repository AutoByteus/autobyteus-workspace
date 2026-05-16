# Electron Test Build Report

## Scope

- Ticket: `codex-history-reload-toolcalls`
- Purpose: Local macOS Electron artifact for user manual verification before repository finalization.
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-history-reload-toolcalls`
- Branch: `codex/codex-history-reload-toolcalls`
- Build HEAD: `2e98d66e45b7d5078328c34ef4af36ed6e4b92f9` plus uncommitted, review/validation-passed source-authority implementation, durable tests, docs-sync edits, and delivery reports.
- Build platform: macOS arm64 local build.
- Build completed: 2026-05-16 10:36 Europe/Berlin.

## README / Docs Basis

Read before build:

- `autobyteus-web/README.md` Desktop Application Build section: macOS command is `pnpm build:electron:mac`; output is `electron-dist`.
- `autobyteus-web/README.md` macOS no-notarization local-build section: use `NO_TIMESTAMP=1 APPLE_TEAM_ID= DEBUG=electron-builder,electron-builder:* DEBUG=app-builder-lib* DEBUG=builder-util* pnpm build:electron:mac`.
- `autobyteus-web/docs/electron_packaging.md`: macOS target is DMG + ZIP named `AutoByteus_<flavor>_macos-{arch}-{version}.dmg/.zip`; `personal` flavor resolves to `AutoByteus_personal`.

## Build Command

From `autobyteus-web`:

```bash
AUTOBYTEUS_BUILD_FLAVOR=personal NO_TIMESTAMP=1 APPLE_TEAM_ID= DEBUG=electron-builder,electron-builder:*,app-builder-lib*,builder-util* pnpm build:electron:mac -- --arm64
```

## Result

- Status: `Passed`
- Signing/notarization: local unsigned / not notarized, per README local build guidance.
- Raw build log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-history-reload-toolcalls/.local/codex-history-reload-toolcalls/delivery-logs/electron-build-mac-arm64-source-authority-20260516-103323.log` (ignored local evidence, not intended as a durable repository artifact).

## Artifacts For Testing

| Artifact | Path | Size | SHA-256 |
| --- | --- | ---: | --- |
| DMG | `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-history-reload-toolcalls/autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.3.13.dmg` | 375,710,263 bytes (358M) | `31845864f01a42dd0fac9d33b577c96510cd6145b4a4c8112ba8456c99cb745a` |
| ZIP | `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-history-reload-toolcalls/autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.3.13.zip` | 373,279,907 bytes (356M) | `ff24162828d35c9570e7e96a373491bc42aee94d1978a6b9a1d772cbe0447227` |
| DMG blockmap | `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-history-reload-toolcalls/autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.3.13.dmg.blockmap` | 390,914 bytes | N/A |
| ZIP blockmap | `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-history-reload-toolcalls/autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.3.13.zip.blockmap` | 382,759 bytes | N/A |
| App bundle | `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-history-reload-toolcalls/autobyteus-web/electron-dist/mac-arm64/AutoByteus.app` | 1.2G unpacked app | N/A |

## Artifact Verification

- `hdiutil verify autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.3.13.dmg` — passed; checksum valid.
- Build output included DMG, ZIP, and blockmaps:
  - `AutoByteus_personal_macos-arm64-1.3.13.dmg`
  - `AutoByteus_personal_macos-arm64-1.3.13.zip`
  - `AutoByteus_personal_macos-arm64-1.3.13.dmg.blockmap`
  - `AutoByteus_personal_macos-arm64-1.3.13.zip.blockmap`

## Notes For User Testing

- This is a local test build, not a release build.
- macOS may warn because the build is unsigned/not notarized.
- This build contains the source-authority implementation validated in API/E2E Round 3: focused Codex/team-member UI projection is sourced from Codex-native `thread/read`; raw traces do not repair or alter the focused Codex UI projection.
- Repository finalization remains on hold until explicit user verification is received.

## Delivery Check

- Final delivery whitespace check with untracked report/evidence artifacts included via intent-to-add: passed.
