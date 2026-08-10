# Handoff Summary — Custom Provider Model Context Metadata

## Final Status

**Released and rollout-verified as stable v1.4.47.** The user accepted the corrected DR-010 package. The ticket was archived, committed, pushed, merged into `personal`, and published through the documented release helper. All five tag-push release workflows passed.

The only remaining operational action is local cleanup: the accepted DR-010 Electron app is still running from the dedicated ticket worktree, so delivery deliberately did not terminate it or remove its files.

## Delivered Behavior

- Alibaba/Qwen is a native configurable provider with server-owned Base URL and write-only API-key persistence.
- The built-in Qwen catalog contains `qwen3.8-max`, `deepseek-v4-pro`, `deepseek-v4-flash-0731`, and `glm-5.2` with exact Alibaba-compatible routing metadata.
- Qwen-hosted duplicate models show friendly `(Qwen)` names while selected and persisted values remain exact collision-safe `qwen:...` selectors.
- Provider requests retain exact unprefixed wire values.
- Custom OpenAI-compatible providers use deterministic readable `provider_...` identities.
- Legacy custom providers and credentials are intentionally reset rather than transferred; users recreate them with the same canonical name, Base URL, and a newly entered key.
- Missing selections remain visible and unavailable instead of being silently replaced.

## Repository Result

- Archived ticket: `tickets/done/custom-provider-model-context-metadata`.
- Final ticket commit: `6cbfc9fbc1c492eac86c2f2bf53470f2a0e49a21`.
- Target merge: `156f6a0e285fd981318a4c0b787a495e8546c6ce`.
- Release commit: `e373cfb6d3f42240ce85504165f487fccf0bc6b8`.
- Release tag: `v1.4.47`.
- Release page: https://github.com/AutoByteus/autobyteus-workspace/releases/tag/v1.4.47

The finalization refresh found no base advance. Friendly-Qwen regression coverage passed 4 files / 12 tests both before the final ticket commit and after the target merge.

## Release Result

Successful exact-tag workflows:

- Desktop Release `31392099917`;
- Server Docker Release `31392099931`;
- Android APK Release `31392101378`;
- Release Messaging Gateway `31392101421`;
- iOS App Store Connect Release `31392101713`.

The stable GitHub Release is non-draft/non-prerelease with 21 assets covering macOS ARM64/x64, Windows x64, Linux x64/ARM64, Android, messaging gateway, manifests, and updater metadata. iOS `1.4.47 (109)` was uploaded successfully to App Store Connect/TestFlight; App Store review approval is not claimed.

Recommended macOS ARM64 asset:

- `AutoByteus_personal_macos-arm64-1.4.47.dmg`
- SHA-256: `6ed7c67025324edba230fffb73adfb022b72f45b40bc5e4915c8a6a530183415`

Docker Hub `autobyteus/autobyteus-server:1.4.47` and `:latest` share multi-arch digest `sha256:3ca9e5034bd7ff9ed17cd460c536b10316cf96fce3b9b3010221431a6fa2dee7`.

## Documentation And Evidence

- Docs sync: `docs-sync-report.md` — Updated / Pass.
- Release report: `release-deployment-report.md`.
- Curated notes: `release-notes.md`.
- Workflow/assets evidence: `probes/delivery/release-v1.4.47-workflows.json` and `probes/delivery/release-v1.4.47-assets.json`.
- Verification summary: `probes/delivery/release-v1.4.47-verification.log`.

## Cleanup Hold

The dedicated worktree remains at `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata` because the DR-010 `AutoByteus.app`, its helpers, built server, and node-pty bridge are still running from that path. Delivery found active process and open-file references and did not disrupt the user session.

After that app is closed, delivery can safely remove the dedicated worktree and delete the already-merged local and remote ticket branches. Evidence: `probes/delivery/post-finalization-cleanup.log`.

## Bounded Residual Risk

Real Alibaba availability, credentials, quota, region policy, TLS behavior, undocumented payload variation, and future vendor drift were not exercised. Previously accepted migration timing/interruption/orphan, stale-selector, POSIX-permission, and package-typecheck limitations remain bounded. The published desktop release passed signing/notarization policy checks; the earlier DR-010 local package was intentionally ad-hoc and is historical.
