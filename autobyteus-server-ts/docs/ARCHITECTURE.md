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
- each inbound external message creates one durable `ChannelMessageReceipt` that remains unfinished work until callback publication completes or the route resolves terminally
- successful external dispatch is accepted only after the external-channel run facade has an authoritative `turnId` (and `memberRunId` for team dispatches)
- startup restores unfinished accepted receipts by starting the receipt workflow runtime after the server begins listening
- post-accept reply routing is turn-scoped and depends on the persisted receipt already owning that authoritative `turnId`
- no chronology-based turn binding or legacy accepted-receipt recovery runtime remains in the active business path

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

## External-Channel Messaging Runtime

The external-channel subsystem is receipt-owned at the durable workflow layer and
event-driven at the runtime edges.

Primary spine:

1. `ChannelIngressService` accepts the inbound provider message, enforces
   idempotent receipt creation/claiming, and resolves the bound route target.
2. `ChannelAgentRunFacade` or `ChannelTeamRunFacade` resolves or restores the
   bound run, serializes same-run dispatches, posts the user message, and waits
   for the authoritative `TURN_STARTED` event when the dispatch call does not
   return a `turnId` directly.
3. Only after that exact turn identity exists does the server persist the
   receipt as `ACCEPTED` with workflow state `TURN_BOUND`.
4. `ReceiptWorkflowRuntime` becomes the sole durable owner for the post-accept
   lifecycle: live observation, known-turn recovery, final reply readiness, and
   callback publication.
5. `ReplyCallbackService` and the gateway callback outbox own outbound
   publication durability.

Important ownership rules:

- dispatch-time turn capture belongs to the external-channel facade boundary, not
  to the agent-runtime core
- runtime events remain generic; clients and adapters listen to them without
  adding external-channel-specific payloads to the core event schema
- live reply bridges and persisted recovery are subordinate to the receipt
  workflow and operate only on already-known turns
- a second inbound message on the same thread creates a new receipt and a new
  turn, while the binding may reuse or restore the same underlying run

## Testing Layers

- Unit tests: isolated service/provider behavior.
- Integration tests: repository/provider/service with real DB fixtures.
- E2E tests: GraphQL and transport paths.

Test tree is in `autobyteus-server-ts/tests`.
