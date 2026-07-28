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
- Agent Tools MCP Streamable HTTP route: `src/agent-tools/mcp`
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
6. Initialize `repository_prisma@1.0.9` for the exact canonical application
   database URL, without enabling WAL.
7. Initialize or verify the encrypted secret vault through the shared
   repository lifecycle.
8. Run required app-data migrations against the expanded schema.
9. Build and start Fastify transports.
10. Create temp workspace.
11. Schedule non-critical background startup tasks.

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
- Memory Sync background worker loading when source background sync is enabled

## Persistence

Persistence is subsystem-owned rather than selected through a global mode.

- Token usage is persisted through `src/token-usage/providers/token-usage-ledger-store.ts`.
  - The store is the authoritative token-usage boundary.
  - It writes and reads SQL rows through a model-specific
    `repository_prisma` `BaseRepository`.
- Encrypted secret persistence uses separate `SecretEntry` and
  `SecretEncryptionMetadata` model repositories behind the vault persistence
  coordinator. The coordinator alone opens option-aware implicit transactions;
  service, bootstrap, and runtime code do not receive Prisma clients or
  transaction delegates.
- Agent definitions, team definitions, and MCP server config remain file-backed through their own subsystem providers.
- Memory Sync hub/source config, source-state fingerprints, and hub credential
  metadata are file-backed under `<appDataDir>/memory-sync/`; imported memory
  corpus files are kept under the configured memory root at
  `memory/imports/<sourceNodeId>/`.
- SQLite URL derivation is controlled by DB config (`DB_TYPE=sqlite` with optional `DATABASE_URL` override), and startup runs the normal Prisma migration path whenever the Prisma schema exists.
- Required app-data migrations run after Prisma schema migrations so data repair
  and guarded local schema contracts can rely on newly added columns before
  runtime/API reads begin. For example, token usage execution-address backfill
  writes historical `execution_address_json` values after the schema expand
  migration has added the column, and the later token-usage legacy-path-column
  contract migration drops obsolete physical path columns only after that
  backfill has reached terminal success.

Normal server shutdown first stops dependent delivery runtimes, then quiesces
and drains every token append accepted by the default event pipeline. It next
closes the secret runtime to zeroize its root key and finally shuts down the one
shared `repository_prisma` client. The ordering prevents an already-scheduled
token callback from reopening the database after shutdown.

External-channel persistence has one deliberate exception:

- file-backed external-channel artifacts live under `<appDataDir>/external-channel/`
- channel route bindings are always file-backed and stored at `<appDataDir>/external-channel/bindings.json`
- the callback outbox is stored at `<appDataDir>/external-channel/gateway-callback-outbox.json`
- external-channel receipts, run-output delivery records, and delivery events are file-backed and live in that same folder regardless of the global persistence profile
- each inbound external message creates one durable `ChannelMessageReceipt` for ingress idempotency, binding resolution, and accepted-dispatch audit
- accepted dispatches open or refresh a route/run output link after the external-channel run facade has an authoritative `turnId`
- startup restores open route/run links and unfinished run-output delivery records by starting `ChannelRunOutputDeliveryRuntime` after the server begins listening
- post-accept outbound delivery is route/run scoped: eligible agent or team coordinator/entry-node outputs are published through `ReplyCallbackService` and the gateway callback outbox even when no new inbound external message exists
- the legacy receipt workflow runtime and exact-turn reply bridges are not active outbound-delivery owners

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


## Native Working-Context Compaction

Native AutoByteus semantic compaction is composed in `autobyteus-ts` as a
context-to-context strategy boundary. `MemoryManager` owns the live
`WorkingContext` and persistence, while `PendingCompactionExecutor` resolves and
invokes the configured strategy, validates the returned detached context, asks
the manager to replace it, and owns lifecycle/request clearing.

The process-global `AUTOBYTEUS_COMPACTION_STRATEGY` setting is resolved for each
subsequent pending operation through the default strategy registry. The only
production registration is `structured-json` (`Structured JSON`); it uses the
fixed built-in `autobyteus-memory-compactor`, structured episodic/semantic writes, retained
suffix, compacted-memory projection, and raw-trace archive behavior behind the
stable `compact(WorkingContext): Promise<WorkingContext>` contract. Strategy
selection is not stored on agent definitions, runs, teams, `AgentConfig`, or the
working context. The built-in compactor inherits blank runtime/model launch
fields from the parent run; the removed
`AUTOBYTEUS_COMPACTION_AGENT_DEFINITION_ID` key is not a runtime selector and a
stale custom value is inert.

`ServerSettingsService` exposes the global setting through the existing
`.env`/`process.env` persistence path and rejects values not present in production
registry metadata. GraphQL exposes `getWorkingContextCompactionStrategies` as a
read-only `{ id, name }` registry projection and
`getEffectiveWorkingContextCompactionStrategyId` as the separate normalized ID
runtime will attempt. The Settings -> Server Settings -> Basics Compaction card
uses that catalog/effective-ID pair, persists changed valid values through the
existing one-setting mutation, and never infers a default from catalog order.
The selected strategy id/name is included in native compaction lifecycle
metadata. See `autobyteus-ts/docs/agent_memory_design.md` for the domain,
validation, restore, extension, and failure contracts.

## Agent Work Trace Projection

The shared work-trace subsystem lives under `src/agent-work-traces`. It owns the
raw-trace-to-readable-Markdown projection boundary for target run memory
directories. Consumers call
`AgentWorkTraceProjectionService.ensureCurrent({ target, memoryDir, targetDisplayName })`;
the capability reads canonical raw traces through
`RawTraceFileSourceService`, writes derived files under
`<memoryDir>/work_traces/`, and returns a clean manifest/package with target metadata, file paths, and a summary hash over rendered evidence. The older skill-improvement-owned
generated cache root `<memoryDir>/skill_improvement/work_traces/` is not a runtime
fallback or dual-write target because work traces are regenerable from canonical
raw traces.
See `modules/agent_work_traces.md` for the detailed shared contract.

## Skill Improvement Runtime

The skill-improvement subsystem is a control-plane workflow under `src/skill-improvement`.
It is globally disabled by default through `ENABLE_SKILL_IMPROVEMENT`. Manual starts
resolve eligibility from current global Skill Improvement settings and the current
live target state, not from launch-time run overrides or stored launch snapshots.
Agent/team definitions and launch inputs do not own Skill Improvement eligibility.
Manual starts consume the shared Agent Work Trace Projection package for the
selected standalone run or team member, then activate or reuse a visible
target-scoped Retrospective Skill Improver `AgentRun` and send it a small path-based trigger. The
Retrospective Skill Improver reads work trace files, may edit only exact configured skill roots, and
can report a meaningful durable skill update through the grant-scoped
`send_message_to` contract. A required startup migration removes obsolete
`skillImprovementEffective` fields from existing run and team-member metadata. The
MVP intentionally has no product change-audit or metrics/reporting service;
Git/manual inspection remains the review surface. See `modules/skill_improvement.md`
for the detailed consumer contract.

## External-Channel Messaging Runtime

The external-channel subsystem is receipt-owned for inbound ingress and
run-output-owned for outbound delivery. Inbound receipts are durable audit and
idempotency records; they do not own external reply publication.

Primary spine:

1. `ChannelIngressService` accepts the inbound provider message, enforces
   idempotent receipt creation/claiming, and resolves the bound route target.
2. `ChannelAgentRunFacade` or `ChannelTeamRunFacade` resolves the bound route
   run identity and serializes same-run dispatches. Standalone agent dispatch
   uses `AgentRunCommandCoordinator` with a stable external-channel
   `message_id` / `dedupe_key`, so it inherits the same backend-owned
   initializing, prepared-activation, restore, duplicate, and busy-command
   behavior as WebSocket `SEND_MESSAGE`; team dispatch remains team-container
   owned. The facade waits for the authoritative `TURN_STARTED` event when the
   dispatch call does not return a `turnId` directly.
3. Only after that turn identity exists does the server persist the receipt as
   `ACCEPTED` and attach the accepted dispatch to `ChannelRunOutputDeliveryRuntime`.
4. `ChannelRunOutputDeliveryRuntime` subscribes to the authoritative agent/team
   event stream for the active route/run link. It observes eligible output turns,
   finalizes reply text, and stores one `ChannelRunOutputDeliveryRecord` per
   binding/route, target run/member, and turn.
5. `ChannelRunOutputPublisher` publishes finalized records through
   `ReplyCallbackService`; `ReplyCallbackService` enqueues the outbound envelope
   into the existing gateway callback outbox and treats enqueue or callback-key
   duplicate as the server-side publish boundary.
6. The message gateway treats server ingress dispositions
   `ACCEPTED | UNBOUND | DUPLICATE` as terminal inbox results, with accepted
   ingress stored as `COMPLETED_ACCEPTED`.

Important ownership rules:

- dispatch-time turn capture belongs to the external-channel facade boundary, not
  to the agent-runtime core
- runtime events remain generic; clients and adapters listen to them without
  adding external-channel-specific payloads to the core event schema
- run-output delivery is the only active external-channel outbound owner for
  both direct replies and later follow-up outputs
- team output eligibility is restricted to the bound coordinator/entry member;
  worker-only and internal coordination turns are not sent to the external peer
- binding lifecycle events reconcile output subscriptions when a route is
  rebound or cached run identity changes; stale recovered output records become
  terminal instead of publishing to an outdated binding
- a second inbound message on the same thread creates a new receipt and a new
  turn, while the binding may reuse or restore the same underlying run; eligible
  later outputs from the active linked run do not require another inbound message

## Testing Layers

- Unit tests: isolated service/provider behavior.
- Integration tests: repository/provider/service with real DB fixtures.
- E2E tests: GraphQL and transport paths.

Test tree is in `autobyteus-server-ts/tests`.
