# AutoByteus Server TS Architecture

## High-Level Design

The TypeScript server follows a layered domain architecture:

1. Domain models (`domain/`).
2. Converters (`converters/`).
3. Repositories (`repositories/`).
4. Subsystem stores/providers and cache decorators (`providers/`).
5. Services (`services/`).
6. API transport adapters (GraphQL, REST, WebSocket).

## Runtime Topology

- Entry point: `src/app.ts`
- Bootstrap-complete runtime graph: `src/server-runtime.ts`
- REST routes: `src/api/rest`
- GraphQL schema/types: `src/api/graphql`
- WebSocket routes: `src/api/websocket`
- Startup orchestration: `src/startup`

## Startup Sequence

`src/app.ts` is a bootstrap boundary and enforces startup ordering:

1. Parse CLI args (`--host`, `--port`, `--data-dir`).
2. Initialize `appConfigProvider` with the effective app data directory.
3. Initialize `AppConfig` (loads `.env`, resolves paths, sets DB URL for SQLite).
4. Dynamically import `src/server-runtime.ts` only after config bootstrap completes.
5. Run Prisma migrations when the schema is present.
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

Persistence is subsystem-owned rather than selected through a global mode.

- Token usage is persisted through `src/token-usage/providers/token-usage-store.ts`.
  - The store is the authoritative token-usage boundary.
  - It writes and reads SQL rows through Prisma-backed repositories.
- Agent definitions, team definitions, and MCP server config remain file-backed through their own subsystem providers.
- SQLite URL derivation is controlled by DB config (`DB_TYPE=sqlite` with optional `DATABASE_URL` override), and startup runs the normal Prisma migration path whenever the Prisma schema exists.

External-channel persistence has one deliberate exception:

- file-backed external-channel artifacts live under `<appDataDir>/external-channel/`
- channel route bindings are always file-backed and stored at `<appDataDir>/external-channel/bindings.json`
- the callback outbox is stored at `<appDataDir>/external-channel/gateway-callback-outbox.json`
- external-channel receipts and delivery events are file-backed and live in that same folder regardless of the global persistence profile
- accepted receipts remain unfinished durable work until callback publication completes or the route resolves terminally
- startup restores unfinished accepted receipts through the accepted-receipt recovery runtime after the server begins listening
- runtime reply routing depends on accepted runtime `turnId` values being bound to those persisted receipts before outbound delivery work can be published

Build/package notes:

- `build` runs the standard server build.
- The standard build generates Prisma client code before TypeScript compile.
- There is no separate file-profile build output.

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
