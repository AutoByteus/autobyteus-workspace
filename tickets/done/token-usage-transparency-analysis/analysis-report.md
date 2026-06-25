# Token Usage Analysis Report — Latest `origin/personal`

## Base

- Refreshed against latest `origin/personal`: `5bd521ba83e4a2df852be5e8914915959149137d`.
- Commit title: `chore(release): bump workspace release version to 1.3.75`.
- Date: 2026-06-24.
- Dedicated worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-transparency-analysis`.


## 2026-06-24 Design Refinement Addendum

The later draft design refines two terms from this initial report:

- `usage_source` is renamed/demoted to optional internal `ingestion_kind`. It is useful for audit/idempotency/debugging, but it should not be treated as a business metric or prominent frontend concept.
- Cost is simplified to one v1 product metric: **estimated API cost**. Every runtime uses the same API price calculation when the model exists in the shared price catalog.
- `TokenCostCalculator` gets prices only through a server-owned `TokenPriceConfigProvider`, which in v1 delegates built-in model price lookup to the shared `autobyteus-ts` model catalog. Unmatched models are token-only/unpriced; no duplicate server built-in price registry is needed.
- Exact price research is deferred per user direction. The current design still refreshes stale shared model registry entries and allows missing/placeholder prices without blocking token storage; unknown prices must remain visibly unpriced/price-missing rather than becoming authoritative zero-dollar estimates.
- Frontend placement is now included as a minimal live transparency surface: a right-side `Usage` / `Token Meter` tab plus a compact workspace header chip. The server must calculate estimated API cost before dispatching `TOKEN_USAGE_UPDATED`; the frontend formats server-provided token/cost/status values and never calculates model price locally.
- The live UI must separate two meters: total consumed tokens/estimated API cost for spend transparency, and latest per-call input tokens divided by effective context budget for context/compaction pressure.
- Current event pipeline processors append derived events. The design therefore requires a pre-dispatch transform/enrichment step for token usage events so the frontend receives exactly one enriched `TOKEN_USAGE_UPDATED` per usage observation, not both raw and enriched duplicates.

See `design-spec.md` for the current target shape.

## Executive Summary

The right first feature is not a dashboard, forecast, or budget rule. The bottom problem is that token usage must become a durable business meter.

Tokens are like water/electricity meter readings. In v1, token usage maps to an estimated API cost whenever the model has a price in the shared catalog. This gives one transparent cost meter across runtimes.

Current code can receive token data from several backend paths, but storage is incomplete and lossy. The platform should introduce a server-owned token usage ledger and make all higher-level features projections from that ledger.

## Is Token Data Currently Stored?

Partially.

Current durable table:

```text
token_usage_records
```

Current writer:

```text
TokenUsagePersistenceProcessor -> TokenUsageStore -> SqlTokenUsageRecordRepository
```

Current shape:

- one `user` row for prompt/input tokens,
- one `assistant` row for completion/output tokens,
- `runId`, role, token count, cost, timestamp, optional model.

This is not enough for transparent token accounting because it lacks turn id, runtime kind, provider, team/member identity, raw provider usage, usage source/scope, pricing basis, and cost semantics.

Also, the writer is optional. It only runs for agent definitions that include `TokenUsagePersistenceProcessor`; it is not a universal platform meter.

## What Does Provider Usage Mean?

For normal LLM APIs, usage is **per request/response**, not cumulative conversation usage.

- `prompt_tokens` / `input_tokens`: the entire prompt/context sent in that call.
- `completion_tokens` / `output_tokens`: model output for that call.
- `total_tokens`: usually prompt + completion for that call.

If history is resent on later turns, those historical tokens are billed again as prompt tokens. Therefore, summing per-call token usage is correct for business accounting, even though it double-counts unique text content.

## Current Capture By Runtime

### AutoByteus LLM providers

- OpenAI-compatible, OpenAI Responses, Gemini, Mistral, Ollama, AutoByteus, Kimi/GLM-compatible paths map provider usage into `TokenUsage`.
- Streaming usage usually arrives at final chunk and is carried into `CompleteResponse`.
- Compaction already uses `prompt_tokens` for context budget pressure.

Important caveats:

- Anthropic streaming currently records output tokens but sets prompt tokens to zero in the delta path.
- Provider-specific details such as cached tokens and reasoning tokens are dropped.
- Cost is not reliably computed in the default runtime path.

### Codex App Server

- Current latest code parses `thread/tokenUsage/updated` into `CodexThread` in-memory ready usage.
- Current backend does not persist that ready usage and does not emit it to frontend.
- Historical persistence existed in `764003448a47578c671875701b65006e260c5a25` and was removed in `c9aeee3a0d1fb63d6a09d0b7750b2f4620478b36` while investigating stream stalls.
- New persistence should not simply restore the old blocking dispatch path; it should be bounded/failure-isolated.

### Claude Agent SDK

- Current latest code records provider compaction boundary `pre_tokens` telemetry.
- This is not complete per-response token accounting.
- Claude Agent SDK usage still needs token metering for transparency.

## Pricing / Cost State

`autobyteus-ts` has model pricing config:

```text
TokenPricingConfig(inputTokenPricing, outputTokenPricing)
```

Many supported API models have per-million input/output pricing in `supported-model-definitions.ts`.

But current storage does not consistently use this pricing. Unknown cost often becomes `0` in old token usage records, which makes known-zero and unknown-price usage indistinguishable.

## Frontend State

- Settings aggregate token usage page exists.
- `ASSISTANT_COMPLETE.usage` is typed in the frontend protocol but ignored by the handler.
- Conversation message token/cost fields and rendering exist but are not populated.
- Run memory/history does not preserve token usage as accounting data.


## Where Should Token Accounts Live?

Business-wise, token consumption is anchored to the **agent run**. An agent run is the unit of work that actually talks to an LLM runtime and consumes tokens. For team execution, the consuming unit is still the concrete member agent run; the team run total is an aggregate across member runs and nested delegated runs.

Physically, the safest storage is not a single mutable `total_tokens` field on the run. The source of truth should be an append-oriented token usage ledger whose rows reference the run identity. Agent-run totals, team-run totals, user monthly totals, and budget remaining are all derived from that ledger.

So the ownership model is:

```text
AgentRun owns the business identity of the work.
TokenUsageLedger owns the meter readings for that work.
Run/team/user cost summaries are projections from the meter readings.
```


## Input Tokens And Output Tokens Must Stay Separate

A run-level token total should be treated as a convenience projection, not the full accounting model. The core accounting dimensions are input tokens and output tokens. They must stay separate because providers usually price them differently and because they mean different things operationally.

- Input tokens measure the prompt/context sent to the model. This is the key number for context pressure and compaction.
- Output tokens measure generated model response work. This often has a different price.
- Total tokens are useful for a simple meter, but they should be derived from input plus output rather than replacing them.

Therefore an agent-run summary, if materialized, should look like:

```text
input_tokens_total
output_tokens_total
total_tokens
estimated_input_cost
estimated_output_cost
estimated_total_cost
```

The ledger rows should still be authoritative.

## Recommended Storage Model

Create a new append-oriented ledger, for example:

```text
llm_token_usage_events
```

One row should represent one meter reading: an actual LLM API call or explicit runtime token usage observation.

Minimum identity fields:

```text
usage_event_id
observed_at
persisted_at
run_id
turn_id
llm_call_id / call_sequence
root_team_run_id
member_agent_run_id
team_run_path_json
agent_definition_id
workspace_id/user_id/account_id nullable for future
```

Runtime/model fields:

```text
runtime_kind
provider
model_identifier
model_value
usage_source
usage_scope
```

Token fields:

```text
input_tokens
output_tokens
total_tokens
cached_input_tokens nullable
reasoning_output_tokens nullable
billable_input_tokens nullable
billable_output_tokens nullable
raw_usage_json
quality_flags_json
```

Cost fields:

```text
cost_basis                 -- api_price_estimate
currency
input_price_per_million
output_price_per_million
cached_input_read_price_per_million nullable
cached_input_write_price_per_million nullable
pricing_source
pricing_snapshot_json
estimated_api_input_cost
estimated_api_output_cost
estimated_api_total_cost
api_cost_status            -- estimated, price_missing, partial_price_missing
```

## Why This Solves The Bottom Problem

A ledger gives the platform a trustworthy meter. After that, every higher-level feature is a projection:

- per agent run usage,
- per team run usage,
- per user/day/month usage,
- model/provider cost breakdown,
- token budget remaining,
- compaction pressure percentage,
- efficiency comparison between tasks/agents.

Without the ledger, those features become inconsistent frontend calculations or incomplete aggregates.

## First Implementation Principle

Keep first milestone simple but structurally correct:

1. Store the correct data at the right backend boundary.
2. Preserve raw usage and source/scope.
3. Separate token count from cost interpretation.
4. Add the minimal live run meter now, and leave polished analytics/forecasting/budgets as later projections.


## Unified Event-Based Collection Recommendation

A unified token system should not let each runtime write directly to storage in its own way. The better boundary is a normalized server event/telemetry shape.

Recommended spine:

```text
Runtime-specific usage signal
  -> runtime adapter/converter
  -> TOKEN_USAGE_UPDATED normalized event
  -> server cost enrichment from shared model pricing
  -> live TOKEN_USAGE_UPDATED message for frontend display
  -> async TokenUsageEventPersistenceProcessor
  -> token usage ledger
  -> derived run/team/user summaries for reload/history/settings
```

Runtime mapping:

```text
AutoByteus API runtime:
  each LlmPhase CompleteResponse.usage
  -> TOKEN_USAGE_UPDATED

Codex App Server runtime:
  thread/tokenUsage/updated
  -> CodexThread ready turn usage
  -> TOKEN_USAGE_UPDATED

Claude Agent SDK runtime:
  SDK terminal result.usage / result.modelUsage
  -> TOKEN_USAGE_UPDATED
```

This is better than the current optional `TokenUsagePersistenceProcessor` because it puts accounting in the server runtime event layer, where all runtime kinds already converge.

Important design caveat: for Codex, the raw `thread/tokenUsage/updated` event should remain owned by `CodexThread`; higher layers should consume a ready normalized usage observation, not parse raw Codex payloads directly.



## Provider Terminology Update

The design should not use one ambiguous `provider` field. Use:

```text
runtime_kind      -- AutoByteus execution harness
model_provider    -- vendor/model family when known
ingestion_kind    -- internal runtime/protocol source marker
cost_basis        -- api_price_estimate for v1 calculated cost
```

This makes cost calculation safer because pricing should be based on explicit model identity, not a vague provider string.

## Native AutoByteus Counting Caveat

Native AutoByteus cannot rely only on `ASSISTANT_COMPLETE` for accounting. Tool-heavy turns can have multiple LLM phases: a model call that emits tool intents, then one or more continuation model calls. Current turn runner only sends the final response through `LLMResponsePipeline`; therefore final assistant-complete usage is not enough to count every model call.

The native runtime should emit `TOKEN_USAGE_UPDATED` from each LLM phase when usage is available.


## Simplification: Tokens First, Cost Server-Side

The latest review supports simplifying `autobyteus-ts` token management. The current `TokenUsageTracker` and `TokenUsageTrackingExtension` are not a good authoritative accounting boundary because they mix local token estimation, provider usage replacement, price calculation, and in-memory totals. They are also disabled by default because no token counter factory is passed by `BaseLLM`.

Recommended simplification:

```text
autobyteus-ts runtime:
  capture/surface provider token counts only

server token-usage subsystem:
  resolve shared model API price
  calculate estimated API costs before frontend dispatch
  persist enriched token/cost events asynchronously
  provide run/team/user summaries

frontend:
  display server-provided tokens/costs/status only
```

This matches the simplified product model: token counts are the original statistics data. Cost is derived from token counts + model + shared API pricing.


## Simplification: No Local Token Estimation

The design should be stricter: do not estimate authoritative token counts locally. Provider/runtime usage is the accounting source. If usage is absent, record that it is absent; do not invent counts from local tokenizers.

Therefore `autobyteus-ts` token-counter/tracker functionality should be removed from the persisted accounting path. Token storage receives reported token numbers; server cost calculation derives cost from those reported numbers.


## Concrete Cost Rule

Token cost should be calculated as estimated API cost whenever shared model price configuration exists.

```text
shared API price config exists:
  estimated_api_input_cost  = input_tokens * input_price_per_million / 1_000_000
  estimated_api_output_cost = output_tokens * output_price_per_million / 1_000_000
  estimated_api_total_cost  = input + output (+ cache dimensions when supported)
  cost_basis                = api_price_estimate
  api_cost_status           = estimated

Missing price config:
  store tokens
  estimated_api_cost = null
  api_cost_status    = price_missing
```

Cached-token price support should be represented in price config and ledger columns when providers report cached token fields, but the first principle remains: no local token estimation, no fabricated cost.

## 2026-06-24 Token Meter Simplification Addendum

The v1 Usage/Token Meter should be simple: show consumed input tokens, output tokens, total tokens, input cost, output cost, and total estimated API cost so far. Cache-read and cache-creation/cache-write token buckets should be preserved backend-side when reported, but frontend cache display is skipped for v1. Reasoning/thinking tokens may still be stored for future work, but v1 frontend display should skip reasoning. Context pressure remains useful but is secondary to the core cost meter.

## 2026-06-24 Design Principles Audit Addendum

After reloading the solution-designer design principles and examples, the design spec was strengthened with explicit use-case-to-spine coverage, a team aggregation spine, a change inventory, and a concrete decommission plan. The key cleanup is now explicit: old optional response-processor accounting, role-split `token_usage_records`, local token counters/trackers, old Codex direct writes, frontend message-level usage, and frontend price constants must not remain authoritative.


## 2026-06-24 No-Legacy Direction Addendum

The user confirmed the design should not keep legacy code. The design now requires ledger-backed settings/statistics and clean decommission of old role-split storage/writers rather than transitional compatibility paths.

## 2026-06-24 Architecture Review Round 1 Rework Addendum

Architecture review failed with design-impact findings AR-001 through AR-004. The revised design now tightens the data model around four accounting fundamentals:

1. **Native raw usage preservation**: native provider adapters must create `LlmTokenUsageObservation` before `CompleteResponse`/stream payload normalization drops raw/cache/reasoning fields. OpenAI-compatible and Anthropic usage mapping must preserve `raw_usage_json` and provider detail buckets. The old prompt/completion/cost-only `TokenUsage` shape is not the ledger source.
2. **Trusted pricing contract**: shared model pricing lookup must distinguish `trusted`, `missing`, and `placeholder` prices. Default-zero and local-runtime-zero pricing never becomes `$0 estimated`; cost is calculated only from trusted price dimensions.
3. **Canonical run/team identity**: token usage events are enriched server-side from `AgentRunContext.config` and `MemberTeamContext`, not from frontend websocket aliases. Ledger/summary shapes now include root team run id, member agent run id, member path/route key, agent definition id, and workspace id.
4. **Reported reading vs accounting delta**: ledger rows store provider/runtime reported readings separately from server-computed accounting deltas. `per_call` and `per_turn` rows use reported counts as deltas; `cumulative_snapshot` rows are converted by snapshot-series diffing before summaries/cost. Codex `last` is `per_turn`; Codex `total` fallback is `cumulative_snapshot` and must not be summed directly.

These changes keep the user-approved storage-first/no-legacy direction while making the first implementation safe for live UI totals, historical projections, and later budget/accounting features.
