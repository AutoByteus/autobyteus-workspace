# Investigation Notes

- Date: `2026-03-09`
- Ticket: `release-server-dockerhub-publish`
- Investigator: `Codex`

## Summary

The superrepo already has an active root desktop release workflow and a reusable server Docker build path, but the only server Docker publish workflow currently lives under `autobyteus-server-ts/.github/workflows/`, which is not part of the superrepo's active root workflow set. The release process can be extended so every release also publishes the server image to Docker Hub with a small CI change.

## Current Release Entry Points

- Root release helper script: `scripts/desktop-release.sh`
  - `release` bumps `autobyteus-web/package.json`, commits, tags `vX.Y.Z`, and pushes the branch plus tag.
  - Evidence: `scripts/desktop-release.sh`, `README.md`.
- Active root GitHub Actions workflow: `.github/workflows/release-desktop.yml`
  - Triggers on `push.tags: v*` and `workflow_dispatch`.
  - Validates that `autobyteus-web/package.json` matches the release tag version.
  - Builds desktop artifacts and publishes a GitHub Release.
  - Evidence: `.github/workflows/release-desktop.yml`, `README.md`.

## Current Server Docker Build / Publish Assets

- Production-style server image Dockerfile exists:
  - `autobyteus-server-ts/docker/Dockerfile.monorepo`
  - It builds `autobyteus-ts` and `autobyteus-server-ts` from the monorepo and produces a runtime image based on `autobyteus/chrome-vnc`.
- Multi-arch local publish helper already exists:
  - `autobyteus-server-ts/docker/build-multi-arch.sh`
  - It supports `--push`, tags `<image>:<version>` and `<image>:latest`, and defaults to `autobyteus/autobyteus-server`.
- Server Docker documentation already describes GitHub release automation:
  - `autobyteus-server-ts/docker/README.md`
  - That documentation points to `.github/workflows/release-docker-image.yml`.

## Key Finding

- The only server Docker release workflow file is `autobyteus-server-ts/.github/workflows/release-docker-image.yml`.
- The active workflow directory at the superrepo root contains only `.github/workflows/release-desktop.yml`.
- Inference: the server Docker workflow was written for a standalone `autobyteus-server-ts` repository and is inert in this superrepo unless moved or re-created under the root `.github/workflows/`.

## Workflow Comparison

- Root desktop release workflow already resolves `release_tag`, `release_ref`, and `release_sha`, which are the same release metadata needed for Docker tagging.
- Existing server Docker workflow already contains the key publish logic:
  - Docker Hub login via `secrets.DOCKERHUB_USERNAME` and `secrets.DOCKERHUB_TOKEN`
  - multi-arch buildx publish
  - normalized Docker tag generation (`v1.2.3` -> `1.2.3`)
- The existing server workflow still contains standalone-repo assumptions:
  - extra checkouts of `AutoByteus/autobyteus-ts`
  - extra checkout of `repository_prisma`
  - ad hoc workspace file generation
- Those assumptions are unnecessary in this superrepo because `pnpm-workspace.yaml`, `package.json`, `autobyteus-ts`, and `autobyteus-server-ts` already exist at the repository root.

## Risks / Design Considerations

- Tag ownership mismatch:
  - release tags are currently enforced against `autobyteus-web/package.json`, not `autobyteus-server-ts/package.json`.
  - If the goal is "publish server image for every repo release", using the repo release tag for Docker image tags is coherent.
  - If the goal is "server semver must track server package.json", that is a separate release-model change.
- `latest` tagging policy:
  - the existing server workflow always publishes `latest` in addition to the release tag.
  - If prerelease tags such as `v1.2.7-rc1` should not move `latest`, that policy needs to be made explicit.
- Credential dependency:
  - Docker Hub publishing requires repository secrets that are not discoverable from code.

## Scope Triage

- Classification: `Small`
- Rationale:
  - the Docker build path already exists,
  - Docker Hub login/push logic already exists,
  - the missing piece is release-pipeline integration at the superrepo root plus release documentation and secret wiring.

## Recommended Direction

- Prefer a dedicated root workflow for server image release, triggered by the same release tag events as the desktop workflow.
- Keep it separate from `.github/workflows/release-desktop.yml` so desktop artifact publishing and server image publishing remain independently retryable and operationally decoupled.
- Reuse the existing Docker build/push logic, but simplify it for the monorepo root instead of preserving the standalone-repo checkout steps.

## Evidence Files

- `README.md`
- `scripts/desktop-release.sh`
- `.github/workflows/release-desktop.yml`
- `autobyteus-server-ts/docker/Dockerfile.monorepo`
- `autobyteus-server-ts/docker/build-multi-arch.sh`
- `autobyteus-server-ts/docker/README.md`
- `autobyteus-server-ts/.github/workflows/release-docker-image.yml`
