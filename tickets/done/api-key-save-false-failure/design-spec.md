# Design Spec

## Current-State Read

The provider settings save path has one primary frontend spine:
`ProviderAPIKeyManager -> useProviderApiKeySectionRuntime -> useLLMProviderConfigStore -> GraphQL mutation -> post-save configured-state synchronization -> notification`

Current ownership is mostly correct until the post-save state-sync step. The store is the authoritative boundary for provider config mutations, but built-in provider save mutates hydrated `providersWithModels[row].provider` objects in place, and Gemini duplicates that unsafe mutation in the runtime layer after the store succeeds. Custom provider save does not have this problem because it reloads provider data instead of mutating hydrated rows directly.

The target design must preserve the current GraphQL contract, keep save orchestration inside the existing provider-config store/runtime subsystems, and remove the unsafe in-place mutation path.

## Intended Change

Move fixed-provider configured-state synchronization to immutable row replacement owned by `autobyteus-web/stores/llmProviderConfig.ts`, and remove the Gemini runtime’s redundant direct provider-row mutation. Add regression coverage that uses immutable/frozen provider rows.

## Terminology

- `Provider config store`: `useLLMProviderConfigStore`
- `Provider settings runtime`: `useProviderApiKeySectionRuntime`
- `Hydrated provider row`: one object from `providersWithModels`

## Design Reading Order

1. data-flow spine
2. subsystem / capability-area allocation
3. draft file responsibilities -> extract reusable owned structures -> finalize file responsibilities
4. folder/path mapping

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: remove in-scope direct nested mutation of hydrated provider rows after built-in/Gemini save.
- Treat removal as first-class design work: runtime/store should stop depending on mutating hydrated query objects in place.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | Settings save click | Save toast + configured state update | `useLLMProviderConfigStore` | Main bug path for built-in providers and Gemini |
| DS-002 | Bounded Local | Store success branch | Immutable provider-row replacement | `useLLMProviderConfigStore` | Prevents post-save false failures |

## Primary Execution Spine(s)

- `ProviderAPIKeyManager -> useProviderApiKeySectionRuntime -> useLLMProviderConfigStore -> GraphQL mutation -> immutable configured-state replacement -> notification`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | The UI delegates save work into the provider-config store. After a successful GraphQL mutation, the store immutably rewrites the relevant provider row/configured cache and returns success so the runtime shows the success toast. | manager, runtime, store, GraphQL backend | store | localization strings, provider-label lookup |
| DS-002 | The store replaces one provider row instead of mutating the hydrated row object. | store, provider row | store | helper for row replacement |

## Spine Actors / Main-Line Nodes

- `ProviderAPIKeyManager`
- `useProviderApiKeySectionRuntime`
- `useLLMProviderConfigStore`
- GraphQL provider mutations

## Ownership Map

- `ProviderAPIKeyManager`: thin UI entry surface only.
- `useProviderApiKeySectionRuntime`: save orchestration + notification display, but not provider-row persistence/state ownership.
- `useLLMProviderConfigStore`: authoritative owner for provider query/mutation state and configured-state synchronization.
- GraphQL backend: secret/config persistence boundary.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `ProviderAPIKeyManager` | `useProviderApiKeySectionRuntime` / `useLLMProviderConfigStore` | UI wiring | provider-row synchronization rules |
| `useProviderApiKeySectionRuntime` | `useLLMProviderConfigStore` for persisted provider state | toast orchestration | direct mutation of hydrated provider rows |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| Built-in provider in-place mutation in `setLLMProviderApiKey` | Unsafe post-save sync on hydrated query rows | immutable row-replacement helper in `llmProviderConfig.ts` | In This Change | direct nested assignment removed |
| Gemini runtime in-place provider-row mutation | duplicates store-owned state sync and can fail post-save | store-owned immutable sync + runtime local notification only | In This Change | runtime assignment removed |

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Immutable provider-row replacement helper | DS-001, DS-002 | store | rewrites one hydrated row safely | centralizes safe configured-state sync | repeated ad hoc mutation logic |
| Focused frozen-row tests | DS-001, DS-002 | store/runtime | regression protection | catches immutable-row failures | bug can silently return |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Provider configured-state synchronization | `autobyteus-web/stores/llmProviderConfig.ts` | Extend | already owns provider query/mutation state | n/a |
| Gemini save notification orchestration | `useProviderApiKeySectionRuntime.ts` | Reuse | already owns UI notifications | n/a |
| Regression coverage | existing store/runtime test files | Extend | tests already cover these save paths | n/a |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/stores` | provider mutation state + immutable configured-state sync | DS-001, DS-002 | store | Extend | authoritative boundary |
| `autobyteus-web/components/settings/providerApiKey` | UI save orchestration + notifications | DS-001 | runtime | Extend | remove duplicated state mutation |
| `autobyteus-web/tests` | frozen-row regressions | DS-001, DS-002 | runtime/store | Extend | focused coverage only |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/stores/llmProviderConfig.ts` | store | provider config store | safe configured-state synchronization after save | central mutation boundary | small helper |
| `autobyteus-web/components/settings/providerApiKey/useProviderApiKeySectionRuntime.ts` | settings runtime | runtime | UI notification flow without row mutation | runtime still owns UX only | no |
| `autobyteus-web/tests/stores/llmProviderConfigStore.test.ts` | tests | store tests | immutable built-in row regression | direct coverage of store owner | local helper |
| `autobyteus-web/components/settings/providerApiKey/__tests__/useProviderApiKeySectionRuntime.spec.ts` | tests | runtime tests | immutable Gemini row regression | covers removed runtime mutation | local helper |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| provider configured-state rewrite | local helper in `llmProviderConfig.ts` | store | one owner, one safe rewrite shape | Yes | Yes | generic mutation helper blob |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `replaceProviderConfiguredState` helper | Yes | Yes | Low | keep local to store |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/stores/llmProviderConfig.ts` | store | authoritative provider config boundary | immutable configured-state replacement for built-in/Gemini success paths | all provider mutation state already lives here | `replaceProviderConfiguredState`, `resolveGeminiProviderConfiguredState` |
| `autobyteus-web/components/settings/providerApiKey/useProviderApiKeySectionRuntime.ts` | settings runtime | UI runtime | notifications + local transient flags only | remove boundary bypass | no |
| `autobyteus-web/tests/stores/llmProviderConfigStore.test.ts` | tests | store regression | frozen built-in row coverage | validates owner behavior directly | local deep-freeze helper |
| `autobyteus-web/components/settings/providerApiKey/__tests__/useProviderApiKeySectionRuntime.spec.ts` | tests | runtime regression | frozen Gemini row coverage | validates runtime no longer bypasses store | local deep-freeze helper |

## Ownership Boundaries

The store is the authoritative public boundary for provider mutation state. Callers above it must not both call the store and also mutate the store’s hydrated internals. The runtime boundary must request save behavior and then react to success/failure, not alter hydrated provider rows directly.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `useLLMProviderConfigStore` save actions | provider-row/configured-state synchronization | settings runtime | runtime mutates `providersWithModels[row].provider` after store success | extend store helper/API |

## Dependency Rules

- `ProviderAPIKeyManager` may call runtime methods only.
- `useProviderApiKeySectionRuntime` may call store save actions and read store state.
- Only `useLLMProviderConfigStore` may rewrite persisted provider query state.
- Runtime must not bypass store ownership by mutating hydrated provider rows directly.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `setLLMProviderApiKey(providerId, apiKey)` | built-in provider secret write + state sync | persist key + sync configured state | provider id + api key | store-owned post-save sync |
| `setGeminiSetupConfig(input)` | Gemini setup write + state sync | persist Gemini config + sync configured state | Gemini setup input | store-owned post-save sync |
| `saveGeminiSetup(input)` | UI notification orchestration | call store + toast | Gemini setup input | no direct provider-row mutation |

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `setLLMProviderApiKey` | Yes | Yes | Low | none |
| `setGeminiSetupConfig` | Yes | Yes | Low | none |
| `saveGeminiSetup` | Yes | Yes | Low | keep runtime UX-only |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| store helper | `replaceProviderConfiguredState` | Yes | Low | none |
| Gemini configured resolver | `resolveGeminiProviderConfiguredState` | Yes | Low | none |

## Applied Patterns (If Any)

- Local immutable replacement helper inside the store boundary.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/stores/llmProviderConfig.ts` | File | provider config store | immutable configured-state sync helper + built-in/Gemini save updates | authoritative provider mutation owner | UI toast logic |
| `autobyteus-web/components/settings/providerApiKey/useProviderApiKeySectionRuntime.ts` | File | settings runtime | save orchestration + toast logic | UI-facing runtime boundary | direct hydrated-row mutation |
| `autobyteus-web/tests/stores/llmProviderConfigStore.test.ts` | File | store regression | built-in frozen-row tests | covers store owner directly | runtime-only behavior |
| `autobyteus-web/components/settings/providerApiKey/__tests__/useProviderApiKeySectionRuntime.spec.ts` | File | runtime regression | Gemini frozen-row test | covers removed runtime bypass | store implementation details beyond assertion scope |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `autobyteus-web/stores` | Main-Line Domain-Control | Yes | Low | already owns provider query/mutation state |
| `autobyteus-web/components/settings/providerApiKey` | Mixed Justified | Yes | Low | runtime UI logic lives here; no extra split needed for this scope |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| post-save provider sync | `store.setLLMProviderApiKey -> replaceProviderConfiguredState(...) -> runtime toast` | `store.setLLMProviderApiKey -> runtime mutates providersWithModels[row].provider` | shows the correct ownership boundary |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| keeping direct row mutation and adding try/catch around it | would mask the symptom only | Rejected | remove direct mutation entirely and use immutable replacement |

## Derived Layering (If Useful)

- UI surface -> runtime orchestration -> store state boundary -> GraphQL backend
