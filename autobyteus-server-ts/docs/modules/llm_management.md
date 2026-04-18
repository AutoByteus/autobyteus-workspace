# LLM Management

## Scope

Provider lifecycle, model-catalog reads, provider-targeted reload, fixed
provider secret writes, and custom OpenAI-compatible provider persistence/sync
for the TypeScript server.

## TS Source

- `src/api/graphql/types/llm-provider.ts`
- `src/llm-management/services/model-catalog-service.ts`
- `src/llm-management/services/autobyteus-model-catalog.ts`
- `src/llm-management/providers/autobyteus-llm-model-provider.ts`
- `src/llm-management/providers/cached-autobyteus-llm-model-provider.ts`
- `src/llm-management/llm-providers/`

## Main Owners

- **`LlmProviderService`**
  (`src/llm-management/llm-providers/services/llm-provider-service.ts`)
  - provider-centered public read model
  - fixed-provider API-key writes
  - custom-provider probe + create + delete
  - authoritative normalized provider-name uniqueness checks
- **`CustomLlmProviderStore`**
  (`src/llm-management/llm-providers/stores/custom-llm-provider-store.ts`)
  - secret-bearing custom provider persistence
- **`CustomLlmProviderRuntimeSyncService`**
  (`src/llm-management/llm-providers/services/custom-llm-provider-runtime-sync-service.ts`)
  - load/sync saved custom providers into runtime state
  - expose per-provider reload status
- **`ModelCatalogService`**
  (`src/llm-management/services/model-catalog-service.ts`)
  - runtime-kind-aware catalog read/reload entry point
- **`AutobyteusModelCatalog`**
  (`src/llm-management/services/autobyteus-model-catalog.ts`)
  - main AUTOBYTEUS runtime LLM catalog facade

## Public GraphQL Contract

The GraphQL boundary stays provider-centered through
`src/api/graphql/types/llm-provider.ts`.

### Queries

- `availableLlmProvidersWithModels(runtimeKind?)`
- `availableAudioProvidersWithModels(runtimeKind?)`
- `availableImageProvidersWithModels(runtimeKind?)`
- `getLlmProviderApiKeyConfigured(providerId)`
- `getGeminiSetupConfig()`

### Mutations

- `setLlmProviderApiKey(providerId, apiKey)`
- `probeCustomLlmProvider(input)`
- `createCustomLlmProvider(input, runtimeKind?)`
- `deleteCustomLlmProvider(providerId, runtimeKind?)`
- `reloadLlmProviderModels(providerId, runtimeKind?)`
- `reloadLlmModels(runtimeKind?)`
- `setGeminiSetupConfig(...)`

### Provider Read Model

`ProviderWithModels.provider` is a provider object, not a plain enum/string:

- `id`
- `name`
- `providerType`
- `isCustom`
- `baseUrl`
- `apiKeyConfigured`
- `status`
- `statusMessage`

`ProviderWithModels.models[*]` carries provider-owned model metadata:

- `modelIdentifier`
- `providerId`
- `providerName`
- `providerType`
- `runtime`
- optional host/config/token-limit fields

## Built-In vs. Custom Providers

### Built-In Providers

- Built-in provider IDs are stable enum-backed values such as `OPENAI`,
  `ANTHROPIC`, `GEMINI`, `LMSTUDIO`, and `OLLAMA`.
- Secret writes remain write-only through `setLlmProviderApiKey(...)`.
- Readback exposes configured status only (`apiKeyConfigured`), not raw secret
  values.
- Gemini keeps its special setup modes, but it still projects into the same
  provider-centered list.

### Custom Providers

- Custom providers are currently limited to
  `providerType = OPENAI_COMPATIBLE`.
- Each saved custom provider gets its own stable provider ID
  (`provider_<uuid>`), name, base URL, and API key.
- Custom providers are returned in the same provider list as built-ins.
- Saved custom providers can be removed through
  `deleteCustomLlmProvider(providerId, runtimeKind?)`; built-ins remain
  non-deletable.
- The public API does **not** expose a separate top-level
  `openaiCompatibleEndpoints` subject anymore.

## Persistence

Custom providers are stored in the app data directory under:

```text
<app-data-dir>/llm/custom-llm-providers.json
```

The stored schema is owned by `autobyteus-ts/src/llm/custom-llm-provider-config.ts`
and currently contains:

- `version`
- `providers[]`
  - `id`
  - `name`
  - `providerType`
  - `baseUrl`
  - `apiKey`

## Custom Provider Lifecycle

### Create

1. The user submits a draft `{ name, providerType, baseUrl, apiKey }`.
2. `LlmProviderService` normalizes and validates the input:
   - required strings
   - normalized absolute `http://` or `https://` base URL
   - supported provider type (`OPENAI_COMPATIBLE`)
   - provider-name uniqueness across built-ins and existing custom providers
3. Probe uses the OpenAI-compatible `/models` discovery owner before save.
4. On successful create, the custom provider is persisted.
5. The server triggers provider-targeted model refresh through the real model
   catalog path.

### Delete

1. `deleteCustomLlmProvider(providerId, runtimeKind?)` rejects built-in
   provider IDs and validates that the custom provider exists for the requested
   runtime kind.
2. `CustomLlmProviderStore.deleteProvider(...)` removes the persisted record
   from `custom-llm-providers.json`.
3. The server then triggers an authoritative full LLM catalog refresh through
   `reloadLlmModels(runtimeKind?)` so the deleted provider and its models
   disappear from the served provider list and runtime registry.

## Runtime Sync and Status

Saved custom providers are synced into runtime state by
`CustomLlmProviderRuntimeSyncService`, which delegates to
`LLMFactory.syncOpenAICompatibleEndpointModels(...)`.

Per-provider status is projected as:

- `READY`
- `STALE_ERROR`
- `ERROR`
- `NOT_APPLICABLE` (built-ins only)

Behavior:

- successful probe/load => `READY`
- previously healthy provider fails later => `STALE_ERROR` and keeps
  last-known-good models
- provider that has never loaded successfully => `ERROR`
- built-ins => `NOT_APPLICABLE`
- provider removed from the saved provider set => it disappears on the next
  authoritative sync and remains absent after cold start

This preserves healthy providers during warm-cache failures and avoids wiping
the whole custom-provider slice when one endpoint is broken.

## Reload Behavior

- `reloadLlmModels(runtimeKind?)`
  - full catalog refresh for the active runtime kind
- `reloadLlmProviderModels(providerId, runtimeKind?)`
  - custom providers: resync saved providers and return the target provider's
    current model count
  - reloadable built-ins (`LMSTUDIO`, `OLLAMA`, `AUTOBYTEUS`): refresh through
    `LLMFactory.reloadModels(...)`
  - other built-ins: return current model count without a special reload path
- `deleteCustomLlmProvider(providerId, runtimeKind?)`
  - removes the saved custom-provider record first
  - then runs a full LLM catalog refresh so deleted-provider models are removed
    from the authoritative catalog and fresh-process startup state

Custom providers are available only for `runtimeKind = AUTOBYTEUS`. Other
runtime kinds keep their own model catalogs and do not project custom provider
records.
