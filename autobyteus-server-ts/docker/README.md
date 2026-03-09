# AutoByteus Server Docker

This is the Docker stack for `autobyteus-server-ts`.
It was moved from `autobyteus_dev_docker/server-only` so the runtime config
now lives with the TypeScript server codebase.

This setup runs `autobyteus-server-ts` in Docker.
It automatically clones and builds the required workspace dependencies:

- `autobyteus-server-ts`
- `autobyteus-ts`

## Quick Start

The easiest way to build and start the server is using the `docker-start.sh` script. It automatically detects available ports to avoid collisions and supports multiple isolated instances.

```bash
cd autobyteus-server-ts/docker

# Start default server (builds if needed)
./docker-start.sh up

# Start Chinese (zh) variant
./docker-start.sh up --variant zh

# Start multiple isolated instances
./docker-start.sh up --project instance-1
./docker-start.sh up --project instance-2
```

The script saves the assigned ports for each project in a hidden `.runtime/` folder, ensuring consistent mapping.

## Management Commands

- `./docker-start.sh ps`: Show running instances and their names.
- `./docker-start.sh logs`: Tail logs for an instance.
- `./docker-start.sh ports`: Show mapped ports and URLs for an instance.
- `./docker-start.sh down`: Stop an instance.
- `./docker-start.sh down --delete-state`: Stop and remove saved port configuration.

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
- Pushes Docker tags to Docker Hub.
- Stable releases publish both `<image>:<version>` and `<image>:latest`.
- Prereleases such as `v1.2.3-rc1` publish only `<image>:1.2.3-rc1`.

Required GitHub repository secrets:

- `DOCKERHUB_USERNAME`
- `DOCKERHUB_TOKEN`

Optional GitHub repository variable:

- `DOCKERHUB_IMAGE_NAME`

Default image name:

- `autobyteus/autobyteus-server`

Manual republish:

- Run the `Server Docker Release` workflow with `workflow_dispatch`.
- Provide `release_tag` and optionally `image_name` if you want to override the default repository.

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

Server data directory in container: `/home/autobyteus/data`
