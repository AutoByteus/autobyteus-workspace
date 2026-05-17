# Electron Test Build Report

## Scope

- Ticket: `codex-history-reload-toolcalls`
- Purpose: Local macOS Electron artifact for user manual verification before repository finalization.
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-history-reload-toolcalls`
- Branch: `codex/codex-history-reload-toolcalls`
- Build base state: latest integrated ticket branch at `2be89c09` plus Round 12 reviewed/validated tests/docs/report edits.
- Build platform: macOS arm64 local build.
- Build completed: 2026-05-17 07:27 Europe/Berlin.

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
- Raw build log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-history-reload-toolcalls/.local/codex-history-reload-toolcalls/delivery-logs/electron-build-mac-arm64-round12-20260517-072333.log` (ignored local evidence, not intended as a durable repository artifact).

## Artifacts For Testing

| Artifact | Path | Size | SHA-256 |
| --- | --- | ---: | --- |
| DMG | `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-history-reload-toolcalls/autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.3.14.dmg` | 375,773,548 bytes (358M) | `b7b2b022fdc5f120a2162fe6a386214e0b6411fc8cab7ac2d4eb7fc5ad679896` |
| ZIP | `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-history-reload-toolcalls/autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.3.14.zip` | 373,275,082 bytes (356M) | `f6b15613c2b6f42f408303b6ad0f38f5394a08b9be1858f2181f38f6796a9550` |
| DMG blockmap | `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-history-reload-toolcalls/autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.3.14.dmg.blockmap` | 393,395 bytes | N/A |
| ZIP blockmap | `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-history-reload-toolcalls/autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.3.14.zip.blockmap` | 383,171 bytes | N/A |
| App bundle | `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-history-reload-toolcalls/autobyteus-web/electron-dist/mac-arm64/AutoByteus.app` | 1.2G unpacked app | N/A |

## Artifact Verification

- `hdiutil verify autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.3.14.dmg` — passed; checksum valid.
- Build output included DMG, ZIP, and blockmaps:
  - `AutoByteus_personal_macos-arm64-1.3.14.dmg`
  - `AutoByteus_personal_macos-arm64-1.3.14.zip`
  - `AutoByteus_personal_macos-arm64-1.3.14.dmg.blockmap`
  - `AutoByteus_personal_macos-arm64-1.3.14.zip.blockmap`

## Notes For User Testing

- This is a local test build, not a release build.
- macOS may warn because the build is unsigned/not notarized.
- Round 12 is a validation-only follow-up that directly inspects generated `raw_traces.jsonl`; product runtime source is unchanged from the Round 11 build, but this refreshed build keeps the local artifact aligned with the current delivery state.
- Repository finalization remains on hold until explicit user verification is received.

## Delivery Check

- Final delivery whitespace check with untracked report/evidence artifacts included via intent-to-add: passed.
