# AutoByteus Server Docker

This is the Docker stack for `autobyteus-server-ts`.
It was moved from `autobyteus_dev_docker/server-only` so the runtime config
now lives with the TypeScript server codebase.

This setup runs `autobyteus-server-ts` in Docker.
It automatically clones and builds the required workspace dependencies:

- `autobyteus-server-ts`
- `autobyteus-ts`
- `repository_prisma`

## What Changed

- No frontend in this container.
- Single service: TypeScript server on port `8000` (mapped to host `AUTOBYTEUS_BACKEND_PORT`, default `8001`).
- VNC-related ports are exposed for base-image desktop access:
  - VNC: container `5900` -> host `AUTOBYTEUS_VNC_PORT` (default `5908`)
  - noVNC: container `6080` -> host `AUTOBYTEUS_WEB_VNC_PORT` (default `6080`)
  - Chrome debug proxy: container `9223` -> host `AUTOBYTEUS_CHROME_DEBUG_PORT` (default `9228`)

## Quick Start

1. Copy env template:

```bash
cp .env.example .env
```

2. Set `GITHUB_PAT` in `.env` if repos are private.

3. Build and start:

```bash
./build.sh
./start.sh
```

4. Check logs:

```bash
docker compose logs -f autobyteus-server
```

## Rebuild After Base Image Update

If `autobyteus/chrome-vnc:latest` (or any Docker base layer) was updated, run:

```bash
cd autobyteus-server-ts/docker
test -f .env || cp .env.example .env
docker pull autobyteus/chrome-vnc:latest
docker compose down
./build.sh --no-cache
./start.sh
docker compose logs -f autobyteus-server
```

This keeps existing data volumes.

For a fully clean rebuild (remove cached source and server data too):

```bash
cd autobyteus-server-ts/docker
docker compose down --volumes --remove-orphans
docker pull autobyteus/chrome-vnc:latest
./build.sh --no-cache
./start.sh
```

## Multi-Arch Release Image

For a publishable image that is fully built at image-build time (does not clone repos at container startup), use the monorepo Dockerfile:

```bash
./build-multi-arch.sh --push
```

The monorepo image now starts both:
- the desktop stack from `autobyteus/chrome-vnc` (Xvnc/noVNC/Chrome), and
- `autobyteus-server-ts` under `supervisord`.

Default target image is:

- `autobyteus/autobyteus-server:<version-from-package-json>`
- `autobyteus/autobyteus-server:latest`

Optional overrides:

```bash
./build-multi-arch.sh --push --version 1.4.3
./build-multi-arch.sh --push --image-name autobyteus/autobyteus-server-ts
```

## GitHub Release Automation

Workflow file:

- `.github/workflows/release-docker-image.yml`

What it does:

- Triggers when a Git tag is pushed (for example `v1.2.3`).
- Also triggers when `AutoByteus/autobyteus-ts` receives a push to `main`.
- Also supports manual run via GitHub Actions `workflow_dispatch`.
- Checks out `autobyteus-server-ts` + public dependencies:
  - `AutoByteus/autobyteus-ts`
  - `ryan-zheng-teki/repository_prisma`
- Builds `docker/Dockerfile.monorepo` for `linux/amd64,linux/arm64`.
- Pushes Docker tags to Docker Hub (`latest` + one normalized release tag in `X.Y.Z` format).

Required repository secrets:

- In `autobyteus-server-ts`:
  - `DOCKERHUB_USERNAME`
  - `DOCKERHUB_TOKEN`
- In `autobyteus-ts`:
  - `AUTOBYTEUS_SERVER_TS_WORKFLOW_TOKEN`
    - A GitHub token that can send `repository_dispatch` to `AutoByteus/autobyteus-server-ts`.

Tag patterns currently matched:

- `v*.*.*` (recommended, e.g. `v1.2.3`)
- `*.*.*` (e.g. `1.2.3`)

Manual run inputs:

- `release_tag` (optional, for re-running a released build like `0.1.0` or `v0.1.0`; published as `0.1.0`)
- `image_name` (optional)

## Endpoints

With default port mapping:

- GraphQL: `http://localhost:8001/graphql`
- REST: `http://localhost:8001/rest/*`
- WS: `ws://localhost:8001/ws/...`
- VNC: `localhost:5908`
- noVNC: `http://localhost:6080`
- Chrome debug proxy: `localhost:9228`

For `autobyteus-web`'s built-in VNC viewer, set `AUTOBYTEUS_VNC_SERVER_HOSTS` to comma-separated WebSocket endpoint host:port values (default `localhost:6080`), not raw VNC TCP ports.

## Authentication for Git Clones

Default mode is PAT (`AUTOBYTEUS_GIT_AUTH_MODE=pat`).

Required in `.env`:

```env
GITHUB_PAT=YOUR_TOKEN
```

Optional:

```env
GITHUB_USERNAME=x-access-token
AUTOBYTEUS_GITHUB_ORG=AutoByteus
```

SSH mode is also supported (`AUTOBYTEUS_GIT_AUTH_MODE=ssh`) if the container can access a valid SSH key configuration.

## Branch and Repo Overrides

You can pin refs or override repository URLs:

```env
AUTOBYTEUS_SERVER_REF=main
AUTOBYTEUS_TS_REF=main
AUTOBYTEUS_REPOSITORY_PRISMA_REF=main

# optional explicit URLs
AUTOBYTEUS_SERVER_TS_REPO_URL=
AUTOBYTEUS_TS_REPO_URL=
AUTOBYTEUS_REPOSITORY_PRISMA_REPO_URL=
```

## Data and Persistence

Named volumes:

- `autobyteus-server-workspace`: cloned source + node modules
- `autobyteus-server-data`: `.env`, SQLite DB, logs, media, memory

Server data directory in container: `/home/autobyteus/data`

A minimal `.env` is auto-created at `/home/autobyteus/data/.env` on first boot.

## Stop and Reset

Stop:

```bash
docker compose down
```

Full reset (remove source cache and data):

```bash
docker compose down --volumes
```
