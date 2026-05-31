# Design Spec

## Current-State Read

The AutoByteus runtime model-config path is schema-driven:

`autobyteus-ts model registry -> autobyteus-server-ts GraphQL model catalog -> autobyteus-web schema normalizer -> ModelConfigSection / ModelConfigAdvanced -> run llmConfig -> autobyteus-ts LLM adapter request`

Current DeepSeek V4 schema in `autobyteus-ts/src/llm/supported-model-definitions.ts` exposes `reasoning_effort` as an enum and `thinking` as a nested provider request object. That schema is serialized to JSON Schema and passed through `autobyteus-server-ts` to the frontend. The frontend normalizer and advanced renderer support top-level enum, boolean, integer, and number parameters, but not nested object controls. Because `ModelConfigAdvanced.vue` falls back to a text input for unsupported types, DeepSeek's provider-native `thinking` object becomes the confusing blank `Thinking` text field.

OpenAI does not have this problem because its `openaiReasoningSchema` is frontend-safe and flat: `reasoning_effort` and `reasoning_summary`. `OpenAIResponsesLLM` owns the provider-specific conversion from those flat values into the Responses API `reasoning` object. Kimi also does not currently expose a model config schema to the frontend, and its provider `thinking` behavior is internal to `KimiLLM`. GLM already uses the correct shape: flat `thinking_type` schema with `GlmLLM` translating it to provider `thinking.type`. DeepSeek needs the same ownership shape as these healthy examples: flat user-facing config, adapter-owned provider request mapping.

Downstream browser validation after the first implementation found a second design issue: the raw blank text field was gone, but `thinking_type` appeared twice semantically—once as the basic `Thinking` toggle and again as an Advanced `Thinking Type` dropdown. The revised design tightens UI ownership: the basic `Thinking` toggle is the only visible DeepSeek enable/disable control. Advanced renders DeepSeek tuning controls, starting with `Reasoning Effort`, and must not render `Thinking Type`.

## Intended Change

Replace DeepSeek's user-facing model config schema with flat, constrained fields and move provider request-shape conversion into `DeepSeekLLM`:

- DeepSeek model schema continues to expose flat runtime/user config keys:
  - `reasoning_effort: "high" | "max"`.
  - `thinking_type: "enabled" | "disabled"`.
- DeepSeek model schema no longer exposes top-level object `thinking`.
- `DeepSeekLLM` maps `thinking_type` into the OpenAI SDK-compatible provider request shape: `extra_body: { thinking: { type } }`.
- Frontend thinking adapter gains DeepSeek-specific detection and toggle semantics so it does not classify DeepSeek as OpenAI only because both expose `reasoning_effort`.
- Frontend model-config rendering derives a separate Advanced schema projection that excludes fields owned by the basic `Thinking` toggle. For DeepSeek, `thinking_type` is toggle-owned and hidden from Advanced; `reasoning_effort` remains Advanced.
- OpenAI, Claude, Gemini, Kimi, GLM, Codex, and non-thinking config behavior remain unchanged except for tests proving non-regression.

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Bug Fix / UX Behavior Change
- Current design issue found (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue and Shared Structure Looseness
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): Yes, scoped
- Evidence: DeepSeek exposed a provider-native nested object in the model config schema; the frontend generic renderer cannot render object parameters and created a misleading text field; frontend thinking detection treated DeepSeek as OpenAI because of `reasoning_effort`; OpenAI itself works because its schema is flat and its adapter owns provider-specific request mapping. API/E2E browser validation then showed that the initial flat `thinking_type` repair still duplicated the same DeepSeek enable/disable mode in both the basic `Thinking` toggle and Advanced `Thinking Type` dropdown.
- Design response: Make the DeepSeek schema user-facing and flat; make `DeepSeekLLM` the authoritative owner of DeepSeek provider request-shape translation; make the frontend thinking adapter provider-shape-aware enough to handle DeepSeek separately from OpenAI; make `ModelConfigSection` project an Advanced schema that removes basic-toggle-owned mode keys such as DeepSeek `thinking_type`.
- Refactor rationale: Without this refactor, the UI remains coupled either to provider transport internals or to duplicated provider mode controls. The fix cannot be only a cosmetic hide of the raw field because the runtime must also stop accepting/sending a user-facing raw `thinking` object; it also cannot leave `thinking_type` visible in Advanced because that duplicates the basic toggle ownership.
- Intentional deferrals and residual risk, if any: General nested-object schema rendering is deferred. The task should not add a JSON-object editor to `ModelConfigAdvanced.vue`; the in-scope DeepSeek path becomes coherent without it. Existing persisted raw `thinking` values may be dropped/sanitized; this is acceptable because the raw object field was never a valid user-facing control.

## Terminology

- `User-facing model config`: Flat, schema-driven config values the frontend can render and users can reason about.
- `Provider request shape`: Provider/SKD-specific request payload structure sent by an LLM adapter.
- `Thinking mode`: DeepSeek V4 provider feature controlled by `thinking.type` in the request payload.
- `Reasoning effort`: DeepSeek V4 effort level controlled by `reasoning_effort`.

## Design Reading Order

1. Data-flow spine from model catalog schema to provider request.
2. Ownership split: schema source, UI renderer, provider adapter.
3. File responsibility changes.
4. Migration/removal and validation sequence.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: remove the raw top-level `thinking` object from the DeepSeek model config schema.
- Treat removal as first-class design work: the old UI-visible raw `thinking` field is decommissioned and replaced by `thinking_type` plus adapter-owned conversion; `thinking_type` is then treated as a basic-toggle-owned UI key and is not rendered in Advanced for DeepSeek.
- Decision rule: do not add a compatibility wrapper that keeps both `thinking` and `thinking_type` as accepted user-facing schema fields. The raw `thinking` object is provider-internal only.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | DeepSeek model registration in `autobyteus-ts` | Frontend Agent Definition model-config controls | Model config schema ownership split between `autobyteus-ts` and `autobyteus-web` | Explains why the weird field appears and where the user-facing schema must change. |
| DS-002 | Primary End-to-End | User-edited DeepSeek `llmConfig` | DeepSeek provider API request | `DeepSeekLLM` | Ensures flat UI config is translated into the provider request shape. |
| DS-003 | Return/Event | Provider docs / response semantics | Conversation reasoning display | Existing DeepSeek/OpenAI reasoning extractors | Confirms this task must not change reasoning-content rendering; it only changes configuration input. |

## Primary Execution Spine(s)

- DS-001: `DeepSeek supported model definition -> LLMModel.toModelInfo() -> autobyteus-server-ts GraphQL model catalog -> frontend schema normalizer -> ModelConfigSection / ModelConfigAdvanced -> Agent Definition UI`
- DS-002: `Agent Definition UI -> run llmConfig -> autobyteus-server-ts AutoByteus backend factory -> LLMConfig.extraParams -> DeepSeekLLM normalizer -> OpenAICompatibleRequestBuilder -> DeepSeek Chat Completions request`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | The built-in DeepSeek model schema is serialized and exposed to the frontend. The frontend renders each normalized top-level property. The current nested `thinking` object fell through to a text input; the target schema removes that object and exposes renderable flat fields. The revised target also prevents toggle-owned flat fields such as DeepSeek `thinking_type` from being rendered again under Advanced. | Supported model definition, model catalog GraphQL boundary, schema normalizer, config section renderer | `autobyteus-ts` owns the schema source; `autobyteus-web` owns presentation | Schema normalization, advanced control rendering, thinking toggle adapter |
| DS-002 | A user-selected DeepSeek config travels as `llmConfig` into the AutoByteus runtime. `DeepSeekLLM` converts `thinking_type` to `extra_body.thinking.type`, removes user-facing helper keys from raw request params, and leaves `reasoning_effort` valid only when thinking is enabled. | Run config, LLMConfig, DeepSeekLLM, OpenAI-compatible request builder, provider request | `DeepSeekLLM` | Extra-param normalization, contradictory disabled/effort cleanup, OpenAI-compatible shared builder reuse |
| DS-003 | Provider reasoning output remains handled by existing extractors/renderers. This change only fixes input configuration. | Provider response, chunk/complete response, conversation segment renderer | Existing LLM response and frontend conversation owners | Reasoning output display is out of scope |

## Spine Actors / Main-Line Nodes

- `supported-model-definitions.ts`: source of built-in model config schemas.
- `LLMModel.toModelInfo()`: publishes the schema to server model catalog consumers.
- `LlmProviderResolver.availableLlmProvidersWithModels()`: GraphQL boundary that passes model schema to the frontend.
- `normalizeModelConfigSchema()`: frontend schema adapter for renderable controls.
- `ModelConfigSection.vue`: coordinates the basic thinking toggle, derives the Advanced schema projection, and passes only Advanced-owned fields to advanced controls.
- `ModelConfigAdvanced.vue`: renders schema-driven advanced controls.
- `AutoByteusAgentRunBackendFactory` / `AutoByteusAgentConfigBuilder`: passes `llmConfig` into `LLMConfig.extraParams`.
- `DeepSeekLLM`: owns DeepSeek-specific config normalization.
- `OpenAICompatibleRequestBuilder`: shared request builder that should receive already-normalized provider params.

## Ownership Map

- `autobyteus-ts` model definitions own which config fields are user-facing for AutoByteus built-in models.
- `autobyteus-web` owns how declared user-facing fields are rendered, how the generic thinking toggle applies schema-specific edits, and which thinking fields are owned by the basic toggle versus Advanced.
- `DeepSeekLLM` owns provider-specific mapping from user-facing DeepSeek config to DeepSeek/OpenAI-SDK request payload.
- `OpenAIResponsesLLM` continues to own OpenAI-specific `reasoning_effort` / `reasoning_summary` mapping; DeepSeek changes must not bypass or alter this owner.
- `OpenAICompatibleRequestBuilder` remains a shared lower-level builder and must not learn DeepSeek-specific UI semantics.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| GraphQL `availableLlmProvidersWithModels` | Model catalog service / `autobyteus-ts` model definitions | Transport model catalog metadata to frontend | Provider-specific schema reshaping for DeepSeek |
| `ModelConfigSection.vue` | Frontend model-config presentation | Thin coordinator of basic/advanced controls | Provider request-payload construction |
| `OpenAICompatibleRequestBuilder` | Provider adapters that call it | Shared OpenAI-compatible request assembly | DeepSeek-specific user-config conversion |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| DeepSeek schema parameter `thinking` as top-level object in `deepseekV4Schema` | It leaks provider request shape into UI and renders as text | `thinking_type` flat enum plus `DeepSeekLLM` request normalization | In This Change | Do not keep both in the user-facing schema. |
| Frontend behavior that treats DeepSeek as OpenAI because of `reasoning_effort` alone | DeepSeek and OpenAI have different toggle semantics | DeepSeek-specific detection branch in `llmThinkingConfigAdapter.ts` | In This Change | Detect DeepSeek before OpenAI by `thinking_type + reasoning_effort`. |
| Advanced `Thinking Type` control for DeepSeek | It duplicates the basic `Thinking` toggle for the same enable/disable mode | Advanced schema projection in `ModelConfigSection` using adapter-owned toggle key metadata | In This Change | Browser validation proved this duplicate is confusing. |
| Any request path that forwards user-facing `thinking_type` to provider | Provider does not accept `thinking_type` | `DeepSeekLLM` normalization to `extra_body.thinking.type` | In This Change | Assert no `thinking_type` in final request. |
| Any user-facing raw DeepSeek `thinking` config retained only for old behavior | It preserves the confusing field | Clean schema replacement and sanitizer/request cleanup | In This Change | No compatibility UI wrapper. |

## Return Or Event Spine(s) (If Applicable)

This task does not change provider reasoning output events. Existing `OpenAICompatibleLLM` reasoning extraction and frontend reasoning segment rendering remain as-is.

## Bounded Local / Internal Spines (If Applicable)

- Parent owner: `llmThinkingConfigAdapter.ts`
- Internal spine: `schema -> detectThinkingProvider() -> getThinkingToggleState()/applyThinkingToggle()/getThinkingParamKeys()/getThinkingToggleOwnedParamKeys() -> updated llmConfig + Advanced projection metadata`
- Why it matters: The frontend toggle is a small local state machine over schema/config pairs. DeepSeek must be a distinct state branch because disabled/enabled is represented by `thinking_type`, not OpenAI `reasoning_summary` or `reasoning_effort: none`. The same owner should tell `ModelConfigSection` that DeepSeek `thinking_type` is owned by the basic toggle and must not render in Advanced.

- Parent owner: `DeepSeekLLM`
- Internal spine: `LLMConfig.extraParams -> normalizeDeepSeekExtraParams() -> normalized extraParams -> OpenAICompatibleRequestBuilder.build()`
- Why it matters: The shared OpenAI-compatible builder copies extra params directly; DeepSeek-specific cleanup must happen before that boundary.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| DeepSeek official request contract | DS-002 | `DeepSeekLLM` | Define `reasoning_effort` and `extra_body.thinking.type` shape | Keeps provider API details in adapter | UI would expose raw API objects again |
| Frontend schema normalization | DS-001 | `ModelConfigSection` / `ModelConfigAdvanced` | Adapt JSON Schema into renderable top-level fields | Keeps rendering simple and generic | Model registry would need frontend component knowledge |
| Advanced schema projection | DS-001 | `ModelConfigSection` served by `llmThinkingConfigAdapter` | Remove basic-toggle-owned thinking mode keys before rendering Advanced controls | Prevents duplicate controls for the same provider mode | Users see two independent-looking controls for one setting |
| Thinking toggle semantics | DS-001, DS-002 | `ModelConfigSection` | Coarse enable/disable behavior per provider schema | Makes common UX possible across providers | Shared renderer would confuse provider-specific meaning |
| Request-shape tests | DS-002 | `DeepSeekLLM` | Prove final provider payload is valid | Prevents future schema/UI keys from leaking to provider | Runtime could send invalid top-level keys |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Built-in model config schemas | `autobyteus-ts/src/llm/supported-model-definitions.ts` | Extend | DeepSeek schema already lives there | N/A |
| Provider-specific request mapping | `autobyteus-ts/src/llm/api/deepseek-llm.ts` | Extend | Adapter already owns DeepSeek provider behavior and renderer | N/A |
| Kimi provider-internal thinking safety behavior | `autobyteus-ts/src/llm/api/kimi-llm.ts` | Reuse unchanged | No user-facing schema is exposed; runtime-only provider payload injection is already adapter-owned | N/A |
| GLM thinking config mapping | `autobyteus-ts/src/llm/api/glm-llm.ts` and `glmSchema` | Reuse unchanged | Existing flat `thinking_type` plus adapter-owned provider mapping is the pattern DeepSeek should follow | N/A |
| Generic frontend model config controls | `autobyteus-web/components/workspace/config/*` | Extend | Existing renderer already handles flat enum/boolean fields | N/A |
| Thinking toggle provider semantics | `autobyteus-web/utils/llmThinkingConfigAdapter.ts` | Extend | Existing owner for toggle state/application | N/A |
| Excluding basic-toggle-owned fields from Advanced | `ModelConfigSection.vue` + `llmThinkingConfigAdapter.ts` | Extend | This is presentation ownership, not provider request mapping; the adapter already knows provider thinking semantics | N/A |
| GraphQL model catalog transport | `autobyteus-server-ts/src/api/graphql/types/llm-provider.ts` | Reuse unchanged | It should pass through schema metadata, not reshape provider semantics | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| AutoByteus model registry (`autobyteus-ts`) | Built-in model schema source | DS-001 | Model catalog | Extend | Replace DeepSeek object schema with flat `thinking_type`. |
| DeepSeek provider adapter (`autobyteus-ts`) | Request-shape normalization | DS-002 | DeepSeek provider request | Extend | Mirrors OpenAI/GLM pattern of adapter-owned conversion. |
| Frontend model config UI (`autobyteus-web`) | Render flat schema, toggle config, and Advanced schema projection | DS-001 | User-facing Agent Definition form | Extend | Add DeepSeek provider branch, hide DeepSeek `thinking_type` from Advanced, and revise tests. |
| Server model catalog (`autobyteus-server-ts`) | Pass model metadata through GraphQL | DS-001 | Frontend consumers | Reuse unchanged | No server transform required. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/llm/supported-model-definitions.ts` | Model registry | Built-in model schema source | Change DeepSeek schema from `thinking` object to `thinking_type` enum | Existing schema definitions are centralized here | Existing `ParameterSchema` |
| `autobyteus-ts/src/llm/api/deepseek-llm.ts` | DeepSeek provider adapter | Provider request mapping | Normalize `thinking_type` into `extra_body.thinking.type`, remove raw user-facing keys | DeepSeek-specific provider behavior belongs here | Existing `LLMConfig` |
| `autobyteus-web/utils/llmThinkingConfigAdapter.ts` | Frontend model config | Thinking toggle semantic adapter | Add DeepSeek branch for detection/toggle/key filtering and expose basic-toggle-owned keys for Advanced projection | Existing provider toggle owner | Existing `UiModelConfigSchema` |
| `autobyteus-web/components/workspace/config/__tests__/ModelConfigSection.spec.ts` | Frontend tests | Component regression coverage | Assert DeepSeek renders no text `Thinking` field, no Advanced `Thinking Type`, and toggles correctly | Existing model-config component tests | Existing test harness |
| `autobyteus-ts/tests/.../deepseek-llm.test.ts` or unit equivalent | Runtime tests | Request-shape regression coverage | Assert final DeepSeek request payload | Existing DeepSeek adapter tests | Existing mock OpenAI client pattern |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| DeepSeek thinking type values (`enabled`, `disabled`) | Keep local constants in `deepseek-llm.ts` and schema definition unless duplication grows | DeepSeek provider adapter / model registry | Only two usage points; extracting now would add indirection | Yes | Yes | A generic provider-thinking kitchen-sink type |
| Thinking provider detection keys | Existing `llmThinkingConfigAdapter.ts` maps | Frontend model config | Existing map already owns provider keys | Yes | Yes | A transport request mapper |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| DeepSeek user config schema | Yes after change | Yes | Low | Use `thinking_type` for user enable/disable and remove raw `thinking`. |
| OpenAI reasoning schema | Yes | N/A | Low | Leave unchanged. |
| Frontend thinking provider detection | Yes after adding DeepSeek branch | Yes | Medium currently | Detect DeepSeek before OpenAI. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/llm/supported-model-definitions.ts` | AutoByteus model registry | Model schema source | Publish DeepSeek flat `thinking_type` enum and `reasoning_effort` enum | Existing registry owner | `ParameterSchema` |
| `autobyteus-ts/src/llm/api/deepseek-llm.ts` | DeepSeek provider adapter | Provider request conversion | Normalize config extra params before shared OpenAI-compatible request builder sees them | Adapter-specific behavior | `LLMConfig` |
| `autobyteus-web/utils/llmThinkingConfigAdapter.ts` | Frontend model config | Thinking toggle semantics | Add `deepseek` provider branch: detection, toggle state, toggle writes, thinking param keys, and basic-toggle-owned key metadata | Existing semantic adapter | `UiModelConfigSchema` |
| `autobyteus-web/components/workspace/config/ModelConfigSection.vue` | Frontend model config coordinator | Basic/Advanced control ownership | Compute `advancedSchema` by excluding basic-toggle-owned thinking keys such as DeepSeek `thinking_type`; show Advanced only when projected schema has fields | Existing coordinator between toggle and advanced renderer | N/A |
| `autobyteus-web/components/workspace/config/ModelConfigAdvanced.vue` | Frontend model config renderer | Generic advanced controls | Render the schema projection it receives; no provider-specific hide logic required | Existing generic renderer | N/A |
| `autobyteus-web/components/workspace/config/__tests__/ModelConfigSection.spec.ts` | Frontend tests | Component rendering regression | DeepSeek no free-text `Thinking`; OpenAI still correct | Existing tests | N/A |
| `autobyteus-ts/tests/integration/llm/api/deepseek-llm.test.ts` or `tests/unit/llm/api/deepseek-llm.test.ts` | Runtime tests | Provider request regression | DeepSeek `thinking_type` request mapping | Existing test style | N/A |
| `autobyteus-ts/tests/integration/llm/llm-factory-metadata-resolution.test.ts` | Runtime/model catalog tests | Schema publication regression | DeepSeek model schema has `thinking_type` and not `thinking` | Existing catalog tests | N/A |

## Ownership Boundaries

- Schema source boundary: `supported-model-definitions.ts` declares only user-facing fields for built-in models.
- Presentation boundary: `ModelConfigSection` owns the split between basic toggle fields and Advanced fields; `ModelConfigAdvanced` renders only the projected Advanced schema it receives. Neither presentation component may know the OpenAI SDK `extra_body` shape.
- Adapter boundary: `DeepSeekLLM` maps user-facing DeepSeek keys to provider payload keys. Upstream callers must pass `thinking_type`, not `extra_body.thinking`, as the normal UI/run-config path.
- Shared builder boundary: `OpenAICompatibleRequestBuilder` assembles already-normalized OpenAI-compatible requests and must remain provider-agnostic.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `DeepSeekLLM` | Mapping `thinking_type` -> `extra_body.thinking.type` | AutoByteus backend factory, team config builder, tests constructing DeepSeek config | UI/server directly sending raw `thinking` object as user config | Add/adjust DeepSeek user config schema or adapter normalizer |
| `OpenAIResponsesLLM` | Mapping OpenAI `reasoning_effort`/`reasoning_summary` -> Responses `reasoning` | OpenAI model creation path | DeepSeek changes modifying OpenAI reasoning behavior | Add separate DeepSeek branch, not shared OpenAI mutation |
| `llmThinkingConfigAdapter.ts` | Provider-specific toggle semantics | `ModelConfigSection` | `ModelConfigSection` hard-coding DeepSeek/OpenAI rules inline | Extend the adapter's provider branches |
| `ModelConfigSection` | Advanced schema projection from full model schema | `RuntimeModelConfigFields`, run config forms | `ModelConfigAdvanced` receiving toggle-owned keys such as DeepSeek `thinking_type` | Add/adjust adapter metadata for toggle-owned keys |

## Dependency Rules

Allowed:
- Model registry can depend on `ParameterSchema` to declare flat fields.
- Frontend model config UI can depend on normalized schema metadata and `llmThinkingConfigAdapter`.
- `DeepSeekLLM` can depend on `LLMConfig` and call the shared OpenAI-compatible base after normalizing config.
- Runtime tests can inspect final provider request payloads through mocked OpenAI client calls.

Forbidden:
- Frontend code must not construct `extra_body.thinking` for DeepSeek.
- Server GraphQL must not contain DeepSeek-specific schema rewrites for this fix.
- `OpenAICompatibleRequestBuilder` must not contain DeepSeek-specific `thinking_type` logic.
- OpenAI reasoning schema or `OpenAIResponsesLLM` must not be changed to accommodate DeepSeek.
- DeepSeek user-facing schema must not keep both `thinking` object and `thinking_type` enum.
- DeepSeek Advanced controls must not render `thinking_type` while the basic `Thinking` toggle controls the same key.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `LLMModel.toModelInfo()` | Model metadata | Publish model schema | Model instance | No DeepSeek-specific transform here. |
| `availableLlmProvidersWithModels(runtimeKind)` | Runtime model catalog | Transport model metadata | Runtime kind | Pass-through for config schema. |
| `applyThinkingToggle(schema, enabled, config)` | Frontend thinking config | Apply provider-specific toggle edits | Schema + bool + config | Add `deepseek` branch. |
| `getThinkingToggleOwnedParamKeys(schema)` (new or equivalent) | Frontend thinking config | Identify fields controlled by the basic toggle and excluded from Advanced | Schema | DeepSeek returns `thinking_type`; implementation may also use it for GLM/other explicit enable keys. |
| `new DeepSeekLLM(model, llmConfig)` | DeepSeek provider adapter | Normalize DeepSeek extra params | Model + LLMConfig | Convert `thinking_type`; do not leak to request. |
| `OpenAICompatibleRequestBuilder.build(input)` | Shared request builder | Build request from normalized params | Model/messages/config/kwargs | Remains provider-agnostic. |

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `applyThinkingToggle` | Yes | Yes | Medium currently | Add explicit DeepSeek branch before OpenAI. |
| `DeepSeekLLM` constructor/config normalization | Yes | Yes | Low after change | Normalize DeepSeek config locally. |
| `OpenAICompatibleRequestBuilder.build` | Yes | Yes | Low | Keep free of provider UI semantics. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| DeepSeek user config key | `thinking_type` | Yes | Low | Mirrors GLM shape and explicitly means enabled/disabled mode. |
| DeepSeek provider payload | `extra_body.thinking.type` | Yes | Low | Provider-defined; adapter-owned. |
| OpenAI reasoning keys | `reasoning_effort`, `reasoning_summary` | Yes | Low | Leave unchanged. |

## Applied Patterns (If Any)

- Adapter: `DeepSeekLLM` adapts flat user config to provider payload shape.
- Strategy-like branch: `llmThinkingConfigAdapter.ts` selects provider-specific toggle semantics based on schema shape.
- Registry: Existing supported model definitions remain the model metadata registry.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/llm/supported-model-definitions.ts` | File | Model registry | DeepSeek flat schema declaration | Existing built-in model schema source | Frontend rendering logic |
| `autobyteus-ts/src/llm/api/deepseek-llm.ts` | File | DeepSeek adapter | Normalize DeepSeek config and install renderer | Existing DeepSeek provider boundary | UI component logic |
| `autobyteus-web/utils/llmThinkingConfigAdapter.ts` | File | Frontend config semantic adapter | Provider-specific thinking toggle behavior | Existing toggle owner | Provider SDK request payload construction |
| `autobyteus-web/components/workspace/config/ModelConfigSection.vue` | File | Basic/Advanced model-config coordinator | Project Advanced schema by excluding basic-toggle-owned keys; hide duplicate DeepSeek `Thinking Type` | Existing coordinator between toggle and advanced renderer | Provider request translation |
| `autobyteus-web/components/workspace/config/ModelConfigAdvanced.vue` | File | Generic advanced renderer | Render supported flat schema controls from the projected schema | Existing generic UI owner | DeepSeek provider translation or provider-specific hiding |
| `autobyteus-web/components/workspace/config/__tests__/ModelConfigSection.spec.ts` | File | Frontend regression tests | Prove DeepSeek/OpenAI rendering behavior | Existing test location | Runtime request assertions |
| `autobyteus-ts/tests/integration/llm/api/deepseek-llm.test.ts` or unit sibling | File | DeepSeek request tests | Prove request payload mapping | Existing DeepSeek tests | Frontend rendering assertions |
| `autobyteus-ts/tests/integration/llm/llm-factory-metadata-resolution.test.ts` | File | Model catalog tests | Prove schema metadata shape | Existing catalog test | Provider request mocks |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `autobyteus-ts/src/llm` | Main-Line Domain-Control / Provider adapter | Yes | Low | Existing LLM domain and provider adapter area. |
| `autobyteus-web/components/workspace/config` | Frontend presentation | Yes | Low | Existing model config UI area. |
| `autobyteus-web/utils` | Off-Spine Concern | Yes | Medium | Utility owns semantic config mapping, not provider request payloads. Keep request mapping out. |
| `autobyteus-server-ts/src/api/graphql/types` | Transport | Yes | Low | Reused unchanged as pass-through transport. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| DeepSeek schema | `thinking_type: { enum: ['enabled', 'disabled'] }` | `thinking: { type: 'object', properties: { type: ... } }` as frontend-visible schema | Flat enum renders as dropdown/toggle; nested object becomes confusing text input. |
| DeepSeek request mapping | UI config `{ thinking_type: 'enabled', reasoning_effort: 'high' }` -> request `{ reasoning_effort: 'high', extra_body: { thinking: { type: 'enabled' } } }` | UI config directly requiring `{ thinking: { type: 'enabled' } }` | Provider payload shape belongs in adapter, not UI. |
| Provider detection | If schema has `thinking_type` and `reasoning_effort`, classify as `deepseek` before OpenAI | Treat any `reasoning_effort` schema as OpenAI | DeepSeek and OpenAI share one key but not the same toggle semantics. |
| DeepSeek UI projection | Full schema `{ thinking_type, reasoning_effort }` -> basic toggle owns `thinking_type`; Advanced renders `{ reasoning_effort }` | Advanced renders both `Reasoning Effort` and `Thinking Type` | Avoids two controls for one enable/disable mode. |
| OpenAI non-regression | OpenAI remains `{ reasoning_effort, reasoning_summary }` -> `OpenAIResponsesLLM` `params.reasoning` | Moving OpenAI/DeepSeek into one generic `thinking` object | OpenAI is already correct and must remain separate. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep DeepSeek `thinking` object in schema and hide it in frontend | Fast UI-only fix | Rejected | Remove `thinking` from user-facing schema and add `thinking_type`. |
| Support both `thinking` and `thinking_type` as user config | Preserve any accidental persisted raw objects | Rejected | Only `thinking_type` is user-facing; sanitizer/request cleanup removes raw `thinking`. |
| Add generic nested-object text/JSON editor | Could render object schemas | Rejected | Out of scope; DeepSeek needs a constrained mode control, not arbitrary JSON. |
| Change OpenAI schema to match DeepSeek | Unify thinking concepts | Rejected | OpenAI path is already correct and provider-specific. |
| Leave Advanced `Thinking Type` as a tolerated duplicate | Implementation was already close and tests encoded it | Rejected | Project the Advanced schema so `thinking_type` is controlled only by the basic toggle. |

## Derived Layering (If Useful)

- Presentation layer: `autobyteus-web/components/workspace/config/*` renders normalized schemas.
- Frontend semantic adapter: `llmThinkingConfigAdapter.ts` applies provider-specific toggle semantics.
- Transport layer: `autobyteus-server-ts` GraphQL passes model metadata and run config.
- Runtime/provider layer: `autobyteus-ts` model definitions and LLM adapters own schema source and provider request conversion.

Layering follows ownership; frontend presentation does not bypass `DeepSeekLLM` to construct provider payload internals.

## Migration / Refactor Sequence

1. Update `deepseekV4Schema` in `autobyteus-ts/src/llm/supported-model-definitions.ts`:
   - Remove `thinking` object parameter.
   - Add `thinking_type` enum with `enabled | disabled`, default `enabled`, description clear enough for UI tooltip.
   - Keep `reasoning_effort` enum `high | max`, default `high`.
2. Extend `autobyteus-web/utils/llmThinkingConfigAdapter.ts`:
   - Add `deepseek` to provider type and provider key map.
   - Detect DeepSeek by schema containing both `thinking_type` and `reasoning_effort` before OpenAI detection.
   - `getThinkingToggleState`: return false only when `thinking_type === 'disabled'`; treat absent config as enabled for DeepSeek default.
   - `applyThinkingToggle`: enabled sets `thinking_type: 'enabled'` and restores `reasoning_effort: 'high'` if missing and schema supports it; disabled sets `thinking_type: 'disabled'` and removes `reasoning_effort` to avoid contradictory config.
   - `getThinkingParamKeys`: include `thinking_type` and `reasoning_effort` for DeepSeek for default/sanitization behavior.
   - Add `getThinkingToggleOwnedParamKeys(schema)` or equivalent; for DeepSeek it returns `thinking_type` so Advanced does not render the duplicate `Thinking Type` dropdown.
3. Extend `autobyteus-ts/src/llm/api/deepseek-llm.ts`:
   - Add local normalization for `config.extraParams` before calling the base class or before requests are built.
   - Convert `thinking_type` into `extra_body.thinking.type`.
   - Delete `thinking_type` from extra params.
   - Delete/ignore raw top-level `thinking` from extra params so the old provider object does not leak to top-level request params.
   - If `thinking_type === 'disabled'`, remove `reasoning_effort` from the final request params.
   - Merge with an existing valid `extra_body` object by preserving unrelated keys and setting/overwriting `extra_body.thinking.type`.
4. Update `autobyteus-web/components/workspace/config/ModelConfigSection.vue`:
   - Derive `advancedSchema` from the full schema by removing keys returned by the adapter's basic-toggle-owned-key helper.
   - Pass `advancedSchema` to `ModelConfigAdvanced`.
   - For thinking-supported schemas, show the Advanced expander only when `advancedSchema` has at least one field; DeepSeek should show Advanced because `reasoning_effort` remains, while providers with only a toggle-owned mode key should not show an empty Advanced section.
   - Keep `ModelConfigAdvanced.vue` generic; do not add DeepSeek-specific rendering there.
5. Add/adjust tests:
   - Model catalog schema test: DeepSeek schema has `thinking_type`, not `thinking`.
   - DeepSeek request-shape test: enabled/high maps to top-level `reasoning_effort` and `extra_body.thinking.type`; disabled maps to `extra_body.thinking.type = 'disabled'` and no invalid `reasoning_effort: 'none'`.
   - Frontend component/browser tests: DeepSeek schema renders no text input labelled `Thinking`, no Advanced `Thinking Type` dropdown, and still renders Advanced `Reasoning Effort`; OpenAI still renders `Reasoning Effort` and `Reasoning Summary` dropdowns.
   - Frontend adapter test if practical: DeepSeek detection/toggle behavior is distinct from OpenAI.
6. Run scoped validation:
   - `pnpm --dir autobyteus-web test:nuxt -- components/workspace/config/__tests__/ModelConfigSection.spec.ts utils/__tests__/llmConfigSchema.spec.ts` or closest supported Vitest invocation.
   - `pnpm --dir autobyteus-ts exec vitest run tests/integration/llm/api/deepseek-llm.test.ts tests/integration/llm/llm-factory-metadata-resolution.test.ts` or closest supported test command.
   - Run any affected TypeScript build/check if lightweight enough.

## Key Tradeoffs

- Flat schema over nested object editor: chosen because users need a constrained mode control, and the generic UI does not need arbitrary provider JSON editing for this task.
- Adapter-owned provider mapping over server GraphQL transform: chosen because provider request shape is runtime behavior, not transport metadata behavior.
- DeepSeek-specific frontend branch over broader `reasoning_effort` inference: chosen because shared keys do not imply shared semantics.
- Advanced projection in `ModelConfigSection` over provider-specific conditions in `ModelConfigAdvanced`: chosen so the generic renderer stays generic and the coordinator owns the basic/advanced split.
- Clean-cut removal over compatibility: chosen because the raw `thinking` field is the bug and preserving it would keep boundary confusion alive.

## Risks

- Existing persisted raw `thinking` config may be dropped. This is acceptable because it was not valid user-facing configuration, but implementation should mention it in handoff if observed in tests.
- `thinking_type` naming overlaps GLM's existing key. Detection must order DeepSeek before GLM/OpenAI and use the combined `thinking_type + reasoning_effort` shape.
- If DeepSeek changes official request shape later, only `DeepSeekLLM` and schema definitions should need updates.
- If `ModelConfigAdvanced.vue` still has other object fields from other providers, this task does not solve them; it removes the in-scope DeepSeek object leak and the in-scope DeepSeek duplicate enable/disable control.
- If a future Kimi schema adds user-facing thinking controls, it must follow the same flat-schema/adapter-owned-mapping rule and must not expose raw provider `thinking` objects.

## Guidance For Implementation

- Preserve OpenAI behavior. Do not change `openaiReasoningSchema`, `OpenAIResponsesLLM.buildReasoningParam()`, or `OpenAIResponsesLLM.filterExtraParams()` except if tests reveal unrelated breakage.
- Keep DeepSeek normalization local and explicit; do not add DeepSeek rules to `OpenAICompatibleRequestBuilder`.
- Prefer small local helper functions in `deepseek-llm.ts` such as `normalizeDeepSeekExtraParams(extraParams)` and `mergeThinkingIntoExtraBody(extraBody, type)`.
- Add tests before/with implementation so the confusing text field cannot regress.
- Do not leave DeepSeek `thinking_type` visible in Advanced. The basic `Thinking` toggle is the single DeepSeek enable/disable control; Advanced should show `Reasoning Effort` only for DeepSeek thinking settings. Revise validation-stage `AgentRunConfigForm.spec.ts` so it asserts absence of `select#agent-run-thinking_type` rather than expecting it.
