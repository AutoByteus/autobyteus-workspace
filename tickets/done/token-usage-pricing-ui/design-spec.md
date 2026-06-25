# Design Spec

## Current-State Read

AutoByteus already has a token usage spine, but the token/cost semantics are split unevenly across layers.

Current main flow:

`Provider LLM response -> autobyteus-ts provider token normalizer -> LlmPhase TOKEN_USAGE_UPDATED event -> server token usage enrichment -> TokenUsageSnapshotDeltaNormalizer -> TokenCostCalculator -> TokenUsageLedgerStore -> GraphQL run summary -> autobyteus-web token usage store -> TokenUsageMeterPanel`

Current ownership boundaries:

- `autobyteus-ts` owns built-in model identity, supported model registry, provider adapters, and first-pass provider usage normalization.
- `autobyteus-server-ts` owns token-usage event enrichment, cost estimation, ledger persistence/projection, and GraphQL summaries.
- `autobyteus-web` owns presentation, streaming/fetched summary state, and localization; it should not own provider pricing rules.

Current issues found:

- User-facing runtime navigation labels the token panel as `Usage`, while the panel title is `Token Meter`; settings also says `Token Usage Statistics`.
- `TokenUsageMeterPanel.vue` lays out token counts and related costs as separate single-value cards, forcing the user to visually join Input with Input Cost, Output with Output Cost, and Total with Total Est.
- MiniMax M2.7 remains in `supported-model-definitions.ts` and curated metadata, so it appears as supported in settings.
- `TokenPricingConfig` can only represent flat input/output prices and `LLMFactory.getModelPricingInfo` hardcodes USD. This is too weak for current provider prices: cache read/write, CNY pricing, and input-size tiers exist among supported providers.
- Server event types already include reasoning/billable fields, but `TokenCostCalculator` does not use them and leaves reasoning cost null.
- GraphQL/frontend summaries omit reasoning tokens/costs, so the UI cannot explain thinking-token billing.
- Gemini normalization captures `thoughtsTokenCount` as reasoning but reports only candidate tokens as output tokens; that can undercount billable output because Google states output price includes thinking tokens.
- OpenAI-compatible normalization misses Kimi's top-level `cached_tokens` field.
- Runtime-native token events also need coverage: Codex app-server already exposes `cachedInputTokens` and `reasoningOutputTokens`, but current AutoByteus Codex normalization maps only input/output/total; Claude Agent SDK emits terminal `result.usage` and `modelUsage`, while assistant thinking/text chunks should not be summed and may not expose numeric thinking-token counts.

The target design must preserve the existing spine and improve the owner responsibilities rather than introducing a parallel token-statistics path.

## Intended Change

Implement a coordinated token-pricing and token-meter improvement:

1. Rename user-facing "Usage" navigation/copy to token-oriented copy.
2. Redesign Token Meter metric cards into paired Input, Output, and Total cards.
3. Remove MiniMax M2.7 from supported model definitions and curated metadata.
4. Extend pricing metadata and server price application to represent current supported-provider price dimensions accurately enough to avoid known wrong estimates.
5. Normalize/cache/reasoning token fields that affect billing.
6. Expose reasoning output totals/cost sub-breakdowns through summaries and frontend display.
7. Preserve existing ledger readability without keeping legacy selectable model aliases.

### Refinement: Provider Usage Probing Is Required

Documentation research is not sufficient for token completeness. The implementation must include an explicit provider usage probe plan/harness, because providers differ in whether they expose reasoning token counts, whether output token counts already include hidden thinking, and which cache token fields appear in raw responses. Probes must be opt-in and safe by default because real calls can incur cost. When credentials are unavailable, the implementation must record skipped probes and still cover the normalizers with official-doc or sanitized raw-response fixtures.

Probe questions per provider/model family:

- Does the raw response expose reasoning/thinking token count? Example fields include `output_tokens_details.reasoning_tokens`, `output_tokens_details.thinking_tokens`, `usageMetadata.thoughtsTokenCount`, or provider-specific equivalents.
- If reasoning text/content is returned, is there also a numeric token count?
- Does the reported output/completion token count already include reasoning tokens, or must `billable_output_tokens` be computed as visible output plus reasoning?
- Does the raw response expose cache-hit/cache-write tokens? Example fields include `input_tokens_details.cached_tokens`, top-level `cached_tokens`, `cache_read_input_tokens`, `cache_creation_input_tokens`, `usageMetadata.total_cached_tokens`, or provider-specific equivalents.
- Are relevant fields only present on the final streaming event?

Observed probe decisions from 2026-06-25 are recorded in `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-pricing-ui/tickets/done/token-usage-pricing-ui/provider-usage-probe-matrix.md` and sanitized JSON files under `probe-results/`. The design now treats those observations as implementation input:

- Claude/Anthropic: `output_tokens_details.thinking_tokens` is present in non-stream usage and final stream `message_delta.usage`; `output_tokens` includes thinking tokens. Capture reasoning as a sub-breakdown and do not add it again to output cost. Preserve nested `cache_creation.ephemeral_5m_input_tokens` / `ephemeral_1h_input_tokens` if exact cache-write cost is implemented.
- Gemini Vertex: `candidatesTokenCount` excludes `thoughtsTokenCount`, while `totalTokenCount = promptTokenCount + candidatesTokenCount + thoughtsTokenCount` in tested responses. Set `billable_output_tokens = candidatesTokenCount + thoughtsTokenCount` when thoughts are present.
- DeepSeek/GLM: OpenAI-compatible `completion_tokens_details.reasoning_tokens` is present and included in `completion_tokens`; stream final usage includes the same fields. DeepSeek control parameters must be sent at request root; manual `extra_body.thinking` did not control the HTTP API.
- Kimi: `reasoning_content` is present, but numeric reasoning-token counts were not present in tested usage; do not fabricate `reasoning_output_tokens`. Cache hits appeared as top-level `cached_tokens` and nested `prompt_tokens_details.cached_tokens`.
- OpenAI: Responses non-stream and stream probes succeeded after fixing local env precedence; `output_tokens_details.reasoning_tokens` is present and included in `output_tokens`.

Runtime-native event decisions are recorded in `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-pricing-ui/tickets/done/token-usage-pricing-ui/runtime-token-event-probe-matrix.md`:

- Codex app-server: generated protocol schema from installed `codex-cli 0.142.2` and upstream OpenAI Codex source both show `thread/tokenUsage/updated` carries `tokenUsage.last`/`total` with `totalTokens`, `inputTokens`, `cachedInputTokens`, `outputTokens`, and `reasoningOutputTokens`. Map cache/reasoning first-class fields; do not leave them only in raw JSON.
- Claude Agent SDK: real SDK `query()` probe with thinking enabled emitted duplicate assistant messages (`thinking` then `text`) and one terminal `result`; only terminal `result.usage`/`modelUsage` should become the canonical usage event. No numeric thinking-token count was exposed in this runtime probe, so output tokens/cost remain accurate but `reasoning_output_tokens` stays null unless a future SDK usage field provides a number.

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Larger Requirement / Behavior Change / Cleanup
- Current design issue found (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Missing Invariant + Shared Structure Looseness + Legacy Or Compatibility Pressure
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): Yes
- Evidence: The richer token usage payload already exists but is not used by cost calculation or summaries; the pricing config cannot encode provider price dimensions found during pricing investigation; MiniMax M2.7 is a stale legacy registry entry; the UI layout splits related data.
- Design response: Extend the existing shared pricing model and server calculator; do not create a second pricing subsystem. Remove stale model support cleanly. Keep frontend presentation-only.
- Refactor rationale: Correct pricing cannot be achieved by changing literal numbers only because some supported models require cache and tier/currency metadata. Thinking-token support also cannot be achieved by UI changes only because server summaries do not expose the data.
- Intentional deferrals and residual risk, if any: No invoice reconciliation or currency conversion service is in scope. Exact provider prices that remain ambiguous after implementation verification must remain untrusted/partial rather than guessed.

## Terminology

- `Provider usage`: raw or normalized token counts reported by the provider SDK/API for one call or snapshot.
- `Reported tokens`: token counts copied from provider usage before server delta normalization.
- `Accounting tokens`: per-event delta tokens used by the ledger/meter after `TokenUsageSnapshotDeltaNormalizer`.
- `Billable output tokens`: output-side tokens that should be multiplied by output price. This includes thinking/reasoning tokens when provider billing includes them.
- `Reasoning output tokens`: provider-reported thinking/reasoning subset, exposed as a breakdown of output, not as a second independent cost bucket.
- `Trusted price`: catalog price dimensions verified from official/public provider sources for the exact model/region/tier represented.

## Design Reading Order

1. Follow the data-flow spines to see where authority changes hands.
2. Read the pricing and token-accounting ownership decisions.
3. Read file responsibility mappings for concrete implementation placement.
4. Read migration/refactor sequence and tests.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required removal in scope: MiniMax M2.7 supported model definition and curated metadata.
- No compatibility alias should preserve `minimax-m2.7`, `MiniMax-M2.7`, or any old value as selectable model support.
- Historical ledger events that already mention M2.7 remain data records; they do not require a selectable model definition or a pricing alias.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | Provider LLM usage response | Token Meter display | Server token-usage accounting, with shared provider normalization | Main feature path for token counts, costs, and reasoning display. |
| DS-002 | Primary End-to-End | Built-in supported model/pricing catalog | Server cost calculation | `autobyteus-ts` model catalog + server price provider | Ensures price facts are owned once and consumed by the calculator. |
| DS-003 | Bounded Local | User opens right-side token tab | Paired metric cards render | `autobyteus-web` shell/token meter UI | Covers user-visible rename and layout. |
| DS-004 | Return-Event | Live `TOKEN_USAGE_UPDATED` event | Frontend store summary state | Server event enrichment + web token store | Keeps live UI consistent with fetched GraphQL summaries. |
| DS-005 | Bounded Local | Settings API-key/model list refresh | Supported model cards | `autobyteus-ts` registry through existing model APIs | Ensures MiniMax M2.7 removal appears everywhere model support is listed. |
| DS-006 | Bounded Local | Opt-in provider probe command/harness | Provider usage evidence matrix | Shared LLM provider-normalization owner | Verifies real raw response usage fields for reasoning/cache semantics when credentials are available. |
| DS-007 | Runtime-Native Event | Codex/Claude runtime token event | Canonical token usage event | Runtime backend token-normalization owners | Ensures non-provider-adapter runtimes preserve cache/reasoning fields and terminal-event semantics. |

## Primary Execution Spine(s)

- DS-001: `Provider response usage -> provider normalizer -> LlmTokenUsageObservation -> LlmPhase token usage notification -> createTokenUsageUpdatedPayload -> TokenUsageSnapshotDeltaNormalizer -> TokenCostCalculator -> TokenUsageLedgerStore -> GraphQL run summary -> tokenUsageMeterStore -> TokenUsageMeterPanel`
- DS-007: `Codex thread/tokenUsage/updated or Claude SDK result chunk -> runtime-specific token event resolver -> TokenUsageUpdatedPayload -> TokenUsageSnapshotDeltaNormalizer -> TokenCostCalculator -> TokenUsageLedgerStore -> GraphQL/live summary -> TokenUsageMeterPanel`
- DS-002: `supportedModelDefinitions pricing config -> LLMFactory.getModelPricingInfo -> TokenPriceConfigProvider -> TokenCostCalculator.applyPrice -> enriched TOKEN_USAGE_UPDATED event`
- DS-003: `right-tab registry/localization -> active tab "usage" internal id -> TokenUsageMeterPanel -> TokenMetricPairCard layout`
- DS-005: `supportedModelDefinitions -> provider model list API/settings view -> API Key Management model cards`
- DS-006: `opt-in probe config + provider key -> minimal provider call -> raw usage capture -> sanitized evidence row -> normalizer fixture/test decision`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | Each provider call emits normalized usage. The server converts it into accounting deltas, enriches it with price/cost, persists it, projects summaries, and the frontend displays the summary. | Provider usage, token observation, token event payload, cost-enriched ledger event, run summary, UI summary card | Server token usage after provider normalization | Provider docs, localization, test fixtures, generated GraphQL types |
| DS-002 | The model catalog carries verified pricing dimensions. The server price provider maps catalog info into a calculator-ready config and the calculator selects any applicable tier based on the event input tokens. | Token pricing config, model pricing info, token price config, selected tier | `autobyteus-ts` catalog for facts; server calculator for event-specific application | Pricing source notes, official docs, currency/mixed-currency summary handling |
| DS-003 | The visible tab and meter copy come from localization. The internal `usage` id can remain stable while labels become token-focused and the card layout pairs counts with cost estimates. | Right tab, localization key, Token Meter panel, metric pair card | Frontend shell/UI | Responsive CSS, localization generated files |
| DS-004 | Live enriched token events update the same summary fields that GraphQL fetch returns so streaming and fetched views agree. | Enriched token event, Pinia store summary, GraphQL run summary | Server event contract + frontend store | Dedupe keys, mixed status aggregation |
| DS-005 | Removing the authoritative MiniMax M2.7 registry entry removes it from downstream model selection/listing. | Supported model definition, curated metadata, settings model card | `autobyteus-ts` model registry | Tests that prevent stale model reintroduction |
| DS-006 | A probe harness performs explicit, low-budget, opt-in calls only when keys are present, records raw usage field shapes, and turns sanitized examples into fixtures or implementation evidence. | Probe command, provider adapter, raw usage JSON, evidence matrix, fixture | Shared LLM provider-normalization owner | API keys, cost limits, sanitization, skipped-probe reasons |
| DS-007 | Runtime-native token streams produce canonical token usage events without detouring through frontend logic or generic provider parsing. Codex maps app-server cache/reasoning fields; Claude SDK maps terminal result usage and ignores non-terminal assistant chunks for accounting. | Runtime token event, runtime resolver, canonical token usage payload, ledger event | Codex/Claude runtime backend token-normalization owners | Runtime schemas, raw event preservation, terminal chunk detection, duplicate chunk avoidance |

## Spine Actors / Main-Line Nodes

- Provider adapters and usage normalizers in `autobyteus-ts/src/llm/api/*token-usage-normalizer.ts`
- `LlmTokenUsageObservation` in `autobyteus-ts/src/llm/utils/llm-token-usage-observation.ts`
- `supportedModelDefinitions` and `TokenPricingConfig` in `autobyteus-ts`
- `LLMFactory.getModelPricingInfo`
- `createTokenUsageUpdatedPayload`
- `TokenUsageSnapshotDeltaNormalizer`
- `TokenCostCalculator`
- `TokenUsageLedgerStore` and token statistics provider
- GraphQL token usage types/resolvers
- `tokenUsageMeterStore`
- `TokenUsageMeterPanel.vue`
- Settings/API key model display fed by supported-model APIs
- Opt-in provider usage probe harness/evidence matrix

## Ownership Map

- `autobyteus-ts` provider normalizers own provider-specific field extraction and conversion into the common observation shape. They must hide raw provider field naming differences such as `thoughtsTokenCount`, `reasoning_tokens`, `thinking_tokens`, and `cached_tokens`.
- The provider usage probe harness belongs near the provider-normalization/test tooling boundary. It must collect evidence for normalizer behavior, not become a production runtime dependency.
- Runtime-native token event resolvers belong with their runtime backends. Codex and Claude Agent SDK should reuse the canonical server token usage payload but must not push Codex/Claude-specific raw parsing into the frontend or generic provider normalizers.
- `autobyteus-ts` model catalog owns built-in model support and verified default pricing facts. It must not encode server UI formatting or ledger summary decisions.
- `LLMFactory.getModelPricingInfo` is a public lookup boundary for catalog pricing facts. It should return enough pricing metadata/rules for the server to price an event; it should not silently hardcode USD when the catalog has another currency.
- `autobyteus-server-ts` token usage enrichment owns accounting deltas, cost calculation, cost status, cost snapshots, and summary projections.
- `TokenCostCalculator` owns applying selected price dimensions to one token event. It must prevent double-counting reasoning tokens.
- `TokenUsageLedgerStore` owns summary aggregation safety, including reasoning totals and currency consistency.
- `autobyteus-web` owns display and localization only. It may sum streamed deltas for immediate UI, but must use cost fields supplied by server events/GraphQL.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `LLMFactory.getModelPricingInfo` | `supportedModelDefinitions` / `TokenPricingConfig` | Stable public boundary for server pricing lookup | Event-specific cost calculation or UI labels |
| GraphQL token usage run summary queries | `TokenUsageLedgerStore` | Frontend fetch boundary for run/team/member summaries | Provider pricing rules or per-provider usage parsing |
| `useRightSideTabs` | Shell UI state | Stable tab ids and labels | Token meter data semantics |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| `minimax-m2.7` entry in `supported-model-definitions.ts` | User requested removal; provider docs categorize M2.7 as legacy; stale support should not appear as selectable | No replacement for M2.7; MiniMax support continues through `minimax-m3` | In This Change | Remove cleanly without alias. |
| `MiniMax-M2.7` curated metadata | Metadata for removed supported model | No replacement; M3 metadata remains | In This Change | Tests should catch stale metadata if model list and metadata drift. |
| Stale flat DeepSeek V4-Pro price | Official price changed/current source disagrees | Correct DeepSeek V4-Pro pricing config | In This Change | Update to `$0.435/$0.87` per 1M. |
| Blind flat Qwen/GLM prices where not exact | They can produce wrong estimates while marked trusted | Region/currency/tier-aware pricing or missing/partial status | In This Change | Do not preserve wrong estimates for convenience. |
| Six independent Token Meter metric cards | Separates conceptually paired count/cost data | Three paired metric cards | In This Change | Component can be local to panel unless reuse emerges. |

## Return Or Event Spine(s) (If Applicable)

- Live event flow: `TokenCostCalculator.enrichCost(payload) -> TokenUsageEventPersistenceProcessor -> event stream/websocket -> tokenUsageMeterStore.applyTokenUsageUpdated -> active run/team summary -> TokenUsageMeterPanel rerender`.
- Fetched summary flow: `GraphQL get*TokenUsageSummary -> TokenUsageLedgerStore.buildSummary -> TokenUsageRunSummaryGraphql -> TOKEN_USAGE_RUN_SUMMARY_FIELDS -> tokenUsageMeterStore.fetch*Summary -> TokenUsageMeterPanel`.

Live and fetched flows must expose the same token/cost fields for input, output, total, reasoning output, and currency/status.

## Bounded Local / Internal Spines (If Applicable)

- `TokenUsageSnapshotDeltaNormalizer`: `reported tokens -> per-call direct accounting OR cumulative snapshot delta -> meter delta fields`. This matters because cost calculation should use accounting/billable deltas, not cumulative totals, for ledger events.
- `TokenCostCalculator`: `payload + price rules -> selected tier -> input/cache/output/reasoning subcosts -> api cost status`. This is the local spine where pricing correctness is enforced.
- `tokenUsageMeterStore`: `stream event or GraphQL summary -> dedupe/merge -> in-memory run/team summary`. This must mirror server summary fields but not reinterpret provider price policy.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Official pricing source research | DS-002 | Model catalog maintainer | Provides evidence for catalog numbers and trust decisions | Pricing changes frequently | Hardcoding unsourced values as trusted. |
| Localization generated files | DS-003 | Frontend UI | Keep English/Chinese generated/static localization in sync | Project has generated localization files | UI tests fail or untranslated copy appears. |
| GraphQL codegen | DS-001, DS-004 | Frontend store/types | Regenerate operation types if schema/query changes require it | Summary fields are transport contract | Runtime query/type mismatch. |
| Unit/component tests | All | Each owner | Verify owner-specific behavior | Change crosses packages | Bugs hidden until E2E. |
| Provider usage probe evidence | DS-001, DS-002, DS-006 | Provider-normalization owner | Verify real raw response field shapes when credentials are available and record skipped probes otherwise | Docs alone may not reveal whether output includes reasoning or whether cache fields are present | Hard-coding provider assumptions that make token stats inaccurate. |
| Runtime-native token event evidence | DS-007 | Codex/Claude runtime backend owners | Preserve runtime-specific cache/reasoning/result semantics before canonical accounting | Codex exposes reasoning/cache in its app-server schema; Claude SDK may emit thinking content without numeric thinking tokens | Under-counting Codex reasoning/cache or double-counting Claude assistant chunk usage. |
| Mixed-currency display | DS-001, DS-002 | Server summary + UI formatting | Prevent invalid aggregate cost labels | GLM may be CNY while others are USD | Displaying summed CNY+USD as a single currency. |
| Historical ledger rows | DS-001 | Server ledger | Keep old rows readable without backfill | Existing persisted data can contain old fields/model names | Treating historical data as supported model catalog. |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Provider token extraction | `autobyteus-ts/src/llm/api/*token-usage-normalizer.ts` | Extend | Existing normalizers already map usage fields | N/A |
| Provider usage response probing | Existing package test/script tooling near `autobyteus-ts` provider adapters | Create/Extend | Current code has normalizers but no durable way to inspect raw provider usage fields safely | If no script pattern exists, create a small opt-in probe harness under the shared LLM package or tests. |
| Shared token observation shape | `LlmTokenUsageObservation` | Extend/Reuse | Already has reasoning and billable fields | N/A |
| Built-in price metadata | `TokenPricingConfig` + `supportedModelDefinitions` | Extend | Existing ownership is correct but shape is too flat | N/A |
| Server price application | `TokenCostCalculator` | Extend | Existing calculator is the right owner | N/A |
| Token ledger summary | `TokenUsageLedgerStore` / statistics provider | Extend | Existing projection owner | N/A |
| Frontend meter state | `tokenUsageMeterStore` | Extend | Existing live/fetched summary owner | N/A |
| UI cards | `TokenUsageMeterPanel.vue` local component | Extend | Layout is local; no cross-feature component needed yet | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Shared LLM model catalog (`autobyteus-ts`) | Supported model list, pricing dimensions, provider usage normalization, opt-in provider usage probes | DS-001, DS-002, DS-005, DS-006 | Provider adapters, server price provider | Extend | Add cache/currency/tier fields; remove M2.7; add probe evidence path for raw usage fields. |
| Server token usage accounting (`autobyteus-server-ts/src/token-usage`) | Cost application, ledger summaries, statistics | DS-001, DS-002, DS-004 | Token event pipeline, GraphQL | Extend | Main correctness owner for cost and mixed-currency aggregation. |
| Runtime backends (`autobyteus-server-ts/src/agent-execution/backends/{codex,claude}`) | Runtime-native token event extraction before canonical accounting | DS-007 | Token event pipeline | Extend | Map Codex app-server cache/reasoning fields and Claude SDK terminal result usage without frontend/provider-normalizer bypasses. |
| GraphQL token usage API | Summary schema/resolvers | DS-001, DS-004 | Web meter store | Extend | Add reasoning output fields. |
| Web token meter UI (`autobyteus-web`) | Copy, layout, display of provided fields | DS-003, DS-004 | User-facing shell | Extend | No provider pricing logic. |
| Settings model management | Supported model list display | DS-005 | API key/settings user | Reuse | M2.7 disappearance should come from registry. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/llm/utils/llm-config.ts` | Shared LLM catalog | Token pricing config type | Add currency/cache/tier pricing fields and serialization | Existing config type owner | Yes |
| `autobyteus-ts/src/llm/supported-model-definitions.ts` | Shared LLM catalog | Built-in model registry | Correct prices, add tier configs, remove M2.7 | Authoritative model list | Yes |
| `autobyteus-ts/src/llm/metadata/curated-model-metadata.ts` | Shared LLM catalog | Model metadata | Remove M2.7 metadata | Existing metadata table | No |
| Provider normalizers | Shared LLM provider adapters | Provider field extraction | Map reasoning/cache/billable fields correctly | Each provider keeps provider-specific parsing local | Yes |
| Provider probe harness/evidence artifact | Shared LLM provider adapters/test tooling | Investigation/test support | Safely capture raw usage field shapes or record skipped real probes | Provider-specific assumptions need evidence | Yes |
| `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread-token-usage.ts` | Codex runtime backend | Codex app-server token usage resolver | Map `cachedInputTokens`/`reasoningOutputTokens` and `modelContextWindow`; keep last-vs-total snapshot semantics | Existing Codex token event owner | Yes |
| `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session-token-usage.ts` | Claude Agent SDK runtime backend | Claude SDK result usage resolver | Emit usage from terminal result chunk; map cache fields; map future numeric thinking detail defensively; preserve `modelUsage` raw diagnostics | Existing Claude token event owner | Yes |
| `autobyteus-server-ts/src/token-usage/pricing/token-price-config-provider.ts` | Server token usage | Price lookup adapter | Map expanded model pricing info into calculator config | Existing boundary from server to factory | Yes |
| `autobyteus-server-ts/src/token-usage/pricing/token-cost-calculator.ts` | Server token usage | Cost calculation | Apply cache/tier/billable/reasoning costs | Existing owner for cost | Yes |
| `autobyteus-server-ts/src/token-usage/providers/token-usage-ledger-store.ts` | Server token usage | Run/team/member summaries | Sum reasoning fields and handle currency consistency | Existing summary owner | Yes |
| `autobyteus-server-ts/src/token-usage/providers/statistics-provider.ts` | Server token usage | Period/model statistics | Include reasoning fields and currency-safe totals | Existing stats owner | Yes |
| `autobyteus-server-ts/src/api/graphql/types/token-usage-stats.ts` | GraphQL API | Summary transport | Expose reasoning fields | Existing token usage API | Yes |
| `autobyteus-web/types/tokenUsageMeter.ts` | Web token meter | Frontend summary types | Add reasoning fields | Existing type owner | Yes |
| `autobyteus-web/graphql/queries/token_usage_meter_queries.ts` | Web token meter | GraphQL operation | Fetch reasoning fields | Existing query fragment owner | Yes |
| `autobyteus-web/stores/tokenUsageMeterStore.ts` | Web token meter | Live/fetched summary state | Aggregate reasoning fields and mixed status | Existing store owner | Yes |
| `autobyteus-web/components/workspace/usage/TokenUsageMeterPanel.vue` | Web token meter | UI presentation | Paired cards and output reasoning subline | Existing panel owner | Yes |
| Localization files | Web localization | UI copy | Rename Usage -> Token and Token Usage Statistics -> Token Statistics | Existing copy owner | No |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Pricing dimensions and tier rules | `TokenPricingConfig` in `llm-config.ts` | Shared LLM catalog | Used by model definitions, factory, server price provider | Yes | Yes | A server-only or frontend-visible pricing calculator |
| Model pricing lookup output | `ModelPricingInfo` in `llm-factory.ts` | Shared LLM catalog boundary | Contract to server | Yes | Yes | A UI display DTO |
| Reasoning/billable token fields | Existing `LlmTokenUsageObservation` and server `TokenUsageUpdatedPayload` | Shared usage / server event | Already cross provider/server/frontend | Yes | Yes | A second parallel "thinking usage" event |
| Runtime-native cache/reasoning fields | Existing `TokenUsageUpdatedPayload` plus Codex/Claude resolvers | Runtime backend/server event | Codex/Claude bypass generic provider normalizers | Yes | Yes | Parsing runtime-specific token fields in frontend or cost calculator |
| Paired metric UI shape | Local `MetricPairCard` in `TokenUsageMeterPanel.vue` | Web token meter | Only used by token panel currently | N/A | N/A | A generic design-system component prematurely |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `TokenPricingConfig` | Currently No | No | High | Add explicit currency/cache/tier semantics; trusted status per dimension/rule. |
| `LlmTokenUsageObservation` | Mostly Yes | Yes | Medium | Define output tokens as billable output for provider-normalized events where thinking is output-priced, and use `reasoning_output_tokens` as subset. |
| `TokenUsageUpdatedPayload` | Mostly Yes | Yes | Medium | Ensure calculator uses `billable_output_tokens` and summaries expose reasoning fields. |
| `TokenUsageRunSummaryPayload` / GraphQL summary | Currently No for reasoning | No | Medium | Add reasoning output token/cost fields. |
| Frontend `TokenUsageRunSummary` | Currently No for reasoning | No | Medium | Mirror GraphQL/server fields; no local pricing policy. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/llm/utils/llm-config.ts` | Shared LLM catalog | Pricing config | Extend `TokenPricingConfigInput/Data` with `currency`, `pricingSource`, optional effective dates, cache read/write prices, and optional input-token tier rules. Preserve from/to dict support for old flat configs. | Existing config owner | Yes |
| `autobyteus-ts/src/llm/supported-model-definitions.ts` | Shared LLM catalog | Built-in model registry | Update verified prices, remove M2.7, encode trusted tier/cache/currency fields. | Authoritative registry | Yes |
| `autobyteus-ts/src/llm/metadata/curated-model-metadata.ts` | Shared LLM catalog | Curated metadata | Remove MiniMax-M2.7 metadata. | Existing metadata owner | No |
| `autobyteus-ts/src/llm/llm-factory.ts` | Shared LLM catalog boundary | Pricing lookup | Return expanded pricing info and trusted dimensions/rules; stop hardcoding USD. | Existing public lookup | Yes |
| `autobyteus-ts/src/llm/api/gemini-token-usage-normalizer.ts` | Provider adapter | Gemini usage parsing | Make billable output include thoughts; preserve `reasoningOutputTokens`. | Provider-specific rule | Yes |
| `autobyteus-ts/src/llm/api/openai-compatible-token-usage-normalizer.ts` | Provider adapter | OpenAI-compatible parsing | Read top-level `cached_tokens` as cache-read fallback and keep reasoning/thinking details. | Provider-compatible rule | Yes |
| Provider usage probe script or focused test fixture path under `autobyteus-ts` | Provider adapter/test tooling | Probe support | Run opt-in low-budget calls, save sanitized usage shapes, and produce provider probe matrix evidence | Avoids relying only on docs for output/reasoning/cache semantics | Yes |
| `autobyteus-server-ts/src/token-usage/pricing/token-price-config-provider.ts` | Server token usage | Catalog adapter | Map expanded `ModelPricingInfo` to `TokenPriceConfig`, including tiers/effective metadata. | Existing boundary adapter | Yes |
| `autobyteus-server-ts/src/token-usage/pricing/token-cost-calculator.ts` | Server token usage | Cost calculator | Select tier, calculate standard/cache input, billable output, reasoning output subcost, status, and price snapshot. | Existing calculator | Yes |
| `autobyteus-server-ts/src/agent-execution/domain/agent-run-token-usage.ts` | Server event domain | Canonical event/summary types | Add reasoning fields to `TokenUsageRunSummaryPayload`; keep existing event fields. | Event contract owner | Yes |
| `autobyteus-server-ts/src/token-usage/providers/token-usage-ledger-store.ts` | Server token usage | Summary projection | Sum reasoning output tokens/cost and handle currency-safe aggregate totals. | Summary owner | Yes |
| `autobyteus-server-ts/src/token-usage/domain/models.ts` | Server token usage | Statistics DTO | Add reasoning token/cost fields if statistics API exposes them. | Existing stats model | Yes |
| `autobyteus-server-ts/src/token-usage/providers/statistics-provider.ts` | Server token usage | Period stats projection | Include reasoning and currency-safe totals. | Existing stats owner | Yes |
| `autobyteus-server-ts/src/api/graphql/types/token-usage-stats.ts` | GraphQL API | Token usage API | Expose reasoning fields for run summaries/statistics. | Existing API type | Yes |
| `autobyteus-web/graphql/queries/token_usage_meter_queries.ts` | Web token meter | GraphQL query | Request new summary fields. | Existing fragment owner | Yes |
| `autobyteus-web/types/tokenUsageMeter.ts` | Web token meter | Frontend DTO | Add reasoning fields to event/summary types. | Existing type owner | Yes |
| `autobyteus-web/stores/tokenUsageMeterStore.ts` | Web token meter | Pinia store | Aggregate reasoning deltas/costs and currency/status consistently with server events. | Existing store owner | Yes |
| `autobyteus-web/components/workspace/usage/TokenUsageMeterPanel.vue` | Web token meter | UI panel | Render paired metric cards and conditional reasoning subline. | Existing panel owner | Yes |
| `autobyteus-web/localization/messages/en/shell.ts`, `zh-CN/shell.ts` | Web localization | Shell copy | Rename right-tab label and add labels for paired card tokens/cost and thinking subline. | Existing shell copy | No |
| `autobyteus-web/localization/messages/en/settings.ts`, `zh-CN/settings.ts`, generated files | Web localization | Settings copy | Rename token statistics navigation/headings. | Existing settings copy | No |
| Relevant tests under `autobyteus-ts/tests`, `autobyteus-server-ts/src/**/__tests__`, `autobyteus-web/**/__tests__` | Package test suites | Validation | Cover registry/pricing/normalizer/calculator/store/UI. | Existing test ownership | Yes |

## Ownership Boundaries

- Provider usage normalization stops at a clean, provider-independent observation. It should not know UI display wording or ledger aggregation.
- Model catalog pricing stops at verified price facts and rules. It should not calculate event costs because tier selection depends on event usage.
- Server cost calculation owns event-specific price application and cost status. It should not mutate supported model registry.
- Server summaries own aggregation semantics, including currency safety. The frontend should not fix invalid summaries after the fact.
- Frontend components own only display structure and labels.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `LLMFactory.getModelPricingInfo` | Supported model definitions, pricing config shape | Server `TokenPriceConfigProvider` | Server importing model definitions directly or duplicating price tables | Extend `ModelPricingInfo` contract. |
| Provider normalizer functions | Provider raw usage field names | LLM adapters/stream handlers and provider probe harness | Server parsing raw provider-specific `usage` JSON to find `thoughtsTokenCount`/`cached_tokens` | Extend `LlmTokenUsageObservation` and normalizer tests/fixtures. |
| `TokenCostCalculator.applyPrice` | Cost formula, tier selection, missing-dimension status | Token event enrichment pipeline | Frontend or ledger calculating provider-specific costs | Add calculator inputs/price config fields. |
| `TokenUsageLedgerStore` summary methods | Event aggregation, currency consistency | GraphQL resolvers | GraphQL resolver manually summing event fields | Extend summary payload. |
| GraphQL token usage summary | Transport contract to web | `tokenUsageMeterStore` | Web querying ledger/storage directly | Add schema fields/query fragment. |

## Dependency Rules

- `autobyteus-server-ts` may depend on `LLMFactory.getModelPricingInfo`; it must not duplicate supported model price tables.
- `autobyteus-web` may depend on GraphQL summary fields and live token events; it must not depend on `autobyteus-ts` model definitions or provider docs for cost logic.
- Provider normalizers and opt-in probe tooling may inspect raw provider SDK response shapes; server calculator should only inspect normalized event fields and price config.
- Real provider usage probes must never run in ordinary unit tests by default. They require explicit environment keys and an opt-in flag, and must use minimal prompts/output budgets.
- Tests may use fixed provider usage fixtures but should assert normalized, owner-level behavior rather than raw UI internals.
- Localization keys can keep old internal key names if cheaper, but the displayed values must change. Do not rename internal keys in a partial way that breaks generated files.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `LLMFactory.getModelPricingInfo(input)` | Model price facts | Resolve catalog pricing/rules for model identity | provider + modelIdentifier/modelValue/canonicalName | Add expanded dimensions/rules; no hardcoded USD. |
| `TokenPriceConfigProvider.resolvePrice(payload)` | Calculator price config | Adapt catalog info to server price config | token event model identity | May pass observed date if effective pricing is added later. |
| `TokenCostCalculator.applyPrice(payload, price)` | Event cost estimate | Apply price to one event's accounting/billable tokens | normalized token event payload | Selects tier using event input tokens. |
| `get*TokenUsageSummary` GraphQL queries | Run/team/member summary | Return summary fields for UI | run id/team id/member selector | Add reasoning fields. |
| `tokenUsageMeterStore.applyTokenUsageUpdated(payload)` | Live frontend summary | Merge enriched event into summary | token usage event id/idempotency key | No provider pricing logic. |
| Provider usage probe command/harness | Raw provider usage evidence | Inspect actual usage response fields and produce sanitized evidence/fixtures | provider + model + explicit opt-in credentials | Not a production runtime path; skip explicitly when keys are absent. |

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `LLMFactory.getModelPricingInfo` | Yes | Mostly | Medium | Continue accepting provider + identifiers; ensure canonical/value/identifier matching is deterministic in tests. |
| `TokenCostCalculator.applyPrice` | Yes | Yes | Low | Add tier-selection helper under calculator if logic grows. |
| GraphQL member summary query | Yes | Medium | Medium | Existing memberAgentRunId/memberRouteKey selector is acceptable; not part of this change. |
| `useRightSideTabs` | Yes | Yes | Low | Keep internal id stable unless full rename is done atomically. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| User-visible runtime tab | `Usage` -> `Token` | Yes after change | Low | Update localization. |
| Panel title | `Token Meter` | Yes | Low | Keep. |
| Settings screen | `Token Usage Statistics` -> `Token Statistics` | Yes after change | Low | Update localization/tests. |
| Reasoning tokens | `reasoningOutputTokens` / display "thinking tokens" | Yes | Medium | Use provider-neutral field name in code and user-friendly "thinking" label in UI. |
| Output tokens | Output includes billable output-side tokens | Yes if documented | Medium | Provider normalizers and tests must enforce this. |

## Applied Patterns (If Any)

- Existing boundary-adapter pattern: `TokenPriceConfigProvider` adapts `LLMFactory` output into server calculator config. Extend this instead of adding server-side catalog tables.
- Existing projection pattern: `TokenUsageLedgerStore` builds summary payloads from events. Extend this projection instead of having GraphQL or web recompute summaries.
- Local presentational component pattern: Keep the paired metric card local to `TokenUsageMeterPanel.vue` unless another screen needs it.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/llm/utils/llm-config.ts` | File | Shared LLM config | Expanded pricing config serialization | Existing config type home | Server cost formulas |
| `autobyteus-ts/src/llm/supported-model-definitions.ts` | File | Built-in model registry | Supported model list and verified default pricing | Current authoritative model table | UI labels or ledger code |
| `autobyteus-ts/src/llm/api/*token-usage-normalizer.ts` | Files | Provider adapters | Provider-specific usage field normalization | Existing provider ownership | Price multiplication |
| `autobyteus-server-ts/src/agent-execution/backends/codex/thread/` | Folder | Codex runtime backend | Codex app-server token usage resolver and lifecycle readiness | Existing runtime backend folder | Frontend token UI |
| `autobyteus-server-ts/src/agent-execution/backends/claude/session/` | Folder | Claude Agent SDK runtime backend | Terminal result usage resolver and SDK stream handling | Existing runtime backend folder | Generic provider normalizers |
| `autobyteus-server-ts/src/token-usage/pricing/` | Folder | Server pricing | Price config adapter and calculator | Existing pricing folder | Supported model registry |
| `autobyteus-server-ts/src/token-usage/providers/` | Folder | Server projections/providers | Ledger and statistics projections | Existing projection home | Provider raw parsing |
| `autobyteus-server-ts/src/api/graphql/types/token-usage-stats.ts` | File | GraphQL API | Token usage schema/resolvers | Existing API home | Cost formulas beyond calling store |
| `autobyteus-web/components/workspace/usage/` | Folder | Web Token Meter | Token meter panel and local metric component | Existing UI folder | Pricing source data |
| `autobyteus-web/stores/tokenUsageMeterStore.ts` | File | Web Token Meter state | Live/fetched summary state | Existing store | Provider-specific pricing rules |
| `autobyteus-web/localization/messages/` | Folder | Web localization | User-visible copy | Existing localization owner | Business logic |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `autobyteus-ts/src/llm` | Main-Line provider/catalog | Yes | Low | Shared LLM ownership already established. |
| `autobyteus-server-ts/src/token-usage/pricing` | Main-Line domain-control | Yes | Low | Calculator/provider split is clear. |
| `autobyteus-server-ts/src/token-usage/providers` | Persistence/projection provider | Yes | Low | Summary projections remain here. |
| `autobyteus-web/components/workspace/usage` | Presentation | Yes | Low | UI-only folder. |
| `autobyteus-web/localization/messages` | Off-spine concern | Yes | Low | Copy-only. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Paired card layout | `Input` card shows `Tokens: 12,345` and `Cost: $0.02`; `Output` card shows `Tokens: 1,200`, `Cost: $0.01`, and optional `includes 300 thinking tokens`. | Six equal cards where `Input` and `Input Cost` are separated across rows. | Matches the user's conceptual grouping request. |
| Reasoning cost | `estimatedApiOutputCost` includes billable output, while `estimatedApiReasoningOutputCost` is a sub-breakdown displayed only if non-zero. | Add `reasoning cost` to output cost again when calculating total. | Prevents double counting. |
| Gemini normalization | Probe/docs decide whether `total_output_tokens`/`candidatesTokenCount` already includes `thoughtsTokenCount`; if not, set `billableOutputTokens = visible output + thoughts` while preserving `reasoningOutputTokens`. | Assume all Gemini response APIs include thoughts in the same field without evidence. | Google bills output including thinking tokens, but response field shape differs by API. |
| Tiered pricing | MiniMax M3 config encodes <=512k and >512k input-token tiers and calculator selects tier from event request input tokens. | Catalog stores only `$0.30/$1.20` while marking all M3 contexts trusted. | Avoids known underestimation for long context. |
| Ambiguous pricing | Leave Kimi HighSpeed/Qwen/GLM dimension untrusted until exact region/currency/tier is explicit. | Guess a flat USD price and show `estimated`. | Better no estimate than wrong estimate. |
| M2.7 removal | Delete model definition and metadata; old ledger records remain just records. | Keep hidden alias so old names still resolve as supported. | User requested removal, not deprecation. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep `minimax-m2.7` hidden alias | Could preserve old config/model identifiers | Rejected | Remove selectable support and metadata; old ledger rows remain historical data. |
| Keep user-facing `Usage` plus add `Token` elsewhere | Avoid changing tests/copy | Rejected | Rename visible token panel navigation to `Token`. |
| Keep flat USD-only pricing and update only numbers | Smaller code change | Rejected | Extend pricing config because providers require cache, tier, and currency semantics. |
| Add frontend-side cost adjustment for thinking tokens | Fast UI-only fix | Rejected | Cost belongs on server calculator and summaries. |
| Mark ambiguous Qwen/GLM/Kimi HighSpeed prices trusted | Avoid `price_missing` UI | Rejected | Use missing/partial until exact provider pricing is represented. |

## Derived Layering (If Useful)

Layering remains the current hybrid package structure:

1. Shared LLM package (`autobyteus-ts`) for provider/catalog facts and normalization.
2. Server token usage package (`autobyteus-server-ts`) for accounting, cost estimates, persistence/projections, GraphQL.
3. Web package (`autobyteus-web`) for localized presentation and live/fetched summary state.

No new top-level package or subsystem is needed.

## Migration / Refactor Sequence

1. Extend shared pricing types in `llm-config.ts` with currency, source/effective metadata if desired, cache-read/cache-write dimensions, and optional input-token tier rules. Preserve parsing of existing flat `input_token_pricing` / `output_token_pricing` configs.
2. Extend `ModelPricingInfo` and `LLMFactory.getModelPricingInfo` to return the expanded fields/rules and trusted dimensions without hardcoded USD.
3. Update `supported-model-definitions.ts`:
   - Remove MiniMax M2.7.
   - Correct DeepSeek V4-Pro.
   - Add missing verified OpenAI/Anthropic/xAI/Kimi/MiniMax M3/Gemini fields as supported by the new config.
   - Encode Qwen/GLM only when region/currency/tier is explicit; otherwise keep untrusted/missing.
4. Remove MiniMax M2.7 from `curated-model-metadata.ts`.
5. Add or extend provider usage probe support before locking normalizer semantics:
   - Real probes must be opt-in and low-budget.
   - Record a matrix for OpenAI-compatible, DeepSeek, Kimi, Anthropic, Gemini, and other supported reasoning/cache providers where credentials are available.
   - If credentials are absent, record explicit skip reasons and use official-doc/sanitized fixtures.
6. Update provider usage normalizers and provider request shaping:
   - Gemini: for Vertex/generateContent usage, keep `output_tokens` as visible candidate tokens if that remains the public semantic, but set `billable_output_tokens = candidatesTokenCount + thoughtsTokenCount` and `reasoning_output_tokens = thoughtsTokenCount`; also support Interactions `total_thought_tokens` if that API path is implemented later.
   - OpenAI-compatible: read top-level `cached_tokens` as cache-read fallback and preserve existing nested detail parsing; keep `completion_tokens_details.reasoning_tokens` as reasoning sub-breakdown, not extra output.
   - Anthropic/Claude: fold `output_tokens_details.thinking_tokens` from non-stream and final streaming usage into `reasoning_output_tokens`; preserve cache creation/read fields and nested cache-creation TTL split in raw usage or explicit fields if exact cache-write pricing is implemented.
   - DeepSeek: fix Node request shaping so `thinking_type` maps to the root `thinking` request object instead of `extra_body`, because the real HTTP API probe showed root `thinking` works and `extra_body.thinking` did not.
   - Kimi: preserve `reasoning_content`, but leave numeric `reasoning_output_tokens` null unless usage includes a numeric field.
7. Update runtime-native token event resolvers:
   - Codex: map `cachedInputTokens` / `cached_input_tokens` to cache-read input tokens and `reasoningOutputTokens` / `reasoning_output_tokens` to reasoning output tokens from `last` or `total` breakdowns; preserve `modelContextWindow`.
   - Claude Agent SDK: emit canonical usage from terminal `result.usage` / `modelUsage`, not assistant chunks; keep cache fields; map numeric `output_tokens_details.thinking_tokens` only if present; leave reasoning null when the SDK exposes thinking content without a numeric token count.
8. Extend server `TokenPriceConfigProvider` and `TokenCostCalculator`:
   - Select applicable tier from per-event input token count.
   - Calculate standard input/cache read/cache write input costs.
   - Use `billable_output_tokens ?? accounting_output_tokens` for output cost.
   - Calculate `estimated_api_reasoning_output_cost` as output-rate subcost when reasoning tokens are present.
   - Set `partial_price_missing` when relevant cache/tier/dimension is missing.
9. Extend server summary/statistics payloads, ledger projections, GraphQL types, and resolvers with reasoning token/cost fields and currency-safe aggregation.
10. Update frontend GraphQL fragments/types/store to consume reasoning fields from fetched summaries and streaming events.
11. Redesign `TokenUsageMeterPanel.vue` to use three paired cards and conditional thinking-token subline; update right-tab/settings localization and generated localization files according to project conventions.
12. Update tests in this order: shared model/pricing tests, provider normalizer tests, server calculator/projection tests, runtime-native token event resolver tests, GraphQL/query/store tests, UI/component/localization tests.
13. Run package-scoped checks feasible for implementation engineer; record commands and any unverified price dimensions in the implementation handoff.

## Key Tradeoffs

- Keeping internal tab id `usage` avoids broad state/router churn while satisfying the visible rename. If implementation renames it internally, it must update all callsites atomically.
- Adding tier/currency/cache fields is more work than changing numbers but prevents known wrong estimates for MiniMax M3, Gemini Pro long context, Qwen, GLM, and cache-aware providers.
- Showing reasoning tokens as an Output subline keeps the UI simple and matches provider billing; a fourth permanent card would add noise for runs without thinking tokens.
- Leaving ambiguous prices untrusted means some models may still show `unpriced`, but this is safer than a false `estimated` status.

## Risks

- Provider pricing can change after 2026-06-25. Implementation should avoid broad claims beyond source/effective date and should record exact source URLs in code comments or tests where useful.
- Provider usage field shape can differ by SDK/API mode (Responses vs Chat Completions, OpenAI-compatible vs native, streaming vs non-streaming). Probe evidence must identify the path tested.
- Exact Kimi K2.7 Code HighSpeed pricing was not fully visible in fetched official docs; do not guess if still ambiguous during implementation.
- Qwen pricing is region/tier-specific; choosing the wrong region would make estimates misleading.
- GLM direct BigModel pricing is CNY; if mixed with USD providers, summary aggregation must not display an invalid combined number.
- Tier selection from cumulative snapshot events can be imperfect if a snapshot lacks per-request input length. Add quality flags or partial status where tier selection cannot be trusted.
- GraphQL/schema codegen may require a running backend or generated schema workflow; implementation handoff must record if codegen could not be run locally.

## Guidance For Implementation

- Prefer small, owner-local helpers under existing files over introducing a new pricing subsystem.
- Tests and probe artifacts should verify behavior rather than only snapshots:
  - MiniMax M2.7 absent from model registry and metadata.
  - `LLMFactory.getModelPricingInfo` returns trusted dimensions/rules for verified models and missing/partial for ambiguous ones.
  - Gemini Vertex fixture/probe with `promptTokenCount`, `candidatesTokenCount`, and `thoughtsTokenCount` produces billable output as candidates plus thoughts and preserves reasoning subset according to observed response semantics.
  - Anthropic fixture/probe with `output_tokens_details.thinking_tokens` maps reasoning output tokens for non-stream and streaming final usage.
  - Kimi/OpenAI-compatible fixture/probe with top-level `cached_tokens` maps cache-read input tokens, and Kimi thinking content/usage behavior is recorded without fabricating a numeric reasoning count.
  - DeepSeek request-building test verifies configured `thinking_type` is sent as root `thinking` rather than `extra_body`.
  - Server calculator does not double-count reasoning cost.
  - Mixed currencies are not summed under one currency label.
  - Token Meter component renders three paired cards and conditional thinking subline.
- Use the existing package scripts where practical:
  - `pnpm -C autobyteus-ts build` for shared package type/build validation.
  - `pnpm -C autobyteus-server-ts test -- <target>` or focused Vitest tests for server logic.
  - `pnpm -C autobyteus-web test:nuxt -- <target>` for frontend store/component tests.
  - `pnpm -C autobyteus-web codegen` if GraphQL generated types are part of the repo workflow.
- Do not alter Mistral prices unless type compatibility forces a mechanical migration of pricing config shape.
- Do not perform paid provider calls in CI or ordinary local test commands; keep real probes opt-in, budget-limited, and documented.
