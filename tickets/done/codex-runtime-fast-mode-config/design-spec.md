# Design Spec

## Current-State Read

Autobyteus already has the right end-to-end configuration spine for this feature:

`RuntimeModelConfigFields.vue -> useRuntimeScopedModelSelection -> ModelConfigSection.vue -> ModelConfigAdvanced.vue -> llmConfig -> GraphQL JSON inputs -> AgentRunConfig/TeamRunConfig -> run metadata -> CodexThreadBootstrapper -> CodexThreadConfig -> CodexThreadManager/CodexThread -> Codex app-server`

The path is healthy for carrying per-runtime/per-model launch options. The current defect is that the Codex-specific owner drops the Fast-mode capability before it reaches the UI and never forwards a selected service tier to Codex app-server.

Current evidence:

- `autobyteus-server-ts/src/agent-execution/backends/codex/codex-app-server-model-normalizer.ts` emits `config_schema.reasoning_effort` from `supportedReasoningEfforts`, but ignores Codex `additionalSpeedTiers`.
- Local Codex app-server schema and live probe confirm Fast mode is represented as `serviceTier: "fast"` in app-server requests and `service_tier` in Codex config, not as `reasoning_effort`.
- `CodexThreadConfig` has `reasoningEffort` but no `serviceTier`.
- `CodexThreadBootstrapper` resolves only `llmConfig.reasoning_effort`.
- `CodexThreadManager` sends `thread/start` and `thread/resume` without `serviceTier`.
- `CodexThread.sendTurn()` sends `turn/start` with `effort` but without `serviceTier`.
- `ModelConfigAdvanced.vue` can already render enum controls, but `ModelConfigSection.vue` currently shows advanced config only when thinking support is detected. That is too narrow for non-thinking model/runtime parameters such as Fast mode.
- Existing `llmConfig` persistence and transport already cover default launch, single-agent runs, team/member overrides, GraphQL create inputs, metadata, and restore. No new top-level API field is required.

Constraints:

- Do not change OpenAI Codex CLI/app-server.
- Do not inject `/fast` as a prompt or slash command.
- Do not default users into Fast mode.
- Do not expose Fast mode for Codex models that do not advertise it.
- Preserve existing reasoning-effort behavior.
- Keep non-Codex runtimes unchanged.

## Intended Change

Expose Codex Fast mode as a schema-driven model/runtime configuration option only when the selected Codex model advertises the `fast` speed tier. Store the selected value in existing `llmConfig` as `service_tier: "fast"`, normalize it in the Codex backend, and forward it to Codex app-server as `serviceTier: "fast"` for thread start, thread resume, and turn start.

Yes: the user-facing design is that Fast mode appears in the model configuration after selecting a Codex model that supports it. If the selected Codex model does not advertise `additionalSpeedTiers` containing `fast`, the option is not shown and stale `service_tier` values are sanitized away.

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Feature / behavior parity improvement.
- Current design issue found (`Yes`/`No`/`Unclear`): No broad design issue; localized Codex integration gap plus one small UI generalization.
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Local Implementation Defect in Codex-specific model normalization and runtime request translation.
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): No broad refactor. A narrow local UI generalization is in scope.
- Evidence: existing `llmConfig` spine is coherent; Codex-specific model and runtime files already own the missing translations; app-server protocol exposes first-class service-tier fields; current UI component artificially hides non-thinking advanced schema parameters.
- Design response: extend Codex normalizer, Codex thread config/request payloads, and schema-driven UI rather than adding a parallel config path.
- Refactor rationale: backend owners and boundaries remain healthy; the UI change removes an accidental thinking-only assumption from the generic model-config component.
- Intentional deferrals and residual risk, if any: explicit `flex` support and active in-place toggling are deferred. Live model capabilities may change, so live validation must remain gated/tolerant.

## Terminology

- `Fast mode`: User-facing Codex speed mode matching Codex CLI `/fast`.
- `service_tier`: Autobyteus `llmConfig` key matching Codex config naming.
- `serviceTier`: Codex app-server request field.
- `additionalSpeedTiers`: Codex app-server model-list capability metadata.
- `reasoning_effort`: Existing reasoning-depth setting; separate from Fast mode.

## Design Reading Order

1. Capability flow: Codex `model/list` metadata to frontend config schema.
2. User selection flow: frontend config editor to persisted `llmConfig`.
3. Runtime flow: `llmConfig.service_tier` to Codex app-server `serviceTier`.
4. Tests and validation.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: no legacy API/database path is being replaced. The obsolete behavior is omission of Fast-mode metadata and omission of `serviceTier` request fields.
- Treat removal as first-class design work: remove/decommission the thinking-only advanced schema visibility assumption in `ModelConfigSection.vue`.
- Design must not depend on compatibility wrappers, dual-path behavior, slash-command injection, or a parallel top-level `fastMode` field.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | Codex app-server `model/list` row | Visible Fast mode option | Codex model catalog + model config UI | Governs capability-gated visibility. |
| DS-002 | Primary End-to-End | User selects Fast mode | Persisted/restored `llmConfig.service_tier` | Existing launch/run config spine | Ensures default launch, single run, team run, and restore carry the setting. |
| DS-003 | Primary End-to-End | Backend run config with `llmConfig.service_tier` | Codex app-server receives `serviceTier` | Codex runtime backend | Governs real runtime behavior. |
| DS-004 | Bounded Local | Model config schema/config changes | Sanitized emitted config | `ModelConfigSection.vue` | Drops stale `service_tier` when selected model no longer supports it. |

## Primary Execution Spine(s)

- DS-001: `Codex app-server model/list -> CodexModelCatalog -> mapCodexModelListRowToModelInfo -> model.config_schema -> RuntimeModelConfigFields -> ModelConfigSection/ModelConfigAdvanced -> Fast mode option`
- DS-002: `Fast mode select change -> ModelConfigAdvanced emit -> ModelConfigSection sanitize/default handling -> RuntimeModelConfigFields update:llmConfig -> launch/default/team stores -> GraphQL JSON inputs -> metadata/restore`
- DS-003: `AgentRunConfig.llmConfig -> CodexThreadBootstrapper -> CodexThreadConfig.serviceTier -> CodexThreadManager thread/start|thread/resume -> CodexThread turn/start -> Codex app-server serviceTier`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | Codex model metadata advertises fast-tier support. The Codex normalizer preserves that as a schema parameter, and the frontend schema UI renders it only for the selected capable model. | Codex model row, Codex normalizer, model config schema, config UI | Codex model catalog and model config UI | Additional speed-tier parsing, enum schema creation, label/description. |
| DS-002 | The user selection remains ordinary `llmConfig`, so existing launch/default/team/run-history transport remains authoritative. | ModelConfigAdvanced, ModelConfigSection, RuntimeModelConfigFields, stores, GraphQL, metadata | Existing launch/run config path | Schema sanitization and default/unset behavior. |
| DS-003 | Backend bootstrap normalizes `service_tier` once into Codex runtime config. Thread lifecycle and turn owners translate it to app-server `serviceTier`. | AgentRunConfig, CodexThreadBootstrapper, CodexThreadConfig, CodexThreadManager, CodexThread | Codex runtime backend | Service-tier validation and request payload construction. |
| DS-004 | When the active schema lacks `service_tier`, the schema sanitizer removes any stale value before submission. | ModelConfigSection, schema sanitizer | Model config UI | Non-thinking advanced params visibility. |

## Spine Actors / Main-Line Nodes

- Codex app-server model row
- Codex model catalog / normalizer
- Frontend model config schema lookup
- Model config UI components
- Existing launch/run config stores and GraphQL transport
- Codex run bootstrapper
- Codex thread config
- Codex app-server thread/turn request builders

## Ownership Map

- Codex app-server owns authoritative service-tier protocol and model capability metadata.
- `CodexModelCatalog` owns retrieval of Codex model rows.
- `codex-app-server-model-normalizer.ts` owns translation from raw Codex rows and Codex-specific `llmConfig` values into Autobyteus schema/runtime values.
- `ModelConfigSection.vue` owns schema-driven config lifecycle: visibility, expansion, sanitization, and default application.
- `ModelConfigAdvanced.vue` owns concrete primitive control rendering for schema parameters.
- Stores, GraphQL inputs, and metadata mappers own transport/persistence of `llmConfig` but must not interpret Codex service-tier semantics.
- `CodexThreadBootstrapper` owns conversion from run config to runtime thread config.
- `CodexThreadConfig` owns internal Codex runtime configuration.
- `CodexThreadManager` owns app-server thread start/resume payloads.
- `CodexThread` owns app-server turn payloads.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `RuntimeModelConfigFields.vue` | Model config UI + runtime-scoped model selection | Shared runtime/model config wrapper | Codex protocol semantics. |
| GraphQL `llmConfig` JSON fields | Agent/team run config domain and runtime bootstrap | API transport | Service-tier normalization. |
| `CodexModelCatalog.listModels()` | Codex row normalizer | Public model listing service | Per-field Codex row parsing details. |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| Thinking-only advanced schema visibility in `ModelConfigSection.vue` | Advanced runtime/model params are not always thinking params. | Generic advanced schema rendering in `ModelConfigSection.vue`; thinking toggle remains conditional. | In This Change | Required so future fast-only/non-thinking schema params are not hidden. |
| One-parameter-only expectation in Codex model catalog integration test | Codex schema may now contain `reasoning_effort` and `service_tier`. | Name-based parameter assertions. | In This Change | Preserve reasoning-effort checks. |
| Slash-command injection idea | App-server has first-class `serviceTier`. | `serviceTier` request fields. | In This Change | Do not send `/fast` as user input. |

## Return Or Event Spine(s) (If Applicable)

No new production return/event spine is required. Existing Codex app-server notifications and run-history projection remain unchanged. Tests may observe thread-start responses, but runtime behavior is driven by request payloads.

## Bounded Local / Internal Spines (If Applicable)

- Parent owner: `ModelConfigSection.vue`
  - Chain: `props.schema/modelConfig -> sanitizeModelConfigAgainstSchema -> emit update:config -> apply defaults if needed`
  - Why it matters: removes stale `service_tier` when switching models.

- Parent owner: Codex thread runtime
  - Chain: `CodexThreadConfig.serviceTier -> thread/start|thread/resume|turn/start payload -> app-server`
  - Why it matters: service tier must be forwarded consistently for all runtime entry points.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Service-tier normalization | DS-003 | Codex runtime backend | Whitelist `fast` and reject unknown values. | Prevents invalid app-server requests. | GraphQL/UI would start owning provider-specific runtime semantics. |
| Additional speed-tier extraction | DS-001 | Codex model normalizer | Read `additionalSpeedTiers` / `additional_speed_tiers`. | Enables capability-gated UI. | UI would depend on raw Codex row shape. |
| Schema sanitization | DS-002, DS-004 | Model config UI | Drop unknown/invalid config keys. | Handles model switches and restores. | Stores/GraphQL would need provider cleanup logic. |
| UI copy/labeling | DS-001 | Model config UI/schema | Make `service_tier` understandable as Fast mode. | Avoids protocol-only UX. | Backend would become presentation-specific beyond schema descriptions. |
| Gated live validation | All | Validation | Keep account/network-dependent Codex tests opt-in. | Avoids flaky default test runs. | Unit tests would depend on live Codex state. |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Model capability to config schema | Codex model catalog/normalizer | Extend | Already owns Codex model-row translation. | N/A |
| Config transport/persistence | Existing `llmConfig` path | Reuse | Already carries arbitrary model config. | N/A |
| Frontend primitive config rendering | `ModelConfigSection` + `ModelConfigAdvanced` | Extend | Already schema-driven and supports enums. | N/A |
| Runtime app-server request construction | Codex thread manager/thread | Extend | Already owns app-server payloads. | N/A |
| Service-tier normalization | Codex normalizer file | Extend | Same Codex-specific semantic layer as reasoning effort. | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Server Codex model/backend | Codex model metadata and `llmConfig` semantic normalization | DS-001, DS-003 | Codex catalog/runtime | Extend | Keep Codex protocol here. |
| Web model config UI | Schema-driven display, config emission, stale cleanup | DS-001, DS-002, DS-004 | Launch/runtime config UI | Extend | Make advanced params generic. |
| Existing launch/run transport | Carry `llmConfig` unchanged | DS-002 | Agent/team run domains | Reuse | No new top-level field. |
| Codex thread runtime | Thread and turn app-server payloads | DS-003 | Codex app-server runtime | Extend | Add `serviceTier`. |
| Tests/validation | Unit and gated integration coverage | All | Delivery confidence | Extend | Add focused tests. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `codex-app-server-model-normalizer.ts` | Server Codex backend | Codex model/config semantics | Add service-tier whitelist/resolver, speed-tier parsing, and schema parameter creation. | Existing owner already normalizes Codex reasoning/schema. | Local normalizer helpers. |
| `codex-thread-config.ts` | Codex thread runtime | Internal thread config | Add `serviceTier` to config type/builder. | Existing authoritative runtime config. | Service-tier resolver output. |
| `codex-thread-bootstrapper.ts` | Codex runtime bootstrap | Run-to-thread converter | Resolve `llmConfig.service_tier`. | Existing owner maps config into runtime. | Service-tier resolver. |
| `codex-thread-manager.ts` | Codex thread runtime | Thread lifecycle request owner | Add `serviceTier` to start/resume payloads. | Existing owner builds these payloads. | Thread config. |
| `codex-thread.ts` | Codex thread runtime | Turn request owner | Add `serviceTier` to turn-start payload. | Existing owner builds turn payloads. | Thread config. |
| `ModelConfigSection.vue` | Web model config UI | Config section owner | Render advanced schema params independent of thinking support. | Existing owner controls section lifecycle. | Advanced component/schema utility. |
| `llmConfigSchema.ts` | Web schema utility | Schema normalization/sanitization | Preserve/sanitize `service_tier`; optionally support display title/label. | Existing schema utility owner. | N/A |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Codex service-tier whitelist and resolver | Keep in `codex-app-server-model-normalizer.ts` unless it grows | Codex backend | Used by schema and runtime resolution. | Yes | Yes | Generic all-provider service tier abstraction. |
| UI model config schema shape | Existing `llmConfigSchema.ts` | Web model config UI | Central schema conversion/sanitization. | Yes | Yes | Provider-specific Codex UI mapper. |
| App-server service-tier request field | Existing thread config/request files | Codex thread runtime | Thread start/resume/turn share one normalized field. | Yes | Yes | Parallel top-level run config. |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `llmConfig.service_tier` | Yes | Yes | Low | Use only this persisted selected service-tier key. |
| `CodexThreadConfig.serviceTier` | Yes | Yes | Low | Use app-server naming for internal runtime request config. |
| `config_schema.parameters[]` with `service_tier` | Yes | Yes | Low | Add as separate param beside `reasoning_effort`; do not overload reasoning. |
| `UiModelConfigSchema` | Yes | Yes | Low/Medium | If adding title/label metadata, keep it display-only. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-execution/backends/codex/codex-app-server-model-normalizer.ts` | Server Codex backend | Codex model/config semantic mapper | Normalize reasoning effort and service tier; parse supported reasoning and additional speed tiers; build Codex config schema. | One Codex-specific semantic translation file. | Local constants/functions. |
| `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread-config.ts` | Codex thread runtime | Internal thread config | Carry normalized `serviceTier` alongside `reasoningEffort`. | Keeps runtime inputs in one authoritative type. | Resolver output. |
| `autobyteus-server-ts/src/agent-execution/backends/codex/backend/codex-thread-bootstrapper.ts` | Codex runtime bootstrap | Run-to-thread config converter | Map `llmConfig.service_tier` into thread config. | Existing conversion owner. | `resolveCodexSessionServiceTier`. |
| `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread-manager.ts` | Codex thread runtime | Thread lifecycle/request owner | Include `serviceTier` in `thread/start` and `thread/resume`. | Existing lifecycle payload owner. | `CodexThreadConfig.serviceTier`. |
| `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread.ts` | Codex thread runtime | Turn request owner | Include `serviceTier` in `turn/start`. | Existing turn payload owner. | `CodexThreadConfig.serviceTier`. |
| `autobyteus-web/components/workspace/config/ModelConfigSection.vue` | Web model config UI | Config section owner | Render thinking toggle when supported and render advanced schema params whenever schema has parameters. | Existing section lifecycle owner. | `ModelConfigAdvanced`, schema utility, thinking adapter. |
| `autobyteus-web/components/workspace/config/ModelConfigAdvanced.vue` | Web model config UI | Primitive renderer | Render `service_tier` enum; optionally use schema title/label for better text. | Existing primitive control owner. | `UiModelConfigSchema`. |
| `autobyteus-web/utils/llmConfigSchema.ts` | Web schema utility | Schema converter/sanitizer | Support/sanitize `service_tier`; optionally normalize title/label. | Existing schema owner. | N/A |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/codex-app-server-model-normalizer.test.ts` | Server tests | Codex normalizer validation | Add tests for speed-tier schema and service-tier resolver. | Durable focused unit location. | N/A |
| Existing Codex thread/bootstrap tests | Server tests | Runtime payload validation | Extend for serviceTier in config/start/resume/turn. | Existing owner tests. | N/A |
| Existing web config/schema tests | Web tests | UI/schema validation | Extend for non-thinking advanced params, `service_tier` sanitization, enum emission. | Existing component/util tests. | N/A |

## Ownership Boundaries

The Codex model normalizer is the authoritative boundary for turning raw Codex model metadata into Autobyteus config schema. Frontend code must not inspect raw `additionalSpeedTiers` or hard-code model identifiers.

The existing `llmConfig` path is the authoritative persistence/transport boundary. Stores, GraphQL types, and metadata mappers should carry `service_tier` without Codex-specific interpretation.

The Codex runtime backend is the authoritative application boundary for Fast mode. It alone translates `service_tier` into app-server `serviceTier`.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| Codex model catalog/normalizer | Raw model row parsing, speed-tier extraction, schema creation | Frontend model config consumers | UI reading raw `additionalSpeedTiers` or hard-coding models | Add normalized schema metadata. |
| Model config UI schema layer | Schema normalization, sanitization, generic control rendering | Launch/default/team/member forms | Forms adding a separate Codex-only control outside schema | Extend generic schema UI. |
| Existing `llmConfig` path | Store/GraphQL/metadata JSON transport | Run/default/team config flows | New top-level `fastMode`/`codexFastMode` fields | Use `llmConfig.service_tier`. |
| Codex thread runtime | Thread/turn app-server payload construction | Agent/team run backends | Stores/GraphQL constructing app-server payloads | Extend `CodexThreadConfig` and request owners. |

## Dependency Rules

Allowed:

- Codex catalog may call app-server `model/list` and use Codex normalizer.
- Frontend config UI may consume normalized model `config_schema`.
- Stores/GraphQL/metadata may carry `llmConfig` JSON unchanged.
- Codex bootstrapper may use Codex config resolvers.
- Codex thread manager/thread may read `CodexThreadConfig.serviceTier`.

Forbidden:

- Do not map Fast mode to `reasoning_effort`.
- Do not inject `/fast` as a message.
- Do not add a parallel top-level Fast-mode field.
- Do not hard-code Fast-mode model IDs.
- Do not expose Fast mode for non-Codex runtimes.
- Do not make GraphQL/stores own Codex service-tier semantics.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `mapCodexModelListRowToModelInfo(row)` | One Codex model row | Convert raw Codex metadata into `ModelInfo` + schema | Raw app-server row object | Add speed-tier parsing/schema param. |
| `normalizeCodexServiceTier(value)` | One service-tier value | Whitelist supported service-tier strings | `unknown` | Return `fast` for accepted value; return null for invalid. |
| `resolveCodexSessionServiceTier(llmConfig)` | One Codex session config | Convert persisted config into safe runtime value | `Record<string, unknown> | null | undefined` | Source key is `service_tier`. |
| `buildCodexThreadConfig(input)` | One Codex thread config | Build internal runtime config | Explicit object with `serviceTier` | No direct `llmConfig` parsing here. |
| `client.request("thread/start"|"thread/resume")` | Codex app-server thread lifecycle | Start/resume thread with selected service tier | App-server payload | Include `serviceTier`. |
| `client.request("turn/start")` | Codex app-server turn lifecycle | Start turn with selected service tier | App-server payload | Include `serviceTier` for selected runs. |

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `mapCodexModelListRowToModelInfo` | Yes | Yes | Low | Keep row-to-model only. |
| `resolveCodexSessionServiceTier` | Yes | Yes | Low | Keep service-tier-specific. |
| `llmConfig` JSON | Yes | Yes | Low/Medium | Avoid adding parallel top-level fields. |
| `CodexThreadConfig` | Yes | Yes | Low | Add explicit `serviceTier`. |
| `ModelConfigSection` | Yes after change | Yes | Low | Render generic advanced params independent of thinking. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| User-facing feature | Fast mode | Yes | Low | Use in label/help text. |
| Persisted key | `service_tier` | Yes for Codex config | Low | Keep snake_case to match Codex config. |
| App-server request field | `serviceTier` | Yes | Low | Use protocol naming. |
| Internal config field | `serviceTier` | Yes | Low | Match app-server payload. |
| Existing reasoning setting | `reasoning_effort` | Yes | Medium if conflated with Fast mode | Keep separate. |

## Applied Patterns (If Any)

- Adapter/normalizer: `codex-app-server-model-normalizer.ts` adapts Codex model/config protocol shapes to Autobyteus model schema and runtime config values.
- Schema-driven UI: `ModelConfigSection` and `ModelConfigAdvanced` render controls from normalized model schema rather than hard-coded runtime-specific forms.
- Factory/builder: `buildCodexThreadConfig` remains the construction boundary for internal Codex thread runtime config.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-execution/backends/codex/codex-app-server-model-normalizer.ts` | File | Codex model/config semantics | Service-tier normalization, speed-tier parsing, schema creation. | Same Codex semantic boundary as reasoning. | Generic provider config abstractions. |
| `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread-config.ts` | File | Codex internal runtime config | Add `serviceTier` to config type/builder. | Central thread config owner. | Raw `llmConfig` parsing. |
| `autobyteus-server-ts/src/agent-execution/backends/codex/backend/codex-thread-bootstrapper.ts` | File | Runtime bootstrap | Map run config to thread config. | Existing bootstrap owner. | App-server request payload construction. |
| `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread-manager.ts` | File | Thread lifecycle | Add `serviceTier` to start/resume payloads. | Existing lifecycle payload owner. | Model metadata parsing. |
| `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread.ts` | File | Turn lifecycle | Add `serviceTier` to turn-start payload. | Existing turn payload owner. | Schema generation. |
| `autobyteus-web/components/workspace/config/ModelConfigSection.vue` | File | Config section UI | Render generic advanced params; preserve thinking toggle. | Existing schema section owner. | Codex-specific capability detection. |
| `autobyteus-web/components/workspace/config/ModelConfigAdvanced.vue` | File | Primitive control UI | Existing enum control for `service_tier`; optional label support. | Existing primitive renderer. | Runtime-specific logic. |
| `autobyteus-web/utils/llmConfigSchema.ts` | File | Schema utility | Schema normalization/sanitization for service-tier enum. | Existing schema utility. | Runtime launch orchestration. |
| Existing test folders under `autobyteus-server-ts/tests/unit/.../codex` and `autobyteus-web/components/workspace/config/__tests__` | Folder | Validation | Focused regression tests. | Matches existing test placement. | Live-only assumptions in unit tests. |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `agent-execution/backends/codex` | Main-Line Domain-Control + adapter concerns | Yes | Low | Existing Codex backend folder owns app-server integration. |
| `agent-execution/backends/codex/thread` | Main-Line Domain-Control | Yes | Low | Thread config/lifecycle/turn request owners belong together. |
| `autobyteus-web/components/workspace/config` | UI component boundary | Yes | Low | Existing config UI components own schema-driven controls. |
| `autobyteus-web/utils` | Off-spine concern | Yes | Low | Existing schema utility placement. |
| Test folders | Validation | Yes | Low | Mirror source ownership. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Stored config | `{ service_tier: "fast", reasoning_effort: "high" }` | `{ fastMode: true, reasoning_effort: "low" }` | Fast mode is service tier and can coexist with reasoning. |
| Capability-gated schema | Add `service_tier` only when `additionalSpeedTiers` includes `fast`. | Show Fast mode for every Codex model or hard-code `gpt-5.5`. | Model capability must come from app-server metadata. |
| App-server payload | `{ serviceTier: config.serviceTier }` in thread/turn requests. | Send `/fast` as the first user message. | Uses first-class protocol instead of brittle interactive behavior. |
| UI rendering | Advanced schema params visible even with no thinking toggle. | Fallback “Thinking configuration not available” while hiding non-thinking params. | Fast mode is not thinking. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Slash-command injection (`/fast`) | Mirrors user-observed CLI command. | Rejected | Use app-server `serviceTier`. |
| Top-level `fastMode` run config field | Would be easy to add to forms. | Rejected | Use existing `llmConfig.service_tier`. |
| Map Fast mode to low reasoning effort | Superficial speed association. | Rejected | Keep `reasoning_effort` separate from `service_tier`. |
| Always expose Fast mode for Codex | Simpler UI. | Rejected | Gate by `additionalSpeedTiers`. |
| Expose `flex` in first pass | Protocol supports it. | Rejected for this feature | Implement `/fast` parity: `fast` vs default/off. |

## Derived Layering (If Useful)

- External protocol layer: Codex app-server `model/list`, `thread/start`, `thread/resume`, `turn/start`.
- Server adapter/control layer: Codex model normalizer, bootstrapper, thread config, thread manager, thread.
- Transport/persistence layer: existing GraphQL JSON `llmConfig`, run/default/team metadata.
- Web UI layer: runtime/model selection and schema-driven config components.

The layers do not bypass each other: UI consumes normalized schema; transport carries JSON; Codex runtime applies Codex semantics.

## Migration / Refactor Sequence

1. Add `CodexServiceTier` normalization helpers in `codex-app-server-model-normalizer.ts`.
2. Add `additionalSpeedTiers` parsing and append `service_tier` schema parameter for models containing `fast`.
3. Add/update normalizer unit tests.
4. Extend `CodexThreadConfig` with `serviceTier` and update all test fixture builders that construct it.
5. Resolve `llmConfig.service_tier` in `CodexThreadBootstrapper`.
6. Add `serviceTier` to `thread/start`, `thread/resume`, and `turn/start` payloads.
7. Add/update backend unit tests for bootstrap, thread manager, and thread turn payloads.
8. Generalize `ModelConfigSection.vue` so advanced schema params render without thinking support; preserve thinking toggle behavior.
9. Add/update web tests for generic advanced params, service-tier enum selection, and stale config sanitization.
10. Update live/gated Codex model catalog integration assertions so schemas may contain `service_tier` in addition to `reasoning_effort`.
11. Run focused tests, then broader package tests as feasible.

No temporary compatibility seam should remain after implementation.

## Key Tradeoffs

- Using `llmConfig.service_tier` avoids broad API/persistence changes and aligns with Codex config naming, but keeps service tier as a runtime-specific key inside generic JSON. This is acceptable because `llmConfig` already owns runtime/model-specific parameters.
- Showing only `fast` instead of `flex` keeps scope aligned with `/fast` parity and avoids confusing users with a second service-tier mode that was not requested.
- Generalizing `ModelConfigSection` slightly is safer than relying on current fast-capable models also having reasoning support.

## Risks

- Codex model metadata can change; unit tests must not assume current live model names.
- UI label quality may be limited if `UiModelConfigSchema` does not support title/label metadata. Implementation should add minimal display metadata support or ensure description/label is clear enough.
- Some existing test fixtures instantiate `CodexThreadConfig` directly and will need `serviceTier: null` added.
- Live app-server tests require local Codex login/account state and should remain opt-in.

## Guidance For Implementation

- Preferred schema parameter shape for Fast mode:

```ts
{
  name: "service_tier",
  type: "enum",
  description: "Enable Codex Fast mode for this model. Default leaves Codex service tier unchanged.",
  required: false,
  enum_values: ["fast"],
}
```

Do not set `default_value` for `service_tier`; the UI “Default” option should remove the key and represent Fast mode off/default.

- `normalizeCodexServiceTier(value)` should accept `fast` (case-insensitive after trimming) and return `null` for invalid values. If implementation wants to preserve protocol-complete support internally, it may accept `flex`, but the first-pass UI schema should expose only `fast` unless product explicitly requests `flex`.
- `resolveCodexSessionServiceTier(llmConfig)` should read `llmConfig?.service_tier` only.
- `CodexThreadConfig.serviceTier` should be `string | null` or a narrow type such as `"fast" | "flex" | null`.
- Include `serviceTier: config.serviceTier` in `thread/start` and `thread/resume` payloads, and `serviceTier: this.serviceTier` in `turn/start` payloads.
- Preserve current reasoning effort logic exactly.
- Keep non-Codex paths untouched except for generic UI schema rendering if necessary.
- Focused validation targets:
  - `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/codex-app-server-model-normalizer.test.ts`
  - `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/backend/codex-thread-bootstrapper.test.ts`
  - `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/thread/codex-thread-manager.test.ts`
  - `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/thread/codex-thread.test.ts`
  - `autobyteus-web/components/workspace/config/__tests__/ModelConfigSection.spec.ts`
  - `autobyteus-web/utils/__tests__/llmConfigSchema.spec.ts`
