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

## Release Channels (Stable And Beta)

The tag decides who is offered a desktop build:

| Tag | GitHub release | Release notes | Offered in-app to |
| --- | --- | --- | --- |
| `vX.Y.Z` | Normal release, marked Latest | Curated `.github/release-notes/release-notes.md` | Every install |
| `vX.Y.Z-beta.N` | **Pre-release** | Generated GitHub notes | Only installs with "Receive beta updates" on |

- Any tag containing `-` is published as a GitHub pre-release. A manual
  dispatch with such a tag is also forced to pre-release, whatever the
  `prerelease` input says. GitHub's `/releases/latest` (the Stable update feed)
  therefore always points to the newest stable release.
- Pre-release tags always use generated notes. The curated notes file stays in
  the repository after each stable release, so reusing it would publish the
  previous stable's notes on a beta. The Android workflow, which writes the same
  GitHub release, follows the same rule.
- Beta builds use the same signing, notarization and verification gates as
  stable builds. electron-builder still writes `latest*.yml` updater metadata
  for `-beta.N` versions with the GitHub provider, so no metadata step differs.
- Create a beta with `scripts/desktop-release.sh beta` (next unused
  `-beta.N`, default base = next patch after the highest stable tag, `N`
  capped at 98 by the Android versionCode). Promote to stable with
  `scripts/desktop-release.sh release <X.Y.Z> --release-notes <file>`.
- The Android versionCode is `MAJOR*10000000 + MINOR*10000 + PATCH*100 +
  SUFFIX` (SUFFIX is the beta number or 99 for stable), so it allows
  patch <= 99, minor <= 999 and major <= 209. `release` and `beta` refuse any
  other version before committing or tagging. After `X.Y.99` the default
  beta base is the next minor (`1.4.99` → `1.5.0-beta.1`). `scripts/release_versions.py
  android-version-code` holds the same formula as `release-android.yml`, and
  `scripts/tests/test_release_channel_workflow_steps.py` checks that the two
  agree.
- The server Docker workflow publishes `:<version>` for every tag and `:latest`
  only for stable tags. After the version image is pushed, it moves `:beta` to
  that image only if the tag is the newest recognized release tag
  (`scripts/release_versions.py is-newest`), so `:beta` never moves backward.
  If a newer tag's Docker build fails, `:beta` stays one build behind until
  that run is re-run (`workflow_dispatch` with its `release_tag`).
- On the first real beta run, confirm the release is marked Pre-release, that
  GitHub "Latest" still points to the previous stable, and that the
  `latest*.yml` assets are present.

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
- macOS builds run with `--arm64` and `--x64` explicitly.
- macOS builds validate the packaged Terminal runtime for both architectures. The validator checks staged `autobyteus-web/resources/server` and final `.app/Contents/Resources/server` `node-pty` helpers, and runs a real spawn probe when the runner architecture matches the target.
- macOS builds run `scripts/verify-macos-signing-policy.mjs` for both ARM64 and x64 before artifact upload. The verifier requires Squirrel, ShipIt, frameworks, `.dylib` files, `.node` native modules, and bundled server native binaries to carry no entitlement keys, while the root app and Electron helper app executables keep their role-specific entitlements.
- `NO_TIMESTAMP=1` is enabled for macOS build stability.
- Apple signing/notarization secrets are required for release-grade macOS artifacts and for the signing-policy verifier to pass in the release workflow.

## Publish Behavior

On each matching tag, the workflow:

1. Resolves release metadata and validates release-tag/package consistency
2. Builds desktop files into `autobyteus-web/electron-dist`
3. Verifies macOS signing policy before macOS artifact upload
4. Uploads per-platform artifacts with `actions/upload-artifact`
5. Downloads artifacts in `publish-release`
6. Merges ARM64 + x64 `latest-mac.yml` files into one canonical updater manifest
7. Publishes final assets to the tag release using `softprops/action-gh-release`

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

### macOS Signing Gate

The macOS release jobs use AutoByteus' custom signing adapter from
`autobyteus-web/build/scripts/macSign.ts` instead of broad inherited child
entitlements. The gate is intentionally run after the signed app is produced and
before upload so a bad signing layout cannot become a downloadable updater source
app.

Expected release invariant:

- `AutoByteus.app/Contents/MacOS/AutoByteus` retains the root app entitlements.
- Electron helper app main executables retain only their helper entitlement
  profile.
- Non-app nested Mach-O code, including Squirrel, ShipIt, framework libraries,
  `.dylib` files, `.node` native modules, and bundled server native binaries, has
  no entitlement keys.

A manual `workflow_dispatch` with `publish_release=false` can be used to validate
a branch in the same signed macOS build environment without publishing a GitHub
Release.

### Cross-Workflow Release Timing

The desktop, Android, and server Docker workflows are all
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

For signed macOS packages, also validate the signing policy before handing the package to a tester or publishing it:

```bash
cd /Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-web
pnpm transpile-build
APP_BUNDLE="$(find electron-dist -path '*/AutoByteus.app' -type d -print -quit)"
node scripts/verify-macos-signing-policy.mjs --app "$APP_BUNDLE"
```

This verifier requires macOS `codesign` and a signed app. For already-installed
apps whose updater helper was signed incorrectly, the operational recovery is a
one-time install of a fixed DMG; once the installed source app has Squirrel and
ShipIt without entitlement keys, future auto-updates can run normally.
