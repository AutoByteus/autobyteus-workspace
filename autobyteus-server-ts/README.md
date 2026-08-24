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
- Provider and search credentials must be saved through the applicable product Settings surface (**API Key Management** for model/media providers and **Web Search** configuration for search providers). Plaintext `.env` entries and ambient aliases are not runtime credential providers. For a one-time transition from an owner-private assignment file, use the sole importer command `pnpm secrets:import -- --source /absolute/path --database-url file:/absolute/path/to/application.db --dry-run` from the workspace root, review the value-free target and plan, and rerun without `--dry-run`. `--database-url` is required and is the importer's only target authority; it is never inferred from `.env`, `.env.test`, the source file, the working directory, or parent `DATABASE_URL`. See the Secret Management doc for URL validation, confirmation, preview, and overwrite rules.
- Encrypted secret tables live in the same SQLite application database selected by canonical `DATABASE_URL`; the 32-byte root key is the database sibling `<database-path>.secret.key`. Treat the database and key as one backup/restore/reset pair. There is no second Store database or backend configuration hook. See `docs/modules/secret_management.md`.
- Claude Agent SDK authentication keeps the existing `CLAUDE_AGENT_SDK_AUTH_MODE=auto|cli|api-key` selector and defaults to `cli`. Only explicit `api-key` resolves the Anthropic vault credential and replaces `ANTHROPIC_API_KEY` immediately before launch; `auto`/`cli`, external Codex, and inherited child environments retain their established continuity behavior and are not process-isolation evidence.
- Optional `AUTOBYTEUS_MCP_GATEWAY_TOKEN` protects the general `/mcp/gateway` Streamable HTTP MCP endpoint. When unset, that endpoint is restricted to local loopback requests only.
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
- `repository_prisma@1.0.9` is consumed as a normal npm dependency (no local
  sibling clone required). Server composition initializes it for the canonical
  application database after schema migrations; token and secret runtime model
  repositories use its context-aware `BaseRepository` and transaction boundary.

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

## Production data migrations

Prisma database-schema migrations are executed on startup via:

```bash
pnpm -C autobyteus-server-ts exec prisma migrate deploy
```

You can also run it manually.

After Prisma and encrypted-vault initialization, registered app-data migrations
run before normal provider consumers. These migrations can transform database
rows as well as filesystem/application-data formats; Prisma schema deployment
alone does not cover those data-shape transitions. This includes the one-time
transition of the supported version-1
`<app-data-dir>/llm/custom-llm-providers.json` file: a complete valid set is
migrated atomically into encrypted vault entries plus secret-free v2 metadata.
An invalid or colliding v1 set is deleted and requires reconfiguration through
**Settings -> API Key Management -> New Provider**. If the v1 file cannot be
deleted safely, the server and built-in Settings still start, but custom
provider creation remains unavailable until the filesystem issue is fixed and
the server restarts. There is no manual v1 command, backup/quarantine copy,
runtime v1 reader, partial migration, or automatic `.env` import.

Required startup migration `20260823_repair_team_agent_memory_layout` repairs
the released nested-Team writer regression. For each AgentRun admitted by a
validated current V1 execution tree, it moves an affected flat nested-member
directory as one same-filesystem directory into the canonical
`root TeamRun -> ancestor TeamRun ids -> AgentRun` location. Current runtime
readers and writers remain canonical-only; direct-root and already-canonical
members are not relocated. An item-level move failure records `FAILED` without
blocking unrelated application startup and remains available through the
existing **Settings -> Server Migrations -> Retry** action. A real canonical
target beside a preserved flat source records `SUCCEEDED_WITH_WARNINGS`; a
missing or invalid canonical target is never treated as a warning. See the
Memory Sync documentation for the approved v1 physical-retention consequence.

### Production migration practice

- Follow the canonical
  [`Production Data-Migration Conventions`](docs/design/production_data_migration_conventions.md)
  for reachability, forward-only runtime ownership, final-current-state failure
  classification, cleanup residue, and proportionate recovery decisions.
- Define each migration as a deterministic transformation from explicitly
  investigated, supported released source shapes to one fixed current target.
  Before implementation, inventory representative persisted formats across
  database rows/schema and filesystem/application data, their invariants,
  normal readers and writers, evidence precedence, and unacceptable data loss.
- Validate before mutation and give each independently owned subject, root, or
  row an explicit disposition so one unsupported item cannot make the product
  unusable. Never guess identity or silently delete evidence. Leave a
  pre-mutation failure untouched; after mutation begins, report the observed
  state honestly and admit only independently validated current data.
- Treat one startup/migration writer, a stable process/power/device for the
  attempt, sufficient permissions and readable/writable same-filesystem
  storage, and normal SQLite/filesystem behavior as operating prerequisites.
  Use SQLite transactions, existing atomic file-replacement patterns, protected
  backups where they add migration recovery value, and bounded independent
  validation of the resulting current data.
- Do not build bespoke journals, restoration state machines, or exhaustive
  handling for every hypothetical power, kernel, device, syscall, hostile
  process, or arbitrary external-interference scenario unless a concrete
  product requirement demands it. Infrastructure security, access control,
  backup/disaster recovery, and arbitrary external tampering remain separate
  operational concerns rather than migration business logic.
- Keep current runtime code forward-only. Old database tables/columns and old
  file shapes may be decoded only inside registered migration boundaries kept
  for supported direct and skip-version upgrades. Do not restore operation with
  dual readers/writers or read-old-if-current-is-absent fallbacks.
- Treat database meaning, SQLite storage class, ORM result representation, and
  TypeScript annotations as distinct contracts. For nullable or computed
  scalars, choose a deterministic SQL transport, preserve the source type,
  validate the complete grammar, parse exactly through `BigInt` where
  applicable, and enforce sign/range/domain constraints before narrowing.
- Reproduce adapter-sensitive scalar behavior through the production ORM and a
  disposable database. Preserve exposing result-set conditions such as leading
  `NULL` rows followed by valid values in one ordered batch; never substitute
  broad numeric coercion or run automated proof against a live user database.
- Keep automatic startup scheduling separate from public recovery capability.
  The runner publishes `MANUAL_RETRY`, `RESTART_TO_RETRY`, or `NONE`; derive
  `canRetry` only from a currently executable manual retry, and reject direct
  invocation of startup-only definitions.
- Transport the server-owned recovery action through the API. Settings may
  show localized restart guidance and a disabled Retry control for
  `RESTART_TO_RETRY`, but must not infer migration policy or dispatch a manual
  mutation. Do not expand this recovery path into unrelated historical-summary,
  audit-log, retention, or filesystem-recovery work without separate scope.
- Classify the final persisted state against the facts current application
  owners actually require. Missing current platform/core invariants may stop
  startup; a bounded capability-data failure gates only that capability;
  independently valid current data with inert bounded residue may complete with
  warnings. A warning must never hide a missing or ambiguous current target.
- Validate with isolated synthetic fixtures representing supported released
  data families, relaunch/idempotence, and same-identity continuation. Never run
  automated migration proof against a user's live production profile.

See `docs/modules/secret_management.md` and
`docs/modules/llm_management.md` for the full value-free migration and reset
contract.

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

## Memory Sync / Memory Hub

The server includes an embedded Memory Sync feature. A node can act as a Memory
Hub, a source that pushes its local memory to another hub, or both. Configure it
from the frontend **Nodes -> Memory Sync** tab for the current node-bound
window.

Runtime memory stays in the existing local roots:

- `memory/agents/`
- `memory/agent_teams/`

Hub imports are stored separately as read-only corpus data:

- `memory/imports/<sourceNodeId>/agents/`
- `memory/imports/<sourceNodeId>/agent_teams/`
- `memory/imports/<sourceNodeId>/source-node.json`
- `memory/imports/<sourceNodeId>/sync-manifest.json`

Hub setup uses a user-confirmed advertised hub base URL. Candidate URLs are
suggestions only; Docker, Kubernetes, LAN, VPN, and tailnet deployments must use
a URL reachable from the source node and should verify it with **Test
connection**. Hub source tokens are backend-generated (`mhub_...`), stored hashed
on the hub, shown only once on create/regenerate, and redacted from public
config responses. Source nodes store the plaintext token locally so background
sync can resume after restart.

See `docs/features/memory_sync.md` for API endpoints, storage files, token
behavior, current v1 limits, and the documented case where replace-only sync may
retain both a pre-upgrade flat nested-member path and its canonical replacement
while semantic local/imported reads continue using only the canonical V1 path.

## Docker

Recommended for users: start the published Docker Hub image without cloning
this repository by using the public launcher. It pulls
`autobyteus/autobyteus-server:latest`, keeps launcher state outside any source
checkout, chooses non-conflicting ports, and prints the Backend URL to add in
**Nodes -> Manage Nodes -> Add Remote Node**.

Install the local launcher once:

macOS / Linux:

```bash
curl -fsSL https://raw.githubusercontent.com/AutoByteus/autobyteus-workspace/personal/scripts/public/docker/autobyteus-docker.sh | bash -s -- install
```

Windows PowerShell:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -Command "irm https://raw.githubusercontent.com/AutoByteus/autobyteus-workspace/personal/scripts/public/docker/autobyteus-docker.ps1 | iex; autobyteus-docker install"
```

The installer writes the launcher entry and its adjacent support modules into
the local install directory, so installed `autobyteus-docker` commands do not
need a repository checkout.

Then use direct local commands. `new-container` checks/pulls the image and creates the next indexed managed container:

```bash
autobyteus-docker new-container
```

Repeated `new-container` calls create `autobyteus-server-0`, then `autobyteus-server-1`, then `autobyteus-server-2`, and so on.

Use the printed Backend URL in **Nodes -> Manage Nodes -> Add Remote Node**, then
open that Docker node window over a trusted LAN, VPN, tailnet, or equivalent
private-network path. The default product model does not add a separate owner
credential for desktop/Electron access to that node; do not expose the full
backend directly to the public internet. Paired phones receive only separate
`mra_...` mobile credentials, and those credentials do not authorize
owner-management routes. Current server Docker images package the `/mobile` web
shell into the runtime image for QR/mobile startup.

The launcher keeps private Docker named volumes outside the container writable
layer:
`/home/autobyteus/data` is private app/server data, `/root` stores in-container
root home/auth settings, `/home/vncuser/.config/chromium` stores private
Chromium browser profile state in `<node>-chromium-profile`, and
`/app/autobyteus-server-ts/workspace` keeps the existing workspace volume. It
also creates host-visible user folders under a shared workspace root
(`$HOME/.autobyteus/docker-server/shared-workspace` on macOS/Linux,
`%LOCALAPPDATA%\AutoByteus\docker-server\shared-workspace` on Windows, or
`AUTOBYTEUS_DOCKER_SHARED_WORKSPACE_DIR` when set):

- `/home/autobyteus/workspace` is this node's user workspace.
- `/home/autobyteus/shared` is shared across launcher-managed Docker nodes.

Inspect the mapping or apply it to existing managed containers:

```bash
autobyteus-docker workspace paths
autobyteus-docker storage
autobyteus-docker workspace apply --all
```

`workspace apply --all` safely recreates managed containers to apply the current
launcher volume and bind-mount set while keeping existing named volumes and host
folders.
Existing files under `/home/autobyteus/data/temp_workspace` stay preserved in
the data named volume, but `/home/autobyteus/workspace` becomes the default temp
workspace after apply. On Linux hosts, files written from the current
root-running container into bind-mounted host folders may be root-owned.

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

Upgrade every managed Docker node while keeping named volumes. A plain upgrade
uses each node's saved image ref, so mixed fleets stay on their current image
line (for example, `latest` nodes stay on `latest` and `latest-zh` nodes stay
on `latest-zh`):

```bash
autobyteus-docker upgrade --all
```

To intentionally retarget every managed node to a new tag or image, make that
explicit:

```bash
autobyteus-docker upgrade --all --tag latest-zh
autobyteus-docker upgrade --all --image autobyteus/custom-server:latest-zh
```

Remove every managed Docker node while keeping named volumes:

```bash
autobyteus-docker destroy --all
```

Remove one launcher-managed node, including stale launcher state left after a
manual `docker rm`, while keeping its named volumes and host workspaces:

```bash
autobyteus-docker destroy --name autobyteus-server-5
autobyteus-docker new-container  # reuses the lowest available indexed slot
```

Only AutoByteus-managed server nodes are valid targeted destroy targets.
Docker Buildx is separate infrastructure; remove its builder with its owning
command instead:

```bash
docker buildx rm multi-platform-builder
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

### Start the real backend and frontend for local development

Run the complete local development stack from the workspace root:

```bash
pnpm dev
```

This is a real local runtime, not a mocked test server. The command builds the
server, validates the credential-free `autobyteus-server-ts/.env.development`
template, atomically materializes the ignored runtime environment under
`<repo>/.autobyteus/development/server-data/`, and starts:

- backend: `http://127.0.0.1:8000`;
- frontend: `http://127.0.0.1:3000`.

The launcher proves both endpoints are ready before reporting success, owns
only the two child processes it started, and stops them on `Ctrl+C`. The
development database, adjacent vault key, logs, memory, workspaces, and
runtime `.env` persist below `.autobyteus/development/server-data/`. The
launcher does not read `.env`, `.env.test`, `.env.example`, or a home-directory
environment file.

Configure provider credentials through the existing Settings UI. For explicit
file import, pass the absolute development database URL to the existing
importer; the target is never inferred:

```bash
pnpm secrets:import -- \
  --source /absolute/path/to/assignments \
  --database-url file:/absolute/path/to/.autobyteus/development/server-data/db/development.db \
  --dry-run
```

To reset development state, stop the stack first and remove only
`.autobyteus/development/` from the workspace root.

Deterministic E2E assertions run separately:

```bash
pnpm test:e2e
```

This uses the existing test-owned Vitest setup and test runtime. Do not use a
development database for tests.

Useful real-provider checks against the same project test runtime:

```bash
# Report configured, missing, or unavailable capabilities without invoking them
pnpm test:e2e:real:preflight

# Execute every currently configured capability
pnpm test:e2e:real
```

To preview an explicit import into that test runtime, pass its canonical
absolute SQLite file URL to the same generic importer:

```bash
pnpm secrets:import -- \
  --source /absolute/path/to/assignments \
  --database-url file:/absolute/path/to/autobyteus-server-ts/db/test.db \
  --dry-run
```

There is no test-import wrapper. The importer does not read `.env.test` or the
generated runtime `.env` and does not inherit a target from parent
`DATABASE_URL`.

Unavailable or unconfigured external capabilities are skipped and reported
explicitly; they must not be represented as passed.

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
  - Codex run launch `autoExecuteTools=true` is a separate high-trust per-run
    policy. For that standalone or team-member run it automatically approves
    tool calls and Codex access/permission requests, and the backend
    starts/resumes Codex with an effective `danger-full-access` sandbox even if
    the saved full-access setting is off. Leave auto-approve off when you want
    visible approval prompts.
- Claude Agent SDK runtime: standard standalone and team-member launches use
  Claude Code provider `permissionMode: "default"`.
  - AutoByteus run launch `autoExecuteTools=true` is a separate per-run approval
    policy. For Claude Agent SDK runs, it auto-approves permission callbacks
    through AutoByteus orchestration; it does not switch Claude Code into
    `bypassPermissions`.
  - Do not use `bypassPermissions` as the Docker/root steady-state launch mode.
    Claude Code rejects its dangerous skip-permissions mode when the process runs
    with root/sudo privileges.
  - If a future feature needs explicit Claude provider permission modes such as
    `plan`, `acceptEdits`, or `bypassPermissions`, treat that as a separate
    provider-level setting with runtime validation, not as auto-approve behavior.

Example:

```bash
CODEX_APP_SERVER_SANDBOX=danger-full-access \
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

Startup app-data migrations normally repair legacy/partial standalone
`run_history_index.json` and team `team_run_history_index.json` files into V2
catalog format. The team history migration runs after the existing member-tree
metadata migration and does not require a separate cleanup command. If the
Codex E2E cleanup still reports a legacy or minimal standalone index, run the
manual standalone V2 migration/repair fallback and then retry cleanup:

```bash
node autobyteus-server-ts/scripts/migrate-agent-run-history-index-v2.mjs --memory-dir ./memory --apply
```

See `autobyteus-server-ts/scripts/run-history-index-migration.md` for the
standalone startup migration boundary, manual dry-run/apply fallback, backup,
and `createdAt` fallback details. Team history repair is owned by the required
startup app-data migration `TeamRunHistoryIndexV2AppDataMigration`.

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
