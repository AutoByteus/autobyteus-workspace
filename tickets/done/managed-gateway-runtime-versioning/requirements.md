# Requirements

- Ticket: `managed-gateway-runtime-versioning`
- Status: `Design-ready`
- Last Updated: `2026-03-10`
- Scope: `Medium`

## Goal / Problem Statement

Managed messaging gateway runtime updates are currently not robust against versioning drift. The runtime updater, installer reuse logic, and runtime download-cache layout all treat `artifactVersion` as the canonical runtime identity. Release automation currently bumps only the workspace desktop app version and the bundled manifest release tag, but not `autobyteus-message-gateway/package.json`. As a result, a new workspace release can publish a new managed gateway runtime under a new release tag while update/install logic still treats the old installed runtime as current because `artifactVersion` never changed.

## In-Scope Use Cases

- `UC-001`: A user clicks `Update Runtime` and receives the latest compatible managed gateway runtime for the current server release without relying on a forgotten manual gateway version bump.
- `UC-002`: A user enables managed messaging on a fresh install and the server installs the correct compatible runtime identity on the first try.
- `UC-003`: A release engineer cuts a new workspace release and managed gateway runtime version metadata is synchronized automatically before the tag is published.
- `UC-004`: Managed messaging status in the UI exposes runtime version information that matches the updater’s install/activation identity.
- `UC-005`: CI fails fast when desktop version, gateway runtime version, and managed gateway manifest metadata drift from the release tag.

## Architecture Direction

- Selected direction: keep managed gateway install/update identity centered on `artifactVersion`, but synchronize `autobyteus-message-gateway/package.json` version to the workspace release version during the normal release flow.
- Rationale:
  - current installer directories, active-version state, install reuse checks, and cache naming already use `artifactVersion`
  - synchronizing gateway package version fixes all of those identity consumers together with minimal structural churn
  - automation removes the human-memory failure mode that caused the bug
  - release workflow validation can fail before publication instead of letting runtime drift reach users

## Triage Rationale

- `Medium` scope is required because the fix spans:
  - release helper automation
  - GitHub workflow validation
  - managed gateway manifest generation
  - runtime update semantics and test coverage
  - user-facing runtime status presentation

## Requirements

- `R-001`
  - Expected outcome: Managed gateway install/update logic continues to use `artifactVersion` as its canonical runtime identity, and that identity changes whenever a new managed gateway runtime should be installed for a new workspace release.
- `R-002`
  - Expected outcome: Gateway runtime version synchronization must be automated in the normal release flow instead of relying on engineers to remember a separate manual version bump.
- `R-003`
  - Expected outcome: The bundled managed gateway manifest must be regenerated from synchronized release metadata before release publication.
- `R-004`
  - Expected outcome: The UI/status API must expose runtime version values that match the actual runtime install/update identity used by the server.
- `R-005`
  - Expected outcome: Existing checksum verification, install reuse, runtime startup, and rollback behavior remain intact after the versioning-model correction.
- `R-006`
  - Expected outcome: CI must reject a managed gateway release build when the workspace release tag, desktop package version, gateway package version, or bundled manifest drift.

## Acceptance Criteria

- `AC-001`
  - Expected outcome: After the release helper prepares version `X.Y.Z`, `autobyteus-message-gateway/package.json` is also `X.Y.Z`, and the generated managed gateway manifest points to runtime artifact version `X.Y.Z`.
- `AC-002`
  - Expected outcome: When `updateManagedMessagingGateway` sees a manifest descriptor whose `artifactVersion` is newer than the active installed runtime version, it installs or activates the newer runtime instead of treating the runtime as already current.
- `AC-003`
  - Expected outcome: When `updateManagedMessagingGateway` sees the same installed `artifactVersion`, it preserves current restart/recovery behavior and does not reinstall unnecessarily.
- `AC-004`
  - Expected outcome: Release automation or CI prevents publishing a new workspace release when gateway package version or managed gateway manifest metadata drift from the release tag.
- `AC-005`
  - Expected outcome: Managed messaging status and UI labels present the synchronized runtime version consistently for active and installed runtimes.
- `AC-006`
  - Expected outcome: Existing checksum verification and rollback-to-previous-runtime behavior still pass after the versioning change.

## Constraints / Dependencies

- Managed gateway runtime publication is already tied to workspace `v*` releases and should remain on that release lane.
- Managed gateway compatibility is currently resolved by server version and platform through the bundled manifest.
- The fix must not introduce long-lived dual version semantics, compatibility wrappers, or fallback branches kept only for old behavior.
- The normal `pnpm release ...` flow must remain the primary supported release path.

## Assumptions

- The desired product behavior is “latest compatible runtime for this server release,” not “latest runtime across all releases regardless of compatibility.”
- Aligning gateway runtime version with the workspace release version is acceptable because managed gateway runtime assets are published from the same release lane already.
- Existing installs under old runtime directories may remain on disk until replaced by a newly synchronized runtime version; no compatibility shim is required for closure.

## Open Questions / Risks

- `Q-001`: Should the UI continue showing both runtime version and release tag after they become synchronized, or should runtime version become the primary user-facing label?
- `Q-002`: Do we want an extra runtime-side drift error if a nonstandard release bypasses automation and still ships release-tag / artifact-version mismatch?

## Requirement Coverage Map

| Requirement ID | Use Case IDs |
| --- | --- |
| `R-001` | `UC-001`, `UC-002` |
| `R-002` | `UC-001`, `UC-003` |
| `R-003` | `UC-002`, `UC-003` |
| `R-004` | `UC-004` |
| `R-005` | `UC-001`, `UC-002` |
| `R-006` | `UC-003`, `UC-005` |

## Acceptance Criteria Coverage Map

| Acceptance Criteria ID | Planned Stage 7 Scenario IDs |
| --- | --- |
| `AC-001` | `AV-001` |
| `AC-002` | `AV-002` |
| `AC-003` | `AV-003` |
| `AC-004` | `AV-004` |
| `AC-005` | `AV-005` |
| `AC-006` | `AV-006` |
