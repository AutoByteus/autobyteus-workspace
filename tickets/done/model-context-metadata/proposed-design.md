# Proposed Design Document

## Design Version

- Current Version: `v3`

## Revision History

| Version | Trigger | Summary Of Changes | Related Review Round |
| --- | --- | --- | --- |
| v1 | Initial draft | Defined the normalized model-context metadata contract, provider-specific sourcing strategy, and cross-package propagation plan. | 1 |
| v2 | Requirement-gap re-entry during Stage 6 | Split supported-model registry ownership from metadata sourcing, added provider metadata resolver architecture for cloud providers with official endpoints, and narrowed curated fallbacks to providers whose APIs remain too thin. | Pending |
| v3 | Requirement-gap re-entry during Stage 6 | Added a latest-only supported cloud-model policy, refreshed provider research on current official model IDs, and required provider defaults/test fixtures to move with the registry refresh. | Pending |

## Artifact Basis

- Investigation Notes: `tickets/in-progress/model-context-metadata/investigation-notes.md`
- Requirements: `tickets/in-progress/model-context-metadata/requirements.md`
- Requirements Status: `Refined`
- Shared Design Principles: `shared/design-principles.md`
- Common Design Practices: `shared/common-design-practices.md`

## Summary

Keep the existing supported-model registry architecture, but stop making that registry the source of truth for token metadata.

The target design has six main moves:

1. Keep a static supported-model registry that still owns:
   - which models the product supports
   - canonical identifiers / provider / runtime / adapter class
   - product-facing config schema and selection behavior
   - only current officially supported cloud-model IDs under a latest-only policy, with deprecated cloud entries removed
2. Expand the shared text-model contract with explicit nullable context/output fields:
   - `maxContextTokens`
   - `activeContextTokens`
   - `maxInputTokens`
   - `maxOutputTokens`
3. Add a provider metadata resolver layer for supported models:
   - local runtime resolvers for LM Studio and Ollama
   - cloud-provider resolvers where official APIs expose the needed fields, starting with Kimi, Mistral, and Gemini
4. Keep curated official metadata or explicit unknowns for providers whose APIs remain too thin:
   - OpenAI
   - DeepSeek
   - Anthropic
   - any others without trustworthy machine-readable token metadata
5. Refresh provider defaults, metadata lookup keys, and hardcoded live-test fixtures so they cannot keep stale cloud-model IDs alive after the registry changes.
6. Propagate the normalized contract through:
   - `autobyteus-ts` exported `ModelInfo`
   - `autobyteus-server-ts` GraphQL `ModelDetail`
   - `autobyteus-web` query/store/generated types

## Goal / Intended Change

Make model context metadata truthful, shared, and reusable across the existing model-catalog path while keeping product support policy explicit. Later tickets such as context-based abort/cancel, compaction tuning, and UI/runtime diagnostics should rely on one normalized metadata source without forcing token metadata to stay hardcoded in the supported-model registry.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required removals in scope:
  - remove the implicit `200000` context fallback from `LLMModel`
  - stop using LM Studio’s OpenAI-compatible model-list path as if it were the authoritative source for context metadata
  - stop treating Ollama list-only identity data as sufficient metadata for context-aware discovery
  - stop storing cloud-provider token metadata in the supported-model registry when a provider-owned metadata resolver can fetch it from an official machine-readable endpoint
  - stop exposing stale, deprecated, or preview-only cloud model IDs in the supported registry when current official replacements are available and intended for product use

## Requirements And Use Cases

| Requirement ID | Description | Acceptance Criteria ID(s) | Acceptance Criteria Summary | Use Case IDs |
| --- | --- | --- | --- | --- |
| `R-001` | Normalize first-class shared context/output fields | `AC-001`, `AC-002` | Shared contract gains nullable metadata fields and stops exporting fake universal defaults | `UC-001`, `UC-004`, `UC-007` |
| `R-003` | Enrich LM Studio discovery with native context metadata | `AC-003` | LM Studio discovered models carry supported and active context when available | `UC-002` |
| `R-004` | Enrich Ollama discovery with per-model detail metadata | `AC-004` | Ollama discovered models carry supported and active context when available | `UC-003` |
| `R-005` | Keep support allowlisting separate from token metadata sourcing | `AC-006` | Product support policy stays explicit even when token metadata becomes dynamic | `UC-005`, `UC-009` |
| `R-006` | Add dynamic provider metadata resolvers where official endpoints expose token metadata | `AC-007`, `AC-008` | Supported models on Kimi, Mistral, and Gemini can resolve token metadata without hardcoding those limits in the registry | `UC-005`, `UC-008` |
| `R-007` | Preserve curated official metadata paths for thin provider APIs | `AC-007`, `AC-009` | Docs-only providers remain truthful without fake defaults | `UC-006`, `UC-008` |
| `R-008` | Propagate the expanded contract through server and frontend | `AC-005` | GraphQL/web consumers receive the new fields without breaking model selection | `UC-004` |
| `R-009` | Preserve safe token-budget behavior | `AC-010` | Budget logic works with known metadata and degrades safely for unknown metadata | `UC-007` |
| `R-010` | Add automated validation | `AC-011` | Shared contract, provider normalization, resolver behavior, and server/frontend mapping regressions are test-covered | `UC-008` |
| `R-011` | Refresh the supported cloud-model registry to current official model IDs and remove stale cloud entries | `AC-012`, `AC-013` | Support policy, provider defaults, and hardcoded fixtures stay aligned on current cloud models only | `UC-010` |

## Current-State Read

| Area | Findings | Evidence (files/functions) | Open Unknowns |
| --- | --- | --- | --- |
| Entrypoints / Current Spine Or Fragmented Flow | The catalog spine already exists, but support registry ownership and metadata sourcing are mixed together, so cloud token metadata lives in the same hardcoded registry that controls product support | `autobyteus-ts/src/llm/llm-factory.ts`, `autobyteus-ts/src/llm/models.ts`, `autobyteus-server-ts/src/api/graphql/types/llm-provider.ts` | Whether a metadata-source indicator is needed in the normalized contract |
| Current Ownership Boundaries | `autobyteus-ts` already owns discovery and normalization, server/web only project the result | `autobyteus-ts/src/llm/`, `autobyteus-server-ts/src/llm-management/services/model-catalog-service.ts`, `autobyteus-web/stores/llmProviderConfig.ts` | None |
| Current Coupling / Fragmentation Problems | Local runtime providers use the wrong metadata source; cloud catalog mixes explicit values and fake defaults; providers with live metadata endpoints are still treated like docs-only static entries; several provider defaults/tests hardcode stale cloud IDs outside the registry | `lmstudio-provider.ts`, `ollama-provider.ts`, `llm-factory.ts`, provider API wrappers/tests | Which providers should keep multiple current entries under the latest-only policy |
| Existing Constraints / Compatibility Facts | Web and server currently consume a narrow GraphQL model shape and generated types | `autobyteus-web/graphql/queries/llm_provider_queries.ts`, `autobyteus-web/generated/graphql.ts` | Codegen/update command details |
| Relevant Files / Components | Existing files are already the right ownership boundaries; this is an extension/re-tightening change rather than a subsystem move | same as above | None |

## Current State (As-Is)

- `LLMModel` has `maxContextTokens`, but callers outside `autobyteus-ts` cannot see it.
- `LLMModel` invents `200000` when no provider-specific value exists.
- token-budget logic already depends on `model.maxContextTokens`, so fake defaults can affect runtime behavior.
- LM Studio discovery uses `GET /v1/models` through the OpenAI client, which is not the rich metadata surface.
- Ollama discovery uses `list()` only, which is not enough to determine supported/active context reliably.
- the supported cloud-model registry mixes product support policy and token metadata maintenance in one hardcoded structure.
- several supported cloud-model entries are now stale, deprecated, or preview-only, and some provider defaults/tests keep those stale IDs alive outside the registry.
- server and web contracts do not carry any of the needed metadata fields.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Owning Node / Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| `DS-001` | `Primary End-to-End` | Supported model registry entry | Frontend/server model-catalog consumer | `autobyteus-ts` `LLMModel` / `ModelInfo` | This is the main metadata spine the ticket exists to fix |
| `DS-002` | `Primary End-to-End` | Local runtime host API | Registered runtime model in `LLMFactory` | Provider discovery adapter (`LMStudioModelProvider`, `OllamaModelProvider`) | Local runtimes need richer native discovery than the current list-only path |
| `DS-003` | `Primary End-to-End` | Supported cloud model definition | Shared `ModelInfo` exported to consumers | Supported-model registry owner + metadata resolver selector + provider metadata resolver / curated metadata source | Supported cloud models should keep explicit support policy while current model IDs and token metadata come from the right sources |
| `DS-004` | `Primary End-to-End` | Selected `LLMModel` | token-budget decision | `resolveTokenBudget()` | Downstream runtime policy already depends on the metadata quality |

## Primary Execution / Data-Flow Spine(s)

### `DS-001`

`Supported Model Registry -> Metadata Resolver Selector -> Provider/Catalog Normalizer -> LLMModel -> ModelInfo -> GraphQL ModelDetail -> Web Store / Runtime Consumer`

- Short narrative:
  - the registry decides which models are supported
  - the registry is refreshed to current official cloud-model IDs only
  - a resolver selector chooses the right metadata source for that supported model
  - provider/runtime-specific discovery or curated metadata values are normalized into one `LLMModel`
  - `LLMModel.toModelInfo()` exports the same truth into the shared contract
  - server and web project and consume the same fields without re-deriving provider logic
- Main domain subject nodes:
  - supported model registry
  - metadata resolver selector
  - provider/catalg normalizer
  - `LLMModel`
  - `ModelInfo`
  - GraphQL `ModelDetail`
  - frontend/runtime consumer
- Governing owner:
  - `LLMModel` / `ModelInfo` inside `autobyteus-ts`
- Why the span is long enough:
  - it starts at the provider truth source and ends at the final consumer, making ownership, projection, and downstream use visible

### `DS-002`

`LM Studio or Ollama Host -> Provider Discovery Adapter -> Normalized Context Fields -> LLMFactory Registry -> Runtime Model Selection`

- Short narrative:
  - local runtime providers call the correct native discovery/detail APIs
  - the adapter translates runtime-native fields into normalized metadata
  - the normalized `LLMModel` is registered once and used everywhere else as the canonical representation
- Main domain subject nodes:
  - runtime host
  - provider discovery adapter
  - normalized metadata fields
  - `LLMFactory`
  - runtime model selection consumer
- Governing owner:
  - provider discovery adapter
- Why the span is long enough:
  - it includes the runtime-native boundary, the authoritative normalizer, and the registry consequence

### `DS-004`

`Selected LLMModel -> Token Budget Resolver -> Input Budget / Output Budget -> Compaction Policy / Request Limits`

- Short narrative:
  - once the shared model object has truthful metadata, token-budget code uses it directly
  - when metadata is unknown, the budget path returns `null` or uses explicit config instead of an invented model ceiling
- Main domain subject nodes:
  - `LLMModel`
  - budget resolver
  - derived budgets
  - runtime policies
- Governing owner:
  - `resolveTokenBudget`
- Why the span is long enough:
  - it exposes the runtime consequence of the metadata work rather than stopping at the catalog export

## Spine Actors / Main-Line Nodes

| Node | Role In Spine | What It Advances |
| --- | --- | --- |
| Supported model registry | Product support authority | Declares which models the app exposes and which provider/runtime handles them |
| Provider defaults + hardcoded fixtures | Registry-aligned support edge | Must use current registry-backed model IDs instead of reviving removed stale entries |
| Metadata resolver selector | Source chooser | Selects runtime/API/curated metadata sourcing for one supported model |
| Provider metadata source | Raw truth source | Supplies runtime-native or curated official metadata |
| Provider discovery/catalog normalizer | Authoritative adapter | Converts provider-specific fields into normalized shared fields |
| `LLMModel` | Shared canonical owner | Holds normalized metadata for runtime and exported contract use |
| `ModelInfo` | Shared projection boundary | Carries normalized metadata out of `autobyteus-ts` |
| GraphQL `ModelDetail` | Server projection boundary | Exposes the shared fields to frontend consumers |
| Frontend store / runtime consumer | Downstream consumer | Uses the metadata for selection, display, and future policy work |
| Token budget resolver | Runtime policy consumer | Converts normalized metadata into safe runtime budgets |

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| `DS-001` | One shared model metadata truth flows from provider/runtime or curated catalog through `LLMModel` to every consumer, while the registry stays current-only | source, normalizer, `LLMModel`, `ModelInfo`, GraphQL, web/runtime consumer | `autobyteus-ts` `LLMModel`/`ModelInfo` | provider-specific field parsing, GraphQL type/codegen updates |
| `DS-002` | Local runtime providers enrich identity-only model discovery with supported/active context details before registry registration | runtime host, discovery adapter, normalized fields, factory | provider discovery adapters | native HTTP/API detail fetches |
| `DS-004` | Budgeting consumes the normalized model fields and safely handles unknowns without pretending to know the limit | `LLMModel`, budget resolver, compaction policy | token-budget resolver | caller-configured overrides |

## Ownership Map

| Node / Owner | Owns | Must Not Own | Notes |
| --- | --- | --- | --- |
| `LLMModel` / `ModelInfo` | Normalized shared metadata fields and export shape | Provider-specific HTTP calls or docs lookup logic | Canonical shared metadata boundary |
| `LLMFactory` / supported registry | Supported model registration and registry registration | Provider metadata fetch logic details or server/web projection logic | Support policy stays explicit here, but token metadata should not stay hardcoded when a resolver exists |
| `LMStudioModelProvider` | LM Studio native discovery and field normalization | Budget policy or frontend display decisions | Must stop relying on the OpenAI-compatible list path for metadata |
| `OllamaModelProvider` | Ollama list/detail/runtime discovery and field normalization | Generic cloud-provider catalog behavior | Must combine list + detail/runtime metadata |
| Cloud provider metadata resolvers | Provider-specific token metadata resolution | Product support allowlisting or frontend/server projection logic | Kimi, Mistral, and Gemini are candidates for live resolvers; OpenAI/DeepSeek/Anthropic stay curated unless official APIs improve |
| Provider API wrapper defaults + test fixtures | Current supported model IDs at local call sites | Their own independent model-policy decisions | These paths must follow the authoritative registry refresh instead of preserving removed stale IDs |
| Server GraphQL mapper | Contract projection | Provider-specific metadata derivation | Pure mapping layer |
| Web store/query | Consumption and selection | Provider-specific normalization | Pure consumer layer |
| `resolveTokenBudget` | Safe derived budgeting | Provider-specific metadata sourcing | Consumes normalized fields only |

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Serves Which Owner | Responsibility | Must Stay Off Main Line? (`Yes`/`No`) |
| --- | --- | --- | --- |
| Curated official metadata store | metadata resolver selector / curated source owner | Provide docs-backed limits for providers whose APIs do not expose the needed metadata | `Yes` |
| Resolver cache / reuse policy | metadata resolver selector | Avoid unnecessary live provider calls during catalog building when supported by the architecture | `Yes` |
| Native runtime response parsing | Local provider adapters | Translate runtime-native field names into normalized fields | `Yes` |
| Latest-only provider catalog audit | supported registry owner | Decide which current official model IDs remain exposed and which stale entries are removed | `Yes` |
| GraphQL generated-type refresh | Server/web projection boundary | Keep query/store/generated client types aligned | `Yes` |
| Test fixtures for provider metadata | Shared contract and provider adapters | Validate normalization and projection behavior | `Yes` |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Shared model metadata contract | `autobyteus-ts/src/llm/models.ts` | `Extend` | Already owns the shared text-model export contract | N/A |
| Supported-model registry | `autobyteus-ts/src/llm/llm-factory.ts` | `Extend` | Already owns hardcoded supported model definitions | N/A |
| Registry-aligned provider defaults / fixtures | existing provider wrappers and tests | `Extend` | They already use direct model IDs and must be aligned with the refreshed support policy rather than introducing another registry | N/A |
| Provider metadata resolver layer | `autobyteus-ts/src/llm/` | `Extend` | Metadata resolution belongs beside provider owners, not in server/web or the static registry values | N/A |
| Local runtime discovery | existing provider adapters | `Extend` | The change is richer normalization, not a new subsystem | N/A |
| Server/frontend exposure | existing GraphQL and store/query layers | `Extend` | They already project and consume the model catalog | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/llm/` | Metadata normalization, provider-specific discovery, supported registry, curated metadata, resolver selection | `DS-001`, `DS-002`, `DS-003` | `LLMModel`, provider adapters, resolver selector, `LLMFactory` | `Extend` | Primary implementation subsystem |
| `autobyteus-ts/src/llm/api/`, related tests | Default current model IDs for direct-provider call sites and fixtures | `DS-003` | provider wrapper/test owners | `Extend` | Required to prevent stale IDs surviving outside the registry |
| `autobyteus-ts/src/agent/` | Budget consumption of normalized metadata | `DS-004` | token-budget resolver | `Extend` | No new policy subsystem needed |
| `autobyteus-server-ts/src/api/graphql/` | GraphQL projection of the expanded contract | `DS-001` | server mapper | `Extend` | Pure mapping change |
| `autobyteus-web/graphql/`, `autobyteus-web/stores/` | Query/store/generated-type consumption | `DS-001` | frontend consumer | `Extend` | Pure consumer change |

## Ownership-Driven Dependency Rules

- Allowed dependency directions:
  - supported registry -> metadata resolver selector -> provider/runtime source or curated metadata source -> provider adapter/normalizer -> `LLMModel`/`ModelInfo` -> server/web consumers
  - `LLMModel` -> token-budget resolver -> runtime policy
- Authoritative public entrypoints versus internal owned sub-layers:
  - `LLMModel` / `ModelInfo` is the authoritative shared metadata boundary
  - the supported registry is authoritative for support policy only
  - the metadata resolver selector is authoritative for choosing the token-metadata source for a supported model
  - provider adapters own provider-specific response parsing internally
- Authoritative Boundary Rule per domain subject:
  - server and web must depend on `ModelInfo`, not on provider adapters or provider-specific parsing logic
  - token-budget code must depend on `LLMModel`, not on per-provider helpers
- support policy callers must not bypass the supported registry by consulting provider metadata endpoints directly
- provider wrapper defaults and tests must not reintroduce removed stale IDs after the registry refresh
- Forbidden shortcuts:
  - GraphQL or frontend code deriving provider-specific context metadata independently
  - token-budget logic peeking into provider-specific host APIs or raw config blobs
  - storing token metadata in the supported registry for providers whose resolver can already fetch it live
- Boundary bypasses that are not allowed:
  - any consumer above `LLMModel` reintroducing its own fallback constants

## Architecture Direction Decision (Mandatory)

- Chosen direction:
  - `Keep the explicit supported-model registry, refresh it to current official cloud models only, add a provider metadata resolver layer beneath it, and normalize all resolved or curated metadata through the same shared contract.`
- Rationale (`complexity`, `testability`, `operability`, `evolution cost`):
  - lowest operational risk because existing owners remain authoritative
  - easiest to test because provider adapters and contract mappers can be validated independently
  - keeps support policy stable while reducing token-metadata hardcoding where providers expose trustworthy endpoints
  - avoids forcing live discovery for providers whose APIs are still too thin
- Data-flow spine clarity assessment: `Yes`
- Spine span sufficiency assessment: `Yes`
- Spine inventory completeness assessment: `Yes`
- Ownership clarity assessment: `Yes`
- Off-spine concern clarity assessment: `Yes`
- Authoritative Boundary Rule assessment: `Yes`
- File placement within the owning subsystem assessment: `Yes`
- Outcome (`Keep`/`Add`/`Split`/`Merge`/`Move`/`Remove`):
  - `Keep` supported registry ownership, `Add` normalized fields and a metadata resolver layer, `Modify` provider adapters and projections, `Remove` fake defaults and unnecessary registry-stored token metadata where resolvers exist

## Optional Alternatives

| Option | Summary | Pros | Cons | Decision (`Chosen`/`Rejected`) | Rationale |
| --- | --- | --- | --- | --- | --- |
| A | Expand the shared contract with explicit fields and enrich provider adapters/curated catalog at existing owners | Low operational risk, good testability, one authoritative boundary | Requires coordinated cross-package contract changes | `Chosen` | Best fit for current architecture |
| B | Expose one provider-specific JSON metadata blob and let server/web/consumers interpret it | Less up-front normalization work in `autobyteus-ts` | Pushes provider logic into every consumer, weakens authoritative boundary, hurts type safety | `Rejected` | Violates ownership and authoritative-boundary rules |
| C | Replace the hardcoded cloud catalog with live provider model discovery everywhere | Potentially freshest metadata | Requires credentials/network at catalog load time, uneven provider support, degrades availability | `Rejected` | Not the right operational fit for the existing registry model |

## Change Inventory (Delta)

| Change ID | Change Type (`Add`/`Modify`/`Rename/Move`/`Remove`) | Current Path | Target Path | Rationale | Impacted Areas | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `C-001` | `Modify` | `autobyteus-ts/src/llm/models.ts` | same | Expand the shared contract and remove fake default context fallback | shared model contract | May also include helper normalization logic |
| `C-002` | `Modify` | `autobyteus-ts/src/llm/llm-factory.ts` | same | Keep supported-model registry ownership but remove token metadata hardcoding where resolvers can supply it | supported registry | Registry remains the product allowlist |
| `C-003` | `Add` | N/A | `autobyteus-ts/src/llm/metadata/model-metadata-resolver.ts` | Centralize metadata-source selection for supported models | resolver selection | Chooses runtime/API/curated path per supported model |
| `C-004` | `Add` | N/A | `autobyteus-ts/src/llm/metadata/curated-model-metadata.ts` | Hold docs-backed token metadata for providers whose APIs are too thin | curated metadata | OpenAI, DeepSeek, Anthropic candidates |
| `C-005` | `Add` | N/A | `autobyteus-ts/src/llm/metadata/gemini-model-metadata-provider.ts`, `autobyteus-ts/src/llm/metadata/mistral-model-metadata-provider.ts`, `autobyteus-ts/src/llm/metadata/kimi-model-metadata-provider.ts` | Resolve token metadata from official provider APIs where available | cloud metadata resolvers | Resolver set can start with the providers confirmed in investigation |
| `C-006` | `Modify` | `autobyteus-ts/src/llm/lmstudio-provider.ts` | same | Use LM Studio native discovery for context metadata | LM Studio discovery | Stop relying on OpenAI-compatible models list for metadata |
| `C-007` | `Modify` | `autobyteus-ts/src/llm/ollama-provider.ts` | same | Enrich list-only discovery with `show` and running-model context metadata | Ollama discovery | Supported + active context split |
| `C-008` | `Modify` | `autobyteus-ts/src/agent/token-budget.ts` | same | Ensure safe behavior when metadata becomes `null` or moves to resolver-backed sources | budgeting | May remain minimal if runtime code is already safe |
| `C-009` | `Modify` | `autobyteus-server-ts/src/api/graphql/types/llm-provider.ts` | same | Expose the expanded shared model fields | server GraphQL | Pure mapper change |
| `C-010` | `Modify` | `autobyteus-web/graphql/queries/llm_provider_queries.ts`, `autobyteus-web/stores/llmProviderConfig.ts`, generated GraphQL types | same | Consume/store the expanded contract | frontend consumption | Requires generated-type refresh |
| `C-011` | `Modify` | relevant tests in `autobyteus-ts`, `autobyteus-server-ts`, `autobyteus-web` | same | Add contract, resolver, and mapping validation | test coverage | Keep provider/unit tests close to owning files |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| implicit `200000` model-context fallback | It fabricates authoritative-looking metadata | explicit normalized fields in `LLMModel` / `ModelInfo` | `In This Change` | Removes a misleading global default |
| LM Studio OpenAI-compatible list-as-metadata assumption | It does not surface the context fields this ticket needs | LM Studio native discovery path | `In This Change` | Discovery boundary stays in provider adapter |
| cloud token-limit constants embedded directly in the supported registry where provider resolvers exist | It couples support policy to token metadata maintenance and becomes stale as providers evolve | metadata resolver selector + provider-specific resolver modules | `In This Change` | Keep curated metadata only for thin provider APIs |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/llm/models.ts` | shared LLM model contract | `LLMModel` / `ModelInfo` | normalized shared metadata fields and export shape | The shared contract belongs in one canonical place | N/A |
| `autobyteus-ts/src/llm/llm-factory.ts` | supported model registry | `LLMFactory` | explicit supported-model allowlist and registry registration | Product support policy already lives here | Uses resolver-backed `LLMModel` metadata fields |
| `autobyteus-ts/src/llm/metadata/model-metadata-resolver.ts` | metadata resolver selection | resolver selector | choose live runtime/API vs curated metadata for a supported model | One selector keeps the sourcing decision authoritative and testable | Uses provider resolver modules and curated metadata |
| `autobyteus-ts/src/llm/metadata/curated-model-metadata.ts` | curated metadata source | curated metadata owner | docs-backed metadata for providers without trustworthy machine-readable limits | Centralizes curated values and source references instead of scattering them through the registry | Used by resolver selector |
| `autobyteus-ts/src/llm/metadata/*-model-metadata-provider.ts` | provider metadata resolution | provider-specific resolver | fetch and normalize machine-readable metadata for one provider | Provider API differences should stay isolated per owner | Uses shared normalization shape |
| `autobyteus-ts/src/llm/lmstudio-provider.ts` | LM Studio discovery | `LMStudioModelProvider` | native model-list fetch and context-field normalization | Provider-specific parsing stays local | Uses shared `LLMModel` fields |
| `autobyteus-ts/src/llm/ollama-provider.ts` | Ollama discovery | `OllamaModelProvider` | list + detail + running-context normalization | Provider-specific parsing stays local | Uses shared `LLMModel` fields |
| `autobyteus-server-ts/src/api/graphql/types/llm-provider.ts` | server projection | GraphQL mapper | map expanded shared contract to GraphQL model detail | Pure projection boundary | Uses `ModelInfo` |
| `autobyteus-web/graphql/queries/llm_provider_queries.ts` | frontend API contract | GraphQL query doc | request expanded model fields | Query file remains the API surface | Uses GraphQL schema |
| `autobyteus-web/stores/llmProviderConfig.ts` | frontend state | store interface / helpers | store and expose expanded model metadata | Model catalog consumer already lives here | Uses GraphQL result types |

## Derived Implementation Mapping (Secondary)

| Target File | Change Type | Mapped Spine ID | Owner / Off-Spine Concern | Responsibility | Key APIs / Interfaces | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/llm/models.ts` | `Modify` | `DS-001`, `DS-004` | authoritative shared contract | add normalized fields and remove fake max-context default | `LLMModelOptions`, `ModelInfo`, `toModelInfo()` | likely flat explicit fields |
| `autobyteus-ts/src/llm/metadata/model-metadata-resolver.ts` | `Add` | `DS-001`, `DS-003` | metadata source chooser | resolve one supported model’s token metadata from runtime/API/curated source | resolver interface + normalized metadata return type | should stay below the supported registry and above provider-specific resolvers |
| `autobyteus-ts/src/llm/metadata/curated-model-metadata.ts` | `Add` | `DS-003` | curated metadata source | store docs-backed metadata and provenance for thin APIs | keyed metadata dictionary | OpenAI/DeepSeek/Anthropic likely start here |
| `autobyteus-ts/src/llm/metadata/gemini-model-metadata-provider.ts` | `Add` | `DS-003` | provider resolver | fetch `inputTokenLimit` / `outputTokenLimit` and normalize | Gemini Models API | dynamic path for supported Gemini entries |
| `autobyteus-ts/src/llm/metadata/mistral-model-metadata-provider.ts` | `Add` | `DS-003` | provider resolver | fetch `max_context_length` and normalize | Mistral Models API | dynamic path for supported Mistral entries |
| `autobyteus-ts/src/llm/metadata/kimi-model-metadata-provider.ts` | `Add` | `DS-003` | provider resolver | fetch `context_length` and normalize | Kimi `GET /v1/models` | dynamic path for supported Kimi entries |
| `autobyteus-ts/src/llm/lmstudio-provider.ts` | `Modify` | `DS-002` | provider adapter | fetch `/api/v1/models`, normalize `max_context_length` and loaded-instance context | native `fetch` or equivalent | runtime-native path |
| `autobyteus-ts/src/llm/ollama-provider.ts` | `Modify` | `DS-002` | provider adapter | enrich `list()` results with `show()` and running-model context | Ollama SDK/API | supported + active split |
| `autobyteus-server-ts/src/api/graphql/types/llm-provider.ts` | `Modify` | `DS-001` | projection boundary | add GraphQL fields and map them from `ModelInfo` | `ModelDetail` | no provider logic here |
| `autobyteus-web/...` | `Modify` | `DS-001` | consumer boundary | request/store new fields | GraphQL query + store interface + generated types | no provider logic here |

## File Placement And Ownership Check (Mandatory)

| File | Current Path | Target Path | Owning Concern / Platform | Path Matches Concern? (`Yes`/`No`) | Flat-Or-Over-Split Risk (`Low`/`Medium`/`High`) | Action (`Keep`/`Move`/`Split`/`Promote Shared`) | Rationale |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `models.ts` | `autobyteus-ts/src/llm/models.ts` | same | shared text-model contract | `Yes` | `Low` | `Keep` | Correct authoritative boundary already exists |
| `llm-factory.ts` | `autobyteus-ts/src/llm/llm-factory.ts` | same | supported model registry | `Yes` | `Medium` | `Keep` | Existing owner is correct for support allowlisting; avoid unnecessary registry refactor |
| `metadata/` folder | `N/A` | `autobyteus-ts/src/llm/metadata/` | provider metadata resolution | `Yes` | `Low` | `Add` | Resolver concerns are related but distinct enough to justify one focused module grouping |
| `lmstudio-provider.ts` | `autobyteus-ts/src/llm/lmstudio-provider.ts` | same | LM Studio discovery | `Yes` | `Low` | `Keep` | Correct provider boundary |
| `ollama-provider.ts` | `autobyteus-ts/src/llm/ollama-provider.ts` | same | Ollama discovery | `Yes` | `Low` | `Keep` | Correct provider boundary |
| `llm-provider.ts` | `autobyteus-server-ts/src/api/graphql/types/llm-provider.ts` | same | GraphQL model projection | `Yes` | `Low` | `Keep` | Correct server boundary |
| `llmProviderConfig.ts` | `autobyteus-web/stores/llmProviderConfig.ts` | same | frontend model catalog state | `Yes` | `Low` | `Keep` | Correct consumer boundary |

## Concrete Examples / Shape Guidance

### Example Shared Contract Shape

```json
{
  "model_identifier": "qwen/qwen3.5-35b-a3b:lmstudio@127.0.0.1:1234",
  "display_name": "qwen/qwen3.5-35b-a3b",
  "provider": "LMSTUDIO",
  "runtime": "lmstudio",
  "max_context_tokens": 262144,
  "active_context_tokens": 262144,
  "max_input_tokens": null,
  "max_output_tokens": null
}
```

### Example Supported Registry Entry Shape

```json
{
  "model_identifier": "kimi-k2.5",
  "display_name": "kimi-k2.5",
  "provider": "KIMI",
  "runtime": "api",
  "metadata_source": "resolver:kimi"
}
```

### Example Curated Metadata Shape

```json
{
  "provider": "OPENAI",
  "model_identifier": "gpt-5.2",
  "max_context_tokens": 400000,
  "active_context_tokens": null,
  "max_input_tokens": null,
  "max_output_tokens": 128000,
  "source_url": "https://developers.openai.com/api/docs/models/gpt-5.2"
}
```

### Example Truthful Unknown Shape

```json
{
  "model_identifier": "provider-model-without-trustworthy-limit",
  "max_context_tokens": null,
  "active_context_tokens": null,
  "max_input_tokens": null,
  "max_output_tokens": null
}
```
