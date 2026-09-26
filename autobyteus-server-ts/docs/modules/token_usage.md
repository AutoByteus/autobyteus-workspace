# Token Usage

## Scope

Token Usage is the server-owned accounting boundary for model/runtime usage.
It has two deliberately separate persisted projections:

- `token_usage_run_records` is the lifetime accounting authority: exactly one
  cumulative row per canonical agent `run_id`, covering standalone runs, direct
  and nested Team members, and delegated/task-created agent runs.
- `token_usage_analytics_daily_facets` is a compact observation-time analytical
  projection keyed by UTC day and an exact captured runtime/provider/model and
  accounting facet. `token_usage_analytics_coverage` records when trustworthy
  analytical tracking began.

`TOKEN_USAGE_UPDATED` observations are transient inputs. They carry the raw
runtime facts needed to normalize and fold one update, but no current store
retains one row or raw payload per notification. The released
`token_usage_ledger_events` table remains declared only inside the production
migration contract for direct and skip-version upgrades; normal runtime code
and analytics do not read or write it. The daily projection is derived evidence,
not a second lifetime-run authority and not a provider invoice or quota source.

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
  - lifetime domain record: `domain/token-usage-run-record.ts`
  - analytics domain/result contracts: `domain/token-usage-analytics.ts`
  - deterministic lifetime fold: `projections/token-usage-run-fold.ts`
  - selected Claude SDK cumulative-model reconciliation:
    `projections/claude-sdk-model-usage-reconciler.ts`
  - admitted-contribution projection: `projections/token-usage-analytics-contribution.ts`
  - accumulator and atomic write coordinator: `services/token-usage-run-accumulator.ts`
  - analytics projection writer: `services/token-usage-analytics-projection-writer.ts`
  - analytics range/aggregation policy: `services/token-usage-analytics-range-policy.ts`
    and `services/token-usage-analytics-aggregation-policy.ts`
  - use-case facade/readiness: `providers/token-usage-run-store.ts` and
    `providers/token-usage-migration-readiness.ts`
  - analytics read governor: `providers/token-usage-analytics-provider.ts`
  - SQL repositories: `repositories/sql/token-usage-run-repository.ts` and
    `repositories/sql/token-usage-analytics-repository.ts`
- GraphQL: `src/api/graphql/types/token-usage-stats.ts` and
  `src/api/graphql/types/token-usage-analytics.ts`
- Current Prisma owner:
  - `prisma/schema.prisma` models `TokenUsageRunRecord`,
    `TokenUsageAnalyticsCoverage`, and `TokenUsageAnalyticsDailyFacet`
  - `prisma/migrations/20260819090000_add_token_usage_run_records/`
  - `prisma/migrations/20260822090000_add_token_usage_analytics/`
  - `prisma/migrations/20260923130000_add_claude_sdk_usage_state/`
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
   work by `run_id`, resolves the pricing policy, and folds inside a real SQLite
   transaction.
7. Only a `CHANGED` fold saves the lifetime run row and increments the matching
   UTC daily analytical facet in that same transaction. Duplicate, regressed,
   no-advance, or zeroed contributions advance neither store. Any facet-write
   failure rolls back the run save; different runs may contend on a shared facet
   through the atomic SQL upsert without allowing committed run/facet drift.
8. After commit, the accumulator returns the authoritative per-event contribution
   plus `run_summary_after_event`.

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

## Observation-Time Analytics Projection

The analytical projection starts empty when the additive schema is installed.
Startup verifies both analytics tables and indexes, then idempotently initializes
the singleton coverage instant before requests are served. Existing lifetime run
records are directly usable by Run details but are never distributed across past
days or backfilled into analytics.

Each daily facet preserves the exact captured UTC observation day, runtime kind,
provider/model identity snapshots, normalized token components, usage report
count, captured estimated-cost components, currency, pricing status, missing
price dimensions, and latest observation time. Identity keys are opaque stable
digests; consumers filter with keys returned by the API rather than reconstructing
or parsing them. The compact shape is bounded by day plus analytical/accounting
facet, not by provider notification count.

The analytics provider owns the complete read policy:

- validates explicit half-open UTC ranges and `This month`, `Last month`,
  `Last 3 months`, `Last 12 months`, and `Custom` presets;
- computes the prior comparable range and day/week/month display granularity;
- reads coverage plus selected/comparison facets in one coherent transaction;
- applies runtime/provider/model filters consistently to cards, buckets,
  breakdowns, and filter options;
- returns contiguous trend buckets, elapsed cumulative comparison series, exact
  breakdown rows, active-day count, and coverage/cost-quality metadata; and
- throws on unsafe primary token totals instead of rounding beyond JavaScript
  `SafeInt`.

Coverage is `FULL`, `PARTIAL`, or `UNAVAILABLE` relative to the immutable
tracking start. A covered interval with no admitted usage is distinct from an
interval before tracking. Cost quality is `NO_USAGE`, `COMPLETE`, `PARTIAL`,
`MISSING`, `LOCAL`, or `MIXED_CURRENCY`; unpriced or mixed-currency facts may
contribute to token analytics but are never silently converted to zero or summed
into an unsafe monetary total. Captured estimates are not repriced later.

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

Claude SDK accounting starts at terminal `result` events; thinking/text stream
chunks are content, not token contributions. The selected SDK model value is
resolved against the active query's `supportedModels()` metadata to one raw
model id. The result sanitizer retains safe per-model counters privately for
the fold. A missing or ambiguous selected-model match must not substitute
main-loop totals or another model (for example, auxiliary Haiku) in the public
meter. The public summary keeps the selected canonical and raw identities.

`claude-sdk-model-usage-reconciler.ts` differences cumulative `modelUsage`
counters against bounded, session-and-raw-model checkpoints. Duplicate or
regressed observations do not double-count; a regression becomes a new
baseline before later growth. Legacy/unknown resume history is baselined rather
than guessed. In streaming input mode one Claude process serves many turns and
`modelUsage` is cumulative across them; each result's delta is admitted per
turn. A resumed process continues from the totals its transcript saved. A
non-success result whose `modelUsage` rows are all zero (a crash or startup
failure) is not forwarded as usage, so it cannot reset the baseline and make
the next result count the whole session again. Only the selected model's admitted delta reaches the lifetime
run, daily analytics, GraphQL, and live `run_summary_after_event` projections;
all-source checkpoints remain private in the nullable
`claude_sdk_usage_state_json` run-record column. The 2026-09-23 Prisma migration
adds this column without backfilling or repricing older records. Apply the
normal production migration/startup-readiness flow before running this server.

For the latest Claude SDK prompt context, the terminal result's selected raw
model row supplies the capacity. Only a positive safe-integer `contextWindow`
and a safe full prompt sum (base input plus cache read plus cache creation)
produce `context_window_usage_percent = 100 × prompt / capacity`. A missing,
zero, or unsafe capacity leaves the percentage unavailable; the model name is
not a fallback capacity. For an older run row with valid latest prompt and
capacity but null percentage, the run-summary read projection derives the
percentage from that same latest row without mutating SQL or repricing. A
previously stored finite percentage and non-Claude runtime behavior remain
unchanged.

Claude/Anthropic input uses `base_excludes_cache`: gross input is base input
plus cache-read and cache-creation buckets. A cache-write 5-minute/1-hour split
is exact only when the terminal main-loop usage fully reconciles with the
selected-model delta in every token dimension. Otherwise cache writes use the
configured 1-hour rate as a visibly flagged approximation. Cost is an
AutoByteus-configured Standard API-equivalent estimate, not the SDK's reported
dollars or a subscription charge. Missing trusted prices remain missing rather
than zero. Numeric thinking details map to `reasoning_output_tokens`; absent
numeric detail remains null even when thinking content exists.

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

### Exact current-model Standard pricing

The built-in catalog resolves only exact provider/model identities. Future
`OPENAI` + `gpt-6-astra` observations use Standard USD-per-million rates of
`10` input, `1` cache read, `12.5` cache write, and `50` output through
272,000 accounting input tokens. Above 272,000, the full request uses `20`,
`2`, `25`, and `75` respectively. The exact model metadata records a 1,050,000
context and 128,000 maximum output, sourced and verified 2026-09-22 from the
[GPT-6 Astra model page](https://developers.openai.com/api/docs/models/gpt-6-astra).

Future `ANTHROPIC` + `claude-fable-5-1` observations use Standard rates of
`10` input, `50` output, `0.25` cache read, `12.5` 5-minute cache write, and
`20` 1-hour cache write. The exact model metadata records a 1,000,000
context/input and 128,000 maximum output, sourced and verified 2026-09-22 from
the [Fable 5.1 overview](https://platform.claude.com/docs/en/models/fable-5-1/overview);
pricing is effective 2026-09-01. Existing `claude-fable-5` pricing is unchanged.

Future exact `OPENAI` + `gpt-6-sol` and `gpt-6-luna` observations use the
existing full-request tier boundary at 272,000 accounting input tokens. Rates
below are USD per million tokens; cache write is the general OpenAI cache-write
dimension, not an Anthropic TTL bucket.

| Exact model | Tier | Input | Output | Cache read | Cache write |
| --- | --- | ---: | ---: | ---: | ---: |
| `gpt-6-sol` | at or below 272k | 2 | 10 | 0.20 | 2.50 |
| `gpt-6-sol` | above 272k, entire request | 4 | 15 | 0.40 | 5 |
| `gpt-6-luna` | at or below 272k | 0.10 | 0.50 | 0.01 | 0.125 |
| `gpt-6-luna` | above 272k, entire request | 0.20 | 0.75 | 0.02 | 0.25 |

Future exact `ANTHROPIC` + `claude-opus-5-5` observations use Standard rates
of `4` input, `20` output, `0.20` cache read, `5` five-minute cache write,
and `8` one-hour cache write per million tokens. It has no inferred Fast,
Batch, regional, or subscription tariff. The added exact-policy server tests
exercise all three model identities and the OpenAI long-context/cache tiers.

These are Standard estimates only. Fast, Batch, Flex, regional/data-residency,
partner, subscription/credit, private, and negotiated variants are not inferred
from an identity that does not record billing mode. No aliases or family-price
inheritance are used, so unsupported identifiers continue to produce
`price_missing`. Pricing is captured at observation time: existing run records,
analytical facets, policy keys, and historical missing states are never
recalculated by a catalog update. Deterministic catalog, synthetic policy/tier,
and mocked request tests cover these entries. The new-model validation also
completed three real Codex Astra/Sol/Luna turns and a bounded real Anthropic
signed active tool-turn replay, but those are separate runtime evidence, not a
provider invoice or live proof of every pricing dimension. Direct OpenAI live
API and independent-turn signed reset or compaction were not exercised.

### Latest pricing schedule selection

The pricing resolver always uses the latest catalog configuration. For DeepSeek
V4 Flash and Pro, the latest schedule is effective from
`2026-08-16T16:00:00Z` and uses UTC half-open peak windows `[01:00,04:00)` and
`[06:00,10:00)`; all other times use the latest off-peak period. Input,
cache-read, and output rates are selected from that schedule, while unsupported
cache-write dimensions remain explicitly untrusted. The usage event timestamp
selects only the latest schedule period; it never selects a retired price table
based on the event's calendar date.

The applied schedule ID, period ID, effective timestamp, and timezone are
retained in the pricing snapshot and policy key for auditability. Existing token
dimensions and input-size tier selection remain authoritative, and missing or
unverified prices continue to produce an explicit non-estimated status rather
than a fabricated zero-cost result.

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

### Org Family Ownership

The existing unreleased `20260901_agent_org_flat_team_families_v1` runs after
token source shaping and one-row consolidation. Its migration-only repository
selects claimed roots with 250-root keyset pages and proves exact Agent membership
from selected or exact current Org execution trees. Native flat-Team and
standalone ownership outside that cohort is unchanged.

For each selected Org, one SQL transaction validates claimant membership and
member records, then changes only:

- `root_team_run_id`: the exact old root ID to `NULL`;
- `root_attribution_status`: `single` to `unknown`; and
- `identity_summary_json.rootTeamRunIds`: the exact single old root to
  `{ "status": "unknown" }`.

This is the native Org representation, not a new Org statistics schema. The
remaining identity-summary dimensions are preserved. Already-correct rows are
zero-write; absent rows stay absent; contradictory ownership fails rather than
being guessed. A full-row allowed-difference reread protects exact stored numbers,
costs, timestamps, revisions, cumulative-series checkpoints and deduplication
state. No domain upsert, usage refold, repricing or analytics-facet rebuild performs
this correction. Historical display names remain descriptive, not ownership
routing authorities; existing statistics readers naturally stop grouping these
Agent records under the retired Team root.

History and token source discovery are independent. An ordinary retry/invocation
can have no history candidates but remaining stale token rows. It reads exact
ownership metadata rather than traversing completed histories. Successful ledger
entries still skip normally; there is no automatic success replay or reset.

Org restore checks existing current records for the exact execution-tree Agent
IDs through `TokenUsageRunStore.assertAgentOrgRecordsReady`, in batches of 250,
before runtime materialization. Invalid Team attribution or unavailable token
readiness yields `AGENT_ORG_TOKEN_OWNERSHIP_NOT_READY`, not a runtime repair or a
weakened event validator. See [AgentOrg migration](agent_orgs.md#migration-and-external-publication)
for staged filesystem recovery and the separate attachment-readiness boundary.

### Additive Analytics Schema

Migration `20260822090000_add_token_usage_analytics` adds the empty daily-facet
and singleton-coverage tables plus their indexes. It performs no application-data
migration, bulk rewrite, or legacy/lifetime backfill. The existing run-record
meaning remains unchanged, and there is no version branch, dual reader/writer,
or request-time fallback from analytics to lifetime totals. If the current
analytics schema is unavailable, startup fails rather than serving writes that
could make the two projections diverge.

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

The GraphQL boundary exposes sibling lifetime and observation-time contracts.

`TokenUsageRunStore` and `TokenUsageStatisticsProvider` preserve current run
records:

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

Those Run details queries select runs whose `run_created_at` is in range,
falling back to `first_observed_at` only when creation time is unavailable. Every
selected row shows its lifetime cumulative totals. Task statistics group Team
rows by exact root TeamRun ID and backend-provided concrete member children;
token code never reconstructs topology from paths, names, or migration-only
columns.

`tokenUsageAnalytics(input)` is a separate observation-time query. Its input
contains one approved UTC preset/range plus optional opaque runtime, provider,
and model filter keys. Its one result supplies the applied selected/comparison
ranges, granularity, coverage, filter options, selected/comparison aggregates,
active-day count, trend buckets, and exact breakdown rows. Resolver mapping is
thin; comparison, coverage, accounting reconciliation, and cost-quality truth
remain server-owned.

When history readiness is degraded, lifetime GraphQL returns
`TOKEN_USAGE_HISTORY_MIGRATION_REQUIRED`. Invalid or missing current analytics
schema blocks startup instead of silently falling back to lifetime rows. Public
primary token totals continue to use `SafeInt` and fail explicitly when they
cannot be represented exactly.

## Frontend Contract

The frontend treats all token usage as display-only state and never recomputes
accounting, pricing, coverage, comparison, or provider quota facts.

The live Token Meter remains record-backed: standalone and Team-member caches
accept complete current-record GraphQL summaries or strict post-persist
`run_summary_after_event` snapshots, while Team aggregation retains its existing
single-flight refresh and exact identity rules.

Settings > Token Statistics has two sibling views:

- **Analytics** is the default. `tokenUsageAnalytics` owns one coherent selection
  and latest-response state for UTC presets/custom dates and optional opaque
  runtime/provider/model filters. Filter drafts apply atomically; Tokens/Cost
  and Detailed-usage grouping are presentation-only and do not refetch.
- Six equal summary peers expose Total tokens, Uncached input
  (`standardInputTokens`), Cached input, Output, Estimated API cost, and Cache hit
  rate. The current presentation intentionally omits prior-period comparison,
  Input/Output ratio, cumulative pace, and ranked contributor/driver content even
  though comparison fields remain in the unchanged server result.
- One chronological open-top daily line renders the selected Tokens or Cost
  metric with point markers, explicit axes/guides, and an exact on-page daily
  bucket disclosure. Null/unpriced monetary buckets split the line instead of
  becoming zero; a partial known estimate remains numeric and retains exact
  `MISSING`/missing-price evidence for omitted buckets.
- **Detailed usage** stays visibly present and groups the same server breakdown
  rows by Runtime + model, Runtime, Provider, or Model. It preserves exact token,
  share, cost-quality/currency, missing-dimension, and expandable component
  evidence with table-local horizontal scrolling.
- Coverage copy distinguishes full/partial/unavailable tracking and covered empty
  periods. Cache and cost surfaces preserve reported-zero, not-reported,
  unsupported/local, unknown, complete, partial, missing, and mixed-currency
  states without inventing percentages or monetary values. Formatting follows
  the active locale while exact accounting stays on page.
- CSV export and its helper/Blob/object-URL/download path were removed without a
  replacement export, report, or share workflow. The removed pace chart and
  separate exact-breakdown component are likewise obsolete; exact evidence now
  lives in the daily disclosure and Detailed usage.
- **Run details** preserves the creation-time-selected/lifetime-total task/team/
  run tables, Model diagnostic grouping, sorting, expansion, cost disclosure,
  first-observed fallback, retained loading/error/empty states, and
  history-migration guidance under `tokenUsageRunStatistics`.

Task rows continue to render backend-provided `children`, `rootTeamRunId`,
`runId`, display fields, models, totals, and cost statuses. The frontend must not
infer provider identity from labels, reconstruct execution topology, allocate
lifetime totals into analytics, or round primary SafeInt token totals. `Unpriced`
is not `$0`; local/no-bill and mixed-currency states remain explicit.

## Coverage And Operational Notes

- Deterministic unit/integration/E2E coverage owns contribution admission,
  UTC range policy, aggregation/cost reconciliation, real-SQLite rollback and
  shared-facet contention, coverage/no-backfill, GraphQL, preserved Run details,
  frontend stores/states/line-and-table accessibility, localization, and the
  strict absence of any export/file-generation path.
- Built-process restart coverage proves that existing current rows remain
  directly usable through run, Team, and member GraphQL reads without a data
  migration, rewritten row identity, or duplicate fold.
- Built-server coverage exercises released-row upgrade/relaunch, degraded new
  work, retry, overlap rejection, rollback, empty-source relaunch, and critical
  current-schema failure.
- Released-scale evidence covers approximately 154,000 legacy rows, 1,269 runs,
  bounded source shaping, single-transaction consolidation, reusable SQLite
  pages, and absence of startup `VACUUM`.
- Live Chromium coverage checks default/custom UTC analytics, atomic filters,
  tracking/empty distinctions, partial-pricing line gaps and exact disclosures,
  Detailed usage, retry, Run-details navigation, semantic tab selection/focus,
  English/Simplified Chinese desktop and 390px layout, and the negative
  Blob/object-URL/download boundary. Browser proof covers the web-equivalent
  renderer and does not imply Electron-shell execution.
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
