# AutoByteus Server TS Architecture

## High-Level Design

The TypeScript server follows a layered domain architecture:

1. Domain models (`domain/`).
2. Converters (`converters/`).
3. Repositories (`repositories/`).
4. Persistence providers and cache decorators (`providers/`).
5. Services (`services/`).
6. API transport adapters (GraphQL, REST, WebSocket).

## Runtime Topology

- Entry point: `src/app.ts`
- REST routes: `src/api/rest`
- GraphQL schema/types: `src/api/graphql`
- WebSocket routes: `src/api/websocket`
- Startup orchestration: `src/startup`

## Startup Sequence

`src/app.ts` enforces startup ordering:

1. Parse CLI args (`--host`, `--port`, `--data-dir`).
2. Set `AUTOBYTEUS_SERVER_HOST` fallback if needed.
3. Apply custom app data directory to `AppConfig`.
4. Initialize `AppConfig` (loads `.env`, resolves paths, sets DB URL for SQLite).
5. Run Prisma migrations.
6. Build and start Fastify transports.
7. Create temp workspace.
8. Schedule non-critical background startup tasks.

## Runtime Logging Topology

- Logging config source: `src/config/logging-config.ts`
  - `LOG_LEVEL`
  - `AUTOBYTEUS_HTTP_ACCESS_LOG_MODE`
  - `AUTOBYTEUS_HTTP_ACCESS_LOG_INCLUDE_NOISY`
- Log directory resolution: `src/config/app-config.ts:getLogsDir()`
  - honors `AUTOBYTEUS_LOG_DIR` when provided,
  - otherwise defaults to `<app-data-dir>/logs`.
- Runtime sink bootstrap: `src/logging/runtime-logger-bootstrap.ts`
  - builds dual-sink fanout streams (console + file),
  - always writes backend logs to `server.log`,
  - writes file sink via synchronous file-descriptor writes to preserve logs on fatal startup exits,
  - binds global `console.*` to fanout streams,
  - provides Fastify logger stream options.
- Startup integration: `src/app.ts:startServer()`
  - initializes config, then runtime logger bootstrap, then builds Fastify app.

## Caching and Singleton Pattern

The server uses explicit singleton accessors (for example `getInstance()` / `getXService()`) and cached providers.

Two important benefits:

- Avoid repeated expensive initialization.
- Avoid import-time construction before `AppConfig` is initialized.

## Background Tasks

Non-critical initialization runs via `src/startup/background-runner.ts`.

Current task groups include:

- Cache preloading
- Agent customization registration
- Workspace package loading
- Tool loading
- MCP tool registration

## Persistence

Primary persistence path in TS:

- Prisma repositories via `repository_prisma`
- SQLite default in local/electron packaging
- Config-driven paths under app data directory

Active persisted domains in the current codebase:

- Agent definitions and prompt mappings
- Agent team definitions
- Prompt engineering
- MCP server configurations
- Token usage records/statistics
- Agent artifacts
- External-channel bindings, idempotency, receipts, and delivery events

Note on removed/empty domains:

- `src/workflow-definition` and `src/agent-conversation` currently contain no active implementation files.

## Module Boundaries

Each major business area is isolated under `src/<module>` and usually contains:

- `domain/`
- `converters/`
- `repositories/`
- `providers/`
- `services/`

## Testing Layers

- Unit tests: isolated service/provider behavior.
- Integration tests: repository/provider/service with real DB fixtures.
- E2E tests: GraphQL and transport paths.

Test tree is in `autobyteus-server-ts/tests`.
