# DR-003 Stable Release v1.4.72 Evidence

Recorded: 2026-09-21 (Europe/Berlin)

## Git and public release

- Canonical helper: `scripts/desktop-release.sh release 1.4.72` with the archived
  ticket's `release-notes.md`.
- Release commit:
  `8af2ec935028f9fe7bc912b6bd2b9552c625c253`.
- Annotated tag object:
  `6459cb99b13494a5cd19190254bbfa3aaabec13f`.
- Tag target:
  `8af2ec935028f9fe7bc912b6bd2b9552c625c253`.
- Public release:
  https://github.com/AutoByteus/autobyteus-workspace/releases/tag/v1.4.72
- Stable state: non-draft, non-prerelease, published 2026-09-21T14:39:39Z.
- Asset count: 21; every asset is nonempty.

## Successful tag-triggered workflows

| Workflow | Run URL |
| --- | --- |
| Server Docker Release | https://github.com/AutoByteus/autobyteus-workspace/actions/runs/35613381957 |
| Android APK Release | https://github.com/AutoByteus/autobyteus-workspace/actions/runs/35613381894 |
| iOS App Store Connect Release | https://github.com/AutoByteus/autobyteus-workspace/actions/runs/35613381871 |
| Desktop Release | https://github.com/AutoByteus/autobyteus-workspace/actions/runs/35613381858 |
| Release Messaging Gateway | https://github.com/AutoByteus/autobyteus-workspace/actions/runs/35613381691 |

Every workflow completed with `success` at head SHA `8af2ec935...`. The desktop
matrix succeeded for macOS x64/arm64, Windows x64, and Linux x64/arm64. No
manual recovery dispatch or tag mutation was needed.

## Public asset checks

Updater metadata declares `version: 1.4.72`. Referenced assets and GitHub sizes:

| Asset | Bytes |
| --- | ---: |
| `AutoByteus_personal_linux-arm64-1.4.72.AppImage` | 432,281,082 |
| `AutoByteus_personal_linux-x64-1.4.72.AppImage` | 444,731,961 |
| `AutoByteus_personal_macos-arm64-1.4.72.zip` | 496,619,975 |
| `AutoByteus_personal_macos-arm64-1.4.72.dmg` | 501,800,478 |
| `AutoByteus_personal_macos-x64-1.4.72.zip` | 518,259,620 |
| `AutoByteus_personal_macos-x64-1.4.72.dmg` | 523,946,478 |
| `AutoByteus_personal_windows-1.4.72.exe` | 320,648,795 |
| `AutoByteus_personal_android-1.4.72-release.apk` | 1,846,691 |
| `autobyteus-message-gateway-1.4.72-node-generic.tar.gz` | 47,787,196 |

Each updater-declared size matches release metadata. Android and Messaging
Gateway checksum sidecars are present; Messaging Gateway metadata and
`release-manifest.json` are present.

## Docker rollout

- Repository: `autobyteus/autobyteus-server`.
- `1.4.72` manifest digest:
  `sha256:c5bbd4b3b1f0b85f8b08803bb0389a5360a51c81f1e272fc2c00658e466f06f9`.
- `latest` manifest digest: identical.
- Active linux/amd64 image digest:
  `sha256:7b47683fe15db9c57d3f1b2b3e09379e3cd41db7f5c2932dc3ed5e48e18f87ca`.
- Active linux/arm64 image digest:
  `sha256:87152042b25452650548775f262f478f72471ad56cba032ce55a20a52844e322`.

## Qualification

The iOS workflow's successful terminal scope is build, implementation checks,
secret validation, archive, and upload to App Store Connect. Apple review and
storefront availability are external states and are not claimed.
