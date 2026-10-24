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
- Agent Tools MCP dedicated loopback listener and Streamable HTTP route:
  `src/agent-tools/mcp`
- GraphQL schema/types: `src/api/graphql`
- WebSocket routes: `src/api/websocket` (including the `/ws/projects` and
  `/ws/agent-package-definitions` change feeds)
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
8. Validate current token-usage schema invariants, then run required app-data
   migrations against the expanded schema.
9. Classify token-usage readiness as ready, capability-degraded, or critical
   current-schema failure without activating a legacy runtime path.
10. Build and start Fastify transports.
11. Create temp workspace.
12. Schedule non-critical background startup tasks.

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

- Token usage has separate lifetime and observation-time projections.
  - `TokenUsageRunStore` / `TokenUsageRunAccumulator` keep the lifetime authority
    as one cumulative `token_usage_run_records` row per canonical AgentRun ID.
  - A `CHANGED` fold saves that row and increments the matching compact UTC daily
    analytics facet inside the same SQLite transaction; suppressed observations
    advance neither projection and any facet failure rolls back both.
  - `TokenUsageAnalyticsProvider` reads the daily projection plus immutable
    tracking coverage to serve filtered UTC period analytics without fabricating
    history from lifetime records.
  - Legacy ledger tables and decoders are migration-only; current runtime,
    analytics, and GraphQL paths do not read or write them.
- Encrypted secret persistence uses separate `SecretEntry` and
  `SecretEncryptionMetadata` model repositories behind the vault persistence
  coordinator. The coordinator alone opens option-aware implicit transactions;
  service, bootstrap, and runtime code do not receive Prisma clients or
  transaction delegates.
- Agent definitions, team definitions, and MCP server config remain file-backed through their own subsystem providers.
  Agent, team and org definitions from registered agent packages are served from
  the in-memory [agent package definitions](modules/agent_package_definitions.md),
  which watch the registered package folders, keep the last working version of a
  broken definition, and announce changes on `/ws/agent-package-definitions`. They
  hold no persisted state.
- Memory Sync hub/source config, source-state fingerprints, and hub credential
  metadata are file-backed under `<appDataDir>/memory-sync/`; imported memory
  corpus files are kept under the configured memory root at
  `memory/imports/<memorySyncSourceId>/`.
- SQLite URL derivation is controlled by DB config (`DB_TYPE=sqlite` with optional `DATABASE_URL` override), and startup runs the normal Prisma migration path whenever the Prisma schema exists.
- Required app-data migrations run after Prisma schema migrations so data repair
  can rely on the expanded current shape before runtime/API reads begin. Token
  usage first repairs released source-shaping migrations, then atomically folds
  the migration-owned event source into one current record per run. A valid
  current schema with incomplete history gates historical reads and old-run
  restore while allowing new current-only work; a missing required current
  schema may stop startup.
- App-data migration records keep compact status evidence: one nullable
  runner-formatted `Scanned N; migrated N; skipped N; failed N.` summary plus
  status, attempts, timestamps, concise error, and the referenced attempt-log
  path. Full per-item diagnostics remain only in that filesystem log; current
  database, GraphQL, and Settings paths do not carry or decode the released
  detail-bearing `summary_json` shape.

Normal server shutdown quiesces the token transformers. Token persistence is
awaited inside the event pipeline, so there is no detached append queue to
drain. Shutdown next closes the secret runtime to zeroize its root key and
finally shuts down the shared `repository_prisma` client.

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

Application-framework dependency directions are additionally enforced by the
test-only `tests/architecture/application-framework-boundaries.test.ts` rules
`AFB-001`, `AFB-002`, `AFB-003`, `AFB-004`, and `AFB-005`. They cover transport/runtime projections, Studio
GraphQL and application presentation, package/bundle ownership, complete
application-scoped run/session/publication/team construction, and maintained
application/template imports. The canonical policy table, project/manifest
resolution rules, injection families, and remediation guidance are in
[`docs/modules/applications.md`](./modules/applications.md#executable-application-framework-boundaries).

External chat platforms are outside the server boundary. The server has no chat
ingress route, chat-to-run binding model, managed chat gateway runtime, or
outbound delivery to chat platforms, and runs start only through the normal
Agent, Team, and AgentOrg launch paths. A chat-platform integration is built as
a separate project and reaches agents as an ordinary MCP server plus skills,
configured through [MCP server management](./modules/mcp_server_management.md)
and [skills](./modules/skills.md) and assigned like any other tools. The
one-time startup removal of the former built-in integration's data is described
under "Production data migrations" in the server `README.md`.

## Native Working-Context Compaction

Native memory compacts selected WorkingContext content on the agent's own model.
The executor owns planning and provider-safe input construction; the
`CompactionSummarizer` first sends the agent's own (prompt-cached) conversation
request plus a summary instruction when the model's catalog entry selects it
(`compactionSummaryMode`), and otherwise or on failure a tool-free transcript
summary. Every attempt is a single-attempt provider generation validated against
the exact nine-heading Markdown envelope (see
`autobyteus-ts/docs/agent_memory_design.md`). It does not launch a child agent,
select a registered strategy, repair JSON category arrays or write
episodic/semantic/lineage output. There is no separate compaction-model setting.

The accepted snapshot `{agent_id, messages}` is the continuation authority. Raw
archive preparation precedes atomic snapshot replacement; in-memory installation
and pending clear follow that commit point, with best-effort active pruning last.
This is per-file atomicity, not a multi-file or whole-power-loss guarantee.
Normal restore reads current known fields, repairs unmatched native tools from
active raw facts and validates/saves without category or lineage dependencies.
The existing historical startup migration retains its frozen conversion rules and
preserves exact current versionless successor locations unchanged; no new migration
or successful-ledger reset accompanies this cutover.

Failure retains a pending operation and a failure epoch. A newly accepted user
message after failure permits retry; a pre-parent held A resumes before later B
once each on success. Completed-response failures gate the next turn instead of
replaying work. Root termination and client terminal activity reconciliation are
identity-scoped, retain facts and reject late output. Native in-memory terminal
retention is not native cold replay or a general immediate shutdown guarantee.

Server composition enables compaction with the policy only; the core summarizer
always uses the agent's own model (cached summary request first, transcript
fallback). A value saved under the removed `AUTOBYTEUS_COMPACTION_MODEL_SETTINGS`
key is inert, as are old strategy/compactor-agent settings. Ordinary parent and
external-provider request/session policies are not replaced.

See [core memory design](../../autobyteus-ts/docs/agent_memory_design.md),
[server memory](modules/agent_memory.md),
[settings](../../autobyteus-web/docs/settings.md#server-settings-working-context-compaction)
and [frontend activity/recovery](../../autobyteus-web/docs/agent_execution_architecture.md#run-level-compaction-activity)
for the authoritative ownership and limitations.

## Agent Work Journal

The Work Journal subsystem lives under `src/agent-work-journal`. It renders a run's raw traces
into deterministic, runtime-neutral Markdown under `<memoryDir>/work_journal/`: one journal file
per raw-trace file (closed segments are written once, the open file is rendered again at each
turn end) plus `work_journal_manifest.json`. Built-in tools of each runtime read as plain actions
(`Command:`, `Write file:`, `Edit file:`, `Search web:`), every other tool as `Tool: <name>`.
`WorkJournalRunUpdater`, attached to every AgentRun after the memory recorder, keeps live runs
current; consumers call `getWorkJournalService().ensureCurrent({ runId, memoryDir, runtimeKind })`
and receive the file paths and an evidence hash. Raw traces stay the only authority: the journal
is regenerable and never feeds back into recording, restore or run history.
See `modules/agent_work_journal.md` for the detailed contract.

## Testing Layers

- Unit tests: isolated service/provider behavior.
- Integration tests: repository/provider/service with real DB fixtures.
- E2E tests: GraphQL and transport paths.

Test tree is in `autobyteus-server-ts/tests`.
