# Electron macOS arm64 build final summary — 1.3.40

Date (UTC): 2026-06-02T06:29:22Z
Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-tool-mcp-unification-analysis`
Branch: `codex/runtime-tool-mcp-unification-analysis`
HEAD: `0bc834c2520de0e62ffd6f443a55fb1d8b597424`
Base checked: `origin/personal 1678dc82b705d24c58b073c75f363d96b5d4cc3c`

## Build command

Read from `autobyteus-web/README.md` and executed after latest-base merge:

```bash
pnpm build:electron:mac
```

The build used a temporary local Apple signing/notarization credential file at `autobyteus-web/.env.local`; secret values were not logged, and the temporary copied file was removed after the signed/notarized build completed.

## Artifacts

- DMG: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-tool-mcp-unification-analysis/autobyteus-web/electron-dist/AutoByteus_enterprise_macos-arm64-1.3.40.dmg`
- ZIP: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-tool-mcp-unification-analysis/autobyteus-web/electron-dist/AutoByteus_enterprise_macos-arm64-1.3.40.zip`
- DMG blockmap: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-tool-mcp-unification-analysis/autobyteus-web/electron-dist/AutoByteus_enterprise_macos-arm64-1.3.40.dmg.blockmap`
- ZIP blockmap: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-tool-mcp-unification-analysis/autobyteus-web/electron-dist/AutoByteus_enterprise_macos-arm64-1.3.40.zip.blockmap`
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

- Build log: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-tool-mcp-unification-analysis/tickets/in-progress/runtime-tool-mcp-unification-analysis/delivery-evidence/round-28/electron-rebuild-signed-notarized-after-origin-personal-1678dc82.log`
- App verification: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-tool-mcp-unification-analysis/tickets/in-progress/runtime-tool-mcp-unification-analysis/delivery-evidence/round-28/electron-signing-notarization-verification-1.3.40.log`
- DMG notarize/staple: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-tool-mcp-unification-analysis/tickets/in-progress/runtime-tool-mcp-unification-analysis/delivery-evidence/round-28/electron-dmg-notarize-staple-1.3.40.log`
- Mounted DMG verification: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-tool-mcp-unification-analysis/tickets/in-progress/runtime-tool-mcp-unification-analysis/delivery-evidence/round-28/electron-dmg-mounted-final-verification-1.3.40.log`
- SHA256: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-tool-mcp-unification-analysis/tickets/in-progress/runtime-tool-mcp-unification-analysis/delivery-evidence/round-28/electron-build-artifacts-1.3.40.sha256`
