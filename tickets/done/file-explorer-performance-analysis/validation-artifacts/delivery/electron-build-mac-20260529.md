# Local Electron macOS Build - 2026-05-29

## README Sections Read

- `autobyteus-web/README.md` — Desktop Application Build, macOS Build With Logs (No Notarization), Desktop Application with Integrated Backend.
- Root `README.md` — Release workflow section reviewed to distinguish this local build-only validation from a release/tag/publish workflow.

## Command

```bash
CI=true NO_TIMESTAMP=1 APPLE_TEAM_ID= DEBUG='electron-builder,electron-builder:*,app-builder-lib*,builder-util*' pnpm -C autobyteus-web build:electron:mac
```

Notes:

- This follows the README macOS no-notarization build path, with `CI=true` added to keep the command non-interactive and DEBUG values consolidated into one environment variable.
- The build resolved `AUTOBYTEUS_BUILD_FLAVOR` from the environment/config as `enterprise`, producing `AutoByteus_enterprise_*` artifact names.
- This was a local build-only validation. It did not push, tag, publish a GitHub Release, or run deployment.

## Result

`PASS`

The build completed successfully and produced macOS ARM64 DMG/ZIP artifacts in `autobyteus-web/electron-dist`.

## Build Artifacts

| Artifact | Size | SHA-256 |
| --- | ---: | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/file-explorer-performance-analysis/autobyteus-web/electron-dist/AutoByteus_enterprise_macos-arm64-1.3.32.dmg` | 362 MiB | `a14178116494b478b9d83fc21d5dfea84da989690dc9b7de492d33202234221f` |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/file-explorer-performance-analysis/autobyteus-web/electron-dist/AutoByteus_enterprise_macos-arm64-1.3.32.zip` | 360 MiB | `2154d33021ced6aae965926f104ce577a14c11b0526729edfa1a21be5f74166c` |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/file-explorer-performance-analysis/autobyteus-web/electron-dist/AutoByteus_enterprise_macos-arm64-1.3.32.dmg.blockmap` | 386 KiB | N/A |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/file-explorer-performance-analysis/autobyteus-web/electron-dist/AutoByteus_enterprise_macos-arm64-1.3.32.zip.blockmap` | 378 KiB | N/A |

Additional generated metadata:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/file-explorer-performance-analysis/autobyteus-web/electron-dist/latest-mac.yml`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/file-explorer-performance-analysis/autobyteus-web/electron-dist/builder-debug.yml`

## Key Build Steps Observed

- `guard:web-boundary` passed.
- `guard:localization-boundary` passed.
- `audit:localization-literals` passed with zero unresolved findings.
- `prepare-server` built the backend and deployed bundled server resources to `autobyteus-web/resources/server`.
- Mobile web assets were generated.
- Electron Nuxt renderer was generated.
- Electron main/preload were transpiled.
- `electron-builder` produced unsigned/not-notarized local macOS ARM64 DMG and ZIP artifacts.

## Warnings / Notes

- Build emitted expected/chronic dependency and chunk-size warnings, including Nuxt large chunk warnings and dependency peer/deprecation warnings.
- `APPLE_SIGNING_IDENTITY` was not set; extra resource signing was skipped.
- macOS code signing was skipped because identity was explicitly `null`; notarization was disabled and timestamping was disabled via `NO_TIMESTAMP=1`.
- Full raw build log was large because DEBUG enabled verbose `hdiutil` output; it is retained outside the repo at `/tmp/file-explorer-electron-build-mac-20260529.full.log` for this session and intentionally not stored as a durable repository artifact.
