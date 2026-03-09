# Future-State Runtime Call Stack

## Use Case 1: Local Desktop Release Preparation

1. Operator runs `scripts/desktop-release.sh release <version>`.
2. `scripts/desktop-release.sh`
   - validates clean worktree and target branch,
   - updates `autobyteus-web/package.json` to `<version>`,
   - computes release tag `v<version>`,
   - invokes `node autobyteus-message-gateway/scripts/build-runtime-package.mjs --sync-manifest-only --release-tag v<version>`.
3. `build-runtime-package.mjs`
   - resolves desktop/server/gateway package versions,
   - builds the expected managed messaging release manifest for `v<version>`,
   - writes the synced manifest to `autobyteus-server-ts/src/managed-capabilities/messaging-gateway/release-manifest.json`,
   - exits without building runtime archives in manifest-only mode.
4. `scripts/desktop-release.sh`
   - stages `autobyteus-web/package.json`,
   - stages `autobyteus-server-ts/src/managed-capabilities/messaging-gateway/release-manifest.json`,
   - commits and tags the release.
5. Result:
   - tagged desktop release commit contains both the desktop version bump and the matching managed messaging manifest tag.

## Use Case 2: Desktop Release CI Validation

1. GitHub Actions starts `.github/workflows/release-desktop.yml` for tag `vX.Y.Z`.
2. Workflow validates `autobyteus-web/package.json` version matches `vX.Y.Z`.
3. Workflow runs `node autobyteus-message-gateway/scripts/build-runtime-package.mjs --check-release-manifest --release-tag vX.Y.Z`.
4. `build-runtime-package.mjs`
   - resolves the expected managed messaging manifest for `vX.Y.Z`,
   - reads the checked-in `autobyteus-server-ts/src/managed-capabilities/messaging-gateway/release-manifest.json`,
   - compares actual versus expected manifest content,
   - exits non-zero when they differ.
5. Workflow either:
   - continues into desktop packaging when the manifest matches, or
   - fails fast before producing installers when the manifest is stale.

## Use Case 3: End User Gateway Install After Fixed Release

1. User installs desktop release `vX.Y.Z`.
2. Bundled server contains `release-manifest.json` synced to `vX.Y.Z`.
3. User clicks `Install and Start Gateway`.
4. Managed messaging GraphQL mutation reaches `ManagedMessagingGatewayService.enable()`.
5. `MessagingGatewayReleaseManifestService.resolveArtifact()`
   - reads the bundled checked-in manifest,
   - resolves gateway download URLs for `vX.Y.Z`.
6. `MessagingGatewayInstallerService.ensureInstalled()`
   - downloads the gateway archive and checksum from `vX.Y.Z`,
   - verifies and extracts the artifact.
7. Gateway starts successfully because the release asset URLs are current and available.
