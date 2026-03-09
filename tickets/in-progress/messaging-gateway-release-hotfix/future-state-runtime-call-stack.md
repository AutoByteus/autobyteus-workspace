# Future-State Runtime Call Stack

## UC-001 Build Runtime Package For Release Tag

1. `release-messaging-gateway.yml` resolves `release_tag=v1.2.31` and `release_ref`.
2. Workflow checks out fixed code from the selected ref.
3. `node autobyteus-message-gateway/scripts/build-runtime-package.mjs --release-tag v1.2.31` runs.
4. `build-runtime-package.mjs` resolves release metadata and builds the archive.
5. `writeReleaseManifest(...)` serializes the computed manifest through a defined helper path.
6. Runtime package artifacts are uploaded for publish.

## UC-002 Validate Desktop Manifest Guardrails

1. `build-runtime-package.mjs --sync-manifest-only --release-tag v1.2.31` writes the checked-in managed messaging manifest.
2. `build-runtime-package.mjs --check-release-manifest --release-tag v1.2.31` compares checked-in and expected manifest content.
3. The command exits successfully with no drift error.

## UC-003 Recover Existing Release Tag

1. Fixed code is pushed to `personal`.
2. `Release Messaging Gateway` is manually dispatched with `publish_release=true`, `release_tag=v1.2.31`, and `release_ref=personal`.
3. The workflow builds artifacts from fixed code and publishes them into the existing `v1.2.31` GitHub release.
