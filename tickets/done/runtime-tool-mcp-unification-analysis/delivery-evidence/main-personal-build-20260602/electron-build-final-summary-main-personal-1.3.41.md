# Main repo personal Electron macOS arm64 build final summary — 1.3.41

Date (UTC): 2026-06-02T16:45:00Z
Repo: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo`
Branch: `personal`
Build HEAD: `9667d37671286d7f7ea4f24c5bf4b6979139a492`
Base before merge: `origin/personal ade1afdec18fd8c0ae322517439b51c9769c2d80`

## Finalization context

The runtime tool MCP unification ticket branch was finalized, archived to `tickets/done/runtime-tool-mcp-unification-analysis/`, merged into the main repo `personal` branch, and the separate ticket worktree was removed.

- Final ticket branch commit before merge: `81ddd389321812da087edbfe66ad1341362be1ec`
- Main repo `personal` merge commit: `9667d37671286d7f7ea4f24c5bf4b6979139a492`
- Removed worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-tool-mcp-unification-analysis`
- Deleted local ticket branch: `codex/runtime-tool-mcp-unification-analysis`

## README build command

Read from `autobyteus-web/README.md` on the main repo `personal` branch and executed:

```bash
pnpm build:electron:mac
```

Because this build was run from the `personal` branch, the resolved build flavor was `personal` and artifact base name was `AutoByteus_personal`.

## Artifacts

- DMG: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.3.41.dmg`
- ZIP: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.3.41.zip`
- DMG blockmap: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.3.41.dmg.blockmap`
- ZIP blockmap: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.3.41.zip.blockmap`
- Update manifest: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-web/electron-dist/latest-mac.yml`

## SHA-256

```text
963198d339cb0a50614746454f4c4451582b6f1e755af24f88b4f27792386f0e  AutoByteus_personal_macos-arm64-1.3.41.dmg
a89f5a51eaa216dcdbff022aaae49806df4d57246e1e7ccdf082e10245d7d071  AutoByteus_personal_macos-arm64-1.3.41.dmg.blockmap
f9afb5ee6ca754b36ae98353608566f9415de3444dcddc9a2c62648d2c521d3c  AutoByteus_personal_macos-arm64-1.3.41.zip
c3857ac6b01953f705c9f3ea93d39de63149c810757cfb743852af63694dd06c  AutoByteus_personal_macos-arm64-1.3.41.zip.blockmap
1dd361fbafc63854e32282aaff41e38ec6c6241eee9f399ae0a7e0c05581843a  latest-mac.yml
```

Full SHA manifest: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/runtime-tool-mcp-unification-analysis/delivery-evidence/main-personal-build-20260602/electron-build-artifacts-main-personal-1.3.41.sha256`

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

- README build log: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/runtime-tool-mcp-unification-analysis/delivery-evidence/main-personal-build-20260602/electron-build-main-personal-9667d376.log`
- DMG notarize/staple: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/runtime-tool-mcp-unification-analysis/delivery-evidence/main-personal-build-20260602/electron-dmg-notarize-staple-main-personal-1.3.41.log`
- Built app verification: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/runtime-tool-mcp-unification-analysis/delivery-evidence/main-personal-build-20260602/electron-signing-notarization-verification-main-personal-1.3.41.log`
- Mounted DMG verification: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/runtime-tool-mcp-unification-analysis/delivery-evidence/main-personal-build-20260602/electron-dmg-mounted-verification-main-personal-1.3.41.log`
- Final diff check: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/runtime-tool-mcp-unification-analysis/delivery-evidence/main-personal-build-20260602/git-diff-check-main-personal-1.3.41.log`
