# OpenAI GPT-5.6 API Model Integration Design Spec

## Status

`Ready for architecture review`

Requirements basis approved by the user on 2026-07-10 and expanded the same day with explicit frontend cache-write price/cost visibility plus a requested Codex-runtime source probe. This spec supersedes the earlier review package.

## Current-State Read

### Current execution path

The AutoByteus API-runtime model catalog is static at its authoritative definition boundary and generic everywhere above it:

`GraphQL model query -> ModelCatalogService(AUTOBYTEUS) -> AutobyteusModelCatalog/cache -> AutobyteusLlmModelProvider -> LLMFactory -> supportedModelDefinitions + ModelMetadataResolver -> LLMModel/ModelInfo`

Agent execution follows the selected exact identifier through the same registry boundary:

`AgentRunConfig.llmModelIdentifier -> AutoByteusAgentRunBackendFactory -> LLMFactory.createLLM -> OpenAILLM -> OpenAIResponsesLLM -> OpenAI /v1/responses`

Token usage returns through a provider-adapter boundary before generic accounting:

`OpenAI response usage -> createOpenAICompatibleTokenUsageObservation -> LlmTokenUsageObservation -> token-usage event -> TokenUsageComponentBasisResolver -> TokenCostCalculator`

The provider-neutral priced result already reaches the frontend through two convergent paths:

`priced TOKEN_USAGE_UPDATED -> tokenUsageMeterStore` **or** `ledger projection -> GraphQL TokenUsageRunSummary -> tokenUsageMeterStore -> TokenUsageMeterPanel`

Codex runtime has a separate external usage boundary:

`Codex app-server thread/tokenUsage/updated -> resolveCodexThreadTokenUsage -> TOKEN_USAGE_UPDATED -> generic server accounting`

### Current ownership boundaries

- `supported-model-definitions.ts` owns built-in model identity, concrete LLM adapter selection, parameter schemas, and trusted static token prices.
- `curated-model-metadata.ts` owns documentation-backed model limits for providers without a live metadata resolver.
- `LLMFactory` is the authoritative runtime registry and pricing lookup boundary. Callers above it do not read static definitions directly.
- `OpenAIResponsesLLM` owns OpenAI Responses request/response translation.
- `openai-compatible-token-usage-normalizer.ts` owns mapping OpenAI-shaped usage payloads into the provider-neutral token-usage domain.
- The server token-usage subsystem owns provider-neutral component resolution, pricing-tier selection, and cost calculation. It must not learn OpenAI raw field names.
- `tokenUsageMeterStore` owns live-event aggregation and ledger-backed GraphQL hydration into one frontend summary shape.
- `TokenUsageMeterPanel` owns conditional presentation of server-provided components and unit prices; it does not own price facts or monetary calculation.
- `resolveCodexThreadTokenUsage` owns Codex app-server usage translation and raw-payload retention. It must not infer fields the installed Codex protocol does not expose.

### Current gap

- No catalog rows or curated limits exist for `gpt-5.6-sol`, `gpt-5.6-terra`, or `gpt-5.6-luna`.
- The shared older-OpenAI reasoning schema advertises through `xhigh` and has default `none`; GPT-5.6 additionally supports `max` and officially defaults to `medium` when omitted.
- Pricing infrastructure already supports generic cache-write price and input-token tiers, but no GPT-5.6 pricing policies exist.
- The shared usage observation already has `cache_creation_input_tokens`, and the server already prices generic cache creation. The OpenAI-compatible normalizer reads `cached_tokens` but does not map GPT-5.6 `cache_write_tokens` or treat a write-only request as positive cache activity.
- Without that mapping, gross input write tokens remain in the derived standard-input bucket and are priced at `1.0x` rather than GPT-5.6's `1.25x` write rate.
- Server event/ledger/GraphQL and frontend types already include generic cache-write tokens, unit price, and cost. `TokenUsageMeterPanel` already renders positive generic writes in Input breakdown and Calculation details. The frontend production path is not missing a field; it is starved of correct OpenAI data by the upstream normalizer gap.
- Existing GraphQL E2E and frontend store coverage prove the generic write transport and unit-price convergence, but component coverage does not directly assert the positive generic cache-write row.
- The current installed Codex app-server `TokenUsageBreakdown` and real `gpt-5.6-sol` events expose cache reads as `cachedInputTokens` but no cache-write field. A point-in-time ledger probe found 2,676 Sol Codex events with zero raw/canonical write fields. AutoByteus is not dropping one; cache creation is correctly `null` at this boundary.
- Consequently, the shared GPT-5.6 write price can be applied to direct API events after normalization, but a Codex cache-write cost/row cannot be produced until Codex exposes a count. Any hidden internal write remains an upstream observability limitation.

### Constraints the target design must respect

- Static built-in catalog visibility remains entitlement-neutral.
- The three canonical suffixed API IDs are the only new rows; the unsuffixed Sol alias is not another selectable model.
- Existing OpenAI models must not falsely advertise GPT-5.6-only `max` effort through this task.
- Provider raw usage fields stop at the normalizer boundary.
- Long-context pricing selection continues to use gross/accounting input tokens and the existing tier mechanism.
- Frontend presentation remains provider-neutral and server-authoritative; no GPT-5.6 price table, cost recomputation, or model-specific UI branch is permitted.
- The existing accessible Calculation details disclosure, zero-row hiding, and mixed/missing price labels remain unchanged.
- Direct Responses API and Codex app-server usage shapes remain separate contracts. Do not copy direct API field assumptions into the Codex adapter.
- Missing Codex cache creation remains `null`, never inferred from gross-minus-read remainder and never coerced to zero.
- Optional GPT-5.6 features such as pro mode, persisted reasoning, explicit cache controls, programmatic tool calling, and multi-agent remain out of scope.

## Intended Change

Extend the existing OpenAI catalog and usage adapter without adding a provider, transport path, server conditional, or compatibility layer:

1. Add exact built-in model rows for Sol, Terra, and Luna using `OpenAILLM`.
2. Add individual curated metadata rows with official 1.05M context and 128K output limits.
3. Introduce a small local OpenAI reasoning-schema builder in `supported-model-definitions.ts`, preserving the older schema and constructing a GPT-5.6 schema with `max` and default `medium`.
4. Introduce a small local GPT-5.6 pricing builder that derives cache-read (`0.1x`), cache-write (`1.25x`), and greater-than-272K input tiers from each model's official standard input/output prices.
5. Map nested `cache_write_tokens` from Responses/Chat input-token details into the existing `cache_creation_input_tokens` observation field, with a harmless top-level fallback for OpenAI-compatible variants.
6. Count either a positive read or positive write as positive cache activity.
7. Preserve the existing server-to-frontend generic cache-write contract so a positive GPT-5.6 write automatically appears as `Cache writes` in Input breakdown and as tokens + per-million unit price + estimated cost in expanded Calculation details.
8. Add/confirm focused component-visible evidence for an OpenAI-style generic write (no 5m/1h subtype), while reusing the already-covered GraphQL and live/hydrated store paths.
9. Extend focused catalog, metadata, request-shape, usage-normalizer, and pricing coverage.
10. Preserve the current Codex adapter's null/no-fabrication behavior and raw payload retention. Re-generate the supported Codex app-server protocol during API/E2E; only a newly observed official field can trigger a separate explicit mapping design.

## Supplemental Solution Artifacts

- `codex-cache-write-probe.md`
  - Path: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/openai-new-api-models/codex-cache-write-probe.md`
  - Scope/status: complete factual installed-protocol, live-session, ledger, and adapter evidence.
  - Related IDs: `REQ-011`, `AC-013`, `AC-014`, `DS-006`.

The frontend requirement preserves an existing component, states, and accessible disclosure; the authoritative user-visible contract is compactly captured by `REQ-010`, `AC-011`, `AC-012`, and `DS-005`, so a separate UI/UX supplement would duplicate rather than clarify it.

## Task Design Health Assessment (Mandatory)

- Change posture: `Feature`
- Current design issue found: `No`
- Root cause classification: `No Design Issue Found`
- Refactor needed now: `No`
- Evidence: the static catalog, curated metadata, runtime registry, direct API provider adapter, Codex runtime adapter, provider-neutral usage model, pricing calculator, server projection, GraphQL/live transport, frontend store, and Token Meter each already own the exact concern required by the change. The direct API production gap is a new external usage field at the correct adapter boundary plus missing model facts; the Codex boundary has an upstream data absence, not a parser defect.
- Design response: extend each existing owner narrowly; keep model-specific facts below `LLMFactory` and raw OpenAI usage below the normalizer.
- Refactor rationale: a new subsystem, model-family adapter, server pricing branch, or registry split would add empty indirection. A small schema/pricing builder inside the existing definition file avoids duplication without changing architecture.
- Intentional deferrals and residual risk: entitled direct API invocation is deferred to an environment with GPT-5.6 API access. Optional GPT-5.6 request features remain follow-up work and are not required for a coherent standard model integration. No frontend production refactor is needed; a focused component test closes the evidence gap. Codex internal write counts remain unavailable until its app-server protocol changes.

The current owner, boundary, API shape, and file placement remain healthy: model facts remain together, transport remains generic, token usage is normalized once, server accounting remains provider-neutral, and the frontend renders rather than derives prices.

## Terminology

- `Standard input tokens`: current-request prompt tokens neither read from nor written to the cross-request prompt cache.
- `Cache-read tokens`: prompt-prefix input tokens whose reusable prefill KV state was loaded from provider cache; OpenAI reports them as `cached_tokens`.
- `Cache-write tokens`: current-request prompt input tokens whose newly computed prefix KV state was persisted for possible later reuse; OpenAI reports them as `cache_write_tokens`.
- `Unobservable Codex cache write`: a possible internal Codex/provider operation for which the current app-server event reports no token count. It is unknown, not zero, and cannot be reconstructed from the uncached remainder.
- `Gross input tokens`: the provider-reported total prompt/input token count, including standard, read, and write categories.
- `GPT-5.6 family`: the three canonical selectable rows Sol, Terra, and Luna; the unsuffixed `gpt-5.6` string is an alias for Sol, not a fourth family member.

## Design Reading Order

The design proceeds from the no-migration decision through catalog, invocation, usage/pricing, and frontend-presentation spines, then maps those owners into the existing LLM, token-usage, and Token Meter capability areas and files.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: no obsolete production path is replaced in this additive integration, so no existing file or behavior requires removal.
- The design explicitly rejects alias duplication, entitlement fallback/substitution, and a dual OpenAI adapter path.
- Existing older-model reasoning schema remains because it represents a still-current, distinct contract; retaining it is not legacy compatibility.

## Persisted Data / State Transition Decision (Mandatory When Persisted Data May Be Affected)

- Stored subject, location, representative shape, and approximate volume: no persisted schema changes. Static model definitions and price policies are loaded from code. Existing token-usage ledger rows remain immutable historical observations.
- Relevant code-model, serialization, semantic, or physical-store change: three new runtime identifiers and a new mapping into an already-existing optional `cache_creation_input_tokens` field.
- Normal reader/writer behavior and representative evidence: `LLMFactory` registers exact identifiers generically; server catalog mapping and ledger ingestion already tolerate the existing cache-creation field.
- Required semantics and invariants under direct use: all existing identifiers retain their meaning; new cache-write observations use the canonical generic cache-creation dimension.
- Physical-store, privacy/security, disposal/rebuild, and operational constraints: none. No existing row is reinterpreted or rewritten.
- Decision: `Not Affected`
- Decision rationale: no migration offers a correctness benefit. Rewriting historical usage would invent cache-write facts that were not previously normalized and would be incorrect.
- Acceptance criteria or design constraints supported by this decision: `AC-003`, `AC-008`, `AC-009`.

No migration plan applies.

## Data-Flow Spine Inventory

| Spine ID | Scope | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| `DS-001` | `Primary End-to-End` | AutoByteus runtime model catalog request | GraphQL/client model rows | `LLMFactory` registry | Proves the three definitions become discoverable with correct identity, limits, and schema without server conditionals |
| `DS-002` | `Primary End-to-End` | Agent run selects a GPT-5.6 identifier | OpenAI Responses request/response | `LLMFactory` resolution plus `OpenAIResponsesLLM` transport | Proves every new identifier uses the existing canonical OpenAI path and carries `max` effort correctly |
| `DS-003` | `Return-Event` | OpenAI Responses usage payload | Priced token-usage event/ledger fields | Provider normalizer, then server token-usage owners | Prevents cache-write tokens from being misclassified and underpriced |
| `DS-004` | `Bounded Local` | Trusted GPT-5.6 pricing config plus gross input count | Selected standard or long-context price policy | `TokenCostCalculator` | Proves existing tier selection applies the correct price dimensions based on the >272K threshold |
| `DS-005` | `Return-Event / Presentation` | Priced provider-neutral cache-write event or ledger summary | Focused Token Meter Input breakdown and Calculation details | Server token-usage owners for values; `tokenUsageMeterStore` for projection; `TokenUsageMeterPanel` for presentation | Proves GPT-5.6 write tokens, unit price, and cost reach the user without browser pricing logic |
| `DS-006` | `Return-Event / External Source Boundary` | Codex app-server `thread/tokenUsage/updated` | Provider-neutral Codex usage event with retained raw payload | `resolveCodexThreadTokenUsage` | Proves current Codex cache-write data is absent upstream, not dropped; enforces null/no-inference behavior and future protocol detection |

## Primary Execution Spine(s)

### `DS-001 — Catalog discovery`

`GraphQL query -> ModelCatalogService -> AutobyteusModelCatalog -> AutobyteusLlmModelProvider -> LLMFactory -> supported definitions + curated metadata -> ModelInfo -> GraphQL response`

### `DS-002 — Standard invocation`

`AgentRunConfig -> AutoByteusAgentRunBackendFactory -> LLMFactory.createLLM -> OpenAILLM -> OpenAIResponsesLLM -> OpenAI /v1/responses -> CompleteResponse/ChunkResponse`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| `DS-001` | A catalog request reaches the AutoByteus catalog facade, which delegates to the factory registry. Initialization composes each static definition with curated limits, registers exact identifiers, and returns generic `ModelInfo` rows to GraphQL. | catalog request, registry, model definition, model info | `LLMFactory` | static pricing, curated limits, parameter schema |
| `DS-002` | An agent run carries the chosen exact identifier to the backend factory. `LLMFactory` resolves the registered row, constructs `OpenAILLM`, and the existing Responses adapter submits the model's `value` unchanged with any configured reasoning effort. | run configuration, registered model, OpenAI adapter, provider request | `LLMFactory` for identity; `OpenAIResponsesLLM` for transport | API credential, entitlement, request config |
| `DS-003` | Provider usage returns through `OpenAIResponsesLLM` to the OpenAI-compatible normalizer. The normalizer classifies nested cached-read and cache-write counts into the shared observation. The server derives standard input, selects trusted prices, and calculates separate standard/read/write/output costs. | raw usage, normalized observation, component basis, priced event | normalizer at provider boundary; token-usage subsystem after normalization | raw JSON preservation, cache-state quality, price lookup |
| `DS-004` | The pricing calculator selects the first tier whose gross-input bound applies. For >272K requests it replaces all input-category and output prices with the derived long-context tier before calculating costs. | pricing policy, gross input, selected tier, component costs | `TokenCostCalculator` | model catalog price facts |
| `DS-005` | The enriched event exposes generic write tokens, generic write unit price, generic write cost, input cost, and total cost. Live streaming merges the snake-case fields into `TokenUsageRunSummary`; ledger-backed GraphQL returns the equivalent camel-case summary. The focused Token Meter conditionally displays positive writes and uses the server-provided unit-price summary. | priced event, ledger summary, frontend summary, focused Token Meter | server token-usage owners for truth; frontend store/panel for projection/presentation | live/hydrated convergence, zero-row hiding, mixed/missing labels, accessibility |
| `DS-006` | Codex app-server emits cumulative and last-token breakdowns. The adapter maps gross input, cached read, output, and reasoning, retains the raw records, and keeps cache creation null because the installed official type has no write field. Downstream pricing may know a write rate but cannot apply it without a count. | Codex token notification, runtime adapter, canonical event, raw evidence | `resolveCodexThreadTokenUsage` | installed protocol version, cumulative-snapshot delta, upstream field availability |

## Spine Actors / Main-Line Nodes

- `ModelCatalogService`: routes by runtime kind; it does not own provider model facts.
- `AutobyteusModelCatalog`: thin cached facade for AutoByteus-runtime catalog access.
- `LLMFactory`: authoritative model registry, exact-identifier resolver, and pricing lookup boundary.
- `OpenAIResponsesLLM`: provider transport adapter for standard and streaming Responses calls.
- `createOpenAICompatibleTokenUsageObservation`: authoritative raw OpenAI-shaped usage translator.
- `TokenUsageComponentBasisResolver`: provider-neutral standard/read/write component resolver.
- `TokenCostCalculator`: provider-neutral tier selection and component cost owner.
- `TokenUsageRunSummary` GraphQL/live payload contract: provider-neutral transport boundary for cache-write components and prices.
- `tokenUsageMeterStore`: converges live deltas and ledger-backed summaries without model-specific pricing knowledge.
- `TokenUsageMeterPanel`: displays server-owned cache-write tokens, unit price, and cost using the existing accessible disclosure.
- `resolveCodexThreadTokenUsage`: maps the installed Codex app-server token contract, chooses cumulative/last semantics, and preserves source evidence without guessing missing components.

## Ownership Map

| Node | Owns | Must Not Own |
| --- | --- | --- |
| `supportedModelDefinitions` | exact model facts, adapter selection, exposed config schema, trusted static prices | server routing, credential entitlement, API invocation |
| `ModelMetadataResolver`/curated metadata | context/input/output limits and provider metadata precedence | pricing, transport, UI ordering |
| `LLMFactory` | registry lifecycle, identifier uniqueness, model construction, generic pricing lookup | raw OpenAI usage parsing, account-specific availability probing |
| `OpenAIResponsesLLM` | Responses request/stream/response mapping | model catalog facts, server ledger calculation |
| OpenAI-compatible usage normalizer | external usage field recognition and shared observation construction | price selection or ledger persistence |
| Token-usage server owners | generic component semantics, trusted price resolution, tier selection, cost calculation | OpenAI raw field names or GPT-5.6-specific branches |
| `tokenUsageMeterStore` | live/hydrated projection, deduplication, aggregate unit-price status | provider price facts or provider-specific token parsing |
| `TokenUsageMeterPanel` | conditional component display, formatting, disclosure interaction | model pricing lookup, cost arithmetic, cache-write inference |
| `resolveCodexThreadTokenUsage` | Codex protocol field mapping, cumulative/last selection, raw evidence | direct API field assumptions, inferred cache writes, price selection |

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `ModelCatalogService.listLlmModels` | `AutobyteusModelCatalog` -> `LLMFactory` | runtime-kind routing | GPT-5.6 identifiers or prices |
| `AutobyteusModelCatalog` | `CachedAutobyteusLlmModelProvider` -> `LLMFactory` | stable catalog API and cache lifecycle | provider-specific model construction |
| `OpenAILLM` | `OpenAIResponsesLLM` | binds OpenAI API key/base URL defaults | a separate GPT-5.6 transport or alias policy |
| `TokenUsageMeterPanel` | server summary via `useTokenUsageWorkspaceScope`/`tokenUsageMeterStore` | user-facing Token Meter entry surface | provider price tables or recalculated costs |
| Codex thread notification handler | `resolveCodexThreadTokenUsage` | routes `thread/tokenUsage/updated` into the runtime adapter | treating absent fields as zero or parsing direct Responses details |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope | Notes |
| --- | --- | --- | --- | --- |
| None | No production path is replaced; the feature fits existing owners | N/A | `In This Change` | Review must confirm no duplicate alias row, entitlement branch, or family adapter is introduced |

## Return Or Event Spine(s) (If Applicable)

`OpenAI response usage -> OpenAIResponsesLLM.createTokenUsage -> createOpenAICompatibleTokenUsageObservation -> LlmTokenUsageObservation -> agent token-usage event -> TokenUsageComponentBasisResolver -> TokenPriceConfigProvider -> TokenCostCalculator -> ledger/projections`

The return spine must preserve `input_tokens` as gross input, map `cached_tokens` to `cache_read_input_tokens`, map `cache_write_tokens` to `cache_creation_input_tokens`, and let the existing resolver derive:

`standard_input_tokens = gross_input_tokens - cache_read_input_tokens - cache_creation_input_tokens`

No OpenAI-specific field may move past the normalizer.

The priced return then continues provider-neutrally:

`TokenCostCalculator -> enriched event/ledger -> live TOKEN_USAGE_UPDATED or GraphQL TokenUsageRunSummary -> tokenUsageMeterStore -> TokenUsageMeterPanel`

For GPT-5.6, `cache_creation_5m_input_tokens` and `cache_creation_1h_input_tokens` remain zero, so the panel's generic cache-write Calculation details row consumes:

- `cacheCreationInputTokens` for tokens;
- `unitPrices.cacheCreationInput` for the server-summarized per-million price;
- `estimatedApiCacheCreationInputCost` for cost.

The panel must not derive any of those values from the model identifier.

For Codex app-server, the source spine ends earlier with `cache_creation_input_tokens = null`. The frontend therefore shows no cache-write row. The write price may exist in the shared model policy, but a price without an observed token quantity is not a billable component.

## Bounded Local / Internal Spines (If Applicable)

### `DS-004` inside `TokenCostCalculator`

Parent owner: `TokenCostCalculator`.

`gross input -> select first matching input-price tier -> replace component prices -> price standard/read/write/output tokens -> emit estimated total and selected tier ID`

This matters because the >272K input threshold also changes the output price for the whole request. Existing tier selection already owns this behavior; model definitions only provide facts.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Curated model limits | `DS-001` | `LLMFactory` model construction | supply official context/output limits | OpenAI has no live metadata provider in this codebase | server/UI would duplicate model facts |
| Parameter-schema construction | `DS-001`, `DS-002` | static model definitions | expose accurate effort enum/default per family | older and GPT-5.6 contracts differ | global schema would advertise unsupported `max` |
| GPT-5.6 pricing construction | `DS-001`, `DS-003`, `DS-004` | static model definitions/pricing lookup | encode standard and derived tier prices once | prices are model facts | cost calculator would gain provider branches |
| Raw usage preservation | `DS-003` | usage normalizer/observation | retain original payload for evidence | supports future provider-shape diagnostics | ledger/business code might parse raw JSON inconsistently |
| Entitled live validation | `DS-002`, `DS-003` | API/E2E evidence only | prove provider accepts IDs and observe usage | current key lacks access | product code might incorrectly gate static rows |
| Frontend cache-write disclosure | `DS-005` | `TokenUsageMeterPanel` | format and conditionally show server-provided generic write values | users need to see the more-expensive write category | browser may duplicate price facts or double count input |
| Live/hydrated convergence | `DS-005` | `tokenUsageMeterStore` | preserve equal generic write semantics across event and GraphQL paths | focused runs can be live or reopened | UI behavior would differ by run lifecycle |
| Installed Codex protocol evidence | `DS-006` | Codex runtime adapter | define exactly which source fields exist and which do not | direct API and Codex shapes differ | speculative mappings could fabricate usage or silently miss a future real field |
| Codex raw payload retention | `DS-006` | Codex runtime adapter/ledger | preserve exact source event for diagnosis and future version recheck | write observability may change upstream | future protocol changes would be undetectable |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Static OpenAI rows | LLM model catalog | `Extend` | established authoritative owner | N/A |
| Official limits | curated model metadata | `Extend` | current OpenAI pattern | N/A |
| Family config schema | parameter schema inside model definitions | `Extend` | same semantic owner; local builder avoids duplication | N/A |
| Cache-write prices/tiering | `TokenPricingConfig` | `Reuse` | already represents generic writes and input tiers | N/A |
| Raw cache-write usage | OpenAI-compatible usage normalizer | `Extend` | correct external adapter boundary | N/A |
| Standard/read/write cost | server token-usage subsystem | `Reuse` | already correct once normalized data/prices arrive | N/A |
| New GPT-5.6 provider/adapter | existing `OpenAILLM`/Responses adapter | `Reuse` | no contract requires a new transport | N/A |
| Cache-write frontend data model/transport | server GraphQL/live payload plus frontend `TokenUsageRunSummary` | `Reuse` | generic tokens, unit price, and cost already exist on both paths | N/A |
| Cache-write frontend presentation | `TokenUsageMeterPanel` | `Reuse` | positive generic write row already displays tokens, unit price, and cost | N/A |
| Positive generic-write component proof | existing Token Meter component tests | `Extend Coverage` | current general calculation test does not explicitly assert this user-visible row | N/A |
| Codex cache-write mapping | existing Codex runtime adapter | `Preserve / No Production Change` | installed protocol and real events contain no field to map | N/A |
| Codex future field detection | generated app-server protocol plus raw event evidence | `Coverage Gate` | prevents speculative aliases while making protocol change actionable | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts` LLM catalog | model identities, schemas, price facts | `DS-001`, `DS-002`, `DS-004` | `LLMFactory` | `Extend` | all three rows remain adjacent to current OpenAI rows |
| `autobyteus-ts` metadata | model limits | `DS-001` | model construction | `Extend` | one official URL per row |
| `autobyteus-ts` provider usage adapters | raw usage normalization | `DS-003` | shared usage domain | `Extend` | generic output field reused |
| `autobyteus-server-ts` token usage | component/cost calculation | `DS-003`, `DS-004` | token-usage subsystem | `Reuse` | no production change expected |
| `autobyteus-server-ts` GraphQL/live token usage | cache-write transport and unit-price summaries | `DS-005` | token-usage subsystem | `Reuse` | no production change expected |
| `autobyteus-web` Token Meter | live/hydrated projection and user disclosure | `DS-005` | token-usage frontend owners | `Reuse` | no production change expected; preserve server authority |
| `autobyteus-server-ts` Codex runtime adapter | installed app-server usage translation and raw retention | `DS-006` | Codex runtime owner | `Reuse` | keep cache creation null until source exposes a field |
| Tests | catalog, metadata, adapter, request, pricing, visible disclosure evidence | all | all owners | `Extend` | keep tests beside existing subject coverage |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `supported-model-definitions.ts` | LLM catalog | static built-in definitions | GPT-5.6 rows, reasoning schema builder, pricing builder | these are declaration-time model facts | yes, `ParameterSchema`, `TokenPricingConfig` |
| `curated-model-metadata.ts` | LLM metadata | curated fallback | limits and source URLs | existing provider metadata map | yes, resolver lookup contract |
| `openai-compatible-token-usage-normalizer.ts` | provider adapters | OpenAI-shaped usage translator | cache-write field and cache-state mapping | external schema translation remains centralized | yes, `LlmTokenUsageObservation` |
| `TokenUsageMeterPanel.spec.ts` | frontend token usage | presentation contract | positive generic cache-write tokens/unit price/cost and zero/mixed states | focused existing component owner | yes, `TokenUsageRunSummary` fixture |
| existing Codex thread/backend tests | Codex runtime | external usage contract | explicit no-write-field/null/no-fabrication behavior and raw retention | focused existing runtime test owners | yes, canonical token event |
| existing focused test files | coverage | corresponding production owner | contract assertions | avoids new catch-all test suite | yes |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? | Overlapping Representations Removed? | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| OpenAI reasoning schema construction | local builder in `supported-model-definitions.ts` | LLM catalog | older and GPT-5.6 schemas share summary/description but differ in effort enum/default | `Yes` | `Yes` | a provider-independent schema factory |
| GPT-5.6 pricing relationships | local builder in `supported-model-definitions.ts` | LLM catalog | all three share exact read/write/long-context multipliers | `Yes` | `Yes` | a general pricing engine or hidden policy owner |
| Cache token observation shape | existing `LlmTokenUsageObservation` | token-usage domain | already shared across providers | `Yes` | `Yes` | raw provider field bag |
| Frontend token/cost summary | existing `TokenUsageRunSummary` | frontend token usage | already converges live and hydrated provider-neutral fields | `Yes` | `Yes` | provider/model-specific price DTO |
| Codex runtime usage event | existing `CodexReadyTokenUsageUpdate` + raw JSON | Codex runtime adapter | typed observed fields plus exact external evidence | `Yes` | `Yes` | speculative superset of direct API fields |

No new shared file is justified. Both builders are private declaration helpers used only by this catalog file.

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Parallel / Overlapping Representation Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `LLMModel` identity fields | `Yes` | `Yes` | `Low` | set name/value/canonical name to the same canonical slug; do not add alias row |
| `TokenPricingConfig` | `Yes` | `Yes` | `Low` | use generic write dimension and existing tiers |
| `LlmTokenUsageObservation.cache_creation_input_tokens` | `Yes` | `Yes` | `Low` | map OpenAI write count into this canonical field only |
| OpenAI family parameter schemas | `Yes` | `Yes` | `Low` | construct two explicit schema instances from one local builder |
| `TokenUsageRunSummary.cacheCreationInputTokens/unitPrices/estimatedApiCacheCreationInputCost` | `Yes` | `Yes` | `Low` | reuse unchanged; do not add `openAiCacheWrite*` duplicates |
| Codex `cache_creation_input_tokens` | `Yes` when null means not reported | `Yes` | `Low` | preserve null; do not create inferred/remainder representation |

## Final File Responsibility Mapping

| File | Owning Subsystem | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/llm/supported-model-definitions.ts` | LLM catalog | built-in definition owner | local schema/pricing builders plus three GPT-5.6 definitions | model declarations and their model-specific facts remain cohesive | yes |
| `autobyteus-ts/src/llm/metadata/curated-model-metadata.ts` | LLM metadata | curated metadata owner | three official limit rows | established lookup source | yes |
| `autobyteus-ts/src/llm/api/openai-compatible-token-usage-normalizer.ts` | provider adapters | external usage translation | nested/top-level cache-write extraction, positive state, observation mapping | one external contract translation point | yes |
| `autobyteus-ts/tests/unit/llm/supported-model-definitions.test.ts` | tests | catalog/pricing contract | exact set, schema, standard/tier/write pricing | current catalog test owner | yes |
| `autobyteus-ts/tests/unit/llm/metadata/model-metadata-resolver.test.ts` | tests | curated metadata contract | all three limits with no live fetch | current resolver test owner | yes |
| `autobyteus-ts/tests/integration/llm/llm-factory-metadata-resolution.test.ts` | tests | registry/model-info contract | discovery identity, limits, schema | current end-to-registry coverage | yes |
| `autobyteus-ts/tests/unit/llm/api/token-usage-normalizers.test.ts` | tests | usage adapter contract | Responses/Chat nested write counts, cache state, absent field | current normalizer test owner | yes |
| `autobyteus-ts/tests/unit/llm/api/provider-native-request-payloads.test.ts` | tests | Responses request contract | canonical model value and `max` reasoning nesting | current native payload test owner | yes |
| `autobyteus-web/components/workspace/usage/__tests__/TokenUsageMeterPanel.spec.ts` | tests | frontend visible contract | positive generic cache-write tokens, per-million unit price, component cost, and zero/mixed behavior | existing focused component test owner; no production UI change needed | yes |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/thread/codex-thread.test.ts` and `.../codex-agent-run-backend.test.ts` | tests | Codex runtime source contract | current protocol without write field remains null, retained raw records contain only observed fields, and no write cost is fabricated | existing focused runtime test owners | yes |
| `tickets/done/openai-new-api-models/codex-cache-write-probe.md` | evidence | solution package | installed generated protocol, active Sol session, ledger counts, conclusion | keeps runtime fact reviewable without rediscovery | N/A |

## Ownership Boundaries

- Above `LLMFactory`, callers know only model identifiers and `ModelInfo`; they must not import `supportedModelDefinitions` to special-case GPT-5.6.
- `OpenAIResponsesLLM` accepts an already-resolved `LLMModel`; it must not choose between Sol/Terra/Luna or rewrite `gpt-5.6` aliases.
- The OpenAI-compatible normalizer is the last place raw `cache_write_tokens` may appear in behavior. Downstream code consumes `cache_creation_input_tokens` only.
- `TokenCostCalculator` selects tiers and prices generic components; it must not branch on provider or model identifier.
- Server live/GraphQL projections and frontend stores carry generic component fields; they must not add OpenAI-specific aliases or derive prices from `latestModelIdentifier`.
- `TokenUsageMeterPanel` may format the server-provided token, price, and cost fields but must not look up or recalculate GPT-5.6 prices.
- The Codex adapter maps only fields supported by its installed app-server contract. It must preserve an absent write count as null and retain raw source records for future protocol detection.
- Credential entitlement stays an external execution concern and must not affect catalog initialization.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `LLMFactory` | static definitions, metadata resolution, registry maps | server catalog and agent backend factory | server imports definitions or constructs `OpenAILLM` from a raw slug | extend `LLMFactory` API, not bypass it |
| `OpenAIResponsesLLM` | OpenAI client and Responses payload mapping | `OpenAILLM`/LLM runtime | model-specific code calls OpenAI SDK directly | extend adapter request mapping |
| OpenAI-compatible usage normalizer | raw OpenAI usage field mapping | Responses/compatible adapters | server reads `raw_usage_json.cache_write_tokens` | extend normalizer |
| Token-usage pricing subsystem | component basis, price resolution, tier selection, cost | event enrichment pipeline | model catalog computes event costs or adapter embeds currency cost | extend generic pricing structures |
| Token-usage live/GraphQL summary contract | event serialization, ledger projection, unit-price aggregation | frontend token-usage store | frontend parses raw provider usage or requests model pricing metadata | extend provider-neutral summary fields only if evidence proves a missing generic dimension |
| `tokenUsageMeterStore` / `TokenUsageMeterPanel` | live/hydrated projection and presentation | workspace Token tab | browser price table, model switch, or `tokens * hardcoded price` logic | extend server contract/summary owner first; keep panel presentation-only |
| Codex usage adapter | `thread/tokenUsage/updated` mapping and raw retention | Codex backend event projection | infer cache writes from gross-minus-read or reuse direct API raw field names without protocol evidence | extend the generated-contract mapping only after supported protocol evidence |

## Dependency Rules

- `supported-model-definitions.ts` may depend on `OpenAILLM`, `LLMConfig`, `TokenPricingConfig`, and `ParameterSchema`.
- Curated metadata may depend only on provider/metadata types, not adapters or server code.
- `LLMFactory` may consume definitions and metadata; definitions must not call the factory.
- `OpenAIResponsesLLM` may call the normalizer; the normalizer may depend on shared model/usage types but not server pricing.
- Server pricing may depend on `LLMFactory.getModelPricingInfo` and normalized token fields; it must not depend on OpenAI adapter internals.
- Frontend token-usage stores may consume only the provider-neutral live/GraphQL contract; they must not import `autobyteus-ts` model definitions or pricing metadata.
- The Token Meter may format server-provided unit prices/costs and conditionally hide non-meaningful rows; it must not perform authoritative price selection or cost arithmetic.
- The Codex adapter may depend on Codex JSON helpers and shared canonical token types; it must not depend on OpenAI Responses normalizer internals or model price facts.
- Tests may inspect returned public contract shapes; avoid exporting private builders solely for tests.
- Forbidden: duplicate `gpt-5.6` alias row, dynamic model-list gating, server raw usage parsing, GPT-5.6-specific cost branch, frontend model-price table/recalculation, second OpenAI adapter, or SDK upgrade without demonstrated need.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `LLMFactory.listAvailableModels()` | registered models | expose sorted `ModelInfo` rows | none | includes all three static rows |
| `LLMFactory.listModelsByProvider(OPENAI)` | OpenAI registered models | provider-filtered catalog | explicit provider enum | no entitlement filtering |
| `LLMFactory.createLLM(modelIdentifier, config?)` | one registered model | construct exact adapter/config | canonical exact identifier | each GPT-5.6 ID resolves to `OpenAILLM` |
| `LLMFactory.getModelPricingInfo(...)` | one model price policy | return trusted price dimensions/tiers | explicit identifier/provider/value fields | no alias guessing |
| `createOpenAICompatibleTokenUsageObservation(usage, model)` | one provider usage payload | normalize provider fields | raw usage + resolved model | returns generic cache creation |
| `TokenCostCalculator.applyPolicy(payload, policy)` | one usage event | select tier and calculate costs | normalized event + resolved policy | remains provider-neutral |
| `TOKEN_USAGE_UPDATED` payload | one priced usage delta | stream server-accounted components/prices/costs | snake-case provider-neutral fields | generic cache write uses `cache_creation_input_tokens` and `cached_input_write_price_per_million` |
| Token usage GraphQL summary | one ledger-backed run/team/member aggregate | hydrate equivalent components/prices/costs | explicit run/team/member identity | generic cache write uses `cacheCreationInputTokens`, `unitPrices.cacheCreationInput`, and `estimatedApiCacheCreationInputCost` |
| `TokenUsageMeterPanel` | focused `TokenUsageRunSummary` | disclose component tokens, unit prices, and costs | selected/focused run summary | generic write row is conditional and presentation-only |
| `resolveCodexThreadTokenUsage(params, run/thread/turn/model)` | one Codex token notification | map installed app-server token fields and retain raw source | exact Codex notification identity | cache creation stays null while source field is absent |

## Interface Boundary Check

| Interface | Responsibility Is Singular? | Identity Shape Is Explicit? | Ambiguous Selector Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `listModelsByProvider` | `Yes` | `Yes` | `Low` | none |
| `createLLM` | `Yes` | `Yes` | `Low` | register only canonical suffixed IDs |
| `getModelPricingInfo` | `Yes` | `Yes` | `Low` | use exact identifier in tests/runtime |
| usage normalizer | `Yes` | `Yes` | `Low` | keep raw fields inside adapter |
| cost calculator | `Yes` | `Yes` | `Low` | no provider branch |
| live/GraphQL token summary | `Yes` | `Yes` | `Low` | reuse existing generic cache-write fields |
| Token Meter panel | `Yes` | `Yes` | `Low` | render summary; do not select price by model |
| Codex usage resolver | `Yes` | `Yes` | `Low` | map only generated/source-observed fields; preserve null for unavailable write |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Canonical model rows | `gpt-5.6-sol`, `gpt-5.6-terra`, `gpt-5.6-luna` | `Yes` | `Low` | use official lowercase slugs exactly |
| Cross-provider canonical write tokens | `cache_creation_input_tokens` | `Yes` | `Low` | translate OpenAI `cache_write_tokens` once |
| Model-specific schema | `openaiGpt56ReasoningSchema` | `Yes` | `Low` | keep family scope explicit |
| Pricing builder | `createOpenAIGpt56Pricing` | `Yes` | `Low` | keep private and declarative |
| Frontend write label | `Cache writes` backed by generic `cacheCreationInput*` fields | `Yes` | `Low` | keep provider-neutral wording and existing localization |
| Codex missing write count | canonical `cache_creation_input_tokens: null` | `Yes` | `Low` | null means not reported; never rename it to zero/uncached remainder |

## Applied Patterns (If Any)

- `Registry`: `LLMFactory` remains the authoritative lookup for model identity and construction.
- `Adapter`: `OpenAIResponsesLLM` translates provider requests/responses; the OpenAI-compatible usage normalizer translates provider usage fields.
- `Factory`: a private schema builder and GPT-5.6 pricing builder remove declaration duplication without gaining lifecycle or business authority.

## Target Subsystem / Folder / File Mapping

| Path | Kind | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/llm/supported-model-definitions.ts` | `File` | static LLM catalog | GPT-5.6 definitions, schemas, prices | existing authoritative declaration file | runtime entitlement checks or API calls |
| `autobyteus-ts/src/llm/metadata/curated-model-metadata.ts` | `File` | metadata resolver fallback | 1.05M/128K limits and source URLs | current docs-backed metadata owner | pricing or reasoning schema |
| `autobyteus-ts/src/llm/api/openai-compatible-token-usage-normalizer.ts` | `File` | provider usage adapter | cache-write extraction and canonical mapping | current OpenAI-shaped translator | cost arithmetic or ledger code |
| `autobyteus-web/components/workspace/usage/TokenUsageMeterPanel.vue` | `File` | frontend presentation | existing generic cache-write disclosure | current user-facing owner; inspect/preserve rather than modify | provider pricing metadata or cost arithmetic |
| `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread-token-usage.ts` | `File` | Codex runtime adapter | preserve installed source mapping, null cache creation, and raw evidence | existing authoritative Codex usage translator | inferred write counts or direct API parsing |
| existing test files named in final mapping | `File` | corresponding contract owner | focused durable evidence including visible generic write disclosure and Codex no-fabrication | existing suite organization | broad unrelated provider churn |
| `tickets/done/openai-new-api-models/codex-cache-write-probe.md` | `File` | solution evidence | point-in-time probe record | reviewable source limitation | secrets or conversation content |

The current compact layout is clearer than introducing a GPT-5.6 folder: the change adds model facts and one provider field, not a new subsystem or structural depth.

## Folder Boundary Check

| Path / Folder | Intended Structural Depth | Ownership Boundary Is Clear? | Mixed-Layer Or Over-Split Risk | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `src/llm` | `Main-Line Domain-Control` | `Yes` | `Low` | registry and static definitions remain together |
| `src/llm/metadata` | `Off-Spine Concern` | `Yes` | `Low` | limits are separated from definitions and transport |
| `src/llm/api` | `Persistence-Provider` | `Yes` | `Low` | provider translation remains below runtime model ownership |
| `tests/unit/llm` and `tests/integration/llm` | `Mixed Justified` | `Yes` | `Low` | mirrors production subjects and current test convention |
| `autobyteus-web/components/workspace/usage` | `Primary Presentation` | `Yes` | `Low` | existing Token Meter remains the single cache-write disclosure surface |
| `autobyteus-server-ts/src/agent-execution/backends/codex/thread` | `Persistence-Provider` | `Yes` | `Low` | installed Codex protocol translation remains separate from direct API normalization |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Model identity | one row `name=value=canonicalName='gpt-5.6-sol'` | rows for both `gpt-5.6-sol` and alias `gpt-5.6` | prevents duplicate UI choices and ambiguous saved identity |
| Family schema | older schema `none..xhigh`; GPT-5.6 schema `none..max`, default `medium` | add `max` to one global schema used by older models | keeps exposed contract evidence-backed |
| Usage boundary | raw `input_tokens_details.cache_write_tokens` -> `cache_creation_input_tokens` | cost calculator parses `raw_usage_json` | preserves provider-neutral server ownership |
| Billing decomposition | `standard = gross - read - write`; price each category once | charge all gross at standard price and add write price again | avoids undercounting and double charging |
| Long context | select tier from gross input >272K, then apply 2x input categories/1.5x output | choose output tier from output length | matches provider request-level pricing rule |
| Frontend disclosure | server summary says 1,000 generic writes at 6.25/M and cost 0.00625 -> panel formats those three values | panel sees `gpt-5.6-sol` and hardcodes `6.25` or recomputes cost | keeps server authority and live/hydrated consistency |
| Codex missing source field | input 100, cached read 60, no write field -> read 60, cache creation null, standard remainder handled by current semantics, no write row | infer write as `100 - 60 = 40` | the 40-token remainder may be ordinary uncached input, hidden writes, or both |

Example standard prices and derived write prices per 1M tokens:

| Model | Standard Input | Cache Read (`0.1x`) | Cache Write (`1.25x`) | Output |
| --- | ---: | ---: | ---: | ---: |
| Sol | 5.00 | 0.50 | 6.25 | 30.00 |
| Terra | 2.50 | 0.25 | 3.125 | 15.00 |
| Luna | 1.00 | 0.10 | 1.25 | 6.00 |

Greater-than-272K tier derivation:

`input/read/write = standard tier value * 2`; `output = standard output * 1.5`.

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Add `gpt-5.6` alias row alongside Sol | official API publishes the alias | `Rejected` | expose only canonical `gpt-5.6-sol`; callers may not depend on a duplicate row |
| Add `max` to current shared OpenAI schema | fewer declarations | `Rejected` | build a GPT-5.6-specific schema while retaining the accurate older schema |
| Gate rows using `/v1/models` | current credential lacks access | `Rejected` | static catalog remains authoritative; provider returns explicit access error at invocation |
| Fall back from GPT-5.6 to GPT-5.5 on access error | API error suggests GPT-5.5 | `Rejected` | surface the provider error; never silently change selected model |
| Create GPT-5.6-specific OpenAI adapter | new family has optional features | `Rejected` | reuse standard Responses adapter; optional features are separate requirements |
| Teach server cost code `cache_write_tokens` | quickest direct patch | `Rejected` | normalize once at provider boundary into existing generic cache-creation field |
| Infer Codex cache writes from `inputTokens - cachedInputTokens` | Codex exposes no write field | `Rejected` | keep cache creation null; the remainder is not uniquely attributable to writes |
| Parse speculative Codex names such as `cacheWriteTokens` | future-proofing | `Rejected` | re-generate the installed protocol in API/E2E and add mapping only after an official/current field is observed |

## Derived Layering (If Useful)

`Server catalog/run callers -> LLMFactory authoritative registry -> model/metadata declarations + OpenAI adapter -> OpenAI provider`

`OpenAI raw usage -> provider adapter -> shared usage observation -> server component/pricing domain -> persistence/projection`

`server priced event/ledger projection -> live/GraphQL provider-neutral summary -> frontend token-usage store -> Token Meter presentation`

`Codex thread/tokenUsage/updated -> Codex runtime adapter -> provider-neutral event + retained raw evidence -> generic server accounting`

Both return chains are intentionally one-way; higher server layers never reach back into raw provider payload structure, and the frontend never reaches back into provider model pricing facts.

## Change / Refactor Sequence

1. In `supported-model-definitions.ts`, replace direct duplicated OpenAI schema construction with a private local builder that reproduces the current older schema unchanged.
2. Construct `openaiGpt56ReasoningSchema` from that builder with the six official efforts and default `medium`.
3. Add private `createOpenAIGpt56Pricing(input, output)` using official GPT-5.6 read/write/long-context relationships and pricing effective date 2026-06-26.
4. Add Sol, Terra, and Luna definitions with exact canonical IDs, `OpenAILLM`, the GPT-5.6 schema, and their generated pricing configs.
5. Add three curated metadata rows with official individual model URLs and verification date 2026-07-10.
6. Extend the OpenAI-compatible usage normalizer to extract nested `cache_write_tokens`, optionally fall back to a top-level field, set positive cache state on reads or writes, and populate `cacheCreationInputTokens`.
7. Preserve the existing server live/ledger/GraphQL and frontend summary fields unchanged; correct OpenAI normalization and pricing should populate them automatically.
8. Preserve Codex runtime production mapping: cached input remains cache read, cache creation remains null when absent, and raw usage/event records remain intact. Do not add speculative field aliases or remainder inference.
9. Extend focused tests in the final file mapping. Do not export private builders solely for testing; assert public definition/model/pricing/observation results. Add or confirm a Token Meter component scenario whose server-backed summary has positive generic cache-write tokens, unit price, and cost, plus zero/mixed assertions as needed. Make the Codex no-write-field/null/no-fabrication contract explicit in existing runtime coverage if current assertions are insufficient.
10. Run focused tests, the `autobyteus-ts` TypeScript build, and applicable server/frontend component checks available in the implementation environment.
11. API/E2E recheck official model pages, run existing OpenAI execution coverage, validate live and GraphQL cache-write field convergence, re-generate the supported Codex app-server protocol, and attempt minimal live direct API requests for all three. Preserve explicit entitlement errors if access remains unavailable. If Codex now exposes a write field, return a design-impact report with the exact generated field and cumulative/last semantics.
12. Confirm the diff contains no unnecessary server/frontend production change, alias row, fallback, browser price table/recalculation, speculative Codex field, inferred write count, SDK upgrade, or unrelated model mutation. If any existing generic production invariant proves insufficient, return it as design impact rather than patching around the boundary.

No temporary compatibility seam or removal step is required.

## Key Tradeoffs

- **Static rows despite current access failure:** enables entitled organizations and matches existing catalog policy; the tradeoff is that unentitled users can select a model and receive an explicit provider error.
- **Family-specific schema:** a few extra declarations preserve contract accuracy; a single widened schema would be shorter but incorrect for older models.
- **Private pricing builder:** derives repeated official relationships consistently; keeping it local avoids turning three model facts into a generic policy subsystem.
- **Map cache writes now:** slightly expands the model-addition scope but prevents known token-cost underestimation caused by GPT-5.6's new billing category.
- **Reuse the existing frontend path:** avoids needless production churn and keeps one authoritative server calculation. The tradeoff is that explicit user-visible confidence comes from strengthening focused component coverage rather than adding new UI code.
- **Do not fabricate Codex writes:** leaves a potentially real internal component unpriced/unshown, but this is more accurate than assigning the entire uncached remainder to the 1.25x category. The retained raw payload and protocol gate provide a clean future extension point.
- **No optional GPT-5.6 features:** standard invocation remains complete and coherent; pro/persisted reasoning/explicit cache controls require separate product decisions and tests.

## Risks

- **Entitlement risk:** current credentials cannot prove successful live invocation. Mitigation: official public contract, deterministic request tests, explicit live evidence, and later entitled smoke.
- **Fresh-contract risk:** docs changed during rollout. Mitigation: API/E2E and delivery recheck direct URLs and record date.
- **Usage-shape risk:** entitled raw Responses usage remains unobserved locally. Mitigation: support both officially documented nested detail object names, retain raw JSON, and avoid fabricated counts.
- **Derived long-context cache rates:** official rules state 2x input above 272K, 90% read discount, and 1.25x write rate. The design composes these rules, so read/write tier values double with uncached input. Architecture/API review must reverify this composition against current pricing docs.
- **Floating price precision:** Terra write price is `3.125`; current number-based price model supports it. Tests must assert exact catalog values and cost calculations with appropriate numeric tolerance downstream.
- **Frontend evidence risk:** generic write transport/store behavior is covered, but current Token Meter component tests do not explicitly assert a positive generic write price row. Mitigation: add/confirm a focused server-backed component scenario and keep browser validation proportional.
- **Aggregate/subtype display constraint:** the panel's generic write row is used only when 5m/1h subtype counts are both zero. That matches GPT-5.6's documented generic category. Simultaneous generic and subtype write products are outside this task and must not be preemptively redesigned here.
- **Codex observability risk:** Codex may internally create prompt-cache entries but current `thread/tokenUsage/updated` exposes only cached reads, not writes. Mitigation: null/no-inference semantics, retained raw payloads, durable probe evidence, and generated-protocol recheck. Residual risk: Codex API-equivalent estimates cannot separately include an unreported write component.
- **Protocol drift risk:** current installed versions agree that no write field exists, but Codex app-server evolves. Mitigation: generate current bindings during API/E2E and route any newly exposed field back as design impact before mapping.

## Guidance For Implementation

- Preserve the existing older OpenAI schema's observable enum/default exactly while introducing the builder.
- Use exact official slugs in all identity fields; do not add alias translation.
- Keep top-level standard prices and both input tiers in each GPT-5.6 `TokenPricingConfig` so current pricing lookup remains useful before event tier selection.
- Tier order must be bounded `<=272000` first and unbounded `>272000` second because `TokenCostCalculator` selects the first matching tier.
- Read cache writes from `prompt_tokens_details` or `input_tokens_details` after the existing normalization chooses the available details object. Prefer nested official fields; a top-level fallback must not override a nested zero.
- Cache state should be `positive` when either read or write count is positive; it should be `zero_reported` when relevant fields are present and all are zero.
- Pass cache writes through `cacheCreationInputTokens`; do not add a second OpenAI-specific field to the shared observation.
- Preserve existing server outputs `cache_creation_input_tokens`, `cached_input_write_price_per_million`, and `estimated_api_cache_creation_input_cost`, plus their GraphQL camel-case counterparts; do not add a GPT-5.6-only transport field.
- Preserve existing frontend `TokenUsageRunSummary`, store aggregation, query selection, localizations, and `TokenUsageMeterPanel` production logic. Positive GPT-5.6 generic writes should flow into the current row automatically once upstream data is correct.
- In the focused frontend scenario, assert Input breakdown contains `Cache writes`; expand the existing button with `aria-expanded`/`aria-controls`; then assert generic write tokens, server-provided per-million price, and server-provided cost. Also prove zero/absent writes remain hidden and mixed/missing price does not become a fake number, reusing existing assertions where they already provide durable evidence.
- Do not compute `tokens / 1_000_000 * price` in frontend production or tests as a substitute for asserting `estimatedApiCacheCreationInputCost`; the displayed formula explains the server calculation but the browser is not the accounting owner.
- Keep direct OpenAI API and Codex runtime normalization separate. `cache_write_tokens` belongs to the OpenAI-compatible API normalizer; do not search for it inside Codex raw JSON unless the generated Codex protocol actually adds such a field.
- For current Codex events, preserve `cache_creation_input_tokens = null`, not zero. Map only `cachedInputTokens`/`cached_input_tokens` to cache read and retain raw source records.
- Never derive Codex writes from gross input minus cached read. That difference is not an identifiable write bucket.
- The presence of a GPT-5.6 write price in `TokenPricingConfig` does not authorize a write cost. Cost/display requires a positive canonical write token count.
- Do not change server or frontend production code unless implementation proves an existing generic invariant is broken; any such finding is a design impact and must return upstream.
- Do not add a hard-failing live test that assumes account entitlement. The API/E2E engineer should use existing access-error classification or an explicit environment gate and report live success truthfully.
- Verify the final public results, not private helper implementation details:
  - three exact model rows and no alias row;
  - 1.05M/128K limits;
  - six efforts/default medium only for GPT-5.6;
  - correct standard/write/read/tier prices;
  - factory resolution to `OpenAILLM`;
  - request payload `reasoning.effort='max'`;
  - nested cache-write normalization and correct cache state;
  - provider-neutral write token/price/cost propagation to live and hydrated frontend summaries;
  - visible generic `Cache writes` tokens, unit price, and cost in the focused Token Meter with no browser-derived price;
  - installed Codex protocol still lacks a write field, or exact design-impact evidence if that changed;
  - current Codex no-write-field events retain null cache creation and produce no fabricated write cost/row.
