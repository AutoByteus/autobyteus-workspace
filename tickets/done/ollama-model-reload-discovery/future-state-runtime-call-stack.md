# Future-State Runtime Call Stacks (Debug-Trace Style)

## Design Basis

- Scope Classification: `Small`
- Call Stack Version: `v1`
- Requirements: `tickets/done/ollama-model-reload-discovery/requirements.md` (status `Design-ready`)
- Source Artifact:
  - `Small`: `tickets/done/ollama-model-reload-discovery/implementation.md`
- Source Design Version: `v1`
- Referenced Sections:
  - Spine inventory sections: `Solution Sketch`, `Requirement, Spine, And Design Traceability`
  - Ownership sections: `Primary Owners / Main Domain Subjects`, `File Placement Plan`

## Future-State Modeling Rule (Mandatory)

- Model target design behavior even when current code diverges.
- No temporary migration behavior is required beyond replacing the buggy provider assignment.
- Every in-scope requirement maps to at least one use case below.

## Use Case Index (Stable IDs)

| use_case_id | Spine ID(s) | Spine Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Governing Owner | Source Type (`Requirement`/`Design-Risk`) | Requirement ID(s) | Design-Risk Objective (if source=`Design-Risk`) | Use Case Name | Coverage Target (Primary/Fallback/Error) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `UC-001` | `DS-001` | Primary End-to-End | Ollama discovery owner | Requirement | `R-001`,`R-002` | N/A | Targeted Ollama reload returns models in the `OLLAMA` bucket | Yes/No/Yes |
| `UC-002` | `DS-002` | Primary End-to-End | Server grouped-provider resolver | Requirement | `R-002`,`R-004` | N/A | Grouped provider query exposes discovered Ollama models under `OLLAMA` | Yes/N/A/Yes |
| `UC-003` | `DS-003` | Bounded Local | LM Studio discovery owner | Requirement | `R-003` | N/A | LM Studio grouping remains unchanged after the Ollama fix | Yes/N/A/Yes |

## Transition Notes

- Any temporary migration behavior needed to reach target state: None
- Retirement plan for temporary logic (if any): N/A

## Use Case: UC-001 [Targeted Ollama reload returns models in the `OLLAMA` bucket]

### Spine Context

- Spine ID(s): `DS-001`
- Spine Scope: `Primary End-to-End`
- Governing Owner: `autobyteus-ts/src/llm/ollama-provider.ts`
- Why This Use Case Matters To This Spine: The owning discovery path must preserve runtime/provider-card identity so targeted reload and grouped-provider consumers stay coherent.

### Goal

Reload the Ollama provider and register discovered local models into the same `OLLAMA` bucket the caller asked to refresh.

### Preconditions

- A reachable Ollama host exists.
- At least one local Ollama model is installed.
- The runtime model catalog is operating in the `autobyteus` runtime kind.

### Expected Outcome

- `reloadModelsForProvider(OLLAMA)` returns a positive count when models exist.
- `listModelsByProvider(OLLAMA)` returns those same discovered model identifiers.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-web/components/settings/ProviderAPIKeyManager.vue:reloadSelectedProviderModels()
├── [ASYNC] autobyteus-web/stores/llmProviderConfig.ts:reloadModelsForProvider(provider)
├── [ASYNC] autobyteus-server-ts/src/api/graphql/types/llm-provider.ts:reloadLlmProviderModels(provider)
├── [ASYNC] autobyteus-server-ts/src/llm-management/services/model-catalog-service.ts:reloadLlmModelsForProvider(provider)
├── [ASYNC] autobyteus-server-ts/src/llm-management/services/autobyteus-model-catalog.ts:reloadModelsForProvider(provider)
├── [ASYNC] autobyteus-server-ts/src/llm-management/providers/autobyteus-llm-model-provider.ts:refreshModelsForProvider(provider)
├── [ASYNC] autobyteus-ts/src/llm/llm-factory.ts:reloadModels(provider)
│   ├── [STATE] clear only the existing `OLLAMA` registry entries
│   ├── [ASYNC] autobyteus-ts/src/llm/ollama-provider.ts:getModels()
│   │   ├── [IO] connect to configured Ollama host(s)
│   │   ├── [IO] read `/api/tags` through the Ollama client
│   │   └── [STATE] build `LLMModel` entries with `provider = LLMProvider.OLLAMA`
│   ├── [STATE] register each returned model under the `OLLAMA` provider bucket
│   └── [STATE] return the registered model count
└── [ASYNC] autobyteus-web/stores/llmProviderConfig.ts:reloadProvidersWithModels()
```

### Branching / Fallback Paths

```text
[ERROR] if an Ollama host is unreachable
autobyteus-ts/src/llm/ollama-provider.ts:getModels()
└── skip the failing host, continue other configured hosts, return only successfully discovered models
```

```text
[ERROR] if no models are discoverable
autobyteus-ts/src/llm/llm-factory.ts:reloadModels(provider)
└── return `0` with the `OLLAMA` bucket empty because discovery truly found nothing
```

### State And Data Transformations

- Ollama tag response -> `LLMModel` with `runtime = ollama`, `provider = OLLAMA`, and host-qualified `modelIdentifier`
- `LLMModel` collection -> `modelsByProvider[OLLAMA]` and `modelsByIdentifier`

### Observability And Debug Points

- Logs emitted at:
  - Ollama discovery host start
  - Targeted provider reload start/end
- Metrics/counters updated at:
  - None currently
- Tracing spans (if any):
  - None currently

### Design Smells / Gaps

- Any legacy/backward-compatibility branch present? (`Yes/No`): `No`
- Any tight coupling or cyclic cross-subsystem dependency introduced? (`Yes/No`): `No`
- Any naming-to-responsibility drift detected? (`Yes/No`): `No`

### Open Questions

- None

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `Covered`

## Use Case: UC-002 [Grouped provider query exposes discovered Ollama models under `OLLAMA`]

### Spine Context

- Spine ID(s): `DS-002`
- Spine Scope: `Primary End-to-End`
- Governing Owner: `autobyteus-server-ts/src/api/graphql/types/llm-provider.ts`
- Why This Use Case Matters To This Spine: The settings UI depends on grouped-provider results to drive the provider cards and detail panel.

### Goal

Ensure the grouped-provider query returns discovered Ollama local models under the `OLLAMA` provider group after reload.

### Preconditions

- `UC-001` succeeds.
- The settings UI refreshes providers/models after reload.

### Expected Outcome

- `availableLlmProvidersWithModels` returns the discovered Ollama model in the `OLLAMA` group.
- The `OLLAMA` card count is non-zero and the details panel lists the returned model identifier.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-web/stores/llmProviderConfig.ts:reloadProvidersWithModels()
├── [ASYNC] autobyteus-web/graphql/queries/llm_provider_queries.ts:GET_AVAILABLE_LLM_PROVIDERS_WITH_MODELS
├── [ASYNC] autobyteus-server-ts/src/api/graphql/types/llm-provider.ts:availableLlmProvidersWithModels(runtimeKind)
├── [ASYNC] autobyteus-server-ts/src/llm-management/services/model-catalog-service.ts:listLlmModels(runtimeKind)
├── [ASYNC] autobyteus-server-ts/src/llm-management/services/autobyteus-model-catalog.ts:listModels()
├── [ASYNC] autobyteus-server-ts/src/llm-management/providers/cached-autobyteus-llm-model-provider.ts:listModels() # cache wrapper
├── [STATE] autobyteus-server-ts/src/api/graphql/types/llm-provider.ts:groupModelsByProvider(models)
└── [STATE] autobyteus-web/components/settings/ProviderAPIKeyManager.vue:allProvidersWithModels/selectedProviderLlmModels
```

### Branching / Fallback Paths

```text
[ERROR] if grouped-provider response is empty because discovery found nothing
autobyteus-web/components/settings/ProviderAPIKeyManager.vue
└── show provider card with `0` models and empty-state copy
```

### State And Data Transformations

- `ModelInfo[]` -> `Map<provider, ModelDetail[]>`
- Grouped provider map -> UI provider summary counts and selected-provider detail models

### Observability And Debug Points

- Logs emitted at:
  - existing model-catalog reload/list boundaries
- Metrics/counters updated at:
  - None currently
- Tracing spans (if any):
  - None currently

### Design Smells / Gaps

- Any legacy/backward-compatibility branch present? (`Yes/No`): `No`
- Any tight coupling or cyclic cross-subsystem dependency introduced? (`Yes/No`): `No`
- Any naming-to-responsibility drift detected? (`Yes/No`): `No`

### Open Questions

- None

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `Covered`

## Use Case: UC-003 [LM Studio grouping remains unchanged after the Ollama fix]

### Spine Context

- Spine ID(s): `DS-003`
- Spine Scope: `Bounded Local`
- Governing Owner: `autobyteus-ts/src/llm/lmstudio-provider.ts`
- Why This Use Case Matters To This Spine: The fix must not disturb the already-correct local-runtime grouping semantics used by LM Studio.

### Goal

Preserve LM Studio discovery and reload behavior while changing Ollama classification.

### Preconditions

- Reachable LM Studio host exists in the current environment or test harness.

### Expected Outcome

- LM Studio discovery still registers models with `provider = LMSTUDIO`.
- Existing grouped-provider behavior for LM Studio remains unchanged.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-ts/src/llm/llm-factory.ts:reloadModels(LLMProvider.LMSTUDIO)
├── [STATE] clear only the `LMSTUDIO` registry entries
├── [ASYNC] autobyteus-ts/src/llm/lmstudio-provider.ts:getModels()
│   ├── [IO] call `/v1/models` on configured LM Studio host(s)
│   └── [STATE] build `LLMModel` entries with `provider = LLMProvider.LMSTUDIO`
└── [STATE] register returned models under the `LMSTUDIO` bucket
```

### Branching / Fallback Paths

```text
[ERROR] if LM Studio host is unreachable
autobyteus-ts/src/llm/lmstudio-provider.ts:getModels()
└── skip unreachable host and return only reachable-host models
```

### State And Data Transformations

- LM Studio model list -> `LLMModel` entries under `LMSTUDIO`

### Observability And Debug Points

- Logs emitted at:
  - LM Studio discovery start/end
- Metrics/counters updated at:
  - None currently
- Tracing spans (if any):
  - None currently

### Design Smells / Gaps

- Any legacy/backward-compatibility branch present? (`Yes/No`): `No`
- Any tight coupling or cyclic cross-subsystem dependency introduced? (`Yes/No`): `No`
- Any naming-to-responsibility drift detected? (`Yes/No`): `No`

### Open Questions

- None

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `Covered`

