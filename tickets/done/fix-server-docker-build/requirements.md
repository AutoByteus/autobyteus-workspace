# Requirements - Fix Server Docker Build

- Status: `Design-ready`
- Ticket: `fix-server-docker-build`
- Triage: `Small`

## Goal / Problem Statement

Fix the broken `autobyteus-server-ts` Docker build while maintaining and improving its versatility. The system must support both local development (seamless, one-command, collision-free) and remote deployment (multi-arch, remote push to Docker Hub). It must also support optional runtime Git sync for "thin" environments.

## In-Scope Use Cases

- `UC-001`: Build and start server locally with a single command (`docker-start.sh`).
- `UC-002`: Automatic collision-free port detection for multiple local instances.
- `UC-003`: Build images for different variants (`default`, `zh`).
- `UC-004`: Push built images to a remote registry (Docker Hub).
- `UC-005`: Support optional runtime Git sync via `GITHUB_PAT`.

## Acceptance Criteria

- `AC-001`: Dockerfile correctly handles local monorepo dependencies.
- `AC-002`: `docker-start.sh` provides a one-command "build & start" experience.
- `AC-003`: Support for `--variant` (e.g., `zh`) is preserved in all scripts.
- `AC-004`: `build.sh` and `build-multi-arch.sh` support a `--push` flag for remote registry uploads.
- `AC-005`: `bootstrap.sh` is restored to support optional runtime Git sync.
- `AC-006`: Git credentials (`GITHUB_PAT`, etc.) are supported as optional environment variables.
- `AC-007`: Automatic port detection avoids collisions between multiple projects.
- `AC-008`: Redundant code from the old setup is cleaned up while preserving required features.

## Constraints / Dependencies

- Must work with `autobyteus/chrome-vnc` base image.
- Uses `pnpm` workspace structure.

## Assumptions

- User has `docker login` configured if using the `--push` flag.
- Default mode for local users skips runtime sync for speed.

## Open Questions / Risks

- None.
