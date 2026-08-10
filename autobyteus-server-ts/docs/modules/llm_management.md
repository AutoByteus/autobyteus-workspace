# LLM Management

## Scope

Provider lifecycle, model-catalog reads, provider-targeted reload, centralized
provider credential writes/status, and custom OpenAI-compatible provider
metadata persistence/sync for the TypeScript server. This module also owns the
native Qwen Base URL/API-key setup command and its value-free status projection.

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
  - native Qwen endpoint/key probe, durable pair save, and setup status
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
- `qwenSetupStatus()`

They are not API-key Settings credential authorities.

`qwenSetupStatus()` is the Qwen-specific setup authority. It returns only
`effectiveBaseUrl`, server-owned `endpointSource = DEFAULT | CONFIGURED`, and
`apiKeyConfigured`. Endpoint source is based on whether `QWEN_BASE_URL` was
explicitly saved, not on comparing its value with the built-in default URL.

### Mutations

- `saveProviderApiKey(providerId, apiKey)` -> Boolean
- `saveQwenConfiguration({ baseUrl, apiKey })` -> `QwenSetupStatus`
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

Qwen must use `saveQwenConfiguration`; the generic API-key mutation rejects the
`QWEN` provider. The Qwen command normalizes and probes the submitted
OpenAI-compatible endpoint before changing persisted state. It then retains the
previous Qwen secret only in command scope, saves the new secret, and calls
strict `AppConfig.setDurably("QWEN_BASE_URL", ...)`. Success is returned only
after that file commit. If the URL commit fails, the command restores or removes
the key and returns the sanitized
`QWEN_CONFIGURATION_SAVE_FAILED_PREVIOUS_RESTORED` error. If that bounded
compensation also fails, it returns `QWEN_CONFIGURATION_REPAIR_REQUIRED` and
does not claim rollback. GraphQL exposes only the approved code/message; raw
secrets, provider payloads, filesystem details, and internal exceptions remain
private.

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

For custom OpenAI-compatible models, the numeric context/input/output fields
and their non-secret resolution state are carried from `autobyteus-ts` model
metadata. Endpoint-advertised values are `LIVE`; exact built-in-value fallbacks
are exposed as the coarse `CURATED_FALLBACK` provenance; unmatched fields
remain nullable and `CURATED_ONLY`. The GraphQL contract intentionally does not
expose raw `/models` payloads or API keys. Custom resolution never inspects the
endpoint URL and does not perform alias, suffix, family, or fuzzy matching.

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
- Qwen is the built-in exception to the ordinary key-only save path. Its
  effective OpenAI-compatible endpoint is resolved from explicit
  `QWEN_BASE_URL` or the core default, while its API key remains in the encrypted
  provider vault. The endpoint and replacement key are always submitted
  together through the dedicated Qwen command.
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
  metadata vault lookup and no metadata HTTP request, so its API key is never
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
- Each saved custom provider gets an immutable readable ID derived from its
  normalized display name, for example `provider_alibaba_cloud`. ASCII words
  and deterministic non-ASCII `u<hex>` tokens form the ID body. There is no
  UUID, counter, or collision suffix.
- The store atomically enforces canonical-name and derived-ID uniqueness.
  Invalid derivation, built-in-name conflicts, or collisions fail creation
  without committing provider metadata or a readable-ID credential.
- The provider record contains its name, server-owned `OPENAI_COMPATIBLE`
  type/runtime, and Base URL. Its API key is stored separately by Secret
  Management.
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

The current file version is `3` and is metadata-only. Every stored ID must equal
the deterministic ID derived from its stored name, and canonical names and IDs
must be unique. Credentials are stored in
the encrypted vault inside the current application database under the custom
provider's stable definition ID. See [Secret Management](./secret_management.md).

Native Qwen does not use the custom-provider JSON file. Its API key is stored in
the built-in Qwen vault slot, while `QWEN_BASE_URL` is stored in the server's
owned environment-assignment file through `AppConfig`. The strict write path
writes and syncs a same-directory temporary file, renames it over the target,
and updates `AppConfig`/`process.env` only after the rename succeeds. It reuses
the latest-base shared assignment-line parser while leaving database URL
normalization under `ApplicationDatabaseLocation`/`toPrismaSqliteUrl`.

### Readable-Identity Reset From Legacy V1/V2

Normal runtime is strict V3 only. Startup reaches it through two ordered,
required app-data migrations after the application database and vault are
ready:

1. The bounded V1 migration never transfers an inline credential. Valid V1 is
   staged as secretless V2 metadata with a reconfiguration warning; invalid or
   unsafe V1 is reset through the existing sanitized failure path.
2. The final `20260803_custom_provider_readable_identity` migration uses valid
   V2 names only to derive transient old-to-readable selector prefixes. It
   attempts the exact allowlisted active/default/resumable selectors, then
   atomically publishes `{version:3, providers:[]}` as the commit point.
3. After empty V3 is durable, old UUID vault consumers are removed best effort
   by identity. Their values are never resolved, copied, re-encrypted, aliased,
   or used as runtime fallback.

The readable migration first requires terminal success
(`SUCCEEDED | SUCCEEDED_WITH_WARNINGS`) for the exact V1, global-skill-mode,
team-member-tree, token provider-name snapshot, and self-evolution metadata
migrations. This keeps the token snapshot and every current selector writer
ahead of the reset. The readable migration is the final current required
definition, and server startup proceeds only when its own result is terminal
success/warnings.

Selector rewriting is deliberately narrow. It changes only the exact old
`openai-compatible:<providerId>:` prefix while preserving the model suffix
byte-for-byte in:

- agent/team default launch configuration;
- external-channel launch presets;
- application agent/team/default/member launch-profile rows;
- agent/team resumable run metadata; and
- skill-improvement sessions.

Traces, free text, token identifiers, arbitrary JSON keys, and unrelated
indexes are not rewritten. Each JSON target uses same-directory durable
replacement and each application database uses one SQLite transaction.
Malformed, read-only, unsafe, or concurrently changed individual targets are
left stale with sanitized warnings; empty V3 still publishes. Provider-file
publication failure is fatal.

After reset there is intentionally a provider-absent interval: no legacy
provider record, Base URL, migrated credential, custom catalog group, UUID
alias, or reconnect state exists. The user recreates a provider through the
ordinary form. The same canonical name derives the prefix already stored in
migrated selectors; a different name or absent model suffix requires manual
reselection. Missing selectors remain stored and visible as unavailable and
must never silently fall back or clear.

There is no journal, backup, receipt, special runner bypass, dual V2/V3 runtime
reader, or immediate-crash recovery protocol. Interruption before empty V3
leaves V2 authoritative; after the ordinary runner's recent-`RUNNING` window,
idempotent retry converges. Interruption or cleanup failure after empty V3 can
leave an unreachable old-secret orphan and returns warning success rather than
re-enabling legacy identity.

## Custom Provider Lifecycle

### Probe And Create

1. The user submits exactly `{ name, baseUrl, apiKey }`. Provider type and
   runtime are server-owned constants.
2. `LlmProviderService` normalizes/validates required strings and an absolute
   `http://` or `https://` Base URL. The store derives the readable ID and owns
   atomic canonical-name/ID uniqueness across built-ins and existing custom
   providers.
3. Probe uses the OpenAI-compatible `/models` discovery owner and returns only
   discovered `{ id, name }` rows.
4. Create persists V3 metadata and the credential, returning only the assigned
   readable provider ID. A failed credential write rolls back the metadata
   record; rejected create leaves neither provider nor readable-ID secret.
5. The client refetches canonical `providerSettings`; no echoed input,
   provider-type constant, runtime constant, or parallel outcome DTO is
   returned.

### Delete

1. `deleteCustomProvider(providerId)` rejects built-in IDs and verifies that the
   custom provider exists.
2. `SecretManagementService.removeForConsumer(...)` removes the credential.
3. `CustomLlmProviderStore.deleteProvider(...)` removes metadata from
   `custom-llm-providers.json`.
4. The server uses the targeted custom-provider reload/synchronization boundary
   so the deleted provider disappears from runtime/catalog state without
   invoking unrelated AutoByteus remote discovery. The client then refetches
   `providerSettings`.

Delete is idempotent at the owning service boundary. Failures use GraphQL
errors rather than a second status protocol. Vault removal, provider-record
deletion, and targeted custom-provider synchronization failures remain visible;
the targeted path does not globally swallow intrinsic failures.

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
  - then reloads only the targeted custom-provider boundary so deleted-provider
    models are removed from authoritative runtime/catalog state
  - does not depend on or suppress failures from unrelated AutoByteus remote
    discovery

Custom providers are available only for `runtimeKind = AUTOBYTEUS`. Other
runtime kinds keep their own model catalogs and do not project custom provider
records.
