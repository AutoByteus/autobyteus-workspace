# Release Workflow Status - 2026-05-29

## Release

- Version/tag: `v1.3.33`
- Release commit: `d56a12376f996228551c3ce68abfa7322f4ba950`
- Annotated tag object: `ae8350cb63aebf675606bfee4144ca58a65187f1`
- GitHub Release URL: https://github.com/AutoByteus/autobyteus-workspace/releases/tag/v1.3.33
- GitHub Release published at: `2026-05-29T19:54:43Z`
- Draft: `false`
- Prerelease: `false`

## Release Helper

Command run from `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo`:

```bash
pnpm release 1.3.33 -- --release-notes tickets/done/file-explorer-performance-analysis/release-notes.md
```

Result:

- Updated `autobyteus-web/package.json`: `1.3.32` -> `1.3.33`.
- Updated `autobyteus-message-gateway/package.json`: `1.3.32` -> `1.3.33`.
- Synced curated release notes to `.github/release-notes/release-notes.md`.
- Synced managed messaging release manifest to `v1.3.33`.
- Created release commit `d56a12376f996228551c3ce68abfa7322f4ba950`.
- Created and pushed annotated tag `v1.3.33`.
- Pushed `personal` to `origin/personal`.

## Workflow Results

All tag-triggered release workflows completed successfully:

| Workflow | Run ID | Result | URL |
| --- | ---: | --- | --- |
| Desktop Release | `26658886218` | `completed / success` | https://github.com/AutoByteus/autobyteus-workspace/actions/runs/26658886218 |
| Android APK Release | `26658886237` | `completed / success` | https://github.com/AutoByteus/autobyteus-workspace/actions/runs/26658886237 |
| Release Messaging Gateway | `26658886217` | `completed / success` | https://github.com/AutoByteus/autobyteus-workspace/actions/runs/26658886217 |
| Server Docker Release | `26658886253` | `completed / success` | https://github.com/AutoByteus/autobyteus-workspace/actions/runs/26658886253 |

## Published Assets Observed On GitHub Release

- `autobyteus-message-gateway-1.3.33-node-generic.tar.gz`
- `autobyteus-message-gateway-1.3.33-node-generic.tar.gz.json`
- `autobyteus-message-gateway-1.3.33-node-generic.tar.gz.sha256`
- `AutoByteus_personal_android-1.3.33-release.apk`
- `AutoByteus_personal_android-1.3.33-release.apk.sha256`
- `AutoByteus_personal_linux-1.3.33.AppImage`
- `AutoByteus_personal_macos-arm64-1.3.33.dmg`
- `AutoByteus_personal_macos-arm64-1.3.33.dmg.blockmap`
- `AutoByteus_personal_macos-arm64-1.3.33.zip`
- `AutoByteus_personal_macos-arm64-1.3.33.zip.blockmap`
- `AutoByteus_personal_macos-x64-1.3.33.dmg`
- `AutoByteus_personal_macos-x64-1.3.33.dmg.blockmap`
- `AutoByteus_personal_macos-x64-1.3.33.zip`
- `AutoByteus_personal_macos-x64-1.3.33.zip.blockmap`
- `AutoByteus_personal_windows-1.3.33.exe`
- `latest-linux.yml`
- `latest-mac.yml`
- `latest.yml`
- `release-manifest.json`
