# Investigation Notes - Fix Server Docker Build

- Date: 2026-03-01
- Ticket: `fix-server-docker-build`

## Sources Consulted

- `autobyteus-server-ts/docker/Dockerfile.monorepo`
- `autobyteus-server-ts/package.json`
- `pnpm-workspace.yaml`
- `pnpm-lock.yaml`
- Docker build error logs (from previous turn)

## Key Findings

- The `Dockerfile.monorepo` explicitly tries to `COPY repository_prisma` from the monorepo root, which fails because the directory is missing.
- `autobyteus-server-ts/package.json` lists `repository_prisma` as a regular dependency (`^1.0.6`).
- `autobyteus-ts` is a workspace dependency (`workspace:*`).
- The build process in `Dockerfile.monorepo` uses `builder` and `runtime` stages.
- `builder` stage:
    - Installs dependencies using `pnpm`.
    - Generates Prisma client.
    - Builds `autobyteus-server-ts`.
- `runtime` stage:
    - Copies built artifacts and `node_modules`.
    - Starts the server with `supervisord`.

## Constraints

- The Docker build context is the monorepo root (checked in `build.sh`).
- We must copy all necessary workspace packages for `pnpm install` to work correctly in the container.

## Open Unknowns

- Are there any other missing directories or invalid `COPY` commands in `Dockerfile.monorepo`?
- Does `pnpm install` in the container require access to private registries for `repository_prisma`? (Lockfile check should confirm this).

## New Findings (2026-03-01 Re-entry)

- **`repository_prisma` is NOT in `pnpm-workspace.yaml`**: The workspaces only include `autobyteus-web`, `autobyteus-server-ts`, `autobyteus-ts`, and `autobyteus-message-gateway`.
- **`repository_prisma` is a standard npm dependency**: `autobyteus-server-ts/package.json` lists `"repository_prisma": "^1.0.6"`.
- **`pnpm-lock.yaml` confirmation**: `repository_prisma` is resolved as a remote package (likely from a private or public npm registry, or GitHub Packages). It is *not* linked to a local directory in the superrepo.
- **Docker build impact**: The existing `Dockerfile.monorepo` and `build.sh` contain legacy logic that assumes `repository_prisma` is a sibling directory. This assumption is obsolete.
- **Simplified Build Requirement**: Only `autobyteus-ts` (workspace dependency) and `autobyteus-server-ts` itself are needed from the local file system during the Docker build.

## New Findings (2026-03-01 Re-entry - Source Code Review)

- **`index.ts` changes are REDUNDANT**: The original `supervisor-autobyteus-server.conf` was already configured to run `node dist/app.js`.
- **`app.ts` execution logic**: `app.ts` contains the logic to call `startServer()` when it is executed directly (`import.meta.url === modulePath`).
- **Initial failure reason**: The server appeared to fail during my testing because I was targeting `dist/index.js` (the package main) instead of `dist/app.js` (the execution entrypoint), and because of path mismatches in my new `entrypoint.sh` and `Dockerfile`.
- **Correct fix approach**: Revert `src/index.ts` to its original state. Ensure `supervisor-autobyteus-server.conf` and `entrypoint.sh` consistently target `dist/app.js`. Fix paths in `entrypoint.sh` without forcing `/app` if the base image expects something else (though `/app` seems correct for the monorepo structure).

## New Findings (2026-03-01 Re-entry 3 - Variant Support)

- **Base image has `zh` variant**: `autobyteus/chrome-vnc:zh` exists and includes Chinese input support.
- **Current build is hardcoded**: `Dockerfile.monorepo` hardcodes `FROM autobyteus/chrome-vnc:latest`.
- **Build scripts lack variant support**: `build.sh` and `build-multi-arch.sh` do not currently accept a variant parameter to switch the base image or tag the output accordingly.
- **Support Strategy**: 
    - Add `ARG BASE_IMAGE_TAG=latest` to `Dockerfile.monorepo`.
    - Update `build.sh` to accept `--variant` and pass it as a build argument.
    - Update `build-multi-arch.sh` to support variants and tag output as `autobyteus-server:latest-zh` or similar if needed (or just use the variant tag).

## New Findings (2026-03-01 Re-entry 4 - Unified Startup Script)

- **Existing management script**: `scripts/personal-docker.sh` provides a good model for port collision safety and multi-instance management using Docker Compose project names.
- **Unified Script Strategy**:
    - Create `autobyteus-server-ts/docker/manage-server.sh`.
    - Support commands: `up`, `down`, `logs`, `ps`.
    - Support flags: `--variant <v>`, `--project <name>`, `--no-build`.
    - Automatic port detection: Use a python snippet (like in `personal-docker.sh`) to find available ports if they are not explicitly provided.
    - Persistence: Store mapped ports in a project-specific `.env` file under a hidden runtime directory to ensure subsequent runs of the same project reuse the same ports.
    - Instance Isolation: Use different project names to allow multiple parallel instances.

## New Findings (2026-03-01 Final Re-entry - Hybrid Strategy)

- **Push logic is REQUIRED**: The user needs the ability to build and push to Docker Hub.
- **Runtime sync is REQUIRED**: The user wants to preserve the "earlier supported modes", which includes optional Git sync at startup.
- **Hybrid Strategy**:
    - **Restore `bootstrap.sh`**: Bring back the script but keep the `SKIP_SYNC` safety check.
    - **Restore `--push` in build scripts**: Update `build.sh` and `build-multi-arch.sh` to correctly handle registry uploads.
    - **Keep `docker-start.sh` improvements**: Preserve the project isolation and port detection logic.
    - **Environment Flexibility**: Ensure `.env.example` and `docker-compose.yml` support both local-only and remote-sync modes.

## Triage (Refined)

- Scope: `Small`.
- Action: Restore missing functionalities and integrate with the new management script.
