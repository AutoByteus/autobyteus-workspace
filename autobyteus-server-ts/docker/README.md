# AutoByteus Server Docker

This is the Docker stack for `autobyteus-server-ts`.
It was moved from `autobyteus_dev_docker/server-only` so the runtime config
now lives with the TypeScript server codebase.

This setup runs `autobyteus-server-ts` in Docker.
It automatically clones and builds the required workspace dependencies:

- `autobyteus-server-ts`
- `autobyteus-ts`

The runtime image also ships with:

- Codex CLI
- Claude Code

## Quick Start

The easiest way to start the server is using the `docker-start.sh` script. It automatically detects available ports to avoid collisions and supports multiple isolated instances.

```bash
cd autobyteus-server-ts/docker

# Start default server (builds locally by default)
./docker-start.sh up

# Start Chinese (zh) variant
./docker-start.sh up --variant zh

# Start from the published remote release image instead of building locally
./docker-start.sh up --pull-remote

# Start multiple isolated instances
./docker-start.sh up --project instance-1
./docker-start.sh up --project instance-2
```

The script saves the assigned ports for each project in a hidden `.runtime/` folder, ensuring consistent mapping.

## CLI Auth Model

Codex CLI and Claude Code are preinstalled in the image. The intended auth flow is:

1. start the container,
2. open the container environment through terminal/noVNC,
3. log in inside the container with:
   - `codex login`
   - `claude auth login`

The container runs as `root`, and `/root` is persisted in a Docker-managed named volume per Compose project. That means:

- auth state is isolated per project/instance,
- auth state survives normal restart and recreate for the same project,
- auth state is removed if you explicitly remove the project's volumes.

Host credential folders are not mounted into the container by default.

## Management Commands

- `./docker-start.sh ps`: Show running instances and their names.
- `./docker-start.sh logs`: Tail logs for an instance.
- `./docker-start.sh ports`: Show mapped ports and URLs for an instance.
- `./docker-start.sh down`: Stop an instance.
- `./docker-start.sh down --delete-state`: Stop and remove saved port configuration.
- `./docker-start.sh up --pull-remote`: Pull the published Docker Hub release image, refresh the local compose alias if the remote digest is newer, and recreate the container only when needed.
- `./docker-start.sh up --build-local`: Explicit alias for the default local-build behavior.

## Release Image Refresh

The compose stack uses a local image name, `autobyteus-server:<tag>`, even when you want to consume the published Docker Hub release.

For release consumption, prefer:

```bash
cd autobyteus-server-ts/docker
./docker-start.sh up --pull-remote
```

That mode pulls `autobyteus/autobyteus-server:<tag>`, compares it against the local alias, retags the local compose image when the remote digest is newer, and force-recreates the container only when an update is actually needed.

If you are developing locally and want source changes to drive the container, use:

```bash
cd autobyteus-server-ts/docker
./docker-start.sh up
```

## Manual Build (Advanced)

If you only want to build the image without starting it:

```bash
./build.sh
./build.sh --variant zh
```

## Multi-Arch Release Image

For a publishable image that is fully built at image-build time, use the multi-arch script:

```bash
./build-multi-arch.sh --push
./build-multi-arch.sh --push --variant zh
```

Default target image is:

- `autobyteus/autobyteus-server:<version>-<variant>`
- `autobyteus/autobyteus-server:latest-<variant>`

## GitHub Release Automation

Workflow file: `.github/workflows/release-server-docker.yml`

What it does:
- Triggers on Git tags (e.g. `v1.2.3`).
- Builds `docker/Dockerfile.monorepo` for `linux/amd64,linux/arm64`.
- Push-tag releases publish only the default runtime image.
- Stable default releases publish:
  - `<image>:<version>`
  - `<image>:latest`
- Default prereleases such as `v1.2.3-rc1` publish:
  - `<image>:1.2.3-rc1`
- Manual `workflow_dispatch` runs can publish only the `zh` runtime variant by enabling `publish_zh`.
- Stable manual `zh` publishes use:
  - `<image>:<version>-zh`
  - `<image>:latest-zh`
- Manual `zh` prereleases use:
  - `<image>:1.2.3-rc1-zh`

Required GitHub repository secrets:

- `DOCKERHUB_USERNAME`
- `DOCKERHUB_TOKEN`

Optional GitHub repository variable:

- `DOCKERHUB_IMAGE_NAME`

Default image name:

- `autobyteus/autobyteus-server`

Manual republish:

- Run the `Server Docker Release` workflow with `workflow_dispatch`.
- Provide `release_tag`.
- Optionally provide `release_ref` if you need to rebuild an existing release tag from a different branch or SHA after a workflow-only fix.
- Optionally provide `image_name` if you want to override the default repository.
- Enable `publish_zh` when you want the manual run to publish the `zh` variant instead of the default image.

## Endpoints (Default)

- GraphQL: `http://localhost:8001/graphql`
- REST: `http://localhost:8001/rest/*`
- WS: `ws://localhost:8001/ws/...`
- VNC: `localhost:5908`
- noVNC: `http://localhost:6080`
- Chrome debug proxy: `localhost:9228`

## Data and Persistence

Named volumes (per project):
- `<project>_autobyteus-server-workspace`: built artifacts
- `<project>_autobyteus-server-data`: `.env`, SQLite DB, logs, media, memory
- `<project>_autobyteus-server-root-home`: in-container root home, including Codex/Claude auth state

Server data directory in container: `/home/autobyteus/data`

To reset Codex/Claude login for an instance, remove the project volumes:

```bash
./docker-start.sh down --volumes
```
