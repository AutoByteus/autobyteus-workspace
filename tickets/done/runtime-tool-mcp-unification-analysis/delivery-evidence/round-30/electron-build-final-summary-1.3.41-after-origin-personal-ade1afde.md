# Electron macOS arm64 build final summary — 1.3.41 after origin/personal ade1afde

Date (UTC): 2026-06-02T16:14:00Z
Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-tool-mcp-unification-analysis`
Branch: `codex/runtime-tool-mcp-unification-analysis`
Final integrated HEAD: `25a5f485d5f7457c9034c57c92de9ba56fb92fcb`
Final tracked base: `origin/personal ade1afdec18fd8c0ae322517439b51c9769c2d80`

## Base refresh

The user requested another latest-base refresh and Electron rebuild. Delivery fetched `origin/personal` and confirmed it had advanced beyond the prior delivery state.

Delivery first checkpointed the prior round-29 delivery evidence locally:

- `feb096dffde65b2e0986e76820d6aaae74017383 chore(ticket): checkpoint round29 electron rebuild evidence`

Delivery then merged latest `origin/personal` into the ticket branch with no conflicts:

- merge commit: `25a5f485d5f7457c9034c57c92de9ba56fb92fcb`
- latest merged base: `ade1afdec18fd8c0ae322517439b51c9769c2d80 merge: compaction frontier llm rendering`

A final fetch after rebuild confirmed `origin/personal` was still `ade1afdec18fd8c0ae322517439b51c9769c2d80` and the ticket branch includes it.

## README build command

Read from `autobyteus-web/README.md` after the latest-base merge:

```bash
pnpm build:electron:mac
```

The package version after the base refresh remains `1.3.41`.

## Artifacts

- DMG: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-tool-mcp-unification-analysis/autobyteus-web/electron-dist/AutoByteus_enterprise_macos-arm64-1.3.41.dmg`
- ZIP: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-tool-mcp-unification-analysis/autobyteus-web/electron-dist/AutoByteus_enterprise_macos-arm64-1.3.41.zip`
- DMG blockmap: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-tool-mcp-unification-analysis/autobyteus-web/electron-dist/AutoByteus_enterprise_macos-arm64-1.3.41.dmg.blockmap`
- ZIP blockmap: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-tool-mcp-unification-analysis/autobyteus-web/electron-dist/AutoByteus_enterprise_macos-arm64-1.3.41.zip.blockmap`
- Update manifest: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-tool-mcp-unification-analysis/autobyteus-web/electron-dist/latest-mac.yml`

## SHA-256

```text
8c2717e6b71131a26fadb33777931c975cfeae80948bffb25fa8fa2d85182b7b  AutoByteus_enterprise_macos-arm64-1.3.41.dmg
adf706a9a11714b3b08131bd72bed9b72a690c08c9b06089b1f3184bfb995377  AutoByteus_enterprise_macos-arm64-1.3.41.dmg.blockmap
8eaf9fe954d5a39578a443a4e1fac718c95d0473c1325f26143ef4bdd1a99373  AutoByteus_enterprise_macos-arm64-1.3.41.zip
14d24df32d3f30c9aec60e4c1fade9d98ad2deda3b60637e1e0abcd6300f9d7b  AutoByteus_enterprise_macos-arm64-1.3.41.zip.blockmap
29caf4d421fc2cbad0decabeb25f23c01098bd00f25df7fffcace7a5a1b9f10a  latest-mac.yml
```

Full SHA manifest: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-tool-mcp-unification-analysis/tickets/done/runtime-tool-mcp-unification-analysis/delivery-evidence/round-30/electron-build-artifacts-1.3.41-after-origin-personal-ade1afde.sha256`

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

- README build log: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-tool-mcp-unification-analysis/tickets/done/runtime-tool-mcp-unification-analysis/delivery-evidence/round-30/electron-rebuild-after-origin-personal-ade1afde.log`
- DMG notarize/staple: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-tool-mcp-unification-analysis/tickets/done/runtime-tool-mcp-unification-analysis/delivery-evidence/round-30/electron-dmg-notarize-staple-1.3.41-after-origin-personal-ade1afde.log`
- Built app verification: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-tool-mcp-unification-analysis/tickets/done/runtime-tool-mcp-unification-analysis/delivery-evidence/round-30/electron-signing-notarization-verification-1.3.41-after-origin-personal-ade1afde.log`
- Mounted DMG verification: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-tool-mcp-unification-analysis/tickets/done/runtime-tool-mcp-unification-analysis/delivery-evidence/round-30/electron-dmg-mounted-final-verification-1.3.41-after-origin-personal-ade1afde.log`
- Final diff check: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-tool-mcp-unification-analysis/tickets/done/runtime-tool-mcp-unification-analysis/delivery-evidence/round-30/git-diff-check-final-1.3.41-after-origin-personal-ade1afde.log`
