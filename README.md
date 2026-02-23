# autobyteus-workspace

Git super-repo for the AutobByteus TypeScript platform workspace.

## Included submodules

- `autobyteus-web`
- `autobyteus-server-ts`
- `autobyteus-ts`
- `autobyteus-message-gateway`

## Setup

```bash
git clone --recurse-submodules https://github.com/AutoByteus/autobyteus-workspace.git
cd autobyteus-workspace
pnpm install
```

If cloned without `--recurse-submodules`:

```bash
git submodule update --init --recursive
```

## Enterprise local startup (canonical)

Use these commands from the monorepo root to avoid accidental writes to `~/.autobyteus/server-data`.

Data-dir policy:
- Host backend: do not pass `--data-dir` unless explicitly needed. Default app data stays project-local under `autobyteus-server-ts/`.
- Docker backend: uses its own container data volume (`/home/autobyteus/data`), separate from host project-local data.

1. Build backend once (or after backend changes):

```bash
pnpm -C autobyteus-server-ts build
```

2. Start frontend (Terminal A):

```bash
pnpm -C autobyteus-web dev
```

If backend is not on `8000` (for example `8002`), run:

```bash
BACKEND_PROXY_URL=http://localhost:8002 pnpm -C autobyteus-web dev
```

3. Start host backend registry on `8000` with log capture (Terminal B):

```bash
mkdir -p autobyteus-server-ts/logs
AUTOBYTEUS_SERVER_HOST=http://localhost:8000 \
AUTOBYTEUS_NODE_DISCOVERY_ENABLED=true \
AUTOBYTEUS_NODE_DISCOVERY_ROLE=registry \
PERSISTENCE_PROVIDER=sqlite \
DB_TYPE=sqlite \
LOG_LEVEL=INFO \
AUTOBYTEUS_HTTP_ACCESS_LOG_MODE=errors \
AUTOBYTEUS_HTTP_ACCESS_LOG_INCLUDE_NOISY=false \
node autobyteus-server-ts/dist/app.js --host 0.0.0.0 --port 8000 \
  2>&1 | tee autobyteus-server-ts/logs/host-8000.log
```

4. Rebuild and start Docker backend node on `8001` (Terminal C):

```bash
cd autobyteus-server-ts/docker
./build.sh
./start.sh
```

For full Docker options and enterprise profile details, read:
- `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-server-ts/docker/README.md`

5. Quick health check:

```bash
curl -fsS http://127.0.0.1:8000/rest/health
curl -fsS http://127.0.0.1:8001/rest/health
```

Stop Docker node:

```bash
cd autobyteus-server-ts/docker
docker compose down
```

## Build examples

```bash
pnpm --filter autobyteus-web build
pnpm --filter autobyteus-server-ts build
pnpm --filter autobyteus-message-gateway build
```

## Release workflow

- Workflow file: `.github/workflows/release-desktop.yml`
- Triggers:
  - push tag `v*` (for example: `v1.1.8`)
  - manual run via `workflow_dispatch`
- Artifacts:
  - macOS ARM64 DMG + blockmap
  - Linux x64 AppImage + blockmap
- For private submodules, set repository secret `SUBMODULES_TOKEN` with read access to submodule repos.
