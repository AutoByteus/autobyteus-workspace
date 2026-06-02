# Round 25 Electron Build Summary

## Context

- Ticket: `runtime-tool-mcp-unification-analysis`
- Branch/worktree: `codex/runtime-tool-mcp-unification-analysis` at `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-tool-mcp-unification-analysis`
- Latest tracked base integrated before packaging: `origin/personal` `fb22bc830cdbf78764fef6fc1a47ffd297812149` (`fb22bc83 Merge RPA stream error handling fix`)
- Ticket branch HEAD at build time: `52b2a81bef0a0623160c00ec021726a6d78c225c`
- Package version: `1.3.39`

## Command

Run from `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-tool-mcp-unification-analysis/autobyteus-web` after removing the previous `electron-dist` directory:

```bash
rm -rf electron-dist
NO_TIMESTAMP=1 APPLE_TEAM_ID= DEBUG=electron-builder,electron-builder:* DEBUG=app-builder-lib* DEBUG=builder-util* pnpm build:electron:mac
```

## Result

Pass. Electron Builder produced macOS arm64 DMG and ZIP artifacts.

Full log:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-tool-mcp-unification-analysis/tickets/done/runtime-tool-mcp-unification-analysis/delivery-evidence/round-25/electron-rebuild-after-origin-personal-fb22bc83.log`

SHA-256 manifest:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-tool-mcp-unification-analysis/tickets/done/runtime-tool-mcp-unification-analysis/delivery-evidence/round-25/electron-build-artifacts.sha256`

## Artifacts

| Artifact | Size (bytes) | SHA-256 |
| --- | ---: | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-tool-mcp-unification-analysis/autobyteus-web/electron-dist/AutoByteus_enterprise_macos-arm64-1.3.39.dmg` | 379689137 | `aa189e56c9650c1ab4c8d137bbaf296a46cd8e761373083f004a5db1191f0bc6` |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-tool-mcp-unification-analysis/autobyteus-web/electron-dist/AutoByteus_enterprise_macos-arm64-1.3.39.dmg.blockmap` | 395417 | `1ab3124d1b5d0826d24886fdc58e94a951b0a3e3e2577710c2b15b0210eee3de` |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-tool-mcp-unification-analysis/autobyteus-web/electron-dist/AutoByteus_enterprise_macos-arm64-1.3.39.zip` | 377331122 | `e07976ec2b1a11d136b93d57b317a43f1c74528e7090a1f478d0dc79c95a255c` |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-tool-mcp-unification-analysis/autobyteus-web/electron-dist/AutoByteus_enterprise_macos-arm64-1.3.39.zip.blockmap` | 387295 | `0600b08586c543569d92d4b0ca601fc24ccac05e8017f7aad2463f919557d64b` |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-tool-mcp-unification-analysis/autobyteus-web/electron-dist/latest-mac.yml` | 561 | `4ce5107f7a160f333496af458d6e020680d274008cdfab4fce615a6456e7dcf0` |

## Update Manifest

`latest-mac.yml` reports:

- version: `1.3.39`
- releaseDate: `2026-06-01T11:11:18.428Z`
- default update path: `AutoByteus_enterprise_macos-arm64-1.3.39.zip`

## Observed Non-Blocking Build Warnings

- Existing Node `MODULE_TYPELESS_PACKAGE_JSON` warning during localization audit.
- Existing Nuxt large-chunk warning.
- Existing pnpm ignored-build-script and deprecated peer warnings.
- Electron Builder unresolved optional dependency diagnostics.
- Unsigned/no-notarization local build behavior because `APPLE_TEAM_ID=` was intentionally empty and no signing identity was configured.
