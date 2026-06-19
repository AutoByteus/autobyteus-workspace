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
- Linux ARM64 AppImage on `ubuntu-24.04-arm`
- Windows x64 installer on `windows-2022`

CI build behavior:

- `AUTOBYTEUS_BUILD_FLAVOR=personal` is set in release build jobs.
- Release preparation validates:
  - desktop package version matches the pushed tag
  - messaging gateway package version matches the pushed tag
  - bundled managed messaging release manifest matches the pushed tag
- macOS builds run with `--arm64` and `--x64` explicitly.
- macOS builds validate the packaged Terminal runtime for both architectures. The validator checks staged `autobyteus-web/resources/server` and final `.app/Contents/Resources/server` `node-pty` helpers, and runs a real spawn probe when the runner architecture matches the target.
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
- `release-artifacts/latest-mac.yml`
- `**/latest-linux*.yml`
- `**/latest.yml`

Linux AppImage blockmaps are embedded in the AppImage and validated through
numeric `blockMapSize` entries in `latest-linux.yml` and
`latest-linux-arm64.yml`; standalone `*.AppImage.blockmap` files are not
published. macOS DMG/ZIP blockmap assets remain standalone release files.

### Cross-Workflow Release Timing

The desktop, Android, messaging-gateway, and server Docker workflows are all
triggered by the same `v*` tag. The GitHub Release is shared across asset
families, so another publish job can make the release visible before
`release-desktop.yml` has uploaded the desktop updater metadata and binaries.

Until the Desktop Release workflow completes, updater checks can legitimately
encounter missing `latest-mac.yml`, `latest-linux.yml`, `latest-linux-arm64.yml`, `latest.yml`, missing
ZIP/AppImage/installer assets, or other provider metadata gaps. The desktop app
classifies those failures as `release-preparing` and shows safe retry copy while
keeping raw provider diagnostics in Electron logs.

Operationally, treat release-time updater errors as incomplete deployment until
the desktop workflow has finished and the published release contains all file
patterns above. A separate release-orchestration improvement would be required
to prevent the public/latest release from being visible before desktop updater
assets are ready.

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
pnpm build:electron:linux       # native Linux host architecture
pnpm build:electron:linux:x64   # native Linux x64 host/runner
pnpm build:electron:linux:arm64 # native Linux ARM64 host/runner
pnpm build:electron:windows
```

After a local macOS package build, validate the Terminal native runtime before handing the package to a tester:

```bash
node scripts/verify-packaged-terminal-runtime.mjs \
  --server-root resources/server \
  --platform darwin \
  --arch x64

APP_SERVER_ROOT="$(find electron-dist -path '*/AutoByteus.app/Contents/Resources/server' -type d -print -quit)"
node scripts/verify-packaged-terminal-runtime.mjs \
  --server-root "$APP_SERVER_ROOT" \
  --platform darwin \
  --arch x64 \
  --spawn-probe
```

Use `--arch arm64` for an Apple Silicon package. The spawn probe is meaningful only when the local host matches the target architecture; otherwise rely on the static packaged-runtime checks and the matching GitHub Actions job.
