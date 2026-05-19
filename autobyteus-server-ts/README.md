# AutoByteus Server (Node.js / TypeScript)

Fastify-based server with GraphQL, REST, and WebSocket endpoints. This is the Node.js/TypeScript port of the original FastAPI server.

## Prerequisites

- Node.js 18+ (20+ recommended)
- pnpm

### Android Support Profile

Official Android runtime profile for this server:

- Termux installed
- Termux:API app installed (for hardware control via `termux-*` commands)
- Node.js installed inside Termux
- direct-shell backend for terminal tools (no `node-pty` requirement on Android)

Quick setup in Termux:

```bash
pnpm android:bootstrap
```

## Install

From the monorepo root:

```bash
pnpm install
```

Android (Termux) profile:

```bash
pnpm install --no-optional --filter ./autobyteus-ts... --filter ./autobyteus-server-ts... --filter ./autobyteus-message-gateway...
pnpm verify:android-profile
```

Or use the bootstrap automation from workspace root:

```bash
pnpm android:bootstrap
pnpm android:bootstrap:check
```

## Environment setup

Create `.env` in `autobyteus-server-ts` (or use `--data-dir` to point to a folder containing a `.env`).

Minimal example:

```env
APP_ENV=production
AUTOBYTEUS_SERVER_HOST=http://localhost:8000
DB_TYPE=sqlite
LOG_LEVEL=INFO
PRISMA_LOG_QUERIES=0
DISABLE_HTTP_REQUEST_LOGS=true
```

Notes:
- `AUTOBYTEUS_SERVER_HOST` is required (used for URL generation).
- SQLite DB defaults to `db/production.db` (or `db/test.db` when `APP_ENV=test`).
- `DATABASE_URL` is optional for SQLite; when missing, it is derived from the runtime SQLite DB path.
- Persistence is subsystem-owned. Token usage is stored in SQL, while file-backed subsystems such as agent definitions, team definitions, and MCP config keep using their native file storage.
- Fastify request/response access logs are disabled by default to reduce noise. Set `DISABLE_HTTP_REQUEST_LOGS=false` to enable them again.
- Prisma SQL query logs are disabled by default to reduce noise. Set `PRISMA_LOG_QUERIES=1` only when you explicitly need raw SQL visibility for troubleshooting.
- The app will create `db/`, `logs/`, `download/`, `media/`, `skills/`, `temp_workspace/` as needed under the app data dir.

## Build and run

From the `autobyteus-server-ts` directory:

```bash
pnpm build
node dist/app.js --host 0.0.0.0 --port 8000
```

From the monorepo root:

```bash
pnpm -C autobyteus-server-ts build
node autobyteus-server-ts/dist/app.js --host 0.0.0.0 --port 8000
```

Notes:
- `pnpm -C autobyteus-server-ts build` also builds the `autobyteus-ts` workspace package.
- `pnpm -C autobyteus-server-ts build` also runs `prisma generate --schema ./prisma/schema.prisma` before TypeScript compile.
- `repository_prisma` is consumed as a normal npm dependency (no local sibling clone required).

Optional custom data directory:

```bash
node autobyteus-server-ts/dist/app.js --data-dir /path/to/data --host 0.0.0.0 --port 8000
```

Android run helpers (from workspace root):

```bash
pnpm android:server:start      # foreground
pnpm android:server:start:bg   # background (nohup + pid file)
pnpm android:server:status
pnpm android:server:stop
```

Recommended dev startup with log file (from monorepo root):

```bash
mkdir -p autobyteus-server-ts/logs
TS=$(date +%Y%m%d-%H%M%S)
LOG_FILE="autobyteus-server-ts/logs/backend-dev-${TS}.log"
PID_FILE="autobyteus-server-ts/logs/backend-dev-${TS}.pid"
nohup node autobyteus-server-ts/dist/app.js --host 0.0.0.0 --port 8000 > "$LOG_FILE" 2>&1 &
echo $! > "$PID_FILE"
echo "PID: $(cat "$PID_FILE")"
echo "Log: $LOG_FILE"
```

## Database migrations

Migrations are executed on startup via:

```bash
pnpm -C autobyteus-server-ts exec prisma migrate deploy
```

You can also run it manually.

## Android Hardware Control (Non-Root)

`run_bash` can control Android hardware only through Android API bridges available to Termux user.

Recommended setup:

1. Install `Termux:API` Android app.
2. Install Termux package: `pkg install -y termux-api`.
3. Grant permissions to Termux / Termux:API (camera/media/etc.).

Example commands:

```bash
termux-torch on
termux-torch off
termux-media-player play /sdcard/Music/test.mp3
termux-media-player stop
termux-volume music 10
```

## Foreground / Background / IP Model

- Foreground: server runs in current terminal and stops with terminal/session exit.
- Background: use `pnpm android:server:start:bg` to run with `nohup`, logs in `autobyteus-server-ts/logs/`, pid in `autobyteus-server-ts/logs/android-server.pid`.
- IP behavior: the server does not get its own separate IP; it listens on device interfaces.
  - `--host 127.0.0.1`: local-only on the Android device.
  - `--host 0.0.0.0`: reachable from LAN using device/emulator network IP.

## Docker

Recommended for users: start the published Docker Hub image without cloning
this repository by using the public launcher. It pulls
`autobyteus/autobyteus-server:latest`, keeps launcher state outside any source
checkout, chooses non-conflicting ports, and prints the Backend URL to add in
**Settings -> Nodes -> Add Remote Node**.

Install the local launcher once:

macOS / Linux:

```bash
curl -fsSL https://raw.githubusercontent.com/AutoByteus/autobyteus-workspace/personal/scripts/public/docker/autobyteus-docker.sh | bash -s -- install
```

Windows PowerShell:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -Command "irm https://raw.githubusercontent.com/AutoByteus/autobyteus-workspace/personal/scripts/public/docker/autobyteus-docker.ps1 | iex; autobyteus-docker install"
```

Then use direct local commands. `new-container` checks/pulls the image and creates the next indexed managed container:

```bash
autobyteus-docker new-container
```

Repeated `new-container` calls create `autobyteus-server-0`, then `autobyteus-server-1`, then `autobyteus-server-2`, and so on.

The launcher keeps private server state in existing Docker named volumes:
`/home/autobyteus/data` is private app/server data, `/root` stores in-container
root home/auth settings, and `/app/autobyteus-server-ts/workspace` keeps the
existing workspace volume. It also creates host-visible user folders under a
shared workspace root (`$HOME/.autobyteus/docker-server/shared-workspace` on
macOS/Linux, `%LOCALAPPDATA%\AutoByteus\docker-server\shared-workspace` on
Windows, or `AUTOBYTEUS_DOCKER_SHARED_WORKSPACE_DIR` when set):

- `/home/autobyteus/workspace` is this node's user workspace.
- `/home/autobyteus/shared` is shared across launcher-managed Docker nodes.

Inspect the mapping or apply it to existing managed containers:

```bash
autobyteus-docker workspace paths
autobyteus-docker storage
autobyteus-docker workspace apply --all
```

`workspace apply --all` safely recreates managed containers to add the bind
mounts while keeping existing named volumes and host folders.
Existing files under `/home/autobyteus/data/temp_workspace` stay preserved in
the data named volume, but `/home/autobyteus/workspace` becomes the default temp
workspace after apply.

Claude Agent SDK sessions automatically read Claude Code filesystem settings.
For this Docker image, the `user` Claude Code settings source resolves to
`/root/.claude/settings.json` inside the container because the server process
runs as `root`. Keep the launcher-managed root-home volume if you want Claude
Code auth, gateway, or model settings to survive container recreation.

Useful endpoints after startup are printed by the launcher:

```text
Backend: printed by the launcher, usually http://localhost:8001
GraphQL: <Backend>/graphql
REST:    <Backend>/rest/*
WS:      ws://localhost:<Backend port>/ws/...
noVNC:   printed by the launcher, usually http://localhost:6080
VNC:     printed by the launcher, usually localhost:5908
```

Upgrade every managed Docker node to the latest image while keeping named volumes:

```bash
autobyteus-docker upgrade --all
```

Remove every managed Docker node while keeping named volumes:

```bash
autobyteus-docker destroy --all
```

Reset to one fresh managed Docker node:

```bash
autobyteus-docker reset
```

Show the Backend URL again:

```bash
autobyteus-docker urls
```

Stop it without removing named volumes:

```bash
autobyteus-docker stop
```

If you already cloned this repository and want developer/source-helper
behavior, you can use the source helper instead:

```bash
cd autobyteus-server-ts/docker
./docker-start.sh up --pull-remote
./docker-start.sh ports
```

See [`docker/README.md`](docker/README.md) for public launcher management
commands, source-helper behavior, and the advanced direct `docker run` fallback.

If you are developing locally and want to build the image from source instead, build from repo root (required so workspace packages are available):

```bash
docker build -f autobyteus-server-ts/docker/Dockerfile.monorepo -t autobyteus-server-ts .
```

Then run the local image:

```bash
docker run --rm -p 8000:8000 autobyteus-server-ts
```

Server-only development stack (compose + bootstrap scripts) is in:

```bash
autobyteus-server-ts/docker
```

Quick start:

```bash
cd autobyteus-server-ts/docker
cp .env.example .env
./build.sh
./start.sh
```

## Tests

```bash
pnpm -C autobyteus-server-ts exec vitest
```

## Runtime Sandbox Overrides

Codex full filesystem access can be toggled from the product UI at **Settings
-> Server Settings -> Basics -> Codex full access**. The toggle is backed by the
`CODEX_APP_SERVER_SANDBOX` server setting / environment variable for scripted or
headless runs.

- Codex App Server runtime: set `CODEX_APP_SERVER_SANDBOX=danger-full-access`
  - Basic UI toggle on: saves `danger-full-access`
  - Basic UI toggle off: saves `workspace-write`
  - Advanced/API supported values: `read-only`, `workspace-write`, `danger-full-access`
  - Default: `workspace-write`
  - UI and server-setting changes apply to new/future Codex sessions, not already-active sessions.
  - `danger-full-access` disables filesystem sandboxing; use only for trusted tasks and environments.
- Claude Agent SDK runtime: set `CLAUDE_AGENT_SDK_PERMISSION_MODE=bypassPermissions`
  - Supported values: `default`, `plan`, `acceptEdits`, `bypassPermissions`
  - Default: `default`
  - Accepted aliases: `bypass-permissions`, `bypass_permissions`

Example:

```bash
CODEX_APP_SERVER_SANDBOX=danger-full-access \
CLAUDE_AGENT_SDK_PERMISSION_MODE=bypassPermissions \
pnpm dev
```

Notes:
- Tests use `.env.test` and a temporary SQLite DB at `tests/.tmp/`.
- Some integration tests are env-gated (e.g., `AUTOBYTEUS_DOWNLOAD_TEST_URL`).
- Codex live-runtime E2E tests are env-gated by `RUN_CODEX_E2E`.
  - Use `RUN_CODEX_E2E=1` for Codex tickets, otherwise Codex live E2E suites are skipped.
  - Codex runtime E2E suites now isolate app data to temporary per-suite directories to avoid polluting default local run history.

Clean existing local Codex E2E run-history artifacts (safe prefix-targeted cleanup):

```bash
pnpm -C autobyteus-server-ts run cleanup:codex-e2e-history --memory-dir ./memory
```

Dry-run preview:

```bash
pnpm -C autobyteus-server-ts run cleanup:codex-e2e-history --memory-dir ./memory --dry-run
```

Run full backend suite with Codex live transport enabled:

```bash
RUN_CODEX_E2E=1 pnpm -C autobyteus-server-ts test -- --run
```

Run a single test file:

```bash
pnpm -C autobyteus-server-ts exec vitest run tests/unit/config/app-config.test.ts --no-watch
```

## Documentation

TypeScript server documentation is available under `autobyteus-server-ts/docs`.

Recommended starting points:

- `docs/README.md`
- `docs/ARCHITECTURE.md`
- `docs/PROJECT_OVERVIEW.md`
- `docs/URL_GENERATION_AND_ENV_STRATEGY.md`
- `docs/modules/README.md`
- `docs/design/startup_initialization_and_lazy_services.md`

## Endpoints

- REST: `/rest/*`
- GraphQL: `/graphql` (subscriptions enabled)
- WebSocket:
  - `/ws/agent/:runId`
  - `/ws/agent-team/:teamRunId`
  - `/ws/terminal/:workspaceId/:sessionId`
  - `/ws/file-explorer/:workspaceId`
