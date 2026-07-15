# Design Spec

## Current-State Read

AutoByteus exposes built-in Anthropic API models through a static LLM catalog. The frontend API Key Management model browser queries server-side provider/model GraphQL, the server delegates to `AutobyteusModelCatalog`, and the model catalog ultimately reads `LLMFactory.listAvailableModels()`. `LLMFactory.initializeRegistry()` constructs built-in models from `autobyteus-ts/src/llm/supported-model-definitions.ts` and merges limit metadata from `autobyteus-ts/src/llm/metadata/curated-model-metadata.ts` plus optional provider metadata for already-registered model definitions.

The current built-in Anthropic rows are:

- `claude-opus-4.8` -> provider value `claude-opus-4-8`.
- `claude-opus-4.7` -> provider value `claude-opus-4-7`.
- `claude-sonnet-4.6` -> provider value `claude-sonnet-4-6`.

The user's screenshot exactly matches these three current catalog rows. `claude-sonnet-5` and `claude-fable-5` are missing. `claude-sonnet-4.8` must not be added because official Anthropic documentation identifies the current Sonnet successor as `claude-sonnet-5`.

There is a provider adapter defect that must be fixed with the catalog addition: `autobyteus-ts/src/llm/api/anthropic-llm.ts` only treats `claude-opus-4-7` as an adaptive-thinking / no-default-temperature model. Anthropic's current docs require equivalent request-shape handling for `claude-opus-4-8`, `claude-sonnet-5`, and `claude-fable-5`. If the new rows are added without this fix, AutoByteus can send invalid manual thinking payloads or injected `temperature: 0` to current Anthropic models.

The follow-up live failure exposes a second provider adapter defect on the same invocation spine. `autobyteus-ts/src/agent/loop/llm-phase.ts` intentionally attaches `logicalConversationId` to LLM invocation kwargs for hosted AutoByteus conversations, but `AnthropicLLM.applyAnthropicRequestParams()` forwards raw kwargs into Anthropic's Messages API request after deleting only `stream`. Anthropic rejects unknown request fields and the user's screenshot shows exactly that: `logicalConversationId: Extra inputs are not permitted`. `OpenAICompatibleRequestBuilder` already filters the same internal kwargs, so the design should extract/reuse that boundary policy instead of adding another private deny-list only in Anthropic.

Pricing support already has the right data structure. `TokenPricingConfig` and `LLMFactory.getModelPricingInfo()` support input, output, cache read, generic cache write, 5-minute cache write, 1-hour cache write, currency, source, effective date, and tier rows. Anthropic model rows already use the cache-specific 5m/1h fields. The implementation should populate these fields for Sonnet 5 and Fable 5 and preserve/update them for Opus 4.8. Batch API, Fast Mode, and US-only data residency are real pricing variants but are not represented as default model pricing in the current catalog and are outside this narrow implementation unless already supported elsewhere.

## Intended Change

Implement support for the three target Anthropic models the user approved:

1. Keep and fix `claude-opus-4.8` support.
2. Add `claude-sonnet-5` support.
3. Add `claude-fable-5` support.
4. Fix Anthropic runtime invocation by filtering AutoByteus internal kwargs before SDK request construction.

Do not add `claude-sonnet-4.8`. Do not run Fable or model-matrix paid live tests. Use deterministic mocked tests for model support, plus one minimal user-approved non-Fable Anthropic live validation for the reproduced `logicalConversationId` bug.

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Feature + bug fix.
- Current design issue found (`Yes`/`No`/`Unclear`): Yes.
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Missing provider-boundary invariant plus duplicated provider-kwarg filtering policy.
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): Yes, small targeted refactor inside the LLM provider adapter/request-building boundary.
- Evidence:
  - `supported-model-definitions.ts` lacks `claude-sonnet-5` and `claude-fable-5` but already has the pricing-config shape needed for Anthropic cache dimensions.
  - `anthropic-llm.ts` uses `isClaudeOpus47()` as the only model-family special case, so Opus 4.8 and new current models would receive stale request shaping.
  - `anthropic-llm.ts` forwards arbitrary invocation kwargs to Anthropic, so `logicalConversationId` from `LlmPhase` reaches the provider request and triggers a live 400.
  - `openai-compatible-request-builder.ts` already filters internal kwargs, proving the rule exists but is fragmented rather than owned once.
  - Official Anthropic docs distinguish adaptive/default thinking, sampling restrictions, cache read, 5m cache write, and 1h cache write for the target models.
- Design response:
  - Add explicit current-model rows to the static Anthropic catalog.
  - Replace the single Opus 4.7 predicate with a small provider-owned Anthropic model capability policy inside `anthropic-llm.ts`.
  - Extract or reuse a shared provider-request kwarg sanitizer for external provider adapters; use it in Anthropic and de-duplicate the OpenAI-compatible internal kwarg list.
  - Update curated model metadata and model-catalog docs.
  - Add deterministic tests for catalog membership, pricing dimensions, metadata, request payload shape, and internal-kwarg filtering; add minimal live Anthropic validation for the reproduced runtime path.
- Refactor rationale:
  - Adding only static rows would produce broken runtime calls for current Anthropic models. The adapter owner must encode provider-specific request-shape invariants once instead of scattering one-off checks per model.
  - Filtering internal invocation kwargs is a cross-provider request-boundary invariant; leaving it copied in one builder and absent in Anthropic caused the live bug.
- Intentional deferrals and residual risk, if any:
  - No dynamic Anthropic model discovery; built-in Anthropic models remain static.
  - No Batch API pricing mode, Fast Mode pricing mode, or US-only data-residency multiplier support in the default catalog. Document that default pricing is standard Claude API pricing.
  - No Fable/model-matrix live Anthropic integration tests per cost instruction; provider contract is primarily covered by deterministic request-payload tests, with one minimal non-Fable live validation for the user-reported runtime bug.
  - No Fable refusal/fallback UX beyond making the model available; a later task can improve response classification if needed.
  - Broader audit/fix of all external provider adapters can be deferred if it exceeds the small sanitizer extraction. `MistralLLM` has a similar raw-kwargs spread and should use the shared helper if the implementation can do so without broad test/environment cost.

## Terminology

- `Subsystem` / `capability area`: a larger functional area that owns a broader category of work and may contain multiple files plus optional module groupings.
- `Module`: an optional intermediate grouping inside a subsystem when the codebase benefits from it. Do not use `module` as a synonym for one file or as the default ownership term.
- `Folder` / `directory`: a physical grouping used to organize files and any optional module groupings.
- `File`: one concrete source file and the primary unit where one concrete concern should land.

## Design Reading Order

Read this design from:

1. model-list data-flow spine;
2. Anthropic request-shape data-flow spine;
3. provider-invocation kwarg boundary;
4. pricing/metadata ownership;
5. concrete file changes and tests.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: no compatibility alias from `claude-sonnet-4.8` to `claude-sonnet-5`; do not add fuzzy aliases for unverified model names.
- Treat removal as first-class design work: no stale `isClaudeOpus47` predicate should remain as the governing rule once a current Anthropic capability helper replaces it.
- Decision rule: the design does not depend on compatibility wrappers, dual-path behavior, or retained legacy flow for replaced behavior.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | Static supported model definition | API Key Management model list / runtime model selection | `LLMFactory` built-in catalog | Ensures the three target models become selectable without adding unsupported aliases. |
| DS-002 | Primary End-to-End | Agent/runtime Anthropic model invocation | Anthropic Messages API request payload | `AnthropicLLM` | Ensures selected models produce provider-valid requests. |
| DS-003 | Return-Event | Provider usage payload | Token usage cost estimation | `TokenPricingConfig` / `LLMFactory` pricing lookup | Ensures costs include Anthropic cache read/write dimensions, not only input/output. |
| DS-004 | Bounded Local / Boundary | LLM invocation kwargs | Provider SDK request kwargs | Provider request builder/sanitizer | Ensures AutoByteus runtime coordination fields do not cross into external provider APIs. |

## Primary Execution Spine(s)

- DS-001: `supportedModelDefinitions -> ModelMetadataResolver -> LLMFactory registry -> Server model catalog GraphQL -> Frontend ProviderModelBrowser`
- DS-002: `Runtime selected model -> LLMFactory.createLLM -> LlmPhase streamKwargs -> AnthropicLLM -> Anthropic request policy + safe provider kwargs -> Anthropic Messages API params`
- DS-003: `Anthropic usage observation -> normalized token components -> LLMFactory pricing policy -> token usage cost summary`
- DS-004: `Internal invocation kwargs -> shared provider-request kwarg sanitizer -> provider-specific controlled fields -> SDK request payload`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | Static catalog rows define the three target user-facing IDs and provider values. Metadata resolution adds context/output limits before the registry exposes model info to GraphQL and the frontend model browser. | Supported definitions, metadata resolver, LLM registry, server catalog, frontend browser | `LLMFactory` | Curated metadata and docs-backed verification dates. |
| DS-002 | When a user selects an Anthropic model, `LlmPhase` supplies runtime kwargs and `AnthropicLLM` builds the Messages API request. Provider-specific policy decides adaptive thinking/sampling behavior and the shared sanitizer removes internal kwargs before the SDK call. | Runtime selected model, runtime kwargs, LLM instance, request policy, Anthropic params | `AnthropicLLM` with shared provider-request sanitizer | Prompt renderer, tool conversion, token usage normalizer. |
| DS-003 | Anthropic usage fields are normalized into standard input, cache creation/read, and output components. Pricing lookup uses catalog pricing dimensions to estimate costs. | Usage observation, pricing config, token cost estimation | `TokenPricingConfig` / token usage pricing subsystem | Batch/Fast/US-only modifiers are documented as out of current default scope. |
| DS-004 | Internal kwargs such as `logicalConversationId` are useful above the provider boundary but invalid below it. External provider request builders must filter them while preserving provider-valid tool/thinking kwargs. | Invocation kwargs, safe kwarg helper, controlled provider fields, SDK payload | LLM provider request boundary | Autobyteus hosted LLM remains the only provider that consumes `logicalConversationId`. |

## Spine Actors / Main-Line Nodes

- `supportedModelDefinitions`: authoritative static built-in model rows and pricing defaults.
- `ModelMetadataResolver`: model limit metadata merge boundary.
- `LLMFactory`: model registry and pricing lookup owner.
- `ProviderModelBrowser`: displays model identifiers from server data.
- `LlmPhase`: attaches internal invocation kwargs such as `logicalConversationId`.
- Provider request kwarg sanitizer: reusable boundary helper for stripping internal runtime kwargs before external SDK requests.
- `AnthropicLLM`: provider request-shape owner.
- `TokenPricingConfig`: pricing dimension representation.

## Ownership Map

- `supportedModelDefinitions` owns user-facing built-in model ID, provider API value, default config schema, and standard pricing config.
- `curated-model-metadata.ts` owns docs-backed context/output limits and verification evidence for catalog rows.
- `LLMFactory` owns registry construction and pricing lookup; it does not own Anthropic request-shape decisions.
- `LlmPhase` owns runtime coordination kwargs; it does not own external provider SDK payload shape.
- The provider request sanitizer owns cross-provider filtering of AutoByteus-internal invocation kwargs for external providers.
- `AnthropicLLM` owns Anthropic Messages API request parameters and model-family capability interpretation.
- Server GraphQL and frontend model browser are thin display/read surfaces; they must not synthesize model names or pricing.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| GraphQL `availableLlmProvidersWithModels` | `LLMFactory` via server catalog service | Exposes model registry to UI | Static model identity, Anthropic pricing, request-shape logic |
| `ProviderModelBrowser` | Server model catalog data | Displays provider/model lists | Model aliasing or provider discovery |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| `isClaudeOpus47` as the governing Anthropic capability predicate | Too narrow; current models share adaptive/sampling invariants beyond Opus 4.7 | New provider-owned Anthropic model capability helper/predicate in `anthropic-llm.ts` | In This Change | May be renamed/replaced, not kept as primary policy. |
| Anthropic raw `kwargs` spread into SDK params | Leaks internal runtime fields such as `logicalConversationId` into external provider API requests | Shared safe provider-request kwarg helper used by `AnthropicLLM` | In This Change | Do not remove `logicalConversationId` upstream; filter at provider boundary. |
| Private OpenAI-compatible-only internal kwarg deny-list as sole owner | Same filtering policy is needed by Anthropic and possibly other external providers | Shared helper imported by `OpenAICompatibleRequestBuilder` and `AnthropicLLM` | In This Change | De-duplicate if feasible; otherwise Anthropic must still filter using equivalent list. |
| Any candidate `claude-sonnet-4.8` alias | Unsupported/unverified official model ID | Exact `claude-sonnet-5` catalog row | In This Change | Do not add the alias. |

## Return Or Event Spine(s) (If Applicable)

DS-003 covers usage/cost return flow. No new event spine is required.

## Bounded Local / Internal Spines (If Applicable)

Inside `AnthropicLLM` request building:

`Model value -> Resolve Anthropic model policy -> Filter internal UI params -> Apply safe provider kwargs -> Apply controlled tool fields -> Sanitize/build thinking param if allowed -> Apply sampling defaults if allowed -> SDK request`

This bounded local spine matters because the same selected model must consistently govern thinking and sampling behavior.

Inside the shared provider kwarg sanitizer:

`Invocation kwargs -> Drop null/undefined -> Drop AutoByteus-internal keys -> Drop caller-controlled fields owned by provider adapter -> Return/apply provider-safe kwargs`

This local boundary matters because `logicalConversationId` is valid inside AutoByteus but invalid for external provider SDK requests.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Curated metadata | DS-001 | `LLMFactory` | Context/input/output limits and verification dates | Keeps metadata separate from model identity/pricing | Catalog rows become overloaded and stale. |
| Prompt rendering | DS-002 | `AnthropicLLM` | Convert internal messages/history to Anthropic message payloads | Existing provider-specific rendering concern | Request-shape policy gets mixed with history rendering. |
| Safe provider kwargs | DS-002/DS-004 | External provider request builders | Remove AutoByteus-internal runtime kwargs and leave provider-valid kwargs to the adapter | Prevents runtime coordination fields from crossing external SDK boundary | Each provider duplicates or omits the deny-list, causing live 400s. |
| Usage normalizer | DS-003 | Token usage pricing | Convert Anthropic usage fields into normalized components | Keeps provider usage semantics separate from model catalog | Pricing code would need provider-specific raw usage parsing. |
| Docs | DS-001/DS-002/DS-003 | Catalog maintainers | Durable model/pricing/request-shape maintenance notes | Prevents future stale catalog updates | Future updates repeat this bug. |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Built-in Anthropic model rows | `supported-model-definitions.ts` | Extend | Existing source of truth | N/A |
| Anthropic cache-aware pricing | `TokenPricingConfig` | Reuse | Already has cache read, generic cache write, 5m write, 1h write | N/A |
| Context/output metadata | `curated-model-metadata.ts` | Extend | Existing docs-backed metadata owner | N/A |
| Request-shape policy | `anthropic-llm.ts` | Refactor locally | Provider adapter already owns request payload semantics | N/A |
| Internal runtime kwarg filtering | Existing OpenAI-compatible filtering list | Extract/Reuse | Same boundary rule applies to Anthropic; one helper prevents drift | N/A |
| Live/integration validation | Credential-gated integration tests | Use narrowly | User approved Claude LLM integration investigation for the reported failure; avoid Fable/model matrix | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts` LLM catalog | Model rows, pricing defaults, config schema | DS-001/DS-003 | `LLMFactory` | Extend | Add Sonnet 5/Fable 5 and pricing cache dimensions. |
| `autobyteus-ts` provider request utilities | Safe external-provider kwargs | DS-002/DS-004 | Provider request builders/adapters | Create/Extract | Own the internal runtime kwarg deny-list once. |
| `autobyteus-ts` Anthropic API adapter | Request-shape policy and Anthropic-specific controlled fields | DS-002/DS-004 | `AnthropicLLM` | Refactor locally | Replace Opus 4.7-only predicate and stop forwarding raw kwargs. |
| `autobyteus-ts` metadata | Model limits | DS-001 | `ModelMetadataResolver` | Extend | Add curated metadata for new rows. |
| Tests/docs | Regression evidence and maintenance docs | All | Maintainers | Extend | Mock model support; minimal non-Fable live Anthropic validation for kwarg bug. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/llm/supported-model-definitions.ts` | LLM catalog | Static built-in catalog | Add `claude-sonnet-5`, `claude-fable-5`; ensure Opus 4.8 pricing/schema remains correct | Existing catalog source | `TokenPricingConfig`, `ParameterSchema` |
| `autobyteus-ts/src/llm/metadata/curated-model-metadata.ts` | Metadata | Curated metadata lookup | Add context/output limits for Sonnet 5/Fable 5 | Existing metadata owner | Metadata lookup shape |
| `autobyteus-ts/src/llm/api/provider-request-kwargs.ts` (or equivalent under `src/llm/api`) | Provider request utilities | External-provider request boundary | Define internal invocation kwarg set and safe apply/clone helper | Shared boundary rule already duplicated in OpenAI-compatible builder | None |
| `autobyteus-ts/src/llm/api/openai-compatible-request-builder.ts` | OpenAI-compatible request builder | Request payload construction | Import shared safe-kwarg helper instead of owning private deny-list | De-duplicates boundary policy | Shared helper |
| `autobyteus-ts/src/llm/api/anthropic-llm.ts` | Anthropic adapter | Request-shape policy | Add model capability helper; use safe kwargs for invocation params; preserve controlled tools/thinking behavior | Existing provider adapter owner | Shared kwarg helper |
| `autobyteus-ts/src/llm/api/mistral-llm.ts` (optional if implementation remains small) | Mistral adapter | Request payload construction | Replace raw kwarg spread with safe helper to avoid same latent leak | Same runtime kwarg source affects all providers | Shared kwarg helper |
| `autobyteus-ts/tests/unit/llm/api/anthropic-llm.test.ts` | Tests | Provider request tests | Add non-paid payload tests for Opus 4.8/Sonnet 5/Fable 5 | Existing mocked Anthropic SDK tests | Existing helpers |
| `autobyteus-ts/tests/unit/llm/api/openai-compatible-request-builder.test.ts` | Tests | Shared filter regression through OpenAI builder | Preserve existing internal-kwarg filtering behavior after extraction | Existing deterministic test | Shared helper |
| `autobyteus-ts/tests/unit/llm/supported-model-definitions.test.ts` | Tests | Catalog/pricing tests | Assert model rows and cache pricing dimensions | Existing catalog tests | Existing pricing lookup |
| `autobyteus-ts/tests/integration/llm/llm-factory-metadata-resolution.test.ts` | Tests | Metadata/registry tests with mocked fetch | Add metadata expectations without paid API calls | Existing deterministic registry test | Existing fetch mock |
| `autobyteus-ts/tests/integration/llm/api/anthropic-llm.test.ts` | Tests | Credential-gated live Anthropic smoke | Add minimal non-Fable `logicalConversationId` regression validation | Existing provider-access skip helper | Real key only when available |
| `autobyteus-ts/docs/provider_model_catalogs.md` | Docs | Provider catalog docs | Update latest Anthropic rows, pricing notes, and request-shape notes | Existing durable docs | N/A |
| `autobyteus-ts/docs/llm_module_design_nodejs.md` | Docs | Module design docs | Update latest model summary/request-shape note if stale | Existing module docs | N/A |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Anthropic model capability classification | Keep local in `anthropic-llm.ts` initially | Anthropic adapter | Only used by request-shape owner for this task | Yes | Yes | Cross-provider generic helper or UI-owned policy |
| Internal invocation kwarg filtering | `autobyteus-ts/src/llm/api/provider-request-kwargs.ts` | LLM provider request utilities | Needed by external provider builders; already duplicated/missing across providers | Yes | Yes | Generic dumping ground for provider-specific request semantics |
| Anthropic pricing row helper | Existing `pricing()` helper in `supported-model-definitions.ts` | LLM catalog | Already normalizes source/currency/effective date | Yes | Yes | Separate duplicate pricing structure |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `TokenPricingConfig` cache fields | Yes | Yes | Low | Use `cachedInputReadTokenPricing`, `cachedInputWrite5mTokenPricing`, and `cachedInputWrite1hTokenPricing` exactly; do not flatten cache writes into base input. |
| Anthropic config schema | Mostly | Yes | Medium | Use adaptive-thinking schema for current adaptive models; avoid exposing fixed budget fields where provider rejects them. |
| Provider-safe kwargs helper | Yes | Yes | Low | Keep fields as a simple internal-key deny-list plus caller-owned controlled fields; do not encode provider-specific model policy in the shared helper. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/llm/supported-model-definitions.ts` | LLM catalog | Static built-in catalog | Add target Anthropic rows/pricing/schema; no unsupported Sonnet 4.8 | Existing owner | Yes |
| `autobyteus-ts/src/llm/metadata/curated-model-metadata.ts` | Metadata | Curated metadata lookup | Add target model metadata | Existing owner | Yes |
| `autobyteus-ts/src/llm/api/provider-request-kwargs.ts` | LLM provider request utilities | External-provider kwarg boundary | Own internal invocation kwarg set and safe apply/clone helper | New shared owner for repeated filtering policy | N/A |
| `autobyteus-ts/src/llm/api/openai-compatible-request-builder.ts` | OpenAI-compatible adapter | Request payload construction | Use shared safe-kwarg helper; retain tool controlled fields | Existing owner | Yes |
| `autobyteus-ts/src/llm/api/anthropic-llm.ts` | Anthropic adapter | Request-shape policy | Replace Opus 4.7-only predicate with model capability policy; filter internal kwargs before SDK request | Existing owner | Shared kwarg helper |
| `autobyteus-ts/tests/unit/llm/api/anthropic-llm.test.ts` | Tests | Mocked request payload tests | Validate current model payloads without paid calls | Existing owner | Existing test helpers |
| `autobyteus-ts/tests/unit/llm/api/openai-compatible-request-builder.test.ts` | Tests | Request builder regression | Confirm shared helper preserves existing filtering behavior | Existing owner | Shared helper |
| `autobyteus-ts/tests/unit/llm/supported-model-definitions.test.ts` | Tests | Catalog/pricing tests | Validate rows and cache pricing | Existing owner | Existing lookup |
| `autobyteus-ts/tests/integration/llm/llm-factory-metadata-resolution.test.ts` | Tests | Mocked metadata resolution | Validate registry metadata | Existing owner | Existing fetch mock |
| `autobyteus-ts/tests/integration/llm/api/anthropic-llm.test.ts` | Tests | Live provider validation | Minimal `logicalConversationId` runtime-path validation with provider-access skip | Existing owner | Existing skip helper |
| `autobyteus-ts/docs/provider_model_catalogs.md` | Docs | Catalog maintenance docs | Update model/pricing/request-shape notes | Existing owner | N/A |
| `autobyteus-ts/docs/llm_module_design_nodejs.md` | Docs | LLM module overview | Update stale Anthropic support summary if necessary | Existing owner | N/A |

## Ownership Boundaries

- Catalog ownership stays in `supported-model-definitions.ts`; no UI or server surface should invent `claude-sonnet-5` or Fable rows.
- Runtime invocation kwargs stay owned by `LlmPhase`/provider callers; external adapters decide what is safe for their SDK payloads.
- Internal kwarg filtering should be centralized in a provider-request utility. Provider-specific adapters still own controlled fields such as `tools`, `stream`, `tool_choice`, and `thinking`.
- Request-shape ownership stays in `AnthropicLLM`; model config schemas may expose controls, but the adapter must enforce provider-valid payloads.
- Pricing representation stays in `TokenPricingConfig`; usage-cost computation should consume cache dimensions already present rather than deriving Anthropic-specific multipliers ad hoc.
- Frontend/API Key Management remains a display surface.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `LLMFactory` model registry | Static model rows, metadata merge, dynamic local provider discovery | Server model catalog, frontend via GraphQL | UI hardcodes Anthropic model IDs | Add catalog rows in `supported-model-definitions.ts`. |
| `AnthropicLLM` | Prompt rendering, request-shape policy, SDK params | Runtime LLM callers | Callers pass provider-specific workarounds for current model thinking/sampling or internal kwarg removal | Strengthen adapter policy and safe kwarg filtering. |
| Provider request kwarg sanitizer | Internal kwarg deny-list and safe apply/clone behavior | External provider request builders | Each provider redefines or forgets `logicalConversationId` filtering | Extract/import shared helper. |
| `TokenPricingConfig` / pricing lookup | Trusted pricing dimensions | Token usage cost estimation | Cost calculator hardcodes Anthropic cache multipliers per model | Populate catalog pricing fields. |

## Dependency Rules

Allowed:

- `supported-model-definitions.ts` may import provider adapters, config schemas, and pricing config types.
- External provider adapters/request builders may import the shared provider-request kwarg helper.
- `AnthropicLLM` may inspect its own `model.value` to build provider-valid request params.
- Tests may mock Anthropic SDK and fetch. A credential-gated live Anthropic test may run only for the minimal non-Fable `logicalConversationId` validation.

Forbidden:

- No `claude-sonnet-4.8` alias or fallback.
- No live Fable integration test calls or model-matrix Anthropic integration tests.
- No removal of `logicalConversationId` from `LlmPhase`; external providers must filter it instead.
- No raw `Object.assign`/spread of unfiltered invocation kwargs into Anthropic SDK params.
- No frontend hardcoded model additions.
- No cost-estimation path that treats cache write/read as free or folds it into normal input pricing.
- No default selection of Fable 5 or Opus Fast Mode.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `supportedModelDefinitions` row | Built-in model | User-facing ID, provider value, pricing, config schema | Exact model IDs and provider values | Add `claude-sonnet-5`, `claude-fable-5`; keep `claude-opus-4.8`. |
| `AnthropicLLM` constructor/request methods | Anthropic model invocation | Build provider request payload | `LLMModel.value` | Internal helper decides policy by exact value/prefix. |
| `applySafeProviderRequestKwargs` / equivalent | External provider request kwargs | Filter internal invocation kwargs and skip provider-controlled fields | `Record<string, unknown>` kwargs + controlled key set | Must be provider-agnostic; no model policy. |
| `LLMFactory.getModelPricingInfo` | Pricing policy lookup | Return trusted pricing dimensions | model identifier/value/canonical/provider | Existing API should work once catalog rows are added. |
| GraphQL `availableLlmProvidersWithModels` | Provider model display | Return model info | runtime kind | No schema/API change required. |

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| Built-in catalog rows | Yes | Yes | Low | Use exact official provider values. |
| Anthropic request policy helper | Yes | Yes | Medium | Match exact model values/prefixes; do not infer from display labels alone. |
| Provider-safe kwargs helper | Yes | Yes | Low | Accepts explicit controlled-key set so adapters retain ownership of tools/thinking/stream semantics. |
| Pricing lookup | Yes | Yes | Low | Continue accepting model identifier/value/canonical/provider. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Anthropic current-model request policy | e.g. `getAnthropicModelRequestPolicy` or `resolveAnthropicModelRequestPolicy` | Yes | Low | Prefer policy/capability language over Opus-47-specific naming. |
| Provider request kwarg sanitizer | e.g. `applySafeProviderRequestKwargs`, `cloneSafeProviderRequestKwargs` | Yes | Low | Name should emphasize provider boundary and safe filtering, not Anthropic-specific behavior. |
| Adaptive-thinking schema | `claudeAdaptiveThinkingSchema` | Mostly | Medium | Ensure description covers current models, not only Opus 4.7. |

## Applied Patterns (If Any)

- Strategy/policy-lite inside `AnthropicLLM`: small model capability resolver governs request parameter decisions for Anthropic model variants.
- Boundary sanitizer utility: shared helper enforces the external-provider request boundary for internal invocation kwargs.
- Registry pattern remains in `LLMFactory`: static model definitions feed registry exposure.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/llm/supported-model-definitions.ts` | File | Built-in model catalog | Target Anthropic rows, pricing, config schema | Existing model catalog source | Provider SDK request logic |
| `autobyteus-ts/src/llm/metadata/curated-model-metadata.ts` | File | Curated model metadata | Target model limits | Existing metadata source | Pricing or runtime request logic |
| `autobyteus-ts/src/llm/api/provider-request-kwargs.ts` | File | External provider kwarg boundary | Internal kwarg deny-list and safe apply/clone helpers | LLM API adapters already share request-building concerns in this folder | Provider-specific model policy |
| `autobyteus-ts/src/llm/api/anthropic-llm.ts` | File | Anthropic request adapter | Current model thinking/sampling policy and safe request kwargs | Existing provider adapter | Catalog row definitions or UI labels |
| `autobyteus-ts/tests/unit/llm/api/anthropic-llm.test.ts` | File | Anthropic request tests | Mocked payload tests | Existing test file | Paid provider calls |
| `autobyteus-ts/tests/unit/llm/supported-model-definitions.test.ts` | File | Catalog tests | Membership/pricing cache dimensions | Existing test file | Live metadata calls |
| `autobyteus-ts/tests/integration/llm/llm-factory-metadata-resolution.test.ts` | File | Registry metadata tests | Mocked metadata expectations | Existing test file | Real network/provider calls |
| `autobyteus-ts/tests/integration/llm/api/anthropic-llm.test.ts` | File | Live Anthropic smoke tests | Minimal `logicalConversationId` validation using provider-access skip | Existing file | Fable/model-matrix tests |
| `autobyteus-ts/docs/provider_model_catalogs.md` | File | Catalog docs | Durable Anthropic update | Existing docs owner | Unverified aliases |
| `autobyteus-ts/docs/llm_module_design_nodejs.md` | File | Module docs | Support summary | Existing docs owner | Detailed implementation code |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `autobyteus-ts/src/llm` | Mixed Justified | Yes | Low | Existing LLM subsystem owns catalog, adapters, metadata. Scope is small; no new folders needed. |
| `autobyteus-ts/tests/unit/llm` | Mixed Justified | Yes | Low | Existing test layout mirrors subsystem. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Unsupported Sonnet alias | Add `name: 'claude-sonnet-5', value: 'claude-sonnet-5'` | Add `claude-sonnet-4.8` as alias to Sonnet 5 | Prevents unverified/fuzzy model IDs. |
| Anthropic cache pricing | Fable: input 10, output 50, cache read 1, 5m write 12.5, 1h write 20 | Only input 10/output 50 and omit cache dimensions | Anthropic cost estimates require cache dimensions. |
| Request-shape policy | Resolve model policy once, then decide thinking and temperature | `if (model === opus47)` repeated and new models fall through | Keeps provider invariants coherent. |
| Internal kwarg filtering | `applySafeProviderRequestKwargs(request, kwargs, { controlledKeys: ['stream', 'tools'] })` before Anthropic SDK call | `Object.assign(request, kwargs)` with only `stream` deleted | Prevents `logicalConversationId` and similar AutoByteus fields from reaching external providers. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| `claude-sonnet-4.8` alias to `claude-sonnet-5` | User originally asked about Sonnet 4.8 | Rejected | Add exact `claude-sonnet-5`; do not add alias. |
| Keep Opus 4.7-only predicate and add more ad hoc checks | Smallest patch | Rejected | Replace with model capability policy/helper. |
| Live Fable integration test | Would prove provider access | Rejected by user and cost | Mocked request-payload tests only. |
| Remove `logicalConversationId` from `LlmPhase` | Would stop Anthropic from seeing it | Rejected | Keep internal runtime kwarg for `AutobyteusLLM`; filter it at external provider boundary. |
| Add an Anthropic-only deny-list while leaving OpenAI-compatible duplicate private list | Fastest local fix | Rejected if shared extraction is feasible | Extract shared provider-request kwarg sanitizer and import from both owners. |

## Derived Layering (If Useful)

- UI/server display layer reads from model registry only.
- LLM catalog layer owns model identity/pricing.
- Runtime invocation layer owns internal kwargs such as logical conversation identity.
- Provider request utility layer owns cross-provider safe kwarg filtering.
- Provider adapter layer owns request payload semantics.
- Token usage layer owns usage normalization and pricing application.

## Migration / Refactor Sequence

1. Add/extract shared provider-request kwarg sanitizer:
   - Define internal invocation kwargs: `logicalConversationId`, `logical_conversation_id`, `conversationId`, `agentId`, `turnId`, `requestId`, `renderedPayload`.
   - Provide helper(s) that drop null/undefined values, drop internal keys, and skip adapter-controlled fields supplied by each adapter.
   - Move the private OpenAI-compatible deny-list to this helper or otherwise ensure Anthropic uses the same canonical set.
2. Update `anthropic-llm.ts`:
   - Replace `isClaudeOpus47` with a policy helper that covers `claude-opus-4-8`, `claude-opus-4-7`, `claude-sonnet-5`, and `claude-fable-5`.
   - Replace raw kwargs spread with the shared safe kwarg helper. Anthropic-controlled keys should include at least `stream` and `tools`; `thinking` may remain a provider kwarg but must still be sanitized by Anthropic model policy.
   - Ensure current adaptive models do not receive manual fixed-budget thinking.
   - Ensure current models do not receive injected `temperature: 0` when unsupported.
   - Preserve explicit caller `thinking` override only where provider-valid; for models where manual thinking is rejected, ignore/avoid schema-generated fixed-budget thinking.
3. Update `openai-compatible-request-builder.ts` to import the shared safe kwarg helper and preserve its existing behavior for `tools`/`tool_choice`.
4. If implementation remains small and tests are straightforward, update `mistral-llm.ts` to stop spreading raw kwargs and use the same helper; otherwise record Mistral as follow-up.
5. Update `supported-model-definitions.ts`:
   - Add `claude-sonnet-5` row with standard/launch pricing decision per requirements.
   - Add `claude-fable-5` row with base/cache pricing dimensions.
   - Keep `claude-opus-4.8` row and ensure its schema points to adaptive/current behavior.
   - Do not add `claude-sonnet-4.8`.
6. Update `curated-model-metadata.ts` for Sonnet 5 and Fable 5.
7. Update tests:
   - Anthropic request payload unit tests for Opus 4.8, Sonnet 5, Fable 5.
   - Anthropic request payload unit tests proving `logicalConversationId` and sibling internal kwargs are filtered for sync and streaming while `tools` and valid provider kwargs still work.
   - OpenAI-compatible builder tests should continue to prove internal kwarg filtering after helper extraction.
   - Catalog/pricing test for target rows and cache dimensions.
   - Metadata registry test with mocked metadata/fallback expectations.
   - Add one minimal credential-gated Anthropic integration test for `streamUserMessage(..., { logicalConversationId: "..." })` using existing provider-access skip behavior and a non-Fable model.
8. Update durable docs.
9. Run targeted validation:
   - Unit/catalog/metadata tests for the changed package.
   - Existing Anthropic integration suite if credentials are present, including the new minimal `logicalConversationId` scenario.
   - TypeScript/build checks relevant to changed packages.

## Key Tradeoffs

- Static catalog remains manual but predictable; dynamic Anthropic discovery is deferred.
- Default pricing uses standard Claude API pricing. Batch/Fast/US-only variants are documented but not modeled as default unless existing pricing architecture already supports a safe mode switch.
- Minimal live Anthropic validation is allowed only because the reported defect is a provider-boundary runtime issue that existing mocked/model tests did not catch; Fable/model-matrix live testing remains rejected for cost.
- Shared kwarg sanitizer slightly broadens the patch beyond Anthropic but removes a demonstrated duplicated policy and prevents recurrence.

## Risks

- Sonnet 5 launch pricing expires after 2026-08-31; implementation must choose whether to encode standard pricing immediately or document launch pricing separately. Prefer standard pricing for durable catalog estimates unless product explicitly wants launch pricing.
- Fable 5 behavior includes refusal/fallback/data-retention considerations not fully addressed by a catalog-only change.
- Anthropic docs can change; implementation should re-check docs if done later than this design date.
- Mistral has a similar raw kwargs spread; if not fixed in this implementation, leave a clear follow-up because the same `logicalConversationId` runtime kwarg could leak there.
- Live integration tests depend on the copied `.env.test` key and may skip or fail for account/model access reasons unrelated to code.

## Guidance For Implementation

- Keep the patch narrow and owner-aligned.
- Do not implement dynamic discovery or UI feature changes.
- Do not remove `logicalConversationId` from the agent loop or `AutobyteusLLM`; filter it only for external provider SDK requests.
- Do not print `.env.test` or API keys in logs.
- Do not run live Fable tests. For the runtime bug, run only the minimal non-Fable Anthropic integration validation approved by the user.
- Use standard pricing for default model catalog unless a deliberate decision is made to encode time-bound launch pricing. If launch pricing is encoded, make the effective date/risk explicit in docs/tests.
- For cache dimensions:
  - Fable 5: input `10`, output `50`, cache read `1`, 5m cache write `12.5`, 1h cache write `20`.
  - Opus 4.8: input `5`, output `25`, cache read `0.5`, 5m cache write `6.25`, 1h cache write `10`.
  - Sonnet 5 standard: input `3`, output `15`, cache read `0.3`, 5m cache write `3.75`, 1h cache write `6`.
  - If launch price is intentionally used: input `2`, output `10`, cache read `0.2`, 5m cache write `2.5`, 1h cache write `4`, with expiry after 2026-08-31.
