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
- SQL repository: `src/token-usage/repositories/sql/token-usage-ledger-repository.ts`
- GraphQL API: `src/api/graphql/types/token-usage-stats.ts`
- Prisma model/migration:
  - `prisma/schema.prisma` model `TokenUsageLedgerEvent`
  - `prisma/migrations/20260624090000_add_token_usage_ledger_events/`
  - `prisma/migrations/20260625193000_token_usage_component_pricing_explainability/`

## Event Pipeline

`TOKEN_USAGE_UPDATED` is a normalized `AgentRunEvent`. Before downstream
processors run, `TokenUsageEventEnrichmentTransformer` converts raw runtime
payloads into the ledger/event contract:

1. `createTokenUsageUpdatedPayload(...)` normalizes reported usage, model
   identity, input-token semantic, cache state, latest prompt/context-window
   fields, scope, raw JSON, quality flags, and idempotency fields.
2. `TokenUsageContextEnricher` adds canonical run/team/member/task/workspace
   identity from `AgentRunContext` / `AgentRunConfig` / `MemberTeamContext`.
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
6. `TokenUsageEventPersistenceProcessor` schedules an async append through
   `TokenUsageLedgerStore`. Persistence failures are logged and must not block
   runtime streaming/event dispatch.

## Runtime-Native Token Event Ingestion

Runtime token events use the same canonical ledger contract as native
`autobyteus-ts` provider observations. Runtime adapters must map first-class
usage fields before the event reaches the enrichment/pricing/persistence spine;
future callers should not depend on raw JSON for supported fields.

### Codex App Server

Codex App Server emits raw `thread/tokenUsage/updated` notifications with
`tokenUsage.last`, `tokenUsage.total`, and `tokenUsage.modelContextWindow`.
`resolveCodexThreadTokenUsage(...)` owns this mapping:

- prefer `last` as a `per_turn` delta when present;
- fall back to `total` as a `cumulative_snapshot` with a stable
  `snapshot_series_key` when `last` is absent;
- mark Codex input semantics as `gross_includes_cache`;
- map `inputTokens`, `outputTokens`, and `totalTokens` to reported token fields,
  with the per-call gross input also becoming `latest_prompt_tokens`;
- map `cachedInputTokens` to first-class `cache_read_input_tokens`;
- map `reasoningOutputTokens` to first-class `reasoning_output_tokens`; and
- map `modelContextWindow` to `effective_context_window_tokens`.

The raw Codex payload is still preserved for audit/debugging, but cache,
reasoning, and context fields must not be raw-only. Durable DS-007 coverage
asserts these fields persist in `token_usage_ledger_events`, surface through
GraphQL summaries where exposed, and update the live token meter store state.

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
- Component, cache, reasoning, billable-output, and current-prompt fields are
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

The old `token_usage_records` table was a lossy role-split storage shape and is
not used as the current accounting source. `TokenUsageStore`,
`SqlTokenUsageRecordRepository`, and `TokenUsagePersistenceProcessor` should not
be reintroduced as compatibility writers.

## GraphQL / Statistics

`TokenUsageStatisticsResolver` exposes ledger-backed reads:

- `totalCostInPeriod(startTime, endTime)` returns nullable estimated total cost.
- `usageStatisticsInPeriod(startTime, endTime)` groups accounting tokens and
  nullable costs by model. This settings/statistics surface keeps the historical
  `promptTokens` / `assistantTokens` names; do not confuse those chart field
  names with the Token Meter's `grossInputTokens`, `latestPromptTokens`, and
  component fields.
- `getAgentRunTokenUsageSummary(runId)` returns a run summary.
- `getTeamRunTokenUsageSummary(teamRunId)` returns a team aggregate.
- `getTeamMemberTokenUsageSummary(teamRunId, memberAgentRunId?, memberRouteKey?)`
  returns focused member usage.

All summary token totals are computed from accounting deltas, not reported
cumulative snapshots. Run, team, member, and statistics GraphQL shapes include
the cache-aware/component summary contract: gross input, standard input, cache
read/write tokens, cache rates, output/reasoning/billable output, nullable
component costs, `apiCostStatus`, missing price dimensions, policy/tier
metadata, latest prompt/context-window fields, model/runtime identity, and
`usageReportCount`. Clients must treat those fields as server-owned summary
data, not as a prompt to recalculate prices locally.

## Frontend Contract

The frontend treats token usage as display-only state:

- live `TOKEN_USAGE_UPDATED` WebSocket events update `tokenUsageMeterStore`;
- reopening/focusing runs hydrates from the GraphQL summary queries;
- `TokenUsageHeaderChip` and the right-side `Token` tab render tokens, nullable
  estimated API costs, price status, model/runtime metadata, current prompt
  context pressure, and focused-member totals;
- `TokenUsageMeterPanel` presents the approved Token Meter hierarchy:
  `Current prompt`, `Gross input`, `Output`, `Total estimate`,
  `Input breakdown`, and `Pricing details`.
- `Gross input` is cumulative input sent to providers. It may include discounted
  cache-hit tokens and must not be labeled as full-price input or as the current
  active context size.
- `Input breakdown` renders server-owned `standardInputTokens`,
  `cacheReadInputTokens`, cache-write tokens, cache hit rate, and component input
  costs when meaningful. The frontend hides zero/unknown component rows rather
  than fabricating values.
- `Pricing details` renders model/runtime, `apiCostStatus`, missing dimensions,
  and `usageReportCount` as `Usage reports` / model calls. Raw `events` is not a
  primary Token Meter label.
- The Output card shows reasoning/thinking tokens only when the server summary
  reports positive `reasoningOutputTokens`; those tokens are already included in
  output tokens and estimated output cost.
- Unknown current-prompt/context-window pressure is hidden rather than rendered
  as a noisy empty card. Context pressure appears only when a numeric percentage
  and effective context window are present;
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
`usageReportCount=1`; the captured UI showed `Current prompt`, `Gross input`,
`Output`, `Total estimate`, `Input breakdown`, `Pricing details`, and `Usage
reports` rather than ambiguous primary `Input` / raw `events` labels.

These browser proofs are one-off delivery evidence rather than a committed
browser or screenshot automation harness. Current durable regression coverage
for the token-usage contract comes from GraphQL E2E coverage for cached gross
input, provider-specific component semantics, local/no-bill, custom missing
price, mixed-currency aggregate behavior, model-list regressions, and the
runtime-native Codex/Claude field baseline. Frontend store/component tests cover
live update aggregation, GraphQL hydration replacement, Token Meter hierarchy,
cache-aware input rows, price-status labels, reasoning-output display, current
prompt fields, and the right-side tab label.

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
`usageReportCount`.

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
- Deterministic unit/integration/E2E coverage validates the ledger, cost,
  GraphQL, and frontend meter contracts; the environment-gated runtime E2E above
  provides live-runtime confirmation when configured runtimes are available.
