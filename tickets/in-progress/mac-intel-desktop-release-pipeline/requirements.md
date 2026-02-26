# Requirements

- Status: `Design-ready`
- Ticket: `mac-intel-desktop-release-pipeline`
- Scope Triage: `Small`
- Triage Rationale: focused workflow yaml change + GitHub verification.

## Goal / Problem Statement

Ensure desktop release pipeline builds and publishes macOS Intel (`x64`) desktop artifact so Intel Mac users can run the app.

## In-Scope Use Cases

- `UC-001`: Workflow run builds macOS ARM64 artifact.
- `UC-002`: Workflow run builds macOS Intel x64 artifact.
- `UC-003`: Tag-triggered release includes macOS Intel x64 asset.

## Requirements

- `REQ-001`: Desktop release workflow must include a dedicated macOS Intel build job.
- `REQ-002`: Publish job must include Intel job in dependencies before release publishing.
- `REQ-003`: Workflow must upload Intel artifacts from the Intel build job.
- `REQ-004`: Validation must prove Intel file generation through GitHub pipeline query evidence.

## Acceptance Criteria

- `AC-001`: Running `Desktop Release` workflow on the feature branch generates an artifact named for macOS x64.
- `AC-002`: Workflow definition includes macOS Intel x64 build lane and publish dependency path (`publish-release.needs` includes `build-macos-x64`).
- `AC-003`: GitHub query evidence (`gh`) confirms the Intel artifact/asset exists.

## Constraints / Dependencies

- GitHub Actions hosted mac runner availability; validated on `macos-14` with explicit `--x64` build.
- Existing build script supports `pnpm build:electron:mac -- --x64`.

## Assumptions

- `macos-13` runner maps to Intel architecture for this workflow.

## Open Questions / Risks

- None.

## Requirement Coverage Map

- `REQ-001` -> `UC-002`
- `REQ-002` -> `UC-003`
- `REQ-003` -> `UC-002`
- `REQ-004` -> `UC-002`, `UC-003`

## AC Coverage Map

- `AC-001` -> `SCN-001`
- `AC-002` -> `SCN-002`
- `AC-003` -> `SCN-001`, `SCN-002`
