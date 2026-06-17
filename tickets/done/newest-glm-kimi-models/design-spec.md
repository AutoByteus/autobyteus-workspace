# Design Spec

## Current-State Read

The current AutoByteus TS GLM/Kimi model path has three relevant execution areas:

1. Catalog listing: `supported-model-definitions.ts` -> `ModelMetadataResolver` -> `LLMModel.toModelInfo()` -> server/frontend model lists.
2. Provider invocation: runtime model selection -> `LLMFactory` or direct adapter construction -> `GlmLLM` / `KimiLLM` -> `OpenAICompatibleRequestBuilder` -> provider Chat Completions API.
3. Schema-driven config UI: model `config_schema` -> web config adapter -> persisted `LLMConfig.extraParams` -> provider adapter request shaping.

The current project ownership layout remains healthy for this ticket:

- `supported-model-definitions.ts` owns active built-in model IDs and provider config schemas.
- `GlmLLM` and `KimiLLM` own provider-specific request-shape conversion and defaults.
- `curated-model-metadata.ts` owns docs-backed fallback metadata for built-in model rows.
- `llmThinkingConfigAdapter.ts` owns frontend interpretation of model config schema for thinking controls.
- The shared OpenAI-compatible request builder owns generic request assembly, not provider policy.

The stale/problematic state is model-catalog and provider-policy drift:

- GLM active support still included `glm-5.1`, while official guidance now targets `glm-5.2`.
- Kimi active support included `kimi-k2-thinking`, while the desired active Kimi set is `kimi-k2.6` plus `kimi-k2.7-code`.
- Kimi K2.6 request safety behavior must remain only for K2.6. Kimi K2.7 Code has always-on thinking and fixed sampling constraints, so K2.6 defaults cannot leak into K2.7 Code requests.
- GLM 5.2 adds `reasoning_effort` and updated token metadata, so the GLM schema, metadata, docs, and request shaping must be updated consistently.

A separate Daily Assistant/Kimi media schema runtime failure was investigated and determined to be an RPA public media-model schema contract problem. That schema work is not part of this current AutoByteus TS ticket. The current ticket must not modify `ParameterSchema`, OpenAI-compatible tool schema normalization, or media tool schema parsing for that RPA bug.

## Intended Change

- Replace active built-in GLM `glm-5.1` with `glm-5.2`.
- Keep active Kimi `kimi-k2.6` as the general-purpose Kimi model.
- Add active Kimi `kimi-k2.7-code` as the coding/agentic Kimi model.
- Remove active Kimi `kimi-k2-thinking` support.
- Update GLM/Kimi provider defaults, metadata, tests, and docs to match the corrected active model set.
- Keep provider-specific request-shape policy in provider adapters, with only minimal shared request-builder extensibility if needed for provider-local normalized config.

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Behavior Change / Catalog Modernization.
- Current design issue found (`Yes`/`No`/`Unclear`): Yes, bounded to stale active model catalog and provider request-policy drift.
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Legacy Or Compatibility Pressure.
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): Yes, but bounded to existing catalog/provider/UI owners; no schema-boundary refactor in this project.
- Evidence: Existing active source/docs/tests referenced stale model IDs (`glm-5.1`, `kimi-k2-thinking`). Official GLM/Kimi docs establish `glm-5.2` and `kimi-k2.7-code` constraints. User clarified `kimi-k2.6` remains needed as a separate general-purpose row. Kimi adapter K2.6 request shaping would be invalid for K2.7 Code unless scoped.
- Design response: Clean-cut replacement/removal in catalog and metadata; model-specific adapter policy in `GlmLLM` and `KimiLLM`; schema-driven UI support for GLM 5.2 effort; updated tests/docs.
- Refactor rationale: The existing owner files are the correct owners, but stale model rows and model-specific request policy must be tightened now to avoid dual/legacy behavior.
- Intentional deferrals and residual risk, if any: The RPA media schema casing problem is deferred to a future RPA ticket. Until then, Kimi native tool calls involving RPA media models can still fail when the RPA service emits snake_case media `parameter_schema`; that is not addressed by this ticket.

## Terminology

- `Subsystem` / `capability area`: a larger functional area that owns a broader category of work and may contain multiple files plus optional module groupings.
- `Module`: an optional intermediate grouping inside a subsystem when the codebase benefits from it. Do not use `module` as a synonym for one file or as the default ownership term.
- `Folder` / `directory`: a physical grouping used to organize files and any optional module groupings.
- `File`: one concrete source file and the primary unit where one concrete concern should land.

## Design Reading Order

1. data-flow spine
2. subsystem / capability-area allocation
3. draft file responsibilities -> extract reusable owned structures -> finalize file responsibilities
4. folder/path mapping

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: remove active built-in support for `glm-5.1` and `kimi-k2-thinking`.
- Kimi K2.6 is not legacy for this task; it remains an explicit first-class active model because the user needs a general-purpose Kimi model.
- No aliases, fallback rows, hidden wrappers, or dual-path support should preserve removed model IDs.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | Built-in provider catalog definition | Frontend/runtime model selector receives `ModelInfo` | Built-in Catalog | Ensures active GLM/Kimi rows are exactly the new supported set. |
| DS-002 | Primary End-to-End | Runtime invocation selecting GLM | Provider-native GLM 5.2 request | GLM Provider Adapter | Ensures GLM 5.2 defaults, thinking, and effort are serialized correctly. |
| DS-003 | Primary End-to-End | Runtime invocation selecting Kimi | Provider-native Kimi request | Kimi Provider Adapter | Ensures K2.6 and K2.7 Code have separate safe request policies. |
| DS-004 | Primary End-to-End | Model config schema | Frontend thinking UI state/config writeback | Schema-driven Thinking UI | Ensures GLM 5.2 effort is displayed/configured without model-name hacks. |
| DS-005 | Return-Event | Provider/live/curated metadata resolution | `ModelInfo` token limits and docs-backed metadata | Metadata Resolver | Keeps model selector and docs metadata consistent with active rows. |

## Primary Execution Spine(s)

- DS-001: `supported-model-definitions.ts -> ModelMetadataResolver -> LLMModel.toModelInfo() -> server model provider -> web/runtime model selector`
- DS-002: `GLM model selection -> LLMFactory/GlmLLM -> GLM config normalization -> OpenAICompatibleRequestBuilder -> GLM API`
- DS-003: `Kimi model selection -> LLMFactory/KimiLLM -> model-specific Kimi request normalization -> OpenAICompatibleRequestBuilder -> Moonshot/Kimi API`
- DS-004: `model config_schema -> llmThinkingConfigAdapter -> web config control state -> persisted llmConfig.extraParams -> provider adapter`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | The built-in catalog declares the active GLM/Kimi IDs and config schemas. Metadata is merged before model info reaches frontend/runtime selectors. | Catalog definition, metadata resolver, model info, selector | Built-in Catalog | Docs-backed metadata, stale-reference tests |
| DS-002 | A GLM invocation uses the selected/default `glm-5.2` model. The GLM adapter converts flat config fields into provider-native request fields and omits stale effort when thinking is disabled. | GLM selection, GLM adapter, request builder, GLM API | GLM Provider Adapter | Config schema, default model, request capture tests |
| DS-003 | A Kimi invocation chooses either retained K2.6 or new K2.7 Code. The Kimi adapter applies K2.6-only tool-safe behavior only to K2.6 and K2.7-safe sampling/thinking policy only to K2.7 Code. | Kimi selection, Kimi adapter, request builder, Kimi API | Kimi Provider Adapter | Tool-call policy, sampling defaults, reasoning preservation coverage |
| DS-004 | The frontend reads schema fields, not hard-coded model names, to present thinking controls. GLM 5.2 effort should be interpreted through the same schema-driven contract. | Config schema, UI adapter, config writeback | Schema-driven Thinking UI | Web tests for provider-neutral effort handling |
| DS-005 | Curated/live metadata attaches docs-backed context and output limits to active model rows before model info is exposed. | Curated metadata, resolver, model info | Metadata Resolver | Official-doc verification dates, pricing caution |

## Spine Actors / Main-Line Nodes

- Built-in catalog definition
- Metadata resolver / `LLMModel`
- Server/frontend model listing consumers
- `GlmLLM`
- `KimiLLM`
- `OpenAICompatibleRequestBuilder`
- `llmThinkingConfigAdapter`

## Ownership Map

- Built-in catalog definition owns which model identifiers are actively supported and what config schema is exposed for those active rows.
- Metadata resolver owns merging live and curated metadata and producing consistent model token limits.
- `GlmLLM` owns GLM-specific default model choice and request-shape translation (`thinking_type` -> `thinking.type`, effort handling).
- `KimiLLM` owns Kimi-specific default model choice and model-ID-specific Kimi request normalization.
- Shared request builder owns generic OpenAI-compatible request assembly. It must not hard-code GLM or Kimi business rules.
- Frontend thinking config adapter owns schema-driven UI behavior and must not own provider API request conversion.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `LLMFactory` model creation/listing methods | Built-in catalog, metadata resolver, provider adapters | Public factory surface for callers | Provider-specific request policy or stale model aliases |
| Server/frontend model providers | `LLMModel.toModelInfo()` and catalog/metadata owners | Transport/UI exposure of model info | Separate GLM/Kimi catalog decisions |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| Active `glm-5.1` built-in row/default/metadata/docs/test assertions | GLM 5.2 is the target latest active GLM model | `glm-5.2` row/default/metadata/docs/tests | In This Change | Historical records/archival tickets may remain. |
| Active `kimi-k2-thinking` built-in row/metadata/docs/test assertions | Removed from desired active Kimi model set | `kimi-k2.7-code` coding row plus retained `kimi-k2.6` general row | In This Change | No alias/fallback to old ID. |
| Kimi K2.6 request-shape behavior applying beyond K2.6 | K2.7 Code has incompatible thinking/sampling rules | Model-ID-scoped `KimiLLM` request normalization | In This Change | K2.6 behavior remains for K2.6 only. |
| DeepSeek-specific naming in provider-neutral thinking UI tests/logic, if encountered | GLM 5.2 also exposes `thinking_type` plus effort | Schema-driven thinking adapter naming/tests | In This Change | Avoid model-name hacks. |
| Current-project schema-boundary changes for RPA media schema issue | User clarified this belongs to RPA project | Future RPA public media-schema contract fix | Follow-up | Do not modify `ParameterSchema`/tool schema normalizer here. |

## Return Or Event Spine(s) (If Applicable)

- DS-005 return path: `provider metadata/live model list or curated metadata -> ModelMetadataResolver -> LLMModel -> ModelInfo -> server/frontend consumers`.

## Bounded Local / Internal Spines (If Applicable)

- Parent owner: `KimiLLM`
  - Chain: `selected model ID -> K2.6/K2.7 policy decision -> normalized request config/kwargs -> request builder`
  - Why this matters: K2.6 and K2.7 Code have conflicting thinking/sampling rules; the decision must stay inside the Kimi adapter.
- Parent owner: `GlmLLM`
  - Chain: `flat extra params -> thinking object mapping -> effort inclusion/omission -> request builder`
  - Why this matters: GLM exposes schema-friendly flat config but provider API expects native `thinking` and `reasoning_effort` fields.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Official docs verification | DS-001, DS-005 | Catalog and metadata owners | Validate model IDs, token limits, and constraints | Avoid stale/invented metadata | Catalog becomes guesswork |
| Request capture/unit tests | DS-002, DS-003 | Provider adapters | Prove provider-native request shape by model ID | Prevent invalid provider requests | Runtime-only failures |
| Web schema tests | DS-004 | UI adapter | Prove config UI remains schema-driven | Avoid provider/model-name hacks | UI behavior drifts from schema contract |
| Stale reference scan | DS-001 | Implementation/review | Ensure removed model IDs are not active support | Enforces clean-cut removal | Legacy support persists silently |
| API/E2E provider checks | DS-002, DS-003 | Provider adapters | Validate live/provider-realistic behavior when credentials exist | Unit tests cannot fully prove provider acceptance | Provider-specific breakage escapes |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Active built-in model IDs | LLM supported model definitions | Extend/modify | Existing source of truth | N/A |
| Provider request policy | `GlmLLM` / `KimiLLM` adapters | Extend/modify | Existing provider-specific owners | N/A |
| Token/context metadata | Curated metadata + resolver | Extend/modify | Existing metadata owner | N/A |
| Frontend thinking controls | `llmThinkingConfigAdapter` | Extend/modify | Existing schema-driven UI owner | N/A |
| RPA media schema casing | RPA project media-model API | Defer/future ticket | Not owned by current AutoByteus TS model ticket | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Built-in LLM Catalog | Active model IDs, model display names, config schemas | DS-001 | Catalog definition | Extend/modify | Clean-cut old-row removal. |
| Provider Adapters | Provider defaults and request normalization | DS-002, DS-003 | `GlmLLM`, `KimiLLM` | Extend/modify | Keep policy provider-local. |
| Metadata | Context/output/pricing/doc metadata | DS-001, DS-005 | Metadata resolver | Extend/modify | Use official source dates; avoid unverified Kimi pricing. |
| Web Config UI | Schema interpretation for thinking controls | DS-004 | UI adapter | Extend/modify | Generalize typed-thinking/effort handling. |
| Coverage/Docs | Tests and durable docs | All | Implementation/review/delivery | Extend/modify | Update active docs/tests; ignore archival tickets. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/llm/supported-model-definitions.ts` | Built-in LLM Catalog | Catalog | Register `glm-5.2`, `kimi-k2.6`, `kimi-k2.7-code`; remove old active rows; expose GLM 5.2 schema | Existing catalog authority | Existing `ParameterSchema`, `LLMConfig` |
| `autobyteus-ts/src/llm/api/glm-llm.ts` | Provider Adapters | GLM adapter | Default to `glm-5.2`; map thinking/effort correctly | Existing GLM request owner | Existing request builder |
| `autobyteus-ts/src/llm/api/kimi-llm.ts` | Provider Adapters | Kimi adapter | Keep K2.6 default; add K2.7 Code-safe request normalization; remove K2-thinking policy | Existing Kimi request owner | Existing request builder/config |
| `autobyteus-ts/src/llm/api/openai-compatible-llm.ts` | Provider Adapters / shared request assembly | Shared OpenAI-compatible base | Optional hook for provider adapter to pass normalized `LLMConfig` into builder | Existing base class assembles request | Existing `LLMConfig` |
| `autobyteus-ts/src/llm/metadata/curated-model-metadata.ts` | Metadata | Curated metadata | Replace stale metadata and add K2.7 Code metadata | Existing metadata owner | Existing metadata structures |
| `autobyteus-web/utils/llmThinkingConfigAdapter.ts` | Web Config UI | Thinking config adapter | Keep UI schema-driven for GLM 5.2 effort | Existing UI owner | Existing schema shapes |
| Active unit/integration tests | Coverage | Test suites | Assert catalog, metadata, request shape, UI behavior | Existing coverage locations | Existing mocks/helpers |
| Active provider docs | Documentation | Durable docs | Explain supported GLM/Kimi rows and constraints | Existing docs | N/A |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Kimi model-specific request policy | Keep in `kimi-llm.ts`; optional small internal predicates/constants | Provider Adapters | Policy is provider-specific, not global | Yes | Yes | Shared OpenAI-compatible policy or caller-side branching |
| GLM thinking/effort mapping | Keep in `glm-llm.ts` | Provider Adapters | Policy is GLM-specific | Yes | Yes | Frontend/API caller responsibility |
| Thinking UI schema interpretation | Keep in `llmThinkingConfigAdapter.ts` | Web Config UI | UI-specific interpretation of schema | Yes | Yes | Provider request conversion |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| Built-in model definition rows | Yes | Yes after old rows removed | Low | Do not keep alias rows for removed IDs. |
| GLM config schema | Yes | Yes | Low | `thinking_type` is UI/config-friendly; adapter maps it to provider `thinking`. |
| Kimi request config | Yes after adapter scoping | Yes | Medium until implemented | Scope K2.6 and K2.7 Code rules by model ID. |
| Curated metadata | Yes | Yes | Low | Keep one row per active built-in model. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/llm/supported-model-definitions.ts` | Built-in LLM Catalog | Catalog | Active GLM/Kimi rows and config schemas | Existing catalog source of truth | `ParameterSchema` config definitions |
| `autobyteus-ts/src/llm/api/glm-llm.ts` | Provider Adapters | GLM adapter | GLM 5.2 default and provider-native request shape | Existing GLM owner | `LLMConfig`, request builder |
| `autobyteus-ts/src/llm/api/kimi-llm.ts` | Provider Adapters | Kimi adapter | K2.6 default and separate K2.6/K2.7 Code policies | Existing Kimi owner | `LLMConfig`, request builder |
| `autobyteus-ts/src/llm/api/openai-compatible-llm.ts` | Provider Adapters / shared request assembly | OpenAI-compatible base | Optional normalized-config hook only | Existing assembly path | `LLMConfig` |
| `autobyteus-ts/src/llm/metadata/curated-model-metadata.ts` | Metadata | Curated metadata | Docs-backed metadata for active rows | Existing metadata owner | Model metadata types |
| `autobyteus-web/utils/llmThinkingConfigAdapter.ts` | Web Config UI | Thinking UI adapter | Schema-driven thinking/effort UI behavior | Existing UI owner | Model config schema |
| Relevant unit/integration/web tests | Coverage | Test owners | Regression coverage for active catalog/request/UI docs behavior | Existing coverage structure | Existing fixtures |
| Relevant docs under `autobyteus-ts/docs/` | Documentation | Durable docs | Explain active provider models and constraints | Existing docs | N/A |

## Ownership Boundaries

- Catalog boundary: callers must get active supported models from `supported-model-definitions.ts`/`LLMFactory`; they must not maintain separate GLM/Kimi active lists.
- Provider adapter boundary: callers pass model/config; `GlmLLM` and `KimiLLM` decide provider-native request shape.
- Shared request-builder boundary: the request builder assembles generic OpenAI-compatible payloads. Provider adapters may supply normalized config/kwargs; the builder must not learn Kimi/GLM model semantics.
- UI adapter boundary: the web adapter interprets config schemas for UI; it must not shape provider API payloads.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| Built-in catalog / `LLMFactory` | Supported model definitions and metadata resolution | Server/frontend/runtime model listing | Separate active GLM/Kimi hard-coded lists | Extend model definitions/metadata resolver |
| `GlmLLM` | GLM default and request mapping | Runtime invocation | Callers setting provider-native `thinking` while also using flat schema policy | Add/adjust GLM adapter normalization |
| `KimiLLM` | K2.6/K2.7 Code policy | Runtime invocation | Callers deciding Kimi model-specific sampling/thinking | Add/adjust Kimi adapter predicates/config normalization |
| `llmThinkingConfigAdapter` | UI schema interpretation | Frontend settings controls | Model-name hard-coded UI decisions | Strengthen schema interpretation |

## Dependency Rules

- `supported-model-definitions.ts` may depend on shared schema/config types; provider adapters must not derive active support from docs/tests.
- Provider adapters may depend on shared request builder and `LLMConfig`; request builder must not import GLM/Kimi adapter constants for model-specific policy.
- UI config adapter may depend on schema shape, not provider adapter implementation details.
- Tests may assert public behavior and captured request payloads; tests must not require removed model IDs except explicit negative assertions.
- No current-project code in this ticket may add snake_case media schema compatibility for the RPA bug.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `LLMFactory.listModelsByProvider(LLMProvider.GLM)` | GLM built-in model listing | Return active GLM rows | `LLMProvider.GLM` | Must return `glm-5.2`, not `glm-5.1`. |
| `LLMFactory.listModelsByProvider(LLMProvider.KIMI)` | Kimi built-in model listing | Return active Kimi rows | `LLMProvider.KIMI` | Must include `kimi-k2.6` and `kimi-k2.7-code`; exclude `kimi-k2-thinking`. |
| `new GlmLLM(model?, config?)` | GLM provider invocation | Build GLM requests | Optional model identifier/value | Default is `glm-5.2`. |
| `new KimiLLM(model?, config?)` | Kimi provider invocation | Build Kimi requests | Optional model identifier/value | Default remains `kimi-k2.6`. |
| `llmThinkingConfigAdapter` public functions | Thinking UI state | Convert schema/config to UI controls and back | Model/config schema | Provider-neutral schema behavior. |

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `listModelsByProvider` | Yes | Yes | Low | Keep provider enum explicit. |
| `GlmLLM` constructor | Yes | Yes | Low | Update default. |
| `KimiLLM` constructor | Yes | Yes | Medium until policy split | Keep K2.6 default and branch policy by concrete model ID. |
| `llmThinkingConfigAdapter` | Yes | Yes | Medium if DeepSeek-named logic remains | Generalize schema-driven naming/tests. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Built-in catalog | `supported-model-definitions.ts` | Yes | Low | No rename. |
| GLM adapter | `GlmLLM` | Yes | Low | No rename. |
| Kimi adapter | `KimiLLM` | Yes | Low | No rename. |
| Thinking UI adapter | `llmThinkingConfigAdapter` | Yes | Medium if internals are DeepSeek-specific | Keep public subject provider-neutral. |

## Applied Patterns (If Any)

- Adapter pattern: `GlmLLM` and `KimiLLM` adapt product-level model/config choices to provider-native OpenAI-compatible request payloads.
- Schema-driven UI pattern: frontend thinking controls derive behavior from model config schema rather than hard-coded provider/model names.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/llm/supported-model-definitions.ts` | File | Built-in catalog | Active GLM/Kimi model rows and config schemas | Existing source of active built-in model support | Compatibility aliases for removed IDs |
| `autobyteus-ts/src/llm/api/glm-llm.ts` | File | GLM adapter | GLM 5.2 default/request conversion | Existing GLM provider boundary | Kimi policy or UI behavior |
| `autobyteus-ts/src/llm/api/kimi-llm.ts` | File | Kimi adapter | K2.6/K2.7 Code request policy | Existing Kimi provider boundary | RPA/media schema normalization |
| `autobyteus-ts/src/llm/api/openai-compatible-llm.ts` | File | Shared OpenAI-compatible base | Generic request assembly; optional adapter-config hook | Existing shared request path | Provider-specific GLM/Kimi constants |
| `autobyteus-ts/src/llm/metadata/curated-model-metadata.ts` | File | Metadata | Curated docs-backed model metadata | Existing metadata file | Removed model active metadata |
| `autobyteus-web/utils/llmThinkingConfigAdapter.ts` | File | Web UI adapter | Schema-driven thinking UI state | Existing frontend owner | Provider API request conversion |
| `autobyteus-ts/docs/*.md` | Files | Documentation | Active provider model catalog/request behavior | Existing docs area | Current support claims for removed IDs |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `autobyteus-ts/src/llm/` | Main-Line Domain-Control | Yes | Low | Existing LLM subsystem is the correct home. |
| `autobyteus-ts/src/llm/api/` | Persistence-Provider / Adapter | Yes | Low | Provider adapters already live here. |
| `autobyteus-ts/src/llm/metadata/` | Off-Spine Concern | Yes | Low | Metadata is separate from invocation. |
| `autobyteus-web/utils/` | UI utility | Yes | Medium | Existing location; keep scope narrow to UI schema interpretation. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Kimi active rows | Catalog contains `kimi-k2.6` and `kimi-k2.7-code`; no `kimi-k2-thinking`. | Keep `kimi-k2-thinking` as alias/fallback to K2.7 Code. | Prevents hidden old-model support. |
| Kimi request policy | `if model === 'kimi-k2.6'` apply K2.6 tool-safe disabled-thinking; `if model === 'kimi-k2.7-code'` avoid disabled thinking and invalid generic sampling. | Global Kimi behavior that disables thinking for every Kimi tool request. | K2.6 and K2.7 Code constraints conflict. |
| GLM request policy | UI/config stores `thinking_type`; adapter sends provider-native `thinking: { type }` and includes effort only when applicable. | Request payload includes both `thinking_type` and stale `reasoning_effort` when disabled. | Keeps provider request shape valid. |
| RPA schema bug scope | Current ticket records deferral to future RPA media schema contract fix. | Patch current `ParameterSchema` or Kimi tool schema formatter for snake_case RPA media schemas. | User clarified that the clean owner is RPA, not this project. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Alias `glm-5.1` to `glm-5.2` | Might preserve old callers | Rejected | Remove active `glm-5.1`; use `glm-5.2` active row/default. |
| Alias `kimi-k2-thinking` to `kimi-k2.7-code` | Might preserve old Kimi thinking selection | Rejected | Remove active `kimi-k2-thinking`; add explicit `kimi-k2.7-code`. |
| Treat Kimi K2.6 as compatibility fallback only | Could simplify to one newest Kimi row | Rejected | Keep K2.6 as first-class general-purpose row. |
| Global shared request-builder Kimi/GLM policy | Could centralize request changes | Rejected | Keep provider semantics in provider adapters; shared builder remains generic. |
| Current-project schema-boundary compatibility for RPA media snake_case | Would quickly mask the runtime error | Rejected for this ticket | Future RPA ticket should make media endpoint `parameter_schema` camelCase at the source. |

## Derived Layering (If Useful)

- Product catalog layer: supported model definitions and metadata.
- Provider adapter layer: GLM/Kimi request-shape policy.
- Generic transport/request assembly layer: OpenAI-compatible request builder.
- UI schema layer: frontend thinking config adapter.

Higher layers must not bypass provider adapters to inject provider-native request details, and provider adapters must not depend on UI code.

## Migration / Refactor Sequence

1. Catalog rows:
   - Replace active GLM `glm-5.1` with `glm-5.2`.
   - Keep `kimi-k2.6`.
   - Add `kimi-k2.7-code`.
   - Remove active `kimi-k2-thinking`.
2. Metadata:
   - Replace GLM 5.1 metadata with GLM 5.2 docs-backed values.
   - Keep/update K2.6 metadata.
   - Add K2.7 Code metadata.
   - Remove active K2-thinking metadata.
3. Provider adapters:
   - Default `GlmLLM` to `glm-5.2` and map GLM 5.2 thinking/effort correctly.
   - Keep `KimiLLM` default at `kimi-k2.6`.
   - Scope K2.6-safe behavior to K2.6 and K2.7 Code-safe behavior to K2.7 Code.
   - If needed, add a small provider-config hook in the OpenAI-compatible base so provider adapters can pass normalized config without moving policy into the shared builder.
4. Frontend schema-driven config:
   - Generalize tests/logic so `thinking_type` plus `reasoning_effort` works for GLM 5.2 without DeepSeek-only assumptions.
5. Coverage/docs:
   - Update unit/integration/web tests for active model list, defaults, request shapes, and UI behavior.
   - Update active docs for GLM 5.2, K2.6, and K2.7 Code.
   - Run stale-reference search excluding archival `tickets/done` and generated build outputs.
6. Explicit non-step:
   - Do not implement RPA media schema casing compatibility in this current project.

## Key Tradeoffs

- Keeping Kimi K2.6 plus K2.7 Code is more explicit than a single newest Kimi default, but it matches the product distinction between general-purpose and coding-focused models.
- Keeping provider policy in adapters avoids global OpenAI-compatible request-builder complexity, but may require a small hook so adapters can pass normalized request config.
- Deferring RPA media schema casing keeps ownership clean, but the Daily Assistant/Kimi/RPA media runtime path remains affected until the future RPA ticket changes the RPA public API contract.

## Risks

- Kimi K2.7 Code multi-step tool use may require additional API/E2E validation for `reasoning_content` preservation.
- Kimi K2.7 Code sampling constraints may require careful adapter behavior so generic defaults are omitted or normalized without breaking K2.6.
- Official pricing for Kimi K2.7 Code was not fully captured; do not invent pricing values.
- Stale model references may remain in active docs/tests unless search excludes only archival/generated paths intentionally.

## Guidance For Implementation

- Keep model-catalog changes clean-cut: no old-ID aliases or wrappers.
- Keep `new KimiLLM()` defaulting to `kimi-k2.6` unless the user explicitly changes that product decision.
- Keep Kimi K2.6 and K2.7 Code request-policy branches local to `KimiLLM`.
- Keep GLM 5.2 request shaping local to `GlmLLM`.
- Only modify shared OpenAI-compatible request code to support provider-local normalized config; do not put Kimi/GLM model rules there.
- Update tests/docs in the same change.
- Do not modify current-project `ParameterSchema`, OpenAI-compatible tool schema normalizer, or media schema builders for the RPA media schema issue in this ticket.
