# Token Usage

## Scope

Token Usage is the server-owned accounting boundary for model/runtime usage.
The current source of truth is `token_usage_run_records`: exactly one cumulative
row per canonical agent `run_id`. The same invariant covers standalone runs,
direct and nested Team members, and delegated/task-created agent runs.

`TOKEN_USAGE_UPDATED` observations are transient inputs. They carry the raw
runtime facts needed to normalize and fold one update, but the current store
does not retain one row or raw payload per notification. The released
`token_usage_ledger_events` table remains declared only inside the production
migration contract for direct and skip-version upgrades; normal runtime code
does not read or write it.

Each current run record contains:

- cumulative token components and estimated API-cost components;
- exact canonical run identity plus root-Team/task/display attribution;
- first/latest observation and run-created timestamps;
- latest runtime/model/prompt/context facts;
- aggregate identity, pricing, cache, cost-status, and quality summaries; and
- compact cumulative-snapshot checkpoints and recent idempotency digests needed
  to fold future observations safely.

Event-level raw usage history is intentionally not part of the authoritative
store.

## Source Map

- Transient event/domain contract:
  `src/agent-execution/domain/agent-run-token-usage.ts`
- Event pipeline:
  - `src/agent-execution/events/default-agent-run-event-pipeline.ts`
  - `src/agent-execution/events/processors/token-usage/token-usage-event-enrichment-transformer.ts`
  - `src/agent-execution/events/processors/token-usage/token-usage-run-persistence-transformer.ts`
- Current token-usage owner: `src/token-usage`
  - domain record: `domain/token-usage-run-record.ts`
  - deterministic fold: `projections/token-usage-run-fold.ts`
  - accumulator: `services/token-usage-run-accumulator.ts`
  - use-case facade/readiness: `providers/token-usage-run-store.ts` and
    `providers/token-usage-migration-readiness.ts`
  - SQL repository: `repositories/sql/token-usage-run-repository.ts`
- GraphQL: `src/api/graphql/types/token-usage-stats.ts`
- Current Prisma owner:
  - `prisma/schema.prisma` model `TokenUsageRunRecord`
  - `prisma/migrations/20260819090000_add_token_usage_run_records/`
- Migration-only legacy owners:
  - `src/app-data-migrations/migrations/token-usage-custom-provider-model-value-backfill-migration.ts`
  - `src/app-data-migrations/migrations/token-usage-provider-name-snapshot-backfill-migration.ts`
  - `src/app-data-migrations/migrations/team-run-execution-tree-v1/`
  - `src/app-data-migrations/migrations/token-usage-run-records-v1/`

Production migration design follows
[`Production Data-Migration Conventions`](../design/production_data_migration_conventions.md).

## Observation And Persistence Flow

`TOKEN_USAGE_UPDATED` remains the live event contract. The default event
pipeline processes each token event in this order:

1. `createTokenUsageUpdatedPayload(...)` normalizes the runtime payload into the
   transient token-usage observation shape.
2. `TokenUsageContextEnricher` adds run, root-Team, workspace, task, and display
   context from the active run.
3. `TokenUsageComponentBasisResolver` defines gross/standard/cache/billable
   component meaning. It is the only stage that interprets whether provider
   input already includes cache tokens (`gross_includes_cache`) or is additive
   (`base_excludes_cache`).
4. `TokenUsageSnapshotDeltaNormalizer` prepares an optimistic live delta and
   preserves exact cumulative source counters in the transient payload. It is
   not the durable reconciliation owner.
5. `TokenCostCalculator` enriches the transient observation using trusted
   server-side model pricing.
6. The awaited `TokenUsageRunPersistenceTransformer` sends the enriched
   observation to `TokenUsageRunStore`. `TokenUsageRunAccumulator` serializes
   work by `run_id`, resolves the pricing policy, folds inside a real SQLite
   transaction, upserts the one current row, and returns the authoritative
   per-event contribution plus `run_summary_after_event`.

`run_summary_after_event` is the complete cumulative current-record projection
after the successful fold, not another live delta. Standalone and Team
websocket paths preserve that snapshot through their strict transport
contracts. A persistence-unavailable event or a snapshot that cannot be
projected safely carries no public cumulative summary; consumers must keep or
load the current GraphQL record instead of fabricating a complete cache entry.
The public summary builder projects only the canonical
`TokenUsageRunSummaryPayload` fields explicitly; it must not spread the broader
statistics aggregate into a live snapshot. Statistics-only diagnostics such as
`observed_runtime_kinds`, `observed_model_identifiers`, and
`observed_model_providers` remain outside both standalone and Team strict event
DTOs.

Persistence is not detached with `setImmediate`; a completed pipeline transform
has completed its token fold. A failed fold is logged and the live event still
continues with `token_usage_persistence_unavailable`. If the BigInt record was
persisted but cannot be projected as an exact JavaScript safe integer, the event
continues with `token_usage_public_summary_unavailable` instead. Shutdown
quiesces both token transformers so no new persistence work begins after the
shared Prisma lifecycle starts closing; there is no background append queue to
drain.

## Current Run-Record Invariants

### Identity And Transaction Ownership

- `token_usage_run_records.run_id` has a database unique constraint.
- `run_id` is the concrete AgentRun identity. Team-context records also carry
  `root_team_run_id`; the TeamRun execution tree remains the topology authority.
- A process-wide per-run promise queue serializes observations for the same run.
  Each fold reads and writes the row within one repository transaction.
- Different runs remain independent. Readers query the current table directly;
  they do not reconstruct a run from event arrays.

### Additive Observations

`per_call` and `per_turn` observations contribute their normalized component
deltas directly. The fold accumulates token and cost components, merges
identity/pricing/cache/status facts truthfully, increments `usage_report_count`,
and preserves only the latest prompt/context fields selected by the observation
ordering marker.

### Cumulative Snapshots

Cumulative sources such as Codex cannot be summed blindly. The persisted fold
uses a stable snapshot-series digest and the exact transient source counters:

- a known series contributes only positive advancement beyond its checkpoint;
- unchanged replays contribute zero and do not increment the report count;
- regressed counters contribute zero, preserve the component-wise maximum
  checkpoint, and add a quality flag;
- the first Codex snapshot uses provider-delta reconciliation when available;
  otherwise it establishes a no-charge baseline rather than charging historical
  thread totals; and
- duplicate event/idempotency digests contribute zero.

State is bounded per run:

- at most 8 cumulative-series checkpoints and 16 KiB encoded checkpoint state;
- at most 64 recent event/idempotency digests and 8 KiB encoded digest state;
- keys are SHA-256 digests rather than retained raw identifiers.

When a ninth series appears, the least-recent checkpoint is evicted
deterministically. A later observation for an evicted series establishes a
no-charge baseline and records `cumulative_series_checkpoint_evicted`. This can
cause bounded undercount for extreme series churn but cannot double-charge the
unknown interval or grow storage without bound.

### Stored Numbers And Public SafeInt

SQLite/Prisma stores cumulative token counts as `BigInt`. The GraphQL family
uses `SafeInt` and supports exact JavaScript numbers only through
`Number.MAX_SAFE_INTEGER`. An out-of-range public projection returns a bounded
field-specific error such as
`TOKEN_USAGE_SAFE_INTEGER_EXCEEDED:accounting_input_tokens`; it is not rounded,
capped, string-coerced, or silently dropped. Persistence can therefore remain
truthful even when the current public number contract cannot represent a value.

## Runtime Adapter Semantics

### Codex App Server

Codex emits `thread/tokenUsage/updated` notifications containing
`tokenUsage.total`, `tokenUsage.last`, and `modelContextWindow`.
`resolveCodexThreadTokenUsage(...)`:

- prefers `total` as a `cumulative_snapshot` with stable
  `snapshot_series_key=codex_thread:<thread-id>`;
- uses `last` as a `per_call` fallback only when `total` is absent;
- carries `last` in transient reconciliation metadata so the first cumulative
  snapshot can charge the provider delta rather than historical totals;
- treats input as `gross_includes_cache`;
- maps cache-read, reasoning-output, latest-prompt, and context-window facts to
  first-class fields; and
- does not infer cache creation from `inputTokens - cachedInputTokens`.

The supported Codex contract exposes no cache-write quantity. Raw Codex
payloads remain transient event evidence used by the fold and live path; they
are not retained in the cumulative database row. Multiple updates for one
active turn are dispatched in arrival order rather than collapsed in a pending
turn map.

### Claude Agent SDK

Claude accounting is terminal-result based. Thinking/text stream chunks are
content events, not token contributions. `buildClaudeTokenUsageEvent(...)`
emits one `per_turn` observation from terminal `result.usage` and/or
`modelUsage`.

Claude/Anthropic input uses `base_excludes_cache`: gross input is base input
plus cache-read and cache-creation buckets. Numeric thinking details map to
`reasoning_output_tokens`; absent numeric detail remains null even when thinking
content exists. Divergence between comparable `usage` and `modelUsage` facts is
flagged rather than changing Claude into cumulative accounting.

## Token And Pricing Semantics

The transient observation separates reported provider readings from the
accounting contribution. The persisted run record stores cumulative accounting
components rather than reported raw snapshots:

- gross, standard, cache-miss, cache-read, cache-creation (general/5m/1h),
  output, reasoning-output, billable-input, and billable-output token totals;
- latest prompt and effective context-window facts separately from lifetime
  totals; and
- usage report count as model/runtime usage reports, not chat rows or user
  messages.

Estimated API cost is server-owned, nullable, and distinct from token counts:

- `estimated`: every required positive-token dimension had trusted pricing;
- `price_missing`: usage exists but trusted pricing was absent;
- `partial_price_missing`: only some required dimensions were priced;
- `local_no_api_bill`: the runtime has no provider API bill in this context;
- `mixed`: aggregate rows contain incompatible price statuses, providers,
  models, or currencies and therefore do not sum unsafe monetary values.

Constructor/default-zero prices are not trusted free prices. Public summaries
include component `unitPrices`, policy/tier identifiers, currency/status, and
missing dimensions so the UI can explain costs without recalculating them.
Reasoning tokens remain a visible subset of output and are not double-counted.

## Production Data Transition

### Expansion And Legacy Boundary

The Prisma expansion migration creates `token_usage_run_records` with unique
`run_id` and all current columns. `TokenUsageLedgerEvent` remains declared only
because Prisma schema deployment precedes app-data transformation on a direct
or skip-version upgrade. Current domain, repository, provider, GraphQL, and
runtime code contain no legacy query, decoder, dual reader/writer, or missing-
current-table fallback.

### Released Source-Shaping Repairs

The existing migration IDs
`20260730_token_usage_custom_provider_model_value_backfill` and
`20260730_token_usage_provider_name_snapshot_backfill` are repaired in place so
installations already marked `FAILED` retry the corrected definitions. Both
migrations:

- select only SQL-eligible candidates and required scalar columns;
- use keyset batches of at most 250 rows;
- update only the target field with compare-and-set conditions;
- validate with scalar counts rather than whole-ledger snapshots;
- cap examples while retaining per-reason counts; and
- leave failures truthful and retryable.

The TeamRun V1 token attribution repository also lives inside its registered
migration boundary. It may interpret released predecessor columns to correct
legacy root attribution before consolidation, but no current token owner imports
that repository or those legacy fields.

### One-Row Consolidation

Startup-only migration `20260819_token_usage_run_records_v1` runs after both
source-shaping migrations. Inside one SQLite transaction it:

1. validates nonblank canonical run IDs and zero intersection between legacy
   and already-current run IDs;
2. keyset-reads each run's legacy rows in batches of at most 250;
3. deterministically folds the complete legacy run into one current record;
4. validates per-run aggregates plus global row/run counts;
5. inserts one current row per legacy run; and
6. deletes every legacy source row only after all validation succeeds.

Any failure rolls back both target inserts and source deletion. Ordinary startup
retry repeats the same path. A successful consolidation leaves the legacy table
empty and its SQLite pages reusable. It does not run startup `VACUUM`, and the
physical legacy table/model contract remains for a separately sequenced future
contraction.

### Readiness And Availability

Bootstrap validates the current table, required columns, and unique `run_id`
constraint before app-data migration execution:

- missing current schema is `CRITICAL_CURRENT_SCHEMA_FAILURE`; the embedded
  server exits with bounded `TOKEN_USAGE_CURRENT_SCHEMA_INVALID` evidence and
  no old-ledger runtime fallback;
- successful consolidation is `READY`; current history, summaries, and restore
  paths are available; and
- failed/incomplete consolidation with a valid current schema is
  `CURRENT_SCHEMA_DEGRADED`; the application and newly allocated runs remain
  available, but historical token reads and restoration/continuation of a
  pre-existing canonical run are rejected before provider startup.

New runs write only the current table. Global run-ID allocation plus the restore
gate keeps their IDs disjoint from legacy IDs; retry validates that disjointness
again before import. Users recover from a migration defect by installing a
corrected release and restarting. No manual production-data surgery or migration
status fabrication is part of the supported path.

## GraphQL And Statistics

`TokenUsageRunStore` and `TokenUsageStatisticsProvider` read current run records:

- `getAgentRunTokenUsageSummary(runId)` reads at most one exact run record.
- `getTeamRunTokenUsageSummary(teamRunId)` sums the concrete member records with
  that exact `root_team_run_id` once each.
- `getTeamMemberTokenUsageSummary(teamRunId, agentRunId)` requires both exact
  root and run identity.
- `tokenUsageTaskStatisticsInPeriod(startTime, endTime)` returns standalone and
  root-Team rows with usage-derived member children.
- `usageStatisticsInPeriod(startTime, endTime)` groups the same selected run
  records by runtime/model for diagnostics.
- `totalCostInPeriod(startTime, endTime)` keeps its public name but follows the
  same run-selection rule.

The date range selects runs whose `run_created_at` is in range, falling back to
`first_observed_at` only when creation time is unavailable. Every selected row
shows its lifetime cumulative totals. The one-row model does not claim exact
"usage observed during an arbitrary period" semantics and does not retain time
buckets to reconstruct them.

Task statistics keep topology ownership narrow:

- a Team row groups by exact root TeamRun ID;
- child rows represent exact concrete member run IDs;
- nested member/task usage is not repeated as a standalone top-level row;
- task IDs and captured names/summaries remain display metadata; and
- token code does not rebuild TeamRun topology from execution paths, names, or
  migration-only predecessor columns.

When history readiness is degraded, GraphQL returns
`TOKEN_USAGE_HISTORY_MIGRATION_REQUIRED` with migration status/log guidance
instead of exposing partial history.

## Frontend Contract

The frontend treats token usage as display-only state:

- standalone and Team-member caches accept only complete record-backed
  summaries from current-record GraphQL or the post-persist
  `run_summary_after_event` snapshot;
- missing, malformed, unsafe, or identity-mismatched live snapshots do not mark
  an individual cache hydrated, so focus/reopen paths still load the current
  GraphQL record;
- individual snapshots are keyed by exact run identity (and exact root-Team/run
  identity for Team members), while `usageReportCount` provides the monotonic
  generation used to reject equal or older GraphQL/live arrivals;
- Team aggregates remain backend-owned. Before hydration, persisted Team events
  may form a `live_partial` total; after hydration, a new event marks the total
  `refresh_required` rather than blindly extending a possibly inclusive
  GraphQL result. A single-flight GraphQL refresh repeats sequentially until no
  event arrived during the request, and only that stable response becomes
  `record_backed`;
- Token Meter renders latest prompt, lifetime gross input/output, component
  breakdown, estimated cost/status, pricing explanation, context pressure, and
  report count without recomputing accounting or prices;
- Settings > Token Statistics defaults to Task grouping and retains Model as a
  runtime/model diagnostic view;
- the visible range helper states that the date range selects runs by creation
  time and totals show lifetime usage; and
- a history-migration error is rendered as an actionable nonfatal warning that
  new runs remain available and a corrected installed version can retry on
  restart.

Task rows render backend-provided `children`, `rootTeamRunId`, display fields,
models, totals, and cost statuses. The frontend must not infer provider identity
from display labels, reconstruct execution topology, or round primary SafeInt
token totals. `Unpriced` is not `$0`; local/no-bill and mixed-currency states
remain explicit.

## Coverage And Operational Notes

- Deterministic unit/integration/E2E coverage owns current fold, repository,
  migration, readiness, restore, GraphQL, pricing, frontend component, and
  lifecycle contracts.
- Built-process restart coverage proves that existing current rows remain
  directly usable through run, Team, and member GraphQL reads without a data
  migration, rewritten row identity, or duplicate fold.
- Built-server coverage exercises released-row upgrade/relaunch, degraded new
  work, retry, overlap rejection, rollback, empty-source relaunch, and critical
  current-schema failure.
- Released-scale evidence covers approximately 154,000 legacy rows, 1,269 runs,
  bounded source shaping, single-transaction consolidation, reusable SQLite
  pages, and absence of startup `VACUUM`.
- Browser coverage checks normal lifetime statistics plus degraded and fatal
  error presentation in Chrome. Electron shell-specific behavior is not implied
  by browser evidence.
- Real LM Studio, Codex, and Claude runtime E2E remains opt-in:

```sh
RUN_RUNTIME_TOKEN_USAGE_E2E=1 \
RUNTIME_TOKEN_USAGE_E2E_TIMEOUT_MS=300000 \
LMSTUDIO_MODEL_ID='qwen3.5-27b:lmstudio@127.0.0.1:1234' \
CODEX_E2E_TOOL_MODEL='gpt-5.4-mini' \
CLAUDE_E2E_MODEL='sonnet' \
pnpm -C autobyteus-server-ts exec vitest run \
  tests/e2e/runtime/token-usage-runtime-graphql.e2e.test.ts
```

- Never run migration proof against a user's live production profile; use
  isolated synthetic released-shape fixtures.
- No local tokenizer estimate may feed persisted accounting.
- When GraphQL documents/types change, regenerate
  `autobyteus-web/generated/graphql.ts` against the matching backend schema.
