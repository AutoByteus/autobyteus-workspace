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

## All-in-one Docker startup

For ticket testing with isolated, collision-safe ports (single main all-in-one container + optional remote server-only containers):

```bash
./scripts/enterprise-docker.sh up
./scripts/enterprise-docker.sh ports
```

Default `up` behavior includes:

- one remote server node (`--remote-nodes 1`)
- fixture seeding (`--seed-test-fixtures`)
- post-start remote full sync (`--sync-remotes`)

If you want only main container startup:

```bash
./scripts/enterprise-docker.sh up -r 0 --no-seed-test-fixtures --no-sync-remotes
```

Optional: seed ready-to-test Professor/Student fixtures:

```bash
./scripts/enterprise-docker.sh seed
# or during startup:
./scripts/enterprise-docker.sh up --seed-test-fixtures
```

Optional: after startup, run automatic full sync from embedded node to discovered remotes:

```bash
./scripts/enterprise-docker.sh up --remote-nodes 1 --seed-test-fixtures --sync-remotes
# or run on existing stack:
./scripts/enterprise-docker.sh sync-remotes -r 1
```

Full guide:
- [`docker/README.md`](docker/README.md)

## Enterprise local startup (canonical)

Use these commands from the monorepo root to avoid accidental writes to `~/.autobyteus/server-data`.

Data-dir policy:
- Host backend: do not pass `--data-dir` unless explicitly needed. Default app data stays project-local under `autobyteus-server-ts/`.
- Docker backend: uses its own container data volume (`/home/autobyteus/data`), separate from host project-local data.

1. Build backend once (or after backend changes):

```bash
pnpm -C autobyteus-server-ts build
```

2. Start frontend (Terminal A) with log capture:

```bash
mkdir -p autobyteus-web/logs
pnpm -C autobyteus-web dev 2>&1 | tee autobyteus-web/logs/frontend-3000.log
```

If backend is not on `8000` (for example `8002`), run:

```bash
mkdir -p autobyteus-web/logs
BACKEND_PROXY_URL=http://localhost:8002 pnpm -C autobyteus-web dev \
  2>&1 | tee autobyteus-web/logs/frontend-3000.log
```

3. Start host backend registry on `8000` with standard log policy (Terminal B):

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

If you need full transport debugging (including noisy routes), use:

```bash
mkdir -p autobyteus-server-ts/logs
AUTOBYTEUS_SERVER_HOST=http://localhost:8000 \
AUTOBYTEUS_NODE_DISCOVERY_ENABLED=true \
AUTOBYTEUS_NODE_DISCOVERY_ROLE=registry \
PERSISTENCE_PROVIDER=sqlite \
DB_TYPE=sqlite \
LOG_LEVEL=DEBUG \
AUTOBYTEUS_HTTP_ACCESS_LOG_MODE=all \
AUTOBYTEUS_HTTP_ACCESS_LOG_INCLUDE_NOISY=true \
node autobyteus-server-ts/dist/app.js --host 0.0.0.0 --port 8000 \
  2>&1 | tee autobyteus-server-ts/logs/host-8000-debug.log
```

4. Rebuild and start Docker backend node on `8001` (Terminal C):

```bash
cd autobyteus-server-ts/docker
./build.sh
./start.sh
```

Follow Docker logs into a file (optional, recommended during debugging):

```bash
cd autobyteus-server-ts/docker
mkdir -p ../logs
docker compose logs -f autobyteus-server 2>&1 | tee ../logs/docker-8001.log
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
