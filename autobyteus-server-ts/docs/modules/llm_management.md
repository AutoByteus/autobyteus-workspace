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

### API-Key Settings Query

`providerSettings(runtimeKind?)` is the sole read authority for Settings -> API
Key Management. It returns each provider exactly once as:

```text
ProviderSettingsGroup {
  provider: LlmProviderObject
  llmModels: ModelDetail[]
  audioModels: ModelDetail[]
  imageModels: ModelDetail[]
  videoModels: ModelDetail[]
}
```

`LlmProviderObject` retains the existing provider identity/catalog fields:

- `id`, `name`, `providerType`, `isCustom`, and nullable `baseUrl`;
- provider-owned `apiKeyConfigured` Boolean;
- `status` and nullable `statusMessage` for catalog/runtime state.

`apiKeyConfigured` is computed once by the exact provider owner. It is never
copied from one capability occurrence or another provider. The four model lists
reuse the existing non-null `ModelDetail` contract and use `[]` when the
provider has no models in that capability. The web consumes this grouped
collection directly and maintains no four-array merge or second credential map.

After a save command returns Boolean completion, the client refetches
`providerSettings` for authoritative state. Secret values are never returned.

### Other Queries

The established catalog queries remain supported for model selectors, media
defaults, history, workspace, and other non-Settings consumers:

- `availableLlmProvidersWithModels(runtimeKind?)`
- `availableAudioProvidersWithModels(runtimeKind?)`
- `availableImageProvidersWithModels(runtimeKind?)`
- `availableVideoProvidersWithModels(runtimeKind?)`
- `getGeminiSetupConfig()`

They are not API-key Settings credential authorities.

### Mutations

- `saveProviderApiKey(providerId, apiKey)` -> Boolean
- `probeCustomProvider(input)` -> discovered `{ id, name }` models only
- `createCustomProvider(input)` -> assigned provider ID only
- `deleteCustomProvider(providerId)` -> Boolean
- `saveGeminiAiStudio(apiKey, activateAfterSave)`
- `saveGeminiVertexExpress(apiKey, activateAfterSave)`
- `saveGeminiVertexProject(project, location, activateAfterSave)`
- `useGeminiMode(mode)`
- `reloadLlmProviderModels(providerId, runtimeKind?)`
- `reloadLlmModels(runtimeKind?)`

Gemini mutations return the same exact `GeminiSetupStateObject`; ordinary
failures use the typed GraphQL error path rather than a parallel outcome,
instruction-code, or generic status-message protocol.

### Model Detail

Every capability list carries the existing provider-owned `ModelDetail`:

- `modelIdentifier`, `name`, `value`, and `canonicalName`;
- nullable `description` display metadata;
- `providerId`, `providerName`, `providerType`, and `runtime`;
- optional host/config/token-limit fields;
- nullable `metadataProvenance`.

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

### Claude Agent SDK Authentication

`CLAUDE_AGENT_SDK_AUTH_MODE` preserves the existing `auto|cli|api-key`
selector, with blank/invalid input defaulting to `cli`. `auto` and `cli` do not
resolve the Anthropic vault slot and retain established caller-environment and
Claude account/configuration behavior. Only explicit `api-key` resolves the
`agentRuntime/claude_agent_sdk/apiKey` consumer immediately before launch and
replaces `ANTHROPIC_API_KEY` in the otherwise unchanged launch environment.
This is credential substitution at the existing use point, not child-process
isolation; baseline tools, MCP/session behavior, and external Codex behavior
remain unchanged.

## Built-In vs. Custom Providers

### Built-In Providers

- Built-in provider IDs are stable enum-backed values such as `OPENAI`,
  `ANTHROPIC`, `GEMINI`, `LMSTUDIO`, and `OLLAMA`.
- Secret writes remain write-only through `saveProviderApiKey(...)`; ordinary
  built-in provider Settings exposes no standalone credential-removal action.
- Readback exposes only provider-owned `apiKeyConfigured`; raw secret values are
  never returned.
- Gemini keeps three exact construction modes while projecting into the same
  provider-centered list: AI Studio supplies `{apiKey}`, Vertex Express
  supplies `{vertexai: true, apiKey}`, and Vertex Project supplies
  `{vertexai: true, project, location}`. No mode may silently fall back to another configured option; the explicit
  `GEMINI_SETUP_MODE` is the sole activation authority.
- The Autobyteus runtime model catalog delegates built-in LLM entries to the
  `autobyteus-ts` `LLMFactory`; package-level additions such as
  `gemini-3.5-flash` should surface through that path rather than through a
  duplicate server-side Gemini model list.

Gemini metadata intentionally remains distinct from LLM/media SDK mode:

- **AI Studio** is the only live-capable metadata strategy. It resolves only
  the exact AI Studio metadata consumer and calls the documented Gemini
  Developer API models endpoint. A matching live record is reported as
  `LIVE`. An unavailable credential/provider, request failure or timeout, or a
  response without the matching record retains curated values and reports
  `CURATED_FALLBACK`.
- **Vertex Express** is `CURATED_ONLY`. Model-list metadata performs no Gemini
  metadata Store lookup and no metadata HTTP request, so its API key is never
  sent to the Gemini Developer API endpoint.
- **Vertex Project** is also `CURATED_ONLY` and performs no metadata credential
  lookup or metadata HTTP request.

GraphQL exposes the resulting value-free provenance as nullable
`ModelDetail.metadataProvenance`. Curated data must not be described as live
provider metadata. These metadata strategies do not change the three exact
LLM/media SDK construction modes and do not authorize credential, endpoint, or
mode fallback.

### Custom Providers

- Custom providers are currently limited to
  `providerType = OPENAI_COMPATIBLE`.
- Each saved custom provider gets its own stable provider ID
  (`provider_<uuid>`), name, server-owned `OPENAI_COMPATIBLE` type/runtime, and
  base URL. Its API key is stored separately by Secret Management.
- Custom providers are returned in the same `providerSettings` collection as
  built-ins.
- Saved custom providers can be removed through
  `deleteCustomProvider(providerId)`; built-ins remain non-deletable.
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
the encrypted vault inside the current application database under the custom
provider's stable definition ID. See [Secret Management](./secret_management.md).

### Upgrade From The Supported V1 File

Startup has one bounded transition for the canonical version-1 custom-provider
file created by the supported pre-vault application. It runs after the
application database and vault are ready and before normal provider discovery:

- a complete valid v1 set migrates all providers atomically, preserving IDs and
  names, storing credentials in the vault, and publishing secret-free v2
  metadata;
- an invalid, duplicated, unsafe, or vault-colliding set is not partially
  preserved; the plaintext v1 file is removed and the user re-adds providers
  through **New Provider**;
- if the v1 file cannot be removed safely, built-in providers and general
  Settings remain available, but custom-provider creation remains unavailable
  until the filesystem issue is fixed and the application restarts;
- an aged zero-byte lock left by the supported v1 writer can be reclaimed,
  while a live positive-PID owner is never displaced.

Normal runtime remains v2-only. There is no v1 compatibility reader, backup or
quarantine copy, alternate legacy source, automatic `.env` import, or partial
provider migration. Migration outcomes and APIs remain value-free.

## Custom Provider Lifecycle

### Probe And Create

1. The user submits exactly `{ name, baseUrl, apiKey }`. Provider type and
   runtime are server-owned constants.
2. `LlmProviderService` normalizes/validates required strings, an absolute
   `http://` or `https://` base URL, and provider-name uniqueness across
   built-ins and existing custom providers.
3. Probe uses the OpenAI-compatible `/models` discovery owner and returns only
   discovered `{ id, name }` rows.
4. Create persists metadata and the credential, returning only the assigned
   provider ID. A failed credential write rolls back the metadata record.
5. The client refetches canonical `providerSettings`; no echoed input,
   provider-type constant, runtime constant, or parallel outcome DTO is
   returned.

### Delete

1. `deleteCustomProvider(providerId)` rejects built-in IDs and verifies that the
   custom provider exists.
2. `SecretManagementService.removeForConsumer(...)` removes the credential.
3. `CustomLlmProviderStore.deleteProvider(...)` removes metadata from
   `custom-llm-providers.json`.
4. The server refreshes the authoritative LLM catalog, and the client refetches
   `providerSettings` so the provider and models disappear.

Delete is idempotent at the owning service boundary. Failures use GraphQL
errors rather than a second status protocol.

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
- `deleteCustomProvider(providerId)`
  - removes the saved custom-provider record first
  - then runs a full LLM catalog refresh so deleted-provider models are removed
    from the authoritative catalog and fresh-process startup state

Custom providers are available only for `runtimeKind = AUTOBYTEUS`. Other
runtime kinds keep their own model catalogs and do not project custom provider
records.
