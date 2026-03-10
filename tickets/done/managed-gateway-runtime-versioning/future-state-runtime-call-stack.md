# Future-State Runtime Call Stack

- Ticket: `managed-gateway-runtime-versioning`
- Version: `v1`
- Last Updated: `2026-03-10`

## Section 1: Release Helper Synchronizes Gateway Runtime Version

### Use Cases

- `UC-002`: Fresh enable later installs the synchronized runtime identity.
- `UC-003`: Release engineer cuts a synchronized workspace release.

### Call Stack

1. Engineer runs `pnpm release X.Y.Z -- --release-notes ...`.
2. `scripts/desktop-release.sh:run_release(...)`
   - validates branch, clean worktree, and requested release version
   - updates `autobyteus-web/package.json` to `X.Y.Z`
   - updates `autobyteus-message-gateway/package.json` to `X.Y.Z`
   - syncs curated release notes
   - runs `node autobyteus-message-gateway/scripts/build-runtime-package.mjs --sync-manifest-only --release-tag vX.Y.Z`
3. `autobyteus-message-gateway/scripts/build-runtime-package.mjs`
   - reads synchronized gateway package manifest
   - calls `release-manifest.mjs:resolveReleaseMetadata(...)`
   - calls `release-manifest.mjs:buildReleaseManifest(...)`
4. `autobyteus-message-gateway/scripts/release-manifest.mjs`
   - emits bundled manifest row with:
     - `serverVersion` from `autobyteus-server-ts/package.json`
     - `releaseTag = vX.Y.Z`
     - `artifactVersion = X.Y.Z`
5. `scripts/desktop-release.sh`
   - stages desktop package version, gateway package version, release notes, and bundled manifest
   - commits and tags `vX.Y.Z`

### Expected Outcome

- The committed/tagged revision contains a release-synchronized gateway runtime version and manifest.

## Section 2: Runtime Install / Update Consumes Synchronized Artifact Version

### Use Cases

- `UC-001`: User clicks `Update Runtime`.
- `UC-002`: User enables managed messaging on a fresh install.

### Call Stack

1. User triggers `enableManagedMessagingGateway` or `updateManagedMessagingGateway`.
2. `ManagedMessagingGatewayService.enable()` or `.update()`
   - reads current server version
   - resolves compatible descriptor through `MessagingGatewayReleaseManifestService.resolveArtifact(...)`
3. Bundled manifest descriptor returns:
   - `releaseTag = vX.Y.Z`
   - `artifactVersion = X.Y.Z`
4. `MessagingGatewayInstallerService.ensureInstalled(descriptor)`
   - computes install path under `extensions/messaging-gateway/versions/X.Y.Z`
   - computes cached archive path from the download URL whose basename now also includes `X.Y.Z`
   - downloads and verifies checksum only when `X.Y.Z` is not already installed
5. `ManagedMessagingGatewayService`
   - compares previous active version against `descriptor.artifactVersion`
   - installs/starts the new runtime when previous version differs
   - preserves restart-only behavior when previous version is already `X.Y.Z`

### Expected Outcome

- Runtime update/install semantics remain version-based, but the version always advances with the release that published the runtime.

## Section 3: Release Workflow Rejects Drift Before Publication

### Use Cases

- `UC-003`: Release engineer cuts a new workspace release.
- `UC-005`: CI blocks drift before publication.

### Call Stack

1. Tag `vX.Y.Z` triggers `.github/workflows/release-messaging-gateway.yml`.
2. Workflow `prepare-release` job:
   - resolves tag/ref metadata
   - checks out tagged revision
   - validates `autobyteus-web/package.json` version equals `X.Y.Z`
   - validates `autobyteus-message-gateway/package.json` version equals `X.Y.Z`
   - runs manifest drift validation command against `vX.Y.Z`
3. If any validation fails:
   - workflow stops before runtime package build/publication
   - release assets are not published with stale gateway metadata
4. If validation passes:
   - workflow builds runtime package
   - runtime asset filenames include `X.Y.Z`
   - assets publish to GitHub Release `vX.Y.Z`

### Expected Outcome

- Bad releases fail before managed gateway assets are published, so users do not receive a stale runtime identity under a newer release tag.

## Section 4: UI Presents Aligned Runtime Identity

### Use Cases

- `UC-004`: UI shows runtime identity that matches actual update/install behavior.

### Call Stack

1. UI requests managed gateway status.
2. GraphQL status returns:
   - `activeVersion = X.Y.Z`
   - `installedVersions` includes `X.Y.Z`
   - `releaseTag = vX.Y.Z`
3. `ManagedGatewayRuntimeCard.vue`
   - renders runtime state
   - shows active version and release tag values that now refer to the same synchronized release generation

### Expected Outcome

- The UI no longer shows a stale gateway runtime version next to a newer release tag in the normal release path.

## Error Paths

- `EP-001`: Release helper fails before tagging when version sync or manifest sync command fails.
- `EP-002`: Release workflow fails before publication when desktop version, gateway version, or bundled manifest drift from the tag.
- `EP-003`: Runtime update continues to rollback to the previous installed version when install/start of a newer synchronized runtime fails.

## Acceptance Coverage

| Acceptance Criteria ID | Covered Section(s) |
| --- | --- |
| `AC-001` | `Section 1`, `Section 3` |
| `AC-002` | `Section 2` |
| `AC-003` | `Section 2` |
| `AC-004` | `Section 3` |
| `AC-005` | `Section 4` |
| `AC-006` | `Section 2`, `Error Paths` |
