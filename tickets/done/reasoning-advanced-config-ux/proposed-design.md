# Proposed Design

## Design Status

Post-validation refined design-ready for architecture re-review.

This revision incorporates the user's post-validation 2026-06-02 clarification that the target behavior is cross-provider and conditional: the top-level `Thinking` state should reflect effective defaults; primary/global `Advanced` opens by default only when effective `Thinking` is ON, and starts collapsed when effective `Thinking` is OFF or unavailable. Codex GPT-5.5 default `medium` reasoning therefore displays as `Thinking = ON` with `Advanced` open; OpenAI Responses/Claude/Gemini API OFF defaults display `Thinking = OFF` with `Advanced` initially collapsed.

## Design Inputs

- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/reasoning-advanced-config-ux/tickets/done/reasoning-advanced-config-ux/requirements.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/reasoning-advanced-config-ux/tickets/done/reasoning-advanced-config-ux/investigation-notes.md`
- User screenshots:
  - `/Users/normy/.autobyteus/server-data/memory/agent_teams/team_software-engineering-team_4023883c/solution_designer_85fb741cf29ca867/context_files/ctx_0b938a9bc9c2__image.png`
  - `/Users/normy/.autobyteus/server-data/memory/agent_teams/team_software-engineering-team_4023883c/solution_designer_85fb741cf29ca867/context_files/ctx_7445bd0557f8__image.png`
- Current code paths inspected:
  - `autobyteus-web/components/workspace/config/ModelConfigSection.vue`
  - `autobyteus-web/components/workspace/config/ModelConfigAdvanced.vue`
  - `autobyteus-web/components/workspace/config/ModelConfigBasic.vue`
  - `autobyteus-web/utils/llmConfigSchema.ts`
  - `autobyteus-web/utils/llmThinkingConfigAdapter.ts`
  - `autobyteus-server-ts/src/agent-execution/backends/codex/...`
  - `autobyteus-ts/src/llm/supported-model-definitions.ts`
  - `autobyteus-ts/src/llm/api/deepseek-llm.ts`

## Design Health Assessment (Mandatory)

| Field | Decision |
| --- | --- |
| Change posture | Behavior Change + Bug Fix |
| Design issue signal | Yes |
| Root-cause classification | Missing invariant plus local select-default implementation defect |
| Refactor posture | Refactor needed now, limited to shared frontend model-config utilities/components |
| Evidence | User screenshots/clarifications including post-validation clarification; provider-wide live GraphQL schema inventory; frontend state/rendering source; backend/provider source |

The current shared frontend owner exists, but it lacks three refined invariants:

1. Primary/global advanced disclosure must initialize from effective thinking state: ON opens; OFF or unavailable starts collapsed.
2. Displayed enum values must resolve explicit config first, then valid schema defaults.
3. Top-level thinking state must resolve explicit config first, then valid schema defaults, and must be separate from provider disable capability.

The right response is not backend mutation or model-name hardcoding; it is a shared frontend invariant cleanup in existing model-config owners.

## Terminology

- `Effective config value`: explicit `llmConfig[key]` if valid; otherwise valid schema default; otherwise unset.
- `Effective thinking state`: ON/OFF state derived from provider-specific effective config/default values.
- `Thinking support`: the selected schema has provider-recognized reasoning/thinking controls or defaults worth displaying.
- `Disable capability`: the selected schema advertises a valid OFF/no-thinking value that the frontend can emit safely.
- `Primary/global config`: non-compact individual-agent run config and team-global/default model config. This is where advanced disclosure should initialize from effective thinking state: ON opens, OFF/unavailable collapses.
- `Compact config`: member override cards or other dense embedded forms. These stay collapsed by default, including inherited ON state, unless the user explicitly expands or performs a member-local ON/model-selection action.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Remove the stale rule that unset `llmConfig` means `Thinking = OFF` for every provider.
- Remove the stale rule that schemas with `reasoning_effort` but no `none` should suppress any top-level thinking state. Under the refined requirement, such schemas should show the correct ON/OFF state; they may be non-disable-capable.
- Remove the now-superseded rule that primary/global `Advanced` opens for every schema with advanced parameters. Effective thinking OFF/unavailable must start collapsed.
- Remove the incorrect `__default__` selected value for schema-defaulted enum fields. Keep `__default__` only where no schema default exists and the template actually renders a `Default` option.
- Do not keep a Codex/GPT-5.5 compatibility branch or hardcoded model-name exception.
- Do not invent unsupported OFF payloads to preserve a binary switch interaction.

## Data-Flow Spine Inventory

| Spine ID | Scope | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | Backend/provider model metadata | Visible launch model config controls | Frontend model-config surface, with backend schema as source of truth | Shows how provider defaults become visible `Thinking`, effort fields, and conditional disclosure state. |
| DS-002 | Primary End-to-End | User changes reasoning/thinking config | Runtime/backend launch payload | Parent launch config + provider runtime adapter | Ensures explicit user overrides are sent only when schema-supported. |
| DS-003 | Bounded Local | Schema/config props change inside `ModelConfigSection` | Advanced disclosure state and thinking row state | `ModelConfigSection` | Prevents false OFF states and applies the post-validation ON-open/OFF-collapsed disclosure invariant. |
| DS-004 | Bounded Local | Enum select render/change in `ModelConfigAdvanced` | Displayed selected value or explicit update emission | `ModelConfigAdvanced` + `llmConfigSchema` | Prevents blank `Reasoning Effort` while preserving unset/default semantics. |

## Primary Execution Spine(s)

- DS-001: `Provider/backend model schema -> GraphQL availableLlmProvidersWithModels -> RuntimeModelConfigFields selected schema -> ModelConfigSection visibility/thinking policy -> ModelConfigAdvanced effective field display -> visible launch UI`
- DS-002: `User changes supported toggle or effort -> ModelConfigSection/Advanced emit update:config -> RuntimeModelConfigFields updateModelConfig -> Agent/Team run config state -> backend/runtime adapter uses explicit config`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | Backend/provider metadata advertises schema defaults. The frontend resolves those defaults as effective values and initializes advanced disclosure from the effective thinking state. | Model schema, selected model config section, advanced control renderer | Frontend model-config surface for display; backend/provider catalog for metadata | Schema normalization, provider thinking-state interpretation, i18n labels |
| DS-002 | A user changes a supported effort/toggle. The explicit value is emitted through existing form state and later used by provider runtime code. Unsupported OFF values are not emitted. | User control, `llmConfig`, launch form state, runtime adapter | Parent launch config and provider runtime adapter | Config sanitization, inheritance, provider-specific payload mapping |
| DS-003 | `ModelConfigSection` reacts to schema/config changes by computing the correct `Thinking` row state and applying conditional disclosure: ON opens, OFF/unavailable collapses initially. | Schema, effective thinking state, disable capability, disclosure state | `ModelConfigSection` | Compact guard, read-only historical missing-config guard |
| DS-004 | `ModelConfigAdvanced` resolves each enum select value from explicit config or schema default. If neither exists, it uses the existing `Default` sentinel behavior. | Param schema, explicit config, default resolver, select update | `ModelConfigAdvanced` with `llmConfigSchema` | Validation against enum/type, stale config sanitization |

## Ownership Map

| Node / File | Owns |
| --- | --- |
| Backend/provider model catalog | Declaring available config keys, enum values, and defaults. |
| GraphQL provider/model query | Transporting runtime-scoped provider/model rows and raw config schema to the frontend. |
| `RuntimeModelConfigFields.vue` | Runtime/model selector composition and selected schema lookup. |
| `ModelConfigSection.vue` | Model-config visibility policy, top-level thinking row rendering, advanced disclosure state, schema filtering, missing-historical display guard. |
| `ModelConfigAdvanced.vue` | Per-parameter field rendering and explicit config update emission. |
| `ModelConfigBasic.vue` | Visual switch/status row for top-level boolean-style settings. |
| `llmConfigSchema.ts` | Schema normalization, config validation, valid schema default and effective value resolution. |
| `llmThinkingConfigAdapter.ts` | Provider/schema-specific thinking support, effective thinking state, disable capability, toggle-owned keys, and supported toggle mutation. |
| Parent agent/team forms | Authoritative editable `llmConfig` state for launch; child components emit updates. |
| Backend Codex/DeepSeek runtime adapters | Applying explicit config to runtime/provider payloads. |

## Thin Entry Facades / Public Wrappers

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `AgentRunConfigForm.vue` | `RuntimeModelConfigFields` / `ModelConfigSection` | Individual-agent form composition | Provider reasoning defaults or advanced visibility policy |
| `TeamRunConfigForm.vue` | `RuntimeModelConfigFields` / `ModelConfigSection` | Team-global form composition | Provider reasoning defaults or advanced visibility policy |
| `RuntimeModelConfigFields.vue` | `useRuntimeScopedModelSelection` and `ModelConfigSection` | Runtime/model selector wrapper | Thinking-state interpretation or select default semantics |

## Target Behavior Rules

### Rule 1: Advanced disclosure initialization policy

`ModelConfigSection` should render an `Advanced` disclosure whenever `hasAdvancedSchema` is true, including non-thinking schemas. The initial/open state is conditional, not always open.

Target initial rule:

```ts
shouldDefaultAdvancedOpen =
  props.advancedInitiallyExpanded === true ||
  (
    hasAdvancedSchema &&
    props.compact !== true &&
    !showMissingHistoricalConfig &&
    thinkingControlState.supported &&
    thinkingControlState.enabled
  )
```

Implications:

- Primary/global Codex, DeepSeek, Gemini RPA, GLM, or any schema-backed effective `Thinking = ON` model opens `Advanced` by default.
- Primary/global OpenAI Responses, Claude, Gemini API, no-thinking, and thinking-unsupported schemas start with `Advanced` collapsed.
- `advancedInitiallyExpanded=true` remains an explicit caller/read-only override.
- Missing historical config guard still prevents inferred recorded values.
- Schema/runtime/model changes should reset disclosure to this target default for the newly selected schema/effective state.
- User toggling a supported `Thinking` control from OFF to ON should set `showAdvancedParams=true`.
- User toggling from ON to OFF should not be required to auto-collapse; preserving visibility avoids hiding controls mid-edit.

Compact/member override sections use a stricter default: they stay collapsed by default even when inheriting global `Thinking = ON`. Member disclosure should open only on explicit member-local actions such as toggling member `Thinking` ON or selecting a member model whose effective thinking state is ON.

### Rule 2: Effective enum value display

For every `ModelConfigAdvanced` enum/select field:

```ts
selectedValue = validExplicitConfigValue ?? validSchemaDefault ?? DEFAULT_OPTION
```

Only render/select `DEFAULT_OPTION` when no valid schema default exists. If `reasoning_effort.default = "medium"`, unset config displays `medium`. If `service_tier` has no default, unset config continues to display the existing `Default` option.

This display rule must not emit defaults merely because they are shown. Explicit updates remain user-driven or controlled by existing `applyDefaults` semantics.

### Rule 3: Effective thinking state

`llmThinkingConfigAdapter.ts` should expose a provider-neutral API that separates state from interactivity:

```ts
type ThinkingControlState = {
  supported: boolean;
  enabled: boolean;
  canEnable: boolean;
  canDisable: boolean;
  toggleOwnedKeys: string[];
  readOnlyReason?: string;
};
```

Equivalent smaller functions are acceptable if responsibilities stay separate:

- `hasThinkingSupport(schema)`
- `getEffectiveThinkingState(schema, config)`
- `canEnableThinking(schema)` / `canDisableThinking(schema)` or `getThinkingToggleCapability(schema)`
- `applyThinkingToggle(schema, enabled, config)`
- `getThinkingToggleOwnedParamKeys(schema)`

State resolution must use explicit config first and schema defaults second.

Provider interpretations:

| Provider/schema shape | ON when effective value is | OFF when effective value is | Disable-capable when | Notes |
| --- | --- | --- | --- | --- |
| OpenAI/Codex `reasoning_effort` without `thinking_enabled` | Any advertised effort other than `none`, e.g. Codex `medium` | `none`, or no positive default/config | Schema advertises `reasoning_effort` enum value `none` or another documented OFF key/value | AutoByteus OpenAI Responses defaults `none` => OFF; Codex App Server defaults `medium`/`high` => ON. |
| OpenAI/Codex `reasoning_summary` without `thinking_enabled` | Value other than `none` when it is the active thinking signal | `none` or absent with no positive effort | Schema advertises `none` and the adapter owns the key | Summary alone must not override a gating key if one exists. |
| Claude-style `thinking_enabled` with budget/display/effort | `thinking_enabled=true` | `thinking_enabled=false` | Schema has boolean `thinking_enabled` | `thinking_enabled` is the gate. If `reasoning_effort=medium` coexists with `thinking_enabled=false` (Claude Agent SDK), Thinking is OFF and effort remains only an advanced depth default. |
| DeepSeek `thinking_type` + `reasoning_effort` | `thinking_type=enabled` by explicit/default value | `thinking_type=disabled` | Schema has both `enabled` and `disabled` | `reasoning_effort` remains advanced; OFF removes stale effort. |
| GLM `thinking_type` | `enabled` | `disabled` | Schema has both `enabled` and `disabled` | Default `enabled` => ON. |
| Gemini `include_thoughts` + `thinking_level` | `include_thoughts=true` or non-minimal `thinking_level` | `include_thoughts=false` and/or `thinking_level=minimal` | Schema exposes the corresponding OFF representation | API Gemini default `minimal/false` => OFF. |
| Gemini `thinking_level` only | non-minimal level such as `medium` | `minimal` | Enum includes `minimal` | Browser/RPA Gemini schemas default `medium` => ON and can disable to `minimal`. |
| No recognized schema/default metadata | Not inferred | Not inferred | Not disable-capable | Do not infer from model/display name. Provider/catalog must expose metadata if UI should show a thinking state. |

Provider-shape precedence is part of the invariant. In particular, `thinking_enabled` must be checked before generic `reasoning_effort`; otherwise Claude Agent SDK dynamic schemas would be misclassified as OpenAI-style and incorrectly show ON from `reasoning_effort=medium` despite `thinking_enabled=false`.

Important examples:

- Codex GPT-5.5 live schema: `reasoning_effort.default=medium`, enum lacks `none`. Target display: `Thinking = ON`, `Reasoning Effort = medium`, top-level OFF interaction is non-disable-capable/read-only unless backend later advertises an OFF value.
- AutoByteus OpenAI Responses GPT-5.5 schema: `reasoning_effort.default=none`, `reasoning_summary.default=none`. Target display: `Thinking = OFF` with primary/global `Advanced` collapsed initially.
- DeepSeek V4 Flash live schema: `thinking_type.default=enabled`, `reasoning_effort.default=high`. Target display: `Thinking = ON`, `Reasoning Effort = high`, user can turn OFF by emitting `thinking_type=disabled` and removing stale `reasoning_effort`.
- Claude Agent SDK dynamic live schema: `thinking_enabled.default=false`, `reasoning_effort.default=medium`. Target display: `Thinking = OFF`; primary/global `Advanced` collapsed initially; `Reasoning Effort = medium` is visible as an advanced depth default when expanded, not a reason to show thinking ON.
- Gemini API live schema: `thinking_level.default=minimal`, `include_thoughts.default=false`. Target display: `Thinking = OFF` and primary/global `Advanced` collapsed initially.
- Gemini browser/RPA live schema: `thinking_level.default=medium` and enum includes `minimal`. Target display: `Thinking = ON`; disabling can set `thinking_level=minimal`.
- GLM live schema: `thinking_type.default=enabled`. Target display: `Thinking = ON`; disabling can set `thinking_type=disabled`.
- Reasoning-named models with no metadata, e.g. built-in Grok/Kimi or LM Studio `*-thinking` rows: no guessed `Thinking = ON` from name and no name-only default-open; catalog metadata is required.
- No-reasoning/default-minimal schema: `Thinking = OFF` and primary/global `Advanced` collapsed initially if advanced schema parameters exist.

### Rule 4: No unsupported OFF payloads

`applyThinkingToggle(schema, false, config)` must not invent unsupported values. If `canDisableThinking(schema)` is false, it should either return the existing config unchanged or be unreachable because `ModelConfigSection` renders the control read-only/non-interactive. It must not emit `reasoning_effort="none"` unless `none` is in the schema enum or otherwise explicitly supported.

### Rule 5: Toggle-owned advanced filtering

`getThinkingToggleOwnedParamKeys(schema)` should identify only keys fully owned by the top-level toggle:

- DeepSeek: `thinking_type` is toggle-owned; `reasoning_effort` remains advanced.
- GLM: `thinking_type` may be toggle-owned when it is the only enable/disable key.
- Claude: `thinking_enabled` is toggle-owned; `thinking_budget_tokens`, `thinking_display`, and any `reasoning_effort` depth field remain advanced.
- Gemini: if `include_thoughts` exists, it may be toggle-owned; `thinking_level` remains advanced unless it is the only available ON/OFF representation, in which case the toggle may own transitions to/from `minimal` while still keeping the level visible when useful.
- Codex effort-only: no toggle-owned keys; `reasoning_effort` remains advanced.

Filtering must not hide the only visible way to configure reasoning depth.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Risk If Misplaced |
| --- | --- | --- | --- | --- |
| Schema default validation | DS-001, DS-004 | `ModelConfigAdvanced` and `ModelConfigSection` | Ensure defaults match type/enum before display | Inconsistent defaults or invalid selected values |
| Effective thinking interpretation | DS-001, DS-003 | `ModelConfigSection` | Map provider schema shapes to ON/OFF state | False OFF state, hidden reasoning, model-name hardcoding |
| Disable capability detection | DS-002, DS-003 | `ModelConfigSection` | Determine if switch can change to OFF/ON safely | Unsupported backend payloads or misleading interaction |
| Compact/member guard | DS-003 | Team config UI | Avoid expanding every member override by default while syncing inherited effective values | Unusable large team forms |
| Config sanitization | DS-002, DS-004 | Parent config state | Remove stale unsupported explicit values | Runtime receives invalid config |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why |
| --- | --- | --- | --- |
| Schema default/effective value | `autobyteus-web/utils/llmConfigSchema.ts` | Extend | Already owns schema normalization and validation. |
| Thinking state/capability | `autobyteus-web/utils/llmThinkingConfigAdapter.ts` | Extend | Already owns provider-specific thinking mapping. |
| Advanced visibility | `ModelConfigSection.vue` | Extend | Existing owner of disclosure and top-level thinking row. |
| Select rendering | `ModelConfigAdvanced.vue` | Extend | Existing owner of per-parameter controls. |
| Switch/status visual | `ModelConfigBasic.vue` | Extend if needed | Existing top-level switch visual; may need separate disabled/read-only helper. |
| Backend/model catalog defaults | Runtime/provider model schema sources | Reuse/Extend contract | Backend/catalog rows with schemas already advertise defaults; rows without metadata must not be guessed by frontend. |

## File Responsibility Mapping

| File | Change Type | Concrete Responsibility |
| --- | --- | --- |
| `autobyteus-web/utils/llmConfigSchema.ts` | Modify | Keep/export valid default and effective value helpers. Validate defaults against type/enum/min/max/pattern before use. |
| `autobyteus-web/utils/llmThinkingConfigAdapter.ts` | Modify | Replace conflated toggle support with effective state + disable capability. Use schema defaults, not only explicit config. Enforce provider-shape precedence (`thinking_enabled` before generic `reasoning_effort`). Use schema defaults for provider toggle ON values instead of hardcoded `high`/`medium` where possible. |
| `autobyteus-web/components/workspace/config/ModelConfigAdvanced.vue` | Modify | Render effective schema defaults in select controls. Preserve `Default` sentinel only when no valid schema default exists. |
| `autobyteus-web/components/workspace/config/ModelConfigSection.vue` | Modify | Render an Advanced disclosure for any advanced schema; initialize it open only for primary/global effective Thinking ON; keep it collapsed for primary/global OFF/unavailable and compact members by default; render `Thinking` row when thinking is supported; make non-disable-capable ON state non-interactive/read-only; open advanced on supported OFF->ON toggle or explicit member-local ON model selection; filter only toggle-owned keys. |
| `autobyteus-web/components/workspace/config/ModelConfigBasic.vue` | Modify if needed | Add a way to render a disabled/read-only ON state with optional reason/helper without conflating full form disabled with provider non-disable-capability. |
| `autobyteus-web/components/workspace/config/__tests__/ModelConfigSection.spec.ts` | Modify | Update stale always-open tests; add Codex/DeepSeek/Gemini-RPA/GLM ON default-open, OpenAI Responses/Claude/Gemini-API/no-thinking OFF default-collapsed, compact guard, and supported OFF->ON toggle expansion cases. |
| `autobyteus-web/utils/__tests__/llmThinkingConfigAdapter.spec.ts` | Modify | Replace expectation that Codex effort-only has no thinking state with refined ON/non-disable-capable expectation. Add DeepSeek default tests. |
| `autobyteus-web/utils/__tests__/llmConfigSchema.spec.ts` | Modify | Cover effective default helper behavior. |
| `autobyteus-web/components/workspace/config/__tests__/AgentRunConfigForm.spec.ts` | Modify | Ensure individual-agent primary config receives conditional ON-open/OFF-collapsed disclosure and effective default behavior through the shared path. |
| `autobyteus-web/components/workspace/config/__tests__/TeamRunConfigForm.spec.ts` | Modify | Ensure team-global primary config receives conditional ON-open/OFF-collapsed disclosure and effective default behavior through the shared path. |
| `autobyteus-web/components/workspace/config/__tests__/MemberOverrideItem.spec.ts` | Modify if needed | Preserve compact/inheritance behavior and default display when expanded. |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Must Not Become |
| --- | --- | --- | --- | --- |
| Explicit config else valid schema default else unset | `llmConfigSchema.ts` | Frontend model-config schema utilities | Used by advanced select display and thinking-state interpretation | Provider-specific model switch |
| Effective thinking state and disable capability | `llmThinkingConfigAdapter.ts` | Frontend thinking adapter | Provider schema shapes differ but must be consistently interpreted | Generic UX blob or model-name hardcoding |
| Conditional advanced disclosure calculation | `ModelConfigSection.vue` | Model config section | One shared component controls agent/team/member parity for ON-open/OFF-collapsed behavior | Duplicated props logic in agent/team forms |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Parallel Representation Risk | Corrective Action |
| --- | --- | --- | --- |
| `UiModelConfigSchema.default` | Yes: backend/provider-advertised default | Low | Treat as effective display value only when valid. |
| `llmConfig` | Yes: explicit user/run config | Medium | Do not materialize defaults just to display them; emit only explicit user changes or existing `applyDefaults` flows. |
| Thinking adapter result | Needs tightening | Medium | Separate support, effective state, and disable capability. |

## Interface Boundary Mapping

| Interface / API / Query / Method | Subject Owned | Responsibility | Notes |
| --- | --- | --- | --- |
| `availableLlmProvidersWithModels(runtimeKind)` | Runtime-scoped model catalog | Return provider/model rows and config schemas | Backend schema/default source of truth. |
| `normalizeModelConfigSchema(schema)` | Frontend UI schema | Normalize raw backend schema into `UiModelConfigSchema` | Existing utility owner. |
| `resolveEffectiveConfigValue(param, explicitValue)` | One parameter effective value | Return valid explicit value or valid schema default | Keep provider-neutral. |
| `getThinkingControlState(schema, config)` or equivalent functions | Provider thinking display state | Return support, enabled state, and capability from explicit/default values | New/tightened adapter boundary. |
| `applyThinkingToggle(schema, enabled, config)` | Supported thinking mutation | Emit provider-correct config changes only when supported | Must not emit unsupported OFF values. |
| `ModelConfigSection @update:config` | Model config edits | Emit explicit config or null | Display-only defaults should not emit. |
| `ModelConfigAdvanced @update:config` | Advanced parameter edits | Emit explicit per-key changes/removals | `Default` sentinel removes explicit value only where valid. |

## Dependency Rules

Allowed:

- `ModelConfigAdvanced.vue -> llmConfigSchema.ts`
- `llmThinkingConfigAdapter.ts -> llmConfigSchema.ts` for valid default/effective value helpers
- `ModelConfigSection.vue -> llmConfigSchema.ts` and `llmThinkingConfigAdapter.ts`
- `RuntimeModelConfigFields.vue -> useRuntimeScopedModelSelection -> llmConfigSchema.ts`
- Agent/team forms -> `RuntimeModelConfigFields.vue`
- Backend provider adapters -> explicit `llmConfig` only; no frontend display defaults as required persisted config

Forbidden:

- No GPT-5.5-specific, DeepSeek-model-specific, `*-thinking`, `*-reasoning`, or provider/model-name checks in Vue components.
- No frontend direct dependency on Codex app-server internals beyond normalized schema received through GraphQL.
- No duplicating default resolution separately in agent and team forms.
- No storing member override config just because inherited/effective defaults were displayed.
- No unsupported `none`/OFF values when schema does not advertise them.
- No dual behavior where schema-defaulted enum fields can still select a hidden `__default__` option.

## Change Inventory

### Add

- Add or expose a thinking control-state/capability API in `llmThinkingConfigAdapter.ts` if the existing function set cannot cleanly represent support/state/can-disable separately.
- Add optional switch helper/read-only props in `ModelConfigBasic.vue` only if needed for clear non-disable-capable ON rendering.

### Modify

- Modify `ModelConfigSection.vue` advanced initialization and schema-change watch to default open only for primary/global sections whose effective thinking state is ON, and collapsed for OFF/unavailable states.
- Modify `ModelConfigSection.vue` to render `Thinking` based on `hasThinkingSupport`, not only disable-capable toggle support.
- Modify `ModelConfigSection.vue` to make non-disable-capable states read-only/non-interactive while still showing correct ON/OFF state and keeping disclosure driven by effective ON/OFF default.
- Modify `llmThinkingConfigAdapter.ts` to compute effective thinking state from explicit config and schema defaults, with `thinking_enabled` gating mixed Claude-style schemas before `reasoning_effort`.
- Modify `llmThinkingConfigAdapter.ts` to apply DeepSeek toggle using schema defaults and provider-correct removal of stale effort on OFF.
- Modify `ModelConfigAdvanced.vue` to display effective schema defaults.
- Modify tests listed in file responsibility mapping.

### Remove / Decommission

| Item To Remove / Decommission | Why | Replacement |
| --- | --- | --- |
| Treating unset config as OFF for all thinking schemas | Contradicts schema defaults and user clarification | Effective thinking state resolver |
| Hiding/suppressing Codex effort-only thinking state | Codex default medium should display ON | ON read-only/non-disable-capable state plus visible effort dropdown |
| Opening primary/global advanced for every advanced schema | Post-validation clarification says effective OFF/unavailable starts collapsed | Conditional disclosure from effective thinking state |
| Classifying any schema with `reasoning_effort` as OpenAI before checking `thinking_enabled` | Claude Agent SDK exposes `thinking_enabled=false` plus `reasoning_effort=medium`; effort is not the ON/OFF gate | Provider-shape precedence in thinking adapter |
| Inferring reasoning from model names | No reliable machine-readable default; custom/local names are uncontrolled | Schema/default metadata only; catalog follow-up if needed |
| Hidden `__default__` select value for schema-defaulted enum fields | Causes blank/no-match display | Effective enum display value resolver |
| Hardcoded DeepSeek `high` or provider defaults in toggle ON logic where schema default exists | Duplicates backend schema | Schema default helper |

## Migration / Refactor Sequence

1. Tighten `llmConfigSchema.ts` default/effective value helpers and tests.
2. Refactor `llmThinkingConfigAdapter.ts` to expose separate support, state, and capability semantics. Update adapter tests first for Codex and DeepSeek refined cases.
3. Update `ModelConfigAdvanced.vue` to use effective enum values and preserve no-default sentinel behavior.
4. Update `ModelConfigSection.vue`:
   - compute `shouldDefaultAdvancedOpen` from `advancedInitiallyExpanded`, `compact`, missing-historical state, and effective `thinkingControlState.enabled`,
   - use an `Advanced` disclosure for any advanced schema, including non-thinking schemas,
   - reset advanced state to the conditional default on schema/runtime/model changes,
   - render thinking row for thinking-supported schemas,
   - use capability to decide whether the row is interactive,
   - open advanced on supported OFF->ON toggle changes, and avoid required auto-collapse on ON->OFF.
5. Extend `ModelConfigBasic.vue` only if needed to represent read-only/non-disable-capable ON state clearly.
6. Update agent/team/member tests for shared-path behavior.
7. Run focused frontend tests, then backend Codex/DeepSeek tests if any backend-adjacent files changed.

## Concrete Expected Examples

### Codex GPT-5.5, unset config

Input schema excerpt:

```json
{
  "reasoning_effort": { "type": "string", "default": "medium", "enum": ["low", "medium", "high", "xhigh"] },
  "service_tier": { "type": "string", "enum": ["fast"] }
}
```

Expected UI in primary/global config:

- `Advanced` open by default.
- `Thinking` shows ON because effective `reasoning_effort` is `medium`.
- If no OFF value is advertised, the ON state is non-disable-capable/read-only; no unsupported OFF config is emitted.
- `Reasoning Effort` displays `medium`.
- `Fast mode` keeps existing `Default` behavior if no schema default exists.

### DeepSeek V4 Flash, unset config

Input schema excerpt:

```json
{
  "thinking_type": { "type": "string", "default": "enabled", "enum": ["enabled", "disabled"] },
  "reasoning_effort": { "type": "string", "default": "high", "enum": ["high", "max"] }
}
```

Expected UI in primary/global config:

- `Advanced` open by default.
- `Thinking` shows ON and is interactive because `disabled` is advertised.
- `Reasoning Effort` displays `high`.
- User toggles OFF: emit `thinking_type="disabled"` and remove stale `reasoning_effort`.
- User toggles ON: emit `thinking_type="enabled"`; if materializing effort is required, use schema default `high`, not a hardcoded value.

### No-reasoning/minimal default

Input schema with default `thinking_type=disabled`, `thinking_enabled=false`, `thinking_level=minimal`, or `reasoning_effort=none` should display `Thinking = OFF`. Advanced settings should be collapsed initially in primary/global config if there are advanced parameters, and become visible when the user opens `Advanced` or toggles Thinking ON where supported.

## Validation Plan

### Frontend focused tests

Run after implementation:

```bash
pnpm -C autobyteus-web exec nuxt prepare
pnpm -C autobyteus-web exec vitest run \
  utils/__tests__/llmConfigSchema.spec.ts \
  utils/__tests__/llmThinkingConfigAdapter.spec.ts \
  components/workspace/config/__tests__/ModelConfigSection.spec.ts \
  components/workspace/config/__tests__/AgentRunConfigForm.spec.ts \
  components/workspace/config/__tests__/TeamRunConfigForm.spec.ts \
  components/workspace/config/__tests__/MemberOverrideItem.spec.ts
```

Required assertions:

- Codex effort-only default `medium` => `Thinking = ON`, non-disable-capable, effort select `medium`, advanced open in non-compact.
- AutoByteus OpenAI Responses default `none/none` => `Thinking = OFF`, primary/global advanced collapsed initially.
- DeepSeek default `enabled/high` => `Thinking = ON`, disable-capable, effort select `high`, advanced open in non-compact.
- Claude Agent SDK mixed schema `thinking_enabled=false` + `reasoning_effort=medium` => `Thinking = OFF`, primary/global advanced collapsed initially, effort select `medium` when expanded.
- Gemini API `minimal/false` => `Thinking = OFF` and primary/global advanced collapsed initially; Gemini RPA `thinking_level=medium` only => `Thinking = ON` and advanced open.
- GLM `thinking_type=enabled` => `Thinking = ON`.
- Reasoning-named model without schema/default metadata => no guessed ON state and no name-only default-open.
- No-thinking defaults => `Thinking = OFF` and advanced collapsed initially.
- Toggle-supported OFF->ON emits provider-correct config and opens advanced.
- Non-thinking/no-default field still renders `Default` behavior.
- Member override display syncs inherited defaults/state while remaining collapsed by default and does not materialize inherited defaults.

### Backend checks

Backend changes are not expected. If implementation touches backend or DeepSeek/Codex provider code, run:

```bash
pnpm -C autobyteus-server-ts exec vitest run \
  tests/unit/agent-execution/backends/codex/codex-app-server-model-normalizer.test.ts \
  tests/unit/agent-execution/backends/codex/backend/codex-thread-bootstrapper.test.ts
```

Also run any existing DeepSeek adapter tests if present or added.

### Manual/browser checks

- Open an agent run config, choose Codex App Server + GPT-5.5, confirm advanced is open, `Thinking` is ON, `Reasoning Effort` is medium.
- Open a team global run config with the same model and confirm parity.
- Choose AutoByteus + DeepSeek V4 Flash, confirm advanced is open, `Thinking` is ON, `Reasoning Effort` is high, and OFF emits provider-correct config.
- Choose AutoByteus OpenAI Responses, Claude, or Gemini API OFF-default models and confirm primary/global `Advanced` starts collapsed, then opens when toggling Thinking ON where supported.

## Risks And Mitigations

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Codex schema has no OFF value but user expects a true OFF toggle | UI cannot safely disable reasoning | Show ON state accurately but non-disable-capable; document that backend/schema must add OFF to enable true toggle. |
| Collapsed advanced for OFF/no-thinking defaults may reduce discoverability | Users still need to notice Advanced for OFF-default models | Keep the Advanced affordance visible/clickable; automatically open only when the user toggles Thinking ON. |
| Defaults get materialized unintentionally | Member override/inheritance semantics break | Display effective defaults without emitting config; only user actions or existing `applyDefaults` may emit. |
| Provider-specific thinking logic grows messy | Future inconsistencies | Keep provider interpretation centralized in `llmThinkingConfigAdapter.ts` and schema-default validation in `llmConfigSchema.ts`. |
| Reasoning-named models expose no schema/default metadata | UI cannot generically show correct ON/OFF | Do not infer from names; require provider/catalog metadata follow-up for those models. |

## Open Questions

- Should the non-disable-capable Codex ON state be rendered as a disabled switch, a read-only status pill, or a switch with explanatory helper? The design permits any of these if it clearly shows ON and prevents unsupported OFF emission.
- If product later wants true Codex reasoning OFF, which backend/schema value should represent it? This is outside the current frontend-only correction until the provider advertises support.

## Final Design Decision

Implement a schema-driven, cross-provider frontend correction:

1. Advanced model settings default open in primary/global agent and team config only when effective `Thinking` is ON; effective OFF/unavailable starts collapsed.
2. `ModelConfigAdvanced` displays valid schema defaults as effective selected values.
3. `llmThinkingConfigAdapter` computes effective thinking state from explicit config or schema defaults.
4. `ModelConfigSection` displays `Thinking` ON/OFF from that effective state, separately gates whether the control can be toggled, and opens Advanced on supported OFF->ON toggles.
5. The UI never emits unsupported OFF values.

This addresses the screenshots, the Codex `medium` mismatch, the post-validation ON-open/OFF-collapsed disclosure clarification, and the cross-provider consistency requirement for all schema-backed model entries through one shared model-config path. It also explicitly prevents name-based guessing for schema-less reasoning-named models and routes those cases to provider/catalog metadata ownership if a visible thinking state is required.
