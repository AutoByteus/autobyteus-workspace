# Electron Build Artifacts

- Ticket: `codex-token-cache-rate-statistics`
- Build context: local pre-release macOS ARM64 user-test build from the ticket worktree before the final `1.3.84` version bump.
- Original worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-token-cache-rate-statistics` (removed during final cleanup).
- Preserved artifact directory: `/Users/normy/autobyteus_org/autobyteus-local-release-artifacts/codex-token-cache-rate-statistics-v1.3.84`
- Branch at build time: `codex/codex-token-cache-rate-statistics`
- Build command source: `autobyteus-web/README.md` desktop macOS build instructions.
- Command run from: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-token-cache-rate-statistics/autobyteus-web`
- Command: `NO_TIMESTAMP=1 APPLE_TEAM_ID= APPLE_ID= APPLE_APP_SPECIFIC_PASSWORD= APPLE_SIGNING_IDENTITY= DEBUG=electron-builder,electron-builder:* DEBUG=app-builder-lib* DEBUG=builder-util* pnpm build:electron:mac`
- Result: `Passed`
- Log: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/codex-token-cache-rate-statistics/delivery-evidence/electron-build-mac.log`
- Signing/notarization: Apple credential variables were intentionally empty for this local user-test build; the build log records macOS code signing skipped because identity was explicitly null, and notarization was not attempted.

## Preserved Local Test Artifacts

| Artifact | Size | SHA-256 |
| --- | ---: | --- |
| `/Users/normy/autobyteus_org/autobyteus-local-release-artifacts/codex-token-cache-rate-statistics-v1.3.84/AutoByteus_enterprise_macos-arm64-1.3.83.dmg` | 382M | `f667b1080c53a7e463cf4b67d15056f87af58c4ca779b2c53f6bee61e13cf90f` |
| `/Users/normy/autobyteus_org/autobyteus-local-release-artifacts/codex-token-cache-rate-statistics-v1.3.84/AutoByteus_enterprise_macos-arm64-1.3.83.zip` | 378M | `ed743d7360e73ed226fa8ed6028d6750c23cf32d5c9ed1763bd8b7c923964a59` |
| `/Users/normy/autobyteus_org/autobyteus-local-release-artifacts/codex-token-cache-rate-statistics-v1.3.84/AutoByteus_enterprise_macos-arm64-1.3.83.dmg.blockmap` | 409K | `d048e1adcb5e1f2defbba8ed4ba331d1cd3866570ba8d348895ca0f1e71e6fe0` |
| `/Users/normy/autobyteus_org/autobyteus-local-release-artifacts/codex-token-cache-rate-statistics-v1.3.84/AutoByteus_enterprise_macos-arm64-1.3.83.zip.blockmap` | 398K | `3b17179c73603e0ef793aa8a3f4775715246b83d9347269409c77edd573961c8` |
| `/Users/normy/autobyteus_org/autobyteus-local-release-artifacts/codex-token-cache-rate-statistics-v1.3.84/latest-mac.yml` | 561B | `a4acfbb05cd5fe117280a3f8359afda34804d252204990c7b7da41f5cf6bc14c` |

## Notes

- These are local unsigned/unnotarized test artifacts produced before the release version bump; official `v1.3.84` artifacts are produced by the tag-triggered GitHub release workflows.
- The README states Electron build outputs are written to `electron-dist`; those worktree-local outputs were copied here before cleanup.
