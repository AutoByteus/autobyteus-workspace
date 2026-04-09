# Future-State Runtime Call Stacks (Debug-Trace Style)

## Design Basis

- Scope Classification: `Medium`
- Call Stack Version: `v3`
- Requirements: `tickets/in-progress/model-context-metadata/requirements.md` (status `Refined`)
- Source Artifact:
  - `tickets/in-progress/model-context-metadata/proposed-design.md`
- Source Design Version: `v3`
- Referenced Sections:
  - Spine inventory sections: `DS-001`, `DS-002`, `DS-003`, `DS-004`
  - Ownership sections: `Ownership Map`, `Final File Responsibility Mapping`

## Use Case Index (Stable IDs)

| use_case_id | Spine ID(s) | Spine Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Governing Owner | Source Type (`Requirement`/`Design-Risk`) | Requirement ID(s) | Design-Risk Objective (if source=`Design-Risk`) | Use Case Name | Coverage Target (Primary/Fallback/Error) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `UC-001` | `DS-001` | Primary End-to-End | `LLMModel` / `ModelInfo` | Requirement | `R-001`, `R-005`, `R-008` | N/A | Supported-model registry metadata flows through the normalized contract into server and frontend consumers | Yes/Yes/Yes |
| `UC-002` | `DS-002` | Primary End-to-End | `LMStudioModelProvider` | Requirement | `R-003` | N/A | LM Studio discovery publishes supported and active context metadata | Yes/N/A/Yes |
| `UC-003` | `DS-002` | Primary End-to-End | `OllamaModelProvider` | Requirement | `R-004` | N/A | Ollama discovery publishes supported and active context metadata | Yes/N/A/Yes |
| `UC-005` | `DS-003` | Primary End-to-End | metadata resolver selector | Requirement | `R-006` | N/A | Supported cloud models with official metadata APIs resolve token limits dynamically without changing support allowlisting | Yes/Yes/Yes |
| `UC-006` | `DS-003` | Primary End-to-End | curated metadata source | Requirement | `R-007` | N/A | Thin model-list APIs stay truthful through curated official metadata or explicit unknowns | Yes/Yes/Yes |
| `UC-007` | `DS-004` | Primary End-to-End | `resolveTokenBudget` | Requirement | `R-009` | N/A | Token budgeting remains safe when metadata is known, curated, or unknown | Yes/N/A/Yes |
| `UC-010` | `DS-003` | Primary End-to-End | supported-model registry owner | Requirement | `R-011` | N/A | Supported cloud registry, provider defaults, and hardcoded fixtures use only current official cloud-model IDs | Yes/Yes/Yes |

## Transition Notes

- Temporary migration behavior needed to reach target state:
  - existing supported-model entries may continue to exist in `LLMFactory`, but token-limit values for providers with live resolvers are retired from the registry during the same change set that introduces the resolver selector
- Retirement plan for temporary logic:
  - once live resolvers and curated metadata source are in place, no dual-path registry-stored token limits remain for supported cloud providers covered by those sources
  - once the latest-only refresh lands, provider defaults and hardcoded fixtures no longer preserve removed stale cloud-model IDs outside the authoritative registry

## Use Case: UC-001 [Supported Registry Metadata Propagation]

### Spine Context

- Spine ID(s): `DS-001`
- Spine Scope: `Primary End-to-End`
- Governing Owner: `autobyteus-ts/src/llm/models.ts:LLMModel.toModelInfo`
- Why This Use Case Matters To This Spine:
  - the main business value is lost if support allowlisting, metadata resolution, and normalized contract propagation are not preserved end to end
- Why This Spine Span Is Long Enough:
  - it begins at the supported-model registry, crosses metadata resolution and shared-contract normalization, and ends at the frontend consumer state

### Goal

Expose normalized model context metadata end to end without pushing provider-specific logic above `autobyteus-ts`.

### Preconditions

- `LLMFactory` has a supported-model registry entry for each product-supported API model
- the supported-model registry has already been refreshed to current official cloud-model IDs for the providers in scope
- metadata resolver selection is available for supported API and runtime-backed models
- `LLMModel` and `ModelInfo` expose normalized metadata fields

### Expected Outcome

GraphQL and frontend consumers receive `maxContextTokens`, `activeContextTokens`, `maxInputTokens`, and `maxOutputTokens` exactly as normalized in `autobyteus-ts`, while the supported-model registry remains the only place that decides product support.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-web/stores/llmProviderConfig.ts:fetchProvidersWithModels(runtimeKind)
├── autobyteus-web/utils/apolloClient.ts:getApolloClient() [ASYNC]
├── autobyteus-server-ts/src/api/graphql/types/llm-provider.ts:LlmProviderResolver.availableLlmProvidersWithModels(runtimeKind) [ASYNC]
│   ├── autobyteus-server-ts/src/llm-management/services/model-catalog-service.ts:ModelCatalogService.listLlmModels(runtimeKind) [ASYNC]
│   │   ├── autobyteus-server-ts/src/llm-management/services/autobyteus-model-catalog.ts:AutobyteusModelCatalog.listModels() [ASYNC]
│   │   │   └── autobyteus-server-ts/src/llm-management/providers/autobyteus-llm-model-provider.ts:AutobyteusLlmModelProvider.listModels() [ASYNC]
│   │   │       └── autobyteus-ts/src/llm/llm-factory.ts:LLMFactory.listAvailableModels() [ASYNC]
│   │   │           ├── autobyteus-ts/src/llm/llm-factory.ts:LLMFactory.ensureInitialized() [ASYNC]
│   │   │           └── autobyteus-ts/src/llm/models.ts:LLMModel.toModelInfo() [STATE]
│   └── autobyteus-server-ts/src/api/graphql/types/llm-provider.ts:mapLlmModel(model) [STATE]
└── autobyteus-web/stores/llmProviderConfig.ts:providersWithModels=... [STATE]
```

### Branching / Fallback Paths

```text
[FALLBACK] if a supported model has no trustworthy token metadata at resolution time
autobyteus-ts/src/llm/metadata/model-metadata-resolver.ts:resolveModelMetadata(supportedModel) [ASYNC]
└── return normalized null metadata fields instead of synthetic fallback values [STATE]
```

```text
[ERROR] if catalog loading throws for one provider or runtime host
autobyteus-server-ts/src/llm-management/providers/autobyteus-llm-model-provider.ts:AutobyteusLlmModelProvider.listModels() [ASYNC]
└── return [] for the failed provider/runtime path after logging, while preserving the global contract shape [ERROR]
```

### State And Data Transformations

- supported-model registry entry -> metadata source selection
- metadata source result -> normalized `LLMModel` metadata fields
- `LLMModel` -> exported `ModelInfo`
- `ModelInfo` -> GraphQL `ModelDetail`
- GraphQL response -> frontend `providersWithModels`

### Observability And Debug Points

- Logs emitted at:
  - metadata resolver failures that force `null` metadata
  - provider discovery adapter failures for one host/provider
  - registry initialization summary
- Metrics/counters updated at:
  - none currently in scope

### Design Smells / Gaps

- Any legacy/backward-compatibility branch present? `No`
- Any tight coupling or cyclic cross-subsystem dependency introduced? `No`
- Any naming-to-responsibility drift detected? `No`

### Open Questions

- Whether the normalized contract should later expose a metadata-source indicator is still deferred

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `Covered`

## Use Case: UC-002 [LM Studio Native Discovery]

### Spine Context

- Spine ID(s): `DS-002`
- Spine Scope: `Primary End-to-End`
- Governing Owner: `autobyteus-ts/src/llm/lmstudio-provider.ts:LMStudioModelProvider.getModels`
- Why This Use Case Matters To This Spine:
  - LM Studio is a local runtime where supported and active context are both available and operationally important
- Why This Spine Span Is Long Enough:
  - it spans from host-native metadata to registered shared-model representation consumed everywhere else

### Goal

Discover LM Studio models using the native metadata path so supported and loaded context are preserved.

### Preconditions

- `LMSTUDIO_HOSTS` resolves at least one reachable LM Studio host
- provider discovery is running during factory initialization or targeted reload

### Expected Outcome

Each discovered LM Studio `LLMModel` is registered with:

- `maxContextTokens` from LM Studio `max_context_length`
- `activeContextTokens` from loaded instance `config.context_length` when one truthful runtime value exists

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-ts/src/llm/llm-factory.ts:LLMFactory.initializeRegistry() [ASYNC]
├── autobyteus-ts/src/llm/lmstudio-provider.ts:LMStudioModelProvider.discoverAndRegister() [ASYNC]
│   └── autobyteus-ts/src/llm/lmstudio-provider.ts:LMStudioModelProvider.getModels() [ASYNC]
│       ├── autobyteus-ts/src/llm/lmstudio-provider.ts:LMStudioModelProvider.getHosts() [STATE]
│       ├── autobyteus-ts/src/llm/lmstudio-provider.ts:LMStudioModelProvider.fetchNativeModels(hostUrl) [IO]
│       ├── autobyteus-ts/src/llm/lmstudio-provider.ts:LMStudioModelProvider.resolveActiveContextTokens(nativeModel) [STATE]
│       └── autobyteus-ts/src/llm/models.ts:new LLMModel(...) [STATE]
└── autobyteus-ts/src/llm/llm-factory.ts:LLMFactory.registerModel(model) [STATE]
```

### Branching / Fallback Paths

```text
[ERROR] if the LM Studio host is unreachable or returns malformed metadata
autobyteus-ts/src/llm/lmstudio-provider.ts:LMStudioModelProvider.fetchNativeModels(hostUrl) [IO]
└── throw provider-scoped discovery error so the host is skipped and other hosts continue [ERROR]
```

### State And Data Transformations

- LM Studio native model JSON -> `key`, `max_context_length`, `loaded_instances[*].config.context_length`
- native fields -> normalized `LLMModel` metadata fields

### Observability And Debug Points

- Logs emitted at:
  - host discovery start
  - host-level connection or parsing failure
  - registration count summary

### Design Smells / Gaps

- Any legacy/backward-compatibility branch present? `No`
- Any tight coupling or cyclic cross-subsystem dependency introduced? `No`
- Any naming-to-responsibility drift detected? `No`

### Open Questions

- If multiple loaded instances of one model report different context lengths, the provider should publish `activeContextTokens = null` rather than invent one winner

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `Covered`

## Use Case: UC-010 [Latest-Only Cloud Support Policy]

### Spine Context

- Spine ID(s): `DS-003`
- Spine Scope: `Primary End-to-End`
- Governing Owner: `autobyteus-ts/src/llm/supported-model-definitions.ts`
- Why This Use Case Matters To This Spine:
  - the metadata pipeline remains misleading if the authoritative support registry and related direct call sites still expose stale or deprecated cloud-model IDs
- Why This Spine Span Is Long Enough:
  - it starts at the explicit support registry, crosses provider defaults and metadata lookup keys, and ends at the tests and catalog consumers that rely on those IDs

### Goal

Refresh the cloud support allowlist to current official model IDs and ensure direct provider defaults / fixtures cannot keep removed stale entries alive.

### Preconditions

- current provider catalog research is recorded in `investigation-notes.md`
- the latest-only support policy has been accepted in `requirements.md` and `proposed-design.md`

### Expected Outcome

For each supported cloud provider:

- stale or deprecated supported IDs are removed from the registry
- current official model IDs are present in the registry
- provider defaults, curated metadata keys, resolver lookup keys, and hardcoded live/integration fixtures use those current IDs

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-ts/src/llm/llm-factory.ts:buildSupportedModels() [ASYNC]
├── autobyteus-ts/src/llm/supported-model-definitions.ts:supportedModelDefinitions [STATE]
│   └── current official cloud-model IDs only [STATE]
├── autobyteus-ts/src/llm/metadata/model-metadata-resolver.ts:resolve(lookup) [ASYNC]
│   └── metadata lookup keys align with refreshed supported IDs [STATE]
├── autobyteus-ts/src/llm/api/*-llm.ts:provider default constructor [STATE]
│   └── direct provider defaults align to current supported IDs [STATE]
├── autobyteus-ts/tests/integration/... hardcoded live fixtures [STATE]
│   └── fixtures instantiate current supported IDs only [STATE]
└── autobyteus-ts/src/llm/models.ts:LLMModel.toModelInfo() [STATE]
    └── catalog consumers see only refreshed supported IDs [STATE]
```

### Branching / Fallback Paths

```text
[FALLBACK] if a provider has multiple current product-relevant capability classes
autobyteus-ts/src/llm/supported-model-definitions.ts:supportedModelDefinitions [STATE]
└── keep only the current entries needed for those distinct classes, rather than historical aliases or deprecated versions [STATE]
```

```text
[ERROR] if a stale model ID survives in a direct fixture or provider default after the registry refresh
autobyteus-ts/tests/integration/llm/llm-factory-metadata-resolution.test.ts or provider-specific tests [ASYNC]
└── fail validation because the fixture/default no longer matches the authoritative supported registry [ERROR]
```

### State And Data Transformations

- official provider catalog research -> refreshed supported model definition
- refreshed supported definition -> metadata lookup / default constructor / fixture alignment
- aligned definitions -> normalized `LLMModel` / `ModelInfo`

### Observability And Debug Points

- Logs emitted at:
  - none in production code; this is primarily enforced by registry/test consistency

### Design Smells / Gaps

- Any legacy/backward-compatibility branch present? `No`
- Any tight coupling or cyclic cross-subsystem dependency introduced? `No`
- Any naming-to-responsibility drift detected? `No`

### Open Questions

- whether specific providers should keep one or two current entries under the latest-only policy is resolved per provider by official catalog evidence and current product needs, not by preserving historical aliases

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `Covered`

## Use Case: UC-003 [Ollama Supported And Active Context Discovery]

### Spine Context

- Spine ID(s): `DS-002`
- Spine Scope: `Primary End-to-End`
- Governing Owner: `autobyteus-ts/src/llm/ollama-provider.ts:OllamaModelProvider.getModels`
- Why This Use Case Matters To This Spine:
  - Ollama currently discovers only identity data; this ticket needs its per-model supported and active context metadata
- Why This Spine Span Is Long Enough:
  - it spans the list API, the per-model detail API, the running-model API, and the final shared model registration

### Goal

Combine Ollama list, show, and running-model metadata to populate normalized supported and active context values.

### Preconditions

- `OLLAMA_HOSTS` resolves at least one reachable Ollama host
- provider discovery is running during factory initialization or targeted reload

### Expected Outcome

Each discovered Ollama `LLMModel` is registered with:

- `maxContextTokens` from `model_info.*.context_length` when available
- `activeContextTokens` from running-model `context_length` or truthful configured `num_ctx` when available

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-ts/src/llm/llm-factory.ts:LLMFactory.initializeRegistry() [ASYNC]
├── autobyteus-ts/src/llm/ollama-provider.ts:OllamaModelProvider.discoverAndRegister() [ASYNC]
│   └── autobyteus-ts/src/llm/ollama-provider.ts:OllamaModelProvider.getModels() [ASYNC]
│       ├── autobyteus-ts/src/llm/ollama-provider.ts:OllamaModelProvider.getHosts() [STATE]
│       ├── autobyteus-ts/src/llm/ollama-provider.ts:OllamaModelProvider.fetchRunningModels(hostUrl) [IO]
│       ├── autobyteus-ts/src/llm/ollama-provider.ts:OllamaModelProvider.fetchModelDetails(hostUrl, modelName) [IO]
│       └── autobyteus-ts/src/llm/models.ts:new LLMModel(...) [STATE]
└── autobyteus-ts/src/llm/llm-factory.ts:LLMFactory.registerModel(model) [STATE]
```

### Branching / Fallback Paths

```text
[ERROR] if /api/show fails for one listed model
autobyteus-ts/src/llm/ollama-provider.ts:OllamaModelProvider.fetchModelDetails(hostUrl, modelName) [IO]
└── skip the broken model entry after logging, continue processing the host's remaining models [ERROR]
```

### State And Data Transformations

- `list()` identity data + `show()` metadata + running-model context -> normalized metadata object
- normalized metadata object -> `LLMModel`

### Observability And Debug Points

- Logs emitted at:
  - host discovery start
  - per-host connection failure
  - per-model detail failure
  - registration count summary

### Design Smells / Gaps

- Any legacy/backward-compatibility branch present? `No`
- Any tight coupling or cyclic cross-subsystem dependency introduced? `No`
- Any naming-to-responsibility drift detected? `No`

### Open Questions

- If the running-model API returns no row for a discovered model, `activeContextTokens` stays `null` unless a truthful configured runtime value can be derived

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `Covered`

## Use Case: UC-005 [Supported Cloud Model Uses Live Metadata Resolver]

### Spine Context

- Spine ID(s): `DS-003`
- Spine Scope: `Primary End-to-End`
- Governing Owner: `autobyteus-ts/src/llm/metadata/model-metadata-resolver.ts:resolveModelMetadata`
- Why This Use Case Matters To This Spine:
  - the re-entry scope exists to stop hardcoding token metadata for supported cloud providers whose official APIs already expose trustworthy machine-readable limits
- Why This Spine Span Is Long Enough:
  - it begins at the supported-model registry, passes through resolver selection and provider-specific API resolution, and ends at normalized model registration

### Goal

Resolve token metadata dynamically for supported cloud models without letting live discovery broaden the product’s supported model set.

### Preconditions

- `LLMFactory` has a supported model entry such as `kimi-k2.5`, `mistral-large`, or `gemini-3-pro-preview`
- provider credentials/environment required by the selected metadata resolver are available when the resolver runs

### Expected Outcome

- the supported model remains explicitly registered by product policy
- token metadata comes from the provider’s official API instead of hardcoded registry values
- if the resolver cannot fetch metadata, the model still remains supported and registers with truthful unknowns or explicit resolver fallback behavior

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-ts/src/llm/llm-factory.ts:LLMFactory.initializeRegistry() [ASYNC]
├── autobyteus-ts/src/llm/llm-factory.ts:LLMFactory.buildSupportedRegistryModels() [STATE]
│   ├── autobyteus-ts/src/llm/metadata/model-metadata-resolver.ts:resolveModelMetadata(supportedModel) [ASYNC]
│   │   ├── autobyteus-ts/src/llm/metadata/model-metadata-resolver.ts:selectMetadataSource(supportedModel) [STATE]
│   │   └── autobyteus-ts/src/llm/metadata/kimi-model-metadata-provider.ts:getModelMetadata(modelId) [IO]
│   │       # same ownership pattern applies for Gemini or Mistral provider resolvers
│   └── autobyteus-ts/src/llm/models.ts:new LLMModel(...) [STATE]
└── autobyteus-ts/src/llm/llm-factory.ts:LLMFactory.registerModel(model) [STATE]
```

### Branching / Fallback Paths

```text
[FALLBACK] if live metadata resolution fails for one supported cloud model
autobyteus-ts/src/llm/metadata/model-metadata-resolver.ts:resolveModelMetadata(supportedModel) [ASYNC]
└── return null metadata fields for that model while preserving the supported registry entry [STATE]
```

```text
[ERROR] if provider metadata endpoint returns malformed shape
autobyteus-ts/src/llm/metadata/kimi-model-metadata-provider.ts:getModelMetadata(modelId) [IO]
└── throw resolver-scoped normalization error so the selector can log and downgrade to truthful unknowns [ERROR]
```

### State And Data Transformations

- supported registry entry -> metadata source selection
- provider API payload -> normalized metadata object
- normalized metadata object + supported registry entry -> `LLMModel`

### Observability And Debug Points

- Logs emitted at:
  - metadata source selection for one supported model when resolver lookup fails
  - provider-specific response normalization failure
  - summary of how many supported models resolved metadata dynamically vs unknown

### Design Smells / Gaps

- Any legacy/backward-compatibility branch present? `No`
- Any tight coupling or cyclic cross-subsystem dependency introduced? `No`
- Any naming-to-responsibility drift detected? `No`

### Open Questions

- Whether resolver results should later be cached across catalog reloads is deferred

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `Covered`

## Use Case: UC-006 [Supported Cloud Model Uses Curated Metadata]

### Spine Context

- Spine ID(s): `DS-003`
- Spine Scope: `Primary End-to-End`
- Governing Owner: `autobyteus-ts/src/llm/metadata/curated-model-metadata.ts`
- Why This Use Case Matters To This Spine:
  - providers such as OpenAI and DeepSeek are still product-critical but do not currently expose the needed token metadata cleanly through machine-readable model-list APIs
- Why This Spine Span Is Long Enough:
  - it spans supported-model registration, curated metadata lookup, normalized model construction, and downstream consumption

### Goal

Keep thin provider APIs truthful by using curated official metadata or explicit unknowns rather than fake universal defaults.

### Preconditions

- `LLMFactory` has a supported model entry such as `gpt-5.2` or `deepseek-chat`
- curated metadata exists for that supported model, or the curated source explicitly records `unknown`

### Expected Outcome

- supported cloud models with thin APIs still register successfully
- token metadata comes from the curated official source when present
- missing curated metadata stays `null` rather than inventing a fallback ceiling

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-ts/src/llm/llm-factory.ts:LLMFactory.initializeRegistry() [ASYNC]
├── autobyteus-ts/src/llm/llm-factory.ts:LLMFactory.buildSupportedRegistryModels() [STATE]
│   ├── autobyteus-ts/src/llm/metadata/model-metadata-resolver.ts:resolveModelMetadata(supportedModel) [ASYNC]
│   │   ├── autobyteus-ts/src/llm/metadata/model-metadata-resolver.ts:selectMetadataSource(supportedModel) [STATE]
│   │   └── autobyteus-ts/src/llm/metadata/curated-model-metadata.ts:getCuratedMetadata(modelId) [STATE]
│   └── autobyteus-ts/src/llm/models.ts:new LLMModel(...) [STATE]
└── autobyteus-ts/src/llm/llm-factory.ts:LLMFactory.registerModel(model) [STATE]
```

### Branching / Fallback Paths

```text
[FALLBACK] if a supported model has no curated metadata entry yet
autobyteus-ts/src/llm/metadata/curated-model-metadata.ts:getCuratedMetadata(modelId) [STATE]
└── return null metadata fields and preserve model support without a synthetic fallback [STATE]
```

```text
[ERROR] if the curated metadata source is malformed internally
autobyteus-ts/src/llm/metadata/model-metadata-resolver.ts:resolveModelMetadata(supportedModel) [ASYNC]
└── surface a configuration error during registry initialization so the malformed entry is fixed at the owning source [ERROR]
```

### State And Data Transformations

- supported registry entry -> curated metadata lookup key
- curated entry -> normalized metadata object
- normalized metadata object + supported registry entry -> `LLMModel`

### Observability And Debug Points

- Logs emitted at:
  - missing curated metadata for one supported model
  - malformed curated metadata entry during registry initialization

### Design Smells / Gaps

- Any legacy/backward-compatibility branch present? `No`
- Any tight coupling or cyclic cross-subsystem dependency introduced? `No`
- Any naming-to-responsibility drift detected? `No`

### Open Questions

- Whether curated metadata entries should include explicit verification dates in code is deferred but recommended

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `Covered`

## Use Case: UC-007 [Safe Token Budgeting With Known Or Unknown Metadata]

### Spine Context

- Spine ID(s): `DS-004`
- Spine Scope: `Primary End-to-End`
- Governing Owner: `autobyteus-ts/src/agent/token-budget.ts:resolveTokenBudget`
- Why This Use Case Matters To This Spine:
  - later tickets depend on safe runtime behavior when metadata is known and when it is unknown
- Why This Spine Span Is Long Enough:
  - it spans from the normalized model object to the downstream policy consequence

### Goal

Consume normalized metadata safely without reintroducing fake model ceilings.

### Preconditions

- A caller provides `LLMModel`, `LLMConfig`, and `CompactionPolicy`

### Expected Outcome

- If `model.maxContextTokens` is known, budgeting uses it.
- If `model.maxContextTokens` is unknown but `config.tokenLimit` is explicitly configured, budgeting may still proceed from explicit config.
- If neither is known, budgeting returns `null` and avoids pretending to know the limit.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-ts/src/agent/token-budget.ts:resolveTokenBudget(model, config, policy)
├── autobyteus-ts/src/agent/token-budget.ts:resolveTokenBudget(...) # read normalized model.maxContextTokens or explicit config.tokenLimit
├── autobyteus-ts/src/agent/token-budget.ts:resolveTokenBudget(...) # derive safety margin and compaction ratio
└── autobyteus-ts/src/agent/token-budget.ts:return TokenBudget | null [STATE]
```

### Branching / Fallback Paths

```text
[ERROR] if neither model metadata nor explicit config supplies a context limit
autobyteus-ts/src/agent/token-budget.ts:resolveTokenBudget(...)
└── return null instead of deriving a fake budget [ERROR]
```

### State And Data Transformations

- normalized metadata fields + explicit config -> derived budget fields

### Observability And Debug Points

- Logs emitted at:
  - none currently in scope
- Metrics/counters updated at:
  - none currently in scope

### Design Smells / Gaps

- Any legacy/backward-compatibility branch present? `No`
- Any tight coupling or cyclic cross-subsystem dependency introduced? `No`
- Any naming-to-responsibility drift detected? `No`

### Open Questions

- None

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `Covered`
