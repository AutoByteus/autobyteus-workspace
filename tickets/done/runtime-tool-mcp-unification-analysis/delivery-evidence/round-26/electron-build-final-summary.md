# Electron macOS arm64 build final summary

Date (UTC): 2026-06-01T13:51:06Z
Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-tool-mcp-unification-analysis`
Branch: `codex/runtime-tool-mcp-unification-analysis`
HEAD: `52b2a81bef0a0623160c00ec021726a6d78c225c`
Base checked: `origin/personal fb22bc830cdbf78764fef6fc1a47ffd297812149`

## Build command

Read from `autobyteus-web/README.md` and executed:

```bash
pnpm build:electron:mac
```

The build used a temporary local Apple signing/notarization credential file at `autobyteus-web/.env.local`; secret values were not logged, and the temporary copied file was removed after the signed/notarized build completed.

## Artifacts

- DMG: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-tool-mcp-unification-analysis/autobyteus-web/electron-dist/AutoByteus_enterprise_macos-arm64-1.3.39.dmg`
- ZIP: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-tool-mcp-unification-analysis/autobyteus-web/electron-dist/AutoByteus_enterprise_macos-arm64-1.3.39.zip`
- DMG blockmap: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-tool-mcp-unification-analysis/autobyteus-web/electron-dist/AutoByteus_enterprise_macos-arm64-1.3.39.dmg.blockmap`
- ZIP blockmap: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-tool-mcp-unification-analysis/autobyteus-web/electron-dist/AutoByteus_enterprise_macos-arm64-1.3.39.zip.blockmap`
- Update manifest: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-tool-mcp-unification-analysis/autobyteus-web/electron-dist/latest-mac.yml`

## Verification result

Pass.

- App bundle has `Contents/_CodeSignature/CodeResources`.
- App identity: `com.autobyteus.app`.
- Developer ID authority: `Developer ID Application: YU ZHENG (7Y86YBQ7B4)`.
- App notarization ticket: stapled.
- DMG notarization ticket: stapled.
- Built app: `codesign --verify --deep --strict --verbose=2` passed.
- Built app: `spctl --assess --type execute --verbose=4` accepted as `Notarized Developer ID`.
- DMG: `spctl --assess --type open --context context:primary-signature --verbose=4` accepted as `Notarized Developer ID`.
- App inside mounted DMG: `codesign --verify --deep --strict --verbose=2` passed.
- App inside mounted DMG: `spctl --assess --type execute --verbose=4` accepted as `Notarized Developer ID`.
- App inside mounted DMG: `xcrun stapler validate` passed.

## Evidence logs

- Build log: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-tool-mcp-unification-analysis/tickets/done/runtime-tool-mcp-unification-analysis/delivery-evidence/round-26/electron-rebuild-signed-notarized-from-readme.log`
- App verification: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-tool-mcp-unification-analysis/tickets/done/runtime-tool-mcp-unification-analysis/delivery-evidence/round-26/electron-signing-notarization-verification.log`
- DMG notarize/staple: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-tool-mcp-unification-analysis/tickets/done/runtime-tool-mcp-unification-analysis/delivery-evidence/round-26/electron-dmg-notarize-staple-python-env.log`
- Mounted DMG verification: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-tool-mcp-unification-analysis/tickets/done/runtime-tool-mcp-unification-analysis/delivery-evidence/round-26/electron-dmg-mounted-final-verification.log`
- SHA256: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-tool-mcp-unification-analysis/tickets/done/runtime-tool-mcp-unification-analysis/delivery-evidence/round-26/electron-build-artifacts.sha256`
