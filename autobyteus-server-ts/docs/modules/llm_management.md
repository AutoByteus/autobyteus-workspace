# LLM Management

## Scope

Provider lifecycle, model-catalog reads, provider-targeted reload, centralized
provider credential writes/status, and custom OpenAI-compatible provider
metadata persistence/sync for the TypeScript server.

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
- **`SecretManagementService`**
  (`src/secret-management/services/secret-management-service.ts`)
  - write-only provider credential lifecycle and value-free status
  - catalog-authorized just-in-time credential resolution
- **`CustomLlmProviderStore`**
  (`src/llm-management/llm-providers/stores/custom-llm-provider-store.ts`)
  - metadata-only custom provider persistence
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
- `availableVideoProvidersWithModels(runtimeKind?)`
- `getLlmProviderCredentialStatus(providerId)`
- `getGeminiSetupConfig()`

### Mutations

- `setLlmProviderApiKey(providerId, apiKey)`
- `removeLlmProviderApiKey(providerId)`
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
- `credentialStatus`
  - `backendHealth`
  - nullable `storageState`
  - nullable `lifecycle`
  - nullable `instructionCode`
- `status`
- `statusMessage`

`ProviderWithModels.models[*]` carries provider-owned model metadata:

- `modelIdentifier`
- `name`, `value`, and `canonicalName`
- nullable `description` display metadata
- `providerId`
- `providerName`
- `providerType`
- `runtime`
- optional host/config/token-limit fields

Model `description` is optional plain-text catalog metadata, not model identity.
Runtime-specific catalogs should preserve it when their authoritative discovery
source provides it, while callers must continue to support name-only rows.
`modelIdentifier` remains the executable and persisted selection value.

### Claude Agent SDK Model Descriptions

The Claude Agent SDK catalog reads the live `supportedModels()` response and
normalizes each non-empty description independently from the alias display name
and identifier. The nullable value is carried through the shared `ModelInfo`
contract and exposed as `ModelDetail.description` by
`availableLlmProvidersWithModels(runtimeKind: "claude_agent_sdk")`.

Descriptions can change with the installed Claude runtime, authenticated
account, or vendor catalog. Do not replace this path with curated model/version
copy and do not resolve aliases into different persisted identifiers. Frontend
runtime-model selectors may render and search the optional description as
selection guidance; missing descriptions remain valid name-only options.

## Built-In vs. Custom Providers

### Built-In Providers

- Built-in provider IDs are stable enum-backed values such as `OPENAI`,
  `ANTHROPIC`, `GEMINI`, `LMSTUDIO`, and `OLLAMA`.
- Secret writes/removals remain write-only through
  `setLlmProviderApiKey(...)` / `removeLlmProviderApiKey(...)`.
- Readback exposes value-free `credentialStatus`; raw secret values are never
  returned.
- Gemini keeps its special setup modes, but it still projects into the same
  provider-centered list.
- The Autobyteus runtime model catalog delegates built-in LLM entries to the
  `autobyteus-ts` `LLMFactory`; package-level additions such as
  `gemini-3.5-flash` should surface through that path rather than through a
  duplicate server-side Gemini model list.

### Custom Providers

- Custom providers are currently limited to
  `providerType = OPENAI_COMPATIBLE`.
- Each saved custom provider gets its own stable provider ID
  (`provider_<uuid>`), name, provider type, and base URL. Its API key is stored
  separately by Secret Management.
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

The current file version is `2` and is metadata-only. Credentials are stored in
the paired encrypted Local Store (or another selected backend) under the custom
provider's stable definition ID. See [Secret Management](./secret_management.md).

## Custom Provider Lifecycle

### Create

1. The user submits a draft `{ name, providerType, baseUrl, apiKey }`.
2. `LlmProviderService` normalizes and validates the input:
   - required strings
   - normalized absolute `http://` or `https://` base URL
   - supported provider type (`OPENAI_COMPATIBLE`)
   - provider-name uniqueness across built-ins and existing custom providers
3. Probe uses the OpenAI-compatible `/models` discovery owner before save.
4. On successful create, metadata is persisted and the credential is written
   through `SecretManagementService`. A failed credential write rolls back the
   metadata record.
5. The server triggers provider-targeted model refresh through the real model
   catalog path.

### Delete

1. `deleteCustomLlmProvider(providerId, runtimeKind?)` rejects built-in
   provider IDs and validates that the custom provider exists for the requested
   runtime kind.
2. `SecretManagementService.removeForConsumer(...)` removes the credential.
3. `CustomLlmProviderStore.deleteProvider(...)` removes the metadata record
   from `custom-llm-providers.json`.
4. The server then triggers an authoritative full LLM catalog refresh through
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
