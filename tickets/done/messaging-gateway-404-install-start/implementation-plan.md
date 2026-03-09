# Implementation Plan

## Scope

- Scope classification: `Small`
- Goal: prevent desktop releases from shipping a stale managed messaging release manifest that points to older GitHub release assets.

## Design Basis

- Reuse `autobyteus-message-gateway/scripts/build-runtime-package.mjs` as the single source of truth for managed messaging release-manifest content.
- Add lightweight script modes so release preparation can:
  - sync the checked-in manifest without building/publishing the runtime package,
  - validate that the checked-in manifest already matches the intended release tag.
- Update desktop release preparation to sync the checked-in manifest before commit/tag creation.
- Update desktop release CI to fail early when the checked-in manifest tag drifts from the release tag.

## Planned Changes

1. `autobyteus-message-gateway/scripts/build-runtime-package.mjs`
   - Add lightweight manifest-only sync/check modes.
   - Centralize expected manifest generation so the full runtime packaging path and manifest-only path cannot drift.

2. `scripts/desktop-release.sh`
   - Sync the checked-in managed messaging manifest to the target desktop release tag during `release <version>`.
   - Stage the synced manifest in the release commit together with `autobyteus-web/package.json`.

3. `.github/workflows/release-desktop.yml`
   - Add a validation step that fails the desktop release when the checked-in managed messaging manifest does not match the release tag.

## Validation Plan

- Run the manifest sync command locally for a sample release tag and verify the checked-in manifest updates to that tag.
- Run the manifest check command locally and verify it passes after sync.
- Run targeted workflow/static validation to ensure the desktop release workflow references the new check command correctly.

## Risks And Mitigations

- Risk: manifest-only logic diverges from the full packaging path.
  - Mitigation: use one manifest-generation path in `build-runtime-package.mjs`.
- Risk: release script changes stage unexpected files.
  - Mitigation: limit staged files to `autobyteus-web/package.json` and the managed messaging manifest.
