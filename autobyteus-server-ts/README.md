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
PERSISTENCE_PROVIDER=sqlite
DB_TYPE=sqlite
LOG_LEVEL=INFO
DISABLE_HTTP_REQUEST_LOGS=true
```

Notes:
- `AUTOBYTEUS_SERVER_HOST` is required (used for URL generation).
- On Android runtime, persistence is forced to file profile by platform policy even if `PERSISTENCE_PROVIDER=sqlite`.
- SQLite DB defaults to `db/production.db` (or `db/test.db` when `APP_ENV=test`).
- `DATABASE_URL` is optional for SQLite; when missing, it is derived from the runtime SQLite DB path.
- Fastify request/response access logs are disabled by default to reduce noise. Set `DISABLE_HTTP_REQUEST_LOGS=false` to enable them again.
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

On Android runtime with file persistence profile, startup skips Prisma migrations.

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

Build from repo root (required so workspace packages are available):

```bash
docker build -f autobyteus-server-ts/docker/Dockerfile.monorepo -t autobyteus-server-ts .
```

Run:

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

Notes:
- Tests use `.env.test` and a temporary SQLite DB at `tests/.tmp/`.
- Some integration tests are env-gated (e.g., `AUTOBYTEUS_DOWNLOAD_TEST_URL`).
- Codex live-runtime E2E tests are env-gated by `RUN_CODEX_E2E`.
  - Use `RUN_CODEX_E2E=1` for Codex tickets, otherwise Codex live E2E suites are skipped.

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
  - `/ws/agent/:agentId`
  - `/ws/agent-team/:teamId`
  - `/ws/terminal/:workspaceId/:sessionId`
  - `/ws/file-explorer/:workspaceId`
