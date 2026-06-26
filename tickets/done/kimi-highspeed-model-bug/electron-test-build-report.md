# Electron Test Build Report

## Scope

- Ticket: `kimi-highspeed-model-bug`
- Trigger: User requested a latest `origin/personal` refresh and README-guided Electron build for manual testing.
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/kimi-highspeed-model-bug`
- Branch: `codex/kimi-highspeed-model-bug`
- Latest tracked base integrated: `origin/personal` at `1472e852c3df347f7c6683ff0b16a0874add282b`
- Integration merge commit before build: `3c82aa2f6fe2bfd51430bc0a7a8aa156acb5b10f`
- Post-build remote refresh: `git fetch origin personal` confirmed `origin/personal` remained `1472e852c3df347f7c6683ff0b16a0874add282b`; branch relation remained ahead `3`, behind `0`.

## README-Guided Build Method

Read before building:

- Top-level `README.md` setup/build guidance.
- `autobyteus-web/README.md` Desktop Application Build section.
- `autobyteus-web/README.md` macOS no-notarization local build command.
- `autobyteus-web/README.md` integrated backend packaging notes.

Command executed from `autobyteus-web/`:

```bash
NO_TIMESTAMP=1 APPLE_TEAM_ID= APPLE_ID= APPLE_APP_SPECIFIC_PASSWORD= APPLE_SIGNING_IDENTITY= AUTOBYTEUS_BUILD_FLAVOR=personal pnpm build:electron:mac
```

This uses the README macOS Electron build path, disables timestamping/notarization/signing credentials for a local test build, and selects the `personal` flavor.

## Result

- Build status: `Pass`
- Build log: `/Users/normy/autobyteus_org/autobyteus-worktrees/kimi-highspeed-model-bug/tickets/done/kimi-highspeed-model-bug/delivery-evidence/round-1/logs/electron-mac-build.log`
- Build status file: `/Users/normy/autobyteus_org/autobyteus-worktrees/kimi-highspeed-model-bug/tickets/done/kimi-highspeed-model-bug/delivery-evidence/round-1/logs/electron-mac-build.status`
- Artifact manifest: `/Users/normy/autobyteus_org/autobyteus-worktrees/kimi-highspeed-model-bug/tickets/done/kimi-highspeed-model-bug/delivery-evidence/round-1/electron-build-artifacts.txt`
- Notes: electron-builder skipped macOS code signing because signing identity was explicitly null. The build produced standard Vite chunk-size warnings only; they did not fail the build.

## Test Artifacts

| Artifact | Size | SHA256 |
| --- | ---: | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/kimi-highspeed-model-bug/autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.3.76.dmg` | 400802737 bytes | `b671e43385dea6ff28f1ecd562df4d34ee9e1263b35b871ea70656b7aa7ab80d` |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/kimi-highspeed-model-bug/autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.3.76.zip` | 396752887 bytes | `55d927869f48b3501ecd8932a4b96909703e25d60228a0c4417ab591e9349f12` |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/kimi-highspeed-model-bug/autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.3.76.dmg.blockmap` | 419736 bytes | `6d878d549c0113cbd859a429f53a2af974cda52137bfce1e8cbe7abb4bd8b057` |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/kimi-highspeed-model-bug/autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.3.76.zip.blockmap` | 408253 bytes | `1ea980c8790a10e19323482977d4956ab768a07b0a842ba2261ac8d2c6c402ec` |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/kimi-highspeed-model-bug/autobyteus-web/electron-dist/latest-mac.yml` | 555 bytes | `5b9d3e5c7118d493d1a12da4a79edb44c3d35764f707b446107fe4bd3d004eac` |

## Pre-Build Checks On Refreshed State

- `pnpm -C autobyteus-ts exec vitest run tests/unit/llm/utils/llm-config-overrides.test.ts tests/unit/llm/llm-factory-config-composition.test.ts tests/unit/llm/api/kimi-llm.test.ts tests/unit/llm/supported-model-definitions.test.ts` — Passed (4 files, 27 tests).
- `pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-execution/backends/autobyteus/autobyteus-agent-run-backend-factory.test.ts` — Passed (1 file, 8 tests).
- `git diff --check` — Passed.

## Manual Test Note

Use the DMG or ZIP artifact above for local manual testing. This is a local unsigned/unnotarized macOS arm64 test build, not a published release.
