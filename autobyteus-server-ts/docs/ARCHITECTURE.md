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
- Memory Sync hub/source config, source-state fingerprints, and hub credential
  metadata are file-backed under `<appDataDir>/memory-sync/`; imported memory
  corpus files are kept under the configured memory root at
  `memory/imports/<sourceNodeId>/`.
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

Normal server shutdown first stops dependent delivery runtimes, then quiesces
the token transformers. Token persistence is awaited inside the event pipeline,
so there is no detached append queue to drain. Shutdown next closes the secret
runtime to zeroize its root key and finally shuts down the shared
`repository_prisma` client.

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

Application-framework dependency directions are additionally enforced by the
test-only `tests/architecture/application-framework-boundaries.test.ts` rules
`AFB-001`, `AFB-002`, `AFB-003`, `AFB-004`, and `AFB-005`. They cover transport/runtime projections, Studio
GraphQL and application presentation, package/bundle ownership, complete
application-scoped run/session/publication/team construction, and maintained
application/template imports. The canonical policy table, project/manifest
resolution rules, injection families, and remediation guidance are in
[`docs/modules/applications.md`](./modules/applications.md#executable-application-framework-boundaries).


## Native Working-Context Compaction

Native AutoByteus compaction is composed in `autobyteus-ts` as a proposal /
accept / commit boundary. `PendingCompactionExecutor` captures the manager-owned
WorkingContext and lineage-head baseline, resolves the configured strategy, and
requests an ID-less proposal. `MemoryManager` verifies the baseline, assigns
output identities, builds and validates the complete accepted candidate, and
publishes it in this order: exact new-raw archive, episode/semantic rows,
append-only lineage record, installed WorkingContext, schema-v5 message snapshot,
then pending clear. Raw archiving is an independent command; the archive manager
owns its descriptor/filename, and neither is copied into the candidate or
lineage.

The last valid record in `compaction_lineage.jsonl` is the only current-compaction
authority. It identifies the exact current output rows, the optional immediately
preceding compaction, and execution/prompt audit metadata. There
is no mutable current pointer, compaction-state file, compacted-memory manifest,
or snapshot-level output identity. Recurrent compaction consumes current output
plus new raw-backed work and produces one complete replacement. The built-in
Memory Compactor chooses the natural number of episodes and semantic facts
required for continuation; accepted output requires at least one episode, but
the parser, normalizer, manager publication, lineage, and current projection do
not impose the former fixed total-count limits.

Native trigger planning is derived from the same input budget and threshold that
requested the operation. One immutable operation budget sets a post-compaction
target below the threshold with explicit headroom, accounts for required system
content, protected final tool protocol, untracked prompt overhead, and
replacement memory, and fails closed when the target is unattainable. Finalized
accepted context must fit that same target. After success, an actual-observation
episode suppresses repeated proactive operations until a normalized prompt
observation falls below threshold; missing prompt counts do not mutate the
episode, changed budget identity resets it, and hard-input-cap pressure remains
an override. The threshold episode is process-local, not persisted memory.

The persisted `autobyteus-memory-compactor` system prompt owns the stable task,
natural-sizing guidance, and six-array response schema. The initial operation
message explicitly identifies the target agent and contains one
`<target_agent_conversation_history>` block inside one plain-text target-agent
`START` / `END` separator pair, with nothing after the end separator. The
renderer reuses `WorkingContextFinalizer` so compatible prior-memory/current-user
regions appear as one natural User turn, while assistant and Tool order,
redaction, per-value bounds, renamed-boundary escaping, and input non-mutation
remain enforced. Generic sender headings are removed from shared input
composition; content without readable context remains unchanged, while combined
context/message payloads use only neutral `[Context]` and `[Message]` sections.

Derived compaction text is normalized to a provider-safe Unicode copy without
rewriting canonical raw traces or stored source values. Valid surrogate pairs,
multilingual text, code, paths, symbols, emoji, newline, and tab are preserved;
lone surrogates are replaced, non-useful C0 controls are removed, and middle/end
truncation cannot split a pair. The completed initial or correction prompt is
checked before child launch. Failure is typed `input_construction_failure` and
performs no child/correction call, target dispatch, or canonical mutation while
retaining the user-authorized pending gate.

The response boundary validates every exact, fenced, or balanced JSON-object
candidate against the six required arrays and accepts only one distinct
host-consumed result with a non-empty episode. Harmless extra fields do not fail
validation, unrelated JSON cannot mask a later valid object, and multiple valid
objects are ambiguous. A typed returned-content failure receives one corrective
child attempt with the same selected history. Initial and optional correction
children are disabled siblings owned by the parent operation, not recursive
descendants, and neither persists child lineage/archive state. Child error
completion, interruption, terminal error, timeout, tool approval,
launch/rejection, and collection failure retain typed runner identity and bypass
response repair. The compactor remains tool-free: the native exposure resolver
matches its exact built-in definition ID before ordinary default/team
composition, leaving final `AgentConfig.tools` empty while ordinary native
agents retain all four foundation tools. Success produces one parent completed
lifecycle and one accepted commit; final failure leaves the pending operation
and canonical memory unchanged.

A new pending operation has one automatic initial attempt. Final failure changes
it to `awaiting_user_retry`, stops that target-agent turn before dispatch, and
permits one new attempt from each distinct later user-origin turn. Agent/system
turn-start entries remain in the core runtime queue; the scheduler may select the
earliest user behind them without dropping or reordering them, then resumes
ordinary relative FIFO after a successful retry. There is no same-turn,
background, or non-user retry and no persistent deferred-message store.

New lineage records write `promptContractVersion: 3`. Existing immutable values
1 and 2 remain directly readable, mixed `1 -> 2 -> 3` chains remain valid, and
any unsupported audit value is rejected without compatibility decoding or file
mutation. Existing schema-v1 stored supersets that include the former
`rawTraceArchiveFile` field remain directly readable: normalization ignores that
extra field without rewriting data or introducing a schema branch, and new rows
omit it.

`AUTOBYTEUS_COMPACTION_STRATEGY` is resolved for each pending operation through
the default registry. The only production registration is `structured-json`; it
uses the fixed built-in `autobyteus-memory-compactor`, with blank runtime/model
launch values inherited from the parent run. The removed
`AUTOBYTEUS_COMPACTION_AGENT_DEFINITION_ID` key is inert, and no arbitrary-agent
fallback exists.

Automatic compaction is one complete runtime composition owned by core memory:
`disabled` has no policy or runner; `enabled` has the existing single
`CompactionPolicy` and current strategy runner. `AgentConfig` carries it through
`AgentFactory` into `MemoryManager`, and direct core construction defaults to
disabled. The server backend selects disabled for the exact built-in compactor
on create/restore without invoking the runner factory. Ordinary native agents
receive enabled composition; runner construction failure cannot silently turn a
normal agent into a disabled one.

The generic LLM phase resolves provider/model request capacity for both
variants. Enabled agents retain compaction-budget derivation and the current
policy/strategy/executor/observation/lifecycle path. Disabled compactor children
skip proactive and hard-input-cap classification, pending/execution work, and
compaction lifecycle reporting while preserving the original response/tool
outcome. Provider-admissible tasks run directly as leaves; oversized tasks fail
through existing planning/pre-launch or typed runner handling rather than
recursively rewriting their own instruction/history. This is runtime-only
composition and requires no persisted-data migration.

The backend resolves explicit standalone/team-member lineage scopes for native
memory composition. There is no direct/recursive episode/semantic-to-raw origin
resolver or server service. `CurrentCompactionOutputLoader` reads only the
lineage tail and exact output membership; malformed or unsupported lineage and
missing or misordered output rows remain integrity errors, and current projection
never opens a raw archive.

Server startup migration `20260731_migrate_native_working_context_snapshots_v5`
replaces the destructive pre-lineage reset. One exact runtime-location classifier
identifies native standalone/team-member targets and supplies `runId` or
`memberRunId`. External snapshot cleanup and the retained raw rotation-layout /
active-filename migrations run first. Native conversion then applies only when
lineage is absent or zero-byte; any nonempty lineage skips the location untouched.
The migration validates a strict-v5 candidate built only from truthfully backed
same-location active facts before replacing the snapshot, then removes only old
episode, semantic, and compacted-memory-manifest files. It never mutates raw
traces/manifests or lineage. Ordinary warning/failure results remain recorded and
retryable, but the runner returns them and server startup continues. Runtime
restore accepts strict v5 only; it has no pre-v5 reader or raw-history projector.

LLM request recovery is anchored after any pending compaction. The request
assembler captures the stable post-compaction checkpoint immediately before
request-specific mutation and carries it in the request package. Assembly or
provider failure restores it; normal final output, real Tool ingestion, and
supported retained interruption release it exactly once. Recovery never rolls
back accepted archive/output/lineage state.

`ServerSettingsService` exposes the global strategy setting through the existing
`.env`/`process.env` path and rejects values absent from production registry
metadata. GraphQL exposes a read-only `{ id, name }` catalog and a separate
effective-selection read; Settings -> Server Settings -> Basics consumes those
authorities without inferring a default from catalog order. Selected strategy,
provider, model, and runtime execution metadata are retained on successful
lineage records and lifecycle reporting.

See `autobyteus-ts/docs/agent_memory_design.md` for the full persistence,
lineage, raw-archive independence, current-context, restore, presentation, and
failure contracts.

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
   initializing, prepared-activation, restore, duplicate, and typed command
   lifecycle as WebSocket `SEND_MESSAGE`; the resolved AgentRun owns FIFO
   admission rather than rejecting otherwise-valid parallel commands, while
   team target resolution remains team-container owned. The facade waits for the authoritative
   `TURN_STARTED` event when the dispatch call does not return a `turnId`
   directly.
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
