# GitHub Actions Desktop Release Setup

This workflow builds desktop artifacts from `autobyteus-web` and publishes them as GitHub Release assets in this repository.

## Workflow File

- `.github/workflows/release-desktop.yml`

## Trigger Behavior

- Trigger type: `push` on version tags only
- Pattern: `v*`
- Also supports manual run via GitHub Actions `workflow_dispatch`

Example trigger:

```bash
git tag v1.2.0
git push origin v1.2.0
```

## Current Targets

This workflow currently builds and publishes:

- macOS Apple Silicon (ARM64) on `macos-14`
- macOS Intel x64 on `macos-14`
- Linux x64 AppImage on `ubuntu-22.04`
- Windows x64 installer on `windows-2022`

CI build behavior:

- `AUTOBYTEUS_BUILD_FLAVOR=personal` is set in release build jobs.
- Release preparation validates:
  - desktop package version matches the pushed tag
  - messaging gateway package version matches the pushed tag
  - bundled managed messaging release manifest matches the pushed tag
- macOS builds run with `--arm64` and `--x64` explicitly.
- `NO_TIMESTAMP=1` is enabled for macOS build stability.
- Apple signing/notarization is enabled when required secrets are configured.

## Publish Behavior

On each matching tag, the workflow:

1. Resolves release metadata and validates release-tag/package consistency
2. Builds desktop files into `autobyteus-web/electron-dist`
3. Uploads per-platform artifacts with `actions/upload-artifact`
4. Downloads artifacts in `publish-release`
5. Merges ARM64 + x64 `latest-mac.yml` files into one canonical updater manifest
6. Publishes final assets to the tag release using `softprops/action-gh-release`

Published file patterns:

- `**/*.dmg`
- `**/*.dmg.blockmap`
- `**/*.zip`
- `**/*.zip.blockmap`
- `**/*.exe`
- `**/*.AppImage`
- `**/*.AppImage.blockmap`
- `release-artifacts/latest-mac.yml`
- `**/latest-linux.yml`
- `**/latest.yml`

## Optional Apple Signing/Notarization Secrets

If omitted, macOS build still runs but output is unsigned and not notarized.

- `APPLE_CERTIFICATE_P12_BASE64` (base64 of your `Developer ID Application` `.p12`)
- `APPLE_CERTIFICATE_P12_PASSWORD`
- `APPLE_SIGNING_IDENTITY`
- `APPLE_ID`
- `APPLE_APP_SPECIFIC_PASSWORD`
- `APPLE_TEAM_ID`

## Local Build Commands

```bash
cd /Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-web
pnpm build:electron:mac -- --arm64
pnpm build:electron:mac -- --x64
pnpm build:electron:linux
pnpm build:electron:windows
```
