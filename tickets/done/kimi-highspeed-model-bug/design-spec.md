# Design Spec

## Current-State Read

The reported Daily Assistant path is:

`Agent Configuration model selector -> GraphQL run creation/preparation -> AgentRunProvisioningService -> AutoByteusAgentRunBackendFactory -> LLMFactory -> KimiLLM -> OpenAICompatibleRequestBuilder -> Kimi/Moonshot API`.

Current ownership is close but incomplete:

- `autobyteus-ts/src/llm/supported-model-definitions.ts` owns built-in model rows and `LLMModel.defaultConfig`.
- `LLMFactory.createLLM()` owns model lookup and currently starts effective config composition by cloning `model.defaultConfig` and merging a supplied `LLMConfig`.
- `AutoByteusAgentRunBackendFactory` incorrectly converts the raw run `llmConfig` with `new LLMConfig({ extraParams: llmConfig })`, which treats user/runtime config as opaque provider extras and also creates an implicit default `temperature: 0.7`.
- `LLMConfig` is currently an effective/full config object, not a partial override object. It defaults `temperature` to `0.7`, so constructing one from a partial user config loses absence semantics.
- `KimiLLM` owns Kimi provider request invariants. It already normalizes K2.7 Code fixed sampling for exact model `kimi-k2.7-code`, but not for official sibling identifier `kimi-k2.7-code-highspeed`.

The bug is therefore caused by two related issues:

1. Missing Kimi K2.7 model-family invariant: high-speed K2.7 is cataloged but not included in K2.7 request policy.
2. Loose config override boundary: absent user temperature can become an implicit `0.7` override, and explicit standard config fields are passed as `extraParams` rather than first-class `LLMConfig` fields.

## Intended Change

Introduce a bounded but global refactor around effective LLM config composition for all LLM providers, with Kimi K2.7 model-family policy as the concrete failing provider invariant:

- Keep `LLMConfig` as an effective config object.
- Add a raw-config override applier that applies only explicitly present user/run fields to an existing effective `LLMConfig`, consistently for every provider.
- Make `LLMFactory` the runtime-effective config composition owner for model lookup paths across all LLM providers.
- Stop `AutoByteusAgentRunBackendFactory` from wrapping run config into `new LLMConfig({ extraParams })`; pass the raw config record to the factory composition boundary instead.
- Add a shared Kimi K2.7 Code policy owner for both identifiers, fixed sampling values, and helper predicates.
- Set Kimi K2.7 model-row defaults from that shared policy and keep `KimiLLM` enforcement using the same policy.


## Global LLM Config Rule

This ticket should treat Kimi HighSpeed as the concrete regression, not as the only beneficiary. The general rule for all LLM providers is:

```text
base framework defaults
-> model registry defaultConfig
-> explicit user/run llmConfig overrides only for configurable fields
-> provider/model invariant enforcement for fixed/non-configurable fields
-> request builder/provider SDK
```

Reasonable semantics:

- Framework/base defaults fill only truly unspecified values.
- Model `defaultConfig` wins over base defaults when the model declares a value.
- Explicit user/run overrides win over model defaults for configurable fields.
- Provider/model fixed fields are not ordinary defaults; they are constraints. The UI/runtime should block, validate, or normalize invalid user values before sending a provider request.

This means raw run config is always partial user intent. It must never fabricate standard fields that the user did not supply. Provider adapters can still enforce provider-specific invariants after the effective config is composed. Kimi K2.7 `temperature = 1` is a fixed invariant, not a normal user-overridable default.

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Bug Fix + bounded refactor
- Current design issue found (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Shared Structure Looseness + Missing Invariant
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): Yes
- Evidence: `LLMConfig` is used as both full effective config and partial user override; `AutoByteusAgentRunBackendFactory` stores raw config under `extraParams`; Kimi K2.7 policy is keyed to one exact model identifier despite the catalog exposing two official K2.7 identifiers.
- Design response: Add an explicit raw override composition boundary and a Kimi K2.7 model-family policy file; route runtime config through the boundary; route both K2.7 identifiers through the same Kimi policy.
- Refactor rationale: A one-line high-speed predicate fix would stop the immediate 400, but would preserve the flawed config boundary where model defaults can be overwritten by implicit generic values and standard config fields work through ordering accidents.
- Intentional deferrals and residual risk, if any: Provider constructors, especially `OpenAICompatibleLLM`, still defensively merge model defaults for direct construction. De-duplicating all constructor-level default merging is deferred because runtime paths can be made coherent at `LLMFactory`, and direct-constructor tests rely on current constructors. Residual risk is low if factory path coverage verifies runtime behavior.

## Terminology

- `Effective LLM config`: the fully composed config passed to provider runtime code.
- `Raw run config`: user/default-launch config record persisted on runs/definitions.
- `Config override`: only fields explicitly present in raw run config.
- `Kimi K2.7 Code family`: `kimi-k2.7-code` and `kimi-k2.7-code-highspeed`.

## Design Reading Order

1. Runtime config spine and Kimi request spine.
2. Config-composition and Kimi-policy ownership.
3. File responsibilities.
4. Migration/refactor sequence and tests.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: remove the current AutoByteus runtime behavior that wraps raw `llmConfig` as `extraParams` and relies on request-builder ordering for standard fields.
- No compatibility alias is added for Kimi models. Both K2.7 rows remain because they are official provider identifiers, not legacy duplicates.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | Daily Assistant send with `kimi-k2.7-code-highspeed` | Provider streaming request accepted | `LLMFactory` + `KimiLLM` | This is the user-visible failure path and proof case for the global config rule. |
| DS-002 | Primary End-to-End | Raw run/default-launch `llmConfig` | Effective `LLMConfig` passed to provider | `LLMFactory` config composition boundary | This decides whether model defaults are preserved or overwritten for every LLM provider. |
| DS-003 | Primary End-to-End | Built-in Kimi model catalog rows | Frontend model selector labels/options | Built-in model catalog | This answers whether Code and HighSpeed are duplicates or distinct official IDs. |
| DS-004 | Bounded Local | Provider request params input | OpenAI-compatible request params object | `OpenAICompatibleRequestBuilder` | It materializes final config/kwargs ordering but must remain provider-agnostic. |

## Primary Execution Spine(s)

- DS-001: `Frontend selected model -> GraphQL run config -> AgentRunProvisioningService -> AutoByteusAgentRunBackendFactory -> LLMFactory effective config composer -> KimiLLM K2.7 policy enforcement -> OpenAICompatibleRequestBuilder -> Kimi API`
- DS-002: `Raw run config record -> explicit override parser -> model default config clone -> effective LLMConfig -> provider LLM instance`
- DS-003: `supported-model-definitions -> buildSupportedModels/LLMFactory -> server model provider -> frontend grouped selector -> selected label`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | A user-selected high-speed Kimi model travels from run config into the native AutoByteus backend. The backend asks `LLMFactory` for an LLM. The factory composes model defaults with explicit user overrides. `KimiLLM` then enforces K2.7 fixed provider invariants before the generic request builder sends the request. | Model selection, run config, factory composition, provider adapter, request builder | `LLMFactory` for composition; `KimiLLM` for provider invariants | Model catalog metadata, raw config parsing, test probes |
| DS-002 | Raw persisted config is interpreted as partial user intent. Only present known keys update first-class config fields; unknown keys become extras. Missing keys do not override model defaults. | Raw run config, override applier, effective config | `LLMFactory` | Key normalization, type guards, unknown-key pass-through |
| DS-003 | Kimi model rows remain two official identifiers. The catalog owns their identifiers/default configs; the UI displays them through existing provider groups. | Model definitions, model info, provider group, selector option | Built-in model catalog | Human display-label clarity |
| DS-004 | The request builder applies the already-composed effective config and safe kwargs without provider-specific branching. Kimi policy must already have normalized what reaches it. | Config, kwargs, request params | `OpenAICompatibleRequestBuilder` | Internal kwargs filtering, tool fields |

## Spine Actors / Main-Line Nodes

- Frontend run/model configuration
- GraphQL run creation/preparation input
- `AgentRunProvisioningService`
- `AutoByteusAgentRunBackendFactory`
- `LLMFactory`
- `LLMConfig` effective config
- Kimi K2.7 model-family policy
- `KimiLLM`
- `OpenAICompatibleRequestBuilder`
- Kimi/Moonshot API

## Ownership Map

- Frontend run/model configuration owns user-editable run intent and should not fabricate hidden standard config fields for models without schema defaults.
- `AgentRunProvisioningService` owns persistence of raw run config, not LLM-specific interpretation.
- `AutoByteusAgentRunBackendFactory` owns native backend assembly and should pass raw config to the factory boundary, not compose LLM config itself.
- `LLMFactory` owns model lookup and effective config composition for runtime-created LLMs.
- `LLMConfig` owns effective config state after composition.
- New raw override applier owns explicit-field parsing and unknown-key pass-through.
- Built-in catalog owns model identifiers, provider classes, pricing, and model defaults.
- Kimi K2.7 policy owner owns shared K2.7 identifiers and fixed sampling constants.
- `KimiLLM` owns runtime enforcement of Kimi provider invariants.
- `OpenAICompatibleRequestBuilder` owns generic request assembly only.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `AutoByteusAgentRunBackendFactory.createBackend()` | `LLMFactory` for LLM config composition | Native runtime backend entrypoint | First-class/extra config parsing |
| GraphQL create/prepare run mutations | `AgentRunProvisioningService` | Transport entrypoint | Provider config semantics |
| `OpenAICompatibleRequestBuilder.build()` | Provider adapters and effective config composer | Generic request materialization | Kimi-specific model policy |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| `new LLMConfig({ extraParams: llmConfig })` in `AutoByteusAgentRunBackendFactory` | It converts raw config incorrectly and creates implicit defaults | `LLMFactory` + raw override applier | In This Change | Raw config should be passed as a raw record or undefined. |
| Exact-only K2.7 model check `this.model.value === 'kimi-k2.7-code'` | It misses official high-speed identifier | Shared Kimi K2.7 family predicate | In This Change | Replace with `isKimiK27CodeModel(this.model.value)`. |
| Accidental reliance on `extraParams.temperature` for standard temperature override | Standard fields need first-class parsing | Raw override applier | In This Change | Unknown keys still pass through as extras. |
| Any hidden alias/collapse of `kimi-k2.7-code-highspeed` into `kimi-k2.7-code` | Provider exposes distinct identifiers/routes | Catalog keeps distinct rows | N/A | Not a removal; avoid false cleanup. |

## Return Or Event Spine(s) (If Applicable)

No separate event-spine change is required. Existing streaming/error propagation remains unchanged; the fix prevents the provider 400 at request creation/stream start.

## Bounded Local / Internal Spines (If Applicable)

- Parent owner: `LLMFactory`
  - `model lookup -> clone model.defaultConfig -> apply explicit raw overrides -> instantiate provider LLM`
  - Matters because absence semantics live here.
- Parent owner: `KimiLLM`
  - `receive messages/kwargs -> detect K2.7 family -> enforce fixed sampling/thinking/tool-choice -> call OpenAI-compatible base`
  - Matters because provider invariants are model-family-specific.
- Parent owner: `OpenAICompatibleRequestBuilder`
  - `apply config -> apply config.extraParams -> apply safe kwargs -> apply tool fields`
  - Matters because Kimi invariants must already be normalized before this generic assembly.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Raw config key normalization | DS-002 | `LLMFactory` | Map snake/camel standard keys into first-class fields | Runtime config is persisted as plain records | Scattering conversion in backend/provider adapters |
| Unknown-key pass-through | DS-002 | `LLMFactory` / `LLMConfig` | Preserve provider-specific extras | Existing schemas use provider-specific fields | Dropping provider controls |
| Kimi K2.7 fixed sampling constants | DS-001 | `KimiLLM` and catalog | Single source for K2.7 family defaults/invariants | Prevent high-speed drift | Duplicated constants and missed variants |
| Catalog label clarity | DS-003 | Built-in catalog / frontend selector | Explain HighSpeed variant semantics | User confusion | Removing a real provider ID |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Effective config composition | `autobyteus-ts/src/llm/llm-factory.ts` | Extend | Factory already owns model lookup and default-config merge | N/A |
| Effective config data | `LLMConfig` | Reuse | Keep as full effective config object | N/A |
| Partial raw config parsing | `autobyteus-ts/src/llm/utils` | Create New file | No current owner preserves absence semantics | Existing `LLMConfig.fromDict()` constructs full defaults. |
| Kimi provider invariants | `KimiLLM` | Extend | Adapter already owns provider request policy | N/A |
| Kimi family constants shared by catalog/adapter | Kimi provider area | Create New file | Prevent duplicated constants across catalog and adapter | Catalog alone should not own runtime provider enforcement. |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts` LLM factory/config | Effective config composition and model instantiation | DS-001, DS-002 | `LLMFactory` | Extend | Primary refactor boundary. |
| Kimi provider adapter | Kimi K2.7 invariants and provider request normalization | DS-001 | `KimiLLM` | Extend | Include high-speed model family. |
| Built-in model catalog | Kimi rows and default configs | DS-003 | Catalog | Extend | Add K2.7 fixed defaults in defaultConfig. |
| Server AutoByteus backend | Runtime backend assembly | DS-001, DS-002 | `AutoByteusAgentRunBackendFactory` | Modify | Stop composing raw config locally. |
| Frontend model selection | Model display | DS-003 | Selector | Reuse / maybe extend | Only if label clarity requires code change. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/llm/utils/llm-config-overrides.ts` | LLM config | Raw override applier | Apply explicit raw config record to an effective `LLMConfig` | Separates partial-record semantics from full config class | Uses `LLMConfig` |
| `autobyteus-ts/src/llm/llm-factory.ts` | LLM factory | Factory | Accept raw config records and compose effective config | Existing lookup/composition owner | Uses override applier |
| `autobyteus-ts/src/llm/api/kimi-k2-7-code-policy.ts` | Kimi provider | Kimi family policy | K2.7 identifiers, fixed sampling constants, default-config helper, predicate | Avoids duplicated constants in catalog/adapter | Uses `LLMConfig` and pricing config input |
| `autobyteus-ts/src/llm/api/kimi-llm.ts` | Kimi provider | Adapter | Enforce K2.7 policy for both identifiers | Existing provider enforcement owner | Uses Kimi policy |
| `autobyteus-ts/src/llm/supported-model-definitions.ts` | Built-in catalog | Catalog | Kimi K2.7 rows use policy default config | Existing catalog owner | Uses Kimi policy helper |
| `autobyteus-server-ts/src/agent-execution/backends/autobyteus/autobyteus-agent-run-backend-factory.ts` | Server runtime | Backend factory | Pass raw `llmConfig` to `LLMFactory` | Existing native runtime assembly owner | Uses factory API |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Kimi K2.7 model IDs and fixed sampling values | `kimi-k2-7-code-policy.ts` | Kimi provider | Used by catalog defaults and adapter enforcement | Yes | Yes | Generic provider policy dumping ground |
| Raw config standard-key mapping | `llm-config-overrides.ts` | LLM config | Used by factory/runtime composition | Yes | Yes | Provider-specific schema interpreter |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| Kimi K2.7 policy constants | Yes | Yes | Low | Constants represent provider-fixed values only. |
| Raw config override mapper | Yes | Yes | Medium | Keep mapper limited to standard config fields and unknown extras. |
| `LLMConfig` | Mostly | No | Medium | Keep as effective config; do not use as partial override in runtime path. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/llm/utils/llm-config-overrides.ts` | LLM config | Raw override applier | Explicit raw config parsing, standard key mapping, unknown extra pass-through | One cohesive concern: partial raw config semantics | `LLMConfig` |
| `autobyteus-ts/src/llm/llm-factory.ts` | LLM factory | Runtime LLM creation | Compose effective config from model default plus `LLMConfig` or raw record | Existing model lookup and creation authority | Override applier |
| `autobyteus-ts/src/llm/api/kimi-k2-7-code-policy.ts` | Kimi provider | Kimi K2.7 family policy | Model family predicate, fixed sampling constants, default-config helper | Shared between catalog and adapter | `LLMConfig`, pricing config |
| `autobyteus-ts/src/llm/api/kimi-llm.ts` | Kimi provider | Adapter | Apply K2.6 and K2.7 provider request normalization | Existing provider boundary | K2.7 policy |
| `autobyteus-ts/src/llm/supported-model-definitions.ts` | Built-in catalog | Catalog | Use K2.7 policy default config for both K2.7 rows | Existing model-definition owner | K2.7 policy |
| `autobyteus-server-ts/src/agent-execution/backends/autobyteus/autobyteus-agent-run-backend-factory.ts` | Server runtime | Backend factory | Pass raw run config to factory; no local config wrapping | Prevents boundary bypass | `LLMFactory` |
| `autobyteus-ts/tests/unit/llm/api/kimi-llm.test.ts` | Tests | Kimi adapter coverage | High-speed fixed sampling and K2.6 non-regression | Existing Kimi unit owner | K2.7 policy behavior |
| `autobyteus-ts/tests/unit/llm/utils/llm-config-overrides.test.ts` or `llm-factory` unit test | Tests | Config composition coverage | Absence semantics, explicit standard fields, unknown extras | New behavior needs deterministic coverage | Override applier |

## Ownership Boundaries

- Runtime/server code may own run lifecycle and raw config persistence but must not interpret provider/model config directly.
- `LLMFactory` is the authoritative boundary for composing runtime-created provider LLM config.
- `LLMConfig` is an effective config object after composition, not a raw user override object.
- Kimi provider-specific invariants stay behind the Kimi provider boundary.
- The generic OpenAI-compatible request builder must not know Kimi model IDs or fixed values.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `LLMFactory.createLLM()` | Model default clone + raw override applier | AutoByteus backend, server runtime creation paths | Backend constructing `LLMConfig({ extraParams: raw })` | Add/extend factory API for raw config records |
| `KimiLLM` / Kimi K2.7 policy | Kimi fixed sampling and tool-choice enforcement | Runtime/provider invocation paths | Shared request builder checking Kimi IDs | Strengthen Kimi adapter/policy helper |
| Built-in model catalog | Model rows and default configs | Server/frontend model listing | UI inventing duplicate/alias semantics | Add display metadata if needed |

## Dependency Rules

- `autobyteus-server-ts` AutoByteus backend may depend on `LLMFactory`, not on `LLMConfig` internals for raw config conversion.
- `LLMFactory` may depend on `LLMConfig` and the raw override applier.
- Built-in catalog and `KimiLLM` may depend on Kimi K2.7 policy constants/helpers.
- `OpenAICompatibleRequestBuilder` must not import Kimi policy or provider constants.
- Frontend selector must consume model info; it must not infer provider-specific aliases independently.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `LLMFactory.createLLM(modelIdentifier, configInput?)` | Runtime LLM creation | Resolve model and compose effective config | Unique model identifier + either effective `LLMConfig` or raw config record | Preserve existing `LLMConfig` callers; add raw-record behavior. |
| `applyRawLlmConfigOverrides(baseConfig, rawConfig)` | Config overrides | Apply explicit raw fields only | Effective `LLMConfig` + plain record | Missing fields do not override. |
| `isKimiK27CodeModel(modelValue)` | Kimi model family | Identify K2.7 Code variants | Provider model value string | Includes high-speed. |
| `KimiLLM.normalizeKimiKwargs()` | Provider request policy | Normalize Kimi request params | Messages + kwargs | Uses Kimi family predicate. |

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `LLMFactory.createLLM` | Yes | Yes | Medium | Document/typing distinguishes `LLMConfig` effective input from raw record input. |
| Raw override applier | Yes | Yes | Low | Only maps known standard keys; unknowns extras. |
| Kimi family predicate | Yes | Yes | Low | Explicit set of provider model values. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Effective config composition | `LLMFactory` + `llm-config-overrides` | Yes | Low | Keep names concrete. |
| Kimi K2.7 family | `kimi-k2-7-code-policy` | Yes | Low | Avoid generic `model-helper`. |
| Raw run config | `rawConfig` / `configInput` | Yes | Medium | Use docs/types to distinguish raw vs effective. |

## Applied Patterns (If Any)

- Factory: `LLMFactory` remains the model creation/composition boundary.
- Adapter: `KimiLLM` adapts product model/config choices to Kimi API request constraints.
- Policy/strategy-like constants: Kimi K2.7 policy file centralizes family-specific fixed values without becoming a generic policy registry.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/llm/utils/llm-config-overrides.ts` | File | LLM config composition | Raw override parsing and application | Utility serving factory/config subsystem | Provider-specific Kimi rules |
| `autobyteus-ts/src/llm/api/kimi-k2-7-code-policy.ts` | File | Kimi provider | K2.7 family IDs/default fixed values | Kimi provider area, shared by catalog and adapter | Non-Kimi model policies |
| `autobyteus-ts/src/llm/llm-factory.ts` | File | Factory | Effective runtime config composition | Existing model creation owner | Provider-specific fixed sampling constants |
| `autobyteus-ts/src/llm/api/kimi-llm.ts` | File | Kimi adapter | Runtime Kimi request normalization | Existing provider adapter | Catalog display policy |
| `autobyteus-ts/src/llm/supported-model-definitions.ts` | File | Catalog | Kimi K2.7 default configs | Existing built-in catalog | Runtime request normalization logic |
| `autobyteus-server-ts/src/agent-execution/backends/autobyteus/autobyteus-agent-run-backend-factory.ts` | File | Native backend factory | Pass raw run config to LLM factory | Existing backend assembly | LLM config parsing rules |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `autobyteus-ts/src/llm/utils` | Off-Spine Concern | Yes | Low | Config utility supports factory. |
| `autobyteus-ts/src/llm/api` | Provider adapter | Yes | Medium | Kimi policy file is provider-specific, not generic API clutter. |
| `autobyteus-server-ts/src/agent-execution/backends/autobyteus` | Main-Line Domain-Control | Yes | Low | Backend assembly remains thin for LLM creation. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Missing user temperature | `model.defaultConfig.temperature = 1; rawConfig = { thinking_type: 'enabled' }; effective.temperature === 1` | `new LLMConfig({ extraParams: rawConfig }).temperature === 0.7` overriding model default | Captures the core absence-semantics fix. |
| Explicit standard user temperature for configurable model | `rawConfig = { temperature: 0.2 }; effective.temperature === 0.2` | `effective.extraParams.temperature = 0.2` while `effective.temperature === 0.7` | Standard fields should be first-class. |
| Kimi fixed invariant | `rawConfig = { temperature: 0.2 }; Kimi K2.7 outgoing temperature === 1` | Sending `temperature: 0.2` and letting provider 400 | Kimi K2.7 temperature is not configurable. |
| Catalog variants | Keep `kimi-k2.7-code` and `kimi-k2.7-code-highspeed` as two rows sharing K2.7 policy | Removing HighSpeed as duplicate or aliasing silently | Provider exposes two routes. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep backend `new LLMConfig({ extraParams: llmConfig })` and only add high-speed Kimi branch | Minimal immediate bug fix | Rejected | Replace raw config conversion with explicit override applier. |
| Alias `kimi-k2.7-code-highspeed` to `kimi-k2.7-code` | Treats them as same underlying model | Rejected | Keep distinct provider IDs, shared policy. |
| Put Kimi fixed temperature in `OpenAICompatibleRequestBuilder` | Easy to guarantee final request | Rejected | Keep provider policy in Kimi boundary. |
| Make all `LLMConfig` fields nullable immediately | Could encode absence inside one class | Rejected for this change | Keep `LLMConfig` effective; add raw override applier. |

## Derived Layering (If Useful)

- Transport/UI layer: GraphQL/frontend run config passes raw user intent.
- Runtime orchestration layer: server backend assembles run and delegates LLM creation.
- LLM factory/config layer: model lookup and effective config composition.
- Provider adapter layer: Kimi fixed provider invariants.
- Generic request layer: OpenAI-compatible request serialization.

## Migration / Refactor Sequence

1. Add Kimi K2.7 policy file with identifiers, fixed sampling constants, predicate, and default-config helper.
2. Update Kimi K2.7 catalog rows to use policy default config while preserving pricing metadata.
3. Update `KimiLLM` to use K2.7 family predicate and fixed constants for both identifiers.
4. Add raw config override applier for explicit standard fields and unknown extra pass-through.
5. Update `LLMFactory.createLLM` to accept/apply raw config records without constructing implicit-default `LLMConfig` overrides; keep existing `LLMConfig` callers supported.
6. Update `AutoByteusAgentRunBackendFactory` to pass raw `llmConfig` to the factory rather than wrapping in `extraParams`.
7. Add deterministic tests for config composition, Kimi high-speed fixed sampling, explicit non-fixed temperature, unknown extra pass-through, and K2.6 non-regression.
8. Run focused build/unit checks. API/E2E engineer later decides live Kimi provider validation scope.

## Key Tradeoffs

- Keeping `LLMConfig` as an effective config avoids a broad nullable-field refactor across providers, but requires a new raw override applier.
- Keeping Kimi provider invariants in the adapter means model defaults and enforcement are both needed: defaults express expected config; adapter enforcement prevents invalid explicit overrides from reaching Kimi.
- Keeping both K2.7 model IDs preserves provider routing/pricing clarity, but UI labels may still be raw identifiers unless implementation adds small display-name improvements.

## Risks

- Existing code may instantiate `LLMConfig` directly as a partial override outside the AutoByteus backend. Focused search found the reported runtime path, but implementation should run tests and inspect factory callers.
- Unknown provider-specific fields must not be dropped when raw config is parsed.
- OpenAI-compatible provider constructor double-merging defaults remains a mild design smell but should not block this fix; factory runtime composition coverage must prove behavior.

## Guidance For Implementation

- Do not implement the fix only as `if model === highspeed`; include the config-composition refactor.
- Keep raw config parsing small and explicit. Standard keys should support snake_case and existing camelCase names where current `LLMConfigInput` uses camelCase.
- Preserve `pricingConfig` from model defaults; do not let user/run raw config overwrite pricing unless an existing explicit feature requires it.
- Kimi K2.7 policy should be the only source of K2.7 fixed sampling constants and should make clear these values are fixed constraints, not merely defaults.
- Unit tests should capture final outgoing request params using the existing mocked OpenAI client pattern in `kimi-llm.test.ts`.
