# Requirements

- status: Design-ready
- ticket: desktop-release-linux-macos-arm64
- branch: codex/desktop-release-linux-macos-arm64
- scope: Small
- scope-rationale: limited to CI workflow/build-script/docs updates; no new public API, storage, or cross-service architecture.

## Goal / Problem Statement
Ensure the personal desktop release pipeline reliably produces and publishes release artifacts for Linux and macOS Apple Silicon from this superrepo, with unsigned/non-notarized mac output allowed when Apple credentials are unavailable.

## In-Scope Use Cases
- `UC-REL-001` Personal release build creates macOS ARM64 artifact.
- `UC-REL-002` Personal release build creates Linux x64 artifact.
- `UC-REL-003` Publish step uploads both artifacts to the release assets for the tag.
- `UC-REL-004` Build remains successful when Apple Team ID is missing (notarization disabled).

## Requirement IDs And Expected Outcomes
- `REQ-REL-001` Personal flavor must be deterministic in CI release builds.
  - Expected outcome: release build jobs explicitly set build flavor to `personal`; artifact names use personal flavor.
- `REQ-REL-002` macOS release build target must be Apple Silicon only.
  - Expected outcome: CI mac build produces ARM64 DMG artifact without requiring Intel output.
- `REQ-REL-003` Linux release build target must produce installable artifact.
  - Expected outcome: CI linux build produces AppImage artifact.
- `REQ-REL-004` Release publish step must include outputs from both platform jobs.
  - Expected outcome: release upload glob/paths match produced DMG/AppImage + metadata files.
- `REQ-REL-005` Missing Apple Team ID must not block pipeline.
  - Expected outcome: notarization/signing are non-blocking and workflow succeeds without team ID.

## Acceptance Criteria (Testable)
- `AC-REL-001` Running release workflow for a tag yields at least one `*macos-arm64*.dmg` asset.
- `AC-REL-002` Running release workflow for a tag yields at least one `*linux*.AppImage` asset.
- `AC-REL-003` Publish job uploads both platform assets to the same GitHub release.
- `AC-REL-004` mac build does not require `APPLE_TEAM_ID`; build proceeds with notarization off.
- `AC-REL-005` Artifact upload patterns match real build output paths and do not fail with missing-file errors.
- `AC-REL-006` Local validation verifies workflow syntax and build target resolution changes (pre-merge evidence).

## Constraints / Dependencies
- Apple developer Team ID/certificates may be absent.
- CI runtime is GitHub Actions (`macos-14`, `ubuntu-22.04`).
- Build entry points:
  - `.github/workflows/release-desktop.yml`
  - `autobyteus-web/build/scripts/build.ts`

## Assumptions
- Release tags continue to follow `v*` pattern.
- Linux target remains AppImage.
- Superrepo GitHub Release page is the intended release destination.

## Open Questions / Risks
- Full proof of release asset visibility requires a real tag run in GitHub Actions after merge.

## Requirement Coverage Map
- `REQ-REL-001` -> `UC-REL-001`, `UC-REL-002`, `UC-REL-003`
- `REQ-REL-002` -> `UC-REL-001`
- `REQ-REL-003` -> `UC-REL-002`
- `REQ-REL-004` -> `UC-REL-003`
- `REQ-REL-005` -> `UC-REL-004`
