# LLM Management

## Scope

Provider lifecycle, model-catalog reads, provider-targeted reload, centralized
provider credential writes/status, and custom OpenAI-compatible provider
metadata persistence/sync for the TypeScript server. This module also owns the
native Qwen Base URL/API-key setup command and its value-free status projection.

## TS Source

- `src/api/graphql/types/llm-provider.ts`
- `src/api/graphql/types/llm-provider-model-catalog.ts`
- `src/llm-management/services/model-catalog-service.ts`
- `src/llm-management/services/dynamic-model-source-lifecycle.ts`
- `src/llm-management/services/model-availability-service.ts`
- `src/llm-management/services/autobyteus-remote-model-discovery-service.ts`
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
  - prepare one saved custom provider's source-owned rows
  - convert successful probe/discovery payloads without owning lifecycle state
- **`ModelCatalogService`**
  (`src/llm-management/services/model-catalog-service.ts`)
  - runtime-kind-aware local snapshot and provider ensure/reload facade
  - setting/credential invalidation and exact source-owned registry commits
- **`DynamicModelSourceLifecycle`**
  (`src/llm-management/services/dynamic-model-source-lifecycle.ts`)
  - one fingerprint, generation, single-flight operation, and status per source
  - stale-result fencing and last-known-good failure semantics
- **`ModelAvailabilityService`**
  (`src/llm-management/services/model-availability-service.ts`)
  - construction-time exact dynamic-source resolution and ensure-after-restart
  - full configured-endpoint validation for host-scoped identifiers
- **SDK LLM/audio/image/video factories**
  - authoritative in-process model registries
  - atomic `replaceSourceModels`/`removeSourceModels` ownership for dynamic rows

## Public GraphQL Contract

The GraphQL boundary stays provider-centered through
`src/api/graphql/types/llm-provider.ts`.

### API-Key Settings Queries

Credential state and model state have separate public reads:

```text
providerCredentialSettings(runtimeKind?) -> ProviderCredentialSetting[]
ProviderCredentialSetting {
  provider: CatalogProvider
  apiKeyConfigured: Boolean
}

providerModelCatalogSnapshots(runtimeKind?) -> ProviderModelCatalogSnapshot[]
ProviderModelCatalogSnapshot {
  runtimeKind: String
  ownerProvider: CatalogProvider
  sources: ModelSourceStatus[]
  llmModels: ModelDetail[]
  audioModels: ModelDetail[]
  imageModels: ModelDetail[]
  videoModels: ModelDetail[]
}
```

`CatalogProvider` exposes `id`, `name`, `providerType`, `isCustom`, nullable
`baseUrl`, and `catalogMode = STATIC | DISCOVERED`. The credential query
computes one value-free `apiKeyConfigured` fact per provider and performs no
model discovery. Secret values are never returned.

The snapshot query initializes static SDK registries without network access and
projects their current rows. It does not ensure or reload a dynamic source;
cold discovered sources appear as `IDLE` with empty rows. Dynamic source status
is capability-specific and exposes `modelKind`, `state`, model/success/failure
counts, and a nullable safe message. Model rows remain owned by the SDK
registries; `ModelCatalogService` maintains no duplicate aggregate row cache.

For Claude Agent SDK and Codex app-server runtime kinds, the same snapshot
shape groups their runtime-owned LLM rows as static providers. Custom providers
and provider ensure/reload are available only for the AutoByteus runtime.

### Other Queries

Specialized setup reads remain separate:

- `getGeminiSetupConfig()`
- `qwenSetupStatus()`

`qwenSetupStatus()` is the Qwen-specific setup authority. It returns only
`effectiveBaseUrl` and server-owned `endpointSource = DEFAULT | CONFIGURED`.
Credential status comes from `providerCredentialSettings`. Endpoint source is
based on whether `QWEN_BASE_URL` was explicitly saved, not on comparing its
value with the built-in default URL.

### Mutations

- `ensureProviderModelCatalog(providerId, runtimeKind?)` -> one current
  `ProviderModelCatalogSnapshot`
- `reloadProviderModelCatalog(providerId, runtimeKind?)` -> one forced current
  `ProviderModelCatalogSnapshot`
- `saveProviderApiKey(providerId, apiKey)` -> `ProviderCredentialSetting`
- `saveQwenConfiguration({ baseUrl, apiKey })` ->
  `{ setup, credentialSetting }`
- `probeCustomProvider(input)` -> discovered `{ id, name }` models only
- `createCustomProvider(input)` -> `ProviderCredentialSetting`
- `deleteCustomProvider(providerId)` -> `{ providerId, deleted }`
- `saveGeminiAiStudio(apiKey, activateAfterSave)`
- `saveGeminiVertexExpress(apiKey, activateAfterSave)`
- `saveGeminiVertexProject(project, location, activateAfterSave)`
- `useGeminiMode(mode)`

Gemini mutations return the exact setup plus updated credential setting.
Ordinary failures use the typed GraphQL error path rather than a parallel
outcome, instruction-code, or generic status-message protocol.

The old aggregate `providerSettings`, four `available*ProvidersWithModels`
queries, global capability reloads, and provider-specific LLM-only reload are
removed from the current schema. There are no compatibility aliases or fan-out
wrappers. Static providers do not support forced reload; the public product
control is present only for a `DISCOVERED` provider.

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
private. Success returns the committed setup and credential setting directly;
it does not await or require a model-catalog refresh because Qwen rows are
static.

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

### Persisted Run Model-Configuration Validation

`ModelConfigValidationService` is the server authority for stopped existing-run
`llmConfig` updates. It resolves the exact persisted runtime kind and model
identifier through `ModelCatalogService`, normalizes either supported catalog
schema representation, and validates only submitted current-schema keys. It
returns distinct model-unavailable, schema-unavailable, and field-validation
results; it does not guess a replacement model, silently drop an unsupported
key, or write a rendered default merely because the UI displayed it.

The validation boundary is shared by standalone and Team stopped updates. Team
patches validate independently against every target scope's fixed runtime/model.
Only validated `llmConfig` reaches persistence; runtime/model selection remains
immutable for an existing run.

Runtime application remains bootstrap/session owned. AutoByteus receives the
persisted config during LLM creation, Codex maps `reasoning_effort` and
`service_tier` into thread configuration, and Claude maps supported
`thinking_enabled` and `reasoning_effort` values into SDK `thinking` and
`effort` query options while retaining the same Claude session UUID. Catalog
capabilities expose Claude thinking and effort fields only when the installed
SDK model descriptor supports them. Editing never hot-mutates an already-live
backend; an eligible later restore consumes the saved configuration.

### Claude Agent SDK Model Descriptions

The Claude Agent SDK catalog reads the live `supportedModels()` response and
normalizes each non-empty description independently from the alias display name
and identifier. The nullable value is carried through the shared `ModelInfo`
contract and exposed as `ModelDetail.description` by
`providerModelCatalogSnapshots(runtimeKind: "claude_agent_sdk")`.

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
  `gemini-3.7-flash` should surface through that path rather than through a
  duplicate server-side Gemini model list.

#### Current curated text catalog boundary

The current curated flagship entries for this release are `grok-4.6`,
`gemini-3.7-flash`, `kimi-k3`, `glm-5.3`, and `minimax-m3` (the provider value
for the last entry remains `MiniMax-M3`). Retired Grok 4.5, pre-3.7 Gemini
Flash, Kimi K2, GLM 5.2, and older MiniMax text entries are not aliases: a
persisted selection using one of those IDs is rejected and requires explicit
user reselection. Provider-specific schemas and request adapters are updated
together; callers must not reconstruct retired defaults or silently translate
them to a current model.

Required provider credentials are resolved before a provider request. A missing
or blank key has the stable `missing_api_key` category and an actionable
provider-configuration message; vault health failures and provider responses
remain separate failure categories. Provider failures preserve the safe
original message after secret redaction. Native AgentRun/Team transport may
carry non-empty protocol `code` plus safe status, provider code, request ID,
and details, while the focused application-agent stream projects only the safe
message.

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
- Custom providers are returned with built-ins by both
  `providerCredentialSettings` and `providerModelCatalogSnapshots` for the
  AutoByteus runtime. Their catalog mode is `DISCOVERED`.
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
4. Create validates and probes the submitted input, persists V3 metadata and
   the credential, and seeds the exact provider source from that successful
   discovery result. It does not perform a second post-create discovery request.
   A failed credential or seed commit rolls back metadata/credential state;
   rejected create leaves neither provider nor readable-ID secret.
5. Create returns the assigned provider descriptor plus value-free configured
   state. The client applies that credential setting and refreshes only the
   local snapshot projection; no aggregate provider/catalog refetch is needed.

### Delete

1. `deleteCustomProvider(providerId)` rejects built-in IDs and verifies that the
   custom provider exists.
2. `SecretManagementService.removeForConsumer(...)` removes the credential.
3. `CustomLlmProviderStore.deleteProvider(...)` removes metadata from
   `custom-llm-providers.json`.
4. The server removes the exact custom source lifecycle and registry rows, so
   the provider disappears without invoking unrelated AutoByteus discovery.
   The client fences any older provider request and removes the exact credential
   and snapshot entries locally.

Delete is idempotent at the owning service boundary. Failures use GraphQL
errors rather than a second status protocol. Vault removal, provider-record
deletion, and targeted custom-provider synchronization failures remain visible;
the targeted path does not globally swallow intrinsic failures.

## Runtime Sync and Status

`DynamicModelSourceLifecycle` owns state per provider and model kind. A source
has one exact fingerprint, one in-flight operation, generation fencing, and one
of `IDLE`, `LOADING`, `READY`, `PARTIAL`, `REFRESHING`, `STALE_ERROR`, or
`ERROR`. A non-forcing ensure joins an in-flight request and reuses a completed
attempt for the current fingerprint. Forced Reload starts a new generation.
Only the current generation may atomically replace that source's rows.

Successful preparation commits the complete source slice. Partial AutoByteus
host results commit deterministically ordered successful rows with `PARTIAL`.
A failed first attempt is `ERROR`; a failed refresh with rows from a successful
prior fingerprint is `STALE_ERROR` and retains only those last-known-good rows.
No source failure wipes another provider or model kind.

## Ensure, Reload, And Invalidation Behavior

- `providerModelCatalogSnapshots(runtimeKind?)` is a local read. It never starts
  discovery.
- `ensureProviderModelCatalog(providerId, runtimeKind?)` starts or joins only
  the target discovered provider when its fingerprint has not been attempted.
  A static provider simply returns its current snapshot without network work.
- `reloadProviderModelCatalog(providerId, runtimeKind?)` forces only the target
  `DISCOVERED` provider. Calling it for a static provider is rejected.
- `AUTOBYTEUS` owns three source keys (LLM/audio/image). Its provider operation
  prepares them concurrently; remote hosts are attempted concurrently with a
  30-second per-host deadline and deterministic aggregation.
- `OLLAMA` and `LMSTUDIO` each own one LLM source. Every custom provider owns
  one exact OpenAI-compatible LLM source.
- A committed `AUTOBYTEUS_LLM_SERVER_HOSTS`, `OLLAMA_HOSTS`, or
  `LMSTUDIO_HOSTS` change invalidates and clears only the mapped source rows,
  then starts a detached non-forcing ensure. A full normalized endpoint,
  including scheme/path/query, is the fingerprint authority.
- A committed AutoByteus credential change invalidates only the AutoByteus
  sources, retains current rows while their exact replacement refreshes, and
  starts the source operations without delaying credential-command success.
- Custom create seeds its warm source from the successful create probe; after
  restart, the first ensure performs discovery. Delete removes the exact source
  immediately.

There is no global catalog Reload or cross-provider FIFO. Custom providers are
available only for `runtimeKind = AUTOBYTEUS`; other runtime kinds expose their
own static LLM snapshots and reject dynamic-provider operations.

Before construction, `ModelAvailabilityService` first accepts an already
registered model. If a persisted dynamic identifier is missing after restart,
it parses the exact source, verifies a unique full configured endpoint, ensures
only that provider, and rechecks the registry. Zero or ambiguous endpoint
matches remain unavailable rather than falling back by authority or triggering
an all-provider refresh. Video models are static and have no dynamic ensure or
reload path.
