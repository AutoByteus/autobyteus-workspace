# GitHub Actions Desktop Release Setup

This workflow builds desktop artifacts from `autobyteus-web` and publishes them to the release repository `AutoByteus/autobyteus-desktop-releases`.

## Workflow File

- `.github/workflows/desktop-tag-build.yml`

## Trigger Behavior

- Trigger type: `push` on version tags only
- Patterns:
  - `v*.*.*` (recommended, example: `v1.2.0`)
  - `*.*.*` (example: `1.2.0`)
- Also supports manual run via GitHub Actions `workflow_dispatch`
  - Required input: `release_tag` (example: `v1.2.0`)

Example trigger:

```bash
git tag v1.2.0
git push origin v1.2.0
```

Manual trigger:

1. Open `Actions` in `AutoByteus/autobyteus-web`
2. Select workflow `Desktop Release Publish (macOS arm64 + Linux x64)`
3. Click `Run workflow`
4. Provide `release_tag` and run

## Current Targets

This workflow currently builds and publishes two platforms:

- macOS Apple Silicon (`macos-15`) -> `pnpm build:electron:mac`
- Linux AMD64 (`ubuntu-24.04`) -> `pnpm build:electron:linux`
- CI build currently forces:
  - `NO_TIMESTAMP=1`
  - `APPLE_TEAM_ID=""`
  - This keeps notarization disabled for the initial release workflow validation.

Windows and macOS Intel can be added later.

## Publish Behavior

On each matching tag, the workflow:

1. Builds desktop files into `autobyteus-web/electron-dist`
2. Uploads those files as an Actions artifact
3. Creates (or reuses) release tag `<tag>` in `AutoByteus/autobyteus-desktop-releases`
4. Uploads final installer artifacts only (`.dmg` and `.AppImage`) with `--clobber`

## Required Secrets (`autobyteus-web` repo)

1. `CI_REPO_READ_TOKEN`
- Purpose: checkout `AutoByteus/autobyteus-server-ts` during build
- Minimum access: read access to `AutoByteus/autobyteus-server-ts`

2. `DESKTOP_RELEASES_TOKEN`
- Purpose: create/update GitHub Releases in `AutoByteus/autobyteus-desktop-releases`
- Minimum access: write access to `AutoByteus/autobyteus-desktop-releases`
- For classic PAT: `repo` scope is sufficient

## Optional Apple Signing/Notarization Secrets

If omitted, macOS build can still run but will be unsigned and not notarized.
Even if configured, the current workflow intentionally overrides `APPLE_TEAM_ID` to empty for initial stable rollout.

- `APPLE_SIGNING_IDENTITY`
- `APPLE_ID`
- `APPLE_APP_SPECIFIC_PASSWORD`
- `APPLE_TEAM_ID`

## Important Prerequisite for Release Repo

`AutoByteus/autobyteus-desktop-releases` must be initialized (have a default branch and at least one commit). If it is empty, the workflow fails early with a clear error.

## Build Locally, Then Publish to Release Repo (Supported)

Yes, this is possible.

1. Build locally:

```bash
cd /Users/normy/autobyteus_org/autobyteus-web
pnpm build:electron:mac
# or
pnpm build:electron:linux
```

2. Create or reuse release tag in target repo:

```bash
TAG=v1.2.0
TARGET_REPO=AutoByteus/autobyteus-desktop-releases
gh release view "$TAG" -R "$TARGET_REPO" >/dev/null 2>&1 || \
  gh release create "$TAG" -R "$TARGET_REPO" --title "AutoByteus Desktop $TAG" --notes "Manual desktop release"
```

3. Upload built files:

```bash
gh release upload "$TAG" \
  /Users/normy/autobyteus_org/autobyteus-web/electron-dist/* \
  -R "$TARGET_REPO" --clobber
```

You need `gh` authentication that has write access to `AutoByteus/autobyteus-desktop-releases`.
