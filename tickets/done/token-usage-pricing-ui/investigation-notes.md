# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete; dedicated worktree and task branch created before deeper investigation.
- Current Status: Investigation updated with Codex app-server and Claude Agent SDK runtime token-event evidence; design artifacts revised for architecture review.
- Investigation Goal: Understand current token usage/pricing implementation across frontend and backend/shared TS code; verify supported model pricing except Mistral; determine billable thinking/reasoning token handling; define a design-ready scope.
- Scope Classification (`Small`/`Medium`/`Large`): Medium
- Scope Classification Rationale: Crosses frontend UI copy/layout, provider model registry cleanup, backend/shared pricing metadata, and token accounting semantics.
- Scope Summary: Rename usage-facing UI language to token-focused language, redesign token meter cards, remove MiniMax M2.7, verify non-Mistral provider pricing, and account for billable thinking tokens when provider APIs expose them.
- Primary Questions To Resolve:
  1. Where are token meter UI labels, settings labels, and navigation tabs implemented?
  2. Where are supported models and prices defined in `autobyteus-ts` and/or backend packages?
  3. Which supported models/providers have stale or missing pricing metadata?
  4. Do provider responses expose thinking/reasoning token counts and are those tokens billable?
  5. What frontend/backend data model changes are needed to preserve accurate token and cost semantics?

## Request Context

User requested: improve frontend wording from "Usage" to "Token" because users understand tokens better than usage; improve token meter card layout by pairing input tokens with input cost, output tokens with output cost, and total tokens with total estimate; remove MiniMax M2.7; verify pricing in `autobyteus-ts` for supported models except Mistral; investigate billable thinking tokens (example: DeepSeek flash model) and enhance token statistics if thinking tokens are counted for money. User explicitly instructed to write pricing findings into investigation notes immediately after each find to avoid losing context.

Reference screenshots:
- `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_581c1a67c9384604988a41e1ebb644cf/solution_designer_3a87b727bd604b51b47ea0cc938d7173/context_files/ctx_807543570330__image.png`
- `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_581c1a67c9384604988a41e1ebb644cf/solution_designer_3a87b727bd604b51b47ea0cc938d7173/context_files/ctx_0ad2c317fa92__image.png`

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-pricing-ui`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-pricing-ui/tickets/done/token-usage-pricing-ui`
- Current Branch: `codex/token-usage-pricing-ui`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-pricing-ui`
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: `git fetch origin --prune` completed successfully on 2026-06-25 before worktree creation.
- Task Branch: `codex/token-usage-pricing-ui`, created from `origin/personal`.
- Expected Base Branch (if known): `origin/personal`
- Expected Finalization Target (if known): `personal`
- Bootstrap Blockers: None.
- Notes For Downstream Agents: Do not use `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo` as the authoritative worktree for this task; it is the user's shared `personal` checkout and has unrelated untracked files.

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-06-25 | Command | `pwd && git rev-parse --show-toplevel && git status --short --branch && git remote -v && git branch --show-current && git symbolic-ref refs/remotes/origin/HEAD` in `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo` | Bootstrap repository and base branch context | Repo root is `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo`; current shared checkout was branch `personal`, tracking `origin/personal`; unrelated untracked `.article-work/` and `docs/articles/` present. | No |
| 2026-06-25 | Command | `git worktree list --porcelain && git fetch origin --prune` | Check existing task worktrees and refresh remote refs before creating branch | Remote fetch succeeded; no existing `token-usage-pricing-ui` worktree was present. | No |
| 2026-06-25 | Command | `git worktree add -b codex/token-usage-pricing-ui /Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-pricing-ui origin/personal` | Create dedicated task branch/worktree from latest tracked base | Dedicated branch/worktree created successfully; branch tracks `origin/personal`; initial status clean. | No |
| 2026-06-25 | Other | User-provided screenshot `ctx_807543570330__image.png` | Observe current runtime token meter UI | Runtime tab label is `Usage`; panel title is `Token Meter`; cards are split into separate counts (`INPUT`, `OUTPUT`, `TOTAL`) and costs (`INPUT COST`, `OUTPUT COST`, `TOTAL EST.`); price status can show `price_missing`; focused member row shows `Member tokens` and `Member cost`. | Inspect frontend implementation and responsive constraints. |
| 2026-06-25 | Other | User-provided screenshot `ctx_0ad2c317fa92__image.png` | Observe current API key/model support UI | Settings sidebar label is `Token Usage Statistics`; MiniMax provider shows `minimax-m2.7` and `minimax-m3`. | Find provider model registry and remove M2.7 support. |
| 2026-06-25 | Command | `rg -n "Token Meter|Token Usage|Usage|input cost|Input Cost|price_missing|Member tokens|Member cost|usage" autobyteus-web autobyteus-server-ts autobyteus-ts -g '!node_modules'` | Locate UI labels, token usage implementation, and backend accounting paths | Found right-tab label in `autobyteus-web/localization/messages/en/shell.ts`; tab name remains internal `usage` in `autobyteus-web/composables/useRightSideTabs.ts`; token meter panel in `autobyteus-web/components/workspace/usage/TokenUsageMeterPanel.vue`; backend ledger/pricing under `autobyteus-server-ts/src/token-usage`; shared pricing from `autobyteus-ts/src/llm/supported-model-definitions.ts` via `LLMFactory.getModelPricingInfo`. | Continue targeted code reads and design mapping. |
| 2026-06-25 | Command | `rg -n "minimax-m2\.7|minimax-m3|MiniMax|minimax" autobyteus-web autobyteus-server-ts autobyteus-ts -g '!node_modules'` | Find MiniMax M2.7 support source | `minimax-m2.7` is defined only in `autobyteus-ts/src/llm/supported-model-definitions.ts`; `MiniMax-M2.7` metadata remains in `autobyteus-ts/src/llm/metadata/curated-model-metadata.ts`; tests reference MiniMax M3 but not M2.7 directly. | Remove model definition and curated metadata; run registry tests. |
| 2026-06-25 | Code | `autobyteus-web/components/workspace/usage/TokenUsageMeterPanel.vue` | Inspect current token meter layout | The panel renders two separate `grid grid-cols-3` rows: one for `Input`/`Output`/`Total` token counts and another for `Input cost`/`Output cost`/`Total est.`. `MetricCard` only accepts one label/value pair, causing conceptually paired token+cost values to be separated. | Redesign card component to render token and cost sub-values together. |
| 2026-06-25 | Code | `autobyteus-web/localization/messages/en/shell.ts`, `autobyteus-web/localization/messages/zh-CN/shell.ts`, `autobyteus-web/composables/useRightSideTabs.ts`, `autobyteus-web/components/workspace/usage/TokenUsageHeaderChip.vue` | Inspect tab and header copy | User-visible right-tab label is translation key `shell.rightTabs.usage` currently `Usage`; internal tab id/type is `usage` and click handler uses `setActiveTab('usage')`; header chip copy already says token usage. | Rename user-facing label to `Token`; keep internal tab id unless implementation chooses a full internal rename with migration. |
| 2026-06-25 | Code | `autobyteus-ts/src/llm/supported-model-definitions.ts`; `autobyteus-ts/src/llm/llm-factory.ts` | Inspect supported model pricing source | `supportedModelDefinitions` defines pricing via `TokenPricingConfig`; `LLMFactory.getModelPricingInfo` exposes trusted input/output pricing only when both dimensions are present; unsupported/missing prices become `pricing_status: 'missing'`. Many non-Mistral supported models currently lack `defaultConfig.pricingConfig`, making costs unpriced. | Verify public pricing for supported non-Mistral models and update trusted prices where available. |
| 2026-06-25 | Code | `autobyteus-ts/src/llm/utils/llm-token-usage-observation.ts`, provider token usage normalizers under `autobyteus-ts/src/llm/api/*token-usage-normalizer.ts` | Inspect provider token observation shape | Shared observation already has optional `reasoning_output_tokens`, `billable_input_tokens`, `billable_output_tokens`, cache read/create fields, and raw usage JSON. Gemini normalizer maps `thoughtsTokenCount` to `reasoningOutputTokens`; OpenAI-compatible normalizer maps completion/output detail `reasoning_tokens` or `thinking_tokens` to `reasoningOutputTokens`; Anthropic normalizer maps cache tokens but not separate thinking tokens. | Need ensure server payload creation preserves usage nested fields and cost calculation uses billable/reasoning tokens where needed. |
| 2026-06-25 | Code | `autobyteus-ts/src/llm/api/openai-compatible-token-usage-normalizer.ts` with Kimi API docs usage example | Compare mapper to Kimi OpenAI-compatible usage contract | Kimi Chat API docs show usage includes top-level `cached_tokens`, while current OpenAI-compatible normalizer only maps nested `prompt_tokens_details.cached_tokens` / `input_tokens_details.cached_tokens`. | Add top-level `cached_tokens` fallback so Kimi cache-read pricing can be estimated. |
| 2026-06-25 | Code | `autobyteus-server-ts/src/agent-execution/domain/agent-run-token-usage.ts`, `autobyteus-server-ts/src/token-usage/pricing/token-cost-calculator.ts`, `autobyteus-server-ts/src/token-usage/providers/token-usage-ledger-store.ts`, `autobyteus-server-ts/src/token-usage/providers/statistics-provider.ts`, `autobyteus-server-ts/src/api/graphql/types/token-usage-stats.ts` | Inspect server token accounting, cost enrichment, summaries, and GraphQL API | Server domain already stores `reasoning_output_tokens`, `billable_input_tokens`, `billable_output_tokens`, and `estimated_api_reasoning_output_cost`; however `TokenCostCalculator` prices `accounting_output_tokens` only and always sets `estimated_api_reasoning_output_cost: null`; run summary GraphQL exposes only input/output/total tokens and input/output/total estimated cost, not reasoning/billable details. | Target design should make billable output calculation explicit and expose reasoning token data if it materially affects UI/accounting. |
| 2026-06-25 | Web | `https://openai.com/api/pricing/` via query `OpenAI API pricing gpt-5.5 gpt-5.4 gpt-5.4-mini input output per million tokens official` | Verify OpenAI model prices | Official OpenAI pricing confirms GPT-5.5 `$5/$30`, GPT-5.4 `$2.50/$15`, GPT-5.4 mini `$0.75/$4.50` per 1M input/output tokens, plus cached input prices. | Catalog input/output already matches; consider cache pricing support. |
| 2026-06-25 | Web | `https://platform.claude.com/docs/en/about-claude/pricing` and `https://platform.claude.com/docs/en/build-with-claude/extended-thinking` | Verify Anthropic prices and thinking-token billing | Official docs confirm Opus 4.8/4.7 `$5/$25`, Sonnet 4.6 `$3/$15` per MTok base input/output; thinking tokens are charged as output tokens and retained thinking blocks as input tokens. | Add missing Opus 4.8 price; ensure reasoning output tokens participate in output cost. |
| 2026-06-25 | Web | `https://api-docs.deepseek.com/quick_start/pricing` and `https://api-docs.deepseek.com/guides/thinking_mode` | Verify DeepSeek V4 pricing and thinking mode | Official pricing shows V4-Flash cache miss `$0.14` input and `$0.28` output, V4-Pro cache miss `$0.435` input and `$0.87` output per 1M; cache-hit rates are much lower; thinking mode exists. | Current V4-Pro catalog is stale; update. Use output pricing for thinking tokens. |
| 2026-06-25 | Web | `https://ai.google.dev/gemini-api/docs/pricing?hl=en` | Verify Gemini prices and thinking-token billing | Official pricing confirms output price includes thinking tokens. Current base standard prices match supported Gemini entries for 3.5 Flash, 3.1 Pro Preview <=200k, and 3 Flash Preview. | Ensure `thoughtsTokenCount` is output-priced; note tiered >200k gap for Gemini Pro. |
| 2026-06-25 | Web | `https://docs.x.ai/developers/pricing` | Verify xAI/Grok prices and reasoning-token billing | Official docs list `grok-4.3` `$1.25/$2.50`, `grok-build-0.1` `$1.00/$2.00`, cached input `$0.20`; reasoning tokens billed as standard token costs. | Add Grok prices; output-price reasoning tokens. |
| 2026-06-25 | Web | `https://platform.kimi.ai/`, `https://platform.kimi.ai/docs/pricing/chat-k26`, `https://platform.kimi.ai/docs/pricing/chat-k27-code`, `https://platform.kimi.ai/docs/api/chat` | Verify Kimi/Moonshot prices, cache field, and thinking behavior | K2.6 and K2.7 Code have `$0.95/$4.00` input/output, with cache hit `$0.16` and `$0.19`; K2.7 Code thinking is always enabled/preserved by default; usage exposes `cached_tokens`. | Add Kimi prices and map cache hit tokens if available; highspeed needs exact output price verification before trusting. |
| 2026-06-25 | Web | `https://www.alibabacloud.com/help/en/model-studio/model-pricing`, `https://modelstudio.alibabacloud.com/` | Verify Qwen prices and thinking-token billing | Qwen prices are regional/tiered; `qwen3.7-max` is `$2.5/$7.5` in Singapore/international landing context but `$1.65/$4.951` in several global region rows; `qwen3-max` has token-length tiers. Output column is chain-of-thought + answer. | Do not keep a blind flat `qwen3-max` price as universally trusted; add region/tier support or mark partial. |
| 2026-06-25 | Web/Command | `https://bigmodel.cn/pricing` (JS asset `/js/app.2bae5f25.js` inspected with Python), `https://docs.bigmodel.cn/cn/guide/capabilities/thinking-mode` | Verify GLM-5.2 price and thinking behavior | BigModel direct JS lists `GLM-5.2` at `8元` input, `28元` output, `2元` cache hit per 1M tokens through 2026-08-31; GLM-5.2 defaults to thinking. | Current catalog USD values are stale for configured BigModel endpoint; add currency/tier support or use explicit official USD equivalent. |
| 2026-06-25 | Web | `https://platform.minimax.io/docs/guides/pricing-paygo`, `https://platform.minimax.io/docs/api-reference/text-prompt-caching`, `https://platform.minimax.io/docs/api-reference/text-openai-api` | Verify MiniMax M3 pricing and M2.7 status | MiniMax-M3 standard pay-as-you-go has ≤512k discounted `$0.30/$1.20` input/output and `$0.06` cache read; >512k doubles to `$0.60/$2.40` and `$0.12` cache read; M2.7 appears only as legacy. | Remove M2.7; add M3 price with long-context tier or document partial estimate. |

## Current Behavior / Current Flow

- Current entrypoint or first observable boundary: Provider LLM adapters in `autobyteus-ts` emit `LlmTokenUsageObservation` through agent streaming events; server runtime/backends convert token observations into `TokenUsageUpdatedPayload`; frontend consumes live events and GraphQL summaries in `tokenUsageMeterStore`.
- Current execution flow: `autobyteus-ts` provider normalizer -> `LlmPhase` token usage notification -> server `createTokenUsageUpdatedPayload` / backend-specific token usage conversion -> `TokenCostCalculator` enrichment via `LLMFactory.getModelPricingInfo` -> `TokenUsageLedgerStore` persistence/projection -> GraphQL summary -> frontend `TokenUsageMeterPanel`.
- Ownership or boundary observations: `autobyteus-ts/src/llm/supported-model-definitions.ts` is the built-in model/pricing catalog; server token-usage ledger is the authoritative runtime accounting boundary; frontend panel is presentation-only and should not recalculate provider price policy.
- Current behavior summary: Screenshots confirm token meter exists but layout and copy are not user-optimal; MiniMax M2.7 is still surfaced as supported. Existing DTOs already have reasoning/billable token fields, but server cost calculation and summaries do not use/expose reasoning cost details today.

## Design Health Assessment Evidence

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Larger Requirement / Behavior Change
- Candidate root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Missing Invariant + Shared Structure Looseness + Legacy Or Compatibility Pressure.
- Refactor posture evidence summary: Refactor is needed now because verified provider pricing requires cache/tier/currency dimensions and thinking-token cost uses fields already present but not applied by the current calculator/summaries.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| User screenshots | Count and cost cards are visually separated despite being conceptually paired. | Could be local frontend presentation issue, or could reveal token/cost data model split. | Inspect UI and API data shape. |
| User screenshots | MiniMax M2.7 is still displayed. | Likely stale provider registry/model catalog entry. | Remove support cleanly from authoritative registry. |
| User request | Thinking/reasoning token billing may not be represented. | Could indicate token accounting data model lacks billable category granularity. | Inspect backend token usage events and provider response mappers. |
| Server cost calculator | `estimated_api_reasoning_output_cost` is always null and output cost uses `accounting_output_tokens` rather than `billable_output_tokens` when present. | Existing field model is ahead of calculation behavior; likely a missing invariant in cost enrichment rather than greenfield work. | Design billing semantics for reasoning/billable output tokens. |
| Shared provider observation DTO | Optional reasoning and billable fields already exist. | Reuse/tighten existing structures; avoid a second parallel token statistics model. | Verify propagation and tests. |
| Supported model catalog | Model pricing lives in built-in model definitions, but many supported non-Mistral models are missing pricing configs. | Price missing UI may be caused by incomplete catalog, not runtime failure. | Verify prices and update catalog. |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-web/localization/messages/en/shell.ts` / `zh-CN/shell.ts` | Shell/right-panel translation strings | `shell.rightTabs.usage` is the user-visible tab label; token meter labels live here. | Copy-only rename belongs here unless internal route/tab identity is intentionally renamed. |
| `autobyteus-web/composables/useRightSideTabs.ts` | Right-side tab registry and active-tab id | Internal `TabName` includes `usage`; label comes from localization. | Keep internal id stable or rename with full callsite update; user-facing label can change independently. |
| `autobyteus-web/components/workspace/usage/TokenUsageMeterPanel.vue` | Token meter panel presentation | Separate token cards and cost cards split related concepts; `MetricCard` is single-value. | Replace with paired metric cards (input tokens+cost, output tokens+cost, total tokens+estimated total). |
| `autobyteus-web/stores/tokenUsageMeterStore.ts` | Frontend live/fetched token summary state | Aggregates meter deltas and costs from streaming payloads and GraphQL run summaries. | Store shape must be extended if reasoning/billable token totals are exposed. |
| `autobyteus-ts/src/llm/supported-model-definitions.ts` | Authoritative built-in model registry and default pricing config | Contains `minimax-m2.7`; many supported non-Mistral models lack trusted pricing. | Remove M2.7 here; update pricing configs after public verification. |
| `autobyteus-ts/src/llm/metadata/curated-model-metadata.ts` | Curated context/output metadata lookup | Contains stale `MiniMax-M2.7` metadata. | Remove stale M2.7 metadata with model removal. |
| `autobyteus-ts/src/llm/llm-factory.ts` | Model registry and pricing lookup boundary | `getModelPricingInfo` maps default `TokenPricingConfig` to server price config; no reasoning-specific price dimension exists. | Extend pricing shape only if reasoning needs a distinct rate; otherwise document reasoning as output-priced and ensure billable output counts include it. |
| `autobyteus-ts/src/llm/utils/llm-token-usage-observation.ts` | Shared provider token observation DTO | Already supports optional reasoning and billable token fields. | Tighten server propagation and cost use rather than inventing a parallel DTO. |
| `autobyteus-ts/src/llm/api/openai-compatible-token-usage-normalizer.ts` | OpenAI-compatible usage mapper | Extracts `reasoning_tokens`/`thinking_tokens` from completion/output details and cache read only from `prompt_tokens_details.cached_tokens` / `input_tokens_details.cached_tokens`; it does not read Kimi top-level `usage.cached_tokens`. | Extend provider-normalization for top-level Kimi `cached_tokens`; verify total/output semantics for DeepSeek/GLM/Qwen-compatible providers and cost on billable output. |
| `autobyteus-ts/src/llm/api/gemini-token-usage-normalizer.ts` | Gemini usage mapper | Maps `thoughtsTokenCount` to reasoning output tokens. | Google docs/pricing must decide whether thought tokens are output-priced and how total tokens includes them. |
| `autobyteus-server-ts/src/agent-execution/domain/agent-run-token-usage.ts` | Server canonical token-usage event payload | Fields for reasoning/billable tokens exist; parser can read top-level or nested `usage` values. | Existing domain shape can absorb thinking-token accounting if downstream calculations use it. |
| `autobyteus-server-ts/src/token-usage/pricing/token-cost-calculator.ts` | Applies model price config to usage payload | Ignores `billable_output_tokens` and sets `estimated_api_reasoning_output_cost` to null. | Main backend accounting change likely belongs here. |
| `autobyteus-server-ts/src/token-usage/providers/token-usage-ledger-store.ts` | Builds run/team/member summaries from ledger events | Summaries omit reasoning token totals and reasoning cost. | Extend summary payload/API if UI should show reasoning token detail or if total/billable distinction must be visible. |
| `autobyteus-server-ts/src/api/graphql/types/token-usage-stats.ts` | GraphQL token usage statistics and run summary API | Exposes input/output/total tokens and costs only. | Extend schema/types/queries if frontend needs reasoning/billable fields. |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-06-25 | Setup | Copied/used `.env.test` credentials without printing values; checked only presence/status of priority provider keys. | Priority keys were available for Anthropic, Vertex/Gemini, DeepSeek, Kimi, GLM; current OpenAI key returned invalid-key errors. | Provider probes can proceed for all priority providers except OpenAI until a valid/quota-enabled key is supplied. |
| 2026-06-25 | Probe | `AUTOBYTEUS_PROVIDER_USAGE_PROBE=1 node tickets/done/token-usage-pricing-ui/provider-usage-probe.mjs --yes --provider=openai --provider=anthropic` | Anthropic non-stream succeeded for `claude-sonnet-4-6`: usage included `output_tokens: 13` and `output_tokens_details.thinking_tokens: 7`; content blocks included `thinking` and `text`. OpenAI Responses probe returned HTTP 401 `invalid_api_key`. | Claude thinking tokens are reported as an output-token sub-breakdown and must be captured by the Anthropic normalizer. OpenAI still needs a valid key for real probe; use official docs/fixtures meanwhile. |
| 2026-06-25 | Probe | Direct Anthropic HTTP stream probe against `/v1/messages` with `stream: true` and thinking enabled. | Stream `message_start` usage contained initial input/cache fields and `output_tokens: 1`; final `message_delta.usage` contained `output_tokens: 13` and `output_tokens_details.thinking_tokens: 7`. Stream content deltas included `thinking_delta`, `signature_delta`, and `text_delta`. | Anthropic streaming path can capture final thinking token count if `foldAnthropicUsage` preserves nested `output_tokens_details.thinking_tokens`; current normalizer does not. |
| 2026-06-25 | Probe | Vertex/Gemini SDK probe using `VERTEX_AI_API_KEY` through `@google/genai` Vertex Express mode for `gemini-3.5-flash`, `gemini-3-flash-preview`, and `gemini-3.1-pro-preview` with `thinkingConfig.includeThoughts: true`. | Thinking prompts returned `usageMetadata.promptTokenCount`, `candidatesTokenCount`, `totalTokenCount`, and `thoughtsTokenCount`. Example `gemini-3.5-flash`: prompt `15`, candidates `3`, thoughts `112`, total `130`; parts included a `thought` part. | Gemini `candidatesTokenCount` excludes thinking tokens while `totalTokenCount` includes them; normalizer must set billable output to candidates + thoughts to avoid undercounting output cost. |
| 2026-06-25 | Probe | OpenAI-compatible non-stream/stream probes for DeepSeek, GLM, Kimi, and Qwen; summarized in `provider-usage-probe-matrix.md`. | DeepSeek/GLM/Qwen expose `completion_tokens_details.reasoning_tokens` and `reasoning_content`; their `completion_tokens` include reasoning. Kimi exposes `reasoning_content` but no numeric reasoning-token field; repeated Kimi calls with `prompt_cache_key` exposed top-level and nested `cached_tokens`. | OpenAI-compatible normalizer should treat numeric reasoning as a subset, not extra output; Kimi cache requires top-level `cached_tokens` fallback; Kimi reasoning count must remain null unless provider emits a numeric count. |
| 2026-06-25 | Probe | Manual DeepSeek direct API comparison: root `thinking:{type:'disabled'}` vs `extra_body:{thinking:{type:'disabled'}}`. | Root `thinking` disabled reasoning and removed `reasoning_content`; `extra_body.thinking` did not disable thinking. Current `DeepSeekLLM.normalizeDeepSeekExtraParams` moves `thinking_type` into `extra_body`. | Fix DeepSeek Node adapter request shaping: send provider control fields at the actual request root, not Python-style `extra_body`, otherwise thinking toggles are ineffective. |
| 2026-06-25 | Artifact | Wrote `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-pricing-ui/tickets/done/token-usage-pricing-ui/provider-usage-probe-matrix.md`. | Matrix records priority provider probe status, raw usage fields, reasoning/cache evidence, and normalizer/accounting decisions with links to sanitized JSON summaries. | Downstream implementation and API/E2E can use this as the durable probe evidence basis; only OpenAI remains blocked by invalid key. |
| 2026-06-25 | Probe | Retested OpenAI after user updated `OPENAI_API_KEY`: `AUTOBYTEUS_PROVIDER_USAGE_PROBE=1 node tickets/done/token-usage-pricing-ui/provider-usage-probe.mjs --yes --provider=openai`; also called `/v1/models` as a sanity check. | Both Responses API and model-list sanity check returned HTTP 401 `invalid_api_key`. `.env.test` has one `OPENAI_API_KEY` entry at line 11; value length 164; no duplicate-key issue was found. | OpenAI remains blocked until a valid key is provided; official docs/fixtures remain the source for implementation tests. |

## External / Public Source Findings

### Pricing Findings Recorded Immediately

| Provider | Model(s) / Topic | Official Source | Pricing / Billing Finding | Implication For Catalog / Accounting |
| --- | --- | --- | --- | --- |
| OpenAI | `gpt-5.5`, `gpt-5.4`, `gpt-5.4-mini` | OpenAI API pricing, `https://openai.com/api/pricing/`, opened 2026-06-25 | Standard text prices per 1M tokens: GPT-5.5 input `$5.00`, cached input `$0.50`, output `$30.00`; GPT-5.4 input `$2.50`, cached input `$0.25`, output `$15.00`; GPT-5.4 mini input `$0.75`, cached input `$0.075`, output `$4.50`. | Current catalog values for these three OpenAI models match standard input/output prices, but `cached_input_read_price_per_million` is not represented/trusted in `LLMFactory.getModelPricingInfo`; design should decide whether to add cached input pricing support for providers with known cache prices. |
| Anthropic | `claude-opus-4.8`, `claude-opus-4.7`, `claude-sonnet-4.6` plus thinking billing | Claude pricing, `https://platform.claude.com/docs/en/about-claude/pricing`, and extended thinking, `https://platform.claude.com/docs/en/build-with-claude/extended-thinking`, opened 2026-06-25 | Claude Opus 4.8 and Opus 4.7 standard prices: base input `$5/MTok`, 5m cache write `$6.25/MTok`, 1h cache write `$10/MTok`, cache hit `$0.50/MTok`, output `$25/MTok`. Claude Sonnet 4.6: base input `$3/MTok`, 5m cache write `$3.75/MTok`, 1h cache write `$6/MTok`, cache hit `$0.30/MTok`, output `$15/MTok`. Extended thinking docs say thinking process incurs charges for thinking tokens as output tokens, prior thinking blocks in context as input tokens, and standard text output tokens. | Current catalog has correct Opus 4.7 and Sonnet 4.6 base input/output prices; Opus 4.8 lacks a pricing config and should be set to `$5/$25`. Server should count Claude thinking tokens as output-token priced when provider reports them; cache prices are currently not cataloged. |
| DeepSeek | `deepseek-v4-flash`, `deepseek-v4-pro`; thinking mode | DeepSeek Models & Pricing, `https://api-docs.deepseek.com/quick_start/pricing`, opened 2026-06-25; DeepSeek thinking mode, `https://api-docs.deepseek.com/guides/thinking_mode` | Pricing table shows two columns for V4-Flash and V4-Pro. V4-Flash: cache-hit input `$0.0028/1M`, cache-miss input `$0.14/1M`, output `$0.28/1M`. V4-Pro: cache-hit input `$0.003625/1M`, cache-miss input `$0.435/1M`, output `$0.87/1M`. Thinking mode emits reasoning before final answer; pricing page labels these as output tokens rather than a separate thinking-token rate. | Current Flash pricing matches cache-miss input/output but lacks cache-hit price. Current Pro input/output values (`1.74/3.48`) are stale/wrong vs official `$0.435/$0.87`; update Pro. Reasoning/thinking tokens should be treated as billable output tokens if included/reported by provider usage. |
| Google Gemini | `gemini-3.5-flash`, `gemini-3.1-pro-preview`, `gemini-3-flash-preview` | Gemini Developer API pricing, `https://ai.google.dev/gemini-api/docs/pricing?hl=en`, opened 2026-06-25 | Standard paid prices per 1M tokens: Gemini 3.5 Flash input `$1.50`, output `$9.00`; Gemini 3.1 Pro Preview input `$2.00` for prompts <=200k and `$4.00` for prompts >200k, output including thinking tokens `$12.00` <=200k and `$18.00` >200k; Gemini 3 Flash Preview input `$0.50`, output including thinking tokens `$3.00`. Page explicitly says output price includes thinking tokens. | Current catalog matches standard base prices for `gemini-3.5-flash`, `gemini-3.1-pro-preview` <=200k, and `gemini-3-flash-preview`. The catalog cannot represent Gemini tiered >200k pricing or cache prices today; design should either document base-tier estimate or extend pricing rules. Gemini `thoughtsTokenCount` must be output-priced. |
| xAI | `grok-4.3`, `grok-build-0.1` | xAI pricing docs, `https://docs.x.ai/developers/pricing`, opened 2026-06-25 | Chat API prices per 1M tokens: `grok-4.3` input `$1.25`, cached input `$0.20`, output `$2.50`; `grok-build-0.1` input `$1.00`, cached input `$0.20`, output `$2.00`. xAI docs also state reasoning tokens are standard token costs. | Current catalog has no pricing config for both Grok models; add trusted input/output prices and optionally cache-read price. Reasoning tokens should be output-priced. |
| Kimi / Moonshot | `kimi-k2.6`, `kimi-k2.7-code`, `kimi-k2.7-code-highspeed` | Kimi API Platform, `https://platform.kimi.ai/`, `https://platform.kimi.ai/docs/pricing/chat-k26`, `https://platform.kimi.ai/docs/pricing/chat-k27-code`, `https://platform.kimi.ai/docs/api/chat`, opened/searched 2026-06-25 | International Kimi pages show: `kimi-k2.6` cache hit `$0.16/MTok`, cache miss/input `$0.95/MTok`, output `$4.00/MTok`; `kimi-k2.7-code` cache hit `$0.19/MTok`, cache miss/input `$0.95/MTok`, output `$4.00/MTok`. `kimi-k2.7-code-highspeed` pricing page snippet shows cache hit `$0.38/MTok`, input `$1.90/MTok` (output price likely higher but exact value truncated by search/open output). Kimi Chat API docs expose `cached_tokens` in usage and say K2.7 Code thinking is always enabled/preserved by default. | Current catalog has no Kimi pricing config; add trusted pricing for K2.6 and K2.7 Code. Either verify full highspeed output price before adding it or leave highspeed missing if uncertainty remains; support `cached_tokens` as cache-read input if used. Thinking output is part of completion/output tokens. |
| Qwen / Alibaba Cloud Model Studio | `qwen3.7-max`, `qwen3-max` | Alibaba Cloud Model Studio pricing, `https://www.alibabacloud.com/help/en/model-studio/model-pricing`, and Model Studio landing page, opened/searched 2026-06-25 | Official pricing is regional/tiered. `qwen3.7-max` international/Singapore table lists `$2.50` input and `$7.50` output per 1M; several global regions list `$1.65/$4.951`; Model Studio landing page also advertises `$2.5/$7.5`. `qwen3-max` has token-length tiers; China mainland row shows tiered prices, and the current flat `$2.4/$12.0` catalog value does not clearly match all current official tiers. Official Qwen tables label output as `Chain of thought + answer` for thinking mode. | Add `qwen3.7-max` trusted price only with an explicit deployment-region assumption. `qwen3-max` should not remain as a single blindly trusted flat price unless the pricing model can select the correct region/tier; mark missing/partial or implement tiered price rules. Reasoning tokens are output-priced. |
| GLM / BigModel | `glm-5.2` | BigModel pricing page `https://bigmodel.cn/pricing` JS payload inspected 2026-06-25; GLM thinking docs `https://docs.bigmodel.cn/cn/guide/capabilities/thinking-mode`; Alibaba Cloud pricing page as secondary official channel | BigModel direct pricing JS lists `GLM-5.2` input `8元/MTok`, output `28元/MTok`, cache hit `2元/MTok`, cache storage temporarily free, valid through 2026-08-31. GLM thinking docs say GLM-5.2 defaults to Thinking and can be disabled. Alibaba Cloud official relay lists GLM-5.2 China mainland `$1.100/$3.851`, aligning with RMB conversion. | Current catalog has `1.4/4.4` USD-like values; for the configured `open.bigmodel.cn/api/coding/paas/v4` endpoint the price/currency is stale/wrong. Design should add currency support or use a documented USD conversion/official relay price source; reasoning tokens are part of output pricing. |
| MiniMax | `minimax-m3`, remove `minimax-m2.7` | MiniMax pricing docs, `https://platform.minimax.io/docs/guides/pricing-paygo`, MiniMax prompt caching docs, `https://platform.minimax.io/docs/api-reference/text-prompt-caching`, and MiniMax text/OpenAI API docs, opened/searched 2026-06-25 | Pay-as-you-go Standard `MiniMax-M3` prices per 1M: for ≤512k input tokens, discounted input `$0.30`, output `$1.20`, cache read `$0.06`; for >512k input tokens, discounted input `$0.60`, output `$2.40`, cache read `$0.12`. Priority is 1.5x. M2.7 is now a legacy model; user requested removing it. MiniMax M3 thinking can be enabled/disabled; token usage examples expose `input_tokens` and `output_tokens`. | Add M3 trusted pricing with tier support or, if flat only, use ≤512k Standard and record long-context underestimation risk. Remove M2.7 model definition and metadata; do not keep compatibility alias. |

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: Pending.
- Required config, feature flags, env vars, or accounts: Pending.
- External repos, samples, or artifacts cloned/downloaded for investigation: None yet.
- Setup commands that materially affected the investigation: `git fetch origin --prune`; `git worktree add -b codex/token-usage-pricing-ui ... origin/personal`.
- Cleanup notes for temporary investigation-only setup: None yet.

## Findings From Code / Docs / Data / Logs

See the current behavior, relevant files, and external pricing source sections above. The final synthesis below captures the design-ready conclusions.

## Constraints / Dependencies / Compatibility Facts

- No Mistral pricing verification required per user instruction.
- Pricing and thinking-token behavior must be verified against current provider documentation where available.
- MiniMax M2.7 removal should be a clean removal, not a compatibility-preserving hidden alias, unless investigation reveals unavoidable persisted-data migration needs.

## Open Unknowns / Risks

- Kimi K2.7 Code HighSpeed exact price dimensions were not fully visible in fetched official pages; keep it untrusted unless implementation verifies exact official values.
- Qwen pricing is region- and tier-dependent; a default deployment region must be explicit before trusted estimates are shown.
- GLM direct BigModel pricing is CNY-denominated while many other providers are USD; summaries must avoid mixed-currency totals.
- Tier selection for cumulative snapshots may be less precise than per-call events if the snapshot lacks per-request input length.
- Pricing can change after 2026-06-25; downstream implementation should preserve source/effective-date evidence for updated values.

## Notes For Architect Reviewer

See Final Investigation Synthesis below.


## Final Investigation Synthesis (2026-06-25)

The investigation is complete enough for design. The current implementation already has a usable token-event spine, but cost correctness and UI clarity require coordinated changes across `autobyteus-ts`, `autobyteus-server-ts`, and `autobyteus-web`.

### Final Current-State Summary

- User-facing copy: runtime tab label is controlled by `shell.rightTabs.usage`; settings token statistics copy is in `settings.page.sections.tokenUsage` and generated settings localization keys.
- Token meter layout: `TokenUsageMeterPanel.vue` uses two independent `grid grid-cols-3` rows with one-value `MetricCard`s. This directly causes the separated input/input-cost, output/output-cost, total/total-estimate layout problem.
- Model registry: `autobyteus-ts/src/llm/supported-model-definitions.ts` is the authoritative supported model list. MiniMax M2.7 is still defined there and in curated metadata.
- Pricing model: `TokenPricingConfig` is flat input/output only; `LLMFactory.getModelPricingInfo` returns cache fields as null and hardcodes USD for trusted flat prices.
- Provider usage normalization: reasoning/cache fields are partly supported already, but Gemini billable output and Kimi top-level `cached_tokens` need correction.
- Server accounting: `TokenUsageUpdatedPayload` already has reasoning/billable/cached fields. The gap is calculator/projection usage: `TokenCostCalculator` ignores billable output and always sets reasoning cost null; summaries/GraphQL omit reasoning fields.
- Frontend summaries: the store and GraphQL fragment expose only input/output/total tokens and input/output/total costs.

### Final Design Health Conclusion

- Current design issue found: Yes.
- Root cause: Missing invariant and shared-structure looseness. The system has richer token facts but lacks a single enforced invariant that output cost uses billable output including thinking tokens, and lacks pricing structure for cache/tier/currency dimensions. MiniMax M2.7 is legacy pressure in the model registry.
- Refactor needed now: Yes. Updating only UI labels and flat prices would leave known incorrect prices and thinking-token undercount risk.

### Pricing Source Update Notes

Additional official/public source checks after the initial table found:

- Kimi API Platform home page lists K2.7 Code and K2.6 pricing as cache/input/output values and says K2.7 Code HighSpeed launched. The detailed K2.7 Code docs state HighSpeed is the same model with faster output, but the fetched pricing page did not expose a separate full HighSpeed price table. Treat exact HighSpeed price as untrusted unless implementation can verify it from official docs.
- Kimi K2.7 Code quickstart states HighSpeed uses `kimi-k2.7-code-highspeed`, has 256k context with K2.7 Code, and K2.7 Code does not support disabling thinking mode.
- MiniMax M3 prices remain official from MiniMax docs with Standard and long-context tiers; third-party sources corroborate but should not replace official docs.

### Notes For Architecture Reviewer

- The design intentionally keeps frontend pricing passive. All provider pricing/tier/currency/thinking cost semantics should be resolved before GraphQL/web display.
- The biggest architecture question is how much tier/currency complexity to encode now. The recommendation is to encode at least cache-read/cache-write, currency, and input-token tier rules because MiniMax M3 and Gemini/Qwen/GLM make flat USD pricing visibly unsafe.
- Ambiguous prices should remain untrusted rather than guessed. This is not a failure of the feature; it is required to avoid false cost estimates.
- Historical persisted token usage can remain as data. Removing MiniMax M2.7 support should not imply a ledger migration or old-event deletion.


## User Follow-Up: Provider Usage Probing Requirement (2026-06-25)

User clarified that documentation research alone is not sufficient for reasoning/cache token correctness. The design now requires enough provider response probing or documented fixture evidence to determine whether raw responses expose reasoning token counts, whether output counts already include hidden/summarized reasoning, and whether cache token fields are available for statistics such as cache hit/cost. Real provider calls must be opt-in because they can incur cost and require API keys.

Additional source findings recorded for this refinement:

| Provider / API | Source | Response Usage Finding | Design Implication |
| --- | --- | --- | --- |
| OpenAI reasoning models | `https://developers.openai.com/api/docs/guides/reasoning` | OpenAI docs state reasoning tokens are billed as output tokens and show `output_tokens_details.reasoning_tokens` inside the usage object. | OpenAI-compatible normalizer should capture nested reasoning token details where present; output cost should include reasoning tokens. |
| Gemini Interactions API | `https://ai.google.dev/gemini-api/docs/tokens` | Google docs say interaction response usage returns input, output, thinking, cached content, tool use, and total token counts (`total_thought_tokens`, `total_cached_tokens`, etc.). | Gemini support should not rely only on older `usageMetadata.thoughtsTokenCount`; probe/native API paths need to identify which usage fields are returned. |
| Anthropic Claude | `https://platform.claude.com/docs/en/build-with-claude/extended-thinking`; `https://platform.claude.com/docs/en/build-with-claude/prompt-caching` | Claude docs say full thinking tokens are billed even when omitted/summarized, `output_tokens` is authoritative for billing, and response usage can expose cache creation/read token fields. | Preserve thinking detail as breakdown, not extra cost; cache creation/read fields should feed cache-cost and cache-hit statistics. |
| DeepSeek | `https://api-docs.deepseek.com/quick_start/pricing`; `https://api-docs.deepseek.com/guides/thinking_mode` | Pricing is input/output based and models support thinking mode; docs searched did not provide a distinct thinking-token rate. | Treat thinking as output-priced but require probe/fixture to see whether OpenAI-compatible usage includes reasoning token fields and whether output includes them. |
| Kimi / Moonshot | `https://platform.kimi.ai/`; `https://platform.kimi.ai/docs/api/chat`; `https://platform.kimi.ai/docs/guide/use-kimi-k2-thinking-model` | K2.7 Code thinking is always on/preserved; API docs expose usage object and `thinking`/`reasoning_content` behavior; public pages show cache-hit prices. | Probe or fixture must record whether numeric reasoning-token counts and `cached_tokens` appear in raw responses for the exact API path. |

Design refinement made:
- Added `REQ-016` through `REQ-018` and `AC-018` through `AC-020` to require a provider usage probe matrix/harness.
- Added DS-006 provider usage probe spine to the design spec.
- Added opt-in, low-budget, skip-recorded constraints for real provider API calls.

## Provider Probe Synthesis Update (2026-06-25)

Real probes now validate the main reasoning/cache assumptions for the priority providers except OpenAI, whose supplied key currently returns `invalid_api_key`. Claude, DeepSeek, GLM, and Gemini expose numeric reasoning/thinking token counts; Kimi exposes reasoning content but did not expose a numeric reasoning token count in tested responses. For Claude, DeepSeek, GLM, and Qwen-compatible shapes, the provider output token count already includes reasoning tokens. For Gemini Vertex `usageMetadata`, `candidatesTokenCount` excludes `thoughtsTokenCount`; billable output must be candidates plus thoughts. Kimi cache hits can appear as top-level `cached_tokens` and nested `prompt_tokens_details.cached_tokens`. Anthropic cache creation includes nested 5-minute and 1-hour token buckets, so exact cache-write pricing requires retaining that split or marking cache-write cost partial. DeepSeek Node adapter request shaping needs correction because root `thinking` works while manual `extra_body.thinking` did not affect the HTTP API.

## OpenAI Authentication Investigation Update (2026-06-25)

User suspected OpenAI may now require project API key/project ID configuration. Official OpenAI API reference still says application requests use standard API keys or short-lived access tokens with bearer authentication. The docs say `OpenAI-Organization` and `OpenAI-Project` headers are used when the caller belongs to more than one organization or accesses projects through a legacy user API key; usage is counted to the specified organization/project. The official Node SDK installed in the workspace (`openai` 6.22.0) supports `OPENAI_ORG_ID` and `OPENAI_PROJECT_ID` constructor defaults and sends `OpenAI-Organization` / `OpenAI-Project` headers when those values are set. The current `OpenAIResponsesLLM` constructs `new OpenAIClient({ apiKey, baseURL })`; because the SDK constructor defaults still read `OPENAI_ORG_ID` and `OPENAI_PROJECT_ID`, the production implementation can already use those optional env vars if present.

The current `.env.test` contains a single `OPENAI_API_KEY` entry and no `OPENAI_ORG_ID`, `OPENAI_ORGANIZATION`, or `OPENAI_PROJECT_ID`; the key has no whitespace or invalid local characters and starts with `sk-proj-`. Both `/v1/responses` and `/v1/models` return HTTP 401 `invalid_api_key`. Based on official docs and SDK source, this is more likely a bad/revoked/copied-wrong key or wrong key/account context than a mandatory project-ID requirement for all users. For better diagnostics, the probe harness now includes optional `OPENAI_ORG_ID` / `OPENAI_ORGANIZATION` and `OPENAI_PROJECT_ID` headers if present. Product recommendation: keep user setup simple with `OPENAI_API_KEY` only for the normal path, but document optional org/project env vars for multi-org or legacy-key routing and surface authentication errors distinctly from model/pricing failures.

## OpenAI Successful Retest / Root Cause Update (2026-06-25)

After comparing redacted metadata, the inherited shell `OPENAI_API_KEY` differed from the updated `autobyteus-ts/.env.test` key (`process.env` suffix differed from file suffix). The original probe harness initialized from `process.env` and only loaded `.env.test` values when a key was absent, so it kept using the stale shell key. Running with the shell OpenAI key unset made the `.env.test` key succeed. The probe harness was then changed so `.env.test` overrides inherited shell values for deterministic provider probing.

Successful OpenAI probe observations: Responses API non-stream with `gpt-5.4-mini` returned usage `{ input_tokens, input_tokens_details.cached_tokens, output_tokens, output_tokens_details.reasoning_tokens, total_tokens }`; observed example `output_tokens: 18`, `reasoning_tokens: 11`. Responses streaming final `response.completed.response.usage` returned the same usage shape; observed example `output_tokens: 20`, `reasoning_tokens: 13`. `/v1/models` also succeeded and showed `gpt-5.4-mini` available. Conclusion: OpenAI project API keys still work as normal bearer keys; project ID was not required for this key. The implementation recommendation remains: keep normal setup as `OPENAI_API_KEY` only, with optional `OPENAI_ORG_ID` / `OPENAI_PROJECT_ID` support for multi-org or legacy routing.

## Runtime Token Event Investigation Update (Codex + Claude Agent SDK) — 2026-06-25

User follow-up asked whether Codex runtime and Claude Agent SDK runtime token events were also investigated, because those runtime-native event streams may bypass the generic provider adapters and can expose reasoning/cache fields differently.

### Codex app-server runtime

Sources and commands:

- Installed local CLI: `codex --version` -> `codex-cli 0.142.2`.
- Local schema generation: `codex app-server generate-ts --experimental --out /tmp/codex-app-server-schema-probe`.
- Generated files inspected:
  - `/tmp/codex-app-server-schema-probe/v2/ThreadTokenUsageUpdatedNotification.ts`
  - `/tmp/codex-app-server-schema-probe/v2/ThreadTokenUsage.ts`
  - `/tmp/codex-app-server-schema-probe/v2/TokenUsageBreakdown.ts`
- Upstream primary source clone: `/tmp/openai-codex-probe`, `git clone --depth 1 --filter=blob:none --sparse https://github.com/openai/codex.git`, commit `c38b2e9ba69cb57d197c6e5ba78b5e52ae0870f9` (`Test executor-routed MCP OAuth token exchange (#29656)`).
- Upstream source files inspected:
  - `/tmp/openai-codex-probe/codex-rs/app-server-protocol/src/protocol/v2/thread.rs`
  - `/tmp/openai-codex-probe/codex-rs/protocol/src/protocol.rs`
  - `/tmp/openai-codex-probe/codex-rs/app-server/src/bespoke_event_handling.rs`
  - `/tmp/openai-codex-probe/codex-rs/app-server/tests/suite/v2/thread_resume.rs`
- Current AutoByteus files inspected:
  - `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread-token-usage.ts`
  - `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread-notification-handler.ts`
  - `autobyteus-server-ts/src/agent-execution/backends/codex/backend/codex-agent-run-backend.ts`
  - `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/thread/codex-thread.test.ts`

Findings:

- Codex app-server notification method is `thread/tokenUsage/updated` with payload `{ threadId, turnId, tokenUsage }`.
- `tokenUsage` contains `total`, `last`, and `modelContextWindow`.
- Each `TokenUsageBreakdown` contains exactly: `totalTokens`, `inputTokens`, `cachedInputTokens`, `outputTokens`, `reasoningOutputTokens`.
- Upstream `TokenUsage` in Codex core similarly has `input_tokens`, `cached_input_tokens`, `output_tokens`, `reasoning_output_tokens`, `total_tokens`.
- Therefore Codex runtime **does expose numeric cache and reasoning token fields**. Reasoning is an output sub-breakdown.
- Current AutoByteus `resolveCodexThreadTokenUsage` only maps `inputTokens`, `outputTokens`, and `totalTokens`; `cachedInputTokens` and `reasoningOutputTokens` survive only in `raw_usage_json` today and are not first-class token/cost fields.
- Focused temporary Vitest probe command `pnpm -C autobyteus-server-ts exec vitest run tests/unit/runtime-token-event-probe.test.ts --reporter=verbose` passed and confirmed that current Codex normalization drops first-class cache/reasoning fields when given the official schema shape.

Design consequence:

- Codex runtime token normalization must be extended in scope. It should map `last.cachedInputTokens` / `cached_input_tokens` to cache-read input tokens and `last.reasoningOutputTokens` / `reasoning_output_tokens` to `reasoning_output_tokens`; if only `total` is present, treat it as a cumulative snapshot with the existing `snapshot_series_key`. Preserve `modelContextWindow` and raw event JSON for diagnostics.
- No live billable Codex turn was run for this update because the app-server schema and upstream source give the exact event contract. If a downstream implementation wants empirical live confirmation, it should be opt-in and recorded as a cost-incurring runtime probe.

### Claude Agent SDK runtime

Sources and commands:

- Installed SDK package: `@anthropic-ai/claude-agent-sdk` version `0.2.71`.
- Installed Anthropic SDK beta types: `@anthropic-ai/sdk` version `0.78.0`.
- Current AutoByteus files inspected:
  - `autobyteus-server-ts/src/runtime-management/claude/client/claude-sdk-client.ts`
  - `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session.ts`
  - `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session-token-usage.ts`
  - `autobyteus-server-ts/src/agent-execution/backends/claude/events/claude-session-event-converter.ts`
  - `autobyteus-server-ts/tests/unit/agent-execution/backends/claude/session/claude-session-token-usage.test.ts`
- SDK type files inspected:
  - `autobyteus-server-ts/node_modules/@anthropic-ai/claude-agent-sdk/sdk.d.ts`
  - `node_modules/.pnpm/@anthropic-ai+sdk@0.78.0_zod@4.3.6/node_modules/@anthropic-ai/sdk/resources/beta/messages/messages.d.ts`
- Real low-cost runtime probe script: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-pricing-ui/tickets/done/token-usage-pricing-ui/claude-agent-sdk-runtime-probe.mjs`.
- Sanitized probe output: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-pricing-ui/tickets/done/token-usage-pricing-ui/probe-results/2026-06-25-claude-agent-sdk-runtime.json`.

Findings from real SDK probe:

- The SDK stream yielded `system/init`, then two `assistant` messages with the same id: first with content type `thinking`, second with content type `text`, then a terminal `result` message.
- Assistant chunk usage contained `input_tokens`, `cache_creation_input_tokens`, `cache_read_input_tokens`, and `output_tokens: 0`; these chunks should **not** be summed for token accounting.
- Terminal `result.usage` contained `input_tokens: 9393`, `cache_creation_input_tokens: 0`, `cache_read_input_tokens: 0`, `output_tokens: 16`, `cache_creation` TTL buckets, `server_tool_use`, `iterations`, `speed`, and `service_tier`.
- Terminal `result.modelUsage[claude-sonnet-4-6]` contained `inputTokens`, `outputTokens`, `cacheReadInputTokens`, `cacheCreationInputTokens`, `webSearchRequests`, `costUSD`, `contextWindow`, and `maxOutputTokens`.
- The SDK did emit a thinking content block, but the terminal usage did **not** expose a separate numeric thinking/reasoning token count in this probe. Output tokens are the billable output total.
- Installed SDK types define `SDKResultMessage.usage: NonNullableUsage`, `SDKResultMessage.modelUsage`, and `ModelUsage`, with cache fields and cost/context metadata. The beta `BetaUsage` type includes input/output/cache/server-tool/iteration fields, but no typed `output_tokens_details.thinking_tokens` field in this installed version.
- Current AutoByteus `buildClaudeTokenUsageEvent` correctly maps terminal result top-level input/output/cache fields, but it ignores `modelUsage` cost/context metadata and would drop first-class `output_tokens_details.thinking_tokens` if that field appears in raw future SDK output.
- Focused temporary Vitest probe command `pnpm -C autobyteus-server-ts exec vitest run tests/unit/runtime-token-event-probe.test.ts --reporter=verbose` passed and confirmed that current Claude SDK token usage normalization preserves fixture `output_tokens_details.thinking_tokens` only in raw JSON, not in first-class `reasoning_output_tokens`.

Design consequence:

- Claude Agent SDK runtime token accounting should emit one usage event from the terminal `result` chunk, not assistant chunks. It should use terminal `usage`/`modelUsage` for per-turn counts and preserve raw fields.
- Because this runtime may expose thinking content without numeric thinking token count, the UI should still show accurate output tokens/cost but no reasoning-token subline unless `reasoning_output_tokens` is numeric.
- The normalizer should defensively map `usage.output_tokens_details.thinking_tokens`, `usage.outputTokensDetails.thinkingTokens`, or equivalent future raw fields if present, but must leave `reasoning_output_tokens` null when the SDK does not provide a number.
- Provider-reported `total_cost_usd` / `modelUsage.costUSD` can be preserved in raw diagnostics, but the canonical cost estimate should still come from `TokenCostCalculator` unless the design explicitly adopts provider-reported cost as a separate field later.

### Runtime event artifact

Detailed runtime matrix: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-pricing-ui/tickets/done/token-usage-pricing-ui/runtime-token-event-probe-matrix.md`.

Additional primary web references for runtime-event update:

- OpenAI Codex app-server docs: `https://developers.openai.com/codex/app-server` documents `thread/tokenUsage/updated` as a turn event and reasoning item/delta events in the app-server stream.
- OpenAI Codex upstream source: `https://github.com/openai/codex` / app-server protocol and core protocol token usage structures were inspected through the local sparse clone listed above.
- Claude Agent SDK TypeScript docs: `https://platform.claude.com/docs/en/agent-sdk/typescript` documents `query()` returning an async generator of SDK messages, terminal `SDKResultMessage` carrying `usage`, `modelUsage`, and `total_cost_usd`, `ModelUsage` fields, and the `thinking` option.
