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
5. Resolve persistence profile and run startup migration gate:
   - `PERSISTENCE_PROVIDER=file`: skip Prisma migrations.
   - `PERSISTENCE_PROVIDER=sqlite|postgresql`: run Prisma migrations.
6. Build and start Fastify transports.
7. Create temp workspace.
8. Schedule non-critical background startup tasks.

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

Persistence is profile-driven and selected via `PERSISTENCE_PROVIDER`.

- `file` profile:
  - Domain persistence resolves through registry + proxy layers to file providers.
  - Data is written under `<memoryDir>/persistence/**` using JSON / JSONL file stores.
  - Startup skips Prisma migration execution.
- `sqlite` / `postgresql` profiles:
  - Domain persistence resolves through the same registry + proxy layers to SQL providers.
  - SQL providers use Prisma repositories via `repository_prisma`.
  - Startup runs Prisma migration execution.

Build/package notes:

- `build:full` compiles full graph (file + SQL profiles).
- `build:file` compiles file-profile graph without SQL/Prisma module inclusion.
- `build:file:package` emits a file-profile package manifest that removes Prisma dependencies.

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
