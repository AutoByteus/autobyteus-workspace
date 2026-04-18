# Design Spec

## Revision Note

This design **supersedes the earlier endpoint-specific/source-aware design direction**.

That earlier design solved several concrete blockers, but the user explicitly redirected the architecture on 2026-04-17 because the result still felt patchy and no longer intuitive. The new upstream direction is:
- keep the user-facing term **provider**,
- refactor provider from a bare enum-centric public model into a **provider object**,
- use a stable `providerType` field for backend/runtime behavior,
- fold custom OpenAI-compatible support into that cleaner provider model instead of layering more `source` / `providerInstance` concepts on top.

This revision intentionally replaces parts of the earlier review-passed design where those parts only existed to compensate for the old enum-centric provider model.

It also intentionally uses the **pre-task provider-centered baseline** (`origin/personal`) as the public API reference shape, not the current patched branch, because the user explicitly wants this redesign to be a cleanup refactor rather than another layer of patching. In practice that means:
- keep intuitive provider-centered query/mutation names where they still fit,
- keep the `ProviderWithModels` style collection shape, and
- upgrade the returned `provider` payload from a string/enum-like value to a richer provider object instead of inventing new top-level source-aware APIs.

It also closes the remaining blocker from architecture review round 5 by adding one explicit rule for the new public provider subject:
- provider names are normalized and must be unique across built-in + custom LLM providers,
- built-in provider names are reserved,
- duplicate names are rejected before save instead of being silently disambiguated later.

This revision also incorporates one additional user-approved UX correction from the current in-progress app state:
- saved custom providers must be removable,
- custom-provider model labels should show friendly model names instead of the long internal identifier strings,
- while built-in provider label behavior may stay unchanged in this ticket.

## Current-State Read

### Current execution path and boundaries

1. **Frontend provider/settings boundary**
   - `autobyteus-web/components/settings/ProviderAPIKeyManager.vue`
   - `autobyteus-web/components/settings/providerApiKey/ProviderModelBrowser.vue`
   - `autobyteus-web/stores/llmProviderConfig.ts`
   - Current shape: the UX already behaves like a provider browser. Users select a provider, see provider models, and edit provider configuration.

2. **Backend provider GraphQL boundary**
   - `autobyteus-server-ts/src/api/graphql/types/llm-provider.ts`
   - `autobyteus-server-ts/src/api/graphql/types/openai-compatible-endpoint.ts` (in-progress branch)
   - Current shape: built-in providers still come through provider-enum-oriented contracts, while custom OpenAI-compatible support was split into a parallel endpoint-specific subject.

3. **Runtime registry boundary**
   - `autobyteus-ts/src/llm/providers.ts`
   - `autobyteus-ts/src/llm/models.ts`
   - `autobyteus-ts/src/llm/llm-factory.ts`
   - Current shape: runtime provider behavior is keyed off `LLMProvider` enum values, and the in-progress branch patched custom-provider identity with `providerInstance` / `modelSource` overlays.

### Current coupling / fragmentation problems

- **Problem 1: the public provider model is too rigid**
  - The public/provider-facing API is still fundamentally built around hard-coded provider enum values.
  - That makes user-created custom providers awkward, because a custom OpenAI-compatible connection is a real provider-like object with its own name, URL, key, and models.

- **Problem 2: the UI already thinks in provider objects, but the backend does not**
  - The provider browser sidebar and selected provider panel already feel natural.
  - The awkwardness comes from backend/runtime modeling, not from the frontend concept of provider.

- **Problem 3: the prior custom-endpoint patch introduced compensating concepts**
  - `providerInstanceId`, `providerInstanceLabel`, `modelSourceId`, `modelSourceLabel`, and `modelSourceKind` were added to compensate for the old provider model.
  - Those overlays work technically, but the user correctly called them awkward and unintuitive.

- **Problem 4: provider lifecycle became split across parallel subjects**
  - Built-in providers live under provider APIs.
  - Custom OpenAI-compatible entries were moved into a separate endpoint-specific GraphQL/service/store subject.
  - That duplicates the provider mental model instead of cleaning it up.

- **Problem 5: fixed-provider secret handling was previously read-back based**
  - Raw provider API keys were being returned to the frontend.
  - The UI only needs configured/not-configured state.
  - This is another symptom of the provider contract not being modeled cleanly enough.

- **Problem 6: custom secret-bearing persistence still cannot use generic Server Settings**
  - Generic Server Settings expose non-`*_API_KEY` keys.
  - Custom provider records with URL + key must stay in a dedicated secret-bearing persistence path.

- **Problem 7: official OpenAI and generic OpenAI-compatible providers are behaviorally distinct**
  - Official OpenAI remains on the Responses API path.
  - Generic OpenAI-compatible providers must continue to use the existing OpenAI-compatible chat-completions path.

- **Problem 8: provider names become the primary public label, so collision policy must be explicit**
  - The provider browser sidebar and selected-provider header render provider names directly.
  - If duplicate custom names or custom-vs-built-in name collisions are allowed, the new provider-object design becomes ambiguous at its main public surface.

- **Problem 9: saved custom providers have no remove lifecycle**
  - The current in-progress branch allows create/probe/save only.
  - There is no delete GraphQL mutation, no delete service/store method, and no remove action in the saved custom-provider detail UI.

- **Problem 10: custom-provider model UIs leak internal identifiers**
  - Custom provider models are internally identified as `openai-compatible:${providerId}:${modelName}`.
  - That is valid for runtime uniqueness, but it is too technical for provider detail panels and model dropdowns.
  - Built-in provider labels can remain unchanged in this ticket, but custom-provider displays should use friendly model names.

### Constraints the target design must respect

- The user-facing concept should remain **provider**.
- The stable backend/runtime discriminator should be named `providerType`.
- The first dynamic user-created `providerType` in scope is `OPENAI_COMPATIBLE`.
- The real selector-serving path must remain `ModelCatalogService -> AutobyteusModelCatalog -> CachedAutobyteusLlmModelProvider`.
- Generic Server Settings still cannot be used for secret-bearing custom provider records.
- Official OpenAI must remain distinct from generic OpenAI-compatible runtime handling.
- Provider-type-specific settings behavior (for example Gemini) must remain possible without collapsing everything into one giant generic config blob.
- The provider browser uses provider names directly as the main user-visible label, so the design must keep those names unambiguous.
- Built-in provider model-label behavior is acceptable as-is for this ticket; the friendly-label correction is required only for custom providers.

## Intended Change

Refactor the LLM provider architecture so the primary subject becomes a **provider object**.

### Design thesis

The clean target model is:
- **provider** = the user-facing object shown in settings and selectors,
- **providerType** = the stable backend/runtime behavior category,
- **built-in providers** = predefined provider objects,
- **custom OpenAI-compatible providers** = user-created provider objects.

This gives one coherent architecture for:
- provider settings,
- provider model browsing,
- provider configured status,
- provider-targeted reload,
- provider-owned model grouping,
- custom OpenAI-compatible support,
- custom-provider removal,
- custom-provider-friendly model labeling.

It also keeps the provider browser intuitive by making provider names globally unique within the LLM provider subject:
- built-in names are reserved,
- custom provider names are checked against built-in + custom names after one normalization rule,
- duplicate names are rejected instead of introducing a second public disambiguation layer.

It also lets us remove the awkward public overlay concepts from the previous design:
- no public `sourceId/sourceKind/sourceLabel` subject,
- no public `providerInstance` overlay subject,
- no separate endpoint-specific top-level public lifecycle just to represent something that is really a provider.

### Clean target model

#### Provider object

```ts
export type LlmProviderRecord = {
  id: string;
  name: string;
  providerType: LLMProvider;
  isCustom: boolean;
  baseUrl?: string | null;
  apiKeyConfigured: boolean;
  status: 'READY' | 'STALE_ERROR' | 'ERROR' | 'NOT_APPLICABLE';
  statusMessage: string | null;
};
```

Rules:
- Built-in provider example:
  - `id = 'OPENAI'`
  - `name = 'OpenAI'`
  - `providerType = OPENAI`
  - `isCustom = false`
  - `baseUrl = null`
- Custom OpenAI-compatible provider example:
  - `id = 'provider_abc123'`
  - `name = 'My Gateway'`
  - `providerType = OPENAI_COMPATIBLE`
  - `isCustom = true`
  - `baseUrl = 'https://gateway.example.com/v1'`
- `name` is the primary public label in the provider browser and selector surfaces, so it must be unique across built-in + custom LLM providers after normalization.

#### Providers-with-models collection shape

```ts
export type LlmProviderWithModels = {
  provider: LlmProviderRecord;
  models: ModelDetail[];
};
```

Rules:
- This intentionally reuses the earlier `ProviderWithModels` public shape from the pre-task baseline.
- The refactor changes the `provider` payload from a string/enum-like value into a provider object instead of replacing the whole collection concept.

#### Normalized provider name

```ts
export type NormalizedProviderName = string;
```

Normalization rule:
- trim leading/trailing whitespace,
- collapse internal whitespace runs to one space,
- compare case-insensitively using one stable lowercase normalization.

Examples:
- `OpenAI`, ` openai `, and `OPENAI` collide.
- `My   Gateway` and `my gateway` collide.

#### Model detail

```ts
export type ModelDetail = {
  modelIdentifier: string;
  name: string;
  value: string;
  canonicalName: string;
  providerId: string;
  providerName: string;
  providerType: LLMProvider;
  runtime: string;
  hostUrl?: string | null;
  configSchema?: Record<string, unknown> | null;
  maxContextTokens?: number | null;
  activeContextTokens?: number | null;
  maxInputTokens?: number | null;
  maxOutputTokens?: number | null;
};
```

Rules:
- Public model metadata identifies the owning provider directly.
- Public source/source-kind overlays are removed.
- Internal model identifiers remain unique and non-colliding.
- For custom `OPENAI_COMPATIBLE` providers, `name` is the primary UI label in provider detail panels and model dropdowns.
- `modelIdentifier` remains the stored/runtime value and must not be the primary human-facing label for custom providers.

#### Persisted custom provider record

```ts
export type CustomLlmProviderRecord = {
  id: string;
  name: string;
  providerType: LLMProvider.OPENAI_COMPATIBLE;
  baseUrl: string;
  apiKey: string;
};

export type CustomLlmProviderConfigFile = {
  version: 1;
  providers: CustomLlmProviderRecord[];
};
```

Rules:
- This file contains only user-created providers.
- Built-in providers are synthesized, not persisted here.
- The first dynamic provider type in scope is `OPENAI_COMPATIBLE`.
- `name` must already pass authoritative normalized uniqueness validation before a record is written.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| `DS-001` | `Primary End-to-End` | `Settings UI requests LLM providers` | ``availableLlmProvidersWithModels`` returns `ProviderWithModels` rows rendered in provider browser | `LlmProviderService` | Establishes provider objects as the primary public/settings/catalog subject and guarantees provider names remain unique in that list. |
| `DS-002` | `Primary End-to-End` | `User probes a custom provider draft` | `Probe result with discovered models or validation error` | `LlmProviderService` | Validates user-created OpenAI-compatible providers before save, including name-collision checks. |
| `DS-003` | `Primary End-to-End` | `User saves a custom provider` | `Persisted custom provider record + authoritative catalog refresh executed` | `LlmProviderService` | Main durable lifecycle path for custom providers, including authoritative unique-name enforcement. |
| `DS-004` | `Primary End-to-End` | `Selected provider is reloaded` | `Selector-visible provider models refreshed through the real cache path` | `ModelCatalogService` | Keeps provider-targeted refresh coherent and selector-visible. |
| `DS-005` | `Primary End-to-End` | `Selected model identifier` | `Correct runtime invocation for the owning providerType` | `LLMFactory` | Preserves runtime behavior correctness after the provider-object refactor. |
| `DS-006` | `Return-Event` | `Provider reload status snapshot` | `Provider browser status chips/messages` | `LlmProviderService` | Keeps provider health observable without inventing another public concept. |
| `DS-007` | `Primary End-to-End` | `User deletes a saved custom provider` | `Persisted record removed + authoritative catalog refresh removes provider/models from selectors` | `LlmProviderService` | Delete must be provider-complete and selector-visible. |
| `DS-008` | `Bounded Local` | `Provider manager local draft/edit state` | `probeable | probed | dirty | savable` | `ProviderAPIKeyManager` / custom-provider editor owner | Keeps custom-provider creation UX bounded under the provider subject. |

## Primary Execution Spine(s)

`ProviderAPIKeyManager -> llmProviderConfig store -> LlmProviderResolver.availableLlmProvidersWithModels -> LlmProviderService -> BuiltInLlmProviderCatalog + CustomLlmProviderStore + ModelCatalogService.listLlmModels -> ProviderWithModels rows rendered in provider browser`

`ProviderAPIKeyManager custom-provider editor -> LlmProviderResolver.probeCustomLlmProvider -> LlmProviderService -> OpenAICompatibleProviderDiscovery -> probe result`

`ProviderAPIKeyManager custom-provider editor -> LlmProviderResolver.createCustomLlmProvider -> LlmProviderService -> CustomLlmProviderStore -> ModelCatalogService.reloadLlmProviderModels(providerId) -> AutobyteusModelCatalog -> CachedAutobyteusLlmModelProvider -> AutobyteusLlmModelProvider -> CustomLlmProviderRuntimeSyncService -> LLMFactory`

`ProviderAPIKeyManager -> setLlmProviderApiKey(providerId, apiKey) -> LlmProviderService -> built-in provider secret write path -> refreshed provider summary with apiKeyConfigured`

`ProviderAPIKeyManager custom-provider details -> LlmProviderResolver.deleteCustomLlmProvider -> LlmProviderService -> CustomLlmProviderStore.deleteProvider -> ModelCatalogService.reloadLlmModels(runtimeKind) -> AutobyteusModelCatalog -> CachedAutobyteusLlmModelProvider -> AutobyteusLlmModelProvider -> CustomLlmProviderRuntimeSyncService -> deleted provider disappears from ProviderWithModels rows`

`Agent/Team/App run config -> modelIdentifier -> LLMFactory.createLLM -> providerType-specific LLM class -> runtime request`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| `DS-001` | The settings/model browser requests LLM providers. The GraphQL boundary delegates to one provider lifecycle owner, which synthesizes built-in provider objects, loads custom provider records, reads current models from the authoritative catalog, and returns `ProviderWithModels` rows with provider metadata and configured status. That owner also guarantees the returned provider names are already unique in the public provider list. | `ProviderAPIKeyManager`, `llmProviderConfig store`, `LlmProviderResolver`, `LlmProviderService`, `BuiltInLlmProviderCatalog`, `CustomLlmProviderStore`, `ModelCatalogService` | `LlmProviderService` | provider projection, configured-status shaping, model grouping by providerId, name-collision policy |
| `DS-002` | The user probes a custom OpenAI-compatible provider draft. The provider service validates the draft name first against built-in and custom providers using the normalized unique-name rule, then asks the OpenAI-compatible discovery owner to probe the provider before any persistence occurs. | `ProviderAPIKeyManager`, `custom-provider editor`, `LlmProviderResolver`, `LlmProviderService`, `OpenAICompatibleProviderDiscovery` | `LlmProviderService` | input normalization, provider-name normalization, URL validation, auth shaping |
| `DS-003` | The user saves a custom provider. The provider service normalizes the input, rechecks name uniqueness authoritatively, persists one secret-bearing custom provider record, then requests an authoritative provider-targeted refresh so the real served catalog and runtime state update together. | `custom-provider editor`, `LlmProviderResolver`, `LlmProviderService`, `CustomLlmProviderStore`, `ModelCatalogService`, `AutobyteusModelCatalog`, `CachedAutobyteusLlmModelProvider`, `CustomLlmProviderRuntimeSyncService`, `LLMFactory` | `LlmProviderService` | secret-bearing persistence, provider id generation, provider-name uniqueness enforcement, provider-targeted refresh |
| `DS-004` | A provider-targeted reload command refreshes the selected provider through the real cached catalog path. For custom OpenAI-compatible providers, the sync owner may internally refresh the custom provider set atomically, but the public command remains provider-centric. | `ProviderAPIKeyManager`, `LlmProviderResolver`, `LlmProviderService`, `ModelCatalogService`, `AutobyteusModelCatalog`, `CachedAutobyteusLlmModelProvider`, `AutobyteusLlmModelProvider`, `CustomLlmProviderRuntimeSyncService` | `ModelCatalogService` | providerId-to-sync resolution, per-provider status snapshot, cache coherence |
| `DS-005` | A chosen model identifier resolves to one model whose metadata already carries `providerId`, `providerName`, and `providerType`. The factory uses that provider-typed model metadata to instantiate the correct runtime path. | `run config`, `LLMFactory`, `LLMModel`, `providerType-specific LLM class` | `LLMFactory` | unique model identifier generation, providerType-specific LLM class selection |
| `DS-006` | Provider reload/discovery status is cached by provider id and projected back onto provider objects so the provider browser can show health without introducing a separate user-facing source concept. | `CustomLlmProviderRuntimeSyncService`, `LlmProviderService`, `LlmProviderResolver`, `ProviderAPIKeyManager` | `LlmProviderService` | status mapping, status fallback for built-ins |
| `DS-007` | The user deletes a saved custom provider. The provider service removes the persisted record, then requests an authoritative full catalog refresh because the deleted provider id no longer exists as a valid targeted reload subject. | `ProviderAPIKeyManager`, `custom-provider details`, `LlmProviderResolver`, `LlmProviderService`, `CustomLlmProviderStore`, `ModelCatalogService`, `AutobyteusModelCatalog`, `CustomLlmProviderRuntimeSyncService` | `LlmProviderService` | delete authorization/validation, persistence removal, authoritative refresh after delete |
| `DS-008` | The provider manager keeps local state for adding/probing/saving a custom provider. That local loop stays under the existing provider browser instead of spawning a separate endpoint-specific top-level UX. | `ProviderAPIKeyManager`, `custom-provider editor` | `ProviderAPIKeyManager` / custom-provider editor | dirty-state tracking, probe invalidation, save enablement |

## Spine Actors / Main-Line Nodes

- `ProviderAPIKeyManager`
- `llmProviderConfig store`
- `LlmProviderResolver`
- `LlmProviderService`
- `BuiltInLlmProviderCatalog`
- `CustomLlmProviderStore`
- `CustomLlmProviderRuntimeSyncService`
- `OpenAICompatibleProviderDiscovery`
- `ModelCatalogService`
- `AutobyteusModelCatalog`
- `CachedAutobyteusLlmModelProvider`
- `AutobyteusLlmModelProvider`
- `LLMFactory`

## Ownership Map

- `ProviderAPIKeyManager`
  - Thin top-level provider settings shell.
  - Owns provider selection and top-level screen composition only.
- `llmProviderConfig store`
  - Governing web data boundary for fetching `ProviderWithModels` rows, saving built-in provider secrets, triggering reload/delete, and exposing provider metadata to UI consumers.
- `LlmProviderResolver`
  - Thin GraphQL transport boundary for provider-object lifecycle and provider-with-models queries.
- `LlmProviderService`
  - Authoritative owner of provider lifecycle and provider-object projection.
  - Owns provider list composition, custom provider probe/save/delete, provider-targeted refresh requests, write-only secret status shaping, and authoritative provider-name uniqueness validation.
- `BuiltInLlmProviderCatalog`
  - Owns synthesis of built-in provider objects, built-in provider configured status projection, and the reserved built-in provider name set.
- `CustomLlmProviderStore`
  - Owns durable secret-bearing persistence and deletion of user-created providers.
- `CustomLlmProviderRuntimeSyncService`
  - Owns loading custom provider records into runtime state and caching provider reload statuses.
- `OpenAICompatibleProviderDiscovery`
  - Owns OpenAI-compatible `/models` probing and normalization.
- `ModelCatalogService`
  - Remains the authoritative selector-visible model listing/reload boundary.
- `LLMFactory`
  - Remains the authoritative model registry and instantiation boundary.

If a public facade or entry wrapper exists, it is thin unless stated otherwise.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `ProviderAPIKeyManager` | `llmProviderConfig store` + provider-specific editor components | Keep the existing intuitive provider-browser shell | persistence or runtime sync policy |
| `LlmProviderResolver` | `LlmProviderService` | GraphQL transport exposure for provider lifecycle and provider lists | provider store writes, discovery orchestration, cache refresh policy |
| `AutobyteusModelCatalog` / `CachedAutobyteusLlmModelProvider` | `ModelCatalogService` | Keep selector-visible cache ownership centralized | direct provider-service runtime mutation without cache refresh |
| `AutobyteusLlmModelProvider` custom-provider branch | `CustomLlmProviderRuntimeSyncService` | Keep server model access centralized while allowing custom provider sync | custom provider file parsing in unrelated branches |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| Public `providerInstanceId` / `providerInstanceLabel` / `modelSourceId` / `modelSourceLabel` / `modelSourceKind` overlays for LLM providers | They were compensating overlays for the old enum-centric provider model | provider-object contract + direct providerId/providerName/providerType model ownership | `In This Change` | Public API cleanup is a core goal of the refactor |
| `availableLlmModelSourcesWithModels(...)` as a parallel public selector concept | The provider object itself becomes the natural selector grouping unit | `availableLlmProvidersWithModels(...)` provider-object query | `In This Change` | Remove the public source concept |
| Separate top-level `openAiCompatibleEndpoints` GraphQL subject | Custom OpenAI-compatible entries are providers, not a parallel public subject | `LlmProviderResolver` + `LlmProviderService` provider lifecycle APIs | `In This Change` | Clean public subject model |
| `OpenAiCompatibleEndpointManager` as a separate top-level settings subject | Custom creation stays under the provider browser | provider-specific editor under `ProviderAPIKeyManager` | `In This Change` | Keep provider UX intuitive |
| Raw fixed-provider secret read-back via `getLlmProviderApiKey(provider)` | Frontend only needs `apiKeyConfigured` | provider object projection and/or providerId-targeted write-only status query | `In This Change` | Explicit security cleanup |
| Bare public `LLMProvider` enum as the primary provider-facing contract | Public provider-facing contract is now a provider object | provider object + internal `providerType` enum | `In This Change` | Internal behavior enum remains, but under a clearer name |

## Return Or Event Spine(s) (If Applicable)

`CustomLlmProviderRuntimeSyncService status snapshot -> LlmProviderService -> LlmProviderResolver -> ProviderWithModels rows -> ProviderAPIKeyManager`

`ModelCatalogService.listLlmModels -> LlmProviderService provider grouping/projection -> llmProviderConfig store -> general model selectors`

## Bounded Local / Internal Spines (If Applicable)

- Parent owner: `ProviderAPIKeyManager` + custom-provider editor
- Short arrow chain:
  - `draft fields -> dirty state -> probe pending -> probe success | probe error -> save enabled only for matching draft`
- Why this bounded local spine matters:
  - The custom provider creation UX needs validation before save, but it should stay inside the provider browser instead of becoming a separate public subject.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| `BuiltInProviderConfiguredStatusProjection` | `DS-001` | `BuiltInLlmProviderCatalog`, `LlmProviderService` | Convert built-in provider config presence into `apiKeyConfigured` and other provider summary fields | Built-ins must join the same provider list without raw-secret read-back | Provider service bloats with config-specific branching |
| `CustomProviderConfigCodec` | `DS-002`, `DS-003`, `DS-004` | `CustomLlmProviderStore`, `CustomLlmProviderRuntimeSyncService` | Parse/serialize secret-bearing custom provider records | Keep persistence schema tight and reusable | Drift between server persistence and runtime sync |
| `ProviderDraftNormalizer` | `DS-002`, `DS-003` | `LlmProviderService`, `OpenAICompatibleProviderDiscovery` | Validate/normalize provider name and base URL | Keep input rules centralized | Validation logic spreads across UI, resolver, runtime |
| `ProviderModelProjection` | `DS-001` | `LlmProviderService` | Merge provider metadata with model groups from the catalog | One provider-object projection owner keeps the public API clean | GraphQL or store layer reimplements grouping logic |
| `ProviderReloadStatusSnapshot` | `DS-004`, `DS-006`, `DS-007` | `CustomLlmProviderRuntimeSyncService` | Cache per-provider reload status from custom-provider sync | Provider health must survive the sync call | Failure visibility vanishes after refresh |
| `CustomProviderDisplayLabelPolicy` | `DS-001`, `DS-005` | `ProviderModelBrowser`, selector label utilities | Show `model.name` for custom providers while retaining internal identifiers as stored values | Keeps custom-provider UX intuitive without disturbing built-ins | Internal identifiers leak into human-facing UI again |
| `UniqueModelIdentifierBuilder` | `DS-005` | `LLMModel`, custom provider model builders | Keep internal model identifiers unique across providers | Still required even though public source overlays are removed | Model names collide across providers |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| OpenAI-compatible invocation | `autobyteus-ts/src/llm/api/openai-compatible-llm.ts` | `Reuse` | Transport/runtime behavior already exists | N/A |
| Provider browser UI shell | `ProviderAPIKeyManager.vue` + `ProviderModelBrowser.vue` | `Reuse + Extend` | UX already feels like a provider-object browser | N/A |
| Built-in provider secret writes | Existing `AppConfig.setLlmApiKey(...)` path | `Reuse For This Ticket` | At-rest storage migration is explicitly out of scope | N/A |
| Generic Server Settings persistence | `ServerSettingsService` | `Do Not Reuse For Custom Provider Records` | Still leaks non-`*_API_KEY` settings | Wrong persistence home |
| File-based JSON persistence pattern | `store-utils.ts`, `workspace-id-mapping-store.ts`, `disabled-skills-store.ts` | `Reuse Pattern` | Fits custom provider secret-bearing file storage | N/A |
| Model catalog cache path | `ModelCatalogService -> AutobyteusModelCatalog -> CachedAutobyteusLlmModelProvider` | `Reuse` | Already the real selector-serving path | N/A |
| Model-selection label utility | `autobyteus-web/utils/modelSelectionLabel.ts` | `Reuse + Refine` | Existing label utility can absorb the custom-only friendly-label rule without forcing a built-in relabeling pass | N/A |
| Endpoint-specific GraphQL/service subject | `openai-compatible-endpoint.ts` + service/store folder | `Do Not Keep As Public Subject` | Custom OpenAI-compatible entries should become providers, not a parallel public subject | Provider object design makes it redundant |
| Source-aware public selector grouping | `availableLlmModelSourcesWithModels` | `Do Not Keep` | Provider objects themselves become the grouping unit | Public source concept becomes redundant |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web provider settings/browser module` | Provider list, selected provider panel, provider-specific editor branching, custom-provider delete action, custom-provider-friendly model labels | `DS-001`, `DS-002`, `DS-003`, `DS-007`, `DS-008` | `ProviderAPIKeyManager`, `llmProviderConfig store` | `Reuse + Extend` | Keep the intuitive provider UX |
| `autobyteus-web custom provider editor module` | Draft creation/probe/save for user-created providers | `DS-002`, `DS-003`, `DS-008` | `ProviderAPIKeyManager` | `Create New / Replace openaiCompatible UI subject` | New subfolder under provider settings |
| `autobyteus-server-ts LLM provider lifecycle module` | Provider-object composition, built-in/custom provider lifecycle, write-only provider secret status, provider-targeted refresh entry | `DS-001`, `DS-002`, `DS-003`, `DS-006` | `LlmProviderService` | `Create New / Replace endpoint-specific public subject` | New generic provider owner |
| `autobyteus-server-ts custom provider runtime sync` | Load custom provider records into runtime state and keep provider reload statuses | `DS-003`, `DS-004`, `DS-006` | `AutobyteusLlmModelProvider`, `LlmProviderService` | `Create New / Rename from endpoint-specific sync` | Same concern, cleaner subject |
| `autobyteus-server-ts model catalog` | Selector-visible model list/reload/cache | `DS-001`, `DS-004` | `ModelCatalogService` | `Reuse` | Must stay authoritative |
| `autobyteus-ts provider metadata/model identity` | `providerType`, provider-owned model metadata, unique model identity | `DS-001`, `DS-005` | `LLMFactory`, `LlmProviderService` | `Extend` | Remove public source overlays |
| `autobyteus-ts OpenAI-compatible custom provider discovery` | Probe dynamic OPENAI_COMPATIBLE providers and build models | `DS-002`, `DS-003`, `DS-004` | `CustomLlmProviderRuntimeSyncService` | `Reuse + Rename/Retighten` | Protocol-specific concern remains valid |

## Shared Structures / Core Data Shapes

### 1. Provider behavior enum (existing `LLMProvider`)

```ts
export enum LLMProvider {
  OPENAI = 'OPENAI',
  OPENAI_COMPATIBLE = 'OPENAI_COMPATIBLE',
  ANTHROPIC = 'ANTHROPIC',
  GEMINI = 'GEMINI',
  OLLAMA = 'OLLAMA',
  LMSTUDIO = 'LMSTUDIO',
  AUTOBYTEUS = 'AUTOBYTEUS',
  ...
}
```

Rule:
- Keep the existing behavior enum for this ticket and use it as the value type of the public `providerType` field.
- An internal enum rename to `LLMProviderType` is optional future cleanup, not required for this refactor.

### 2. Provider object (public/server/web)

```ts
export type LlmProviderRecord = {
  id: string;
  name: string;
  providerType: LLMProvider;
  isCustom: boolean;
  baseUrl?: string | null;
  apiKeyConfigured: boolean;
  status: 'READY' | 'STALE_ERROR' | 'ERROR' | 'NOT_APPLICABLE';
  statusMessage: string | null;
};
```

### 3. ProviderWithModels collection row (public/server/web)

```ts
export type LlmProviderWithModels = {
  provider: LlmProviderRecord;
  models: ModelDetail[];
};
```

### 4. Model metadata (runtime/server/web)

```ts
export type ModelInfo = {
  model_identifier: string;
  display_name: string;
  value: string;
  canonical_name: string;
  provider_id: string;
  provider_name: string;
  provider_type: LLMProvider;
  runtime: string;
  host_url?: string;
  config_schema?: Record<string, unknown>;
  max_context_tokens: number | null;
  active_context_tokens: number | null;
  max_input_tokens: number | null;
  max_output_tokens: number | null;
};
```

### 5. Persisted custom provider record

```ts
export type CustomLlmProviderRecord = {
  id: string;
  name: string;
  providerType: LLMProvider.OPENAI_COMPATIBLE;
  baseUrl: string;
  apiKey: string;
};
```

### 6. Provider reload status snapshot

```ts
export type CustomProviderReloadStatus = {
  providerId: string;
  status: 'READY' | 'STALE_ERROR' | 'ERROR';
  message?: string | null;
  modelCount: number;
  preservedPreviousModels: boolean;
};
```

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `LLMProvider` (used through `providerType`) | `Yes` | `Yes` | `Low` | Keep it as behavior type only; do not overload it as the public provider object |
| `LlmProviderRecord` + `ProviderWithModels` | `Yes` | `Yes` | `Low` | Reuse the earlier provider-centered collection shape while upgrading the provider payload |
| `ModelInfo` with `providerId/providerName/providerType` | `Yes` | `Yes` | `Low` | Remove public source/source-kind overlays |
| `CustomLlmProviderRecord` | `Yes` | `Yes` | `Low` | Keep only custom persisted records; do not mix built-ins into the file |
| `CustomProviderReloadStatus` | `Yes` | `Yes` | `Low` | One status record per custom provider |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/components/settings/ProviderAPIKeyManager.vue` | Web provider settings/browser module | Thin page shell | Keep the provider browser shell and branch to provider-specific editors | One provider settings shell | No |
| `autobyteus-web/components/settings/providerApiKey/ProviderModelBrowser.vue` | Web provider settings/browser module | UI browser boundary | Render provider summaries, provider status, and provider models | One browser concern | Yes |
| `autobyteus-web/components/settings/providerApiKey/customProvider/CustomProviderEditor.vue` | Web custom provider editor module | Governing custom-provider editor | Create/probe/save custom providers under the provider browser | One custom provider draft owner | Yes |
| `autobyteus-web/components/settings/providerApiKey/customProvider/CustomProviderDetailsCard.vue` | Web provider settings/browser module | Governing saved custom-provider detail card | Show saved custom-provider summary/status and trigger remove action | Keeps saved custom-provider actions out of the page shell | Yes |
| `autobyteus-web/components/settings/providerApiKey/ProviderApiKeyEditor.vue` | Web provider settings/browser module | Fixed-provider secret editor | Continue write-only built-in provider key editing from `apiKeyConfigured` state | One built-in editor concern | Yes |
| `autobyteus-web/stores/llmProviderConfig.ts` | Web provider settings/browser module | Store boundary | Fetch `ProviderWithModels` rows, save provider secrets, trigger provider reload/delete, expose provider metadata with models | One provider data boundary | Yes |
| `autobyteus-web/graphql/queries/llm_provider_queries.ts` | Web provider settings/browser module | GraphQL document boundary | Request provider-centered `ProviderWithModels` rows and provider-specific status/config data | One query boundary | Yes |
| `autobyteus-web/graphql/mutations/llm_provider_mutations.ts` | Web provider settings/browser module | GraphQL document boundary | Save provider secrets, probe/create/delete custom providers, trigger provider reload | One mutation boundary | Yes |
| `autobyteus-web/components/launch-config/RuntimeModelConfigFields.vue` | Web selector consumers | UI consumer | Consume providers-with-models naturally | One selector consumer | Yes |
| `autobyteus-web/components/workspace/config/TeamRunConfigForm.vue` | Web selector consumers | UI consumer | Consume providers-with-models naturally | One selector consumer | Yes |
| `autobyteus-web/composables/useMessagingChannelBindingSetupFlow.ts` | Web selector consumers | Flow consumer | Consume providers-with-models naturally | One flow consumer | Yes |
| `autobyteus-web/components/settings/CompactionConfigCard.vue` | Web selector consumers | UI consumer | Consume providers-with-models naturally | One selector consumer | Yes |
| `autobyteus-server-ts/src/api/graphql/types/llm-provider.ts` | Server provider lifecycle GraphQL | Thin transport boundary | Expose `availableLlmProvidersWithModels` plus provider lifecycle mutations/queries | One GraphQL boundary for provider subject | Yes |
| `autobyteus-server-ts/src/api/graphql/types/openai-compatible-endpoint.ts` | Server old endpoint-specific subject | Removed | Endpoint-specific public subject becomes redundant | No longer the right subject | N/A |
| `autobyteus-server-ts/src/llm-management/llm-providers/services/llm-provider-service.ts` | Server provider lifecycle module | Governing owner | Compose provider records and `ProviderWithModels` rows, handle probe/create/delete/reload entrypoints, shape write-only secret status | One provider lifecycle owner | Yes |
| `autobyteus-server-ts/src/llm-management/llm-providers/builtins/built-in-llm-provider-catalog.ts` | Server provider lifecycle module | Built-in provider metadata owner | Synthesize built-in provider objects and configured status | One built-in provider metadata concern | Yes |
| `autobyteus-server-ts/src/llm-management/llm-providers/stores/custom-llm-provider-store.ts` | Server provider lifecycle module | Persistence boundary | Read/write/delete secret-bearing custom provider records | One secret-bearing store concern | Yes |
| `autobyteus-server-ts/src/llm-management/llm-providers/services/custom-llm-provider-runtime-sync-service.ts` | Server custom provider runtime sync | Runtime sync boundary | Sync custom providers into runtime state and cache provider reload statuses | One runtime sync owner | Yes |
| `autobyteus-server-ts/src/llm-management/services/model-catalog-service.ts` | Server model catalog | Public catalog boundary | Expose provider-targeted refresh through the real cached catalog path | One public cache-refresh boundary | No |
| `autobyteus-server-ts/src/llm-management/services/autobyteus-model-catalog.ts` | Server model catalog | Catalog facade | Keep cache-serving provider ownership centralized | One catalog facade | No |
| `autobyteus-server-ts/src/llm-management/providers/cached-autobyteus-llm-model-provider.ts` | Server model catalog | Cache owner | Repopulate/refresh selector-visible cache after provider-targeted refresh | One cache owner | No |
| `autobyteus-server-ts/src/llm-management/providers/autobyteus-llm-model-provider.ts` | Server model catalog bridge | Catalog bridge | Delegate custom-provider sync on list/reload while staying under cache owner | Existing bridge owner | No |
| `autobyteus-ts/src/llm/providers.ts` | TS provider behavior typing | Shared enum owner | Keep the existing `LLMProvider` behavior enum and use it through public `providerType` fields | Reuses the pre-task baseline enum with lower churn | No |
| `autobyteus-ts/src/llm/models.ts` | TS runtime model metadata | Shared model owner | Store `providerId`, `providerName`, and `providerType` on models and preserve a clean `name` field for custom-provider display labeling | One model identity owner | Yes |
| `autobyteus-web/utils/modelSelectionLabel.ts` | Web selector label policy | Shared label-policy owner | Apply the custom-only friendly model-label rule while preserving built-in label behavior | One label-policy concern | Yes |
| `autobyteus-ts/src/llm/custom-llm-provider-config.ts` | TS custom provider persistence schema | Shared structure owner | Own custom provider persisted schema | Shared by store/sync/protocol-specific builders | Yes |
| `autobyteus-ts/src/llm/openai-compatible-provider-discovery.ts` | TS protocol-specific discovery | Discovery concern | Probe one OpenAI-compatible custom provider and normalize `/models` | One protocol concern | Yes |
| `autobyteus-ts/src/llm/openai-compatible-provider-model.ts` | TS protocol-specific model builder | Specialized model owner | Build models for custom OPENAI_COMPATIBLE providers with provider-owned metadata | One specialized model concern | Yes |
| `autobyteus-ts/src/llm/llm-factory.ts` | TS runtime registry | Registry owner | Register models with provider-owned metadata and instantiate by modelIdentifier | One registry boundary | Yes |

## Ownership Boundaries

### 1. Provider lifecycle boundary

- Authoritative entrypoint: `LlmProviderService`
- Encapsulates:
  - provider-object list composition,
  - custom provider probe/save/delete lifecycle,
  - provider-targeted refresh requests,
  - write-only provider configured-status shaping.
- GraphQL callers must depend on this boundary, not on built-in catalogs, custom stores, runtime sync, and model catalog separately.

### 2. Built-in provider metadata boundary

- Authoritative entrypoint: `BuiltInLlmProviderCatalog`
- Encapsulates:
  - built-in provider ids/names/providerTypes,
  - built-in provider configured status projection,
  - any built-in provider-specific summary shaping.
- Callers above it should not read raw built-in secret values just to infer configured status.

### 3. Custom provider persistence boundary

- Authoritative entrypoint: `CustomLlmProviderStore`
- Encapsulates:
  - secret-bearing file path resolution,
  - atomic JSON read/write/delete,
  - custom provider schema parsing.
- Must not be bypassed by `ServerSettingsService` or ad hoc writes.

### 4. Custom provider runtime sync boundary

- Authoritative entrypoint: `CustomLlmProviderRuntimeSyncService`
- Encapsulates:
  - loading custom provider records into runtime state,
  - provider reload status caching,
  - bootstrapping custom providers on first catalog access.
- The provider service should not mutate runtime state directly; it should request catalog refresh.

### 5. Selector-visible catalog boundary

- Authoritative entrypoint: `ModelCatalogService`
- Encapsulates:
  - selector-visible model listing,
  - provider-targeted refresh commands,
  - the real cached catalog path.
- Provider lifecycle changes that affect models must become visible through this boundary.

### 6. Runtime registry boundary

- Authoritative entrypoint: `LLMFactory`
- Encapsulates:
  - model registry population,
  - unique model identity,
  - model instantiation by identifier.
- Server code above it should continue to use `ModelCatalogService` rather than bypass into factory internals.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `LlmProviderService` | provider-object composition, custom provider probe/save/delete, write-only secret shaping, refresh requests | `LlmProviderResolver`, web provider store | resolver/store calling built-in catalog + custom store + model catalog separately | strengthening provider service APIs |
| `BuiltInLlmProviderCatalog` | built-in provider metadata and configured-status projection | `LlmProviderService` | direct raw-secret reads from UI-facing layers | moving projection logic into the built-in catalog |
| `CustomLlmProviderStore` | custom provider file persistence and deletion | `LlmProviderService`, `CustomLlmProviderRuntimeSyncService` | `ServerSettingsService` or UI-facing layers writing files directly | moving all file access into the store |
| `CustomLlmProviderRuntimeSyncService` | custom provider load/sync + status snapshot | `AutobyteusLlmModelProvider`, `LlmProviderService` (status reads only) | provider service mutating runtime state directly after save | strengthening sync/read APIs and keeping mutation through catalog refresh |
| `ModelCatalogService` | selector-visible reload/list through the cache path | `LlmProviderService`, GraphQL resolvers | provider service or GraphQL calling `LLMFactory` directly for selector-visible refresh | adding the needed provider-targeted API there |
| `LLMFactory` | model registration + instantiation | `CustomLlmProviderRuntimeSyncService` | server/UI layers reaching into registry internals | keeping one registry boundary |

## Dependency Rules

- Web provider settings components may depend on `llmProviderConfig` and provider-specific editor components only.
- `llmProviderConfig` may depend on provider GraphQL documents, not on separate endpoint-specific documents.
- `LlmProviderResolver` may depend on `LlmProviderService`, not on the custom provider store, built-in provider catalog, and model catalog separately.
- `LlmProviderService` may depend on:
  - `BuiltInLlmProviderCatalog`
  - `CustomLlmProviderStore`
  - `CustomLlmProviderRuntimeSyncService` for status reads only
  - `ModelCatalogService`
  - `OpenAICompatibleProviderDiscovery`
- `LlmProviderService` must not mutate runtime state directly after provider save; it must request refresh through `ModelCatalogService`.
- `CustomLlmProviderRuntimeSyncService` may depend on:
  - `CustomLlmProviderStore`
  - `LLMFactory`
- `ModelCatalogService` continues to depend on `AutobyteusModelCatalog`; do not add GraphQL-to-`LLMFactory` shortcuts.
- `LLMFactory` may depend on protocol-specific custom provider discovery/model builders, but public provider-object projection stays above it in server provider lifecycle code.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `availableLlmProvidersWithModels(runtimeKind?)` | provider collection | return `ProviderWithModels` rows whose `provider` field is now a rich provider object | optional `runtimeKind` | Primary provider list contract reused from the pre-task baseline |
| `probeCustomLlmProvider(input)` | custom provider draft | validate and probe one provider draft before save | compound input `{ name, providerType, baseUrl, apiKey }` | first dynamic providerType in scope is `OPENAI_COMPATIBLE` |
| `createCustomLlmProvider(input, runtimeKind?)` | custom provider lifecycle | persist one custom provider and trigger authoritative refresh | compound input `{ name, providerType, baseUrl, apiKey }` | additive API for the new dynamic-provider flow |
| `deleteCustomLlmProvider(providerId, runtimeKind?)` | custom provider lifecycle | remove one saved custom provider and trigger authoritative full-catalog refresh | `providerId` | Delete uses full catalog refresh because the deleted provider id is no longer a valid targeted reload subject |
| `setLlmProviderApiKey(providerId, apiKey)` | provider secret write | save/replace provider credentials without raw read-back | `providerId` + secret value | Reuses the existing built-in provider write path name |
| `reloadLlmProviderModels(providerId, runtimeKind?)` | provider-targeted refresh | refresh one provider through the real cache-serving path | `providerId` | Reuses the existing provider-centered reload name with provider-object identity |
| `reloadLlmModels(runtimeKind?)` | provider catalog refresh | retain full LLM catalog reload when the whole runtime needs a refresh | optional `runtimeKind` | Existing broad reload command stays intact |
| `setGeminiSetupConfig(...)` | Gemini-specific settings | retain specialized Gemini config write path | existing Gemini-specific shape | Provider objects do not erase provider-type-specific config commands |
| `LLMFactory.createLLM(modelIdentifier)` | model runtime instantiation | construct one LLM instance | unique `modelIdentifier` | Model metadata carries providerId/providerType |

Rule:
- Public provider lifecycle boundaries should be keyed by provider object identity (`providerId`) where the subject is a provider.
- `providerType` is a behavior field, not the public provider object identity.

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `availableLlmProvidersWithModels(runtimeKind?)` | `Yes` | `Yes` | `Low` | Keep the earlier provider-centered collection shape and enrich only the provider payload |
| `probeCustomLlmProvider(input)` | `Yes` | `Yes` | `Low` | Keep provider draft input explicit with `providerType` |
| `createCustomLlmProvider(input, runtimeKind?)` | `Yes` | `Yes` | `Low` | Keep create separate from secret write/update |
| `deleteCustomLlmProvider(providerId, runtimeKind?)` | `Yes` | `Yes` | `Low` | Use delete-specific lifecycle so removal can trigger the right authoritative refresh path |
| `setLlmProviderApiKey(providerId, apiKey)` | `Yes` | `Yes` | `Low` | Keep provider secret writes provider-id-targeted and write-only |
| `reloadLlmProviderModels(providerId, runtimeKind?)` | `Yes` | `Yes` | `Low` | Use provider identity instead of behavior enum as public subject |
| `reloadLlmModels(runtimeKind?)` | `Yes` | `Yes` | `Low` | Keep full-catalog reload as the coarse-grained existing command |
| `LLMFactory.createLLM(modelIdentifier)` | `Yes` | `Yes` | `Low` | Keep runtime instantiation keyed by unique model identity |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| public provider object | `LlmProviderRecord` / `provider` | `Yes` | `Low` | Keep provider as the user-facing subject |
| behavior enum | existing `LLMProvider` used through `providerType` | `Yes` | `Low` | Keep `providerType` as the public field name even if the internal enum name stays `LLMProvider` |
| custom persisted provider | `CustomLlmProviderRecord` | `Yes` | `Low` | Keep it generic enough for future provider types |
| old endpoint-specific public subject | `OpenAiCompatibleEndpoint` | `No` for new target | `High` | Remove as top-level public subject |

## Applied Patterns (If Any)

- **Predefined object catalog**
  - Built-in providers are synthesized as predefined provider objects.
- **Registry**
  - `LLMFactory` remains the runtime model registry.
- **Dedicated secret-bearing store**
  - Custom providers persist in a dedicated file store, outside generic settings exposure paths.
- **Adapter / boundary translation**
  - `OpenAICompatibleProviderDiscovery` translates external `/models` responses into provider-owned models.
  - `LlmProviderService` translates runtime model catalog data into provider objects.
- **Authoritative cache refresh boundary**
  - Provider save/reload changes become selector-visible only through `ModelCatalogService -> AutobyteusModelCatalog -> CachedAutobyteusLlmModelProvider`.
- **State machine (bounded local spine)**
  - Custom provider creation stays inside the provider browser as a bounded local draft/probe/save loop.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/components/settings/providerApiKey/customProvider/` | `Folder` | Web custom provider editor module | Custom provider creation/probe/save UI under the provider browser | Same user-facing subject: provider | separate top-level endpoint manager subject |
| `autobyteus-server-ts/src/llm-management/llm-providers/` | `Folder` | Server provider lifecycle module | Provider-object lifecycle, built-in provider catalog, custom provider persistence/sync | Generic provider subject replaces endpoint-specific public split | unrelated model-catalog cache internals |
| `autobyteus-ts/src/llm/` provider files | `Folder/Files` | TS runtime provider metadata/model identity | Behavior enum, provider-owned model metadata, custom provider schema/builders | Fits runtime/provider ownership | server-specific file IO |

## Critical Behavior Rules

### Provider object rule

- The public/settings/catalog-facing subject is **provider**, not provider enum and not source/source-kind overlays.
- A provider object must carry `id`, `name`, and `providerType`.
- Built-ins and custom entries must both project into that same provider-object shape.
- The main collection contract should stay `ProviderWithModels`, with provider metadata nested in the `provider` field.

### Provider type rule

- `providerType` is the stable backend/runtime behavior discriminator.
- User-entered provider names must not control runtime behavior.
- Official OpenAI remains `providerType = OPENAI`; custom generic OpenAI-compatible providers remain `providerType = OPENAI_COMPATIBLE`.

### Write-only secret rule

- Provider objects may expose `apiKeyConfigured`, never raw API keys.
- Frontend hydration must not read raw provider secrets.
- Built-in provider secret writes may keep their current backend storage path in this ticket, but the read path becomes write-only/configured-status-based.
- Custom provider secret-bearing persistence must remain outside generic Server Settings.

### Public API cleanup rule

- Public LLM provider contracts must not require `sourceId`, `sourceLabel`, `sourceKind`, or `providerInstance*` overlays.
- If provider ownership is needed at model level, expose `providerId`, `providerName`, and `providerType` directly.

### Custom provider delete rule

- Saved custom providers must expose a remove action from the provider-management surface.
- Delete must remove the persisted custom-provider record before refreshing runtime/catalog state.
- Because the deleted provider id no longer exists, delete must refresh through `ModelCatalogService.reloadLlmModels(runtimeKind)` rather than a deleted-provider targeted reload call.

### Custom provider display-label rule

- For custom `OPENAI_COMPATIBLE` providers, provider detail panels and model selectors must show `model.name` as the primary label.
- Built-in provider label behavior may remain unchanged in this ticket.
- The internal custom-provider identifier (for example `openai-compatible:provider_<id>:<model>`) must remain the stored/runtime value but not the primary custom-provider UI label.

### Reload isolation rule

- Custom provider sync runs with per-provider failure isolation.
- One broken custom provider must not wipe healthy providers.
- Status is tracked per provider object and projected back onto provider objects.

### Catalog cache consistency rule

- Provider save/reload changes that affect models must go through `ModelCatalogService` and the real cached catalog path.
- For custom `OPENAI_COMPATIBLE` providers, provider-targeted public refresh may internally sync the custom-provider set atomically, but selector-visible data must still update through the authoritative cache path.

## Rollout / Implementation Sequencing

1. **Retighten provider typing around the existing enum**
   - Keep the existing `LLMProvider` enum as the internal behavior enum used by the public `providerType` field.
   - Refactor model metadata to carry `providerId`, `providerName`, and `providerType` instead of public source/source-kind overlays.
2. **Introduce provider lifecycle owner**
   - Add `LlmProviderService`, `BuiltInLlmProviderCatalog`, and `CustomLlmProviderStore`.
   - Move provider-object projection and custom-provider lifecycle under this generic provider subject.
3. **Refactor custom provider persistence/sync subject**
   - Rename/generalize endpoint-specific persistence/sync shapes to custom provider shapes.
   - Keep OpenAI-compatible discovery logic as the first providerType-specific dynamic implementation.
4. **Refactor GraphQL/provider APIs from the pre-task baseline**
   - Keep `availableLlmProvidersWithModels`, `reloadLlmProviderModels`, `reloadLlmModels`, and `setLlmProviderApiKey` as the recognizable provider-centered API surface where they still fit.
   - Upgrade `ProviderWithModels.provider` from a string into a provider object.
   - Remove raw fixed-provider secret read-back and add only the new custom-provider draft/save/delete APIs needed for this feature.
5. **Refactor web provider store and provider browser**
   - Keep `providersWithModels` as the main store shape.
   - Update consumers to read provider metadata from `row.provider` instead of a bare provider string.
   - Add custom-provider editor under the provider browser.
   - Add saved custom-provider removal and custom-only friendly model labels.
6. **Preserve authoritative cache refresh**
   - Keep provider save/reload/delete flowing through the real catalog-serving path.
7. **Cleanup / decommission**
   - Remove public source overlay contracts, endpoint-specific public subject files, and unused UI/store code from the superseded design direction.

## Testing / Validation Expectations

- **Provider-object API tests**
  - `availableLlmProvidersWithModels` still returns `ProviderWithModels` rows, but `provider` is now a provider object with `id`, `name`, `providerType`, and `apiKeyConfigured`.
  - Public provider/object contracts do not expose `sourceId/sourceKind` overlays.
- **Secret handling tests**
  - Fixed-provider frontend flows no longer fetch raw API keys.
  - Custom provider objects never return raw API keys.
  - Custom provider records do not leak through generic Server Settings.
- **Custom-provider lifecycle tests**
  - Probe succeeds/fails correctly for custom OpenAI-compatible providers.
  - Create persists custom provider records and makes them appear in the provider list.
  - Delete removes persisted custom provider records and removes the provider from provider lists/selectors after authoritative refresh.
  - Multiple custom providers can coexist.
- **Display-label tests**
  - API Key Management shows `model.name` for custom-provider models rather than the long internal identifier.
  - General model selectors show `provider.name / model.name` for selected custom-provider models while keeping the full identifier as the stored value.
  - Built-in provider label behavior remains unchanged.
- **Runtime sync / reload tests**
  - One failing custom provider preserves healthy providers.
  - Provider reload status is tracked per provider id.
  - `reloadLlmProviderModels(providerId)` updates selector-visible state through the real cache path.
  - `deleteCustomLlmProvider(providerId)` triggers a full authoritative refresh so deleted-provider models disappear.
  - Existing `reloadLlmModels(runtimeKind?)` continues to refresh the whole catalog without regressing the custom-provider flow.
- **Runtime behavior tests**
  - Custom OpenAI-compatible provider models instantiate through the OpenAI-compatible path.
  - Official OpenAI models remain on the Responses path.
- **Cleanup regression tests**
  - Old endpoint-specific public APIs and public source/source-kind overlay contracts are removed or fail if accidentally reintroduced.

## Explicit Design Rejections

- Do **not** keep patching custom OpenAI-compatible support onto a public provider-enum-only model.
- Do **not** keep a separate user-facing `source` concept for LLM providers.
- Do **not** keep a separate top-level endpoint-specific public subject when the real public subject is provider.
- Do **not** return raw provider API keys to the frontend.
- Do **not** route selector-visible provider changes around the real cached catalog path.
- Do **not** use long internal custom-provider identifiers as the primary human-facing labels in provider detail panels or dropdowns.
- Do **not** collapse `providerType` and user-entered provider name into one field.
