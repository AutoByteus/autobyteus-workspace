# Latest Token Usage Investigation Notes

## Refresh Context

- Requested refresh date: 2026-06-24.
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-transparency-analysis`.
- Branch: `codex/token-usage-transparency-analysis`.
- Base requested by user: latest `origin/personal`.
- Latest `origin/personal` after final fetch: `5bd521ba83e4a2df852be5e8914915959149137d` (`chore(release): bump workspace release version to 1.3.75`).
- Worktree `HEAD`: `5bd521ba83e4a2df852be5e8914915959149137d` after fast-forwarding the ticket branch.
- Prior ticket artifact folder was preserved when the worktree was reset earlier; current authoritative artifacts are under `tickets/done/token-usage-transparency-analysis/` in this dedicated worktree.

## Commands / Evidence Log

| Command / Source | Finding |
| --- | --- |
| `git fetch origin personal && git merge --ff-only origin/personal && git rev-parse origin/personal && git rev-parse HEAD` | Confirmed the ticket branch was fast-forwarded to latest `origin/personal` `5bd521ba83e4a2df852be5e8914915959149137d`. |
| `git status --short --branch` | Worktree branch is `codex/token-usage-transparency-analysis` tracking `origin/personal`; only ticket artifacts are untracked. |
| `autobyteus-ts/src/llm/utils/token-usage.ts` | `TokenUsage` remains normalized to `prompt_tokens`, `completion_tokens`, `total_tokens`, and optional nullable costs. |
| `autobyteus-ts/src/llm/api/*` | OpenAI-compatible, OpenAI Responses, Anthropic, Gemini, Mistral, Ollama, AutoByteus, Kimi, and GLM paths either map usage directly or inherit OpenAI-compatible mapping. |
| `autobyteus-ts/src/llm/api/openai-compatible-request-builder.ts` | Streaming sets `stream_options = { include_usage: true }`. |
| `autobyteus-ts/src/agent/loop/llm-phase.ts` | Final streaming chunk usage is assigned to `tokenUsage` and included in `CompleteResponse`; compaction uses the same usage after the response. |
| `autobyteus-ts/src/agent/loop/llm-phase-compaction.ts` | Compaction evaluates `tokenUsage.prompt_tokens` against the resolved input budget. |
| `autobyteus-ts/src/llm/utils/llm-config.ts` | `TokenPricingConfig` exists with input/output token pricing, defaulting to zero. |
| `autobyteus-ts/src/llm/supported-model-definitions.ts` | Many API model definitions include per-million input/output pricing through `pricing(...)`; local/provider-discovered models may have zero pricing. |
| `autobyteus-ts/src/llm/extensions/token-usage-tracking-extension.ts` | Extension can calculate token cost if a token counter factory is passed, but `BaseLLM` constructs it without the factory, so default runtime path leaves it disabled. |
| `autobyteus-server-ts/src/agent-customization/processors/persistence/token-usage-persistence-processor.ts` | Optional response processor writes usage through `TokenUsageStore`; `isMandatory()` returns false. |
| `autobyteus-server-ts/src/token-usage/**` | Current SQL-backed token usage store/repository writes old role-split records and aggregates them by model/role. |
| `autobyteus-server-ts/prisma/schema.prisma` | `TokenUsageRecord` maps to `token_usage_records` with `runId` mapped as `agent_id`, `role`, `token_count`, `cost`, `created_at`, and `llm_model`. |
| `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread-token-usage.ts` | Codex token updates parse `tokenUsage.last` first, falling back to `tokenUsage.total`, into normalized `TokenUsage` with null costs. |
| `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread.ts` | Codex thread tracks pending/ready turn token usage in memory. |
| `autobyteus-server-ts/src/agent-execution/backends/codex/backend/codex-agent-run-backend.ts` | Current backend dispatches converted events only; it does not call `getReadyTurnTokenUsages()` or `TokenUsageStore`. |
| `autobyteus-server-ts/tests/e2e/runtime/token-usage-runtime-graphql.e2e.test.ts` | Still skipped with comment: Codex runtime no longer persists token usage into AutoByteus statistics. |
| `git show 764003448...` | Historical Codex persistence path instantiated `TokenUsageStore`, serialized app-server event handling, called `persistReadyTurnTokenUsages()`, and wrote old role-split records. |
| `git show c9aeee3...` | Later commit removed most of that Codex persistence path while investigating stream stalls, leaving the E2E skipped. |
| `autobyteus-server-ts/src/agent-execution/backends/claude/events/claude-session-event-converter.ts` | Claude Agent SDK events can produce provider compaction boundary telemetry with `pre_tokens`, but not complete usage accounting. |
| `autobyteus-web/services/agentStreaming/protocol/messageTypes.ts` | Frontend stream protocol types include optional `AssistantCompletePayload.usage`. |
| `autobyteus-web/services/agentStreaming/handlers/agentStatusHandler.ts` | `handleAssistantComplete` ignores usage and only marks conversation complete. |
| `autobyteus-web/types/conversation.ts` and `AgentConversationFeed.vue` | Message-level token/cost fields and rendering exist, but current streaming flow does not populate them. |
| `autobyteus-web/components/settings/TokenUsageStatistics.vue` and `stores/tokenUsageStatistics.ts` | Settings aggregate token usage dashboard still exists and queries `usageStatisticsInPeriod`. |
| `autobyteus-server-ts/src/agent-memory/services/runtime-memory-event-accumulator.ts` | Runtime memory records assistant/user/reasoning/tool/compaction traces, not general token usage. |

## Current Token Semantics

For normal LLM APIs, provider usage is for the specific API call that just completed.

- `prompt_tokens` / `input_tokens`: all tokens sent in the request prompt for that call.
- `completion_tokens` / `output_tokens`: tokens generated by the model for that response.
- `total_tokens`: usually input plus output for that call.

This is not cumulative conversation usage. However, because every later request may resend conversation history, the same historical text can be billed again as prompt tokens in a later call. Therefore, summing per-call token usage is correct for cost/accounting even though it is not a count of unique conversation text.

Streaming usage usually arrives at the end. Current `BaseLLM.streamMessages()` keeps the final complete chunk usage and `LlmPhase` forwards that into `CompleteResponse`.

Provider caveats:

- OpenAI-compatible streaming asks for included usage and maps final `chunk.usage`.
- OpenAI Responses maps `input_tokens`/`output_tokens`/`total_tokens`.
- Gemini maps `usageMetadata.promptTokenCount`/`candidatesTokenCount`/`totalTokenCount`.
- Anthropic non-streaming maps input/output usage correctly; Anthropic streaming currently emits usage from `message_delta` with `prompt_tokens: 0` because the code does not capture input tokens from the start event. This is a data-quality issue for any storage-first MVP.
- AutoByteus provider defaults missing token fields to `0`, which can create misleading zero-usage records.
- Current normalized shape drops provider-specific details such as cached tokens, reasoning tokens, and prompt token details.

## Current Storage Behavior

### Existing table

Current durable storage is the old table:

```text
token_usage_records
```

Prisma model fields:

```text
id
usage_record_id
agent_id          -- mapped to runId in Prisma domain
token_count
role              -- user or assistant
cost
created_at
llm_model
```

### Existing writer

`TokenUsagePersistenceProcessor` calls:

```text
TokenUsageStore.createConversationTokenUsageRecords(runId, usage, llmModel)
```

The store writes two records:

- role `user`: `usage.prompt_tokens`, `usage.prompt_cost ?? 0`
- role `assistant`: `usage.completion_tokens`, `usage.completion_cost ?? 0`

This means unknown cost currently becomes `0`, which is not the same as known zero cost.

### Activation gap

`TokenUsagePersistenceProcessor.isMandatory()` returns false. The processor only runs if agent configuration includes it in `llmResponseProcessorNames`. Built-in inspected agent templates do not include it by default.

### Missing business/audit fields

The current table cannot reliably answer token transparency questions because it lacks:

- `turn_id`
- `llm_call_id` / call sequence
- `team_run_id` / member run identity
- runtime kind (`autobyteus`, `codex_app_server`, `claude_agent_sdk`)
- provider
- model identifier vs model display/value distinction
- raw provider usage JSON
- usage source and usage scope
- pricing source, version, currency, and price snapshot
- API cost estimate status (`estimated`, `price_missing`, etc.)
- provider-specific usage fields such as cached/reasoning/billable tokens
- data quality flags

## Runtime-Specific Findings

### AutoByteus LLM runtime

- Can receive provider usage in `CompleteResponse`.
- Optional processor can persist it only for configured agents.
- Cost is usually null unless the disabled token tracking extension or some provider path fills it.
- Compaction already uses usage for context pressure decisions but does not make it a durable business ledger.

### Codex App Server runtime

- Token updates are parsed from `thread/tokenUsage/updated`.
- Resolver uses `tokenUsage.last` and falls back to `tokenUsage.total`.
- Parsed usage is stored in `CodexThread` in memory and can become ready for persistence when the turn completes/idles.
- Current backend does not persist those ready usages.
- Current event converter intentionally returns no user-facing event for raw token telemetry.
- Historical implementation in `764003448...` persisted ready Codex usage through the old `TokenUsageStore`; removal in `c9aeee3...` suggests any new design must be failure-isolated from event dispatch and streaming.

### Claude Agent SDK runtime

- Runtime kind exists as `claude_agent_sdk`.
- Current scan found compaction boundary telemetry with `pre_tokens`, not complete per-response token usage accounting.
- Claude Agent SDK usage should be metered for transparency when SDK result usage/modelUsage is available.

## Frontend / Historical Display Findings

- `ASSISTANT_COMPLETE` payload types allow `usage`.
- The frontend handler ignores the field.
- Conversation messages have optional `promptTokens`, `promptCost`, `completionTokens`, and `completionCost`, and the feed can render them if set.
- Existing settings page can query aggregate usage, but the backing old table is sparse and lossy.
- Run memory/history captures compaction boundaries and trace content, but not token usage as a business ledger.

## Business Cost Simplification

The refined v1 cost model uses one product metric: estimated API price.

- Token counts remain the original statistics.
- When the model exists in the shared `autobyteus-ts` price catalog, token counts are multiplied by the model's API input/output prices.
- The result is stored as `estimated_api_*` with `cost_basis = api_price_estimate`.
- The system does not attempt to classify the real commercial arrangement behind a runtime in the first milestone.
- This creates one transparent, comparable cost meter across AutoByteus, Codex, and Claude Agent SDK runs.


## Refined Storage Placement Rationale

The user clarified that the first version should not store many derived business fields. The storage should reflect the real token events correctly. The refined decision is that token usage belongs to a server-side ledger anchored by agent run identity. The agent run is the fundamental consumer, while team run totals and user/account totals are derived aggregates.

This avoids making mutable run totals authoritative and preserves enough detail to audit individual calls, model pricing, source runtime, and future corrections.

## Storage Recommendation

Build a server-owned append-only token usage ledger first. It should be the source of truth. Settings dashboards, run/task summaries, user budgets, team budgets, context pressure visualizations, and cost allocation are projections.

The ledger should record meter readings with raw payloads and explicit scope. Do not store only aggregated totals; do not use the old role-split table as the long-term business model; do not use frontend state or memory traces as authoritative accounting.


## Unified Token-Count Collection Mechanism Investigation — 2026-06-24

### Current AutoByteus runtime path

- `autobyteus-ts/src/agent/loop/llm-phase.ts` collects provider usage from the final streaming chunk and stores it in `CompleteResponse.usage`.
- `autobyteus-ts/src/agent/pipelines/llm-response-pipeline.ts` emits `AGENT_DATA_ASSISTANT_COMPLETE_RESPONSE` after optional response processors run, and the server maps that to `AgentRunEventType.ASSISTANT_COMPLETE`.
- That final assistant-complete event can carry usage for final responses, but it is not sufficient as the authoritative accounting boundary because tool-heavy turns have non-final LLM phases.
- Current persistence bypasses the server event boundary and instead uses optional per-agent `TokenUsagePersistenceProcessor` inside `autobyteus-ts`. This is not unified across runtimes and does not cover every runtime.
- Target native path: emit `TOKEN_USAGE_UPDATED` from each `LlmPhase` / model call when `CompleteResponse.usage` exists, then map that native stream event into the server `AgentRunEvent` pipeline.

### Current Codex runtime path

- Local source: `autobyteus-server-ts/src/agent-execution/backends/codex/events/codex-thread-event-name.ts` defines `THREAD_TOKEN_USAGE_UPDATED = "thread/tokenUsage/updated"`.
- `codex-thread-notification-handler.ts` parses token updates and calls `codexThread.recordTurnTokenUsage(turnId, usage)`.
- `codex-thread.ts` keeps pending/ready token usage by turn.
- `codex-thread-lifecycle-event-converter.ts` returns `[]` for `THREAD_TOKEN_USAGE_UPDATED`, so no normalized server event reaches the event pipeline today.
- `codex-agent-run-backend.ts` currently only converts and dispatches runtime events; it does not persist ready token usages.
- Local design doc `autobyteus-server-ts/docs/design/codex_raw_event_mapping.md` says `thread/tokenUsage/updated` should be treated as a thread-state update and ready per-turn usage should be persisted from the thread boundary, not by higher layers parsing raw payloads.
- Official OpenAI Codex App Server docs inspected on 2026-06-24 document `account/usage/read` for ChatGPT token-activity summaries and daily buckets, but the public page did not surface a per-thread `thread/tokenUsage/updated` schema. Therefore, the current per-turn Codex signal is a local/runtime-observed contract and must keep raw-payload capture plus quality flags.

### Current Claude Agent SDK runtime path

- Current AutoByteus Claude session iterates SDK query chunks in `claude-session.ts` and emits normalized lifecycle/segment/tool/compaction events.
- `claude-session-output-events.ts` treats chunks with `type: "result"` as terminal.
- Current `claude-session-event-converter.ts` maps compaction `pre_tokens`, but does not emit token-usage events from SDK result `usage` or `modelUsage`.
- Official Claude Agent SDK TypeScript docs state that `SDKResultMessage` includes `total_cost_usd`, `usage`, and `modelUsage`, and that `Usage` includes `input_tokens`, `output_tokens`, `cache_creation_input_tokens`, `cache_read_input_tokens`, cache_creation details, server_tool_use, service tier, speed, inference geo, and iterations.
- Official Claude Agent SDK Python docs similarly describe result `usage` and `model_usage` keys including input/output/cache tokens and client-side estimated cost.
- Therefore, Claude should use the SDK terminal `result` message as the authoritative token usage event source, with optional per-model breakdown from `modelUsage`.

### External docs consulted

- OpenAI API Chat Completions streaming events: `usage` appears when `stream_options.include_usage = true`, is null except final chunk, and may be absent if interrupted.
- OpenAI token counting guide: input token count endpoint can count the exact model input for Responses-format payloads; output token usage includes generated non-visible tokens.
- OpenAI Codex App Server docs: `account/usage/read` returns account-level lifetime/peak/daily token fields, not per-run ledger-ready data.
- Claude Agent SDK TypeScript docs: result messages include `usage`, `modelUsage`, and client-side estimated cost.
- Claude Agent SDK Python docs: result usage/model_usage contain input/output/cache tokens and model-level costUSD.
- Claude Code monitoring docs: OTel telemetry exists for org monitoring, but SDK result usage is the better in-process per-run source for AutoByteus ledger rows.

### Mechanism recommendation

Use a unified server-side `TOKEN_USAGE_UPDATED` normalized event, or equivalent internal telemetry event, as the collection boundary across runtimes.

- AutoByteus runtime derives it from each `LlmPhase` result / `CompleteResponse.usage`, including tool-intent and continuation model calls.
- Codex runtime derives it from `CodexThread.getReadyTurnTokenUsages()` after thread-level readiness, preserving raw `thread/tokenUsage/updated` payload and scope.
- Claude Agent SDK derives it from terminal SDK `result.usage` and `result.modelUsage`.

A `TokenUsageEventPersistenceProcessor` in the server `AgentRunEventPipeline` should persist ledger rows from those normalized events. This makes token persistence mandatory and runtime-neutral without relying on optional agent response processors.



### Native AutoByteus multi-phase caveat

Further source review of `autobyteus-ts/src/agent/loop/agent-turn-runner.ts` shows that `LLMResponsePipeline.processFinalResponse(...)` only runs for final LLM outcomes. When `LlmPhase` returns `tool_invocations`, the turn runner executes tools and loops without emitting the final-response pipeline for that model call. Therefore, deriving token accounting only from `ASSISTANT_COMPLETE` would undercount tool-heavy turns.

Design implication: native AutoByteus must emit `TOKEN_USAGE_UPDATED` directly from the LLM phase/turn loop for every model call that returns usage, with a per-turn call sequence/id. `ASSISTANT_COMPLETE` can still carry usage for UI convenience, but it must not be the authoritative accounting source for all native model calls.

### Provider terminology refinement

`provider` should be split into explicit fields:

- `runtime_kind`: the AutoByteus runtime harness (`autobyteus`, `codex_app_server`, `claude_agent_sdk`).
- `model_provider`: the model/vendor family when known (`OPENAI`, `ANTHROPIC`, `GEMINI`, etc.).
- `ingestion_kind`: optional internal audit/debug hint for the runtime bridge that produced the observation (`autobyteus_llm_phase`, `codex_thread_token_usage`, `claude_sdk_result`); not a business metric.
- `cost_basis`: cost interpretation for calculated cost. In v1 this is `api_price_estimate`.

This avoids overloading one `provider` field with runtime and vendor semantics.


## autobyteus-ts Token Management Simplification Analysis — 2026-06-24

Reviewed files:

- `autobyteus-ts/src/llm/utils/token-usage-tracker.ts`
- `autobyteus-ts/src/llm/extensions/token-usage-tracking-extension.ts`
- `autobyteus-ts/src/llm/token-counter/base-token-counter.ts`
- `autobyteus-ts/src/llm/base.ts`
- related token tracker tests

Findings:

- `TokenUsageTracker` combines token counting, cost calculation, in-memory usage history, and aggregation.
- `TokenUsageTrackingExtension` can overwrite provider usage with response usage, estimate output tokens when response usage is absent, then calculate costs from `model.defaultConfig.pricingConfig`.
- `BaseLLM` auto-registers `TokenUsageTrackingExtension`, but constructs it without a token counter factory, so `isEnabled` is false in the default runtime path.
- The only direct server persistence path reads `response.usage` cost fields, but provider usage mappers generally set costs to null, and the old store coerces missing cost to `0`.
- The current tracker design is not a reliable accounting path and duplicates responsibilities that should belong to server-side token usage management.

Design implication:

- `autobyteus-ts` should surface provider-reported token counts and model/runtime identity.
- Server-side `token-usage` should own estimated API cost calculation from normalized token counts + shared model pricing.
- Local token counters should not be used as authoritative accounting in the first storage milestone. If a provider lacks usage, store a partial/missing-usage record or quality flag rather than fabricating accountable tokens from local estimation.
- Cost fields in the shared `TokenUsage` type should be treated as legacy/non-authoritative and removed from the authoritative accounting path as part of the clean-cut ledger migration.


## No Local Token Estimation Decision — 2026-06-24

User clarified that AutoByteus should not calculate or estimate authoritative token counts itself. This aligns with the code findings: provider/runtime APIs already return token usage in the paths we care about, and local estimation code is disabled/incomplete.

Design implication:

- Remove local token estimation from the persisted accounting path.
- Use only provider/runtime-reported token usage for `TOKEN_USAGE_UPDATED`.
- If usage is missing, mark the row/event as missing/unknown or log/skip explicitly; do not fabricate token counts.
- `BaseTokenCounter`, `TokenUsageTracker`, and `TokenUsageTrackingExtension` should not be part of durable token accounting.



## API Price Estimate Simplification — 2026-06-24

The user simplified the cost requirement further: the platform should always calculate cost as an API price estimate when the model price is known. We do not need to classify whether a run was actually paid through API keys or another commercial arrangement.

Corrected target:

- Token usage payloads report token counts, not commercial terms.
- `runtime_kind` tells us how the agent executed, not how it was paid for.
- For v1, do not introduce a real-payment classifier.
- `TokenPriceConfigProvider` resolves model API prices from the shared `autobyteus-ts` catalog.
- `TokenCostCalculator` always calculates `estimated_api_*` cost when price is found.
- If price is not found, persist token usage with `api_cost_status = price_missing` and null cost fields.

## Token Price Configuration Analysis — 2026-06-24

Current code:

- `autobyteus-ts/src/llm/utils/llm-config.ts` defines `TokenPricingConfig` with only `inputTokenPricing` and `outputTokenPricing`.
- `autobyteus-ts/src/llm/supported-model-definitions.ts` seeds many API models with per-million input/output prices through `LLMConfig({ pricingConfig: ... })`.
- `LLMModel.toModelInfo()` exposes model/provider/runtime/context metadata, but it does not currently expose pricing. Add a server-consumable pricing lookup rather than exposing prices by accident through unrelated frontend model-list APIs.
- `AgentRunConfig` already carries `llmModelIdentifier` and `runtimeKind`, so token usage events can carry enough model/runtime identity for server price lookup.
- Codex model normalization maps Codex model rows to `provider_type: OPENAI` and `model_identifier`; Claude model normalization maps SDK models to `provider_type: ANTHROPIC` and `model_identifier`.
- Server token usage code does not calculate cost from model pricing. The old store only persists `response.usage.prompt_cost` and `completion_cost`, defaulting missing costs to `0`.
- There is no current server-side token price config registry/table and no cached-token price dimensions.

Historical note:

- Commit `764003448a47578c671875701b65006e260c5a25` had Codex backend direct persistence via `TokenUsageStore.createConversationTokenUsageRecords(...)` for ready turn usages.
- Commit `c9aeee3a0d1fb63d6a09d0b7750b2f4620478b36` removed that direct/awaited Codex persistence path during Codex stream-stall investigation. New design should not reintroduce blocking runtime-backend SQL writes.

Design implication:

- Keep token counts as the original statistics.
- Add a server-owned `TokenPriceConfigProvider` as the only dependency of `TokenCostCalculator`, but do not make it a duplicate built-in price registry.
- Built-in price lookup should delegate to the existing `autobyteus-ts` model catalog through a new explicit API such as `LLMFactory.getModelPricingInfo(...)`. Current server code already imports `LLMFactory` for model listing, so this is feasible.
- For v1, unmatched Codex/Claude/native models should simply be stored as token-only with `api_cost_status = price_missing`; no duplicate server price list is needed for legacy or unsupported model names.
- Future server override/config/table rows, if added, should be sparse exceptions for custom endpoints, emergency corrections, or enterprise/local prices, not the normal built-in model price source.
- Expand pricing dimensions to support cached input read/write prices when available, but do not block first storage on perfect provider-specific pricing.
- Calculate estimated API cost for every usage row with available shared model price config, and store the price snapshot used.

## Supported Model Registry Refresh — User-Directed 2026-06-24

Scope requested by user: refresh the supported model registry while deferring exact price cleanup. Price accuracy is useful, but it must not block the first token-usage-storage milestone because token capture and durable storage still work when a model has no trusted price. Mistral remains explicitly excluded from this model/pricing audit.

Delegated research note: subagent `019efa5a-55cc-7863-94e4-28a8eb6b198c` was spawned for official price/model collection, then shut down at the user's request before completion. Pricing research is now deferred; the implementation should not wait on that subagent or on complete price data.

Current code source inspected: `autobyteus-ts/src/llm/supported-model-definitions.ts`, `autobyteus-ts/src/llm/metadata/curated-model-metadata.ts`, and provider default classes under `autobyteus-ts/src/llm/api/`.

Official/current-model evidence collected before price deferral:

| Provider | Official/current evidence | Design implication |
| --- | --- | --- |
| OpenAI | OpenAI model docs list `gpt-5.5` and mention `gpt-5.4`, `gpt-5.4-mini`, and `gpt-5.4-nano` as current frontier/lower-cost choices. Sources: `https://developers.openai.com/api/docs/models`, `https://developers.openai.com/api/docs/models/gpt-5.5`. | Current `gpt-5.5`, `gpt-5.4`, `gpt-5.4-mini` stay. Add `gpt-5.4-nano` if the product wants the low-cost OpenAI option. |
| Anthropic | Anthropic model overview lists Claude Opus 4.8 with API ID/alias `claude-opus-4-8`, Claude Sonnet 4.6 with API ID/alias `claude-sonnet-4-6`, and Claude Haiku 4.5. Sources: `https://docs.anthropic.com/en/docs/about-claude/models/overview`, `https://docs.anthropic.com/en/docs/about-claude/models/migrating-to-claude-4`. | Add `claude-opus-4.8` (`value: claude-opus-4-8`). Remove `claude-haiku-4.5` per user request. Remove old `claude-opus-4.6` from the default supported list unless there is a known deployment dependency. Keep `claude-opus-4.7` and `claude-sonnet-4.6`. Do not invent a `claude-sonnet-4.8` row unless official docs list it. |
| Gemini | Google Gemini docs list `gemini-3.5-flash`; model guide still covers `gemini-3.1-pro-preview` and `gemini-3-flash-preview` families. Sources: `https://ai.google.dev/gemini-api/docs/models`, `https://ai.google.dev/gemini-api/docs/models/gemini-3.5-flash`, `https://ai.google.dev/gemini-api/docs/changelog`. | Current Gemini registry is broadly current. Keep `gemini-3.5-flash`, `gemini-3.1-pro-preview`, and `gemini-3-flash-preview` unless product wants to add `gemini-3.1-flash-lite-preview` later. |
| Kimi | Moonshot/Kimi docs list `kimi-k2.6`, `kimi-k2.7-code`, and high-speed `kimi-k2.7-code-highspeed`; K2.7 Code always thinks. Sources: `https://platform.moonshot.ai/docs/overview`, `https://platform.moonshot.ai/docs/guide/use-kimi-k2-thinking-model`, `https://platform.moonshot.ai/docs/guide/agent-support`. | Current Kimi base models stay. Add `kimi-k2.7-code-highspeed` if the product wants the high-speed coding option. |
| Qwen | Alibaba Model Studio current model page lists `qwen3.7-max`, `qwen3.7-plus`, and `qwen3.6-flash`; several coding-tool docs use `qwen3.7-max`. Sources: `https://help.aliyun.com/zh/model-studio/models`, `https://help.aliyun.com/en/model-studio/cline`, `https://help.aliyun.com/en/model-studio/partial-mode`. | Add/replace with `qwen3.7-max` as the current Qwen flagship. Keep `qwen3-max` only if existing deployments still depend on it; otherwise remove from the default supported list during the refresh. |
| GLM | Zhipu/BigModel docs list `glm-5.2` as the latest flagship and API enum default. Sources: `https://docs.bigmodel.cn/cn/guide/models/text/glm-5.2`, `https://docs.bigmodel.cn/api-reference/模型-api/对话补全`. | Current `glm-5.2` stays. |
| MiniMax | MiniMax official platform/docs list `MiniMax-M3` as the new M-series model with 1M context; API request enum includes `MiniMax-M3`. Sources: `https://www.minimax.io/`, `https://platform.minimaxi.com/docs/api-reference/api-overview`, `https://platform.minimaxi.com/docs/api-reference/text-post`. | Add `minimax-m3` (`value: MiniMax-M3`) and make provider default/current choice. Keep `minimax-m2.7` only if still useful for compatibility/cost choice; it is still listed by MiniMax but is no longer the newest model. |
| Grok / xAI | xAI docs recommend Grok 4.3 for chat/general use and Grok Build 0.1 for coding. Sources: `https://docs.x.ai/developers/models`, `https://docs.x.ai/developers/models/grok-4.3`, `https://docs.x.ai/developers/models/grok-code-fast-1`. | Replace old `grok-4-1-fast-reasoning` with `grok-4.3`; replace old `grok-code-fast-1` with `grok-build-0.1`. |

Recommended concrete registry update for this ticket:

| Provider | Add | Keep | Remove / de-prioritize | Price handling for now |
| --- | --- | --- | --- | --- |
| OpenAI | optional `gpt-5.4-nano` | `gpt-5.5`, `gpt-5.4`, `gpt-5.4-mini` | none | Existing prices may stay; missing new price can be omitted/null/placeholder until user supplies it. |
| Anthropic | `claude-opus-4.8` (`claude-opus-4-8`) | `claude-opus-4.7`, `claude-sonnet-4.6` | `claude-haiku-4.5`, old `claude-opus-4.6` | Price may be copied from currently trusted same-tier config or left missing; exact audit deferred. |
| Gemini | none required | current Gemini rows | none | Existing prices may stay. |
| Kimi | optional `kimi-k2.7-code-highspeed` | `kimi-k2.6`, `kimi-k2.7-code` | none | Kimi prices can remain absent for now. |
| Qwen | `qwen3.7-max` | optional `qwen3-max` only if needed | old `qwen3-max` can be de-prioritized | Exact price deferred. |
| GLM | none | `glm-5.2` | none | Existing price may stay until audited. |
| MiniMax | `minimax-m3` (`MiniMax-M3`) | optional `minimax-m2.7` | old `minimax-m2.7` can be de-prioritized | Exact price deferred. |
| Grok | `grok-4.3`, `grok-build-0.1` | none of old Grok names as primary | `grok-4-1-fast-reasoning`, `grok-code-fast-1` | Exact price deferred. |

Pricing deferral rule: do not block model registry refresh on price completeness. Prefer missing/nullable pricing or an explicitly untrusted placeholder over silently treating unknown cost as authoritative zero. If implementation temporarily uses `0` because the existing `TokenPricingConfig` defaults to zero, the server price resolver must be able to classify such rows as `price_missing` or `placeholder_price` rather than `estimated` so future cost transparency remains honest.

Reasoning/thinking token design requirement remains: thinking/reasoning tokens are part of billable model work when providers report them as billed output/completion tokens. Implementation must preserve `reasoning_output_tokens`; when providers include reasoning tokens inside output/total tokens, the calculator must avoid double-counting. If providers report reasoning tokens separately and not included in output tokens, ledger normalization must define billable output explicitly (for example `billable_output_tokens = output_tokens + reasoning_output_tokens`) only for those provider formats.

## Frontend Token Transparency Placement Investigation — 2026-06-24

User question: where should token/cost transparency be shown, and when should price be calculated?

Current frontend/code evidence:

| File / Surface | Finding | Design implication |
| --- | --- | --- |
| `autobyteus-web/components/layout/RightSideTabs.vue` | Desktop right panel currently owns tab shell for `files`, `teamMembers`, `terminal`, `vnc`, `artifacts`, `browser`, and `progress`. The tab content shell is clipped/isolated and has tests for tab behavior. | A new `usage`/`meter` tab fits this existing right-panel extension point without disturbing center conversation layout. |
| `autobyteus-web/composables/useRightSideTabs.ts` | Tab list is centralized as `TabName` union plus `allTabs`/`visibleTabs`; selection type controls team-only visibility. | Add `usage` to this composable as an explicit tab; do not scatter tab registration. |
| `autobyteus-web/components/progress/ProgressPanel.vue` and `ActivityFeed.vue` | Activity tab currently owns To-Do plus tool/compaction activity history. | Do not overload Activity with token accounting. Usage/cost is a meter/accounting concern, not an activity log. |
| `autobyteus-web/components/settings/TokenUsageStatistics.vue` | Existing settings page shows date-range aggregate token/cost table and chart. It uses old `usageStatisticsInPeriod`; labels currently render euro symbols. | Settings page is global historical analytics, not run-level live transparency. It should later read ledger projections and use the ledger currency, but it is not the primary v1 live placement. |
| `autobyteus-web/stores/tokenUsageStatistics.ts` and `graphql/queries/token_usage_statistics_queries.ts` | Current aggregate store queries old `UsageStatistics` by date range and model only. | Keep/upgrade as a historical projection after ledger exists; do not make it the source for live run usage. |
| `autobyteus-web/types/conversation.ts` | Conversation message types include optional `promptTokens`, `promptCost`, `completionTokens`, `completionCost`. | Existing message fields must not be the authoritative meter. Tool loops and multiple LLM calls do not map cleanly to one assistant message. |
| `autobyteus-web/components/workspace/agent/AgentConversationFeed.vue` | The feed already has optional inline token/cost display and a total footer, but it only reads message fields; current streaming handler does not populate those fields. | Do not use this as the primary transparency surface. If kept, it must become a secondary projection from ledger/event data, not independent message accounting. |
| `autobyteus-web/services/agentStreaming/protocol/messageTypes.ts` and `handlers/agentStatusHandler.ts` | `ASSISTANT_COMPLETE.usage` exists in type shape, but `handleAssistantComplete` ignores it. No `TOKEN_USAGE_UPDATED` message type exists yet. | Add an explicit streaming message type and handler for usage events instead of hiding usage inside assistant completion. |
| `autobyteus-web/services/agentStreaming/AgentStreamingService.ts` and `TeamStreamingService.ts` | Both single-agent and team streams dispatch typed messages to handlers. Team dispatch resolves member context before applying member-scoped events. | Add `TOKEN_USAGE_UPDATED` dispatch in both paths. For teams, route member usage to the member run context and also aggregate under the team run summary store. |
| `autobyteus-web/types/agent/AgentContext.ts` and `AgentTeamContext.ts` | Active run/member state is already available by run id; team context has `teamRunId`, member route keys, and leaf member contexts. | A frontend `tokenUsageMeterStore` can key live state by agent run id and by team run id without changing conversation state ownership. |
| `autobyteus-web/stores/llmProviderConfig.ts` and server `llm-provider.ts` GraphQL types | Model metadata already exposes `maxContextTokens`, `activeContextTokens`, `maxInputTokens`, and `maxOutputTokens`. | Context percentage should use latest per-call input tokens divided by active/effective model context budget when known. |
| `autobyteus-server-ts/src/agent-execution/events/agent-run-event-pipeline.ts` and `dispatch-processed-agent-run-events.ts` | The server event pipeline processes events before dispatching final events to listeners/websocket. Processors can derive extra events; all final events are dispatched after processing. | Cost enrichment should happen before frontend dispatch if the UI should show estimated cost live. Slow DB persistence should remain queued/failure-isolated. |
| `autobyteus-server-ts/src/token-usage/providers/statistics-provider.ts` | Current statistics provider aggregates old role-split rows and sums cost values. | Replace/upgrade with ledger-backed run/team/global projections instead of extending old role-split semantics. |

### Display placement decision

Recommended v1 product placement:

1. **Primary live placement: new right-side `Usage` / `Token Meter` tab.**
   - Shows active agent run usage when a standalone agent is selected.
   - Shows focused member usage plus team total/member breakdown when a team is selected.
   - Does not auto-switch or steal focus when new usage arrives.
2. **Compact always-visible header chip.**
   - Add a small token/cost chip near the agent/team status in the center header.
   - Example content: `28.4k tok · $0.12 · 42% ctx`.
   - Clicking the chip opens the right-side Usage tab.
   - This solves transparency without forcing the user to keep the Usage tab open.
3. **Settings page remains global historical analytics.**
   - Rewire it later to ledger-backed daily/model/user projections.
   - Use ledger currency (`USD` unless configured), not a hard-coded euro sign.
4. **Conversation inline token/cost stays secondary or is disabled until backed by ledger.**
   - Message-level display cannot be authoritative because one user-visible turn can include multiple LLM calls.

### When price should be calculated

Recommended v1 calculation timing:

- Calculate estimated API cost **on the server before the `TOKEN_USAGE_UPDATED` event is dispatched to frontend listeners**, using the token-usage subsystem's price resolver and cost calculator.
- Persist the already-enriched token usage event asynchronously/idempotently into the ledger.
- Do not calculate price on the frontend.
- Do not wait for DB write completion before streaming the event to the frontend.

Rationale:

- The user wants live transparency; if the frontend receives only raw tokens and waits for a later historical query, live cost is laggy or inconsistent.
- Price lookup from the shared model catalog is local/config-based and cheap; DB persistence is the slow/failure-prone part that should be isolated.
- The same cost snapshot must be stored in the ledger so historical reload shows the same estimate the live UI showed.
- If price is missing/placeholder, the server sends `api_cost_status = price_missing` and null cost, and the frontend shows unpriced tokens rather than `$0`.

### Token meter semantics

The token meter needs two different metrics that should not be confused:

- **Total consumed tokens/cost:** sum of ledger/event rows for the run/team. This is the money meter.
- **Context pressure percentage:** latest observed per-call input tokens divided by the effective model input/context budget. This is the compaction-pressure meter.

For context pressure, use:

```text
effective_context_budget = activeContextTokens || maxInputTokens || maxContextTokens
context_pressure_percent = latest_per_call_input_tokens / effective_context_budget
```

If model budget is unknown, show token counts and mark context percentage as unavailable. Do not use cumulative input tokens for context pressure, because cumulative input tokens are cost history while compaction depends on the current prompt/context size.

## Final Base Refresh — 2026-06-24

After the prior design pass, `origin/personal` advanced again. I ran `git fetch origin personal` and fast-forwarded the ticket branch with `git merge --ff-only origin/personal`. Current base is `5bd521ba83e4a2df852be5e8914915959149137d` (`chore(release): bump workspace release version to 1.3.75`). The untracked token-usage artifact folder remained intact. The upstream delta is release/version and completed-ticket/self-evolution work; the frontend placement and token-accounting conclusions were rechecked against current files such as `RightSideTabs.vue`, `useRightSideTabs.ts`, `AgentWorkspaceView.vue`, `TeamWorkspaceView.vue`, stream handlers, settings statistics, and the event pipeline.

## Event Pipeline Enrichment Constraint — 2026-06-24

Additional current-code check:

- `autobyteus-server-ts/src/agent-execution/events/agent-run-event-pipeline.ts` initializes `accumulated` with source events, then each `AgentRunEventProcessor` returns derived events that are appended to `accumulated`.
- `dispatch-processed-agent-run-events.ts` dispatches every event returned by the pipeline.
- Therefore, token cost enrichment cannot safely be implemented as a normal derived event with the same `TOKEN_USAGE_UPDATED` type unless the raw event is hidden/suppressed elsewhere; otherwise listeners would receive both raw and enriched copies.

Design implication: add a pre-dispatch transformer/enricher phase, or update the pipeline contract to support replacing/enriching existing events before final dispatch. The target flow is one enriched `TOKEN_USAGE_UPDATED` per usage observation reaching websocket listeners and the ledger writer.

## Token Meter Field Simplification — 2026-06-24

User feedback: the token meter should be simple and focus on what has been consumed so far. Design refinement:

- Primary meter fields: total consumed input tokens, output tokens, total tokens, input token cost, output token cost, and total estimated API cost.
- Cache data is meaningful when provider/runtime reports it because cache-read and cache-creation/cache-write input tokens may be priced differently from standard input tokens. User explicitly decided to skip cache display on the v1 frontend. Preserve backend cache fields when available, but do not require frontend cache display or a cache-price audit before shipping the first token meter.
- Reasoning/thinking tokens can be meaningful and billable, but user explicitly chose to skip reasoning display in v1. Preserve backend fields for future work; do not show a reasoning section in the first frontend meter.
- Context pressure remains useful for compaction transparency, but it is secondary to the token/cost meter and should not crowd the first version.

## Design Principles Completeness Audit — 2026-06-24

Reloaded the canonical solution-designer `design-principles.md` and `references/design-examples.md` before this audit. The review focused on spine sufficiency, ownership boundaries, off-spine concerns, interface identity shapes, clean-cut removal/decommission, and avoiding hidden runtime loops or fragmented coordinator chains.

Audit result:

- Core design was already aligned on the main token accounting spine, runtime-specific local spines, server-side cost enrichment, frontend display ownership, and dependency rules.
- Gap found: the spec needed an explicit use-case-to-spine coverage matrix so reviewers can verify that native AutoByteus, Codex, Claude SDK, standalone UI, team UI, settings/history, price lookup, and cache/reasoning future-proofing are each covered.
- Gap found: team aggregation deserved an explicit data-flow span because team runs do not directly consume tokens; member agent runs do.
- Gap found: removal/decommission needed a more concrete table naming old paths and removal criteria, not only a high-level legacy policy.

Applied updates to `design-spec.md`:

- Added `DS-008` Team Aggregation Display spine.
- Added `Use-Case Coverage Against Spine Inventory` table.
- Added `Team aggregation display span` arrow flow.
- Added `Change Inventory` table.
- Added `Concrete Decommission Plan` table covering `TokenUsagePersistenceProcessor`, old `TokenUsageStore`/`token_usage_records`, local token counters/trackers, old Codex direct writes, `ASSISTANT_COMPLETE.usage` as primary meter source, and frontend price constants.


## No-Legacy Review Direction — 2026-06-24

User explicitly confirmed the design should not keep legacy code or compatibility paths. Updated requirements/design to remove old-storage compatibility language: settings statistics must become ledger-backed, old `token_usage_records` must not remain as a live source, and `TokenUsagePersistenceProcessor` / old role-split writes must not remain as compatibility writers for the new feature.

## Architecture Review Round 1 Rework Investigation — 2026-06-24

Review artifact consulted:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-transparency-analysis/tickets/done/token-usage-transparency-analysis/design-review-report.md`

Review decision was `Fail — Design Impact` with four findings AR-001 through AR-004. I re-inspected the current `origin/personal` worktree and updated requirements/design to resolve these findings before resubmission.

### AR-001 evidence: native raw/provider-specific usage is lost too early

Relevant current files inspected:

- `autobyteus-ts/src/llm/utils/token-usage.ts`
- `autobyteus-ts/src/llm/utils/response-types.ts`
- `autobyteus-ts/src/llm/api/openai-compatible-llm.ts`
- `autobyteus-ts/src/llm/api/anthropic-llm.ts`
- `autobyteus-ts/src/agent/loop/llm-phase.ts`
- `autobyteus-ts/src/agent/streaming/events/stream-event-payload-assistant.ts`
- `autobyteus-ts/src/agent/streaming/events/stream-event-payload-utils.ts`

Findings:

- `TokenUsageSchema` currently contains only `prompt_tokens`, `completion_tokens`, `total_tokens`, and optional prompt/completion/total cost fields. It cannot preserve provider-specific token buckets.
- `CompleteResponse.usage` and `ChunkResponse.usage` are typed as `TokenUsage | null`, so anything outside that schema is dropped or rejected by parser code.
- `OpenAICompatibleLLM.createTokenUsage(...)` maps only `usageData.prompt_tokens`, `usageData.completion_tokens`, and `usageData.total_tokens`; OpenAI-compatible detail fields such as cached prompt tokens are ignored.
- `AnthropicLLM` non-streaming maps only `response.usage.input_tokens/output_tokens`; streaming currently emits `prompt_tokens: 0` from `message_delta` output token usage, with a comment that start event input tokens may exist. This is not acceptable for accounting because zero is fabricated when input tokens are missing.
- `LlmPhase` stores the final complete chunk usage in `tokenUsage` and passes it into `CompleteResponse`; there is no independent raw usage event before that lossy shape.

Design resolution:

- Add a richer native `LlmTokenUsageObservation` shape in `autobyteus-ts` with normalized counts, `raw_usage_json`, provider cache/reasoning buckets, usage scope, model identity, and quality flags.
- Add provider-owned usage normalizers for OpenAI-compatible and Anthropic adapters. These normalizers must preserve the raw usage object before response transport.
- Change native accounting paths so `CompleteResponse`/`ChunkResponse` and assistant stream payload parsing carry the richer observation. The old prompt/completion/cost-only `TokenUsage` shape must not remain the source for server ledger/cost accounting.

### AR-002 evidence: current price defaults make missing price look like zero

Relevant current files inspected:

- `autobyteus-ts/src/llm/utils/llm-config.ts`
- `autobyteus-ts/src/llm/supported-model-definitions.ts`
- `autobyteus-ts/src/llm/models.ts`
- `autobyteus-ts/src/llm/ollama-provider.ts`
- `autobyteus-ts/src/llm/lmstudio-provider.ts`
- `autobyteus-ts/src/llm/utils/token-usage-tracker.ts`

Findings:

- `TokenPricingConfig` defaults both input and output prices to `0.0` when omitted.
- `LLMConfig` creates a default `TokenPricingConfig()` when no pricing config is supplied, which currently means zero prices rather than missing prices.
- Ollama and LMStudio discovery create model configs with explicit `inputTokenPricing: 0.0` and `outputTokenPricing: 0.0`; these are local-runtime placeholders, not trusted free public API prices.
- `TokenUsageTracker.calculateCost(...)` directly multiplies token count by pricing config values, so default zero could silently become zero cost in old/local paths.

Design resolution:

- The shared model pricing API must expose `pricing_status = trusted | missing | placeholder`, nullable price dimensions, trusted dimension flags, and a missing reason.
- Server cost calculation may set `api_cost_status = estimated` only when the shared pricing resolution is trusted for the needed input/output dimensions.
- Missing, placeholder, unaudited, constructor-default-zero, or local-runtime default-zero pricing must persist token rows with null estimated cost and `price_missing`/`partial_price_missing`, never `$0 estimated`.
- A true zero price remains possible only as explicit trusted zero with source/version/price config identity.

### AR-003 evidence: identity exists, but token design needed one canonical enrichment owner

Relevant current files inspected:

- `autobyteus-server-ts/src/agent-execution/domain/agent-run-config.ts`
- `autobyteus-server-ts/src/agent-execution/domain/agent-run-context.ts`
- `autobyteus-server-ts/src/agent-team-execution/domain/member-team-context.ts`
- `autobyteus-server-ts/src/agent-team-execution/domain/team-run-event.ts`
- `autobyteus-server-ts/src/agent-team-execution/domain/team-run-context.ts`
- `autobyteus-server-ts/src/agent-team-execution/domain/team-run-config.ts`
- `autobyteus-server-ts/src/agent-team-execution/services/team-run-metadata-mapper.ts`
- `autobyteus-server-ts/src/services/agent-streaming/team-run-event-websocket-message-mapper.ts`

Findings:

- `AgentRunConfig` already carries `agentDefinitionId`, `workspaceId`, `runtimeKind`, `llmModelIdentifier`, and nullable `memberTeamContext`.
- `MemberTeamContext` carries `teamRunId`, `teamDefinitionId`, `memberName`, `memberPath`, `memberRouteKey`, `memberRunId`, and `taskAgentInstance`.
- `TeamRunEvent` carries `teamRunId`, source path, and agent payload fields such as `memberRunId`, `memberPath`, `memberRouteKey`, and `taskAgentInstance`.
- `team-run-event-websocket-message-mapper.ts` flattens team/member identity into websocket payload fields (`agent_name`, `agent_id`, `member_route_key`, `member_path`, `source_path`, task fields), but that mapping is transport-facing. It must not be the sole ledger identity source.

Design resolution:

- Add `TokenUsageContextEnricher` in the server event pipeline. It reads `AgentRunContext.runId`, `AgentRunContext.config`, and `AgentRunConfig.memberTeamContext` to attach canonical run/team/member/agent/workspace identity to `TOKEN_USAGE_UPDATED` before persistence/dispatch.
- For standalone rows, team/member fields are null. For team member rows, `run_id` is the consuming member agent run id, `root_team_run_id` comes from `MemberTeamContext.teamRunId`, and `member_agent_run_id` equals `MemberTeamContext.memberRunId` / `run_id`.
- Team websocket aliases can remain display fields, but ledger rows and summary query identity must use the enriched event payload.

### AR-004 evidence: Codex last/total scope currently collapses

Relevant current files inspected:

- `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread-token-usage.ts`
- `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread.ts`
- `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread-notification-handler.ts`

Findings:

- `resolveCodexThreadTokenUsage(...)` currently does `const last = asObject(tokenUsage?.last) ?? asObject(tokenUsage?.total)` and returns the same prompt/completion/total `TokenUsage` either way.
- `CodexThread` stores ready usage by turn id and de-dupes/persists readiness, which is the correct boundary, but it stores only the lossy `TokenUsage` value.
- Because the parser does not remember whether it used `last` or `total`, downstream projections cannot know whether a reading is a direct per-turn delta or a cumulative snapshot.

Design resolution:

- Codex ready usage object must preserve raw usage, source scope, idempotency key, and whether the source was `last` or `total`.
- Codex `last` becomes `usage_scope = per_turn`, and accounting deltas equal reported counts.
- Codex `total` fallback becomes `usage_scope = cumulative_snapshot`, with `snapshot_series_key` such as `codex_thread:<threadId || runId>`. A server `TokenUsageSnapshotDeltaNormalizer` converts snapshots to accounting deltas by subtracting the previous snapshot for the same series.
- Ledger rows store `reported_*` and `accounting_*` separately. Summaries, frontend live meter totals, and cost calculation aggregate only `accounting_*` fields.

### Rework artifact updates

Updated artifacts:

- `requirements.md`: added AR round 1 tightening requirements and acceptance criteria for native raw usage, trusted pricing, context identity, and snapshot delta semantics.
- `design-spec.md`: added native raw usage preservation design, canonical context identity enrichment, trusted pricing contract, and server-owned usage-scope/accounting delta rules.
- `analysis-report.md`: addendum summarizes the revised design decisions.
