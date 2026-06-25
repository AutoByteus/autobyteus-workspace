# Token Usage Storage / Transparency Requirements

## Status

Revised after architecture review round 1 on latest `origin/personal` (`5bd521ba83e4a2df852be5e8914915959149137d`, `chore(release): bump workspace release version to 1.3.75`) as of 2026-06-24. User approved sending the no-legacy design direction to architecture review; this revision tightens the four design-impact findings before round 2. Implementation is still not approved until architecture review passes.

## Bottom Problem

Tokens are the platform's usage meter. For v1, the product cost metric should be the estimated cost under the model provider's API price schedule. This gives one consistent cost view across AutoByteus, Codex, and Claude Agent SDK runtimes, regardless of the actual commercial arrangement behind a specific runtime.

AutoByteus currently receives token usage from several LLM paths, but does not yet have a reliable, consistent, durable business record of token consumption for every meaningful model interaction. Without that record, later features such as run-level transparency, monthly user budgets, cost dashboards, quota enforcement, forecasting, and efficiency coaching all stand on weak data.

The first feature should therefore be **correct durable token usage storage**. Dashboards and forecasting can be projections on top of that storage later.

## Product Questions The Storage Must Answer

For every LLM call or explicit runtime token usage observation:

- Which run used the tokens?
- If part of a team, which team run and member agent run used them?
- Which turn/request used them?
- Which runtime/provider/model produced the usage?
- How many input/output/total tokens were consumed?
- Is the number a per-call/per-turn delta, or a cumulative snapshot?
- If the model exists in the shared price catalog, what estimated API cost did the token usage represent?
- If no price is found, is the row clearly marked token-only/price-missing?
- When was the usage observed and persisted?
- Can the usage be audited after reload/restart independently of frontend state?

## Current-Code Findings On Latest `origin/personal`

- `autobyteus-ts` still normalizes provider usage into `TokenUsage` with `prompt_tokens`, `completion_tokens`, `total_tokens`, and optional cost fields.
- Normal provider `usage` means usage for the specific API request/response, not cumulative conversation/account usage.
- Prompt/input tokens are the full context sent in that API call, including system/developer prompt, retained history, user message, tool messages, and compaction summaries. Re-sent history is billable again on later calls, so summing per-call prompt tokens is correct for cost accounting.
- Streaming providers generally expose final usage at the terminal/final chunk. Current `LlmPhase` stores final chunk usage in `CompleteResponse`.
- Model price configuration exists in `autobyteus-ts/src/llm/supported-model-definitions.ts` through `TokenPricingConfig`, but current persistence does not reliably compute or store cost basis; missing cost fields become `0` in old storage.
- Existing server storage remains the old `token_usage_records` table through optional `TokenUsagePersistenceProcessor` and `TokenUsageStore`.
- `TokenUsagePersistenceProcessor` is optional (`isMandatory() === false`), so AutoByteus-runtime persistence only happens for definitions that explicitly include it in `llmResponseProcessorNames`.
- Current storage shape is lossy: one prompt row and one assistant row per response with run id, role, token count, cost, model, and timestamp. It lacks turn id, team run id, runtime kind, provider, call id, raw provider usage, source/scope, pricing basis, and quality metadata.
- Codex runtime parses `thread/tokenUsage/updated` into `CodexThread` state, but latest backend does not persist or emit that usage. The previously added Codex persistence path existed in `764003448a47578c671875701b65006e260c5a25` and was removed in `c9aeee3a0d1fb63d6a09d0b7750b2f4620478b36` while investigating stream stalls.
- Claude Agent SDK runtime currently records provider compaction boundary `pre_tokens` metadata, but that is compaction telemetry, not complete token usage accounting.
- Frontend aggregate settings stats still exist, and conversation message types/rendering have token/cost fields, but live `ASSISTANT_COMPLETE.usage` is ignored by the frontend handler and historical run memory does not preserve usage as the durable source of truth.
- Native AutoByteus provider adapters currently drop provider-specific usage detail before the server can persist it: `CompleteResponse.usage` carries only prompt/completion/total and optional cost fields, while OpenAI-compatible and Anthropic adapters discard cache/reasoning/raw usage fields.
- Current `TokenPricingConfig` defaults missing input/output prices to `0.0`; the storage design must make price trust explicit so missing, placeholder, or local-model default zero prices never become `$0 estimated` rows.
- Team/member identity already exists in `AgentRunConfig.memberTeamContext`, `TeamRunEvent`, and websocket mappers, but token usage events/ledger rows must receive it from a canonical server-side context enricher rather than frontend-only transport flattening.
- Codex currently falls back from `tokenUsage.last` to `tokenUsage.total` without preserving which scope was used; the design must persist reported scope and server-computed accounting deltas so cumulative snapshots cannot be summed twice.



## Terminology: Runtime, Provider, Model, Cost Basis

The word `provider` is ambiguous unless we separate runtime from model/vendor identity. The design should use these terms:

```text
runtime_kind     = the execution harness inside AutoByteus
model_provider   = the model/vendor family, when known
model_identifier = the concrete model identity used for display/pricing
ingestion_kind   = optional internal audit/debug hint for the runtime bridge that produced the observation
cost_basis       = pricing basis for calculated cost; v1 uses api_price_estimate
```

Examples:

| Runtime | runtime_kind | model_provider | ingestion_kind | Notes |
| --- | --- | --- | --- | --- |
| Native OpenAI API call | `autobyteus` | `OPENAI` | `autobyteus_llm_phase` | API-metered by model pricing. |
| Native Anthropic API call | `autobyteus` | `ANTHROPIC` | `autobyteus_llm_phase` | API-metered unless configured otherwise. |
| Codex App Server | `codex_app_server` | `OPENAI` or `null` if not known | `codex_thread_token_usage` | Cost display uses the same estimated API-price metric when model pricing resolves. |
| Claude Agent SDK | `claude_agent_sdk` | `ANTHROPIC` | `claude_sdk_result` | SDK result includes usage/modelUsage and estimated client-side cost. |

So, when earlier notes say `provider`, the intended durable field should be `model_provider`; `runtime_kind` stays separate.

## Storage Ownership Decision

The token account should be anchored on the **agent run**, because the agent run is the fundamental business unit that consumes model/runtime tokens. However, the raw token records should not be stored only as mutable total columns on the agent run itself.

The correct first storage shape is:

```text
AgentRun / TeamMemberRun / TeamRun  <-- referenced by
TokenUsageLedgerEvent              <-- one row per model call or runtime usage observation
```

Reasoning:

- An agent run can perform multiple LLM calls across multiple turns.
- A single turn can involve tool loops, retry paths, compaction calls, or sub-agent/team-member calls.
- Team runs do not directly consume tokens in one place; their member agent runs consume tokens and the team total is an aggregate.
- Run-level totals are derived projections from immutable ledger rows.
- Storing only `agent_run.total_tokens` would lose auditability, pricing basis, provider source, and correction history.

Therefore, the ledger rows are the source of truth; agent-run/team-run token totals are query projections, cached summaries, or materialized views built from the ledger.


## Token Count Dimensions

Token usage must never be modeled as only one undifferentiated `total_tokens` number. Every authoritative usage record and every run-level summary must preserve at least these separate dimensions:

```text
input_tokens
output_tokens
total_tokens = input_tokens + output_tokens, when provider semantics support that equation
```

Reasoning:

- Input and output tokens are normally priced differently.
- Input tokens represent context submitted to the model and are the primary signal for context pressure/compaction.
- Output tokens represent generated model work and are often more expensive.
- A single total is useful for a quick meter display, but it is not sufficient for cost accounting.

If agent-run totals are materialized for performance, they must be projections with separate fields:

```text
agent_run_total_input_tokens
agent_run_total_output_tokens
agent_run_total_tokens
estimated_api_input_cost
estimated_api_output_cost
estimated_api_total_cost
```

The authoritative source remains the ledger rows. The run summary is recalculable from the ledger.



## No Local Token Estimation For Accounting

Authoritative token counts must come from provider/runtime-reported usage. AutoByteus should not estimate token counts itself for accounting.

If a runtime/provider does not return usage for a call, the system should store the usage as missing/unknown or skip the ledger row with an explicit quality/log reason. It must not fabricate accountable token counts from local tokenizers.

This means the first storage milestone should remove or decommission local token-count estimation from the accounting path. Local counters, if retained at all, are only debugging or preflight estimation tools and must not feed persisted business accounting.

## Token Cost Calculation Ownership

Token capture and cost calculation should be separated. The runtime should report token counts and model identity; server-side token usage management should calculate cost from stored token data and pricing configuration.

Native `autobyteus-ts` should not be the authoritative place where token cost is calculated. In particular, the current `TokenUsageTracker` / `TokenUsageTrackingExtension` path mixes:

- local token estimation,
- provider-reported usage replacement,
- pricing calculation,
- in-memory usage history.

That is too much responsibility for the LLM runtime layer and is disabled by default anyway. The storage-first design should simplify this by making `autobyteus-ts` responsible only for surfacing token counts from provider responses, while the server `token-usage` subsystem owns cost calculation and summaries.

## In-Scope Storage-First Requirements

- REQ-001: Add a server-owned append-oriented token usage ledger as the durable source of truth.
- REQ-002: Store one ledger record per actual LLM API call or explicit runtime token usage observation.
- REQ-003: Preserve usage scope (`per_call`, `per_turn`, or `cumulative_snapshot`) and, if helpful for audit/idempotency, an internal `ingestion_kind`; do not make `ingestion_kind` a business/product metric.
- REQ-004: Preserve raw provider/runtime usage JSON so provider-specific details are not lost.
- REQ-005: Store identity fields needed for audit: run id, turn id, runtime kind, model provider, model identifier/value, and call sequence/id where available.
- REQ-006: Store team/member identity when available: root team run id, team run path/member path, and member agent run id.
- REQ-007: Store normalized token counts: input/prompt, output/completion, and total tokens.
- REQ-008: Store estimated API cost separately from token counts, including `cost_basis = api_price_estimate` and a status such as `estimated` or `price_missing`.
- REQ-009: Store pricing/cost as estimated with a pricing snapshot and currency when the shared model price can be resolved; store price-missing status otherwise.
- REQ-010: Do not rely on frontend state, settings aggregates, or runtime memory traces as the source of truth.
- REQ-011: Do not block runtime streaming or event dispatch on slow token persistence; persistence must be bounded, queued, or otherwise failure-isolated.
- REQ-012: Rebuild current aggregate statistics as projections from the new ledger; do not keep old storage as a compatibility source.


## Concrete Simplification And Removal Scope

The following code should be removed or removed from the accounting path:

```text
autobyteus-ts/src/llm/token-counter/base-token-counter.ts
autobyteus-ts/src/llm/utils/token-usage-tracker.ts
autobyteus-ts/src/llm/extensions/token-usage-tracking-extension.ts
BaseLLM.latestTokenUsage and automatic token usage extension registration
```

Rationale: every supported authoritative runtime path should use provider/runtime-reported usage. Local token counters should not calculate persisted usage.

The shared `TokenUsage` shape can also be simplified over time so runtime usage only carries token counts and provider/raw fields. Runtime-reported cost fields should not be accepted as authoritative server accounting unless explicitly marked as external/provider-estimated metadata.

## Price Configuration Requirement

Cost calculation requires a server-readable token price configuration. To avoid duplicated pricing logic, built-in model prices must remain in the shared `autobyteus-ts` model catalog and be exposed through an explicit pricing lookup; the server token-usage subsystem wraps that lookup and snapshots the resolved price. In v1, if the shared catalog cannot resolve a Codex/Claude/native model, the ledger stores token usage only and does not calculate price. The first concrete pricing shape should support current input/output pricing plus future cached-token pricing:

```text
model_provider
model_identifier / model_value
currency                   -- usually USD
input_price_per_million
output_price_per_million
cached_input_read_price_per_million/null
cached_input_write_price_per_million/null
effective_from/null
effective_to/null
price_config_id
source/version
shared catalog source id
```

For the first implementation:

- Always calculate estimated API cost when the model price resolves from the shared `autobyteus-ts` catalog **and** the returned pricing contract says the input/output dimensions are trusted, regardless of runtime kind.
- Store `estimated_api_input_cost`, `estimated_api_output_cost`, `estimated_api_total_cost`, `cost_basis = api_price_estimate`, `api_cost_status = estimated`, and the trusted pricing snapshot.
- Missing, unmatched, placeholder, unaudited, or default-zero model price: store token usage, leave estimated API cost fields `null`, and set `api_cost_status = price_missing` or `partial_price_missing` as appropriate. Do not add a duplicate server price row just to support legacy/unrecognized models.
- If a new supported model is added before its exact price is audited, the model must still be usable. Pricing may be absent/null or temporarily placeholder, but the cost resolver must not mark unknown placeholder prices as authoritative `estimated` cost.
- A legitimate zero price is allowed only when the shared pricing API returns `pricing_status = trusted` with explicit zero dimensions and a source/version. Constructor defaults, local runtime defaults, or omitted catalog prices are never trusted zero prices.

Cost is derived from stored accounting token deltas plus trusted shared API price config. Token counts remain the primary data.

## Supported Model Registry Refresh Requirement

The token transparency work depends on a usable shared model catalog because the server price resolver will delegate built-in model identity and pricing lookup to `autobyteus-ts`. Therefore this ticket should also refresh obviously stale supported model entries while not blocking on perfect price data.

Minimum user-directed model refresh:

- Add Claude Opus 4.8: `name: claude-opus-4.8`, `value: claude-opus-4-8`.
- Remove `claude-haiku-4.5` from the default supported model list.
- Remove/de-prioritize old `claude-opus-4.6`; keep `claude-opus-4.7` and `claude-sonnet-4.6`. Do not add `claude-sonnet-4.8` unless official docs list it.
- Replace old Grok model entries with current xAI entries: `grok-4.3` and `grok-build-0.1`.
- Add MiniMax M3: `name: minimax-m3`, `value: MiniMax-M3`; keep `minimax-m2.7` only if the product still wants a non-latest MiniMax option.
- Add Qwen current flagship `qwen3.7-max`; keep `qwen3-max` only if existing deployments still depend on it.
- Keep `glm-5.2`, current Gemini rows, `kimi-k2.6`, and `kimi-k2.7-code`; optionally add `kimi-k2.7-code-highspeed` and `gpt-5.4-nano` if desired.
- Mistral is excluded from this ticket's model/pricing audit per user direction.

Price exactness is explicitly not a blocker for the model refresh. New model entries may start without trusted prices. Storage and UI transparency must still show token usage, and cost rows should be `price_missing` or equivalent until prices are trusted.

## Token Price Calculation And Frontend Transparency Requirements

Price/cost must be calculated by the server token-usage subsystem, not the frontend. The first implementation should enrich each normalized token usage observation with estimated API cost before the corresponding `TOKEN_USAGE_UPDATED` event is dispatched to frontend listeners. Ledger persistence may remain asynchronous and failure-isolated, but the event and the stored ledger row must share the same price snapshot and cost status.

Calculation timing requirement:

```text
runtime/provider reports usage
  -> server token usage normalizer builds usage observation
  -> TokenPriceConfigProvider resolves shared model price
  -> TokenCostCalculator annotates estimated API cost/status
  -> one enriched TOKEN_USAGE_UPDATED is dispatched to frontend with token + cost fields
  -> ledger writer persists the same enriched event asynchronously/idempotently
```

Frontend placement requirement:

- Add a right-side workspace tab named `Usage` or `Token Meter` for run-level transparency.
- Add a compact always-visible header chip near the agent/team status that shows the current run's total consumed tokens and estimated API cost when available. Clicking it should open the Usage tab.
- Keep the existing Settings token statistics page as historical/global analytics; later it should become a ledger-backed projection, not the live run meter.
- Do not use the existing conversation message token/cost fields as the authoritative primary UI. They may remain secondary only if backed by ledger/event projections.

The Usage tab should be a simple cost meter first. It should show at minimum:

- active agent run total consumed input/output/total tokens,
- estimated API input/output/total cost when priced,
- unpriced token counts and `price_missing` status when price is absent,
- for team runs: team total plus member/focused-member breakdown.

Cache-related token buckets can still be preserved in backend ledger rows when providers report them, but the v1 frontend meter must skip cache display. Reasoning/thinking tokens can also be preserved in backend ledger rows for future work, but the v1 frontend meter should skip reasoning display.

Context percentage is useful for compaction transparency, but it is secondary to the token/cost meter. If shown, it must use latest per-call input tokens, not cumulative input tokens:

```text
effective_context_budget = activeContextTokens || maxInputTokens || maxContextTokens
context_pressure_percent = latest_per_call_input_tokens / effective_context_budget
```

## Out Of Scope For First Storage Milestone

- OOS-001: Quota enforcement or hard budget blocking.
- OOS-002: Forecasting future task cost.
- OOS-003: Polished dashboards beyond the minimal live Usage/Token Meter surface and basic ledger-backed query projections.
- OOS-004: Commercial allocation formulas. Store enough data to support this later, but do not invent allocation policy now.
- OOS-005: User/company account budget or commercial policy if no authoritative user/account model is ready. Include nullable future identity fields rather than forcing a premature account model.

## Acceptance Criteria

- AC-001: After an AutoByteus-runtime LLM turn with provider usage, a durable ledger row exists with run id, turn id, runtime/model-provider/model identity, normalized input/output/total tokens, usage scope, observed timestamp, raw usage JSON, and optional internal ingestion kind.
- AC-002: A Codex token usage update can be persisted as a ledger row without reintroducing the old blocking dispatch path that was removed during stream-stall investigation.
- AC-003: Cost data is not silently treated as zero when pricing is absent. Rows distinguish `api_cost_status = estimated` from `api_cost_status = price_missing`.
- AC-004: Any runtime row whose model resolves through the shared `autobyteus-ts` pricing API can store a pricing snapshot and calculated estimated API input/output/total cost.
- AC-005: Codex/Claude/native rows whose model is not in the shared price catalog remain token-only with `price_missing`, without blocking token storage.
- AC-006: Existing settings aggregate statistics are backed by a projection/query from the new ledger; old storage is not kept as a compatibility source for the new feature.
- AC-007: Frontend live display reads from `TOKEN_USAGE_UPDATED` events and/or ledger-backed summary queries shaped by the ledger model, not from independent component-local accounting or legacy message token fields.
- AC-008: The shared supported model registry no longer exposes the user-requested stale removals (`claude-haiku-4.5`, old primary Grok entries) as current/default supported choices, and includes current replacements such as `claude-opus-4.8`, `grok-4.3`, `grok-build-0.1`, `minimax-m3`, and `qwen3.7-max`.
- AC-009: A newly added model with no trusted price can still be selected and can still produce token ledger rows; those rows are visibly unpriced/price-missing rather than silently zero-cost estimated rows.
- AC-010: When a token usage event has a known price, the frontend receives and displays the server-calculated estimated API cost without recalculating price locally.
- AC-011: When a token usage event has no trusted price, the frontend displays token counts with an unpriced/price-missing state instead of showing `$0` as if it were a real estimate.
- AC-012: The active workspace exposes a Usage/Token Meter surface in the right-side tab set and a compact header chip for at-a-glance total consumed tokens and estimated cost.
- AC-013: Context pressure percentage, when shown, is based on latest per-call input tokens divided by the effective model context/input budget, not cumulative run input tokens.
- AC-014: Live UI totals do not naively sum cumulative snapshots as deltas. Either the server provides meter-delta/summary semantics in `TOKEN_USAGE_UPDATED`, or the Usage tab reconciles through ledger-backed run/team summary queries.
- AC-015: For one provider/runtime usage observation, frontend listeners and the ledger writer receive one enriched token usage event, not separate raw and enriched duplicates.
- AC-016: The v1 frontend Usage/Token Meter does not show cache or reasoning sections. Backend storage may still preserve cache/reasoning fields when reported for future use.
- AC-017: A native OpenAI-compatible response with provider details such as `prompt_tokens_details.cached_tokens` is persisted with raw usage JSON and does not lose that detail at `CompleteResponse.usage`.
- AC-018: A model with constructor/default zero pricing but no trusted catalog price produces token rows with null estimated cost and `price_missing`, not `$0 estimated`.
- AC-019: A team member token usage event persisted through the server contains root team run id, member agent run id, member route key/path, agent definition id, and workspace id where available.
- AC-020: Two cumulative snapshots for the same Codex thread/series, for example total `1000` then total `1400`, contribute accounting deltas `1000` then `400`; summaries and frontend totals do not show `2400`.

## Recommended First Storage Shape

Suggested table name:

- `llm_token_usage_events`, or
- `token_usage_ledger`.

Suggested minimum columns:

```text
id
usage_event_id
observed_at
persisted_at

run_id
turn_id
llm_call_id
call_sequence

root_team_run_id/null
team_run_path_json/null
member_path_json/null
member_route_key/null
member_agent_run_id/null
agent_definition_id
workspace_id/null
user_id/null
account_id/null

runtime_kind          -- autobyteus, codex_app_server, claude_agent_sdk, etc.
model_provider        -- OPENAI, ANTHROPIC, GEMINI, OLLAMA, etc.
model_identifier
model_value

ingestion_kind        -- optional internal bridge marker: autobyteus_llm_phase, codex_thread_token_usage, claude_sdk_result, etc.
usage_scope           -- per_call, per_turn, cumulative_snapshot
reported_input_tokens
reported_output_tokens
reported_total_tokens
accounting_input_tokens
accounting_output_tokens
accounting_total_tokens
cache_read_input_tokens/null
cache_creation_input_tokens/null
reasoning_output_tokens/null
billable_input_tokens/null
billable_output_tokens/null
snapshot_series_key/null
previous_snapshot_event_id/null
raw_usage_json
quality_flags_json

cost_basis             -- api_price_estimate
currency
input_price_per_million/null
output_price_per_million/null
cached_input_read_price_per_million/null
cached_input_write_price_per_million/null
pricing_source/null
pricing_status             -- trusted, missing, placeholder
pricing_snapshot_json/null
estimated_api_input_cost/null
estimated_api_standard_input_cost/null
estimated_api_cache_read_input_cost/null
estimated_api_cache_creation_input_cost/null
estimated_api_output_cost/null
estimated_api_reasoning_output_cost/null
estimated_api_total_cost/null
api_cost_status       -- estimated, price_missing, partial_price_missing
```

## Design Direction

Treat the ledger as the water/electricity meter. It records meter readings accurately. Everything else is a projection:

- run total,
- team run total,
- user/day/month total,
- model/provider cost breakdown,
- token budget remaining,
- context pressure/compaction transparency,
- task efficiency comparisons.


## Unified Collection Requirement

- REQ-013: Token usage collection must be runtime-neutral at the server boundary. AutoByteus, Codex, and Claude Agent SDK runtimes should all produce a normalized token usage observation before persistence.
- REQ-014: The normalized observation must preserve runtime source details and raw usage payloads instead of forcing all providers into only `input_tokens`, `output_tokens`, and `total_tokens`.
- REQ-015: AutoByteus runtime usage should be emitted as a token usage event for every LLM phase/model call using the richer native usage observation carried through `CompleteResponse`/stream response types, not only from final `ASSISTANT_COMPLETE` responses and not from an optional per-agent response processor as the authoritative path.
- REQ-016: Codex usage should be collected from the Codex thread-owned ready-turn usage boundary, not by parsing raw `thread/tokenUsage/updated` payloads in higher layers.
- REQ-017: Claude Agent SDK usage should be collected from terminal SDK result usage/modelUsage payloads when present.

- REQ-018: Native AutoByteus token usage must be emitted for every LLM phase/model call, including tool-intent responses and tool-continuation calls, not only final assistant responses.
- REQ-019: Each token usage event must include an idempotency key or equivalent source event key so persistence can safely de-duplicate retries or late runtime updates.
- REQ-020: Token cost calculation must be owned by the server token-usage subsystem, not by `autobyteus-ts` runtime token tracking.
- REQ-021: `autobyteus-ts` token usage output should be treated as token-count data only; existing cost fields in `TokenUsage` should be ignored or deprecated as authoritative accounting input.
- REQ-022: Remove, decommission, or demote `TokenUsageTracker` / `TokenUsageTrackingExtension` from the authoritative accounting path; if retained, it must be only an estimation/debug utility and not a ledger writer.
- REQ-023: Authoritative token counts must come only from provider/runtime-reported usage payloads; local token counting/estimation must not feed persisted accounting.
- REQ-024: When provider/runtime usage is absent, persist an explicit missing-usage state or quality flag rather than estimating tokens locally.
- REQ-025: Remove/decommission local token-count estimation code from the accounting path, including `BaseTokenCounter` usage for persisted token counts.
- REQ-026: Server token-usage must define or resolve token price configuration with separate input/output prices and optional cached-token prices.
- REQ-027: Estimated API cost calculation must run for any usage row whose model price resolves from the shared `autobyteus-ts` catalog, regardless of runtime kind.
- REQ-028: The first milestone must not classify real commercial arrangements for cost calculation. It always uses API price estimate as the product cost metric.
- REQ-029: Ledger rows must store the pricing snapshot used for any calculated estimated API cost so historical costs do not silently change when pricing config changes.
- REQ-030: The token price resolver must not duplicate the built-in model price registry. In v1, `TokenPriceConfigProvider` must delegate built-in model price lookup to an exported `autobyteus-ts` model pricing API; unmatched models are token-only and unpriced.
- REQ-031: Cost calculation must use explicit model identity (`runtime_kind`, `model_provider`, `model_identifier`/`model_value`) and shared model pricing; it must not depend on frontend-provided price data.
- REQ-032: If cached-token prices become supported, extend the shared `autobyteus-ts` `TokenPricingConfig` shape instead of introducing a separate server-only pricing model for built-in models.
- REQ-033: The first milestone should not introduce a duplicated server table/list of all built-in model prices; any future server overrides must be sparse exceptions and not required for Codex/Claude models already present in `autobyteus-ts`.
- REQ-034: Refresh the shared `autobyteus-ts` supported model registry for the user-directed current model set without making exact price completion a blocker.
- REQ-035: Unknown, unaudited, missing, or placeholder-zero model prices must not be treated as authoritative estimated cost; the ledger should persist token usage with `api_cost_status = price_missing` or an equivalent quality/status flag until a trusted price is configured.
- REQ-036: The shared model catalog refresh must preserve enough model identity (`name`, `value`, `canonicalName`, provider, metadata) for Codex/Claude/native runtime token usage rows to resolve to the correct catalog entry when possible.
- REQ-037: Server cost calculation must happen before frontend dispatch of `TOKEN_USAGE_UPDATED` when the price can be resolved, while DB persistence remains asynchronous/failure-isolated.
- REQ-038: The frontend must not calculate model price or cost locally. It formats server-provided token counts, cost fields, currency, and cost status only.
- REQ-039: Add a workspace Usage/Token Meter surface in the right-side tab set and a compact header chip that opens that tab.
- REQ-040: Usage UI must distinguish total consumed token/cost from current context pressure; context pressure must use latest per-call input tokens and effective model context budget.
- REQ-041: Team usage UI must support team total and focused/member breakdown by aggregating member agent-run ledger rows, not by treating the team itself as a direct LLM consumer.
- REQ-042: Live usage UI must receive server-shaped delta/summary semantics or reconcile through ledger-backed summary queries so `per_call`, `per_turn`, and `cumulative_snapshot` usage scopes are aggregated correctly.
- REQ-043: Token cost enrichment must be a pre-dispatch replacement/transform step, or equivalent, so the existing append-derived-events pipeline does not dispatch duplicate raw/enriched `TOKEN_USAGE_UPDATED` events.
- REQ-044: Backend ledger rows should preserve cache-related input token buckets when provider/runtime data reports them, but v1 frontend summaries/meters should focus only on input tokens, output tokens, total tokens, input cost, output cost, and total estimated cost. Cache cost/display is future scope and must not require a cache-price audit now.


## Architecture Review Round 1 Tightening Requirements

- REQ-045: Native AutoByteus provider adapters must preserve raw/provider-specific usage before `CompleteResponse`/stream payload normalization can lose it. The target `usage` shape must include normalized counts plus `raw_usage_json` and provider detail buckets when reported.
- REQ-046: `CompleteResponse`, `ChunkResponse`, assistant stream payload parsing, and native LLM phase emission must carry the richer usage observation type; the old prompt/completion/cost-only `TokenUsage` shape must not remain the accounting source.
- REQ-047: The shared `autobyteus-ts` model pricing API must return an explicit pricing trust contract (`trusted`, `missing`, or `placeholder`) and nullable price dimensions. Default zero values must be distinguishable from trusted zero prices.
- REQ-048: Server cost calculation may set `api_cost_status = estimated` only when the pricing contract is trusted for the token dimensions being priced. Otherwise costs remain null with `price_missing` or `partial_price_missing`.
- REQ-049: Token usage events and ledger rows must include canonical run/team identity supplied by server context owners: `run_id`, `root_team_run_id`, `member_agent_run_id`, `member_path`, `member_route_key`, `agent_definition_id`, and `workspace_id` when available.
- REQ-050: For team/member runs, `AgentRunConfig.memberTeamContext` is the canonical member identity source inside the member agent run; `TeamRunEvent`/team runtime context is the canonical root team/multiplexing source; websocket-only flattened fields are not enough for ledger ownership.
- REQ-051: Ledger rows must store reported token readings separately from server-computed accounting deltas. Summaries, live meter deltas, and costs must aggregate only accounting delta fields.
- REQ-052: The server must define one aggregation rule for all usage scopes: `per_call` and `per_turn` are direct deltas; `cumulative_snapshot` is first converted to a delta against the previous snapshot in the same series before projection/cost calculation.
- REQ-053: Codex `tokenUsage.last` must be modeled as `per_turn`. Codex `tokenUsage.total` fallback must be modeled as `cumulative_snapshot` with a snapshot series key and server delta conversion; it must never be summed as another per-turn delta directly.
