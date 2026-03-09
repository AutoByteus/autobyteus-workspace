# Requirements

- Status: `Design-ready`
- Ticket: `release-server-dockerhub-publish`
- Scope Triage: `Small`

## Goal / Problem Statement

Extend the superrepo release process so that each repository release also builds the `autobyteus-server-ts` Docker image and publishes that image to Docker Hub from GitHub Actions.

## In-Scope Use Cases

- `UC-001`: A normal release tag push (`vX.Y.Z` or `vX.Y.Z-suffix`) triggers server image publishing from the superrepo.
- `UC-002`: A manual workflow run can re-publish the server image for an existing release tag without creating a new tag.
- `UC-003`: The published server image uses deterministic tags derived from the release tag so operators can pull the exact release image.
- `UC-004`: Docker Hub authentication and target repository configuration are supplied through repository secrets/inputs rather than hardcoded values.

## Requirements

- `REQ-001`: The superrepo must contain an active root GitHub Actions workflow path that builds the `autobyteus-server-ts` Docker image when the repository release tag is pushed.
  - Expected outcome: the workflow is discoverable from the root `.github/workflows/` directory and uses the monorepo checkout as its build context.
- `REQ-002`: The release-time server image build must reuse the existing monorepo Docker build path unless investigation proves it is not release-safe.
  - Expected outcome: the workflow uses `autobyteus-server-ts/docker/Dockerfile.monorepo` as the build file and repository root as Docker context.
- `REQ-003`: The release-time server image publish flow must authenticate to Docker Hub using GitHub repository secrets.
  - Expected outcome: Docker Hub credentials are read from secrets and are not embedded in source files.
- `REQ-004`: The server image publish flow must tag images deterministically from the release tag by stripping a leading `v`.
  - Expected outcome: release `v1.2.7` publishes at least `1.2.7`; prerelease `v1.2.7-rc1` publishes at least `1.2.7-rc1`.
- `REQ-005`: Stable releases must also publish a moving `latest` tag, while prerelease releases must not overwrite `latest`.
  - Expected outcome: `latest` only advances for non-prerelease release tags.
- `REQ-006`: The implementation must enumerate all external Docker Hub values the repository owner must provide before release publishing can succeed.
  - Expected outcome: required secrets, image repository name, and ownership assumptions are documented explicitly.

## Acceptance Criteria

- `AC-001`: A root workflow exists for server image publishing and is configured to run on release tag pushes that match the repository release process.
  - Expected outcome: pushing the same release tag that starts the desktop release flow also starts the server image flow.
- `AC-002`: The server image workflow uses `autobyteus-server-ts/docker/Dockerfile.monorepo` with repository root context and publishes a multi-arch image for `linux/amd64` and `linux/arm64`.
  - Expected outcome: the workflow definition contains the exact build/push configuration for the server image.
- `AC-003`: Release tag `vX.Y.Z` publishes Docker tags `<image>:X.Y.Z` and `<image>:latest`.
  - Expected outcome: stable releases produce both immutable and moving tags.
- `AC-004`: Release tag `vX.Y.Z-suffix` publishes `<image>:X.Y.Z-suffix` and does not publish `<image>:latest`.
  - Expected outcome: prerelease tags remain pullable without moving the stable default tag.
- `AC-005`: Manual workflow dispatch supports re-publishing an existing release tag and optionally overriding the target image name.
  - Expected outcome: operators have a recovery path without creating a new git tag.
- `AC-006`: The required Docker Hub setup values are documented.
  - Expected outcome: the repository owner knows which GitHub secrets and Docker Hub repository name must be created.

## Constraints / Dependencies

- The repository is a git monorepo with existing release automation that must be inspected before proposing changes.
- The current main worktree is dirty, so work must stay isolated to the dedicated ticket worktree.
- Docker Hub publishing depends on external credentials and repository naming that are not yet known from the repo alone.
- The existing active release workflow is rooted at `.github/workflows/release-desktop.yml`; nested workflow files under `autobyteus-server-ts/.github/workflows/` are not sufficient to activate publishing in the superrepo.

## Assumptions

- "Server Docker" refers to the deployable image for the `autobyteus-server-ts` service.
- "Each release" refers to the repository's existing release-tag flow driven by `scripts/desktop-release.sh` and root GitHub Actions tag triggers.
- Prerelease tags are identifiable by a hyphenated suffix after the semantic version and should not advance `latest`.

## Open Questions / Risks

- Docker Hub organization/repository naming, login method, and desired tag aliases are still unknown.
- If the intended image name differs from `autobyteus/autobyteus-server`, the workflow must expose that value as a configurable input or env default.
- If release owners want server versioning tied to `autobyteus-server-ts/package.json` instead of repo release tags, that is outside this ticket.

## Requirement Coverage Map

- `REQ-001` -> `UC-001`
- `REQ-002` -> `UC-001`
- `REQ-003` -> `UC-004`
- `REQ-004` -> `UC-001`, `UC-003`
- `REQ-005` -> `UC-001`, `UC-003`
- `REQ-006` -> `UC-004`

## Acceptance Criteria Coverage Map

- `AC-001` -> `SCN-001`
- `AC-002` -> `SCN-001`
- `AC-003` -> `SCN-001`
- `AC-004` -> `SCN-002`
- `AC-005` -> `SCN-003`
- `AC-006` -> `SCN-004`
