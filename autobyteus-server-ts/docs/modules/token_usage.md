# Token Usage

## Scope

Token usage is the server-owned accounting spine for model/runtime usage. The
current source of truth is the append-only `token_usage_ledger_events` table,
not frontend state, message rendering metadata, runtime memory, or the historical
role-split `token_usage_records` table.

The ledger answers, per usage observation:

- which agent run and turn consumed the tokens;
- which team/member/task context owned the usage when the run is inside a team;
- which runtime, model provider, and model identifier produced the usage;
- for AutoByteus rows, which provider display name was snapshotted at ingestion
  for historical statistics labels (direct Codex/Claude paths may leave this
  nullable);
- which token counts were reported by the provider/runtime and which accounting
  delta is safe to aggregate;
- whether estimated API price could be calculated from trusted catalog pricing;
- which raw provider/runtime usage payload was observed for audit/debugging.

## TS Source

- Domain/event payloads: `src/agent-execution/domain/agent-run-token-usage.ts`
- Event enrichment/persistence pipeline:
  - `src/agent-execution/events/default-agent-run-event-pipeline.ts`
  - `src/agent-execution/events/processors/token-usage/`
- Runtime ingestion:
  - Native AutoByteus: `autobyteus-ts` emits `TOKEN_USAGE_UPDATED` from
    `LlmPhase` using `LlmTokenUsageObservation` provider normalizers.
  - Codex App Server: `src/agent-execution/backends/codex/thread/` parses
    `thread/tokenUsage/updated`; `codex-agent-run-backend.ts` emits ready
    `TOKEN_USAGE_UPDATED` events.
  - Claude Agent SDK: `src/agent-execution/backends/claude/session/` extracts
    terminal result/model-usage data into `TOKEN_USAGE_UPDATED` events.
- Ledger/pricing/projections: `src/token-usage`
- SQL model repository:
  `src/token-usage/repositories/sql/token-usage-ledger-repository.ts`, which
  extends `repository_prisma` `BaseRepository` for
  `TokenUsageLedgerEvent`.
- TeamRun V1 production-data transition:
  - `src/app-data-migrations/migrations/team-run-execution-tree-v1/token-usage-team-run-v1-row-planner.ts`
  - `src/app-data-migrations/migrations/token-usage-task-team-run-index.ts`
  - `src/token-usage/repositories/sql/token-usage-team-run-v1-migration-repository.ts`
- GraphQL API: `src/api/graphql/types/token-usage-stats.ts`
- Prisma model/migration:
  - `prisma/schema.prisma` model `TokenUsageLedgerEvent`
  - `prisma/migrations/20260624090000_add_token_usage_ledger_events/`
  - `prisma/migrations/20260625193000_token_usage_component_pricing_explainability/`
  - `prisma/migrations/20260730090000_add_token_usage_provider_name/`
  - `prisma/migrations/20260702093000_token_usage_execution_address/`

## Event Pipeline

`TOKEN_USAGE_UPDATED` is a normalized `AgentRunEvent`. Before downstream
processors run, `TokenUsageEventEnrichmentTransformer` converts raw runtime
payloads into the ledger/event contract:

1. `createTokenUsageUpdatedPayload(...)` normalizes reported usage, model
   identity, input-token semantic, cache state, latest prompt/context-window
   fields, scope, raw JSON, quality flags, and idempotency fields.
2. `TokenUsageContextEnricher` adds current run, root-Team, and workspace
   identity from `AgentRunContext` / `AgentRunConfig` / `MemberTeamContext`.
   The concrete `run_id` identifies the Agent execution and
   `root_team_run_id` groups Team-context usage; execution topology remains
   owned by the TeamRun execution tree rather than duplicated in new ledger
   rows.
3. `TokenUsageComponentBasisResolver` converts provider/runtime readings into
   canonical component fields before pricing. It is the only stage that decides
   whether reported input already includes cache tokens (`gross_includes_cache`)
   or is a base/additive count (`base_excludes_cache`, used by Anthropic-style
   usage).
4. `TokenUsageSnapshotDeltaNormalizer` converts provider readings into
   aggregatable accounting deltas. `per_call` and `per_turn` readings are direct
   deltas; `cumulative_snapshot` readings are diffed by snapshot series so a
   Codex cumulative total cannot be summed repeatedly.
5. `TokenPriceConfigProvider` resolves a provider/model/runtime pricing policy
   through the shared `autobyteus-ts` model catalog, then `TokenCostCalculator`
   applies only trusted price dimensions to the component basis.
6. `TokenUsageEventPersistenceProcessor` schedules a tracked async append
   through `TokenUsageLedgerStore`. Persistence failures are logged and must not
   block runtime streaming/event dispatch. The default pipeline can quiesce and
   drain every accepted scheduled/in-flight append before the shared Prisma
   lifecycle closes. Normal shutdown keeps token enrichment and persistence
   quiescent, so a late active-run event cannot query or create new persistence
   work after the drain; only an explicit lifecycle-owned test reset can create
   a new token pipeline.

The ledger repository acquires no raw or injected Prisma client. Each inherited
model operation resolves the current `repository_prisma` root or
AsyncLocalStorage transaction client at call time. Normal server composition
initializes that root after schema migrations and shuts it down only after the
default token processor has drained.

## Runtime-Native Token Event Ingestion

Runtime token events use the same canonical ledger contract as native
`autobyteus-ts` provider observations. Runtime adapters must map first-class
usage fields before the event reaches the enrichment/pricing/persistence spine;
future callers should not depend on raw JSON for supported fields.

### Codex App Server

Codex App Server emits raw `thread/tokenUsage/updated` notifications with
`tokenUsage.last`, `tokenUsage.total`, and `tokenUsage.modelContextWindow`.
`tokenUsage.total` is treated as the authoritative cumulative thread snapshot
when present, while `tokenUsage.last` is preserved as provider-delta metadata
for the current update. `resolveCodexThreadTokenUsage(...)` owns this mapping:

- prefer `total` as a `cumulative_snapshot` with stable
  `snapshot_series_key=codex_thread:<thread-id>`;
- use `last` as a fallback `per_call` delta only when Codex omits `total`, and
  flag that fallback with `codex_cumulative_total_missing_used_provider_delta`;
- attach `last` token fields to the raw event as reconciliation metadata so the
  first cumulative snapshot can be baselined from the provider delta instead of
  charging historical thread totals, and later total movement can be compared
  against the provider-reported delta;
- mark Codex input semantics as `gross_includes_cache`;
- map `inputTokens`, `outputTokens`, and `totalTokens` to reported token fields,
  with the latest provider-delta gross input becoming `latest_prompt_tokens`;
- map `cachedInputTokens` to first-class `cache_read_input_tokens`;
- map `reasoningOutputTokens` to first-class `reasoning_output_tokens`; and
- map `modelContextWindow` to `effective_context_window_tokens`.

The Codex app-server contract verified on 2026-07-10 exposes no cache-write
quantity in either `total` or `last`. `cachedInputTokens` is cache read only;
`resolveCodexThreadTokenUsage(...)` must keep cache creation unknown/null and
must not infer it from `inputTokens - cachedInputTokens`. A trusted model-policy
write price without a positive source quantity produces no write cost and no
frontend cache-write row.

When auditing protocol support, distinguish upstream source records from
AutoByteus reconciliation metadata. `tokenUsage.total` / `tokenUsage.last` and
the selected `raw_usage_json` are source evidence. Enriched `raw_event_json`
may include AutoByteus-added
`autobyteus_cumulative_snapshot_provider_delta_tokens` with a canonical null
cache-write entry; that key does not mean Codex emitted a write field. Before
supporting a future write count, re-generate the supported Codex bindings and
review the official field's `total`/`last` cumulative semantics rather than
adding aliases or remainder inference.

Codex token-usage updates are dispatched as they arrive, including multiple
updates for one active `turnId`; they must not wait behind a single pending
turn-id map entry that could overwrite an earlier update. The raw Codex payload
is still preserved for audit/debugging, but cache, reasoning, and context fields
must not be raw-only. Durable coverage asserts these fields persist in
`token_usage_ledger_events`, surface through GraphQL summaries where exposed,
and update the live token meter store state.

### Claude Agent SDK

Claude Agent SDK accounting is terminal-result based. Assistant thinking/text
chunks are content stream events, not token-accounting rows, and must not be
summed into usage. `buildClaudeTokenUsageEvent(...)` emits one `per_turn`
`TOKEN_USAGE_UPDATED` event only from terminal `result` payloads with
`result.usage` and/or `modelUsage`.

The mapper preserves input/output/total tokens plus cache-read/cache-creation
fields from snake_case or camelCase usage shapes. Claude/Anthropic input uses
`base_excludes_cache`: gross input is the reported `input_tokens` plus cache
read and cache creation buckets, while standard input remains the base input.
If a future SDK result exposes numeric thinking details such as
`output_tokens_details.thinking_tokens` or `thinkingTokens`, that value maps to
`reasoning_output_tokens`. If the SDK emits thinking content but no numeric
thinking-token count, `reasoning_output_tokens` stays null; the UI should show
accurate output totals/cost without a thinking-token subline.
When both `result.usage` and `modelUsage` are present, the mapper preserves the
raw terminal result and flags comparable token divergence with
`claude_usage_model_usage_mismatch`; it does not switch Claude to Codex-style
cumulative accounting.

## Ledger Semantics

The ledger separates **reported** provider/runtime readings from **accounting**
deltas:

- `reported_input_tokens`, `reported_output_tokens`, and `reported_total_tokens`
  preserve what the runtime said.
- `accounting_input_tokens`, `accounting_output_tokens`, and
  `accounting_total_tokens` are gross input/output/total deltas and are the only
  primary fields that summaries/statistics add.
- `input_token_semantic` explains how the reported input count should be read:
  `gross_includes_cache` means provider prompt/input already includes cache-hit
  and cache-write tokens; `base_excludes_cache` means gross input is additive
  (`reported input + cache read + cache creation`); `unknown` means the row is
  unsafe for full component pricing.
- Public summaries expose named component fields instead of forcing readers to
  infer billing meaning from one broad input number:
  - `gross_input_tokens`: cumulative input/prompt tokens sent to model context.
  - `standard_input_tokens`: uncached/base/full-price input tokens.
  - `cache_miss_input_tokens`: explicit provider miss bucket when available.
  - `cache_read_input_tokens`: cache-hit/read tokens.
  - `cache_creation_input_tokens`, `cache_creation_5m_input_tokens`, and
    `cache_creation_1h_input_tokens`: cache write/creation buckets.
  - `output_tokens`, `reasoning_output_tokens`, and `billable_output_tokens`:
    output totals, visible reasoning/thinking sub-breakdown, and provider-billed
    output basis when a provider reports them differently.
- `cache_state` is `positive`, `zero_reported`, `not_reported`,
  `unsupported_or_local`, or `unknown`. Zero cache tokens are different from a
  provider not reporting cache fields.
- `latest_prompt_tokens`, `effective_context_window_tokens`, and
  `context_window_usage_percent` describe the latest model-call prompt/context
  pressure. They are not cumulative usage and must not be compared directly with
  cumulative gross input totals.
- `usage_report_count` counts token-usage/model-call reports emitted by the
  runtime/provider. It is not a user-message count or a chat-row count.
- Cost calculation uses billable token fields when providers expose them. For
  example, Gemini thinking tokens are carried as `reasoning_output_tokens` and
  billable output tokens so output-price estimates include provider-billed
  thinking, while reasoning remains a visible output sub-breakdown instead of
  being double-counted in token totals.
- Component, cache, reasoning, billable-output, and latest-prompt fields are
  delta-normalized for cumulative snapshots just like the primary
  input/output/total fields.
- `usage_scope` is `per_call`, `per_turn`, or `cumulative_snapshot`.
- `raw_usage_json` and `raw_event_json` preserve provider/runtime details such
  as cache and reasoning token fields when available.
- `quality_flags` record missing/partial usage observations without fabricating
  token counts.

Cost is always an **estimated API-price** interpretation over accounting token
deltas. It is separate from token counts and is nullable:

- `api_cost_status = estimated` only when trusted pricing resolves from the
  shared catalog for all dimensions needed by the observed row.
- `price_missing` means tokens were stored but no trusted price was available.
- `partial_price_missing` means only part of the needed price dimensions were
  trusted, such as observed cache-write tokens without a trusted cache-write
  price.
- `local_no_api_bill` means local runtimes such as Ollama/LM Studio have no
  provider API bill in this context. The UI should present that status directly
  instead of rendering a paid-provider `$0 estimate`.
- `mixed` is used by aggregate summaries/statistics when rows have incompatible
  cost statuses, providers, models, or currencies. Mixed aggregates keep token
  totals but return nullable aggregate costs instead of adding unsafe monetary
  values together.

Constructor/default-zero price values are not trusted free prices. Unknown,
placeholder, custom, or unmatched models remain token-only until trusted pricing
is added. Local runtime models must use explicit `local_no_api_bill` status
rather than pretending to be a remote paid provider with zero pricing. The shared
`autobyteus-ts` catalog can express currency, cache read/write prices, cache
write subtype prices, provider pricing source/effective date, and input-size
price tiers; server-side accounting selects the applicable trusted tier before
estimating cost.

## SQL Storage

`token_usage_ledger_events` is append-oriented and idempotent:

- `usage_event_id` is unique.
- `idempotency_key` is unique.
- run/time, team/time, and snapshot-series indexes support summaries and
  cumulative snapshot diffing.
- `run_id` is the concrete AgentRun identity. Team-context usage also stores
  `root_team_run_id`, and the
  `token_usage_ledger_events_root_team_run_id_observed_at_idx` index supports
  root-Team summaries. Current Token Usage storage and APIs do not duplicate
  the TeamRun execution tree or use an execution address as hierarchy
  authority.

The old `token_usage_records` table was a lossy role-split storage shape and is
not used as the current accounting source. `TokenUsageStore`,
`SqlTokenUsageRecordRepository`, and `TokenUsagePersistenceProcessor` should not
be reintroduced as compatibility writers. Released SQLite files may still
contain predecessor-only execution-address, path, member, or task columns.
Those columns are inert migration evidence: they are absent from the current
Prisma model and are not selected by normal ingestion, summary, GraphQL, or
frontend paths.

## TeamRun V1 Root-Attribution Transition

Required startup app-data migration `20260814_team_run_execution_tree_v1` is the
single final production transition for released Team metadata, task records,
communication messages, token root attribution, and Team history. The
unpublished `20260801_team_canonical_identity` definition is not registered and
its old ledger row, if present, remains inert.

For Token Usage the final migration:

1. Inspects the current runtime columns and all available predecessor evidence,
   then gives every row one explicit disposition: standalone, already current,
   resolved, or preserved-with-warning. It validates task-Team ancestry against
   retained predecessor or current V1 topology when available. Self-contained
   retired-row evidence is accepted only within the bounded migration planner;
   ambiguous, conflicting, or incomplete identity is never guessed.
2. Treats predecessor execution-address/path/member/task columns as read-only
   evidence. A resolved row is eligible for a root correction only when the
   destination root has an independently admitted current V1 package. An
   unresolved or unsupported row and all of its accounting facts remain
   unchanged with a truthful warning.
3. Applies only required `root_team_run_id` corrections in one SQLite
   transaction. The transaction verifies every updated root, all non-root
   accounting facts, total row count, retention of every predecessor evidence
   column that existed at inspection time, and the current
   `(root_team_run_id, observed_at)` index. A transaction problem is reported as
   a warning, with native rollback checked against the pre-transaction
   snapshot; the migration does not contract the table or delete evidence.

Standalone rows keep `root_team_run_id = null`. Current Team rows use the root
TeamRun ID plus their concrete `run_id`; task identity may remain descriptive
ledger metadata but is not runtime topology authority. Normal reads never
repair identity from predecessor columns. Token planning or apply problems
produce `SUCCEEDED_WITH_WARNINGS` and do not block server health or unrelated
TeamRun migration work.

## Custom-Provider Model Metadata Migrations

The Prisma migration
`20260730090000_add_token_usage_provider_name` adds nullable
`token_usage_ledger_events.provider_name`. New AutoByteus observations persist
the configured custom-provider name or canonical built-in provider display name
at ingestion time. Direct Codex and Claude paths keep `provider_name = null` and
retain their existing non-AutoByteus display behavior. New-event persistence
does not perform a statistics-time provider-registry lookup.

Two required app-data migrations separately repair historical provider/model
display fields after Prisma schema deployment. They do not contract Team
identity columns and do not own the TeamRun V1 root-attribution transition:

1. `20260730_token_usage_custom_provider_model_value_backfill` repairs a
   validated legacy composite `model_value` by keeping the complete
   `<modelName>` suffix, including additional `:` characters. It never changes
   `model_identifier`, row counts, attribution, or accounting.
2. `20260730_token_usage_provider_name_snapshot_backfill` fills only null/empty
   AutoByteus `provider_name` values from built-in mappings or the current
   custom-provider registry. It skips direct non-AutoByteus rows and warns
   rather than guessing for missing/deleted/invalid providers. Rows that
   already contain a snapshot are unchanged.

Both migrations use independently durable compare-and-set updates, preserve
row count and all non-target ledger fields, and are idempotent. Startup
continues after row or migration failures; `FAILED` rows retry through
`runPending()`, while warning-completed rows remain terminal for `runPending()`
and retry only through explicit `runMigration(id)`. Each migration records
`SUCCEEDED`, `SUCCEEDED_WITH_WARNINGS`, or `FAILED` with scan/update/skip/failure
details. Snapshot-first display preserves historical provider names after a
rename or deletion; legacy rows without a recoverable snapshot retain the
current lookup/deterministic fallback policy.

## GraphQL / Statistics

`TokenUsageStatisticsResolver` exposes ledger-backed reads:

- `totalCostInPeriod(startTime, endTime)` returns nullable estimated total cost.
- `tokenUsageTaskStatisticsInPeriod(startTime, endTime)` is the primary
  Settings > Token Statistics projection. It returns one top-level row for each
  standalone agent run or root team run that has ledger usage observed during
  the selected period, with descendant usage nested through recursive
  `children` rows instead of repeated as standalone rows.
- The current projection emits `TEAM_RUN`, `AGENT_RUN`, and `MEMBER_RUN` rows.
  A Team row groups by `root_team_run_id`; its children group by exact
  `run_id`. A task Agent or task-Team Agent therefore appears as the concrete
  member run that produced the usage rather than causing Token Usage to rebuild
  the execution topology. `taskId` remains descriptive row metadata when it was
  captured.
- Active Token Usage Task statistics does not expose or consume
  `executionAddress`, `memberPath`, `teamRunPath`, `member_path`, or
  `team_run_path` as hierarchy surfaces. The TeamRun execution-tree package is
  the topology authority; Token Usage owns only its root/run grouping and
  display fields.
- Task-statistics row labels come from token-usage-owned display fields
  captured or backfilled at the ledger boundary: `teamName`, `agentName`,
  `runSummary`, `runCreatedAt`, and `memberName`. Runtime/model/scalar member
  facts continue to use ledger fields for display/filter metadata, and Settings
  statistics does not add workspace or inactive roster metadata. If
  `runCreatedAt` is unavailable, the row falls back to the first observed ledger
  timestamp and marks `createdTimeSource` so the frontend can label it as first
  usage observed rather than true task creation.
- `usageStatisticsInPeriod(startTime, endTime)` remains the secondary
  diagnostics projection for the Settings > Token Statistics `Model` grouping. It groups
  by runtime/model pair so the same model used through different runtimes is not
  collapsed into one ambiguous row. Legacy display aliases such as `inputTokens`
  / `outputTokens` are backed by the same cache-aware aggregate contract; do not
  confuse them with the Token Meter's `latestPromptTokens`.
- The Model projection exposes `llmModel` as the unchanged raw identity and
  `modelDisplayName` as a server-owned display label. The Task projection
  exposes `models` and a positional `modelDisplayNames` array from one ordered
  raw/display sequence; the arrays always have equal length, including
  recursive and empty rows. AutoByteus custom-provider labels prefer the
  ingestion-time `provider_name` snapshot and fall back to the current saved
  provider name only for legacy rows without a snapshot; built-in providers use
  the canonical provider display name plus model. Non-AutoByteus labels retain
  their existing behavior. The frontend must not parse raw provider identities
  or use display labels for grouping/accounting.
- `getAgentRunTokenUsageSummary(runId)` returns a run summary.
- `getTeamRunTokenUsageSummary(teamRunId)` returns a team aggregate.
- `getTeamMemberTokenUsageSummary(teamRunId, agentRunId)` returns rows whose
  exact `root_team_run_id` and `run_id` match those two arguments.

The period filter is based on ledger `observed_at` / usage observation time.
The MVP has no `rangeMode` argument and does not implement a "tasks created in
period" mode. Future created-time filtering must be added explicitly rather than
repurposing the current observed-usage period semantics.

All summary token totals are computed from accounting deltas, not reported
cumulative snapshots. Run, team, member, and statistics GraphQL shapes include
the cache-aware/component summary contract: gross input, standard input, cache
read/write tokens, cache rates, output/reasoning/billable output, nullable
component costs, `apiCostStatus`, missing price dimensions, policy/tier
metadata, component `unitPrices`, latest prompt/context-window fields,
model/runtime identity, and `usageReportCount`. Clients must treat those fields
as server-owned summary data, not as a prompt to recalculate prices locally.

Token-valued outputs in this GraphQL family use the `SafeInt` scalar rather
than the built-in signed 32-bit `Int`. The supported transport and client
contract remains an exact JavaScript `number` through
`Number.MAX_SAFE_INTEGER`; values beyond that boundary require a separately
designed cross-client contract and must not be rounded, capped, string-coerced,
or dropped. Non-token counters such as `usageReportCount` remain GraphQL `Int`.
The web code generator must explicitly map `SafeInt` input and output to
TypeScript `number`, because remote schema introspection does not carry the
scalar package's code-generation metadata.

`unitPrices` is the display-safe explanation of the unit-price basis used by
the summary. It reports a `{ status, pricePerMillion }` summary for standard
input, cache-read input, cache-write input, cache-write 5m/1h subtype buckets,
output, and reasoning output. A `single` status means one trusted unit price can
explain the positive tokens in that component; `mixed` means the aggregate spans
different component-relevant prices, providers, models, currencies, or local
and paid rows; `missing` / `partial_missing` means trusted pricing was absent
for all or some relevant rows; `not_applicable` means the component has no
positive tokens; and `local_no_api_bill` means no provider API unit price
applies. Zero-token rows do not make a unit price look mixed. Reasoning output
uses the output unit price when the pricing owner exposes reasoning/thinking as
an output sub-breakdown, and it remains included in output cost rather than
being added as a separate total.

## Frontend Contract

The frontend treats token usage as display-only state:

- live `TOKEN_USAGE_UPDATED` WebSocket events update `tokenUsageMeterStore`;
- reopening/focusing runs hydrates from the GraphQL summary queries;
- `TokenUsageHeaderChip` and the right-side `Token` tab render tokens, nullable
  estimated API costs, price status, model/runtime metadata, latest prompt
  context pressure, and focused-member totals;
- Settings > Token Statistics uses `tokenUsageStatisticsStore` and the
  historical statistics queries. The selected Settings sidebar item remains the
  page identity, while the main content starts with one compact filter/control
  card ordered as grouping select (`Task` / `Model`), date range, and
  `Fetch Statistics`. It defaults to the `Task` grouping for task/team cost
  understanding and keeps `Model` as a runtime/model diagnostics grouping.
  The frontend does not render `Usage during period`, `Select Date Range:`,
  `Group by:`, or a separate `By Task` / `By Model` tab row.
- Settings Model rows render the server-owned `modelDisplayName` while
  retaining the raw `llmModel` for identity and fallback. Task rows render
  `modelDisplayNames` positionally beside the raw `models` array; the frontend
  does not reconstruct provider names from opaque identifiers.
- The Task grouping table shows task/run identity, runtime, model(s), token
  totals, input/output/total cost, recursive team/task/member children, created
  time as the last visible column, and a cost breakdown. It does not render
  standalone `Type` or `Status` columns: row kind stays visible through
  hierarchy/metadata, complete-estimate status is suppressed in main rows, and
  non-complete price status appears through formatted `Total Cost` text plus the
  expanded breakdown. Sortable headers show compact persistent two-triangle
  neutral/active glyphs; `Model(s)`, `Input Cost`, and `Output Cost` remain
  non-sortable, and cost details open through one visible value-plus-solid-
  triangle button in `Total Cost` rather than duplicate hover-only cost-cell
  buttons. The button text is the formatted total cost/status, and its
  localized show/hide label/title repeat that same cost/status for assistive
  technology. Team expansion is usage-derived
  for the selected period: inactive roster members are not emitted, child rows
  remain attached to their parent during sorting, and member/task usage must not
  be double-counted as standalone top-level rows. The frontend consumes
  backend-provided `children`, `rootTeamRunId`, and `runId` values; it must not
  rebuild execution topology from task records, predecessor identity columns,
  memory paths, or display names. The current backend emits one Team-to-member
  child level; the GraphQL `children` shape remains recursive for the table
  contract.
- Primary Task-table `Input` and `Output` cells render full locale-aware
  integer digits so supported safe-integer totals remain exact and inspectable;
  compact formatting is reserved for secondary cache/thinking explanatory
  sublines.
- `TokenUsageMeterPanel` presents the approved Token Meter hierarchy:
  `Latest prompt`, `Gross input`, `Output`, `Total estimate`,
  `Input breakdown`, `Pricing details`, and collapsed `Calculation details`.
- `Gross input` is cumulative input sent to providers. It may include discounted
  cache-hit tokens and must not be labeled as full-price input or as the latest
  active context size.
- `Input breakdown` renders server-owned `standardInputTokens`,
  `cacheReadInputTokens`, cache-write tokens, cache hit rate, and component input
  costs when meaningful. The frontend hides zero/unknown component rows rather
  than fabricating values.
- `Pricing details` renders model/runtime, `apiCostStatus`, missing dimensions,
  and `usageReportCount` as `Usage reports` / model calls. Raw `events` is not a
  primary Token Meter label.
- `Calculation details` renders server-provided component unit prices and the
  explanatory formula `tokens ÷ 1,000,000 × unit price`, with explicit
  `varies by call`, `unpriced`, `partially missing`, and local/no-bill labels
  instead of frontend catalog lookups or fake blended rates.
- The Output card shows reasoning/thinking tokens only when the server summary
  reports positive `reasoningOutputTokens`; those tokens are already included in
  output tokens and estimated output cost. Calculation details labels their unit
  price as the output price / included in output cost so users do not
  double-count thinking.
- The `Latest prompt` block renders whenever latest-prompt tokens are present.
  Known context capacity shows the percentage and progress bar; when capacity
  is unknown, the panel shows the prompt-token count with explicit
  `contextLimitUnavailable` copy and never fabricates a denominator or
  percentage;
- the frontend does not compute authoritative accounting deltas or model prices.

"Unpriced" means token usage exists but trusted API-price metadata was missing;
it must not be displayed as `$0`. Local/no-bill rows should be labeled as local
rather than unpriced. Mixed-currency aggregate costs are displayed as
mixed/unavailable rather than summed under one currency label.

## Browser Frontend Evidence

Delivery evidence has exercised the browser-facing Token Meter against real
local backend/frontend stacks and ledger-backed GraphQL hydration. The current
cache-aware evidence for the approved Token Meter hierarchy is the 2026-06-25
Codex App Server / GPT-5.5 run recorded under
`tickets/token-input-prompt-discrepancy-analysis/implementation-evidence/`.
That run emitted `grossInputTokens=10248`, `standardInputTokens=5256`,
`cacheReadInputTokens=4992`, `cacheState=positive`,
`estimatedApiTotalCost=0.029076 USD`, `latestPromptTokens=10248`,
`effectiveContextWindowTokens=258400`, `contextWindowUsagePercent≈3.97`, and
`usageReportCount=1`; the current UI presents that context-size metric as
`Latest prompt` beside `Gross input`,
`Output`, `Total estimate`, `Input breakdown`, `Pricing details`, and `Usage
reports` rather than ambiguous primary `Input` / raw `events` labels.

These browser proofs are one-off delivery evidence rather than a committed
browser or screenshot automation harness. Current durable regression coverage
for the token-usage contract comes from GraphQL E2E coverage for cached gross
input, provider-specific component semantics, local/no-bill, custom missing
price, mixed-currency aggregate behavior, model-list regressions, unit-price
hydration across run/team/member/statistics summaries, and the runtime-native
Codex/Claude field baseline. Frontend store/component tests cover live update
aggregation, live/hydrated unit-price convergence, GraphQL hydration
replacement, Token Meter hierarchy, calculation details, cache-aware input rows,
price-status labels, reasoning-output display, latest prompt fields, and the
right-side tab label. Settings > Token Statistics also has focused backend
GraphQL E2E coverage plus frontend store/component coverage
for Task default grouping, no `rangeMode`, Team-to-member `children`, exact
root/run grouping, task IDs as metadata, first-usage created-time fallback,
runtime/model grouping, reduced Task columns, compact sort affordances,
value-plus-solid-triangle Total Cost disclosure controls, cost-inclusive
accessible labels, status/cost-breakdown display, and Model runtime diagnostics.

The final TeamRun V1 transition has deterministic planner, real-SQLite
repository, and actual-startup E2E coverage. It verifies retained/current task
topology evidence, supported released row families, resolved root correction,
preserved unsupported rows, accounting-fact and row-count preservation, the
current root/time index, predecessor-column retention, native rollback
observation, warning-ready startup, and relaunch idempotence. Source scans guard
against restoring the removed canonical-identity migration, runtime predecessor
readers, legacy-column contraction, or compatibility writers.

## Runtime E2E Coverage

Real runtime token usage coverage is intentionally environment-gated so default
CI and local developer runs do not require live LM Studio, Codex App Server, or
Claude Agent SDK processes. When those runtimes are configured, run:

```sh
RUN_RUNTIME_TOKEN_USAGE_E2E=1 \
RUNTIME_TOKEN_USAGE_E2E_TIMEOUT_MS=300000 \
LMSTUDIO_MODEL_ID='qwen3.5-27b:lmstudio@127.0.0.1:1234' \
CODEX_E2E_TOOL_MODEL='gpt-5.4-mini' \
CLAUDE_E2E_MODEL='sonnet' \
pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/token-usage-runtime-graphql.e2e.test.ts
```

When enabled, the suite creates a run, opens the agent websocket, sends
`SEND_MESSAGE`, observes `TOKEN_USAGE_UPDATED` with positive token totals and
the expected runtime/ingestion kind, waits for idle, and verifies ledger-backed
GraphQL summary/statistics projections using the current field names:
`grossInputTokens`, component cache fields, `latestPromptTokens`,
`effectiveContextWindowTokens`, `contextWindowUsagePercent`, and
`usageReportCount`. Model identity assertions compare GraphQL summaries and
statistics with the emitted `TOKEN_USAGE_UPDATED.model_identifier`, not a launch
alias that a runtime may resolve to a provider-specific model id.

With `RUN_RUNTIME_TOKEN_USAGE_E2E` unset, the suite remains safely skipped by
design.

## Operational Notes

- No local tokenizer estimate should feed persisted accounting.
- Native provider adapters preserve raw/cache/reasoning usage details in
  `LlmTokenUsageObservation` before the server turns observations into ledger
  events.
- Removed provider models such as MiniMax M2.7 must not remain selectable via
  model-list GraphQL/API compatibility aliases. MiniMax M3 remains the supported
  MiniMax LLM catalog entry.
- When token-usage GraphQL documents or schema types change, refresh the tracked
  frontend generated artifact with `pnpm -C autobyteus-web codegen` against the
  matching backend schema so `autobyteus-web/generated/graphql.ts` does not drift
  from the committed queries.
- Deterministic unit/integration/E2E coverage validates the ledger, cost,
  GraphQL, and frontend meter contracts; the environment-gated runtime E2E above
  provides live-runtime confirmation when configured runtimes are available.
