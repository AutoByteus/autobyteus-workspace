# Design Spec — Provider-Aware Token Usage Pricing and Token Meter Explainability

## Status

Ready for architecture review.

Requirements: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-input-prompt-discrepancy-analysis/tickets/token-input-prompt-discrepancy-analysis/requirements.md`
Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-input-prompt-discrepancy-analysis/tickets/token-input-prompt-discrepancy-analysis/investigation-notes.md`
Provider probe matrix: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-input-prompt-discrepancy-analysis/tickets/token-input-prompt-discrepancy-analysis/provider-probe-matrix.md`

User authorization: the user asked to complete two-round probes, document each provider immediately, then proceed to design. All in-scope paid probes are complete except user-excluded Mistral and MiniMax.

## Current-State Read

### Current execution path

Token usage currently flows through this path:

1. Provider/runtime returns a usage payload.
2. Provider/runtime adapter maps it into a `TOKEN_USAGE_UPDATED` event.
3. `TokenUsageEventEnrichmentTransformer` builds a `TokenUsageUpdatedPayload`, enriches context, normalizes per-call vs snapshot deltas, prices it, and emits/persists it.
4. `TokenUsageLedgerStore` sums persisted events into run/team/member summaries.
5. GraphQL and WebSocket payloads reach `autobyteus-web`.
6. `TokenUsageMeterPanel.vue` renders broad `Input`, `Output`, `Total`, price status, and raw event count.

Important current files:

- `autobyteus-ts/src/llm/utils/llm-token-usage-observation.ts`
- `autobyteus-ts/src/llm/api/openai-compatible-token-usage-normalizer.ts`
- `autobyteus-ts/src/llm/api/anthropic-token-usage-normalizer.ts`
- `autobyteus-ts/src/llm/api/gemini-token-usage-normalizer.ts`
- `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread-token-usage.ts`
- `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session-token-usage.ts`
- `autobyteus-server-ts/src/agent-execution/domain/agent-run-token-usage.ts`
- `autobyteus-server-ts/src/token-usage/projections/token-usage-snapshot-delta-normalizer.ts`
- `autobyteus-server-ts/src/token-usage/pricing/token-cost-calculator.ts`
- `autobyteus-server-ts/src/token-usage/providers/token-usage-ledger-store.ts`
- `autobyteus-server-ts/src/api/graphql/types/token-usage-stats.ts`
- `autobyteus-web/types/tokenUsageMeter.ts`
- `autobyteus-web/stores/tokenUsageMeterStore.ts`
- `autobyteus-web/components/workspace/usage/TokenUsageMeterPanel.vue`
- `autobyteus-web/components/workspace/usage/TokenUsageHeaderChip.vue`

### Current ownership boundaries

- Provider normalizers own provider raw usage parsing.
- `TokenUsageSnapshotDeltaNormalizer` owns per-call vs cumulative snapshot deltas.
- `TokenCostCalculator` owns pricing application, but today it assumes one input semantic for all providers.
- `TokenUsageLedgerStore` owns summary aggregation, but only broad token/cost fields are surfaced.
- Frontend store and UI are intended to be presentation-only, but the API does not expose enough detail for a clear presentation.

### Current coupling / fragmentation problems

1. **Global input-token semantic is wrong.** Current cost code computes `standardInputTokens = inputTokens - cacheRead - cacheCreation`. That is correct for `gross_includes_cache` providers such as OpenAI-compatible GLM/DeepSeek/Kimi/Qwen/Grok and Codex, but wrong for Anthropic/Claude additive usage where `input_tokens` excludes cache buckets.
2. **Canonical payload is missing semantic fields.** Current payload stores `reported_input_tokens`, `accounting_input_tokens`, `cache_read_input_tokens`, and `cache_creation_input_tokens`, but does not say whether reported input is gross or base/non-cache.
3. **Cache-write subtypes are lost.** Anthropic direct API emitted `cache_creation.ephemeral_5m_input_tokens`; pricing differs by 5-minute vs 1-hour write. A single `cache_creation_input_tokens` field is insufficient for complete pricing.
4. **Billable output is provider-specific.** xAI/Grok reports `completion_tokens` and `reasoning_tokens` separately; provider `total_tokens` and cost ticks show reasoning is billable output. Gemini can report `thoughtsTokenCount` without `candidatesTokenCount`; current normalizer can leave billable output missing.
5. **Pricing catalog is not policy-rich enough.** Pricing needs endpoint/region/service/context tier and trusted-dimension metadata. Qwen, Gemini cache pricing, Kimi highspeed, custom endpoints, local runtimes, Anthropic cache write, and GLM endpoint identity need explicit handling.
6. **Summary/API/UI hide component fields.** Ledger rows already persist some component costs, but run summaries and the Token Meter collapse them to `Input`, `Output`, `Total`. This caused the user's confusion.
7. **Raw `events` label is user-hostile.** The UI shows `4 events` / `10 events` without explaining that these are model usage reports, not user messages.

### Constraints the target design must respect

- Cumulative usage/cost remains separate from active-context/compaction pressure.
- Frontend must not calculate authoritative prices.
- Local/no-provider-bill runtimes must not look like paid provider estimates at `$0`.
- Custom OpenAI-compatible endpoints must not default to trusted zero cost.
- Live provider experiments are opt-in diagnostics; deterministic tests must use sanitized fixtures.
- Do not replace the ledger table wholesale; extend the ledger/domain/projection where fields are missing.

## Intended Change

Build one provider-aware token accounting and pricing path that:

1. Preserves provider-specific usage semantics in canonical events.
2. Computes gross input, standard/full-price input, cache-read input, cache-write input, output, reasoning/thinking output, and component costs on the server.
3. Selects pricing through provider/model/runtime pricing policy metadata instead of one global formula.
4. Exposes run/team/member summaries with cache rates, component costs, pricing statuses, missing price dimensions, and optional provider/model cost groups.
5. Redesigns the Token Meter to explain cumulative gross input and cache-discounted cost clearly.
6. Demotes raw event count into calculation details as `usage reports` / `model calls`, with copy explaining what it means.

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Larger Requirement: bug fix + behavior change + UI explainability + targeted refactor.
- Current design issue found (`Yes`/`No`/`Unclear`): Yes.
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Missing Invariant; Boundary Or Ownership Issue; Duplicated Policy Or Coordination; Shared Structure Looseness.
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): Yes.
- Evidence:
  - Probe matrix proves two input semantics: `gross_includes_cache` and `base_excludes_cache`.
  - Anthropic direct API probe: `input_tokens=11`, `cache_read_input_tokens=10436`; global subtraction would compute zero standard input and hide gross 10,447 input tokens.
  - Grok/xAI probe: `completion_tokens=2`, `reasoning_tokens=277`, `total_tokens=8502`; output billing must include reasoning even though current normalized output can be only 2.
  - Gemini probe: `thoughtsTokenCount=12` without `candidatesTokenCount`; current normalizer can mark output missing despite billable thought output.
  - UI screenshot: backend already priced GLM cache correctly, but frontend hid cache tokens and cache cost, leading user to think pricing/counting was wrong.
- Design response:
  - Introduce explicit token input semantics and component-basis normalization before pricing.
  - Extend canonical event/ledger/summary contracts with standard input, cache state, cache-write subtypes, billable output, missing price dimensions, and cost groups.
  - Refactor price calculation behind a provider/model/runtime pricing policy resolver.
  - Redesign UI around user-facing concepts rather than raw implementation events.
- Refactor rationale:
  - A localized UI-only change would explain the GLM screenshot but leave Anthropic, xAI, Gemini, Qwen, Kimi highspeed, local, and custom endpoint pricing wrong or misleading.
  - The calculator cannot remain provider-agnostic when providers report different token accounting semantics.
- Intentional deferrals and residual risk, if any:
  - Provider invoice reconciliation, taxes, enterprise discounts, credits, and raw per-event invoice viewer remain out of scope.
  - Mistral and MiniMax live probes are deferred by explicit user instruction; they still need docs/catalog-safe pricing status, not live confirmation.
  - Historical rows that lack enough semantic data may be marked `partial_price_missing`/`unknown_semantics` rather than retroactively guessed.

## Terminology

- **Gross input tokens**: total input/prompt tokens that count against request/context usage for a model call or run summary. For most OpenAI-compatible providers this is the provider's reported input. For Anthropic additive usage it is `input_tokens + cache_read_input_tokens + cache_creation_input_tokens`.
- **Standard input tokens / uncached input tokens / cache miss tokens**: input tokens priced at normal input price.
- **Cache-read input tokens / cache-hit tokens**: input tokens served from provider-side prompt/KV cache and usually priced at a discounted cache-read rate.
- **Cache-creation input tokens / cache-write tokens**: tokens written into provider-side cache. Some providers charge different write rates by TTL.
- **Output tokens**: response tokens reported by the provider.
- **Reasoning/thinking tokens**: output-like tokens used for reasoning/thinking. Whether they are included in `output_tokens` or separate is provider-specific; pricing must use `billable_output_tokens`.
- **Usage report**: one server token-usage update from a runtime/provider, usually one model call or turn. This replaces the user-facing raw word `event`.
- **Pricing policy**: resolved provider/model/runtime policy containing prices, trusted dimensions, input semantic, output billing semantic, tier/region/service metadata, and missing dimensions.
- **Local/no API bill**: local runtime usage with no provider API charge, not a paid-provider estimate of zero.

## Design Reading Order

1. Data-flow spine.
2. Ownership and capability-area allocation.
3. Canonical structures and pricing policy.
4. Final file responsibilities and target paths.
5. Migration/refactor sequence and validation plan.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Obsolete behavior to remove in this scope:
  - The universal pricing invariant `standardInputTokens = inputTokens - cacheRead - cacheCreation`.
  - Trusted zero pricing for arbitrary OpenAI-compatible custom endpoints.
  - Primary UI copy that labels cumulative gross input as generic `Input` without cache context.
  - Primary UI display of unexplained raw `events` count.
  - Any frontend-side inference of cache cost or provider pricing.
- Clean replacement:
  - Server-owned semantic component basis + pricing policy + component summary fields.
  - Frontend-only formatting of server-provided breakdowns.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | Paid provider/runtime usage payload | Persisted enriched token usage ledger event | Token Usage Event Enrichment | Source of truth for component accounting. |
| DS-002 | Primary End-to-End | Persisted token usage events | Run/team/member summary | Token Usage Ledger Store | Source of truth for cumulative totals and cache rates. |
| DS-003 | Primary End-to-End | Model/provider/runtime identity | Structured cost result | Pricing Policy Resolver + Token Cost Calculator | Ensures provider-specific pricing correctness. |
| DS-004 | Return-Event | Enriched token usage event / GraphQL summary | Token Meter live/hydrated UI | Frontend Token Usage Meter Store | Must display the same data for live and reload. |
| DS-005 | Bounded Local | Provider fixture/probe payloads | Deterministic tests | Token Usage Test Fixtures | Keeps provider semantics locked without live CI keys. |
| DS-006 | Bounded Local | Latest prompt/context usage | Current context statistics display | Context-size owner | Keeps cumulative spend separate from active context size statistics. |

## Primary Execution Spine(s)

### DS-001: Provider usage to enriched ledger event

`Provider/runtime raw usage -> provider/runtime normalizer -> TokenUsageUpdatedPayload creation -> semantic component basis resolver -> snapshot/per-call delta normalizer -> pricing policy resolver -> token cost calculator -> token usage ledger repository`

### DS-002: Ledger event to summary

`TokenUsageLedgerRepository -> TokenUsageLedgerStore.buildSummary -> GraphQL run/team/member resolver -> frontend store hydration`

### DS-003: Pricing policy to cost result

`model_provider/model_identifier/runtime_kind/endpoint metadata -> TokenPriceConfigProvider -> ResolvedTokenPricingPolicy -> TokenCostCalculator.applyPolicy -> component costs + missing dimensions + status`

### DS-004: Live event to UI

`TOKEN_USAGE_UPDATED WebSocket message -> tokenUsageHandler -> TokenUsageMeterStore.applyTokenUsageUpdated -> TokenUsageMeterPanel / HeaderChip`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | Raw provider usage is parsed once, enriched with explicit semantic/accounting components, priced, and persisted. | Usage observation, component basis, ledger event | Token Usage Event Enrichment | Provider fixtures, quality flags, context metadata. |
| DS-002 | Persisted ledger events are summed into cumulative gross/standard/cache/output/cost summaries for a run/team/member. | Ledger events, run summary, cost groups | Token Usage Ledger Store | Mixed currency, missing prices, model grouping. |
| DS-003 | Pricing is selected by provider/model/runtime identity and applied by dimension; missing dimensions are explicit. | Pricing policy, cost basis, cost result | Token Pricing subsystem | Catalog freshness, endpoint/region/service tiers. |
| DS-004 | Frontend renders server-owned fields consistently from live messages and GraphQL hydration. | Token usage summary, UI breakdown | Token Meter UI | Localization, compact/expanded display. |
| DS-005 | Sanitized provider payload fixtures lock in known provider semantics and calculator expectations. | Fixture payload, expected normalized/cost result | Test suites | Live probes remain opt-in diagnostics. |
| DS-006 | Latest/current prompt size stays separate from cumulative usage and is displayed only as statistics when server emits it. | Latest prompt tokens, effective context window, context-window usage percent | Context-size owner | No compaction/compression decision text. |

## Spine Actors / Main-Line Nodes

- Provider/runtime usage normalizers.
- `TokenUsageEventEnrichmentTransformer`.
- New `TokenUsageComponentBasisResolver`.
- `TokenUsageSnapshotDeltaNormalizer`.
- `TokenPriceConfigProvider` / new pricing policy resolver functions.
- `TokenCostCalculator`.
- `SqlTokenUsageLedgerRepository`.
- `TokenUsageLedgerStore`.
- GraphQL `TokenUsageRunSummaryGraphql`.
- Frontend `TokenUsageMeterStore`.
- `TokenUsageMeterPanel.vue` and `TokenUsageHeaderChip.vue`.

## Ownership Map

| Owner | Owns | Must Not Own |
| --- | --- | --- |
| Provider/runtime normalizers | Raw response parsing and provider-specific raw field extraction. | Price calculation or UI labels. |
| Token usage component basis resolver | Convert reported/raw token fields into explicit gross/standard/cache/billable output components based on semantics. | Provider HTTP calls or persisted storage. |
| Snapshot delta normalizer | Convert per-call/per-turn/cumulative snapshot source values into ledger-event deltas. | Provider semantic inference that belongs in component basis resolver. |
| Pricing policy resolver | Resolve model/provider/runtime price dimensions, trusted flags, tiers, endpoint/region/service metadata, local/no-bill status. | Reading frontend state or raw UI decisions. |
| Token cost calculator | Apply a resolved policy to component basis and return costs/status/missing dimensions. | Mutating provider catalog or guessing unknown endpoint pricing. |
| Ledger store | Aggregate persisted event deltas into summaries and cost groups. | Recomputing provider raw semantics from raw JSON where explicit fields exist. |
| GraphQL/API layer | Transport server-owned summary fields. | Renaming/deriving pricing semantics locally. |
| Frontend store | Merge live server events and hydrated summaries with the same fields. | Authoritative price math. |
| Token Meter UI | Explain and format gross/cache/cost/context details. | Raw provider payload inspection. |

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `TokenUsageEventEnrichmentTransformer.transform` | Token usage enrichment pipeline | One event-transformer hook for `TOKEN_USAGE_UPDATED` events. | Provider semantics or pricing formulas inline. |
| GraphQL `get*TokenUsageSummary` queries | Token Usage Ledger Store | UI hydration boundary. | Local aggregation different from ledger summary. |
| `TokenUsageMeterStore.applyTokenUsageUpdated` | Server event contract | Live UI update boundary. | Cost or cache-rate calculation beyond summing server-supplied deltas/rates. |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| Global `standardInputTokens = inputTokens - cacheRead - cacheCreation` assumption in `TokenCostCalculator` | Wrong for Anthropic additive semantics. | `TokenUsageComponentBasisResolver` + policy-aware calculator. | In This Change | Calculator may derive only when semantic says gross. |
| Custom OpenAI-compatible trusted zero default in `OpenAICompatibleEndpointModel` | Misleads paid custom endpoints as free. | Explicit configured pricing or `price_missing`. | In This Change | Local runtimes remain local/no-bill. |
| Primary UI `Input` copy without scope | Causes confusion between cumulative gross input and latest prompt/context. | `Gross input` / `Total input sent` with cache detail. | In This Change | Localized EN/ZH copy. |
| Primary raw `events` count | Implementation-oriented and confusing. | Details row `usage reports` / `model calls` with tooltip. | In This Change | Count can remain in details. |
| Silent zero for missing cache prices | Understates price when cache dimension missing. | `partial_price_missing` + `missingPriceDimensions`. | In This Change | Applies to Gemini/Qwen/etc. |
| Output cost based only on `completion_tokens` for xAI/Grok reasoning payloads | Undercharges reasoning output. | Provider-specific `billable_output_tokens`. | In This Change | Also supports Gemini thoughts-only fallback. |

## Return Or Event Spine(s) (If Applicable)

- Enriched `TOKEN_USAGE_UPDATED` event returns through existing agent streaming to the frontend. The event payload must contain the same component fields used by GraphQL summaries so live updates and hydration converge.
- `run_summary_after_event` may remain useful, but it must be populated with the expanded summary shape if present; do not create a separate lightweight summary shape for live-only display.

## Bounded Local / Internal Spines (If Applicable)

### Component basis resolution

Parent owner: Token usage enrichment pipeline.
Chain: `reported fields + provider/runtime identity + input semantic -> gross/standard/cache/billable output basis -> quality flags`.
Why it matters: this is the only place where provider token semantics are converted into canonical accounting components.

### Snapshot delta normalization

Parent owner: token usage projections.
Chain: `source per-call/per-turn/snapshot component values -> accounting deltas -> meter deltas`.
Why it matters: Codex and future snapshot sources must not double-count cumulative snapshots.

### UI details expansion

Parent owner: Token Meter UI.
Chain: `summary -> top cards -> input breakdown rows -> pricing/details section`.
Why it matters: keeps dense provider/pricing data available without overwhelming the primary view.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Provider probe fixtures | DS-001, DS-003, DS-005 | Normalizers and calculator | Store sanitized raw payloads and expected semantic/cost results. | Prevent regressions without live provider calls. | Live tests become required or semantics drift silently. |
| Pricing source metadata | DS-003 | Pricing policy resolver | Record source/date/endpoint/region/service tier. | Pricing changes frequently and differs by endpoint. | Calculator guesses or UI over-trusts stale values. |
| Localization copy | DS-004 | Token Meter UI | EN/ZH labels/tooltips for gross/cache/status. | User-facing clarity. | Backend starts embedding presentation strings. |
| Mixed currency/model groups | DS-002, DS-004 | Ledger summary and UI | Keep monetary sums safe across mixed providers/currencies. | Team runs can include different agents/models. | UI sums fake totals. |
| Current context statistics copy | DS-006, DS-004 | Context-size owner and UI | Explain latest/current prompt size separately from cumulative usage. | Original user confusion involved current prompt tokens vs cumulative input. | Cumulative spend and current context size become conflated again. |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Provider raw usage parsing | `autobyteus-ts/src/llm/api/*token-usage-normalizer.ts` and runtime adapters | Extend | Existing adapters already parse provider fields. | N/A |
| Canonical token usage event | `agent-run-token-usage.ts` | Extend | Existing event is the server contract. | N/A |
| Per-call/snapshot accounting | `token-usage/projections` | Extend | Delta normalization already lives here. | N/A |
| Price catalog lookup | `TokenPriceConfigProvider` and `LLMFactory.getModelPricingInfo` | Extend | Existing lookup spans model catalog. | N/A |
| Cost calculation | `TokenCostCalculator` | Refactor in place | Correct governing owner, but formula too global. | N/A |
| Run summary aggregation | `TokenUsageLedgerStore` | Extend | Existing summary owner. | N/A |
| Token Meter UI | Existing workspace usage components/store | Extend/Refactor | Correct UI location. | N/A |
| Probe scripts | Ticket artifact scripts | Keep as diagnostic artifacts; create deterministic fixtures in source tests | Probes are not production code. | Production code needs fixtures, not ticket scripts. |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts` LLM provider layer | Raw usage observations, model catalog pricing metadata. | DS-001, DS-003 | Provider normalizers, price resolver | Extend | Add semantic/billable fields and missing catalog prices. |
| Server token usage domain | Canonical event and summary types. | DS-001, DS-002 | Event enrichment, ledger, GraphQL | Extend | Add fields; keep one canonical meaning per field. |
| Server token usage projections | Per-call/snapshot deltas. | DS-001 | Delta normalizer | Extend | Include new component fields and semantic-aware gross input. |
| Server token usage pricing | Resolved pricing policy and cost calculation. | DS-003 | Calculator | Refactor/Extend | Move provider-specific decisions out of flat formula. |
| Server token usage persistence | Ledger event storage. | DS-001, DS-002 | Repository/store | Extend | Add migration columns only for fields not derivable safely. |
| API GraphQL | Summary transport. | DS-002 | Frontend hydration | Extend | Expose expanded fields and cost groups. |
| Web token usage state/UI | Live + hydrated presentation. | DS-004 | Users | Refactor/Extend | Show cache-aware breakdown; no pricing math. |
| Docs/tests | Durable semantics. | DS-005 | Maintainers | Extend/Create fixtures | Provider matrix docs and sanitized fixtures. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/llm/utils/llm-token-usage-observation.ts` | Provider layer | Observation schema | Add input semantic, cache state/reporting, cache-write subtype, cache miss, billable output fields. | Existing canonical observation builder. | Yes |
| `autobyteus-server-ts/src/token-usage/domain/token-usage-component-basis.ts` | Server token usage domain | Component basis | Define semantic enums and component basis resolver input/output. | New semantic structure used by projection and pricing. | Yes |
| `autobyteus-server-ts/src/token-usage/projections/token-usage-component-basis-resolver.ts` | Projections | Basis resolver | Compute gross/standard/cache/billable output before delta/pricing. | Keeps semantic derivation out of cost calculator. | Yes |
| `autobyteus-server-ts/src/token-usage/pricing/token-pricing-policy.ts` | Pricing | Pricing policy type | Explicit price dimensions, trusted flags, tier metadata, local/no-bill status. | Avoids bloating calculator/provider. | Yes |
| `autobyteus-server-ts/src/token-usage/pricing/token-price-config-provider.ts` | Pricing | Policy resolver facade | Convert `ModelPricingInfo` to policy and missing dimensions. | Existing lookup boundary. | Yes |
| `autobyteus-server-ts/src/token-usage/pricing/token-cost-calculator.ts` | Pricing | Calculator | Apply policy to component basis. | Existing cost owner. | Yes |
| `autobyteus-server-ts/src/token-usage/providers/token-usage-ledger-store.ts` | Ledger | Summary builder | Aggregate expanded components, rates, cost groups. | Existing aggregation owner. | Yes |
| `autobyteus-web/components/workspace/usage/TokenUsageMeterPanel.vue` | Web UI | Token meter | Render top cards, breakdown, details. | Existing primary panel. | Yes |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Input token semantic | `token-usage-component-basis.ts` | Server token usage domain | Used by event creation, projection, calculator, tests. | Yes | Yes | Provider-specific if/else scattered in calculator. |
| Pricing dimensions/trusted flags | `token-pricing-policy.ts` | Pricing | Used by provider, calculator, summary status. | Yes | Yes | A loose JSON bag only. |
| Cache state vocabulary | Server domain + frontend type mirror | Domain/API/UI | Used by summary and UI copy. | Yes | Yes | A UI-only inferred label. |
| Missing price dimensions | Pricing policy/cost result | Pricing | Used by status and UI details. | Yes | Yes | Free-text-only reason. |
| Cost group summary | Server domain + GraphQL/frontend type | Ledger/API/UI | Used for mixed provider/currency details. | Yes | Yes | Another independent aggregate path. |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `TokenUsageUpdatedPayload.accounting_input_tokens` | Yes after change: gross input delta. | No, persisted field retained. | Medium | Document invariant and use `grossInputTokens` in public summary/UI. |
| New `standard_input_tokens` | Yes: full-price/base input delta. | Yes | Low | Set from provider miss/base semantics; never UI-derived. |
| `cache_creation_input_tokens` + subtype fields | Yes if total equals subtype sum when subtypes exist. | No | Medium | Add invariant: total is aggregate; subtypes price when present. If subtype missing and pricing needs it, mark partial. |
| `reasoning_output_tokens` + `billable_output_tokens` | Yes if billable output is total priced output basis. | Yes | Medium | Calculator prices `billable_output_tokens`; reasoning cost is explanatory component, not extra double charge. |
| `api_cost_status` | Yes after enum expansion. | Yes | Low | Add `local_no_api_bill` and keep `mixed` for unsafe aggregates. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/llm/utils/llm-token-usage-observation.ts` | LLM provider layer | Provider observation schema | Extend observation with `input_token_semantic`, `cache_miss_input_tokens`, cache creation subtypes, cache field reporting state, and `billable_output_tokens`. | Existing source of provider observation shape. | Yes |
| `autobyteus-ts/src/llm/api/openai-compatible-token-usage-normalizer.ts` | LLM provider layer | OpenAI-compatible normalizer | Preserve cache read and cache miss; set gross semantic; set xAI/Grok billable output when provider/model indicates reasoning is separate. | Existing OpenAI-compatible parser. | Yes |
| `autobyteus-ts/src/llm/api/anthropic-token-usage-normalizer.ts` | LLM provider layer | Anthropic normalizer | Set additive/base semantic; preserve `cache_creation.ephemeral_5m_input_tokens` and `ephemeral_1h_input_tokens`. | Existing Anthropic usage accumulator. | Yes |
| `autobyteus-ts/src/llm/api/gemini-token-usage-normalizer.ts` | LLM provider layer | Gemini normalizer | Set gross semantic; cache read; when `thoughtsTokenCount` exists without candidates, use safe billable-output fallback from `totalTokenCount - promptTokenCount` or thoughts count when equal. | Existing Gemini parser. | Yes |
| `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread-token-usage.ts` | Runtime adapter | Codex usage mapping | Mark gross semantic; preserve `tokenUsage.last` preference; keep reasoning as subset. | Existing Codex adapter. | Yes |
| `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session-token-usage.ts` | Runtime adapter | Claude SDK usage mapping | Use terminal result usage only; mark Anthropic additive semantic; preserve cache creation subtype if SDK ever reports it. | Existing Claude adapter. | Yes |
| `autobyteus-server-ts/src/agent-execution/domain/agent-run-token-usage.ts` | Server domain | Event/summary contract | Add canonical fields and enums to event and summary payloads. | Existing event contract owner. | Yes |
| `autobyteus-server-ts/src/token-usage/domain/token-usage-component-basis.ts` | Server domain | Component basis type | Define `InputTokenSemantic`, `CacheState`, `TokenUsageCostBasis`, component cost result helpers. | Prevents semantic drift. | N/A |
| `autobyteus-server-ts/src/token-usage/projections/token-usage-component-basis-resolver.ts` | Projections | Component basis resolver | Derive gross/standard/cache/billable output components before delta/pricing. | Keeps calculator simple and provider-aware. | Yes |
| `autobyteus-server-ts/src/token-usage/projections/token-usage-snapshot-delta-normalizer.ts` | Projections | Delta normalizer | Delta new component fields for snapshots; set `accounting_input_tokens` to gross input delta. | Existing delta owner. | Yes |
| `autobyteus-server-ts/src/token-usage/pricing/token-pricing-policy.ts` | Pricing | Policy types | Explicit dimensions: input, cache read, cache write default/5m/1h, output, tiers, local/no-bill, missing dimensions. | Tight shared pricing model. | N/A |
| `autobyteus-server-ts/src/token-usage/pricing/token-price-config-provider.ts` | Pricing | Policy resolver | Convert model catalog info to resolved policy and selected tier. | Existing price lookup boundary. | Yes |
| `autobyteus-server-ts/src/token-usage/pricing/token-cost-calculator.ts` | Pricing | Cost calculator | Apply policy to explicit components; no provider raw field inference. | Existing pricing owner. | Yes |
| `autobyteus-server-ts/prisma/schema.prisma` + new migration | Persistence | Ledger storage | Add columns for semantic/component fields not currently persisted. | Existing SQLite ledger schema. | Yes |
| `autobyteus-server-ts/src/token-usage/repositories/sql/token-usage-ledger-repository.ts` | Persistence | SQL mapper | Map new columns to/from domain payload. | Existing mapper. | Yes |
| `autobyteus-server-ts/src/token-usage/providers/token-usage-ledger-store.ts` | Ledger | Summary aggregation | Sum components/costs, compute rates/cache states, build cost groups. | Existing summary owner. | Yes |
| `autobyteus-server-ts/src/api/graphql/types/token-usage-stats.ts` | API | GraphQL transport | Expose expanded summary and cost group fields. | Existing GraphQL type. | Yes |
| `autobyteus-web/types/tokenUsageMeter.ts` | Web domain type | Frontend DTO | Mirror server summary fields. | Existing frontend contract. | Yes |
| `autobyteus-web/stores/tokenUsageMeterStore.ts` | Web state | Live/hydrated summary store | Merge expanded component deltas and statuses; no price math. | Existing state owner. | Yes |
| `autobyteus-web/components/workspace/usage/TokenUsageMeterPanel.vue` | Web UI | Token meter | Render cache-aware cards, input breakdown, pricing status, details. | Existing UI owner. | Yes |
| `autobyteus-web/components/workspace/usage/TokenUsageHeaderChip.vue` | Web UI | Header chip | Show concise total and cost status; tooltip links gross/cache semantics. | Existing header owner. | Yes |
| `autobyteus-web/localization/messages/en/shell.ts` and `zh-CN/shell.ts` | Web localization | UI copy | Add gross/cache/status/tooltips/usage report strings. | Existing copy owner. | N/A |
| `autobyteus-server-ts/docs/modules/token_usage.md` | Docs | Durable docs | Explain cumulative gross input, cache pricing, provider semantics, context pressure. | Existing token usage docs. | N/A |

## Ownership Boundaries

- Provider normalizers may say what the provider reported and the provider semantic, but not what it costs.
- Component basis resolver is the only owner that converts reported provider fields into canonical gross/standard/cache/billable components.
- Price resolver is the only owner that chooses trusted pricing dimensions.
- Cost calculator is the only owner that multiplies component counts by prices.
- Ledger store is the only owner that aggregates run/team/member summaries.
- Frontend is display-only and must treat missing/partial/local/mixed statuses as server truth.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| Provider observation builder | Provider raw parsing and quality flags | LLM provider implementations | Direct server parsing of provider raw JSON for semantics. | Add fields to observation schema. |
| Component basis resolver | Input semantic and gross/standard/cache derivation | Event enrichment and delta normalizer | Calculator subtracting cache based on raw reported input. | Extend basis resolver output. |
| Pricing policy resolver | Catalog lookup, trusted dimensions, tier selection, local/no-bill status | Cost calculator | Hardcoded provider price checks in UI/store. | Extend `TokenPricingConfig` / policy type. |
| Ledger store summary | Summary aggregation, cost groups, rates | GraphQL resolvers | Frontend recomputing summaries from raw event list. | Add summary fields. |
| GraphQL summary queries | Hydration transport | Web store | Separate REST/local cache path with different fields. | Extend GraphQL type/fragment. |

## Dependency Rules

- `autobyteus-web` may depend on GraphQL/WebSocket DTO fields only; it must not import provider pricing metadata or provider-specific rules.
- `TokenCostCalculator` may depend on `TokenUsageCostBasis` and `ResolvedTokenPricingPolicy`; it must not parse raw provider payloads.
- `TokenUsageSnapshotDeltaNormalizer` may delta component fields; it must not choose prices.
- `TokenPriceConfigProvider` may depend on `LLMFactory.getModelPricingInfo`; it must not inspect frontend state.
- Provider normalizers may depend on provider model identity; they must not emit final costs.
- Test fixtures may contain sanitized raw provider usage, but production code must not read ticket probe result files at runtime.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `buildLlmTokenUsageObservation` | Provider usage observation | Produce canonical provider usage observation. | Raw usage + `LLMModel` identity. | Add semantic and subtype fields. |
| `createTokenUsageUpdatedPayload` | Server event payload | Normalize incoming event shape into domain payload. | Agent run ID + event payload. | Parse new fields and quality flags. |
| `TokenUsageComponentBasisResolver.resolve(payload)` | Component basis | Derive gross/standard/cache/billable components. | `TokenUsageUpdatedPayload`. | Must be called before delta/pricing. |
| `TokenUsageSnapshotDeltaNormalizer.normalizeAccountingDelta(payload)` | Accounting delta | Convert source values to per-event ledger deltas. | Payload with component source values. | New component fields included in snapshot source tokens. |
| `TokenPriceConfigProvider.resolvePolicy(payload)` | Pricing policy | Resolve provider/model/runtime policy. | Model provider, identifier/value, runtime, observed time, optional endpoint/service metadata. | Replace or wrap `resolvePrice`. |
| `TokenCostCalculator.applyPolicy(payload, policy)` | Cost result | Compute component costs/status. | Componentized payload + policy. | No raw provider inference. |
| GraphQL `get*TokenUsageSummary` | Summary hydration | Return expanded summary. | Run/team/member IDs. | Use one summary DTO. |
| WebSocket `TOKEN_USAGE_UPDATED` payload | Live summary updates | Deliver enriched event deltas. | Usage event ID/idempotency key. | Store merges same fields as summary. |

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `TokenPriceConfigProvider.resolvePolicy` | Yes | Medium today | Medium | Include provider/runtime/model and optional endpoint/service/region metadata in input. |
| `TokenUsageRunSummaryGraphql` | Yes | Yes | Low | Rename ambiguous fields to gross/cache/component names. |
| `TokenUsageMeterStore.applyTokenUsageUpdated` | Yes | Yes | Low | Read server component deltas only. |
| `OpenAICompatibleEndpointModel` pricing | No today | Medium | High | Require explicit endpoint pricing config or return missing pricing. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Frontend input card | Current `Input`; proposed `Gross input` / `Total input sent` | Yes after change | Low | Add tooltip: cumulative and cache may be discounted. |
| Raw event count | Current `events`; proposed `usage reports` / `model calls` in details | Yes after change | Low | Remove from primary status line. |
| `accounting_input_tokens` | Keep internally, document as gross input delta | Yes internally | Medium | Public summary uses `grossInputTokens`. |
| `promptTokens` in statistics | Current settings/stat name | No for cache-aware usage | Medium | Rename display/copy to gross input where shown; stats domain may keep if internal but docs must clarify. |
| `api_cost_status=estimated` | Proposed UI label `complete estimate` | Yes in UI | Low | Keep machine enum, improve UI label. |

## Applied Patterns (If Any)

- **Semantic basis resolver**: one component-building stage between raw event parsing and pricing. Prevents calculator and UI from each rediscovering provider semantics.
- **Policy + calculator**: pricing policy declares dimensions/trust/tier; calculator applies it. Prevents one flat formula from pretending all providers bill the same way.
- **Server-owned projection**: ledger summary exposes all UI breakdown values. Keeps frontend presentation-only.
- **Fixture-backed provider contracts**: live probes generate artifacts; CI uses sanitized fixtures and expected normalized/cost outputs.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/llm/utils/llm-token-usage-observation.ts` | File | Provider observation | Extended observation schema. | Shared by provider adapters. | Server pricing logic. |
| `autobyteus-ts/src/llm/api/*token-usage-normalizer.ts` | Files | Provider parsing | Provider-specific field extraction and semantic flags. | Existing provider layer. | Cost formulas. |
| `autobyteus-ts/src/llm/utils/llm-config.ts` | File | Model pricing config | Add pricing dimensions for cache-write 5m/1h, local/no-bill metadata if needed. | Existing model config type. | Runtime event aggregation. |
| `autobyteus-ts/src/llm/llm-factory.ts` | File | Model catalog lookup | Surface expanded pricing info/trusted dimensions. | Existing catalog facade. | Provider raw usage parsing. |
| `autobyteus-ts/src/llm/supported-model-definitions.ts` | File | Built-in model catalog | Correct built-in prices and missing/partial/local statuses. | Existing model definitions. | User custom endpoint guesses. |
| `autobyteus-ts/src/llm/openai-compatible-endpoint-model.ts` | File | Custom endpoint model | Stop trusted zero default; use configured pricing or missing. | Existing custom endpoint model. | Local runtime free pricing. |
| `autobyteus-server-ts/src/token-usage/domain/token-usage-component-basis.ts` | File | Domain structure | Enums and basis/result types. | New reusable server domain file. | Provider catalog lookup. |
| `autobyteus-server-ts/src/token-usage/projections/token-usage-component-basis-resolver.ts` | File | Projection | Semantic conversion to components. | New projection step. | Multiplying by prices. |
| `autobyteus-server-ts/src/token-usage/pricing/token-pricing-policy.ts` | File | Pricing | Resolved policy type and helpers. | Pricing subsystem. | Raw provider normalizers. |
| `autobyteus-server-ts/src/token-usage/pricing/token-price-config-provider.ts` | File | Pricing policy resolver | Build resolved policy from catalog. | Existing price provider. | UI labels. |
| `autobyteus-server-ts/src/token-usage/pricing/token-cost-calculator.ts` | File | Pricing calculation | Component cost and status. | Existing calculator. | Provider raw JSON parsing. |
| `autobyteus-server-ts/src/token-usage/providers/token-usage-ledger-store.ts` | File | Summary | Aggregate components, rates, cost groups. | Existing ledger summary owner. | Raw UI formatting. |
| `autobyteus-server-ts/src/api/graphql/types/token-usage-stats.ts` | File | API | Expanded GraphQL DTOs. | Existing GraphQL resolver. | Independent cost math. |
| `autobyteus-web/components/workspace/usage/TokenUsageMeterPanel.vue` | File | UI | Cache-aware panel. | Existing UI location. | Provider pricing logic. |
| `autobyteus-web/components/workspace/usage/TokenUsageHeaderChip.vue` | File | UI | Compact status. | Existing header location. | Expanded invoice viewer. |
| `autobyteus-web/localization/messages/en/shell.ts` and `zh-CN/shell.ts` | Files | Localization | User-facing copy. | Existing localization. | Backend enum changes. |
| `autobyteus-server-ts/docs/modules/token_usage.md` | File | Docs | Durable semantics and provider caveats. | Existing token docs. | Probe secrets/raw API keys. |
| `tickets/token-input-prompt-discrepancy-analysis/experiment-evidence/` | Folder | Investigation artifact | Raw/sanitized probe evidence retained for this ticket. | Required evidence trail. | Runtime dependency. |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/token-usage/domain` | Main-Line Domain-Control | Yes | Low | New shared types belong here. |
| `autobyteus-server-ts/src/token-usage/projections` | Main-Line Domain-Control | Yes | Low | Component and snapshot normalization are projections. |
| `autobyteus-server-ts/src/token-usage/pricing` | Off-Spine Concern | Yes | Low | Pricing policy/calculator stays isolated. |
| `autobyteus-server-ts/src/token-usage/providers` | Main-Line Domain-Control | Medium | Medium | Existing name `providers` holds ledger store, not provider adapters; leave in place for scope, avoid adding unrelated pricing here. |
| `autobyteus-web/components/workspace/usage` | Transport/UI | Yes | Low | Token Meter UI components belong here. |
| `tickets/token-input-prompt-discrepancy-analysis` | Off-Spine Concern | Yes | Low | Investigation artifacts only. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Anthropic additive input | `gross=reported_input+cache_read+cache_creation`, `standard=reported_input`, `cacheRate=cache_read/gross` | `standard=max(reported_input-cache_read,0)` | Prevents undercounting gross and standard input. |
| OpenAI-compatible gross input | `gross=prompt_tokens`, `standard=prompt_tokens-cached_tokens-cache_creation` | Add cache tokens to prompt_tokens again | Prevents double-counting cache for gross providers. |
| xAI/Grok output | `billableOutput=completion_tokens+reasoning_tokens` when reasoning separate | Price only `completion_tokens` | Matches observed provider total/cost ticks. |
| Gemini thoughts-only | `billableOutput=totalTokenCount-promptTokenCount` when candidate count missing and thoughts present | Mark output missing and underprice | Probe showed thoughts-only output-like tokens. |
| UI label | `Gross input 115.9k; Cache hit 88.4%; Uncached 13.4k` | `Input 115.9k; Cost 0.3125¥` | Explains why large input does not imply full-price input. |
| Usage reports | Details: `10 usage reports (usually model calls/turns)` | Primary status: `10 events` | Avoids confusing user with implementation term. |

## Provider Policy Decisions From Probe Matrix

| Provider/runtime | Target semantic/policy action |
| --- | --- |
| OpenAI Responses API | `gross_includes_cache`; preserve cached tokens; existing cache pricing shape valid for probed model; use fixture. |
| Codex App Server runtime | `gross_includes_cache`; use `tokenUsage.last` when present; reasoning subset of output; use OpenAI pricing policy. |
| Anthropic direct API | `base_excludes_cache`; gross is additive; preserve cache creation 5m/1h subtypes; add cache-write subtype pricing. |
| Claude Agent SDK runtime | Use terminal `result.usage`/`modelUsage` only; do not sum assistant chunks; if cache buckets positive, use Anthropic additive semantic; SDK `costUSD` is diagnostic only. |
| Gemini / Vertex API-key runtime | `gross_includes_cache`; preserve cached content; add cache pricing/tier policy; fix thoughts-only billable output. |
| DeepSeek | `gross_includes_cache`; preserve explicit hit/miss; current catalog matches probe/docs for V4 Flash/Pro. |
| Grok / xAI | `gross_includes_cache`; billable output includes reasoning tokens when separate; context tiers remain policy metadata. |
| Kimi | `gross_includes_cache`; standard K2.7 Code works; add K2.7 Code Highspeed pricing or mark missing. |
| Qwen / DashScope International | `gross_includes_cache`; add region/tier/cache-aware pricing policy or mark missing/partial. |
| GLM / BigModel CN | `gross_includes_cache`; keep CN CNY pricing tied to BigModel endpoint; do not reuse for global Z.AI USD endpoint. |
| Mistral | User-excluded from live probes; docs/catalog-safe status only. |
| MiniMax | User-excluded from live probes; docs/catalog-safe status only; distinguish Standard/Priority if runtime can request priority. |
| Ollama / LMStudio | Local/no API bill status, not paid-provider `$0 estimate`. |
| Custom OpenAI-compatible | Unknown by definition; require configured trusted pricing or show `price_missing`. |
| Remote AutoByteus provider | Depend on remote pricing metadata; if missing, safe `price_missing`/partial status. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep existing UI labels and add tiny tooltip only | Minimal change for GLM screenshot. | Rejected | Redesign Token Meter with visible cache breakdown. |
| Keep flat global calculator formula and special-case Anthropic after cost | Smaller code diff. | Rejected | Component basis resolver owns semantics before pricing. |
| Treat unknown custom endpoints as zero cost for continuity | Existing behavior. | Rejected | Missing/user-configured pricing only. |
| Keep `events` as primary status label | Existing UI shape. | Rejected | Demote to details as `usage reports` / `model calls`. |
| Price Anthropic cache creation with one blended write price | Avoids subtype schema. | Rejected | Preserve subtype fields or mark partial. |
| Keep old summary-only broad API and let frontend infer components from event rows | Avoids GraphQL expansion. | Rejected | Server summary exposes component fields directly. |

## Derived Layering (If Useful)

The target layering is:

1. **Provider/runtime adapters**: raw usage -> observation/event fields.
2. **Server semantic projection**: observation/event fields -> component basis and accounting deltas.
3. **Server pricing**: component basis + pricing policy -> costs/status.
4. **Server aggregation**: ledger event deltas -> summaries/groups/rates.
5. **Transport**: GraphQL/WebSocket DTOs.
6. **Presentation**: Token Meter formatting and explanation.

No lower layer depends on frontend. No frontend layer imports provider catalog or pricing policy code.

## Requirement Coverage Crosswalk

| Requirement Area | Covered By Design Sections |
| --- | --- |
| REQ-001, REQ-002, REQ-011 | Canonical event/summary fields; ledger summary expansion; cost group summary. |
| REQ-003, REQ-015, REQ-016, REQ-022, REQ-023 | Component basis resolver, pricing policy resolver, provider-aware cost rules. |
| REQ-004 | Provider/runtime normalizer changes and provider policy decisions table. |
| REQ-005, REQ-006, REQ-007, REQ-008, REQ-009, REQ-017, REQ-018 | Token Meter UI redesign, frontend DTO/store expansion, UI copy intent. |
| REQ-010, REQ-020 | `token_usage.md` documentation and durable provider pricing/cache audit artifact. |
| REQ-012 | `CacheState` enum and summary/UI rendering behavior. |
| REQ-013, REQ-024 | Removal/decommission of raw primary `events`; replacement with details-only `usage reports` / `model calls`. |
| REQ-014, REQ-019, REQ-021 | Pricing catalog audit actions, custom endpoint no-zero rule, mixed currency/provider cost groups. |
| REQ-025, REQ-027, REQ-028, REQ-029 | Completed probe matrix and fixture-backed validation plan; no currently blocked in-scope provider remains. |
| REQ-026 | Live probes remain diagnostics; CI uses deterministic sanitized fixtures. |
| REQ-030 | Current prompt/context statistics section using latest prompt tokens, effective context window, and percentage; no compaction/compression decision text. |
| REQ-031 | Running-app frontend visual validation by implementation engineer with a real token-emitting agent run and evidence in handoff. |


## Current Prompt / Effective Context Window Design

This section tightens DS-006 using the design-principles examples: it is a bounded local/runtime-statistics spine attached to the token usage event spine, not a separate compaction feature and not a frontend-derived calculation.

### User-facing invariant

The Token Meter should show a simple statistic:

```text
Current prompt
12,625 / 1,000,000 context tokens
1.3% used
```

Canonical meanings:

- `latestPromptTokens`: latest model-call prompt/input size. Use gross prompt tokens, so providers that report cache separately must add cache-read/cache-creation buckets.
- `effectiveContextWindowTokens`: effective total context window for the model/runtime. This is not cumulative usage and not the app's input budget after output reservation or safety margin.
- `contextWindowUsagePercent`: `latestPromptTokens / effectiveContextWindowTokens * 100` when both values are known.

The UI must not show compaction/compression status text in this section.

### Context-statistics data-flow spine

`Runtime/provider usage payload -> runtime/provider token usage normalizer -> runtime context-window resolver -> enriched TOKEN_USAGE_UPDATED event -> ledger latest summary -> GraphQL/WebSocket -> Token Meter current prompt statistic`

### Runtime source mapping

| Runtime path | `latestPromptTokens` source | `effectiveContextWindowTokens` source | Notes |
| --- | --- | --- | --- |
| Native AutoByteus | Normalized provider usage gross prompt tokens. For `gross_includes_cache`, this is reported input; for `base_excludes_cache`, this is input + cache read + cache creation. | `resolveTokenBudget(...).effectiveContextCapacity` in the LLM phase. | Compute before emitting `TOKEN_USAGE_UPDATED`; pass the same budget to compaction evaluation to avoid duplicated policy. |
| Codex app-server | `tokenUsage.last.inputTokens`; never `tokenUsage.total.inputTokens`. | `tokenUsage.modelContextWindow`. | Current probe confirms both are present. |
| Claude Agent SDK | Terminal result usage gross prompt: `input_tokens + cache_read_input_tokens + cache_creation_input_tokens`. | `modelUsage[model].contextWindow` when present; otherwise trusted model catalog context window. | Do not sum duplicate assistant chunk usage rows. |
| Other providers through native AutoByteus | Same as native AutoByteus after provider observation normalization. | Same as native AutoByteus. | Provider-specific cache semantics are owned by the normalizer/component basis. |

### Ownership and boundary rules

- Provider/runtime adapters own extraction of raw usage/context-window fields.
- `resolveTokenBudget` remains the owner for model context capacity in native AutoByteus.
- The token usage event enrichment path owns transporting these fields to the ledger/UI.
- The frontend only formats server-provided `latestPromptTokens`, `effectiveContextWindowTokens`, and `contextWindowUsagePercent`; it must not recompute from raw provider payloads.
- The denominator must be the effective context window, not `inputBudget`, `triggerThresholdTokens`, or cumulative run input.

### File responsibility adjustments

| File | Adjustment |
| --- | --- |
| `autobyteus-ts/src/agent/loop/llm-phase.ts` | Resolve token budget before `notifyAgentTokenUsageUpdated`; include `latest_prompt_tokens`, `effective_context_window_tokens`, and `context_window_usage_percent` in the event payload. Pass the resolved budget into compaction evaluation or shared context-stat helper to avoid recomputation. |
| `autobyteus-ts/src/agent/loop/llm-phase-compaction.ts` | Stop being the only place that knows the context window; consume already-resolved budget when available. Keep compaction decision internal; do not add decision text to Token Meter. |
| `autobyteus-ts/src/agent/events/notifiers.ts` and streaming payload types | Allow the new context-stat fields on token usage events. |
| `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread-token-usage.ts` | Map `tokenUsage.last.inputTokens` to `latest_prompt_tokens` and `tokenUsage.modelContextWindow` to `effective_context_window_tokens`; compute percent. |
| `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session-token-usage.ts` | Map terminal result gross prompt tokens and `modelUsage.contextWindow` to the same canonical fields. |
| `autobyteus-server-ts/src/agent-execution/domain/agent-run-token-usage.ts` | Rename public/domain fields from context-pressure naming to simple context-stat naming. |
| `autobyteus-server-ts/src/token-usage/providers/token-usage-ledger-store.ts` | Carry latest context-stat fields from the latest event into summaries. |
| `autobyteus-server-ts/src/api/graphql/types/token-usage-stats.ts` and `autobyteus-web/types/tokenUsageMeter.ts` | Expose `latestPromptTokens`, `effectiveContextWindowTokens`, `contextWindowUsagePercent`. |
| `autobyteus-web/components/workspace/usage/TokenUsageMeterPanel.vue` | Render the simple `Current prompt` statistic section; no compaction/compression decision wording. |


## Approved Token Meter UI Shape

The user approved the following information hierarchy. Implementation may adjust visual styling, but must preserve the semantics and grouping.

```text
Token Meter
Live server-accounted usage and estimated API price.

Current prompt
12,625 / 1,000,000 ctx tokens
1.3% used

Gross input              Output                 Total estimate
650,712 tokens           3,985 tokens           654,697 tokens
Cache hit 88.4%          Thinking 1,548         $0.5300 est
Cost $0.4104             Cost $0.1195

Input breakdown
Uncached / full-price input    75,480 tok    $0.1887
Cache hits / discounted input  575,232 tok   $0.2217
Cache writes                   —             —
Total input cost                             $0.4104

Pricing details
Model              gpt-5.5
Runtime            codex_app_server
Price status       Complete estimate
Usage reports      4 model calls
```

Implementation notes:

- `Current prompt` uses `latestPromptTokens / effectiveContextWindowTokens` and `contextWindowUsagePercent`.
- `Gross input` uses cumulative gross input tokens and cache-aware input cost.
- The primary input card should include cache hit rate when meaningful.
- The detailed input breakdown owns the component explanation: uncached/full-price, cache hits/discounted, cache writes, total input cost.
- Cache writes are visible only when reported or when showing an explicit empty row improves clarity; do not imply every request creates/writes cache.
- `Usage reports` belongs in details, not as unexplained primary `events` text.


## Frontend Visual Validation Design Requirement

This UI change must be validated in the running product by the implementation engineer before handoff. This is an implementation-scoped visual QA requirement, not a replacement for API/E2E coverage owned later by the API/E2E engineer.

Validation spine:

`Start server -> Start frontend -> Run/select real token-emitting agent -> Open Token Meter -> Inspect approved layout with realistic data -> Iterate UI -> Record visual QA evidence in implementation handoff`

Ownership:

- Implementation engineer owns the initial running-app visual inspection while implementing the frontend.
- The Token Meter UI component owns responsive layout, spacing, wrapping, label clarity, and primary/detail hierarchy.
- Server/frontend tests remain required, but they do not replace visual inspection for this UI change.

Minimum evidence in implementation handoff:

- backend/server command used;
- frontend command used;
- agent/run used to produce token data;
- short visual QA result for the Token Meter area;
- screenshot path when practical, or explicit reason screenshot was not captured.

The engineer should iterate until the approved UI shape is visually acceptable in the actual app, not merely present in code.

## Migration / Refactor Sequence

1. **Add canonical domain structures.**
   - Add `InputTokenSemantic = 'gross_includes_cache' | 'base_excludes_cache' | 'unknown'`.
   - Add `CacheState = 'positive' | 'zero_reported' | 'not_reported' | 'unsupported_or_local' | 'unknown'`.
   - Add event fields: `input_token_semantic`, `standard_input_tokens`, `cache_miss_input_tokens`, `cache_creation_5m_input_tokens`, `cache_creation_1h_input_tokens`, `cache_state`, `missing_price_dimensions`, `pricing_policy_key`, and cache-write subtype prices/costs as needed.
   - Keep `accounting_input_tokens` as gross input delta; public summaries should expose `grossInputTokens`.
2. **Extend provider/runtime normalizers.**
   - OpenAI-compatible: set gross semantic; preserve `prompt_cache_miss_tokens`; set xAI/Grok billable output when reasoning separate.
   - Anthropic: set additive/base semantic; preserve cache creation subtypes.
   - Gemini: fix thoughts-only billable output; set gross semantic/cache state.
   - Codex: set gross semantic; keep `last` preference.
   - Claude SDK: terminal result only; additive semantic.
3. **Insert component basis resolver before delta/pricing.**
   - In `TokenUsageEventEnrichmentTransformer`, call resolver after context enrichment and before `TokenUsageSnapshotDeltaNormalizer`.
   - For per-call/per-turn: set accounting input to gross.
   - For snapshots: add new component fields to cumulative snapshot source-token delta list.
4. **Extend pricing config/policy.**
   - Add cache-write 5m/1h dimensions and trusted flags.
   - Add local/no-bill policy status.
   - Add missing-dimension list and selected tier metadata.
   - Correct catalog gaps: Kimi highspeed, Qwen policy or missing status, Gemini cache/tier, Anthropic write subtypes, custom endpoints no zero, GLM endpoint identity, local runtimes.
5. **Refactor cost calculator.**
   - Use explicit `standard_input_tokens`, cache read, cache write subtypes, and `billable_output_tokens`.
   - Compute component costs and statuses from trusted dimensions.
   - Do not infer provider raw semantics in the calculator.
6. **Persist new event fields.**
   - Add Prisma migration columns for new fields needed by durable summaries.
   - Update SQL mapper both directions.
   - Existing historical rows without fields should be re-read with `input_token_semantic='unknown'` or provider-inferred only when safe; do not use legacy flat formula for new calculations.
7. **Expand ledger summaries.**
   - Add `gross_input_tokens`, `standard_input_tokens`, cache component tokens, rates, cache state, component costs, missing dimensions, `usage_report_count`, and cost groups.
   - Keep unsafe mixed-currency totals null and expose grouped detail.
8. **Expand GraphQL and frontend DTO/store.**
   - Add fields to GraphQL object/fragment and TypeScript types.
   - Store merges component deltas exactly like server summaries.
   - Status merge handles `local_no_api_bill` and mixed statuses.
9. **Redesign Token Meter UI.**
   - Top cards: Gross Input, Output, Total Estimate.
   - Input card subline: cache hit rate + uncached/full-price tokens where meaningful.
   - Expandable `Input cost breakdown`: uncached/full-price, cache hits, cache writes, total input cost.
   - Expandable `Pricing details`: model/runtime/provider, complete/partial/missing/local/mixed status, missing dimensions, usage reports/model calls count.
   - Current context statistics remain separate and labeled as current prompt over effective context window; source fields are `latestPromptTokens`, `effectiveContextWindowTokens`, and `contextWindowUsagePercent`; do not show compaction/compression decision text.
10. **Add tests and docs.**
   - Add fixture-based normalizer/calculator tests for all probed providers/runtimes.
   - Add ledger aggregation tests for GLM screenshot aggregate, Anthropic additive, xAI reasoning, Gemini thoughts-only, missing cache pricing, local/no bill, mixed currency.
   - Add GraphQL/store/UI tests.
   - Update token usage docs and provider audit artifact.

## Key Tradeoffs

- **Explicit fields vs deriving on read**: add explicit semantic/component fields because provider raw semantics differ and raw payloads are not a stable query contract. This is more schema work but prevents silent mispricing.
- **One generic pricing policy vs provider-specific calculators**: use one calculator with provider-aware policy and component basis. This centralizes math while avoiding provider-specific if/else scattered through UI and adapters.
- **Show more UI data vs avoid overload**: top-level UI remains compact; detailed rows are expandable. Cache hit rate and uncached tokens are visible because they directly explain cost.
- **Historical rows**: prefer safe unknown/partial status over trying to backfill exact provider semantics from incomplete old rows.

## Risks

- Pricing docs and model names change frequently; catalog entries need source/date metadata and tests must not assume outdated prices forever.
- Provider payloads may vary by endpoint, SDK version, service tier, or model family; fixtures should include raw shape metadata and quality flags.
- Qwen/Gemini/Grok tier selection rules may need provider-specific metadata not currently present in model identity.
- Adding many fields to summary/UI could overcrowd the panel if not grouped carefully.
- If `accounting_input_tokens` is not consistently redefined as gross input delta, the UI and calculator can diverge.
- Existing settings token statistics may still use `promptTokens`; copy and docs must clarify or rename to gross input.

## Guidance For Implementation

### Canonical event/summary fields

Target event and summary fields should include at least:

- `latestPromptTokens` and `effectiveContextWindowTokens` for the simple `Current prompt / context window` statistic when available
- `input_token_semantic`
- `grossInputTokens` in public summary, backed by `accounting_input_tokens` gross deltas
- `standardInputTokens`
- `cacheReadInputTokens`
- `cacheCreationInputTokens`
- `cacheCreation5mInputTokens`
- `cacheCreation1hInputTokens`
- `cacheMissInputTokens`
- `cacheReadInputTokenRate`
- `standardInputTokenRate`
- `cacheState`
- `outputTokens`
- `reasoningOutputTokens`
- `billableOutputTokens` where needed for cost
- `estimatedApiStandardInputCost`
- `estimatedApiCacheReadInputCost`
- `estimatedApiCacheCreationInputCost`
- `estimatedApiCacheCreation5mInputCost`
- `estimatedApiCacheCreation1hInputCost`
- `estimatedApiInputCost`
- `estimatedApiOutputCost`
- `estimatedApiReasoningOutputCost` as an explanatory subcomponent, not an extra addition if already included in output
- `estimatedApiTotalCost`
- `apiCostStatus`
- `missingPriceDimensions`
- `pricingPolicyKey` / selected tier metadata
- `usageReportCount`
- optional `costGroups`

### Cost calculation rules

1. For `gross_includes_cache`:
   - `gross = reported/accounting input`
   - `standard = provider cache miss if present; else max(gross - cacheRead - cacheCreation, 0)`
2. For `base_excludes_cache`:
   - `standard = reported/accounting base input`
   - `gross = standard + cacheRead + cacheCreation`
3. For output:
   - `outputCost` uses `billable_output_tokens` if present, else accounting output.
   - `reasoningOutputTokens` is displayed as a component. It is priced separately only as explanatory attribution; do not add it to total twice when already included in billable output.
4. For cache creation:
   - Price 5m/1h subtype buckets with their own dimensions when available.
   - If only aggregate cache creation is known and multiple write rates may apply, mark missing/partial instead of guessing.
5. For missing dimensions:
   - Positive tokens in a dimension with no trusted price -> `partial_price_missing` and include that dimension in `missingPriceDimensions`.
6. For local runtimes:
   - `local_no_api_bill`, cost `0`, currency null or configured display, and UI copy `Local / no API bill`.
7. For custom OpenAI-compatible endpoints:
   - no trusted price unless explicitly configured; do not use constructor default zero.


### Current context statistics refinement

The Token Meter should include a separate statistics-only section when the server provides context fields:

```text
Current prompt
12,625 / 1,000,000 context tokens
1.3% used
```

This section must not show compaction/compression decision text such as `compression not needed` or `compaction required`. The purpose is only to show the latest/current prompt size against the effective context window.

Authoritative server fields:

- `latest_prompt_tokens` / frontend `latestPromptTokens`
- `effective_context_window_tokens` / frontend `effectiveContextWindowTokens` as the preferred public name. Existing `effective_context_budget_tokens` may be reused only if implementation confirms it represents the total effective context window, not input budget after reservations.
- `context_window_usage_percent` / frontend `contextWindowUsagePercent`

If these fields are absent, the section remains hidden.

### UI copy intent

Use user-centered labels:

- `Gross input` or `Total input sent` instead of plain `Input`.
- `Uncached / full-price input`.
- `Cache hits / discounted input`.
- `Cache writes`.
- `Cache hit rate`.
- `Complete estimate`, `Partial estimate`, `Price missing`, `Local / no API bill`, `Mixed currencies/providers`.
- `Usage reports` or `Model calls`, with tooltip: `Token usage reports emitted by a runtime/provider, usually one model call or model turn; not user messages.`

### Validation checklist

- GLM screenshot aggregate reproduces:
  - gross input `115,908`
  - cache read `102,464`
  - standard input `13,444`
  - cache rate `88.4%`
  - total cost `0.479892 CNY`
- Anthropic additive fixture computes gross `input + cache read + cache creation`.
- xAI/Grok fixture bills reasoning output correctly.
- Gemini thoughts-only fixture does not lose output cost.
- Custom OpenAI-compatible endpoint shows price missing without configured pricing.
- Local Ollama/LMStudio shows local/no API bill.
- Mixed currency aggregate does not show a fake single monetary total.
- Live and GraphQL hydration paths display the same component breakdown.
- Current context statistic renders `latestPromptTokens / effectiveContextWindowTokens` and percent when available, without compaction/compression status text.
- Running-app visual QA confirms the Token Meter layout with realistic token data after starting backend and frontend and running/selecting a real token-emitting agent.
