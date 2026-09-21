# DR-006 Stable Release v1.4.73 Evidence

Recorded: 2026-09-21 (UTC)

## Git and public release

- Canonical command: `pnpm release 1.4.73 -- --release-notes tickets/done/agent-org-display-name-stability/release-notes.md`.
- Release commit: `80e17e469b4418556dd46af22ebaf32516296125`.
- Annotated tag object: `a286776612b0a6aa98022aa5d064cddab42d732a`.
- Tag target: `80e17e469b4418556dd46af22ebaf32516296125`.
- Web and Messaging Gateway package versions: `1.4.73`.
- Public release: https://github.com/AutoByteus/autobyteus-workspace/releases/tag/v1.4.73
- Stable state: non-draft, non-prerelease, published `2026-09-21T19:11:01Z`.
- Curated release body matches the archived ticket release notes.
- Asset count: 21; every asset is uploaded and nonempty.

## Successful tag-triggered workflows

| Workflow | Run URL |
| --- | --- |
| Android APK Release | https://github.com/AutoByteus/autobyteus-workspace/actions/runs/35642937955 |
| Desktop Release | https://github.com/AutoByteus/autobyteus-workspace/actions/runs/35642937867 |
| Release Messaging Gateway | https://github.com/AutoByteus/autobyteus-workspace/actions/runs/35642937936 |
| Server Docker Release | https://github.com/AutoByteus/autobyteus-workspace/actions/runs/35642937868 |
| iOS App Store Connect Release | https://github.com/AutoByteus/autobyteus-workspace/actions/runs/35642938114 |

Every workflow completed with `success` for release SHA
`80e17e469b4418556dd46af22ebaf32516296125`. The desktop matrix succeeded for
macOS x64/arm64, Windows x64, and Linux x64/arm64. No manual recovery dispatch
or tag mutation was used.

## Public asset checks

All updater metadata declares `version: 1.4.73`. Seven updater-referenced
desktop assets exist in the release; every declared size matches GitHub release
metadata when a size is present.

| Asset | Bytes |
| --- | ---: |
| `AutoByteus_personal_linux-arm64-1.4.73.AppImage` | 432,284,905 |
| `AutoByteus_personal_linux-x64-1.4.73.AppImage` | 444,736,071 |
| `AutoByteus_personal_macos-arm64-1.4.73.zip` | 496,621,781 |
| `AutoByteus_personal_macos-arm64-1.4.73.dmg` | 501,834,188 |
| `AutoByteus_personal_macos-x64-1.4.73.zip` | 518,261,603 |
| `AutoByteus_personal_macos-x64-1.4.73.dmg` | 523,749,734 |
| `AutoByteus_personal_windows-1.4.73.exe` | 319,925,932 |
| `AutoByteus_personal_android-1.4.73-release.apk` | 1,846,695 |
| `autobyteus-message-gateway-1.4.73-node-generic.tar.gz` | 47,791,396 |

The downloaded Android APK and Messaging Gateway archive both passed their
published SHA-256 sidecars. Messaging Gateway metadata and
`release-manifest.json` are present and declare `v1.4.73` / `1.4.73`.

## Docker rollout

- Repository: `autobyteus/autobyteus-server`.
- `1.4.73` manifest digest:
  `sha256:28f8d32e1e466d63e5f2ffeeb18a5bbea04ba9da4adc6f1ae61109581642487f`.
- `latest` manifest digest: identical.
- Active `linux/amd64` image digest:
  `sha256:f60446e5ec8829b1b2d9cfdbe3d0f63a4bd2dd27f39a820a4ddbe4bf55aaf8b9`.
- Active `linux/arm64` image digest:
  `sha256:d45e0591e509afa1957e3f4d414fb4511688a14e112dc365c8abb330d979cc4c`.

## iOS qualification

The successful iOS workflow includes implementation checks, publish-secret
validation, archive, and upload to App Store Connect. Apple review and public
storefront availability remain external states and are not claimed.

## Safe cleanup

- The dedicated ticket worktree was removed and the worktree registry pruned.
- The local and remote `requirements/agent-org-display-name-stability` branches were deleted only after merge and release success.
- `personal`, `origin/personal`, and the published `v1.4.73` tag were retained.
