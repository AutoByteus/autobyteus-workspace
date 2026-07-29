# Development Startup Contract — Simplify Local Full-Stack Development Startup

## Status

`Approved for Design — intended-behavior supplement; the user-authorized ticket request accepted the contract after the path-isolation clarification below.`

## Purpose

Define one narrow owner for local development startup and keep development, deterministic tests, real-provider E2E, and packaged production operationally distinct. This supplement supports [Requirements](./requirements.md) and is grounded by [Investigation Notes](./investigation-notes.md).

## Command Surface

| Command | Exact responsibility | Data owner | Assertions |
|---|---|---|---|
| `pnpm dev` | Build/start the real backend and start the real Nuxt development frontend; supervise both | Persistent repository-local development state | No |
| `pnpm test:e2e` | Run deterministic server E2E tests through Vitest | Existing test-owned reset/per-test state | Yes |
| `pnpm test:e2e:real:preflight` | Start the real built server using the committed test template and report configured/unavailable external capabilities | Dedicated persistent test runtime/database | Preflight assertions only |
| `pnpm test:e2e:real` | Start the real built server and execute selected real-provider capability scenarios | Dedicated persistent test runtime/database | Yes |
| `pnpm secrets:import -- --source <absolute-source> --database-url <absolute-file-url> ...` | Existing explicit credential import | Database named by the required explicit target | Not a startup/test command |

Removed with no alias: `pnpm dev:test`, `pnpm server:test`, and `pnpm web:test`. They are manual stack launchers whose names imply test execution but contain no assertion owner.

Optional root `server:dev` and `web:dev` commands are not added. The product needs one canonical full-stack path; package-native focused commands remain available to specialists without creating competing data/lifecycle authority.

## Environment And Data Ownership

| Mode | Selected data/database location | Selector authority | Persistence |
|---|---|---|---|
| Development | `<repo>/.autobyteus/development/server-data/`; DB `<root>/db/development.db`; key `<db>.secret.key` | Development launcher constant resolved from its module path | Persistent until explicit bounded reset |
| Deterministic E2E | Existing Vitest/global-setup/per-test roots under ignored test-owned locations | Test setup code | Reset or per-test by existing suite |
| Real-provider E2E | Existing strict `.env.test` bootstrap and dedicated ignored test runtime/database | Test bootstrap code | Persistent where real credentials require it; cleanup remains test-owned |
| Packaged production | `~/.autobyteus/server-data`; production DB/key below it | Existing Electron `AppDataService` and explicit `--data-dir` | Persistent installed application state |

No development or test command derives a target from the current working directory, a root `.env`, `.env.example`, a user-home `.env`, or packaged-production state.

## Committed Development Template

Path: `autobyteus-server-ts/.env.development`

```dotenv
APP_ENV=development
DB_TYPE=sqlite
DATABASE_URL=file:./db/development.db
AUTOBYTEUS_SERVER_HOST=http://127.0.0.1:8000
```

Contract:

1. These four keys are the complete template schema; duplicates, extra keys, missing values, interpolation syntax, invalid APP_ENV/DB_TYPE, non-loopback host, or non-SQLite URL fail before child startup.
2. The relative template database URL is declarative only. The launcher resolves it against the fixed development data root, proves the resulting file is below `<development-data-root>/db/`, and writes the canonical absolute `file:` URL to the generated runtime `.env`.
3. The template is never edited or copied unchecked and contains no credential.
4. `.env.test` remains a separate strict test template. `.env.example` remains the deployment/packaged-production example and is not consulted by `pnpm dev`.

## Safe Development Materialization

The development runtime owner performs this ordered operation before the server imports AppConfig:

1. Resolve `workspaceRoot` from `import.meta.url`, then derive the fixed development root and template path.
2. Reject an unsafe/missing/non-regular template and reject symlink/path escape in the managed development root, runtime `.env`, database, or adjacent key target.
3. Parse and validate the four-key template.
4. Create the ignored development directories with owner-private permissions where the platform supports them.
5. Read an existing generated runtime `.env` only from the canonical development root; retain product-managed non-launcher settings, replace all launcher-owned keys, and never source it into the launcher process. Launcher-owned keys are the four template keys plus `AUTOBYTEUS_LOG_DIR`, `AUTOBYTEUS_MEMORY_DIR`, and `AUTOBYTEUS_TEMP_WORKSPACE_DIR`, which are always materialized as paths below the development data root so ambient path overrides cannot escape the isolated runtime.
6. Atomically write owner-private runtime `.env` containing the canonical absolute database URL and fixed loopback server URL.
7. Re-read the tracked template and prove its bytes are unchanged.
8. Start the built server with `--host 127.0.0.1 --port 8000 --data-dir <absolute-development-root>`.

The child may inherit the normal developer shell. The launcher removes/replaces only the keys it owns: `APP_ENV`, `DB_TYPE`, `DATABASE_URL`, `AUTOBYTEUS_SERVER_HOST`, `AUTOBYTEUS_LOG_DIR`, `AUTOBYTEUS_MEMORY_DIR`, and `AUTOBYTEUS_TEMP_WORKSPACE_DIR`. This prevents data or routing redirection without changing unrelated shell/runtime behavior.

## Frontend Routing

The frontend child starts in `autobyteus-web` with `NODE_ENV=development`, host `127.0.0.1`, and port `3000`. The launcher supplies the backend base URL and all existing explicit backend WebSocket endpoint variables for the fixed `127.0.0.1:8000` server. Parent variables and unrelated `.env` files cannot redirect the development frontend away from the owned backend.

No new frontend runtime contract, proxy layer, or product API is introduced.

## Readiness And Process Lifecycle

1. Preflight both fixed loopback ports. If either is occupied, fail nonzero before launching a partial stack; do not choose another port.
2. Build/start the backend first and wait for its existing readiness marker.
3. Start Nuxt and wait for a reachable HTTP readiness response on `http://127.0.0.1:3000` before reporting full-stack readiness.
4. Print concise stable lines containing backend URL, frontend URL, and development data root, never credential or vault content.
5. If either child exits unexpectedly or readiness times out, terminate the other owned child and return nonzero.
6. On SIGINT/SIGTERM, forward termination once, wait boundedly, escalate only the still-running owned child if required, and return a deliberate-shutdown result.
7. Never search for, attach to, stop, or clean unrelated processes.

## Test Execution Contract

- `pnpm test:e2e` is an assertion command, not a manual server/frontend session. It runs the deterministic `autobyteus-server-ts/tests/e2e` suite through the existing Vitest setup, which selects ignored test state and resets/isolates it according to current test owners.
- External-account/provider scenarios remain excluded unless their existing explicit opt-in command/flags are used.
- `pnpm test:e2e:real(:preflight)` retains the current full-server bootstrap based on `.env.test`, sanitized test-owned routing, evidence scanning, and dedicated test database/runtime. It never uses the development or production database.
- Tests may reuse production server/frontend code, but test execution, fixtures, assertions, and cleanup remain test-owned rather than development-launcher responsibilities.

## Credentials

Development/test startup never imports or reads credentials from a plaintext assignment file. Credentials remain encrypted in the database selected for that mode.

For development, operators may:

1. start `pnpm dev` and configure credentials through existing Settings; or
2. run the existing importer with the displayed absolute development database file URL as its required `--database-url` target.

No provider mapping, vault schema, importer option, credential priority, or runtime resolution behavior changes in this ticket.

## Reset Contract

The documented development reset is a deliberate filesystem action executed only while `pnpm dev` is stopped. It removes exactly `<repo>/.autobyteus/development/`. It does not touch test state, `~/.autobyteus`, Docker volumes, or any other path. No automatic reset is added.

## Preservation And Non-Goals

Unchanged:

- packaged Electron data-dir selection and AppDataService;
- Docker startup/topology;
- one-database encrypted vault and adjacent-key behavior;
- provider/model/Gemini/Claude/Codex/custom-provider behavior;
- importer target/recognition behavior;
- production/test data contents.

This contract adds command/configuration ownership only; it is not an environment framework or application-runtime redesign.
