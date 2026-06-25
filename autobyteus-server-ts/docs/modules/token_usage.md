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

## Event Pipeline

`TOKEN_USAGE_UPDATED` is a normalized `AgentRunEvent`. Before downstream
processors run, `TokenUsageEventEnrichmentTransformer` converts raw runtime
payloads into the ledger/event contract:

1. `createTokenUsageUpdatedPayload(...)` normalizes reported usage, model
   identity, scope, raw JSON, quality flags, and idempotency fields.
2. `TokenUsageContextEnricher` adds canonical run/team/member/task/workspace
   identity from `AgentRunContext` / `AgentRunConfig` / `MemberTeamContext`.
3. `TokenUsageSnapshotDeltaNormalizer` converts provider readings into
   aggregatable accounting deltas. `per_call` and `per_turn` readings are direct
   deltas; `cumulative_snapshot` readings are diffed by snapshot series so a
   Codex cumulative total cannot be summed repeatedly.
4. `TokenCostCalculator` resolves trusted model pricing through the shared
   `autobyteus-ts` model catalog and annotates nullable estimated API cost
   fields plus cost status.
5. `TokenUsageEventPersistenceProcessor` schedules an async append through
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
- map `inputTokens`, `outputTokens`, and `totalTokens` to reported token fields;
- map `cachedInputTokens` to first-class `cache_read_input_tokens`;
- map `reasoningOutputTokens` to first-class `reasoning_output_tokens`; and
- map `modelContextWindow` to `effective_context_budget_tokens`.

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
fields from snake_case or camelCase usage shapes. If a future SDK result exposes
numeric thinking details such as `output_tokens_details.thinking_tokens` or
`thinkingTokens`, that value maps to `reasoning_output_tokens`. If the SDK emits
thinking content but no numeric thinking-token count, `reasoning_output_tokens`
stays null; the UI should show accurate output totals/cost without a
thinking-token subline.

## Ledger Semantics

The ledger separates **reported** provider/runtime readings from **accounting**
deltas:

- `reported_input_tokens`, `reported_output_tokens`, and `reported_total_tokens`
  preserve what the runtime said.
- `accounting_input_tokens`, `accounting_output_tokens`, and
  `accounting_total_tokens` are the only fields that summaries/statistics add.
- Cost calculation uses billable token fields when providers expose them. For
  example, Gemini thinking tokens are carried as `reasoning_output_tokens` and
  billable output tokens so output-price estimates include provider-billed
  thinking, while reasoning remains a visible output sub-breakdown instead of
  being double-counted in token totals.
- Cache and reasoning fields are normalized before persistence:
  `cache_read_input_tokens`, `cache_creation_input_tokens`,
  `reasoning_output_tokens`, `billable_input_tokens`, and
  `billable_output_tokens` are delta-normalized for cumulative snapshots just
  like the primary input/output/total fields.
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
- `mixed` is used by aggregate summaries/statistics when rows have incompatible
  cost statuses or currencies. Mixed-currency aggregates keep token totals but
  return nullable aggregate costs instead of adding USD and CNY values together.

Constructor/default-zero price values are not trusted free prices. Unknown,
placeholder, local, or unmatched models remain token-only until trusted pricing
is added. The shared `autobyteus-ts` catalog can express currency, cache
read/write prices, provider pricing source/effective date, and input-size price
tiers; server-side accounting selects the applicable trusted tier before
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
  nullable costs by model.
- `getAgentRunTokenUsageSummary(runId)` returns a run summary.
- `getTeamRunTokenUsageSummary(teamRunId)` returns a team aggregate.
- `getTeamMemberTokenUsageSummary(teamRunId, memberAgentRunId?, memberRouteKey?)`
  returns focused member usage.

All summary token totals are computed from accounting deltas, not reported
cumulative snapshots. Run, team, member, and statistics GraphQL shapes include
reasoning output tokens and nullable reasoning-output estimated cost alongside
input/output/total fields. Clients must treat those fields as server-owned
summary data, not as a prompt to recalculate prices locally.

## Frontend Contract

The frontend treats token usage as display-only state:

- live `TOKEN_USAGE_UPDATED` WebSocket events update `tokenUsageMeterStore`;
- reopening/focusing runs hydrates from the GraphQL summary queries;
- `TokenUsageHeaderChip` and the right-side `Token` tab render tokens, nullable
  estimated API costs, price status, model/runtime metadata, and latest context
  pressure;
- `TokenUsageMeterPanel` presents compact paired Input, Output, and Total cards
  so each token count appears with its related cost estimate. Costs are quiet
  secondary rows but remain accessibly labeled; the Total card is subtly
  highlighted.
- the Output card adds thinking/reasoning detail only when the server summary
  reports a positive `reasoningOutputTokens` value. The detail is a native
  disclosure chip with a chevron and explanatory copy that those thinking tokens
  are already included in output tokens and estimated output cost;
- unknown context pressure is hidden rather than rendered as a noisy empty card.
  Context pressure appears only when a numeric pressure percentage and effective
  context budget are present;
- the frontend does not compute authoritative accounting deltas or model prices.

"Unpriced" means token usage exists but trusted API-price metadata was missing;
it must not be displayed as `$0`. Mixed-currency aggregate costs are displayed
as mixed/unavailable rather than summed under one currency label.

## Browser Frontend Evidence

Historical delivery evidence exercised the browser-facing token UI against real
local backend/frontend stacks and the ledger-backed GraphQL hydration path. That
evidence covered all three requested runtime families:

| Runtime proof | How usage reached the browser | Verified token UI state |
| --- | --- | --- |
| AutoByteus + LM Studio qwen3.5 | Built backend + Nuxt frontend, seeded historical run metadata, and one ledger event loaded through the workspace route. | Header `366 tok · unpriced`; token totals `321 / 45 / 366`; costs `unpriced`; `apiCostStatus = price_missing`; model `qwen3.5-27b:lmstudio@127.0.0.1:1234`; runtime `autobyteus`; event count `1`; context pressure `12.2%` with `500 / 4.096` context tokens; header chip reopened the token panel after switching tabs. |
| Codex App Server | Real backend GraphQL-created run and WebSocket turn emitted `TOKEN_USAGE_UPDATED`, persisted one ledger event, then the persisted run opened in Nuxt. | Header `12.7k tok · 0,0096 $ est`; token totals `12.695 / 26 / 12.721`; estimated costs; `apiCostStatus = estimated`; model `gpt-5.4-mini`; runtime `codex_app_server`; event count `1`. |
| Claude Agent SDK | Real backend GraphQL-created run and WebSocket turn emitted `TOKEN_USAGE_UPDATED`, persisted one ledger event, then the persisted run opened in Nuxt. | Header `22.3k tok · unpriced`; token totals `22.270 / 39 / 22.309`; costs `unpriced`; `apiCostStatus = price_missing`; model `sonnet`; runtime `claude_agent_sdk`; event count `1`. |
| Codex App Server + GPT-5.5 UI polish proof | Live browser run opened the Token tab after a Codex App Server / GPT-5.5 prompt with reasoning output. | Compact auto-fit paired cards, quiet cost rows, highlighted Total card, single quiet price-status line, hidden unknown context-pressure block, and expanded thinking-token disclosure with chevron/explanatory copy. Screenshot: `/Users/normy/.autobyteus/browser-artifacts/6b2c05-1782396115079.png`. |

Together these proofs confirm the current browser contract over server-owned
ledger data for both estimated-price and missing-price cases. The frontend must
continue to render server-provided cost status and nullable estimated costs; it
must not synthesize prices or display missing prices as `$0`.

The browser proofs are one-off delivery evidence rather than a committed browser
or screenshot automation harness. Current durable regression coverage for the
token-pricing UI contract comes from GraphQL E2E coverage for reasoning fields,
mixed-currency aggregate behavior, removed MiniMax M2.7 model-list exposure, and
the DS-007 runtime-native Codex cache/reasoning/context baseline. Frontend
store/component/composable tests cover live runtime-like reasoning/cost/context
state, compact paired Token meter cards, accessible cost rows, native
thinking-token disclosure open/closed behavior, hidden zero-thinking state, and
the right-side tab label.

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

The reviewed delivery evidence for the token usage ledger change recorded this
command passing for three real runtime cases: AutoByteus with LM Studio
qwen3.5-family model, Codex App Server, and Claude Agent SDK. Each case creates
a run, opens the agent websocket, sends `SEND_MESSAGE`, observes
`TOKEN_USAGE_UPDATED` with positive token totals and the expected
runtime/ingestion kind, waits for idle, and verifies ledger-backed GraphQL
summary/statistics projections.

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
